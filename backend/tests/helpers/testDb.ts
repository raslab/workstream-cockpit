import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import { ensureDatabaseUrl, getDatabaseUrlConfig } from '../../src/config/databaseUrl';

// Load test environment variables from .env.test
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });
ensureDatabaseUrl();

const prisma = new PrismaClient();
const nextWorkstreamNumberByProject = new Map<string, number>();
const nextStatusUpdateNumberByProject = new Map<string, number>();

function reserveWorkstreamNumber(projectId: string, explicitNumber?: number): number {
  const next = explicitNumber ?? nextWorkstreamNumberByProject.get(projectId) ?? 1;
  nextWorkstreamNumberByProject.set(
    projectId,
    Math.max(nextWorkstreamNumberByProject.get(projectId) ?? 1, next + 1),
  );
  return next;
}

function reserveStatusUpdateNumber(projectId: string, explicitNumber?: number): number {
  const next = explicitNumber ?? nextStatusUpdateNumberByProject.get(projectId) ?? 1000;
  nextStatusUpdateNumberByProject.set(
    projectId,
    Math.max(nextStatusUpdateNumberByProject.get(projectId) ?? 1000, next + 1),
  );
  return next;
}

function quotePostgresIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe test database name: ${identifier}`);
  }

  return `"${identifier}"`;
}

/**
 * Setup test database before all tests
 *
 * Prerequisites:
 * 1. A PostgreSQL test sidecar is reachable at the configured POSTGRES_HOST/POSTGRES_PORT
 * 2. .env.test is configured with POSTGRES_* database settings
 *
 * This will:
 * - Create the test database if it doesn't exist
 * - Run all migrations on the test database
 */
export async function setupTestDatabase(): Promise<void> {
  if (process.env.WORKSTREAM_TEST_DATABASE_READY === '1') {
    return;
  }

  try {
    // Create test database if it doesn't exist.
    // Use the same host/user/password as the composed database URL, but connect to the
    // default postgres database first so we can create the target test DB.
    const { Client } = require('pg');
    const testDbConfig = getDatabaseUrlConfig();
    const adminClient = new Client({
      host: testDbConfig.host,
      port: testDbConfig.port,
      user: testDbConfig.user,
      password: testDbConfig.password,
      database: 'postgres',
    });

    try {
      await adminClient.connect();
      const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        testDbConfig.databaseName,
      ]);

      if (result.rows.length === 0) {
        await adminClient.query(
          `CREATE DATABASE ${quotePostgresIdentifier(testDbConfig.databaseName)}`,
        );
        console.log(`Created test database: ${testDbConfig.databaseName}`);
      }
    } catch (error) {
      console.error('Error creating test database:', error);
    } finally {
      await adminClient.end();
    }

    // Run migrations on test database
    execSync('npm run migrate:deploy', {
      env: { ...process.env },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

/**
 * Clean database before each test
 */
export async function cleanDatabase(): Promise<void> {
  nextWorkstreamNumberByProject.clear();
  nextStatusUpdateNumberByProject.clear();
  const tables = [
    'resource_changes',
    'personal_access_tokens',
    'views',
    'next_steps',
    'workstream_events',
    'status_updates',
    'workstreams',
    'tags',
    'categories',
    'projects',
    'persons',
  ];

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
 * Create a test category
 */
export async function createTestCategory(
  projectId: string,
  data?: { name?: string; color?: string; description?: string; sortOrder?: number },
) {
  return prisma.category.create({
    data: {
      projectId,
      name: data?.name || 'test-category',
      color: data?.color || '#3B82F6',
      description: data?.description ?? '',
      sortOrder: data?.sortOrder ?? 0,
    },
  });
}

/**
 * Create a test tag
 */
export async function createTestTag(
  projectId: string,
  data?: { name?: string; displayName?: string; color?: string },
) {
  const displayName = data?.displayName || data?.name || 'Test Tag';
  const name = data?.name || displayName.toLowerCase().replace(/\s+/g, '_');

  return prisma.tag.create({
    data: {
      projectId,
      name,
      displayName,
      color: data?.color || '#1DA1F2',
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
    number?: number;
    categoryId?: string;
    parentId?: string | null;
    context?: string;
    state?: string;
  },
) {
  const number = reserveWorkstreamNumber(projectId, data?.number);
  const workstream = await prisma.workstream.create({
    data: {
      projectId,
      number,
      name: data?.name || 'Test Workstream',
      categoryId: data?.categoryId,
      parentId: data?.parentId,
      context: data?.context,
      state: data?.state || 'active',
    },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { nextWorkstreamNumber: nextWorkstreamNumberByProject.get(projectId) ?? number + 1 },
  });
  return workstream;
}

/**
 * Create a test status update
 */
export async function createTestStatusUpdate(
  workstreamId: string,
  data?: {
    status?: string;
    note?: string;
    number?: number;
    impact?: 'active' | 'info' | 'initial';
  },
) {
  const workstream = await prisma.workstream.findUniqueOrThrow({
    where: { id: workstreamId },
    select: { projectId: true },
  });
  const number = reserveStatusUpdateNumber(workstream.projectId, data?.number);
  const statusUpdate = await prisma.statusUpdate.create({
    data: {
      projectId: workstream.projectId,
      number,
      workstreamId,
      status: data?.status || 'Test status update',
      note: data?.note,
      impact: data?.impact ?? 'active',
    },
  });
  await prisma.project.update({
    where: { id: workstream.projectId },
    data: {
      nextStatusUpdateNumber:
        nextStatusUpdateNumberByProject.get(workstream.projectId) ?? number + 1,
    },
  });
  return statusUpdate;
}

export { prisma };
