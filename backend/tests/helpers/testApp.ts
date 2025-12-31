import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Person } from '@prisma/client';

/**
 * Create a mock authenticated session for testing
 */
export function createMockSession(user: Person) {
  return {
    passport: {
      user: user.id,
    },
  };
}

/**
 * Create a test app with authentication mocked
 */
export function createTestApp(routes: express.Router, mockUser?: Person): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock session
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    })
  );

  // Mock passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Mock authentication
  if (mockUser) {
    app.use((req: any, _res, next) => {
      req.user = mockUser;
      req.isAuthenticated = () => true;
      req.userContext = {
        personId: mockUser.id,
        person: mockUser,
      };
      next();
    });
  }

  app.use(routes);

  return app;
}

/**
 * Create authenticated request agent
 */
export function createAuthenticatedAgent(app: Express, user: Person) {
  const agent = request.agent(app);
  
  // Mock the user session
  agent.set('Cookie', [`connect.sid=mock-session-${user.id}`]);
  
  return agent;
}
