import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Tag, CreateTagInput, UpdateTagInput } from '../types/tag';

/**
 * Fetch all tags for the current user's project
 */
async function fetchTags(): Promise<Tag[]> {
  const response = await apiClient.get('/api/tags');
  return response.data.tags;
}

/**
 * Create a new tag
 */
async function createTag(input: CreateTagInput): Promise<Tag> {
  const response = await apiClient.post('/api/tags', input);
  return response.data.tag;
}

/**
 * Update an existing tag
 */
async function updateTag(id: string, updates: UpdateTagInput): Promise<Tag> {
  const response = await apiClient.patch(`/api/tags/${id}`, updates);
  return response.data.tag;
}

/**
 * Delete a tag
 */
async function deleteTag(id: string): Promise<void> {
  await apiClient.delete(`/api/tags/${id}`);
}

/**
 * Hook to fetch all tags
 */
export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: fetchTags,
  });
}

/**
 * Hook to create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      // Invalidate and refetch tags
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTagInput }) =>
      updateTag(id, updates),
    onSuccess: () => {
      // Invalidate and refetch tags
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      // Invalidate and refetch tags
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
