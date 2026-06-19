import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createPersonalAccessToken,
  personalAccessTokensQueryKey,
  useDeletePersonalAccessToken,
  usePersonalAccessTokens,
  type CreatePersonalAccessTokenInput,
  type PersonalAccessTokenMetadata,
  type PersonalAccessTokenScope,
} from '../api/personalAccessTokens';

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function scopeLabel(scopes: PersonalAccessTokenScope[]): string {
  return scopes.includes('mcp:write') ? 'Read and write' : 'Read only';
}

function toExpiryIso(date: string): string | undefined {
  if (!date) return undefined;
  return `${date}T00:00:00.000Z`;
}

interface OneTimeTokenNoticeProps {
  token: string;
  onDismiss: () => void;
}

function OneTimeTokenNotice({ token, onDismiss }: OneTimeTokenNoticeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm" role="alert">
      <h3 className="text-lg font-semibold text-amber-950">Copy your new token now</h3>
      <p className="mt-1 text-sm text-amber-900">
        This raw personal access token is shown exactly once. Copy it now because it cannot be
        recovered after you dismiss this message.
      </p>
      <div className="mt-3 rounded-md border border-amber-200 bg-white p-3 font-mono text-sm text-gray-900 break-all">
        {token}
      </div>
      <div className="mt-3 rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-950">
        <p className="font-medium">Codex setup tip</p>
        <p className="mt-1">
          In Codex, add an <code>Authorization</code> entry in the Headers section and use this token
          as a bearer token.
        </p>
        <p className="mt-1 font-mono text-xs text-amber-900">
          Authorization: Bearer &lt;paste-this-token&gt;
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Do not paste the raw token into Codex's bearer-token environment-variable field unless
          you have separately exported an environment variable that contains the token.
          For Docker Compose, the MCP URL is usually <code>http://localhost:3002/mcp</code> through
          the frontend proxy, or <code>http://localhost:3001/mcp</code> if the backend port is exposed.
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          {copied ? 'Copied' : 'Copy token'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          I have saved this token
        </button>
      </div>
    </div>
  );
}

interface TokenItemProps {
  token: PersonalAccessTokenMetadata;
  revokeConfirm: string | null;
  setRevokeConfirm: (id: string | null) => void;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}

function TokenItem({ token, revokeConfirm, setRevokeConfirm, onRevoke, isRevoking }: TokenItemProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900">{token.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
              {scopeLabel(token.scopes)}
            </span>
            {token.scopes.map((scope) => (
              <span key={scope} className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                {scope}
              </span>
            ))}
          </div>
          <div className="mt-3 grid gap-1 text-sm text-gray-600 sm:grid-cols-3">
            <p>Created: {formatDate(token.createdAt)}</p>
            <p>Last used: {formatDate(token.lastUsedAt)}</p>
            <p>Expires: {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {revokeConfirm === token.id ? (
            <>
              <button
                type="button"
                onClick={() => setRevokeConfirm(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isRevoking}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onRevoke(token.id)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isRevoking}
              >
                {isRevoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRevokeConfirm(token.id)}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PersonalAccessTokens() {
  const queryClient = useQueryClient();
  const { data: tokens, isLoading, error } = usePersonalAccessTokens();
  const deleteMutation = useDeletePersonalAccessToken();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [expiresOn, setExpiresOn] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPermission('read');
    setExpiresOn('');
    setCreateError(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const scopes: PersonalAccessTokenScope[] =
      permission === 'write' ? ['mcp:read', 'mcp:write'] : ['mcp:read'];
    const input: CreatePersonalAccessTokenInput = {
      name: trimmedName,
      scopes,
      ...(expiresOn ? { expiresAt: toExpiryIso(expiresOn) } : {}),
    };

    setCreateError(null);
    setIsSubmitting(true);
    try {
      const response = await createPersonalAccessToken(input);
      setOneTimeToken(response.token);
      queryClient.setQueryData<PersonalAccessTokenMetadata[]>(personalAccessTokensQueryKey, (current) => [
        response.personalAccessToken,
        ...(current ?? []),
      ]);
      resetForm();
      setIsCreating(false);
    } catch {
      setCreateError('Failed to create personal access token. Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setRevokeConfirm(null),
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personal access tokens</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create scoped tokens for MCP clients to read or write Cockpit data without using a browser
          session.
        </p>
      </div>

      {oneTimeToken && (
        <OneTimeTokenNotice token={oneTimeToken} onDismiss={() => setOneTimeToken(null)} />
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load personal access tokens. Please try again.
          </p>
        </div>
      )}

      {isCreating ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Create Personal Access Token</h3>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label htmlFor="pat-name" className="mb-1 block text-sm font-medium text-gray-700">
                Token name <span className="text-red-500">*</span>
              </label>
              <input
                id="pat-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                maxLength={100}
                placeholder="e.g., Claude Desktop"
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-500">{name.length}/100 characters</div>
            </div>

            <fieldset className="mb-4">
              <legend className="mb-2 block text-sm font-medium text-gray-700">Scopes</legend>
              <div className="space-y-2">
                <label className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="pat-scopes"
                    value="read"
                    checked={permission === 'read'}
                    onChange={() => setPermission('read')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-gray-900">Read only</span>
                    <span className="text-gray-500">Allows MCP clients to read Cockpit data.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="pat-scopes"
                    value="write"
                    checked={permission === 'write'}
                    onChange={() => setPermission('write')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-gray-900">Read and write</span>
                    <span className="text-gray-500">
                      Allows MCP clients to create, update, delete, close, and reorder data.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="mb-4">
              <label htmlFor="pat-expires" className="mb-1 block text-sm font-medium text-gray-700">
                Expires (optional)
              </label>
              <input
                id="pat-expires"
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {createError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {createError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create token'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="mb-6 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New token
        </button>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-64 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && tokens && tokens.length === 0 && !isCreating && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-gray-500">No personal access tokens yet.</p>
          <p className="text-xs text-gray-400">
            Create a token when configuring an MCP client that needs Cockpit access.
          </p>
        </div>
      )}

      {!isLoading && tokens && tokens.length > 0 && (
        <div className="space-y-3">
          {tokens.map((token) => (
            <TokenItem
              key={token.id}
              token={token}
              revokeConfirm={revokeConfirm}
              setRevokeConfirm={setRevokeConfirm}
              onRevoke={handleRevoke}
              isRevoking={deleteMutation.isPending && revokeConfirm === token.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
