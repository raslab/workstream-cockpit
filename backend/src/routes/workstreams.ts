import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import {
  getWorkstreams,
  getWorkstreamById,
  createWorkstream,
  updateWorkstream,
  closeWorkstream,
  reopenWorkstream,
  deleteWorkstream,
  type WorkstreamHierarchyFilter,
} from '../services/workstreamService';
import { getStatusUpdatesByWorkstream } from '../services/statusUpdateService';
import { logger } from '../utils/logger';

const router = Router();
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const HIERARCHY_FILTERS = new Set<WorkstreamHierarchyFilter>(['all', 'top-level', 'sub-streams', 'no-parent', 'has-substreams', 'under-parent']);

function validateNullableUuid(value: unknown, field: string, res: Response): value is string | null | undefined {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    res.status(400).json({ error: `${field} must be a valid UUID or null` });
    return false;
  }
  return true;
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
    const hierarchyQuery = req.query.hierarchy as string | undefined;
    const parentIdQuery = req.query.parentId as string | undefined;
    const parentIdsQuery = req.query.parentIds as string | undefined;
    const includeSubstreamsQuery = req.query.includeSubstreams as string | undefined;

    if (state !== undefined && !['active', 'closed', 'all'].includes(state)) {
      res.status(400).json({ error: 'state must be active, closed, or all' });
      return;
    }

    if (hierarchyQuery !== undefined && !HIERARCHY_FILTERS.has(hierarchyQuery as WorkstreamHierarchyFilter)) {
      res.status(400).json({ error: 'hierarchy must be all, top-level, sub-streams, no-parent, has-substreams, or under-parent' });
      return;
    }

    if (includeSubstreamsQuery !== undefined && !['true', 'false'].includes(includeSubstreamsQuery)) {
      res.status(400).json({ error: 'includeSubstreams must be true or false' });
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

    const parentId = parentIdQuery?.trim() || undefined;
    if (parentId && !UUID_RE.test(parentId)) {
      res.status(400).json({ error: 'parentId must be a valid UUID' });
      return;
    }

    const parentIds = parentIdsQuery
      ? parentIdsQuery.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;
    if (parentIds?.some(id => !UUID_RE.test(id))) {
      res.status(400).json({ error: 'parentIds must be comma-separated valid UUIDs' });
      return;
    }

    const hierarchy = hierarchyQuery || parentId || parentIds?.length || includeSubstreamsQuery !== undefined
      ? {
          mode: (hierarchyQuery as WorkstreamHierarchyFilter | undefined) ?? 'all',
          parentId,
          parentIds,
          includeSubstreams: includeSubstreamsQuery === 'true',
        }
      : undefined;

    // Get user's projects (for Phase 1, we'll use the first/default project)
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json([]);
      return;
    }

    const projectId = projects[0].id;
    const workstreams = await getWorkstreams(projectId, state, tags, categoryIds, notUpdatedToday, hierarchy);

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
    const workstream = await getWorkstreamById(workstreamId, projectId);

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

    if (!validateNullableUuid(categoryId, 'categoryId', res) || !validateNullableUuid(parentId, 'parentId', res)) return;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(400).json({ error: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    const workstream = await createWorkstream({
      projectId,
      name: name.trim(),
      categoryId,
      parentId,
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

    if (!validateNullableUuid(categoryId, 'categoryId', res) || !validateNullableUuid(parentId, 'parentId', res)) return;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (parentId !== undefined) updates.parentId = parentId;
    if (context !== undefined) updates.context = context;

    const workstream = await updateWorkstream(workstreamId, projectId, updates);

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
    const workstream = await closeWorkstream(workstreamId, projectId);

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
    const workstream = await reopenWorkstream(workstreamId, projectId);

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
    await deleteWorkstream(workstreamId, projectId);

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
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const statusUpdates = await getStatusUpdatesByWorkstream(workstreamId, {
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
