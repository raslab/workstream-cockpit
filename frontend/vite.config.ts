import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

function gitValue(command: string): string | undefined {
  try {
    return execSync(command, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function setDefaultEnv(name: string, value: string) {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

setDefaultEnv('VITE_GIT_BRANCH', gitValue('git rev-parse --abbrev-ref HEAD') ?? 'unknown');
setDefaultEnv('VITE_GIT_COMMIT', gitValue('git rev-parse HEAD') ?? 'unknown');
setDefaultEnv('VITE_GIT_COMMIT_DATE', gitValue('git show -s --format=%cI HEAD') ?? 'unknown');
setDefaultEnv('VITE_BUILD_TIME', new Date().toISOString());

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    host: true,
    proxy: {
      // Only proxy /api calls - /auth routes are handled by React Router or direct backend redirects
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
