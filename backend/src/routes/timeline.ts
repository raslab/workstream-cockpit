import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getTimeline } from '../services/timelineService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/timeline
 * Get timeline of status updates with optional filters
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - tagIds: comma-separated tag IDs (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { startDate, endDate, tagIds } = req.query;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json([]);
      return;
    }

    const projectId = projects[0].id;
    
    // Parse filters
    const filters: any = { projectId };
    
    if (startDate && typeof startDate === 'string') {
      filters.startDate = new Date(startDate);
      if (isNaN(filters.startDate.getTime())) {
        res.status(400).json({ error: 'Invalid startDate format' });
        return;
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      filters.endDate = new Date(endDate);
      if (isNaN(filters.endDate.getTime())) {
        res.status(400).json({ error: 'Invalid endDate format' });
        return;
      }
    }
    
    if (tagIds && typeof tagIds === 'string') {
      filters.tagIds = tagIds.split(',').filter(id => id.trim());
    }

    const timeline = await getTimeline(filters);
    res.json(timeline);
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

export default router;
