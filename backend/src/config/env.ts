import * as dotenv from 'dotenv';
import * as path from 'path';
import { ensureDatabaseUrl } from './databaseUrl';

// Support both repository-root .env (Docker Compose convention) and backend/.env
// when running backend npm scripts directly from the workspace.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

ensureDatabaseUrl();
