import { executeBackup } from '../src/services/backupService';
import { logger } from '../src/utils/logger';

/**
 * Manual backup script
 * Run with: npm run backup:manual
 */
async function main() {
  logger.info('=== Manual Backup Started ===');
  
  try {
    await executeBackup();
    logger.info('=== Manual Backup Completed Successfully ===');
    process.exit(0);
  } catch (error: any) {
    logger.error('=== Manual Backup Failed ===');
    logger.error(error.message);
    process.exit(1);
  }
}

main();
