import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { prisma } from '../utils/db';
import {
  verifyPersonalAccessToken,
  VerifiedPersonalAccessToken,
} from '../services/personalAccessTokenService';
import {
  getWorkstreams,
  getWorkstreamById,
  createWorkstream,
  updateWorkstream,
  closeWorkstream,
  reopenWorkstream,
  getSubstreamWorkstreamIds,
  getBreadcrumbForWorkstream,
  type WorkstreamHierarchyFilter,
  type WorkstreamWithLatestStatus,
} from '../services/workstreamService';
import {
  createStatusUpdate,
  updateStatusUpdate,
  deleteStatusUpdate,
} from '../services/statusUpdateService';
import {
  getCategoriesByProjectId,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categoryService';
import { getTagsByProjectId, createTag, updateTag, deleteTag } from '../services/tagService';
import { viewService } from '../services/viewService';
import { getTimeline } from '../services/timelineService';
import { logger } from '../utils/logger';
import { encodeOpaqueCursor } from '../utils/opaqueCursor';

interface McpContext extends VerifiedPersonalAccessToken {
  projectId: string;
}
type Scope = 'mcp:read' | 'mcp:write';
type Handler = (args: Record<string, any>, ctx: McpContext) => Promise<any>;
type CursorKind = 'workstreams_list' | 'updates_list' | 'timeline_query';

interface ToolDef {
  name: string;
  description: string;
  scope: Scope;
  inputSchema: any;
  annotations?: any;
  handler: Handler;
}
interface RateLimitBucket {
  windowStart: number;
  count: number;
}
interface CursorPayload {
  v: 1;
  kind: CursorKind;
  createdAt: string;
  id: string;
}
type WorkstreamGroupParent =
  | NonNullable<WorkstreamWithLatestStatus['parent']>
  | WorkstreamWithLatestStatus;
interface WorkstreamParentGroup {
  key: string;
  name: string;
  parent: WorkstreamGroupParent | null;
  workstreams: WorkstreamWithLatestStatus[];
}

const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
const ISO_DATE_OR_TIMESTAMP_PATTERN =
  '^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?(?:Z|[+-]\\d{2}:\\d{2})?)?$';
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;
const DEFAULT_AUTH_FAILURE_LIMIT_PER_MINUTE = 20;
const DEFAULT_TIMELINE_RELATIVE_DAYS = 7;
const MAX_TIMELINE_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const text = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (v instanceof Date ? v.toISOString() : v));

class ToolError extends Error {}

function schema(properties: Record<string, any> = {}, required: string[] = []) {
  return { type: 'object', properties, required, additionalProperties: false };
}
const stringProp = (min = 0, max?: number) => ({
  type: 'string',
  ...(min ? { minLength: min } : {}),
  ...(max ? { maxLength: max } : {}),
});
const arrayProp = (items: any, maxItems = 50) => ({ type: 'array', items, maxItems });
const uuidProp = () => ({ type: 'string', format: 'uuid', pattern: UUID_PATTERN });
const dateProp = () => ({ type: 'string', pattern: ISO_DATE_OR_TIMESTAMP_PATTERN });
const limitProp = (defaultLimit = 100, maximum = 200, minimum = 1) => ({
  type: 'integer',
  minimum,
  maximum,
  default: defaultLimit,
});
const colorProp = () => ({ type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' });
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const authFailureBuckets = new Map<string, RateLimitBucket>();

function clean<T>(value: T): T {
  return JSON.parse(text(value));
}
function ok(data: Record<string, any>) {
  return { ok: true, ...clean(data) };
}
function limit(args: Record<string, any>, defaultLimit = 100, max = 200, min = 1) {
  const raw = args.limit ?? defaultLimit;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw))
    throw new ToolError('limit must be a finite integer');
  if (raw < min) throw new ToolError(`limit must be at least ${min}`);
  if (raw > max) throw new ToolError(`limit must be ${max} or fewer`);
  return raw;
}
function integerArg(args: Record<string, any>, key: string, min?: number, max?: number) {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value))
    throw new ToolError(`${key} must be a finite integer`);
  if (min !== undefined && value < min) throw new ToolError(`${key} must be at least ${min}`);
  if (max !== undefined && value > max) throw new ToolError(`${key} must be ${max} or fewer`);
  return value;
}
function requireString(args: Record<string, any>, key: string, max?: number) {
  if (typeof args[key] !== 'string' || args[key].trim().length === 0)
    throw new ToolError(`${key} is required`);
  const value = args[key].trim();
  if (max && value.length > max) throw new ToolError(`${key} must be ${max} characters or fewer`);
  return value;
}
function optionalString(args: Record<string, any>, key: string, max?: number, nullable = false) {
  if (args[key] === undefined) return undefined;
  if (args[key] === null && nullable) return null;
  if (typeof args[key] !== 'string') throw new ToolError(`${key} must be a string`);
  if (max && args[key].length > max)
    throw new ToolError(`${key} must be ${max} characters or fewer`);
  return args[key];
}
function dateArg(value: unknown, key: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolError(`${key} must be an ISO date string`);
  if (!new RegExp(ISO_DATE_OR_TIMESTAMP_PATTERN).test(value))
    throw new ToolError(`${key} must be a valid ISO date or timestamp`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ToolError(`${key} must be a valid ISO date`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new ToolError(`${key} must be a valid ISO date`);
  }
  return date;
}
function validateDateRange(start?: Date, end?: Date) {
  if (start && end && start.getTime() > end.getTime())
    throw new ToolError('startDate must be before or equal to endDate');
}
function validateTimelineDateRange(start: Date, end: Date) {
  validateDateRange(start, end);
  if (end.getTime() - start.getTime() > MAX_TIMELINE_RANGE_DAYS * DAY_MS)
    throw new ToolError(`timeline date range must be ${MAX_TIMELINE_RANGE_DAYS} days or fewer`);
}
function resolveTimelineDateRange(args: Record<string, any>): { startDate: Date; endDate: Date } {
  const explicitStartDate = dateArg(args.startDate, 'startDate');
  const explicitEndDate = dateArg(args.endDate, 'endDate');

  if (explicitStartDate || explicitEndDate) {
    const startDate =
      explicitStartDate ?? new Date(explicitEndDate!.getTime() - MAX_TIMELINE_RANGE_DAYS * DAY_MS);
    const endDate =
      explicitEndDate ?? new Date(explicitStartDate!.getTime() + MAX_TIMELINE_RANGE_DAYS * DAY_MS);
    validateTimelineDateRange(startDate, endDate);
    return { startDate, endDate };
  }

  const days =
    args.relativeDays === undefined
      ? DEFAULT_TIMELINE_RELATIVE_DAYS
      : integerArg(args, 'relativeDays', 1, MAX_TIMELINE_RANGE_DAYS);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * DAY_MS);
  validateTimelineDateRange(startDate, endDate);
  return { startDate, endDate };
}
function requireConfirm(args: Record<string, any>) {
  if (args.confirm !== true) throw new ToolError('confirm: true is required');
}
function normalizeColor(color: string) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) throw new ToolError('color must be #RRGGBB');
  return color.toUpperCase();
}
async function assertWorkstream(projectId: string, workstreamId: string) {
  const ws = await getWorkstreamById(workstreamId, projectId);
  if (!ws) throw new ToolError('Workstream not found');
  return ws;
}

function bucketLimit(map: Map<string, RateLimitBucket>, key: string, perMinute: number): boolean {
  if (!Number.isFinite(perMinute) || perMinute <= 0) return true;
  const now = Date.now();
  const current = map.get(key);
  if (!current || now - current.windowStart >= 60_000) {
    map.set(key, { windowStart: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= perMinute;
}
function cleanupBuckets(map: Map<string, RateLimitBucket>): void {
  const cutoff = Date.now() - 60_000;
  Array.from(map.entries()).forEach(([key, bucket]) => {
    if (bucket.windowStart < cutoff) map.delete(key);
  });
}
function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}
function authFailureLimit(): number {
  const value = Number(
    process.env.MCP_AUTH_FAILURE_RATE_LIMIT_PER_MINUTE ??
      String(DEFAULT_AUTH_FAILURE_LIMIT_PER_MINUTE),
  );
  return Number.isFinite(value) ? value : DEFAULT_AUTH_FAILURE_LIMIT_PER_MINUTE;
}
function isAuthFailureRateLimited(req: Request): boolean {
  cleanupBuckets(authFailureBuckets);
  const key = clientIp(req);
  const bucket = authFailureBuckets.get(key);
  const limited =
    !!bucket && Date.now() - bucket.windowStart < 60_000 && bucket.count >= authFailureLimit();
  if (limited) logger.warn(`MCP auth failure rate limit hit ip=${key}`);
  return limited;
}
function recordAuthFailure(req: Request, reason: string): void {
  const key = clientIp(req);
  bucketLimit(authFailureBuckets, key, authFailureLimit());
  logger.warn(`MCP auth failure ip=${key} reason=${reason}`);
}

async function authenticate(req: Request): Promise<McpContext | null> {
  const auth = req.header('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const verified = await verifyPersonalAccessToken(match[1]);
  if (!verified) return null;
  const project = await prisma.project.findFirst({
    where: { personId: verified.personId },
    orderBy: { createdAt: 'asc' },
  });
  if (!project) return null;
  return { ...verified, projectId: project.id };
}

function validateValue(value: unknown, propSchema: any, key: string): void {
  if (propSchema?.anyOf) {
    const valid = propSchema.anyOf.some((candidate: any) => {
      try {
        validateValue(value, candidate, key);
        return true;
      } catch {
        return false;
      }
    });
    if (!valid) throw new ToolError(`${key} is invalid`);
    return;
  }

  if (propSchema?.enum) {
    if (!propSchema.enum.includes(value))
      throw new ToolError(`${key} must be one of: ${propSchema.enum.join(', ')}`);
    return;
  }

  switch (propSchema?.type) {
    case 'string':
      if (typeof value !== 'string') throw new ToolError(`${key} must be a string`);
      if (propSchema.minLength !== undefined && value.length < propSchema.minLength)
        throw new ToolError(`${key} must be at least ${propSchema.minLength} characters`);
      if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength)
        throw new ToolError(`${key} must be ${propSchema.maxLength} characters or fewer`);
      if (propSchema.pattern && !new RegExp(propSchema.pattern).test(value))
        throw new ToolError(`${key} is invalid`);
      if (propSchema.format === 'uuid' && !new RegExp(UUID_PATTERN).test(value))
        throw new ToolError(`${key} must be a valid UUID`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') throw new ToolError(`${key} must be a boolean`);
      break;
    case 'integer':
      if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value))
        throw new ToolError(`${key} must be a finite integer`);
      if (propSchema.minimum !== undefined && value < propSchema.minimum)
        throw new ToolError(`${key} must be at least ${propSchema.minimum}`);
      if (propSchema.maximum !== undefined && value > propSchema.maximum)
        throw new ToolError(`${key} must be ${propSchema.maximum} or fewer`);
      break;
    case 'array':
      if (!Array.isArray(value)) throw new ToolError(`${key} must be an array`);
      if (propSchema.maxItems !== undefined && value.length > propSchema.maxItems)
        throw new ToolError(`${key} must contain ${propSchema.maxItems} items or fewer`);
      value.forEach((item, index) =>
        validateValue(item, propSchema.items ?? {}, `${key}[${index}]`),
      );
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new ToolError(`${key} must be an object`);
      break;
    case 'null':
      if (value !== null) throw new ToolError(`${key} must be null`);
      break;
    default:
      break;
  }
}

function validateArgs(tool: ToolDef, args: unknown): Record<string, any> {
  if (typeof args !== 'object' || args === null || Array.isArray(args))
    throw new ToolError('arguments must be an object');
  const typedArgs = args as Record<string, any>;
  const properties = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];

  for (const key of required) {
    if (typedArgs[key] === undefined) throw new ToolError(`${key} is required`);
  }
  if (tool.inputSchema?.additionalProperties === false) {
    for (const key of Object.keys(typedArgs)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key))
        throw new ToolError(`${key} is not allowed`);
    }
  }
  for (const [key, propSchema] of Object.entries(properties)) {
    if (typedArgs[key] !== undefined) validateValue(typedArgs[key], propSchema, key);
  }
  return typedArgs;
}

function checkRateLimit(ctx: McpContext): boolean {
  cleanupBuckets(rateLimitBuckets);
  const perMinute = Number(
    process.env.MCP_RATE_LIMIT_PER_MINUTE ?? String(DEFAULT_RATE_LIMIT_PER_MINUTE),
  );
  const tokenId = ctx.personalAccessToken.id;
  const allowed = bucketLimit(rateLimitBuckets, tokenId, perMinute);
  if (!allowed) logger.warn(`MCP rate limit hit tokenId=${tokenId} personId=${ctx.personId}`);
  return allowed;
}

function targetIdFromArgs(args: Record<string, any>): string | undefined {
  if (typeof args.id === 'string') return args.id;
  if (typeof args.workstreamId === 'string') return args.workstreamId;
  if (Array.isArray(args.categoryIds)) return args.categoryIds.join(',');
  return undefined;
}

function shouldAudit(tool: ToolDef): boolean {
  return (
    tool.scope === 'mcp:write' ||
    tool.annotations?.destructiveHint ||
    /_(close|reopen|reorder|delete)$/.test(tool.name)
  );
}

function auditTool(
  ctx: McpContext,
  tool: ToolDef,
  args: Record<string, any>,
  success: boolean,
): void {
  if (!shouldAudit(tool)) return;
  logger.info(
    `MCP audit tokenId=${ctx.personalAccessToken.id} personId=${ctx.personId} tool=${tool.name} targetId=${targetIdFromArgs(args) ?? 'none'} success=${success}`,
  );
}

function sanitizeToolError(err: any): string {
  if (err instanceof ToolError) return err.message;
  const message = typeof err?.message === 'string' ? err.message : '';
  if (/not found|access denied/i.test(message)) return 'Not found';
  if (/sub-stream|cycle|own parent|closed parent|parent stream depth/i.test(message))
    return message;
  return 'Tool failed';
}

const MCP_CURSOR_KEY = crypto
  .createHash('sha256')
  .update(
    process.env.MCP_CURSOR_SECRET || process.env.SESSION_SECRET || 'workstream-cockpit-mcp-cursor',
  )
  .digest();

function encodeCursor(payload: CursorPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MCP_CURSOR_KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
function decodeCursor(value: unknown, kind: CursorKind): CursorPayload | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolError('cursor must be a string');
  try {
    const raw = Buffer.from(value, 'base64url');
    if (raw.length <= 28) throw new Error('bad cursor');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MCP_CURSOR_KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const parsed = JSON.parse(
      Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'),
    ) as CursorPayload;
    if (
      parsed.v !== 1 ||
      parsed.kind !== kind ||
      typeof parsed.id !== 'string' ||
      !parsed.createdAt
    )
      throw new Error('bad cursor');
    const createdAt = dateArg(parsed.createdAt, 'cursor.createdAt');
    if (!createdAt) throw new Error('bad cursor date');
    return parsed;
  } catch {
    throw new ToolError('cursor is invalid');
  }
}
function encodeTimelineServiceCursor(payload: CursorPayload): string {
  return encodeOpaqueCursor({
    v: 1,
    kind: 'timeline',
    createdAt: payload.createdAt,
    id: payload.id,
  });
}
function compareDesc(
  a: { createdAt: Date | string; id: string },
  b: { createdAt: Date | string; id: string },
): number {
  const at = new Date(a.createdAt).getTime();
  const bt = new Date(b.createdAt).getTime();
  if (bt !== at) return bt - at;
  return b.id.localeCompare(a.id);
}
function afterCursor<T extends { createdAt: Date | string; id: string }>(
  items: T[],
  cursor: CursorPayload | undefined,
): T[] {
  if (!cursor) return items;
  const cursorTime = new Date(cursor.createdAt).getTime();
  return items.filter((item) => {
    const itemTime = new Date(item.createdAt).getTime();
    return itemTime < cursorTime || (itemTime === cursorTime && item.id < cursor.id);
  });
}
function selectedAncestorForGrouping(
  workstream: WorkstreamWithLatestStatus,
  selectedParentIds: Set<string>,
): WorkstreamGroupParent | null {
  if (selectedParentIds.size === 0 || !workstream.parentId) return null;
  const ancestors: WorkstreamGroupParent[] = [...(workstream.parentStreams ?? [])];
  if (workstream.parent && !ancestors.some((ancestor) => ancestor.id === workstream.parent?.id))
    ancestors.push(workstream.parent);
  for (const ancestor of ancestors.slice().reverse()) {
    if (selectedParentIds.has(ancestor.id)) return ancestor;
  }
  return null;
}
function groupWorkstreamsByParent(
  workstreams: WorkstreamWithLatestStatus[],
  scopedParentIds: string[] = [],
) {
  const selectedParentIds = new Set(scopedParentIds.filter(Boolean));
  const byId = new Map(workstreams.map((workstream) => [workstream.id, workstream]));
  const groupsByParent = new Map<string, WorkstreamParentGroup>();
  const topLevel: WorkstreamWithLatestStatus[] = [];

  for (const workstream of workstreams) {
    if (!workstream.parentId) {
      topLevel.push(workstream);
      continue;
    }

    const scopedParent = selectedAncestorForGrouping(workstream, selectedParentIds);
    const groupParentId = scopedParent?.id ?? workstream.parentId;
    const parent = scopedParent ?? byId.get(groupParentId) ?? workstream.parent;
    if (!parent) {
      topLevel.push(workstream);
      continue;
    }

    const group: WorkstreamParentGroup = groupsByParent.get(groupParentId) ?? {
      key: groupParentId,
      name: parent.number ? `#${parent.number} ${parent.name}` : parent.name,
      parent,
      workstreams: [],
    };
    group.workstreams.push(workstream);
    groupsByParent.set(groupParentId, group);
  }

  const groups = Array.from(groupsByParent.values());
  if (topLevel.length > 0)
    groups.push({
      key: 'top-level',
      name: 'Top level / no parent',
      parent: null,
      workstreams: topLevel,
    });
  return groups;
}
function paginate<T extends { createdAt: Date | string; id: string }>(
  items: T[],
  pageLimit: number,
  kind: CursorKind,
): { page: T[]; nextCursor: string | null } {
  const page = items.slice(0, pageLimit);
  const hasMore = items.length > pageLimit;
  const last = page[page.length - 1];
  return {
    page,
    nextCursor:
      hasMore && last
        ? encodeCursor({
            v: 1,
            kind,
            createdAt: new Date(last.createdAt).toISOString(),
            id: last.id,
          })
        : null,
  };
}

const tools: ToolDef[] = [
  {
    name: 'workstreams_list',
    description: 'List workstreams',
    scope: 'mcp:read',
    inputSchema: schema({
      state: { enum: ['active', 'closed', 'all'], default: 'active' },
      tagNames: arrayProp(stringProp(1, 100)),
      categoryIds: arrayProp(uuidProp()),
      notUpdatedToday: { type: 'boolean', default: false },
      hierarchy: {
        enum: ['all', 'top-level', 'sub-streams', 'no-parent', 'has-substreams', 'under-parent'],
      },
      parentId: uuidProp(),
      parentIds: arrayProp(uuidProp()),
      includeSubstreams: { type: 'boolean', default: false },
      groupBy: { enum: ['none', 'parent'], default: 'none' },
      limit: limitProp(),
      cursor: stringProp(1, 2048),
    }),
    handler: async (args, ctx) => {
      const state = args.state === 'all' ? undefined : (args.state ?? 'active');
      const pageLimit = limit(args);
      const cursor = decodeCursor(args.cursor, 'workstreams_list');
      const selectedParentIds =
        Array.isArray(args.parentIds) && args.parentIds.length
          ? args.parentIds
          : args.parentId
            ? [args.parentId]
            : [];
      const hierarchy =
        args.hierarchy || selectedParentIds.length || args.includeSubstreams !== undefined
          ? {
              mode:
                (args.hierarchy as WorkstreamHierarchyFilter | undefined) ??
                (selectedParentIds.length ? 'under-parent' : 'all'),
              parentId: args.parentId,
              parentIds: selectedParentIds,
              includeSubstreams: Boolean(args.includeSubstreams),
            }
          : undefined;
      const allWorkstreams = await getWorkstreams(
        ctx.projectId,
        state,
        args.tagNames,
        args.categoryIds,
        args.notUpdatedToday,
        hierarchy,
      );
      const sorted = afterCursor(allWorkstreams.sort(compareDesc), cursor);
      const { page, nextCursor } = paginate(sorted, pageLimit, 'workstreams_list');
      const groups =
        args.groupBy === 'parent'
          ? groupWorkstreamsByParent(
              page,
              hierarchy?.mode === 'under-parent' ? selectedParentIds : [],
            )
          : undefined;
      return ok({ workstreams: page, ...(groups ? { groups } : {}), nextCursor });
    },
  },
  {
    name: 'workstreams_get',
    description: 'Get a workstream',
    scope: 'mcp:read',
    inputSchema: schema(
      {
        id: uuidProp(),
        includeUpdates: { type: 'boolean', default: false },
        updatesLimit: limitProp(50, 200),
      },
      ['id'],
    ),
    handler: async (args, ctx) => {
      const workstream = await assertWorkstream(ctx.projectId, requireString(args, 'id'));
      const updates = args.includeUpdates
        ? await prisma.statusUpdate.findMany({
            where: { workstreamId: workstream.id },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit({ limit: args.updatesLimit }, 50),
          })
        : [];
      return ok({ workstream, updates });
    },
  },
  {
    name: 'workstreams_create',
    description: 'Create a workstream',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        name: stringProp(1, 200),
        categoryId: uuidProp(),
        parentId: uuidProp(),
        context: stringProp(0, 2000),
        initialStatus: stringProp(0, 500),
        initialNote: stringProp(0, 2000),
      },
      ['name'],
    ),
    handler: async (args, ctx) =>
      ok({
        workstream: await createWorkstream({
          projectId: ctx.projectId,
          name: requireString(args, 'name', 200),
          categoryId: optionalString(args, 'categoryId', 100) as any,
          parentId: optionalString(args, 'parentId', 100) as any,
          context: optionalString(args, 'context', 2000) as any,
          initialStatus: optionalString(args, 'initialStatus', 500) as any,
          initialNote: optionalString(args, 'initialNote', 2000) as any,
        }),
      }),
  },
  {
    name: 'workstreams_update',
    description: 'Update a workstream',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        id: uuidProp(),
        name: stringProp(1, 200),
        categoryId: { anyOf: [uuidProp(), { type: 'null' }] },
        parentId: { anyOf: [uuidProp(), { type: 'null' }] },
        context: { anyOf: [stringProp(0, 2000), { type: 'null' }] },
      },
      ['id'],
    ),
    handler: async (args, ctx) => {
      await assertWorkstream(ctx.projectId, requireString(args, 'id'));
      const data: any = {};
      if (args.name !== undefined) data.name = requireString(args, 'name', 200);
      if (args.categoryId !== undefined)
        data.categoryId = optionalString(args, 'categoryId', 100, true);
      if (args.parentId !== undefined) data.parentId = optionalString(args, 'parentId', 100, true);
      if (args.context !== undefined) data.context = optionalString(args, 'context', 2000, true);
      return ok({ workstream: await updateWorkstream(args.id, ctx.projectId, data) });
    },
  },
  {
    name: 'workstreams_close',
    description: 'Close a workstream',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp() }, ['id']),
    handler: async (args, ctx) =>
      ok({ workstream: await closeWorkstream(requireString(args, 'id'), ctx.projectId) }),
  },
  {
    name: 'workstreams_reopen',
    description: 'Reopen a workstream',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp() }, ['id']),
    handler: async (args, ctx) =>
      ok({ workstream: await reopenWorkstream(requireString(args, 'id'), ctx.projectId) }),
  },

  {
    name: 'updates_list',
    description: 'List updates for a workstream',
    scope: 'mcp:read',
    inputSchema: schema(
      {
        workstreamId: uuidProp(),
        includeSubstreams: { type: 'boolean', default: false },
        startDate: dateProp(),
        endDate: dateProp(),
        limit: limitProp(50, 200, 50),
        cursor: stringProp(1, 2048),
      },
      ['workstreamId'],
    ),
    handler: async (args, ctx) => {
      await assertWorkstream(ctx.projectId, requireString(args, 'workstreamId'));
      const start = dateArg(args.startDate, 'startDate');
      const end = dateArg(args.endDate, 'endDate');
      validateDateRange(start, end);
      const pageLimit = limit(args, 50, 200, 50);
      const cursor = decodeCursor(args.cursor, 'updates_list');
      const createdAt: any = {};
      if (start) createdAt.gte = start;
      if (end) createdAt.lte = end;
      if (cursor) {
        createdAt.lt = new Date(cursor.createdAt);
      }
      const workstreamIds = args.includeSubstreams
        ? [
            args.workstreamId,
            ...(await getSubstreamWorkstreamIds(ctx.projectId, args.workstreamId)),
          ]
        : [args.workstreamId];
      const baseWhere: any = {
        workstreamId: { in: workstreamIds },
        ...(start || end || cursor ? { createdAt } : {}),
      };
      let updates = await prisma.statusUpdate.findMany({
        where: baseWhere,
        include: args.includeSubstreams
          ? { workstream: { select: { id: true, number: true, name: true } } }
          : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageLimit + 1,
      });
      if (cursor) {
        const sameCreatedAtWhere: any = {
          workstreamId: { in: workstreamIds },
          createdAt: new Date(cursor.createdAt),
          id: { lt: cursor.id },
        };
        if (start || end)
          sameCreatedAtWhere.createdAt = {
            equals: new Date(cursor.createdAt),
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          };
        const sameTime = await prisma.statusUpdate.findMany({
          where: sameCreatedAtWhere,
          include: args.includeSubstreams
            ? { workstream: { select: { id: true, number: true, name: true } } }
            : undefined,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: pageLimit + 1,
        });
        updates = [...sameTime, ...updates].sort(compareDesc).slice(0, pageLimit + 1);
      }
      const { page, nextCursor } = paginate(updates, pageLimit, 'updates_list');
      if (!args.includeSubstreams) return ok({ updates: page, nextCursor });
      const breadcrumbByWorkstream = new Map<string, string>();
      for (const id of workstreamIds) {
        const breadcrumb = await getBreadcrumbForWorkstream(ctx.projectId, id);
        breadcrumbByWorkstream.set(id, breadcrumb.map((item: any) => item.name).join(' > '));
      }
      const enriched = page.map(({ workstream, ...update }: any) => ({
        ...update,
        source: {
          id: workstream.id,
          number: workstream.number,
          workstreamId: workstream.id,
          workstreamName: workstream.name,
          name: workstream.name,
        },
        breadcrumb: breadcrumbByWorkstream.get(workstream.id) ?? workstream.name,
      }));
      return ok({ updates: enriched, nextCursor });
    },
  },
  {
    name: 'updates_get',
    description: 'Get an update',
    scope: 'mcp:read',
    inputSchema: schema({ id: uuidProp(), workstreamId: uuidProp() }, ['id', 'workstreamId']),
    handler: async (args, ctx) => {
      await assertWorkstream(ctx.projectId, requireString(args, 'workstreamId'));
      const update = await prisma.statusUpdate.findFirst({
        where: { id: requireString(args, 'id'), workstreamId: args.workstreamId },
      });
      if (!update) throw new ToolError('Update not found');
      return ok({ update });
    },
  },
  {
    name: 'updates_create',
    description: 'Create an update',
    scope: 'mcp:write',
    inputSchema: schema(
      { workstreamId: uuidProp(), status: stringProp(1, 500), note: stringProp(0, 2000) },
      ['workstreamId', 'status'],
    ),
    handler: async (args, ctx) => {
      await assertWorkstream(ctx.projectId, requireString(args, 'workstreamId'));
      return ok({
        update: await createStatusUpdate({
          workstreamId: args.workstreamId,
          status: requireString(args, 'status', 500),
          note: optionalString(args, 'note', 2000) as any,
        }),
      });
    },
  },
  {
    name: 'updates_update',
    description: 'Update an update',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        id: uuidProp(),
        workstreamId: uuidProp(),
        status: stringProp(1, 500),
        note: { anyOf: [stringProp(0, 2000), { type: 'null' }] },
      },
      ['id', 'workstreamId'],
    ),
    handler: async (args, ctx) => {
      await assertWorkstream(ctx.projectId, requireString(args, 'workstreamId'));
      return ok({
        update: await updateStatusUpdate(requireString(args, 'id'), args.workstreamId, {
          status: optionalString(args, 'status', 500) as any,
          note: optionalString(args, 'note', 2000, true) as any,
        }),
      });
    },
  },
  {
    name: 'updates_delete',
    description: 'Delete an update',
    scope: 'mcp:write',
    inputSchema: schema(
      { id: uuidProp(), workstreamId: uuidProp(), confirm: { type: 'boolean' } },
      ['id', 'workstreamId', 'confirm'],
    ),
    annotations: { destructiveHint: true },
    handler: async (args, ctx) => {
      requireConfirm(args);
      await assertWorkstream(ctx.projectId, requireString(args, 'workstreamId'));
      const id = requireString(args, 'id');
      await deleteStatusUpdate(id, args.workstreamId);
      return ok({ deletedId: id });
    },
  },

  {
    name: 'settings_get',
    description: 'Get settings',
    scope: 'mcp:read',
    inputSchema: schema({ include: arrayProp({ enum: ['categories', 'tags', 'views'] }, 3) }),
    handler: async (args, ctx) => {
      const include =
        Array.isArray(args.include) && args.include.length
          ? args.include
          : ['categories', 'tags', 'views'];
      const data: Record<string, any> = {};
      if (include.includes('categories'))
        data.categories = await getCategoriesByProjectId(ctx.projectId);
      if (include.includes('tags')) data.tags = await getTagsByProjectId(ctx.projectId);
      if (include.includes('views')) data.views = await viewService.getProjectViews(ctx.projectId);
      return ok(data);
    },
  },
  {
    name: 'settings_category_create',
    description: 'Create category',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        name: stringProp(1, 100),
        color: colorProp(),
        emoji: stringProp(0, 16),
        description: stringProp(0, 2000),
      },
      ['name', 'color'],
    ),
    handler: async (args, ctx) =>
      ok({
        category: await createCategory({
          projectId: ctx.projectId,
          name: requireString(args, 'name', 100),
          color: normalizeColor(requireString(args, 'color')),
          emoji: optionalString(args, 'emoji', 16) as any,
          description: optionalString(args, 'description', 2000) ?? '',
        }),
      }),
  },
  {
    name: 'settings_category_update',
    description: 'Update category',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        id: uuidProp(),
        name: stringProp(1, 100),
        color: colorProp(),
        emoji: { anyOf: [stringProp(0, 16), { type: 'null' }] },
        description: stringProp(0, 2000),
      },
      ['id'],
    ),
    handler: async (args, ctx) => {
      const data: any = {};
      if (args.name !== undefined) data.name = requireString(args, 'name', 100);
      if (args.color !== undefined) data.color = normalizeColor(requireString(args, 'color'));
      if (args.emoji !== undefined) data.emoji = optionalString(args, 'emoji', 16, true);
      if (args.description !== undefined)
        data.description = optionalString(args, 'description', 2000) ?? '';
      return ok({ category: await updateCategory(requireString(args, 'id'), ctx.projectId, data) });
    },
  },
  {
    name: 'settings_category_delete',
    description: 'Delete category',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp(), confirm: { type: 'boolean' } }, ['id', 'confirm']),
    annotations: { destructiveHint: true },
    handler: async (args, ctx) => {
      requireConfirm(args);
      const id = requireString(args, 'id');
      await deleteCategory(id, ctx.projectId);
      return ok({ deletedId: id });
    },
  },
  {
    name: 'settings_category_reorder',
    description: 'Reorder categories',
    scope: 'mcp:write',
    inputSchema: schema({ categoryIds: arrayProp(uuidProp(), 200) }, ['categoryIds']),
    handler: async (args, ctx) =>
      ok({ categories: await reorderCategories(ctx.projectId, args.categoryIds) }),
  },

  {
    name: 'settings_tag_create',
    description: 'Create tag',
    scope: 'mcp:write',
    inputSchema: schema({ displayName: stringProp(1, 50), color: colorProp() }, [
      'displayName',
      'color',
    ]),
    handler: async (args, ctx) =>
      ok({
        tag: await createTag({
          projectId: ctx.projectId,
          displayName: requireString(args, 'displayName', 50),
          color: normalizeColor(requireString(args, 'color')),
        }),
      }),
  },
  {
    name: 'settings_tag_update',
    description: 'Update tag by UUID',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp(), displayName: stringProp(1, 50), color: colorProp() }, [
      'id',
    ]),
    handler: async (args, ctx) => {
      const data: any = {};
      if (args.displayName !== undefined) data.displayName = requireString(args, 'displayName', 50);
      if (args.color !== undefined) data.color = normalizeColor(requireString(args, 'color'));
      return ok({ tag: await updateTag(requireString(args, 'id'), ctx.projectId, data) });
    },
  },
  {
    name: 'settings_tag_delete',
    description: 'Delete tag by UUID',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp(), confirm: { type: 'boolean' } }, ['id', 'confirm']),
    annotations: { destructiveHint: true },
    handler: async (args, ctx) => {
      requireConfirm(args);
      const id = requireString(args, 'id');
      await deleteTag(id, ctx.projectId);
      return ok({ deletedId: id });
    },
  },

  {
    name: 'settings_views_list',
    description: 'List views',
    scope: 'mcp:read',
    inputSchema: schema(),
    handler: async (_args, ctx) => ok({ views: await viewService.getProjectViews(ctx.projectId) }),
  },
  {
    name: 'settings_view_get',
    description: 'Get view',
    scope: 'mcp:read',
    inputSchema: schema({ id: uuidProp() }, ['id']),
    handler: async (args, ctx) =>
      ok({ view: await viewService.getView(requireString(args, 'id'), ctx.projectId) }),
  },
  {
    name: 'settings_view_create',
    description: 'Create view',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        name: stringProp(1, 100),
        isDefault: { type: 'boolean', default: false },
        config: { type: 'object' },
      },
      ['name', 'config'],
    ),
    handler: async (args, ctx) =>
      ok({
        view: await viewService.createView(ctx.projectId, {
          name: requireString(args, 'name', 100),
          isDefault: Boolean(args.isDefault),
          config: args.config,
        }),
      }),
  },
  {
    name: 'settings_view_update',
    description: 'Update view',
    scope: 'mcp:write',
    inputSchema: schema(
      {
        id: uuidProp(),
        name: stringProp(1, 100),
        isDefault: { type: 'boolean' },
        config: { type: 'object' },
      },
      ['id'],
    ),
    handler: async (args, ctx) => {
      const data: any = {};
      if (args.name !== undefined) data.name = requireString(args, 'name', 100);
      if (args.isDefault !== undefined) data.isDefault = Boolean(args.isDefault);
      if (args.config !== undefined) data.config = args.config;
      return ok({
        view: await viewService.updateView(requireString(args, 'id'), ctx.projectId, data),
      });
    },
  },
  {
    name: 'settings_view_delete',
    description: 'Delete view',
    scope: 'mcp:write',
    inputSchema: schema({ id: uuidProp(), confirm: { type: 'boolean' } }, ['id', 'confirm']),
    annotations: { destructiveHint: true },
    handler: async (args, ctx) => {
      requireConfirm(args);
      const id = requireString(args, 'id');
      await viewService.deleteView(id, ctx.projectId);
      return ok({ deletedId: id });
    },
  },

  {
    name: 'timeline_query',
    description: 'Query timeline',
    scope: 'mcp:read',
    inputSchema: schema({
      startDate: dateProp(),
      endDate: dateProp(),
      relativeDays: { type: 'integer', minimum: 1, maximum: 366, default: 7 },
      tagNames: arrayProp(stringProp(1, 100)),
      categoryIds: arrayProp(uuidProp()),
      eventTypes: arrayProp(
        {
          enum: [
            'status_update',
            'workstream_created',
            'workstream_closed',
            'parent_changed',
            'sub_stream_created',
          ],
        },
        5,
      ),
      streamScope: { enum: ['all', 'top-level', 'sub-streams', 'under-parent'] },
      parentId: uuidProp(),
      includeSubstreams: { type: 'boolean', default: false },
      limit: limitProp(50, 200),
      cursor: stringProp(1, 2048),
    }),
    handler: async (args, ctx) => {
      const { startDate, endDate } = resolveTimelineDateRange(args);
      const pageLimit = limit(args, 50, 200);
      const cursor = decodeCursor(args.cursor, 'timeline_query');
      const timelineCursor = cursor ? encodeTimelineServiceCursor(cursor) : undefined;
      const timeline = await getTimeline({
        projectId: ctx.projectId,
        startDate,
        endDate,
        tags: args.tagNames,
        categoryIds: args.categoryIds,
        eventTypes: args.eventTypes,
        streamScope: args.streamScope,
        parentId: args.parentId,
        includeSubstreams: args.includeSubstreams,
        limit: pageLimit,
        cursor: timelineCursor,
      });
      const events = Array.isArray(timeline) ? timeline : timeline.events;
      const last = events[events.length - 1];
      const nextCursor =
        !Array.isArray(timeline) && timeline.nextCursor && last
          ? encodeCursor({
              v: 1,
              kind: 'timeline_query',
              createdAt: new Date(last.createdAt).toISOString(),
              id: last.id,
            })
          : null;
      return ok({ events, nextCursor });
    },
  },
];

const byName = new Map(tools.map((t) => [t.name, t]));

function result(id: any, value: any) {
  return { jsonrpc: '2.0', id, result: value };
}
function error(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
function hasJsonRpcId(body: any): boolean {
  return Object.prototype.hasOwnProperty.call(body ?? {}, 'id');
}
function negotiateProtocolVersion(requested: unknown): string {
  return typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

async function handleRpc(body: any, ctx: McpContext) {
  const isNotification = !hasJsonRpcId(body);
  const id = hasJsonRpcId(body) ? body.id : null;
  if (body?.jsonrpc !== '2.0' || typeof body?.method !== 'string')
    return isNotification ? undefined : error(id, -32600, 'Invalid JSON-RPC request');
  if (body.method === 'notifications/initialized' || body.method === 'initialized')
    return undefined;
  if (body.method === 'ping') return isNotification ? undefined : result(id, {});
  if (body.method === 'resources/list')
    return isNotification ? undefined : result(id, { resources: [] });
  if (body.method === 'resources/templates/list')
    return isNotification ? undefined : result(id, { resourceTemplates: [] });
  if (body.method === 'prompts/list')
    return isNotification ? undefined : result(id, { prompts: [] });
  if (body.method === 'initialize')
    return isNotification
      ? undefined
      : result(id, {
          protocolVersion: negotiateProtocolVersion(body.params?.protocolVersion),
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'workstream-cockpit', version: '1.0.0' },
        });
  if (body.method === 'tools/list')
    return isNotification
      ? undefined
      : result(id, {
          tools: Array.from(byName.values()).map(
            ({ handler: _handler, scope: _scope, ...tool }) => ({ ...tool }),
          ),
        });
  if (body.method === 'tools/call') {
    const name = body.params?.name;
    const tool = byName.get(name);
    if (!tool) return isNotification ? undefined : error(id, -32602, 'Unknown tool');
    if (!ctx.scopes.includes(tool.scope))
      return isNotification ? undefined : error(id, -32001, `Tool requires ${tool.scope} scope`);
    let args: Record<string, any> = {};
    try {
      args = validateArgs(tool, body.params?.arguments ?? {});
      const structuredContent = await tool.handler(args, ctx);
      auditTool(ctx, tool, args, true);
      return isNotification
        ? undefined
        : result(id, {
            content: [{ type: 'text', text: structuredContent.summary || 'OK' }],
            structuredContent,
          });
    } catch (err: any) {
      auditTool(ctx, tool, args, false);
      return isNotification ? undefined : error(id, -32000, sanitizeToolError(err));
    }
  }
  return isNotification ? undefined : error(id, -32601, 'Method not found');
}

async function handleBody(body: any, ctx: McpContext): Promise<any | undefined> {
  if (Array.isArray(body)) {
    if (body.length === 0) return error(null, -32600, 'Invalid JSON-RPC batch');
    const responses = (await Promise.all(body.map((item) => handleRpc(item, ctx)))).filter(Boolean);
    return responses.length ? responses : undefined;
  }
  return handleRpc(body, ctx);
}

export function createMcpRouter(): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ error: 'MCP streaming over GET is not supported; use POST /mcp' });
  });
  router.post('/', async (req: Request, res: Response) => {
    if (isAuthFailureRateLimited(req))
      return res.status(429).json({ error: 'Authentication rate limit exceeded' });
    const ctx = await authenticate(req);
    if (!ctx) {
      recordAuthFailure(req, 'invalid_or_missing_bearer_pat');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!checkRateLimit(ctx)) return res.status(429).json({ error: 'Rate limit exceeded' });
    const response = await handleBody(req.body, ctx);
    if (response === undefined) return res.status(202).end();
    return res.status(200).json(response);
  });
  return router;
}

export default createMcpRouter;
