import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  abandonNextStep,
  createNextStep,
  listNextSteps,
  reorderNextSteps,
  solveNextStep,
  updateNextStep,
} from '../api/nextSteps';
import type { NextStep } from '../types/workstream';

function sortOpenNextSteps(steps: NextStep[] = []) {
  return [...steps]
    .filter((step) => step.state === undefined || step.state === 'open')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useNextSteps(
  workstreamId: string | undefined,
  additionalWorkstreamReferences: string[] = [],
) {
  const queryClient = useQueryClient();
  const queryKey = ['next-steps', workstreamId];
  const affectedWorkstreamReferences = Array.from(
    new Set(
      [workstreamId, ...additionalWorkstreamReferences].filter(
        (reference): reference is string => Boolean(reference),
      ),
    ),
  );

  const query = useQuery<NextStep[]>({
    queryKey,
    queryFn: () => listNextSteps(workstreamId!),
    enabled: !!workstreamId,
    select: sortOpenNextSteps,
  });

  const invalidateNextSteps = () => {
    queryClient.invalidateQueries({ queryKey });
    affectedWorkstreamReferences.forEach((reference) => {
      queryClient.invalidateQueries({ queryKey: ['workstream', reference] });
    });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
  };

  const invalidateMovement = () => {
    invalidateNextSteps();
    affectedWorkstreamReferences.forEach((reference) => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', reference] });
    });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };

  const createMutation = useMutation({
    mutationFn: (text: string) => createNextStep(workstreamId!, { text }),
    onSuccess: invalidateNextSteps,
  });

  const updateMutation = useMutation({
    mutationFn: ({ nextStepId, text }: { nextStepId: string; text: string }) =>
      updateNextStep(workstreamId!, nextStepId, { text }),
    onSuccess: invalidateNextSteps,
  });

  const reorderMutation = useMutation({
    mutationFn: (nextStepIds: string[]) => reorderNextSteps(workstreamId!, nextStepIds),
    onSuccess: invalidateNextSteps,
  });

  const solveMutation = useMutation({
    mutationFn: (nextStepId: string) => solveNextStep(workstreamId!, nextStepId),
    onSuccess: invalidateMovement,
  });

  const abandonMutation = useMutation({
    mutationFn: (nextStepId: string) => abandonNextStep(workstreamId!, nextStepId),
    onSuccess: invalidateMovement,
  });

  return {
    ...query,
    nextSteps: query.data || [],
    createNextStep: createMutation,
    updateNextStep: updateMutation,
    reorderNextSteps: reorderMutation,
    solveNextStep: solveMutation,
    abandonNextStep: abandonMutation,
  };
}
