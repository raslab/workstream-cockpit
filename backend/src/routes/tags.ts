import express, { Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import * as tagService from '../services/tagService';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/tags
 * Get all tags for current project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const personId = req.userContext!.personId;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json({ tags: [] });
      return;
    }

    const projectId = projects[0].id;
    const tags = await tagService.getTagsByProjectId(projectId);

    res.json({ tags });
  } catch (error: any) {
    logger.error('GET /api/tags error:', error);
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { name, color } = req.body;

    // Validate required fields
    if (!name || !color) {
      res.status(400).json({ message: 'Name and color are required' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(400).json({ message: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    const tag = await tagService.createTag({
      projectId,
      name,
      color,
    });

    res.status(201).json({ tag });
  } catch (error: any) {
    logger.error('POST /api/tags error:', error);
    
    // Return 400 for validation errors
    if (error.message.includes('Invalid') || error.message.includes('already exists')) {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Failed to create tag' });
  }
});

/**
 * PATCH /api/tags/:id
 * Update a tag
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { id } = req.params;
    const { name, color } = req.body;

    // Validate at least one field provided
    if (name === undefined && color === undefined) {
      res.status(400).json({ message: 'At least one field (name or color) is required' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    const projectId = projects[0].id;
    const tag = await tagService.updateTag(id, projectId, { name, color });

    res.json({ tag });
  } catch (error: any) {
    logger.error(`PATCH /api/tags/${req.params.id} error:`, error);

    // Return 404 for not found
    if (error.message === 'Tag not found') {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    // Return 400 for validation errors
    if (error.message.includes('Invalid') || error.message.includes('already exists')) {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { id } = req.params;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    const projectId = projects[0].id;
    await tagService.deleteTag(id, projectId);

    res.status(204).send();
  } catch (error: any) {
    logger.error(`DELETE /api/tags/${req.params.id} error:`, error);

    // Return 404 for not found
    if (error.message === 'Tag not found') {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    res.status(500).json({ message: 'Failed to delete tag' });
  }
});

export default router;
