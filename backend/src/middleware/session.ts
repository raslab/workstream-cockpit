import session from 'express-session';
import {
  getSessionCookieName,
  getSessionCookieOptions,
  getSessionSecret,
} from '../config/sessionSecurity';

export const sessionConfig = session({
  name: getSessionCookieName(),
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: getSessionCookieOptions(),
  rolling: true, // Refresh session on every request (automatic refresh on activity)
  proxy: process.env.NODE_ENV === 'production', // Trust proxy in production
});
