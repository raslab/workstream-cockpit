import { Prisma, PrismaClient, ResourceChange } from '@prisma/client';
import { getResourceChangeRequestContext } from '../middleware/resourceChangeRequestContext';

const prisma = new PrismaClient();
type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type ResourceChangeType =
  'workstream' | 'status_update' | 'next_step' | 'view' | 'category' | 'tag';

export type ResourceChangeOperation =
  'created' | 'updated' | 'deleted' | 'closed' | 'reopened' | 'solved' | 'abandoned' | 'reordered';

export interface LogResourceChangeInput {
  projectId: string;
  resourceType: ResourceChangeType;
  resourceId?: string | null;
  resourceLabel?: string | null;
  operation: ResourceChangeOperation;
  workstreamId?: string | null;
  workstreamNumber?: number | null;
  metadata?: Prisma.InputJsonValue | null;
  correlationId?: string | null;
}

export interface PublicResourceChangeMetadata {
  correlationId?: string;
  originClientId?: string;
  parentStreamNumbers?: number[];
}

export interface ResourceChangePayload {
  id: string;
  resourceType: string;
  resourceId: string | null;
  resourceLabel: string | null;
  operation: string;
  workstreamNumber: number | null;
  metadata: PublicResourceChangeMetadata | null;
  changedAt: Date;
}
type ResourceChangeSubscriber = (change: ResourceChangePayload) => void;

const subscribersByProject = new Map<string, Set<ResourceChangeSubscriber>>();

export function selectResourceChangeProjectId(projectIds: string[]): string | null {
  return projectIds[0] ?? null;
}

function toPayload(change: ResourceChange): ResourceChangePayload {
  const storedMetadata = (change.metadata as Record<string, unknown> | null) ?? null;
  const metadata: PublicResourceChangeMetadata = {};
  if (typeof storedMetadata?.correlationId === 'string') {
    metadata.correlationId = storedMetadata.correlationId;
  }
  if (typeof storedMetadata?.originClientId === 'string') {
    metadata.originClientId = storedMetadata.originClientId;
  }
  if (
    Array.isArray(storedMetadata?.parentStreamNumbers) &&
    storedMetadata.parentStreamNumbers.every((number) => Number.isInteger(number))
  ) {
    metadata.parentStreamNumbers = storedMetadata.parentStreamNumbers as number[];
  }

  return {
    id: change.id,
    resourceType: change.resourceType,
    resourceId:
      change.resourceType === 'workstream' || change.resourceId === change.workstreamId
        ? null
        : change.resourceId,
    resourceLabel: change.resourceLabel,
    operation: change.operation,
    workstreamNumber: change.workstreamNumber,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    changedAt: change.changedAt,
  };
}

export function subscribeToResourceChanges(
  projectId: string,
  subscriber: ResourceChangeSubscriber,
): () => void {
  const subscribers = subscribersByProject.get(projectId) ?? new Set<ResourceChangeSubscriber>();
  subscribers.add(subscriber);
  subscribersByProject.set(projectId, subscribers);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) subscribersByProject.delete(projectId);
  };
}

export function resetResourceChangeSubscribersForTest() {
  subscribersByProject.clear();
}

function publishResourceChange(change: ResourceChange) {
  const subscribers = subscribersByProject.get(change.projectId);
  if (!subscribers || subscribers.size === 0) return;
  const payload = toPayload(change);
  subscribers.forEach((subscriber) => subscriber(payload));
}

export async function logResourceChange(
  input: LogResourceChangeInput,
  client: PrismaExecutor = prisma,
) {
  const context = getResourceChangeRequestContext();
  const metadata = {
    ...((input.metadata as Record<string, unknown> | null | undefined) ?? {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(context.originClientId ? { originClientId: context.originClientId } : {}),
  };
  const workstreamNumber =
    input.workstreamNumber !== undefined
      ? input.workstreamNumber
      : input.workstreamId
        ? ((
            await client.workstream.findFirst({
              where: { id: input.workstreamId, projectId: input.projectId },
              select: { number: true },
            })
          )?.number ?? null)
        : null;
  const change = await client.resourceChange.create({
    data: {
      projectId: input.projectId,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      resourceLabel: input.resourceLabel ?? null,
      operation: input.operation,
      workstreamId: input.workstreamId ?? null,
      workstreamNumber,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    },
  });

  // Most mutation paths log inside Prisma transactions. Deferring publish until the next
  // macrotask avoids broadcasting before the transaction wrapper has had a chance to commit.
  setTimeout(() => publishResourceChange(change), 0);
  return change;
}

export async function listResourceChangesForProjects(
  projectIds: string[],
  after?: string | null,
  limit = 10,
) {
  const normalizedLimit = Math.min(Math.max(limit, 1), 50);
  const where: Prisma.ResourceChangeWhereInput = { projectId: { in: projectIds } };
  if (projectIds.length === 0) return { cursor: after ?? null, changes: [] };
  if (after) {
    const cursor = await prisma.resourceChange.findFirst({
      where: { id: after, projectId: { in: projectIds } },
      select: { sequence: true },
    });
    if (cursor) {
      where.sequence = { gt: cursor.sequence };
    }
  }

  const changes = await prisma.resourceChange.findMany({
    where,
    orderBy: [{ sequence: 'desc' }],
    take: normalizedLimit,
  });
  const newest = changes[0];
  return {
    cursor: newest?.id ?? after ?? null,
    changes: changes.map(toPayload),
  };
}

export async function listResourceChanges(projectId: string, after?: string | null, limit = 10) {
  return listResourceChangesForProjects([projectId], after, limit);
}
