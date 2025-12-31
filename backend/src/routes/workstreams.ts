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
} from '../services/workstreamService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/workstreams
 * Get all workstreams for the user's default project
 * Query params:
 *   - state: 'active' | 'closed' (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const state = req.query.state as 'active' | 'closed' | undefined;

    // Get user's projects (for Phase 1, we'll use the first/default project)
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json([]);
      return;
    }

    const projectId = projects[0].id;
    const workstreams = await getWorkstreams(projectId, state);

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
    const { name, tagId, context, initialStatus, initialNote } = req.body;

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
      tagId,
      context,
      initialStatus,
      initialNote,
    });

    res.status(201).json(workstream);
  } catch (error) {
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
    const { name, tagId, context } = req.body;

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

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    const projectId = projects[0].id;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (tagId !== undefined) updates.tagId = tagId;
    if (context !== undefined) updates.context = context;

    const workstream = await updateWorkstream(workstreamId, projectId, updates);

    res.json(workstream);
  } catch (error: any) {
    if (error.message === 'Workstream not found or access denied') {
      res.status(404).json({ error: 'Workstream not found' });
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
    logger.error('Error deleting workstream:', error);
    res.status(500).json({ error: 'Failed to delete workstream' });
  }
});

export default router;
