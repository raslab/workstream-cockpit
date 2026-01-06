import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/routes/health';

describe('Health API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Health endpoint doesn't require authentication
    app = express();
    app.use(express.json());
    app.use('/health', healthRoutes);
  });

  describe('GET /health', () => {
    it('should return 200 with status ok when database is connected', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        database: 'connected',
      });
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThan(0);
    });

    it('should include ISO timestamp in response', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBeDefined();
      // Verify it's a valid ISO string
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.toISOString()).toBe(res.body.timestamp);
    });

    it('should include process uptime in response', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.uptime).toBeDefined();
      expect(typeof res.body.uptime).toBe('number');
      // Uptime should be positive
      expect(res.body.uptime).toBeGreaterThan(0);
    });
  });
});
