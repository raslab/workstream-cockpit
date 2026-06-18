import './config/env';

import { spawnSync } from 'child_process';

const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

void import('./server');
