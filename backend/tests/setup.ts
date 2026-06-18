/**
 * Jest setup file
 * Loads test environment variables before running tests
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ensureDatabaseUrl } from '../src/config/databaseUrl';

// Load test environment variables from .env.test
dotenv.config({ path: path.join(__dirname, '../.env.test') });

const databaseUrl = ensureDatabaseUrl();

// Log test database configuration (for debugging)
console.log('Test environment loaded');
console.log('DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
