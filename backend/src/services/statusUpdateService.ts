import { Prisma, PrismaClient, StatusUpdate } from '@prisma/client';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  getBreadcrumbForWorkstream,
  getSubstreamWorkstreamIds,
  isPublicNumberReference,
} from './workstreamService';
import { logResourceChange } from './resourceChangeService';
import { VersionConflictError } from './versionConflictError';

const prisma = new PrismaClient();
type PrismaTx = Prisma.TransactionClient;
type PrismaExecutor = PrismaClient | PrismaTx;

export interface CreateStatusUpdateInput {
  workstreamId: string;
  projectId?: string;
  status: string;
  note?: string;
  impact?: 'active' | 'info' | 'initial';
}

export interface UpdateStatusUpdateInput {
  expectedVersion: number;
  status?: string;
  note?: string | null;
}

export interface StatusUpdateListOptions {
  includeSubstreams?: boolean;
  projectId?: string;
  limit?: number;
  cursor?: string;
}

export interface StatusUpdatePage {
  updates: any[];
  nextCursor: string | null;
}

const CURSOR_VERSION = 1;
const CURSOR_KEY = crypto
  .createHash('sha256')
  .update(
    process.env.STATUS_UPDATE_CURSOR_SECRET ||
      process.env.SESSION_SECRET ||
      'workstream-cockpit-status-update-cursor',
  )
  .digest();

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64url');
}

function encodeStatusUpdateCursor(update: Pick<StatusUpdate, 'createdAt' | 'id'>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CURSOR_KEY, iv);
  const plaintext = Buffer.from(
    JSON.stringify({ v: CURSOR_VERSION, createdAt: update.createdAt.toISOString(), id: update.id }),
    'utf8',
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return base64UrlEncode(Buffer.concat([iv, tag, ciphertext]));
}

function decodeStatusUpdateCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url');
    if (raw.length <= 28) throw new Error('Cursor payload is too short');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', CURSOR_KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8',
    );
    const parsed = JSON.parse(plaintext);
    if (
      parsed?.v !== CURSOR_VERSION ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      throw new Error('Invalid cursor payload');
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error('Invalid cursor timestamp');
    return { createdAt, id: parsed.id };
  } catch {
    throw new Error('Invalid cursor');
  }
}

export async function allocateStatusUpdateNumber(
  client: PrismaExecutor,
  projectId: string,
): Promise<number> {
  const project = await client.project.update({
    where: { id: projectId },
    data: { nextStatusUpdateNumber: { increment: 1 } },
    select: { nextStatusUpdateNumber: true },
  });
  return project.nextStatusUpdateNumber - 1;
}

async function resolveStatusUpdateReference(
  reference: string | number,
  projectId: string,
  client: PrismaExecutor = prisma,
): Promise<StatusUpdate | null> {
  const value = String(reference);
  if (isPublicNumberReference(value)) {
    return client.statusUpdate.findUnique({
      where: { projectId_number: { projectId, number: Number(value) } },
    });
  }
  return client.statusUpdate.findFirst({ where: { id: value, projectId } });
}

export async function createStatusUpdate(input: CreateStatusUpdateInput): Promise<StatusUpdate> {
  try {
    const statusUpdate = await prisma.$transaction(
      async (tx) => {
        const workstream = await tx.workstream.findUnique({
          where: { id: input.workstreamId },
          select: { projectId: true },
        });
        if (!workstream) throw new Error('Workstream not found');
        if (input.projectId && input.projectId !== workstream.projectId)
          throw new Error('Workstream not found');
        const projectId = workstream.projectId;
        const number = await allocateStatusUpdateNumber(tx, projectId);
        const statusUpdate = await tx.statusUpdate.create({
          data: {
            projectId,
            number,
            workstreamId: input.workstreamId,
            status: input.status,
            note: input.note || null,
            impact: input.impact ?? 'active',
          },
        });
        await logResourceChange(
          {
            projectId,
            resourceType: 'status_update',
            resourceId: statusUpdate.id,
            resourceLabel: statusUpdate.status,
            operation: 'created',
            workstreamId: statusUpdate.workstreamId,
          },
          tx,
        );
        return statusUpdate;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    logger.info(`Status update created: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    logger.error('Error creating status update:', error);
    throw error;
  }
}

export async function getStatusUpdatesByWorkstream(
  workstreamId: string,
  options: StatusUpdateListOptions = {},
): Promise<StatusUpdatePage> {
  try {
    const workstreamIds =
      options.includeSubstreams && options.projectId
        ? [workstreamId, ...(await getSubstreamWorkstreamIds(options.projectId, workstreamId))]
        : [workstreamId];
    const limit = options.limit ?? 10;
    const cursorBoundary = options.cursor ? decodeStatusUpdateCursor(options.cursor) : undefined;
    const where: Prisma.StatusUpdateWhereInput = {
      workstreamId: { in: workstreamIds },
      ...(cursorBoundary
        ? {
            OR: [
              { createdAt: { lt: cursorBoundary.createdAt } },
              { createdAt: cursorBoundary.createdAt, id: { lt: cursorBoundary.id } },
            ],
          }
        : {}),
    };
    const updates = await prisma.statusUpdate.findMany({
      where,
      include: { workstream: { select: { id: true, number: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasNextPage = updates.length > limit;
    const pageUpdates = hasNextPage ? updates.slice(0, limit) : updates;
    const nextCursor = hasNextPage
      ? encodeStatusUpdateCursor(pageUpdates[pageUpdates.length - 1])
      : null;
    if (!options.includeSubstreams || !options.projectId) {
      return {
        updates: pageUpdates.map(({ workstream: _workstream, ...update }) => update),
        nextCursor,
      };
    }
    const breadcrumbByWorkstream = new Map<string, string>();
    for (const id of workstreamIds) {
      const breadcrumb = await getBreadcrumbForWorkstream(options.projectId, id);
      breadcrumbByWorkstream.set(id, breadcrumb.map((item) => item.name).join(' > '));
    }
    return {
      updates: pageUpdates.map(({ workstream, ...update }) => ({
        ...update,
        source: {
          id: workstream.id,
          number: workstream.number,
          workstreamId: workstream.id,
          workstreamName: workstream.name,
          name: workstream.name,
        },
        breadcrumb: breadcrumbByWorkstream.get(workstream.id) ?? workstream.name,
      })),
      nextCursor,
    };
  } catch (error) {
    logger.error('Error getting status updates:', error);
    throw error;
  }
}

export async function updateStatusUpdate(
  statusUpdateReference: string | number,
  workstreamId: string,
  input: UpdateStatusUpdateInput,
  projectId?: string,
): Promise<StatusUpdate> {
  let resolvedStatusUpdateId: string | undefined;
  try {
    const existing = projectId
      ? await resolveStatusUpdateReference(statusUpdateReference, projectId)
      : await prisma.statusUpdate.findFirst({
          where: { id: String(statusUpdateReference), workstreamId },
        });
    if (!existing || existing.workstreamId !== workstreamId)
      throw new Error('Status update not found or access denied');
    resolvedStatusUpdateId = existing.id;
    const updates: any = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.note !== undefined) updates.note = input.note;
    const statusUpdate = await prisma.$transaction(async (tx) => {
      const mutation = await tx.statusUpdate.updateMany({
        where: {
          id: existing.id,
          workstreamId,
          ...(projectId ? { projectId } : {}),
          version: input.expectedVersion,
        },
        data: { ...updates, version: { increment: 1 } },
      });
      if (mutation.count === 0) {
        const current = await tx.statusUpdate.findFirst({
          where: { id: existing.id, workstreamId, ...(projectId ? { projectId } : {}) },
        });
        if (!current) throw new Error('Status update not found or access denied');
        throw new VersionConflictError(current);
      }
      const updated = await tx.statusUpdate.findUniqueOrThrow({ where: { id: existing.id } });
      await logResourceChange(
        {
          projectId: updated.projectId,
          resourceType: 'status_update',
          resourceId: updated.id,
          resourceLabel: updated.status,
          operation: 'updated',
          workstreamId: updated.workstreamId,
        },
        tx,
      );
      return updated;
    });
    logger.info(`Status update updated: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2034') {
      const current = await prisma.statusUpdate.findFirst({
        where: {
          id: resolvedStatusUpdateId ?? String(statusUpdateReference),
          workstreamId,
          ...(projectId ? { projectId } : {}),
        },
      });
      if (current && current.version !== input.expectedVersion) {
        throw new VersionConflictError(current);
      }
    }
    logger.error('Error updating status update:', error);
    throw error;
  }
}

export async function deleteStatusUpdate(
  statusUpdateId: string,
  workstreamId: string,
): Promise<void> {
  try {
    const existing = await prisma.statusUpdate.findFirst({
      where: { id: statusUpdateId, workstreamId },
    });
    if (!existing) throw new Error('Status update not found or access denied');
    await prisma.$transaction(async (tx) => {
      await tx.statusUpdate.delete({ where: { id: statusUpdateId } });
      await logResourceChange(
        {
          projectId: existing.projectId,
          resourceType: 'status_update',
          resourceId: existing.id,
          resourceLabel: existing.status,
          operation: 'deleted',
          workstreamId: existing.workstreamId,
        },
        tx,
      );
    });
    logger.info(`Status update deleted: ${statusUpdateId}`);
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}

export async function deleteStatusUpdateByReference(
  statusUpdateReference: string | number,
  workstreamId: string,
  projectId: string,
): Promise<void> {
  try {
    const existing = await resolveStatusUpdateReference(statusUpdateReference, projectId);
    if (!existing || existing.workstreamId !== workstreamId)
      throw new Error('Status update not found or access denied');
    await prisma.$transaction(async (tx) => {
      await tx.statusUpdate.delete({ where: { id: existing.id } });
      await logResourceChange(
        {
          projectId: existing.projectId,
          resourceType: 'status_update',
          resourceId: existing.id,
          resourceLabel: existing.status,
          operation: 'deleted',
          workstreamId: existing.workstreamId,
        },
        tx,
      );
    });
    logger.info(`Status update deleted: ${existing.id}`);
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}
