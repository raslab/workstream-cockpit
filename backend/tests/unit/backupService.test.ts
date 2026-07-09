const mockExecFile = jest.fn();
const mockExec = jest.fn();
const mockBucket = { upload: jest.fn(), getFiles: jest.fn() };
const mockBucketFactory = jest.fn(() => mockBucket);
const mockPipeline = jest.fn();
const mockCreateReadStream = jest.fn((path: string) => ({ type: 'read-stream', path }));
const mockCreateWriteStream = jest.fn((path: string) => ({ type: 'write-stream', path }));
const mockCreateGzip = jest.fn(() => ({ type: 'gzip-stream' }));
const mockExistsSync = jest.fn(() => true);
const mockUnlinkSync = jest.fn();

jest.mock('child_process', () => ({
  exec: mockExec,
  execFile: mockExecFile,
}));

jest.mock('fs', () => ({
  createReadStream: mockCreateReadStream,
  createWriteStream: mockCreateWriteStream,
  existsSync: mockExistsSync,
  unlinkSync: mockUnlinkSync,
}));

jest.mock('zlib', () => ({
  createGzip: mockCreateGzip,
}));

jest.mock('stream/promises', () => ({
  pipeline: mockPipeline,
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: mockBucketFactory,
  })),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { Storage } from '@google-cloud/storage';
import { BackupService, createBackupService, executeBackup } from '../../src/services/backupService';

const originalEnv = process.env;

const testConfig = {
  gcpProjectId: 'test-project',
  gcpBucketName: 'test-bucket',
  gcpKeyFilePath: '/tmp/key.json',
  dbHost: 'localhost',
  dbPort: '5432',
  dbUser: 'postgres',
  dbPassword: 'secret',
  dbName: 'workstream_cockpit',
  retentionDays: 30,
};

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    process.env = { ...originalEnv };
    mockExecFile.mockImplementation((_file, _args, _options, callback) => {
      callback(null, { stdout: '', stderr: '' });
    });
    mockPipeline.mockResolvedValue(undefined);
    mockBucket.upload.mockResolvedValue(undefined);
    mockBucket.getFiles.mockResolvedValue([[]]);
    mockExistsSync.mockReturnValue(true);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('initializes Google Cloud Storage with the configured project and service account key', () => {
    new BackupService(testConfig);

    expect(Storage).toHaveBeenCalledWith({
      projectId: 'test-project',
      keyFilename: '/tmp/key.json',
    });
    expect(mockBucketFactory).toHaveBeenCalledWith('test-bucket');
  });

  it('runs pg_dump with execFile args and PGPASSWORD env instead of a shell command string', async () => {
    const service = new BackupService({
      ...testConfig,
      dbHost: 'localhost; touch /tmp/host-pwned',
      dbPort: '5432; touch /tmp/port-pwned',
      dbUser: 'user$(touch /tmp/user-pwned)',
      dbPassword: 'secret"; touch /tmp/password-pwned; #',
      dbName: 'workstream_cockpit; touch /tmp/db-pwned',
    });

    await (service as any).createPgDump('/tmp/backup; touch /tmp/file-pwned.sql');

    expect(mockExec).not.toHaveBeenCalled();
    expect(mockExecFile).toHaveBeenCalledTimes(1);

    const [file, args, options] = mockExecFile.mock.calls[0];
    expect(file).toBe('pg_dump');
    expect(args).toEqual([
      '-h', 'localhost; touch /tmp/host-pwned',
      '-p', '5432; touch /tmp/port-pwned',
      '-U', 'user$(touch /tmp/user-pwned)',
      '-d', 'workstream_cockpit; touch /tmp/db-pwned',
      '-f', '/tmp/backup; touch /tmp/file-pwned.sql',
    ]);
    expect(typeof args).not.toBe('string');
    expect(options).toMatchObject({
      env: expect.objectContaining({
        PGPASSWORD: 'secret"; touch /tmp/password-pwned; #',
      }),
    });
    expect(options.shell).toBeUndefined();
  });

  it('creates a dump, gzips it, uploads it to the dated GCS path, removes temp files, and returns the gs URL', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:34:56.789Z'));
    const service = new BackupService(testConfig);

    const result = await service.createBackup();

    const basename = 'workstream-backup-2026-07-09-12-34-56';
    const sqlFile = `/tmp/${basename}.sql`;
    const gzipFile = `/tmp/${basename}.sql.gz`;

    expect(mockExecFile).toHaveBeenCalledWith(
      'pg_dump',
      ['-h', 'localhost', '-p', '5432', '-U', 'postgres', '-d', 'workstream_cockpit', '-f', sqlFile],
      expect.objectContaining({ env: expect.objectContaining({ PGPASSWORD: 'secret' }) }),
      expect.any(Function),
    );
    expect(mockCreateReadStream).toHaveBeenCalledWith(sqlFile);
    expect(mockCreateWriteStream).toHaveBeenCalledWith(gzipFile);
    expect(mockCreateGzip).toHaveBeenCalledTimes(1);
    expect(mockPipeline).toHaveBeenCalledWith(
      { type: 'read-stream', path: sqlFile },
      { type: 'gzip-stream' },
      { type: 'write-stream', path: gzipFile },
    );
    expect(mockBucket.upload).toHaveBeenCalledWith(gzipFile, {
      destination: `2026/07/${basename}.sql.gz`,
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          createdAt: '2026-07-09T12:34:56.789Z',
          source: 'automated-backup',
        },
      },
    });
    expect(mockUnlinkSync).toHaveBeenCalledWith(sqlFile);
    expect(mockUnlinkSync).toHaveBeenCalledWith(gzipFile);
    expect(result).toBe(`gs://test-bucket/2026/07/${basename}.sql.gz`);
  });

  it('removes local temp files and wraps the original error when upload fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:34:56.789Z'));
    mockBucket.upload.mockRejectedValue(new Error('permission denied'));
    const service = new BackupService(testConfig);

    await expect(service.createBackup()).rejects.toThrow('Backup failed: GCP upload failed: permission denied');

    expect(mockExecFile).toHaveBeenCalledTimes(1);
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(mockUnlinkSync).toHaveBeenCalledWith('/tmp/workstream-backup-2026-07-09-12-34-56.sql');
    expect(mockUnlinkSync).toHaveBeenCalledWith('/tmp/workstream-backup-2026-07-09-12-34-56.sql.gz');
  });

  it('deletes only backups older than the configured retention window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
    const oldFile = {
      name: '2026/06/old.sql.gz',
      getMetadata: jest.fn().mockResolvedValue([{ timeCreated: '2026-06-01T00:00:00.000Z' }]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const freshFile = {
      name: '2026/07/fresh.sql.gz',
      getMetadata: jest.fn().mockResolvedValue([{ timeCreated: '2026-07-01T00:00:00.000Z' }]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockBucket.getFiles.mockResolvedValue([[oldFile, freshFile]]);
    const service = new BackupService({ ...testConfig, retentionDays: 30 });

    const deletedCount = await service.cleanupOldBackups();

    expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: '' });
    expect(oldFile.delete).toHaveBeenCalledTimes(1);
    expect(freshFile.delete).not.toHaveBeenCalled();
    expect(deletedCount).toBe(1);
  });
});

describe('createBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when backups are disabled', () => {
    process.env.BACKUP_ENABLED = 'false';

    expect(createBackupService()).toBeNull();
    expect(Storage).not.toHaveBeenCalled();
  });

  it('returns null when required GCP settings are missing', () => {
    process.env.BACKUP_ENABLED = 'true';
    process.env.GCP_PROJECT_ID = 'project';
    process.env.GCP_BUCKET_NAME = '';
    process.env.GCP_SERVICE_ACCOUNT_KEY_PATH = '/tmp/key.json';

    expect(createBackupService()).toBeNull();
    expect(Storage).not.toHaveBeenCalled();
  });

  it('builds a configured BackupService from environment variables', () => {
    process.env.BACKUP_ENABLED = 'true';
    process.env.GCP_PROJECT_ID = 'project';
    process.env.GCP_BUCKET_NAME = 'bucket';
    process.env.GCP_SERVICE_ACCOUNT_KEY_PATH = '/tmp/key.json';
    process.env.POSTGRES_HOST = 'db';
    process.env.POSTGRES_PORT = '5433';
    process.env.POSTGRES_USER = 'app';
    process.env.POSTGRES_PASSWORD = '***';
    process.env.POSTGRES_DB = 'cockpit';
    process.env.BACKUP_RETENTION_DAYS = '14';

    const service = createBackupService();

    expect(service).toBeInstanceOf(BackupService);
    expect(Storage).toHaveBeenCalledWith({ projectId: 'project', keyFilename: '/tmp/key.json' });
    expect(mockBucketFactory).toHaveBeenCalledWith('bucket');
  });
});

describe('executeBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      BACKUP_ENABLED: 'true',
      GCP_PROJECT_ID: 'project',
      GCP_BUCKET_NAME: 'bucket',
      GCP_SERVICE_ACCOUNT_KEY_PATH: '/tmp/key.json',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a backup and then applies retention cleanup', async () => {
    const createBackupSpy = jest.spyOn(BackupService.prototype, 'createBackup').mockResolvedValue('gs://bucket/file.sql.gz');
    const cleanupSpy = jest.spyOn(BackupService.prototype, 'cleanupOldBackups').mockResolvedValue(2);

    await executeBackup(1);

    expect(createBackupSpy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the backup service is not configured', async () => {
    process.env.BACKUP_ENABLED = 'false';
    const createBackupSpy = jest.spyOn(BackupService.prototype, 'createBackup');
    const cleanupSpy = jest.spyOn(BackupService.prototype, 'cleanupOldBackups');

    await executeBackup(1);

    expect(createBackupSpy).not.toHaveBeenCalled();
    expect(cleanupSpy).not.toHaveBeenCalled();
  });
});
