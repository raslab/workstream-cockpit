import '../config/env';

import { spawnSync } from 'child_process';

const [, , command, ...args] = process.argv;

if (!command) {
  console.error('Usage: tsx src/scripts/withDatabaseUrl.ts <command> [...args]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
