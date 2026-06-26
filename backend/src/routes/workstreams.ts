import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import {
  getWorkstreams,
  getWorkstreamByReference,
  resolveWorkstreamId,
  createWorkstream,
  updateWorkstream,
  closeWorkstream,
  reopenWorkstream,
  deleteWorkstream,
} from '../services/workstreamService';
import { getStatusUpdatesByWorkstream } from '../services/statusUpdateService';
import { logger } from '../utils/logger';

const router = Router();
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function validateNullableUuid(value: unknown, field: string, res: Response): value is string | null | undefined {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    res.status(400).json({ error: `${field} must be a valid UUID or null` });
    return false;
  }
  return true;
}

function validateNullableWorkstreamReference(value: unknown, field: string, res: Response): value is string | number | null | undefined {
  if (value === undefined || value === null) return true;
  if ((typeof value === 'string' && (UUID_RE.test(value) || /^[1-9]\d*$/.test(value))) || (typeof value === 'number' && Number.isInteger(value) && value > 0)) return true;
  res.status(400).json({ error: `${field} must be a valid UUID, positive number, or null` });
  return false;
}

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/workstreams
 * Get all workstreams for the user's default project
 * Query params:
 *   - state: 'active' | 'closed' (optional)
 *   - tags: comma-separated list of tag names (optional)
 *   - categoryIds: comma-separated list of category IDs (optional)
 *   - notUpdatedToday: 'true' | 'false' (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const state = req.query.state as 'active' | 'closed' | 'all' | undefined;
    const tagsQuery = req.query.tags as string | undefined;
    const categoryIdsQuery = req.query.categoryIds as string | undefined;
    const notUpdatedToday = req.query.notUpdatedToday === 'true';

    if (state !== undefined && !['active', 'closed', 'all'].includes(state)) {
      res.status(400).json({ error: 'state must be active, closed, or all' });
      return;
    }

    // Parse comma-separated tags
    const tags = tagsQuery 
      ? tagsQuery.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;

    // Parse comma-separated category IDs
    const categoryIds = categoryIdsQuery
      ? categoryIdsQuery.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;

    // Get user's projects (for Phase 1, we'll use the first/default project)
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json([]);
      return;
    }

    const projectId = projects[0].id;
    const workstreams = await getWorkstreams(projectId, state, tags, categoryIds, notUpdatedToday);

    res.json(workstreams);
  } catch (error) {
    logger.error('Error fetching workstreams:', error);
    res.status(500).json({ error: 'Failed to fetch workstreams' });
  }
});

/**
 * GET /api/workstreams/:id
 * Get a single workstream by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const workstream = await getWorkstreamByReference(workstreamId, projectId);

    if (!workstream) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    res.json(workstream);
  } catch (error) {
    logger.error('Error fetching workstream:', error);
    res.status(500).json({ error: 'Failed to fetch workstream' });
  }
});

/**
 * POST /api/workstreams
 * Create a new workstream
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { name, categoryId, parentId, context, initialStatus, initialNote } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Workstream name is required' });
      return;
    }

    if (name.length > 200) {
      res.status(400).json({ error: 'Workstream name must be 200 characters or less' });
      return;
    }

    if (context && context.length > 2000) {
      res.status(400).json({ error: 'Context must be 2000 characters or less' });
      return;
    }

    if (initialStatus && initialStatus.length > 500) {
      res.status(400).json({ error: 'Initial status must be 500 characters or less' });
      return;
    }

    if (initialNote && initialNote.length > 2000) {
      res.status(400).json({ error: 'Initial note must be 2000 characters or less' });
      return;
    }

    if (!validateNullableUuid(categoryId, 'categoryId', res) || !validateNullableWorkstreamReference(parentId, 'parentId', res)) return;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(400).json({ error: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    const resolvedParentId = await resolveWorkstreamId(parentId, projectId);
    if (parentId !== undefined && parentId !== null && !resolvedParentId) {
      res.status(404).json({ error: 'Parent workstream not found' });
      return;
    }
    const workstream = await createWorkstream({
      projectId,
      name: name.trim(),
      categoryId,
      parentId: resolvedParentId,
      context,
      initialStatus,
      initialNote,
    });

    res.status(201).json(workstream);
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (error instanceof Error && error.message === 'Parent workstream not found') {
      res.status(404).json({ error: 'Parent workstream not found' });
      return;
    }
    if (error instanceof Error && /parent|depth|cycle|sub-stream/i.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error creating workstream:', error);
    res.status(500).json({ error: 'Failed to create workstream' });
  }
});

/**
 * PUT /api/workstreams/:id
 * Update a workstream
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;
    const { name, categoryId, parentId, context } = req.body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Workstream name cannot be empty' });
        return;
      }

      if (name.length > 200) {
        res.status(400).json({ error: 'Workstream name must be 200 characters or less' });
        return;
      }
    }

    if (context !== undefined && context !== null && context.length > 2000) {
      res.status(400).json({ error: 'Context must be 2000 characters or less' });
      return;
    }

    if (!validateNullableUuid(categoryId, 'categoryId', res) || !validateNullableWorkstreamReference(parentId, 'parentId', res)) return;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const resolvedWorkstreamId = await resolveWorkstreamId(workstreamId, projectId);
    if (!resolvedWorkstreamId) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    const resolvedParentId = await resolveWorkstreamId(parentId, projectId);
    if (parentId !== undefined && parentId !== null && !resolvedParentId) {
      res.status(404).json({ error: 'Parent workstream not found' });
      return;
    }
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (parentId !== undefined) updates.parentId = resolvedParentId;
    if (context !== undefined) updates.context = context;

    const workstream = await updateWorkstream(resolvedWorkstreamId, projectId, updates);

    res.json(workstream);
  } catch (error: any) {
    if (error.message === 'Workstream not found or access denied') {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    if (error.message === 'Category not found') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (error.message === 'Parent workstream not found') {
      res.status(404).json({ error: 'Parent workstream not found' });
      return;
    }
    if (/parent|depth|cycle|sub-stream/i.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error updating workstream:', error);
    res.status(500).json({ error: 'Failed to update workstream' });
  }
});

/**
 * PUT /api/workstreams/:id/close
 * Close a workstream
 */
router.put('/:id/close', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const resolvedWorkstreamId = await resolveWorkstreamId(workstreamId, projectId);
    if (!resolvedWorkstreamId) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    const workstream = await closeWorkstream(resolvedWorkstreamId, projectId);

    res.json(workstream);
  } catch (error: any) {
    if (error.message === 'Workstream not found or access denied') {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    if (/active sub-streams/i.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error closing workstream:', error);
    res.status(500).json({ error: 'Failed to close workstream' });
  }
});

/**
 * PUT /api/workstreams/:id/reopen
 * Reopen a closed workstream
 */
router.put('/:id/reopen', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const resolvedWorkstreamId = await resolveWorkstreamId(workstreamId, projectId);
    if (!resolvedWorkstreamId) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    const workstream = await reopenWorkstream(resolvedWorkstreamId, projectId);

    res.json(workstream);
  } catch (error: any) {
    if (error.message === 'Workstream not found or access denied') {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    if (/parent.*closed/i.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error reopening workstream:', error);
    res.status(500).json({ error: 'Failed to reopen workstream' });
  }
});

/**
 * DELETE /api/workstreams/:id
 * Delete a workstream
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const resolvedWorkstreamId = await resolveWorkstreamId(workstreamId, projectId);
    if (!resolvedWorkstreamId) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    await deleteWorkstream(resolvedWorkstreamId, projectId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Workstream not found or access denied') {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }
    if (/sub-streams/i.test(error.message)) {
      res.status(409).json({ error: error.message });
      return;
    }
    logger.error('Error deleting workstream:', error);
    res.status(500).json({ error: 'Failed to delete workstream' });
  }
});

/**
 * GET /api/workstreams/:id/status-updates
 * Get all status updates for a workstream
 */
router.get('/:id/status-updates', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;

    // Verify workstream belongs to user's project
    const workstream = await getWorkstreamByReference(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const statusUpdates = await getStatusUpdatesByWorkstream(workstream.id, {
      includeSubstreams: req.query.includeSubstreams === 'true',
      projectId,
    });
    res.json(statusUpdates);
  } catch (error) {
    logger.error('Error fetching status updates:', error);
    res.status(500).json({ error: 'Failed to fetch status updates' });
  }
});

export default router;
