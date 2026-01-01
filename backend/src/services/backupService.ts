import { Storage } from '@google-cloud/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface BackupConfig {
  gcpProjectId: string;
  gcpBucketName: string;
  gcpKeyFilePath: string;
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  retentionDays: number;
}

export class BackupService {
  private storage: Storage;
  private config: BackupConfig;
  private bucket: any;

  constructor(config: BackupConfig) {
    this.config = config;
    
    // Initialize GCP Storage client
    this.storage = new Storage({
      projectId: config.gcpProjectId,
      keyFilename: config.gcpKeyFilePath,
    });
    
    this.bucket = this.storage.bucket(config.gcpBucketName);
  }

  /**
   * Create a database backup and upload to GCP Cloud Storage
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-').split('-').slice(0, 6).join('-');
    const filename = `workstream-backup-${timestamp}`;
    const sqlFile = `/tmp/${filename}.sql`;
    const gzipFile = `/tmp/${filename}.sql.gz`;
    
    try {
      logger.info('Starting database backup...');
      
      // Step 1: Create PostgreSQL dump
      await this.createPgDump(sqlFile);
      
      // Step 2: Compress the dump
      await this.compressFile(sqlFile, gzipFile);
      
      // Step 3: Upload to GCP Cloud Storage
      const gcpPath = await this.uploadToGcp(gzipFile, filename);
      
      // Step 4: Cleanup local files
      this.cleanupLocalFiles([sqlFile, gzipFile]);
      
      logger.info(`Backup completed successfully: ${gcpPath}`);
      return gcpPath;
      
    } catch (error: any) {
      logger.error('Backup failed:', error);
      
      // Cleanup on error
      this.cleanupLocalFiles([sqlFile, gzipFile]);
      
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Create PostgreSQL dump using pg_dump
   */
  private async createPgDump(outputFile: string): Promise<void> {
    const { dbHost, dbPort, dbUser, dbPassword, dbName } = this.config;
    
    const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${outputFile}`;
    
    logger.info(`Creating database dump: ${outputFile}`);
    
    try {
      await execAsync(pgDumpCommand);
      logger.info('Database dump created successfully');
    } catch (error: any) {
      throw new Error(`pg_dump failed: ${error.message}`);
    }
  }

  /**
   * Compress file using gzip
   */
  private async compressFile(inputFile: string, outputFile: string): Promise<void> {
    logger.info(`Compressing file: ${inputFile} -> ${outputFile}`);
    
    try {
      const source = createReadStream(inputFile);
      const destination = createWriteStream(outputFile);
      const gzip = createGzip();
      
      await pipeline(source, gzip, destination);
      logger.info('File compressed successfully');
    } catch (error: any) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Upload file to GCP Cloud Storage
   */
  private async uploadToGcp(localFile: string, filename: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const gcpPath = `${year}/${month}/${filename}.sql.gz`;
    
    logger.info(`Uploading to GCP: ${gcpPath}`);
    
    try {
      await this.bucket.upload(localFile, {
        destination: gcpPath,
        metadata: {
          contentType: 'application/gzip',
          metadata: {
            createdAt: now.toISOString(),
            source: 'automated-backup',
          },
        },
      });
      
      logger.info('Upload to GCP completed successfully');
      return `gs://${this.config.gcpBucketName}/${gcpPath}`;
    } catch (error: any) {
      throw new Error(`GCP upload failed: ${error.message}`);
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<number> {
    logger.info('Starting cleanup of old backups...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    try {
      const [files] = await this.bucket.getFiles({
        prefix: '',
      });
      
      let deletedCount = 0;
      
      for (const file of files) {
        const metadata = await file.getMetadata();
        const createdAt = new Date(metadata[0].timeCreated);
        
        if (createdAt < cutoffDate) {
          logger.info(`Deleting old backup: ${file.name} (created: ${createdAt.toISOString()})`);
          await file.delete();
          deletedCount++;
        }
      }
      
      logger.info(`Cleanup completed. Deleted ${deletedCount} old backups.`);
      return deletedCount;
      
    } catch (error: any) {
      logger.error('Cleanup failed:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleanup local temporary files
   */
  private cleanupLocalFiles(files: string[]): void {
    for (const file of files) {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
          logger.debug(`Deleted local file: ${file}`);
        }
      } catch (error: any) {
        logger.warn(`Failed to delete local file ${file}: ${error.message}`);
      }
    }
  }
}

/**
 * Create backup service instance from environment variables
 */
export function createBackupService(): BackupService | null {
  const enabled = process.env.BACKUP_ENABLED === 'true';
  
  if (!enabled) {
    logger.info('Backup system is disabled (BACKUP_ENABLED is not "true")');
    logger.info(`Current value: BACKUP_ENABLED="${process.env.BACKUP_ENABLED}"`);
    return null;
  }
  
  const config: BackupConfig = {
    gcpProjectId: process.env.GCP_PROJECT_ID || '',
    gcpBucketName: process.env.GCP_BUCKET_NAME || '',
    gcpKeyFilePath: process.env.GCP_SERVICE_ACCOUNT_KEY_PATH || '',
    dbHost: process.env.POSTGRES_HOST || '',
    dbPort: process.env.POSTGRES_PORT || '',
    dbUser: process.env.POSTGRES_USER || '',
    dbPassword: process.env.POSTGRES_PASSWORD || '',
    dbName: process.env.POSTGRES_DB || 'workstream_cockpit',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  };
  
  // Validate required config
  if (!config.gcpProjectId || !config.gcpBucketName || !config.gcpKeyFilePath) {
    logger.warn('Backup system disabled: Missing GCP configuration');
    logger.warn(`  GCP_PROJECT_ID: ${config.gcpProjectId ? '✓' : '✗ missing'}`);
    logger.warn(`  GCP_BUCKET_NAME: ${config.gcpBucketName ? '✓' : '✗ missing'}`);
    logger.warn(`  GCP_SERVICE_ACCOUNT_KEY_PATH: ${config.gcpKeyFilePath ? '✓' : '✗ missing'}`);
    return null;
  }
  
  logger.info('Backup service initialized successfully');
  logger.info(`  Project: ${config.gcpProjectId}`);
  logger.info(`  Bucket: ${config.gcpBucketName}`);
  logger.info(`  Retention: ${config.retentionDays} days`);
  
  return new BackupService(config);
}

/**
 * Execute backup with error handling and retry logic
 */
export async function executeBackup(maxRetries = 3): Promise<void> {
  const service = createBackupService();
  
  if (!service) {
    logger.info('Backup service not available');
    return;
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Backup attempt ${attempt}/${maxRetries}`);
      
      // Create backup
      await service.createBackup();
      
      // Cleanup old backups
      await service.cleanupOldBackups();
      
      logger.info('Backup process completed successfully');
      return;
      
    } catch (error: any) {
      lastError = error;
      logger.error(`Backup attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`All backup attempts failed. Last error: ${lastError?.message}`);
  throw lastError;
}
