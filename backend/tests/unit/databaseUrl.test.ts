import {
  composeDatabaseUrl,
  ensureDatabaseUrl,
  getDatabaseUrlConfig,
} from '../../src/config/databaseUrl';

describe('database URL composition', () => {
  it('keeps an explicit DATABASE_URL override unchanged', () => {
    const env = {
      DATABASE_URL: 'postgresql://custom:secret@example.com:6543/custom_db?schema=custom',
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'workstream',
      POSTGRES_PASSWORD: 'password',
      POSTGRES_DB: 'workstream_cockpit',
    };

    expect(ensureDatabaseUrl(env)).toBe(env.DATABASE_URL);
    expect(env.DATABASE_URL).toBe('postgresql://custom:secret@example.com:6543/custom_db?schema=custom');
  });

  it('composes DATABASE_URL from POSTGRES_* values', () => {
    const env: Record<string, string | undefined> = {
      POSTGRES_HOST: 'host.docker.internal',
      POSTGRES_PORT: '35268',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'workstream_cockpit_test',
    };

    expect(composeDatabaseUrl(env)).toBe(
      'postgresql://postgres:postgres@host.docker.internal:35268/workstream_cockpit_test?schema=public'
    );
    expect(ensureDatabaseUrl(env)).toBe(
      'postgresql://postgres:postgres@host.docker.internal:35268/workstream_cockpit_test?schema=public'
    );
    expect(env.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@host.docker.internal:35268/workstream_cockpit_test?schema=public'
    );
  });

  it('defaults host, port, and database name when composing', () => {
    expect(
      composeDatabaseUrl({
        POSTGRES_USER: 'workstream',
        POSTGRES_PASSWORD: 'password',
      })
    ).toBe('postgresql://workstream:password@postgres:5432/workstream_cockpit?schema=public');
  });

  it('URL-encodes username, password, and database name', () => {
    expect(
      composeDatabaseUrl({
        POSTGRES_HOST: 'postgres',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'work stream',
        POSTGRES_PASSWORD: 'p@ss/word',
        POSTGRES_DB: 'workstream cockpit',
      })
    ).toBe('postgresql://work%20stream:p%40ss%2Fword@postgres:5432/workstream%20cockpit?schema=public');
  });

  it('throws clear errors for missing required credentials', () => {
    expect(() => composeDatabaseUrl({ POSTGRES_PASSWORD: 'password' })).toThrow(
      'POSTGRES_USER is required to compose DATABASE_URL'
    );
    expect(() => composeDatabaseUrl({ POSTGRES_USER: 'workstream' })).toThrow(
      'POSTGRES_PASSWORD is required to compose DATABASE_URL'
    );
  });

  it('parses the effective database URL into test/admin connection config', () => {
    expect(
      getDatabaseUrlConfig({
        POSTGRES_HOST: 'host.docker.internal',
        POSTGRES_PORT: '35268',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_DB: 'workstream_cockpit_test',
      })
    ).toEqual({
      host: 'host.docker.internal',
      port: 35268,
      user: 'postgres',
      password: 'postgres',
      databaseName: 'workstream_cockpit_test',
    });
  });
});
