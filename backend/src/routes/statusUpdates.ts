import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getWorkstreamById } from '../services/workstreamService';
import {
  createStatusUpdate,
  getStatusUpdatesByWorkstream,
  updateStatusUpdate,
  deleteStatusUpdate,
} from '../services/statusUpdateService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * POST /api/status-updates
 * Create a new status update
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { workstreamId, status, note } = req.body;

    // Validation
    if (!workstreamId || typeof workstreamId !== 'string') {
      res.status(400).json({ error: 'Workstream ID is required' });
      return;
    }

    if (!status || typeof status !== 'string' || status.trim().length === 0) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    if (status.length > 500) {
      res.status(400).json({ error: 'Status must be 500 characters or less' });
      return;
    }

    if (note && note.length > 2000) {
      res.status(400).json({ error: 'Note must be 2000 characters or less' });
      return;
    }

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

    const statusUpdate = await createStatusUpdate({
      workstreamId,
      status: status.trim(),
      note,
    });

    res.status(201).json(statusUpdate);
  } catch (error) {
    logger.error('Error creating status update:', error);
    res.status(500).json({ error: 'Failed to create status update' });
  }
});

/**
 * GET /api/workstreams/:workstreamId/status-updates
 * Get all status updates for a workstream
 */
router.get('/workstreams/:workstreamId/status-updates', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const workstreamId = req.params.workstreamId;

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

    const statusUpdates = await getStatusUpdatesByWorkstream(workstreamId);
    res.json(statusUpdates);
  } catch (error) {
    logger.error('Error fetching status updates:', error);
    res.status(500).json({ error: 'Failed to fetch status updates' });
  }
});

/**
 * PUT /api/status-updates/:id
 * Update a status update
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const statusUpdateId = req.params.id;
    const { workstreamId, status, note } = req.body;

    // Validation
    if (!workstreamId || typeof workstreamId !== 'string') {
      res.status(400).json({ error: 'Workstream ID is required' });
      return;
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || status.trim().length === 0) {
        res.status(400).json({ error: 'Status cannot be empty' });
        return;
      }

      if (status.length > 500) {
        res.status(400).json({ error: 'Status must be 500 characters or less' });
        return;
      }
    }

    if (note !== undefined && note !== null && note.length > 2000) {
      res.status(400).json({ error: 'Note must be 2000 characters or less' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    const projectId = projects[0].id;

    // Verify workstream belongs to user's project
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status.trim();
    if (note !== undefined) updates.note = note;

    const statusUpdate = await updateStatusUpdate(statusUpdateId, workstreamId, updates);
    res.json(statusUpdate);
  } catch (error: any) {
    if (error.message === 'Status update not found or access denied') {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }
    logger.error('Error updating status update:', error);
    res.status(500).json({ error: 'Failed to update status update' });
  }
});

/**
 * DELETE /api/status-updates/:id
 * Delete a status update
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const statusUpdateId = req.params.id;
    const { workstreamId } = req.body;

    // Validation
    if (!workstreamId || typeof workstreamId !== 'string') {
      res.status(400).json({ error: 'Workstream ID is required' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    const projectId = projects[0].id;

    // Verify workstream belongs to user's project
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    await deleteStatusUpdate(statusUpdateId, workstreamId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Status update not found or access denied') {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }
    logger.error('Error deleting status update:', error);
    res.status(500).json({ error: 'Failed to delete status update' });
  }
});

export default router;
