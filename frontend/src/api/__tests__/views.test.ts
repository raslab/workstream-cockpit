import { describe, expect, it } from 'vitest';
import { normalizeViewConfig } from '../views';

describe('views config normalization', () => {
  it('migrates legacy updatedAt sort field to lastActivityAt', () => {
    const config = normalizeViewConfig({
      sort: { field: 'updatedAt', direction: 'asc' } as never,
    });

    expect(config.sort).toEqual({ field: 'lastActivityAt', direction: 'asc' });
  });
});
