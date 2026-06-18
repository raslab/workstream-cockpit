import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import request from 'supertest';

jest.mock('../../src/config/passport', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  },
}));

import authRoutes from '../../src/routes/auth';

function createApp(mockUser?: { id: string; email: string; name: string }) {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
      },
    })
  );
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const mockedReq = req as any;
    mockedReq.isAuthenticated = () => Boolean(mockUser);
    mockedReq.logout = (callback: (err?: Error) => void) => {
      mockedReq.user = undefined;
      callback();
    };
    if (mockUser) {
      mockedReq.user = mockUser;
    }
    next();
  });
  app.get('/touch', (req, res) => {
    req.session.touch();
    res.json({ ok: true });
  });
  app.use('/auth', authRoutes);
  return app;
}

describe('auth debug hardening', () => {
  const originalAuthDebugEnabled = process.env.AUTH_DEBUG_ENABLED;

  afterEach(() => {
    if (originalAuthDebugEnabled === undefined) {
      delete process.env.AUTH_DEBUG_ENABLED;
    } else {
      process.env.AUTH_DEBUG_ENABLED = originalAuthDebugEnabled;
    }
  });

  it('returns 404 by default', async () => {
    delete process.env.AUTH_DEBUG_ENABLED;
    const response = await request(createApp()).get('/auth/debug').set('Cookie', 'connect.sid=raw-session-cookie');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('returns only safe redacted fields when explicitly enabled', async () => {
    process.env.AUTH_DEBUG_ENABLED = 'true';
    const response = await request(
      createApp({ id: 'person-1', email: 'user@example.com', name: 'Example User' })
    )
      .get('/auth/debug')
      .set('Cookie', 'connect.sid=raw-session-cookie')
      .set('Origin', 'https://app.example.com');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      isAuthenticated: true,
      session: {
        exists: true,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
        },
      },
      user: {
        id: 'person-1',
        email: 'user@example.com',
        name: 'Example User',
      },
      headers: {
        cookiePresent: true,
        origin: 'https://app.example.com',
      },
    });
    expect(response.body).not.toHaveProperty('cookies');
    expect(response.body.headers).not.toHaveProperty('cookie');
    expect(JSON.stringify(response.body)).not.toContain('raw-session-cookie');
    expect(response.body.sessionID).toMatch(/^\.\.\./);
  });
});

describe('auth logout hardening', () => {
  const originalSessionCookieName = process.env.SESSION_COOKIE_NAME;

  afterEach(() => {
    if (originalSessionCookieName === undefined) {
      delete process.env.SESSION_COOKIE_NAME;
    } else {
      process.env.SESSION_COOKIE_NAME = originalSessionCookieName;
    }
  });

  it('logs out, destroys the server session, and clears the configured session cookie', async () => {
    process.env.SESSION_COOKIE_NAME = 'workstream.sid';
    const app = createApp({ id: 'person-1', email: 'user@example.com', name: 'Example User' });
    const agent = request.agent(app);

    await agent.get('/touch').expect(200);
    const response = await agent.post('/auth/logout');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    const setCookie = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((cookie) => cookie.startsWith('workstream.sid=;'))).toBe(true);
    expect(setCookie.join(';')).toContain('HttpOnly');
    expect(setCookie.join(';')).toContain('SameSite=Lax');
  });
});
