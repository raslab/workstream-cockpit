import { Request, Response, NextFunction } from 'express';
import { Person } from '@prisma/client';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      userContext?: {
        personId: string;
        person: Person;
      };
    }
  }
}

/**
 * Middleware to attach user context to request
 * Must be used after authentication middleware
 */
export function attachUserContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    return next();
  }

  const person = req.user as Person;
  
  req.userContext = {
    personId: person.id,
    person,
  };

  next();
}

/**
 * Middleware to require user context
 * Returns 401 if user is not authenticated
 */
export function requireUserContext(req: Request, res: Response, next: NextFunction): Response | void {
  if (!req.userContext) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
    });
  }

  next();
}
