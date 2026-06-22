import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import personalAccessTokenRoutes from '../../src/routes/personalAccessTokens';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  prisma,
} from '../helpers/testDb';

let app: Express;
let authenticatedPerson: Awaited<ReturnType<typeof createTestPerson>> | null = null;
const originalNodeEnv = process.env.NODE_ENV;
const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalFrontendUrl = process.env.FRONTEND_URL;

function restorePatSecurityEnv(): void {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  if (originalCorsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  }
  if (originalFrontendUrl === undefined) {
    delete process.env.FRONTEND_URL;
  } else {
    process.env.FRONTEND_URL = originalFrontendUrl;
  }
}

function attachTestUser(req: Request, _res: Response, next: NextFunction): void {
  if (authenticatedPerson) {
    req.userContext = {
      personId: authenticatedPerson.id,
      person: authenticatedPerson,
    };
    (req as any).isAuthenticated = () => true;
    req.user = authenticatedPerson;
  } else {
    (req as any).isAuthenticated = () => false;
  }
  next();
}

beforeAll(async () => {
  await setupTestDatabase();

  app = express();
  app.use(express.json());
  app.use(attachTestUser);
  app.use('/api/personal-access-tokens', personalAccessTokenRoutes);
});

beforeEach(async () => {
  authenticatedPerson = null;
  restorePatSecurityEnv();
  await cleanDatabase();
});

afterAll(async () => {
  restorePatSecurityEnv();
  await disconnectDatabase();
});

describe('Personal access token API', () => {
  it('requires session authentication for every route', async () => {
    await expect(request(app).get('/api/personal-access-tokens')).resolves.toHaveProperty('status', 401);
    await expect(
      request(app).post('/api/personal-access-tokens').send({ name: 'x', scopes: ['mcp:read'] })
    ).resolves.toHaveProperty('status', 401);
    await expect(request(app).delete('/api/personal-access-tokens/token-id')).resolves.toHaveProperty(
      'status',
      401
    );
  });

  it('creates a token and returns raw token exactly once with safe metadata', async () => {
    authenticatedPerson = await createTestPerson();

    const response = await request(app)
      .post('/api/personal-access-tokens')
      .send({ name: '  MCP client  ', scopes: ['mcp:read', 'mcp:write'] })
      .expect(201);

    expect(response.body.token).toMatch(/^wsc_pat_[A-Za-z0-9_-]{43,}$/);
    expect(response.body.personalAccessToken).toMatchObject({
      personId: authenticatedPerson.id,
      name: 'MCP client',
      scopes: ['mcp:read', 'mcp:write'],
      tokenPrefix: response.body.token.slice(0, 20),
    });
    expect(response.body.personalAccessToken).not.toHaveProperty('tokenHash');

    const listResponse = await request(app).get('/api/personal-access-tokens').expect(200);
    expect(listResponse.body.personalAccessTokens).toHaveLength(1);
    expect(listResponse.body.personalAccessTokens[0]).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(listResponse.body)).not.toContain(response.body.token);

    const persisted = await prisma.personalAccessToken.findUniqueOrThrow({
      where: { id: response.body.personalAccessToken.id },
    });
    expect(JSON.stringify(persisted)).not.toContain(response.body.token);
  });

  it('returns 400 for validation errors', async () => {
    authenticatedPerson = await createTestPerson();

    const response = await request(app)
      .post('/api/personal-access-tokens')
      .send({ name: '', scopes: ['mcp:write'] })
      .expect(400);

    expect(response.body.error).toMatch(/validation/i);
  });

  it('allows production PAT creation from the same host origin', async () => {
    process.env.NODE_ENV = 'production';
    authenticatedPerson = await createTestPerson();

    await request(app)
      .post('/api/personal-access-tokens')
      .set('Host', 'app.example.com')
      .set('Origin', 'https://app.example.com')
      .send({ name: 'same host', scopes: ['mcp:read'] })
      .expect(201);
  });

  it('allows production PAT creation from a configured frontend origin', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://frontend.example.com';
    authenticatedPerson = await createTestPerson();

    await request(app)
      .post('/api/personal-access-tokens')
      .set('Host', 'api.example.com')
      .set('Origin', 'https://frontend.example.com')
      .send({ name: 'configured origin', scopes: ['mcp:read'] })
      .expect(201);
  });

  it('rejects production PAT creation without Origin or Referer', async () => {
    process.env.NODE_ENV = 'production';
    authenticatedPerson = await createTestPerson();

    await request(app)
      .post('/api/personal-access-tokens')
      .send({ name: 'missing origin', scopes: ['mcp:read'] })
      .expect(403);

    await expect(prisma.personalAccessToken.count()).resolves.toBe(0);
  });

  it('rejects production PAT revocation from a foreign origin', async () => {
    process.env.NODE_ENV = 'production';
    authenticatedPerson = await createTestPerson();
    const token = await prisma.personalAccessToken.create({
      data: {
        personId: authenticatedPerson.id,
        name: 'owned',
        tokenHash: 'y'.repeat(64),
        tokenPrefix: 'wsc_pat_owned_prefix',
        scopes: ['mcp:read'],
      },
    });

    await request(app)
      .delete(`/api/personal-access-tokens/${token.id}`)
      .set('Host', 'app.example.com')
      .set('Origin', 'https://attacker.example.com')
      .expect(403);

    await expect(
      prisma.personalAccessToken.findUniqueOrThrow({ where: { id: token.id } })
    ).resolves.toMatchObject({ revokedAt: null });
  });

  it('allows production PAT revocation from a same-host referer', async () => {
    process.env.NODE_ENV = 'production';
    authenticatedPerson = await createTestPerson();
    const token = await prisma.personalAccessToken.create({
      data: {
        personId: authenticatedPerson.id,
        name: 'owned',
        tokenHash: 'z'.repeat(64),
        tokenPrefix: 'wsc_pat_owned_prefix',
        scopes: ['mcp:read'],
      },
    });

    await request(app)
      .delete(`/api/personal-access-tokens/${token.id}`)
      .set('Host', 'app.example.com')
      .set('Referer', 'https://app.example.com/settings/tokens')
      .expect(204);
  });

  it('writes PAT audit logs without the raw token', async () => {
    authenticatedPerson = await createTestPerson();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const createResponse = await request(app)
        .post('/api/personal-access-tokens')
        .send({ name: 'audit', scopes: ['mcp:read'] })
        .expect(201);

      await request(app)
        .delete(`/api/personal-access-tokens/${createResponse.body.personalAccessToken.id}`)
        .expect(204);

      const logs = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(logs).toContain('personal_access_token.created');
      expect(logs).toContain('personal_access_token.revoke_requested');
      expect(logs).toContain(createResponse.body.personalAccessToken.id);
      expect(logs).not.toContain(createResponse.body.token);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('revokes owned tokens idempotently with 204 and excludes other users tokens', async () => {
    authenticatedPerson = await createTestPerson({ email: 'api-owner@example.com' });
    const other = await createTestPerson({ email: 'api-other@example.com' });

    const createResponse = await request(app)
      .post('/api/personal-access-tokens')
      .send({ name: 'owned', scopes: ['mcp:read'] })
      .expect(201);

    const otherToken = await prisma.personalAccessToken.create({
      data: {
        personId: other.id,
        name: 'other',
        tokenHash: 'x'.repeat(64),
        tokenPrefix: 'wsc_pat_other_prefix',
        scopes: ['mcp:read'],
      },
    });

    await request(app)
      .delete(`/api/personal-access-tokens/${createResponse.body.personalAccessToken.id}`)
      .expect(204);
    await request(app)
      .delete(`/api/personal-access-tokens/${createResponse.body.personalAccessToken.id}`)
      .expect(204);
    await request(app).delete(`/api/personal-access-tokens/${otherToken.id}`).expect(204);

    const ownedPersisted = await prisma.personalAccessToken.findUniqueOrThrow({
      where: { id: createResponse.body.personalAccessToken.id },
    });
    const otherPersisted = await prisma.personalAccessToken.findUniqueOrThrow({
      where: { id: otherToken.id },
    });

    expect(ownedPersisted.revokedAt).toBeInstanceOf(Date);
    expect(otherPersisted.revokedAt).toBeNull();

    const listResponse = await request(app).get('/api/personal-access-tokens').expect(200);
    expect(listResponse.body.personalAccessTokens.map((token: any) => token.id)).not.toContain(
      createResponse.body.personalAccessToken.id
    );
    expect(listResponse.body.personalAccessTokens.map((token: any) => token.id)).not.toContain(otherToken.id);
  });
});
