import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getWorkstreamByReference } from '../services/workstreamService';
import {
  createStatusUpdate,
  getStatusUpdatesByWorkstream,
  updateStatusUpdate,
  deleteStatusUpdateByReference,
} from '../services/statusUpdateService';
import { logger } from '../utils/logger';
import { VersionConflictError } from '../services/versionConflictError';

const router = Router();

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === 'string' ? value : undefined;
}

function parseQueryBoolean(value: unknown): boolean | undefined | null {
  if (value === undefined) return undefined;
  const normalized = firstQueryValue(value);
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
}

function parseStatusUpdatePagination(
  req: Request,
  res: Response,
): { limit: number; cursor?: string } | null {
  const limitQuery = firstQueryValue(req.query.limit);
  const cursor = firstQueryValue(req.query.cursor);
  const limit = limitQuery === undefined ? 10 : Number(limitQuery);
  if (!Number.isInteger(limit) || limit < 10 || limit > 200) {
    res.status(400).json({ error: 'limit must be an integer between 10 and 200' });
    return null;
  }
  return { limit, cursor };
}

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
    if (!workstreamId || (typeof workstreamId !== 'string' && typeof workstreamId !== 'number')) {
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
    const workstream = await getWorkstreamByReference(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Workstream not found' });
      return;
    }

    if (workstream.state === 'closed') {
      res.status(409).json({ error: 'Cannot add status updates to a closed workstream' });
      return;
    }

    const statusUpdate = await createStatusUpdate({
      workstreamId: workstream.id,
      projectId,
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
router.get(
  '/workstreams/:workstreamId/status-updates',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const personId = req.userContext!.personId;
      const workstreamId = req.params.workstreamId;
      const includeSubstreams = parseQueryBoolean(req.query.includeSubstreams);
      if (includeSubstreams === null) {
        res.status(400).json({ error: 'includeSubstreams must be true, false, 1, or 0' });
        return;
      }
      const pagination = parseStatusUpdatePagination(req, res);
      if (!pagination) return;

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
        includeSubstreams: includeSubstreams === true,
        projectId,
        ...pagination,
      });
      res.json(statusUpdates);
    } catch (error: any) {
      if (error.message === 'Invalid cursor') {
        res.status(400).json({ error: 'Invalid cursor' });
        return;
      }
      logger.error('Error fetching status updates:', error);
      res.status(500).json({ error: 'Failed to fetch status updates' });
    }
  },
);

/**
 * PUT /api/status-updates/:id
 * Update a status update
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const statusUpdateId = req.params.id;
    const { workstreamId, status, note, expectedVersion } = req.body;

    // Validation
    if (!workstreamId || (typeof workstreamId !== 'string' && typeof workstreamId !== 'number')) {
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

    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      res.status(400).json({ error: 'expectedVersion must be a positive integer' });
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
    const workstream = await getWorkstreamByReference(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    const updates: any = { expectedVersion };
    if (status !== undefined) updates.status = status.trim();
    if (note !== undefined) updates.note = note;

    const statusUpdate = await updateStatusUpdate(
      statusUpdateId,
      workstream.id,
      updates,
      projectId,
    );
    res.json(statusUpdate);
  } catch (error: any) {
    if (error instanceof VersionConflictError) {
      res.status(409).json({
        error: 'This status update changed elsewhere. Reload the current version before saving.',
        code: error.code,
        current: error.current,
      });
      return;
    }
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
    const { workstreamId } = req.body ?? {};

    // Validation
    if (!workstreamId || (typeof workstreamId !== 'string' && typeof workstreamId !== 'number')) {
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
    const workstream = await getWorkstreamByReference(workstreamId, projectId);
    if (!workstream) {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }

    await deleteStatusUpdateByReference(statusUpdateId, workstream.id, projectId);
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
