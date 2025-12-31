import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * Setup test database before all tests
 */
export async function setupTestDatabase(): Promise<void> {
  // Run migrations
  execSync('npx prisma migrate deploy', { env: process.env });
}

/**
 * Clean database before each test
 */
export async function cleanDatabase(): Promise<void> {
  const tables = ['status_updates', 'workstreams', 'tags', 'projects', 'persons'];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
  }
}

/**
 * Disconnect from database after all tests
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Create a test person
 */
export async function createTestPerson(data?: { email?: string; name?: string }) {
  return prisma.person.create({
    data: {
      email: data?.email || 'test@example.com',
      name: data?.name || 'Test User',
    },
  });
}

/**
 * Create a test project
 */
export async function createTestProject(personId: string, data?: { name?: string }) {
  return prisma.project.create({
    data: {
      personId,
      name: data?.name || 'Test Project',
    },
  });
}

/**
 * Create a test tag
 */
export async function createTestTag(
  projectId: string,
  data?: { name?: string; color?: string; sortOrder?: number }
) {
  return prisma.tag.create({
    data: {
      projectId,
      name: data?.name || 'test-tag',
      color: data?.color || '#3B82F6',
      sortOrder: data?.sortOrder ?? 0,
    },
  });
}

/**
 * Create a test workstream
 */
export async function createTestWorkstream(
  projectId: string,
  data?: {
    name?: string;
    tagId?: string;
    context?: string;
    state?: string;
  }
) {
  return prisma.workstream.create({
    data: {
      projectId,
      name: data?.name || 'Test Workstream',
      tagId: data?.tagId,
      context: data?.context,
      state: data?.state || 'active',
    },
  });
}

/**
 * Create a test status update
 */
export async function createTestStatusUpdate(
  workstreamId: string,
  data?: { status?: string; note?: string }
) {
  return prisma.statusUpdate.create({
    data: {
      workstreamId,
      status: data?.status || 'Test status update',
      note: data?.note,
    },
  });
}

export { prisma };
