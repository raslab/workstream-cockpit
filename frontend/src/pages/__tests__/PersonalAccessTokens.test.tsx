import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react';
import { apiClient } from '../../api/client';
import Settings from '../Settings';

async function performUserAction(action: () => Promise<void>) {
  await act(async () => {
    await action();
  });
}

function renderSettings(initialPath = '/settings/personal-access-tokens') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Personal access tokens settings', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('adds a settings route/sidebar item and lists PAT metadata without raw tokens', async () => {
    mock.onGet('/api/personal-access-tokens').reply(200, {
      personalAccessTokens: [
        {
          id: 'pat_1',
          name: 'Claude Desktop',
          scopes: ['mcp:read', 'mcp:write'],
          createdAt: '2026-06-01T10:00:00.000Z',
          lastUsedAt: '2026-06-03T11:12:13.000Z',
          expiresAt: '2026-07-01T10:00:00.000Z',
          revokedAt: null,
        },
      ],
    });

    renderSettings();

    expect(await screen.findByRole('heading', { name: /personal access tokens/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /personal access tokens/i })).toHaveAttribute(
      'href',
      '/settings/personal-access-tokens',
    );
    expect(await screen.findByText('Claude Desktop')).toBeInTheDocument();
    expect(screen.getByText(/Read and write/i)).toBeInTheDocument();
    expect(screen.getByText(/Created:/i)).toHaveTextContent('Jun 1, 2026');
    expect(screen.getByText(/Last used:/i)).toHaveTextContent('Jun 3, 2026');
    expect(screen.getByText(/Expires:/i)).toHaveTextContent('Jul 1, 2026');
    expect(screen.queryByText(/wsc_pat_/i)).not.toBeInTheDocument();
  });

  it('creates a read-write PAT, displays the raw token exactly once, supports copy, and clears it', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/personal-access-tokens').reply(200, { personalAccessTokens: [] });
    mock.onPost('/api/personal-access-tokens').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        name: 'Local MCP',
        scopes: ['mcp:read', 'mcp:write'],
        expiresAt: '2026-12-31T00:00:00.000Z',
      });
      return [
        201,
        {
          token: 'wsc_pat_raw_secret_once',
          personalAccessToken: {
            id: 'pat_2',
            name: 'Local MCP',
            scopes: ['mcp:read', 'mcp:write'],
            createdAt: '2026-06-02T10:00:00.000Z',
            lastUsedAt: null,
            expiresAt: '2026-12-31T00:00:00.000Z',
            revokedAt: null,
          },
        },
      ];
    });

    renderSettings();
    await performUserAction(async () => {
      await user.click(await screen.findByRole('button', { name: /new token/i }));
    });
    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/token name/i), 'Local MCP');
    });
    await performUserAction(async () => {
      await user.click(screen.getByLabelText(/read and write/i));
    });
    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/expires/i), '2026-12-31');
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /create token/i }));
    });

    const rawToken = await screen.findByText('wsc_pat_raw_secret_once');
    expect(rawToken).toBeInTheDocument();
    expect(screen.getByText(/copy it now/i)).toBeInTheDocument();
    expect(screen.getByText(/codex setup tip/i)).toBeInTheDocument();
    expect(screen.getByText(/Headers section/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorization: Bearer <paste-this-token>/i)).toBeInTheDocument();
    expect(screen.getByText(/environment-variable field/i)).toBeInTheDocument();
    expect(screen.getByText(/http:\/\/localhost:3002\/mcp/i)).toBeInTheDocument();

    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /copy token/i }));
    });
    expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument();

    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /i have saved this token/i }));
    });
    await waitFor(() => expect(screen.queryByText('wsc_pat_raw_secret_once')).not.toBeInTheDocument());
  });

  it('validates token name and shows API errors', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/personal-access-tokens').reply(200, { personalAccessTokens: [] });
    mock.onPost('/api/personal-access-tokens').reply(400, { error: 'Name is required' });

    renderSettings();
    await performUserAction(async () => {
      await user.click(await screen.findByRole('button', { name: /new token/i }));
    });
    expect(screen.getByRole('button', { name: /create token/i })).toBeDisabled();

    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/token name/i), 'Bad token');
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /create token/i }));
    });

    expect(await screen.findByText(/failed to create personal access token/i)).toBeInTheDocument();
  });

  it('revokes a token after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    mock
      .onGet('/api/personal-access-tokens')
      .replyOnce(200, {
        personalAccessTokens: [
          {
            id: 'pat_1',
            name: 'Old MCP client',
            scopes: ['mcp:read'],
            createdAt: '2026-06-01T10:00:00.000Z',
            lastUsedAt: null,
            expiresAt: null,
            revokedAt: null,
          },
        ],
      })
      .onGet('/api/personal-access-tokens')
      .reply(200, { personalAccessTokens: [] });
    mock.onDelete('/api/personal-access-tokens/pat_1').reply(204);

    renderSettings();
    const item = await screen.findByText('Old MCP client');
    await performUserAction(async () => {
      await user.click(within(item.closest('div')!.parentElement!).getByRole('button', { name: /revoke/i }));
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /confirm revoke/i }));
    });

    await waitFor(() => expect(screen.queryByText('Old MCP client')).not.toBeInTheDocument());
    expect(await screen.findByText(/no personal access tokens yet/i)).toBeInTheDocument();
  });

  it('does not show a raw token again after the create alert is dismissed and list refreshes', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/personal-access-tokens').reply(200, { personalAccessTokens: [] });
    mock.onPost('/api/personal-access-tokens').reply(201, {
      token: 'wsc_pat_raw_secret_once',
      personalAccessToken: {
        id: 'pat_2',
        name: 'Secret-free metadata',
        scopes: ['mcp:read'],
        createdAt: '2026-06-02T10:00:00.000Z',
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
      },
    });

    renderSettings();
    await performUserAction(async () => {
      await user.click(await screen.findByRole('button', { name: /new token/i }));
    });
    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/token name/i), 'Secret-free metadata');
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /create token/i }));
    });
    expect(await screen.findByText('wsc_pat_raw_secret_once')).toBeInTheDocument();
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /i have saved this token/i }));
    });

    expect(await screen.findByText('Secret-free metadata')).toBeInTheDocument();
    expect(screen.queryByText('wsc_pat_raw_secret_once')).not.toBeInTheDocument();
  });
});
