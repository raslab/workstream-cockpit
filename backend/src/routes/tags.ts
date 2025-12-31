import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getTagsByProjectId } from '../services/tagService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/tags
 * Get all tags for the user's default project
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;

    // Get user's projects (for Phase 1, we'll use the first/default project)
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json([]);
      return;
    }

    const projectId = projects[0].id;
    const tags = await getTagsByProjectId(projectId);

    res.json(tags);
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

export default router;
