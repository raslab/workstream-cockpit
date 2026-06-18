export interface DatabaseUrlEnv {
  DATABASE_URL?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_DB?: string;
}

export interface DatabaseUrlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  databaseName: string;
}

const DEFAULT_POSTGRES_HOST = 'postgres';
const DEFAULT_POSTGRES_PORT = '5432';
const DEFAULT_POSTGRES_DB = 'workstream_cockpit';

function requireValue(name: keyof DatabaseUrlEnv, value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${name} is required to compose DATABASE_URL`);
  }

  return trimmed;
}

function optionalValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export function composeDatabaseUrl(env: DatabaseUrlEnv = process.env): string {
  const user = requireValue('POSTGRES_USER', env.POSTGRES_USER);
  const password = requireValue('POSTGRES_PASSWORD', env.POSTGRES_PASSWORD);
  const host = optionalValue(env.POSTGRES_HOST, DEFAULT_POSTGRES_HOST);
  const port = optionalValue(env.POSTGRES_PORT, DEFAULT_POSTGRES_PORT);
  const database = optionalValue(env.POSTGRES_DB, DEFAULT_POSTGRES_DB);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?schema=public`;
}

export function ensureDatabaseUrl(env: DatabaseUrlEnv = process.env): string {
  const existingDatabaseUrl = env.DATABASE_URL?.trim();

  if (existingDatabaseUrl) {
    env.DATABASE_URL = existingDatabaseUrl;
    return existingDatabaseUrl;
  }

  const composedDatabaseUrl = composeDatabaseUrl(env);
  env.DATABASE_URL = composedDatabaseUrl;
  return composedDatabaseUrl;
}

export function getDatabaseUrlConfig(env: DatabaseUrlEnv = process.env): DatabaseUrlConfig {
  const parsedUrl = new URL(ensureDatabaseUrl(env));
  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name');
  }

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 5432),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    databaseName,
  };
}
