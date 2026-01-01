import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';
import passport from './config/passport';
import { sessionConfig } from './middleware/session';
import { attachUserContext } from './middleware/userContext';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import workstreamsRoutes from './routes/workstreams';
import statusUpdatesRoutes from './routes/statusUpdates';
import tagsRoutes from './routes/tags';
import timelineRoutes from './routes/timeline';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { executeBackup } from './services/backupService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (must be before passport)
app.use(sessionConfig);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// User context middleware (attaches userContext to req)
app.use(attachUserContext);

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/api/workstreams', workstreamsRoutes);
app.use('/api/status-updates', statusUpdatesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/timeline', timelineRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Setup backup cron job
  const backupEnabled = process.env.BACKUP_ENABLED === 'true';
  if (backupEnabled) {
    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Default: 2 AM UTC daily
    logger.info(`Backup system enabled. Schedule: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      logger.info('Scheduled backup triggered');
      try {
        await executeBackup();
      } catch (error: any) {
        logger.error(`Scheduled backup failed: ${error.message}`);
      }
    });
  } else {
    logger.info('Backup system disabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app;
