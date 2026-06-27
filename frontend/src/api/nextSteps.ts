import { apiClient } from './client';
import type { NextStep, NextStepIdOrder } from '../types/workstream';

export interface CreateNextStepInput {
  text: string;
}

export interface UpdateNextStepInput {
  text: string;
}

export async function listNextSteps(workstreamId: string): Promise<NextStep[]> {
  const response = await apiClient.get(`/api/workstreams/${workstreamId}/next-steps`);
  return response.data;
}

export async function createNextStep(
  workstreamId: string,
  input: CreateNextStepInput,
): Promise<NextStep> {
  const response = await apiClient.post(`/api/workstreams/${workstreamId}/next-steps`, input);
  return response.data;
}

export async function updateNextStep(
  workstreamId: string,
  nextStepId: string,
  input: UpdateNextStepInput,
): Promise<NextStep> {
  const response = await apiClient.put(
    `/api/workstreams/${workstreamId}/next-steps/${nextStepId}`,
    input,
  );
  return response.data;
}

export async function reorderNextSteps(
  workstreamId: string,
  nextStepIds: NextStepIdOrder,
): Promise<NextStep[]> {
  const response = await apiClient.put(`/api/workstreams/${workstreamId}/next-steps/reorder`, {
    nextStepIds,
  });
  return response.data;
}

export async function solveNextStep(workstreamId: string, nextStepId: string): Promise<NextStep> {
  const response = await apiClient.put(
    `/api/workstreams/${workstreamId}/next-steps/${nextStepId}/solve`,
  );
  return response.data;
}

export async function abandonNextStep(workstreamId: string, nextStepId: string): Promise<NextStep> {
  const response = await apiClient.put(
    `/api/workstreams/${workstreamId}/next-steps/${nextStepId}/abandon`,
  );
  return response.data;
}
