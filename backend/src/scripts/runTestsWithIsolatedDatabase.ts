import * as path from 'path';
import * as dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import { Client } from 'pg';
import { buildIsolatedTestDatabaseEnv } from '../config/testDatabaseIsolation';
import { getDatabaseUrlConfig } from '../config/databaseUrl';

function quotePostgresIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe test database name: ${identifier}`);
  }

  return `"${identifier}"`;
}

async function createTestDatabase(env: NodeJS.ProcessEnv): Promise<void> {
  const testDbConfig = getDatabaseUrlConfig(env);
  const adminClient = new Client({
    host: testDbConfig.host,
    port: testDbConfig.port,
    user: testDbConfig.user,
    password: testDbConfig.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    await adminClient.query(`CREATE DATABASE ${quotePostgresIdentifier(testDbConfig.databaseName)}`);
    console.log(`Created isolated test database: ${testDbConfig.databaseName}`);
  } finally {
    await adminClient.end();
  }
}

function runMigrations(env: NodeJS.ProcessEnv): void {
  const result = spawnSync('npm', ['run', 'migrate:deploy'], {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(`migrate:deploy failed with exit code ${result.status}`);
  }
}

async function dropTestDatabase(env: NodeJS.ProcessEnv): Promise<void> {
  const testDbConfig = getDatabaseUrlConfig(env);
  const adminClient = new Client({
    host: testDbConfig.host,
    port: testDbConfig.port,
    user: testDbConfig.user,
    password: testDbConfig.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    await adminClient.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [testDbConfig.databaseName]
    );
    await adminClient.query(
      `DROP DATABASE IF EXISTS ${quotePostgresIdentifier(testDbConfig.databaseName)}`
    );
    console.log(`Dropped isolated test database: ${testDbConfig.databaseName}`);
  } finally {
    await adminClient.end();
  }
}

async function main(): Promise<void> {
  dotenv.config({ path: path.join(process.cwd(), '.env.test') });

  const isolatedEnv = buildIsolatedTestDatabaseEnv(process.env);
  const { databaseName } = getDatabaseUrlConfig(isolatedEnv);
  const jestArgs = process.argv.slice(2);

  console.log(`Using isolated test database: ${databaseName}`);

  let exitCode = 1;
  let setupStarted = false;

  try {
    await createTestDatabase(isolatedEnv);
    setupStarted = true;
    runMigrations(isolatedEnv);
    isolatedEnv.WORKSTREAM_TEST_DATABASE_READY = '1';

    const result = spawnSync('jest', jestArgs, {
      env: isolatedEnv,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    if (result.error) {
      throw result.error;
    }

    exitCode = result.status ?? 0;
  } finally {
    if (setupStarted) {
      try {
        await dropTestDatabase(isolatedEnv);
      } catch (error) {
        console.error('Error dropping isolated test database:', error);
        if (exitCode === 0) {
          exitCode = 1;
        }
      }
    }
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Error running isolated test database wrapper:', error);
  process.exit(1);
});
