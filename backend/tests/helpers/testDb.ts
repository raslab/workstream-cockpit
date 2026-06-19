import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import { ensureDatabaseUrl, getDatabaseUrlConfig } from '../../src/config/databaseUrl';

// Load test environment variables from .env.test
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });
ensureDatabaseUrl();

const prisma = new PrismaClient();

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
      const result = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [testDbConfig.databaseName]
      );

      if (result.rows.length === 0) {
        await adminClient.query(
          `CREATE DATABASE ${quotePostgresIdentifier(testDbConfig.databaseName)}`
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
      stdio: 'inherit'
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
  const tables = [
    'personal_access_tokens',
    'views',
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
  data?: { name?: string; color?: string; sortOrder?: number }
) {
  return prisma.category.create({
    data: {
      projectId,
      name: data?.name || 'test-category',
      color: data?.color || '#3B82F6',
      sortOrder: data?.sortOrder ?? 0,
    },
  });
}

/**
 * Create a test tag
 */
export async function createTestTag(
  projectId: string,
  data?: { name?: string; displayName?: string; color?: string }
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
    categoryId?: string;
    context?: string;
    state?: string;
  }
) {
  return prisma.workstream.create({
    data: {
      projectId,
      name: data?.name || 'Test Workstream',
      categoryId: data?.categoryId,
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
