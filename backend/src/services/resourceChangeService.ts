import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type ResourceChangeType =
  | 'workstream'
  | 'status_update'
  | 'next_step'
  | 'view'
  | 'category'
  | 'tag';

export type ResourceChangeOperation =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'closed'
  | 'reopened'
  | 'solved'
  | 'abandoned'
  | 'reordered';

export interface LogResourceChangeInput {
  projectId: string;
  resourceType: ResourceChangeType;
  resourceId?: string | null;
  resourceLabel?: string | null;
  operation: ResourceChangeOperation;
  workstreamId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function logResourceChange(
  input: LogResourceChangeInput,
  client: PrismaExecutor = prisma,
) {
  return client.resourceChange.create({
    data: {
      projectId: input.projectId,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      resourceLabel: input.resourceLabel ?? null,
      operation: input.operation,
      workstreamId: input.workstreamId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listResourceChanges(projectId: string, after?: string | null, limit = 10) {
  const normalizedLimit = Math.min(Math.max(limit, 1), 50);
  const where: Prisma.ResourceChangeWhereInput = { projectId };
  if (after) {
    const cursor = await prisma.resourceChange.findFirst({
      where: { id: after, projectId },
      select: { changedAt: true, id: true },
    });
    if (cursor) {
      where.OR = [
        { changedAt: { gt: cursor.changedAt } },
        { changedAt: cursor.changedAt, id: { gt: cursor.id } },
      ];
    }
  }

  const changes = await prisma.resourceChange.findMany({
    where,
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    take: normalizedLimit,
  });
  const newest = changes[0];
  return {
    cursor: newest?.id ?? after ?? null,
    changes,
  };
}
