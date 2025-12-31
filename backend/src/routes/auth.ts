import { Router } from 'express';
import passport from '../config/passport';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication - ensure session is saved before redirect
    logger.info(`User ${(req.user as any)?.email} authenticated successfully`);
    
    // Save session explicitly before redirecting to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        logger.error('Error saving session:', err);
        res.status(500).send('Authentication error');
        return;
      }
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/auth/callback`);
    });
  }
);

/**
 * GET /auth/user
 * Get current authenticated user
 */
router.get('/user', (req, res): void => {
  logger.info(`Auth check - Session ID: ${req.sessionID}, Authenticated: ${req.isAuthenticated()}`);
  
  if (!req.isAuthenticated()) {
    logger.warn('User not authenticated - no session or session expired');
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = req.user as any;
  logger.info(`Returning user data for ${user.email}`);
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

/**
 * POST /auth/logout
 * Logout current user
 */
router.post('/logout', (req, res): void => {
  const user = req.user as any;
  
  req.logout((err) => {
    if (err) {
      logger.error('Error during logout:', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }

    logger.info(`User ${user?.email} logged out`);
    res.json({ message: 'Logged out successfully' });
  });
});

/**
 * GET /auth/debug
 * Debug endpoint to check session status (development only)
 */
router.get('/debug', (req, res): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json({
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    session: req.session,
    user: req.user,
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
  });
});

export default router;
