import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  abandonNextStep,
  createNextStep,
  listNextSteps,
  reorderNextSteps,
  solveNextStep,
  updateNextStep,
} from '../nextSteps';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApi = apiClient as unknown as { get: Mock; post: Mock; put: Mock };

describe('next steps API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses stream-local next steps REST routes and never todo terminology', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 'step-1', text: 'Review draft' }] });
    mockedApi.post.mockResolvedValueOnce({ data: { id: 'step-2', text: 'Call partner' } });
    mockedApi.put
      .mockResolvedValueOnce({ data: { id: 'step-1', text: 'Review final draft' } })
      .mockResolvedValueOnce({ data: [{ id: 'step-2' }, { id: 'step-1' }] })
      .mockResolvedValueOnce({ data: { id: 'step-1', state: 'solved' } })
      .mockResolvedValueOnce({ data: { id: 'step-2', state: 'abandoned' } });

    await listNextSteps('stream-1');
    await createNextStep('stream-1', { text: 'Call partner' });
    await updateNextStep('stream-1', 'step-1', { text: 'Review final draft' });
    await reorderNextSteps('stream-1', ['step-2', 'step-1']);
    await solveNextStep('stream-1', 'step-1');
    await abandonNextStep('stream-1', 'step-2');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps');
    expect(mockedApi.post).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps', { text: 'Call partner' });
    expect(mockedApi.put).toHaveBeenNthCalledWith(1, '/api/workstreams/stream-1/next-steps/step-1', { text: 'Review final draft' });
    expect(mockedApi.put).toHaveBeenNthCalledWith(2, '/api/workstreams/stream-1/next-steps/reorder', { nextStepIds: ['step-2', 'step-1'] });
    expect(mockedApi.put).toHaveBeenNthCalledWith(3, '/api/workstreams/stream-1/next-steps/step-1/solve');
    expect(mockedApi.put).toHaveBeenNthCalledWith(4, '/api/workstreams/stream-1/next-steps/step-2/abandon');

    const allCalledUrls = [
      ...mockedApi.get.mock.calls,
      ...mockedApi.post.mock.calls,
      ...mockedApi.put.mock.calls,
    ].map(([url]) => String(url).toLowerCase());
    expect(allCalledUrls.join(' ')).not.toContain('todo');
  });
});
