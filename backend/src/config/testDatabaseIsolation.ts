import { composeDatabaseUrl, DatabaseUrlEnv, getDatabaseUrlConfig } from './databaseUrl';

const MAX_DATABASE_NAME_LENGTH = 63;

function sanitizeIdentifierPart(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_');
  const withoutEdgeUnderscores = sanitized.replace(/^_+|_+$/g, '');

  if (!withoutEdgeUnderscores) {
    return 'test';
  }

  if (/^[0-9]/.test(withoutEdgeUnderscores)) {
    return `db_${withoutEdgeUnderscores}`;
  }

  return withoutEdgeUnderscores;
}

export function buildIsolatedTestDatabaseName(baseDatabaseName: string, runId: string): string {
  const sanitizedBase = sanitizeIdentifierPart(baseDatabaseName);
  const sanitizedRunId = sanitizeIdentifierPart(runId);
  const suffix = `_${sanitizedRunId}`;
  const maxBaseLength = Math.max(1, MAX_DATABASE_NAME_LENGTH - suffix.length);

  return `${sanitizedBase.slice(0, maxBaseLength)}${suffix}`;
}

export function createTestDatabaseRunId(): string {
  return [Date.now().toString(36), process.pid.toString(36), Math.random().toString(36).slice(2, 10)]
    .filter(Boolean)
    .join('_');
}

export function buildIsolatedTestDatabaseEnv(
  sourceEnv: DatabaseUrlEnv = process.env,
  runId = createTestDatabaseRunId()
): NodeJS.ProcessEnv {
  const baseConfig = getDatabaseUrlConfig({ ...sourceEnv });
  const isolatedDatabaseName = buildIsolatedTestDatabaseName(baseConfig.databaseName, runId);
  const isolatedEnv: NodeJS.ProcessEnv = {
    ...sourceEnv,
    POSTGRES_HOST: baseConfig.host,
    POSTGRES_PORT: String(baseConfig.port),
    POSTGRES_USER: baseConfig.user,
    POSTGRES_PASSWORD: baseConfig.password,
    POSTGRES_DB: isolatedDatabaseName,
  };

  delete isolatedEnv.DATABASE_URL;
  isolatedEnv.DATABASE_URL = composeDatabaseUrl(isolatedEnv);

  return isolatedEnv;
}
