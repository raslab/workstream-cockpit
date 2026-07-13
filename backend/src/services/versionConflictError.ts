export const VERSION_CONFLICT_CODE = 'VERSION_CONFLICT';

export class VersionConflictError<T = unknown> extends Error {
  readonly code = VERSION_CONFLICT_CODE;

  constructor(readonly current: T) {
    super('Version conflict');
    this.name = 'VersionConflictError';
  }
}
