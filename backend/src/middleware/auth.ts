import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({
    error: 'Authentication required',
    message: 'You must be logged in to access this resource',
  });
}

/**
 * Middleware to attach authentication status (doesn't block)
 */
export function attachAuth(_req: Request, _res: Response, next: NextFunction): void {
  // Just passes through - useful for routes that want to check auth status
  // but don't require it
  next();
}
