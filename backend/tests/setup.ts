/**
 * Jest setup file
 * Loads test environment variables before running tests
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables from .env.test
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Verify test database URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL not found in test environment. ' +
    'Please ensure .env.test exists with DATABASE_URL configuration.'
  );
}

// Log test database configuration (for debugging)
console.log('Test environment loaded');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
