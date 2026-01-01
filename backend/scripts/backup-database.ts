import 'dotenv/config'; // Load environment variables from .env file
import { executeBackup } from '../src/services/backupService';
import { logger } from '../src/utils/logger';

/**
 * Manual backup script
 * Run with: npm run backup:manual
 * 
 * Make sure to set up environment variables in .env:
 * - BACKUP_ENABLED=true
 * - GCP_PROJECT_ID=your-project-id
 * - GCP_BUCKET_NAME=your-bucket-name
 * - GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
 */
async function main() {
  logger.info('=== Manual Backup Started ===');
  
  // Log configuration status
  logger.info(`BACKUP_ENABLED: ${process.env.BACKUP_ENABLED}`);
  logger.info(`GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID ? '✓ set' : '✗ not set'}`);
  logger.info(`GCP_BUCKET_NAME: ${process.env.GCP_BUCKET_NAME ? '✓ set' : '✗ not set'}`);
  logger.info(`GCP_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GCP_SERVICE_ACCOUNT_KEY_PATH ? '✓ set' : '✗ not set'}`);
  
  try {
    await executeBackup();
    logger.info('=== Manual Backup Completed Successfully ===');
    process.exit(0);
  } catch (error: any) {
    logger.error('=== Manual Backup Failed ===');
    logger.error(error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
