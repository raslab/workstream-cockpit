import * as fs from 'fs';
import * as path from 'path';

describe('production proxy configuration', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  it('preserves the original HTTPS protocol when frontend nginx proxies auth requests to backend', () => {
    const nginxConfig = fs.readFileSync(path.join(repoRoot, 'frontend/nginx.conf'), 'utf8');

    expect(nginxConfig).toContain('map $http_x_forwarded_proto $proxy_x_forwarded_proto');
    expect(nginxConfig).toContain("'' $scheme;");
    expect(nginxConfig).toContain('proxy_set_header X-Forwarded-Proto $proxy_x_forwarded_proto;');
    expect(nginxConfig).not.toContain('proxy_set_header X-Forwarded-Proto $scheme;');
  });

  it('trusts the deployment proxy in production so secure cookies work behind TLS termination', () => {
    const serverSource = fs.readFileSync(path.join(repoRoot, 'backend/src/server.ts'), 'utf8');

    expect(serverSource).toContain("app.set('trust proxy', 1)");
  });
});
