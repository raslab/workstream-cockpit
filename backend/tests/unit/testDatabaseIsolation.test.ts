import {
  buildIsolatedTestDatabaseEnv,
  buildIsolatedTestDatabaseName,
} from '../../src/config/testDatabaseIsolation';

describe('test database isolation', () => {
  it('suffixes the configured database name with a per-run identifier', () => {
    expect(buildIsolatedTestDatabaseName('workstream_cockpit_test', 'run_123')).toBe(
      'workstream_cockpit_test_run_123'
    );
  });

  it('sanitizes generated database names for PostgreSQL identifiers', () => {
    expect(buildIsolatedTestDatabaseName('workstream-cockpit.test', 'pid:123/random')).toBe(
      'workstream_cockpit_test_pid_123_random'
    );
  });

  it('sets POSTGRES_DB and DATABASE_URL to the same isolated database for one npm test run', () => {
    const env = buildIsolatedTestDatabaseEnv(
      {
        POSTGRES_HOST: 'host.docker.internal',
        POSTGRES_PORT: '35268',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_DB: 'workstream_cockpit_test',
      },
      'run_abc'
    );

    expect(env.POSTGRES_DB).toBe('workstream_cockpit_test_run_abc');
    expect(env.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@host.docker.internal:35268/workstream_cockpit_test_run_abc?schema=public'
    );
  });

  it('can isolate a DATABASE_URL-only advanced override', () => {
    const env = buildIsolatedTestDatabaseEnv(
      {
        DATABASE_URL: 'postgresql://postgres:postgres@host.docker.internal:35268/shared_db?schema=public',
      },
      'run_abc'
    );

    expect(env.POSTGRES_HOST).toBe('host.docker.internal');
    expect(env.POSTGRES_PORT).toBe('35268');
    expect(env.POSTGRES_USER).toBe('postgres');
    expect(env.POSTGRES_PASSWORD).toBe('postgres');
    expect(env.POSTGRES_DB).toBe('shared_db_run_abc');
    expect(env.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@host.docker.internal:35268/shared_db_run_abc?schema=public'
    );
  });
});
