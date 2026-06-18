import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type PersonalAccessTokenScope = 'mcp:read' | 'mcp:write';

export interface PersonalAccessTokenMetadata {
  id: string;
  name: string;
  scopes: PersonalAccessTokenScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface CreatePersonalAccessTokenInput {
  name: string;
  scopes: PersonalAccessTokenScope[];
  expiresAt?: string;
}

export interface CreatePersonalAccessTokenResponse {
  token: string;
  personalAccessToken: PersonalAccessTokenMetadata;
}

export const personalAccessTokensQueryKey = ['personal-access-tokens'] as const;

export async function listPersonalAccessTokens(): Promise<PersonalAccessTokenMetadata[]> {
  const response = await apiClient.get('/api/personal-access-tokens');
  return response.data.personalAccessTokens ?? response.data;
}

export async function createPersonalAccessToken(
  input: CreatePersonalAccessTokenInput,
): Promise<CreatePersonalAccessTokenResponse> {
  const response = await apiClient.post('/api/personal-access-tokens', input);
  return response.data;
}

export async function deletePersonalAccessToken(id: string): Promise<void> {
  await apiClient.delete(`/api/personal-access-tokens/${id}`);
}

export function usePersonalAccessTokens() {
  return useQuery<PersonalAccessTokenMetadata[]>({
    queryKey: personalAccessTokensQueryKey,
    queryFn: listPersonalAccessTokens,
  });
}

export function useDeletePersonalAccessToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePersonalAccessToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalAccessTokensQueryKey });
    },
  });
}
