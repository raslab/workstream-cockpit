import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import {
  createPersonalAccessToken,
  deletePersonalAccessToken,
  listPersonalAccessTokens,
} from '../personalAccessTokens';

describe('personal access tokens api client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('lists token metadata only', async () => {
    const metadata = [
      {
        id: 'pat_1',
        name: 'MCP client',
        scopes: ['mcp:read'],
        createdAt: '2026-06-01T10:00:00.000Z',
        lastUsedAt: null,
        expiresAt: '2026-07-01T10:00:00.000Z',
        revokedAt: null,
      },
    ];
    mock.onGet('/api/personal-access-tokens').reply(200, { personalAccessTokens: metadata });

    await expect(listPersonalAccessTokens()).resolves.toEqual(metadata);
  });

  it('creates a token and returns raw token separately from metadata', async () => {
    const input = {
      name: 'MCP client',
      scopes: ['mcp:read', 'mcp:write'] as const,
      expiresAt: '2026-12-31T00:00:00.000Z',
    };
    const metadata = {
      id: 'pat_2',
      name: 'MCP client',
      scopes: ['mcp:read', 'mcp:write'],
      createdAt: '2026-06-02T10:00:00.000Z',
      lastUsedAt: null,
      expiresAt: '2026-12-31T00:00:00.000Z',
      revokedAt: null,
    };
    mock.onPost('/api/personal-access-tokens', input).reply(201, {
      token: 'wsc_pat_raw_secret_once',
      personalAccessToken: metadata,
    });

    await expect(createPersonalAccessToken(input)).resolves.toEqual({
      token: 'wsc_pat_raw_secret_once',
      personalAccessToken: metadata,
    });
  });

  it('deletes a token by id', async () => {
    mock.onDelete('/api/personal-access-tokens/pat_1').reply(204);

    await expect(deletePersonalAccessToken('pat_1')).resolves.toBeUndefined();
  });
});
