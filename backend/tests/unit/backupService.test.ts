const mockExecFile = jest.fn();
const mockExec = jest.fn();
const mockBucket = { upload: jest.fn(), getFiles: jest.fn() };

jest.mock('child_process', () => ({
  exec: mockExec,
  execFile: mockExecFile,
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn(() => mockBucket),
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

import { BackupService } from '../../src/services/backupService';

describe('BackupService command execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFile.mockImplementation((_file, _args, _options, callback) => {
      callback(null, { stdout: '', stderr: '' });
    });
  });

  it('runs pg_dump with execFile args and PGPASSWORD env instead of a shell command string', async () => {
    const service = new BackupService({
      gcpProjectId: 'test-project',
      gcpBucketName: 'test-bucket',
      gcpKeyFilePath: '/tmp/key.json',
      dbHost: 'localhost; touch /tmp/host-pwned',
      dbPort: '5432; touch /tmp/port-pwned',
      dbUser: 'user$(touch /tmp/user-pwned)',
      dbPassword: 'secret"; touch /tmp/password-pwned; #',
      dbName: 'workstream_cockpit; touch /tmp/db-pwned',
      retentionDays: 30,
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
});
