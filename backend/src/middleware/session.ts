import session from 'express-session';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site in production
    domain: process.env.COOKIE_DOMAIN || undefined, // Allow setting cookie domain for production
    // In development with different ports, don't set domain to allow cookies on localhost
  },
  rolling: true, // Refresh session on every request (automatic refresh on activity)
  proxy: process.env.NODE_ENV === 'production', // Trust proxy in production
});
