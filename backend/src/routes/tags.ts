import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import {
  getTagsByProjectId,
  createTag,
  updateTag,
  deleteTag,
  reorderTags,
} from '../services/tagService';
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

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { name, color, emoji } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Tag name is required' });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({ error: 'Tag name must be 100 characters or less' });
      return;
    }

    if (!color || typeof color !== 'string') {
      res.status(400).json({ error: 'Tag color is required' });
      return;
    }

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      res.status(400).json({ error: 'Tag color must be a valid hex color (e.g., #FF5733)' });
      return;
    }

    // Validate emoji (optional, single emoji character)
    if (emoji !== undefined && emoji !== null) {
      if (typeof emoji !== 'string') {
        res.status(400).json({ error: 'Emoji must be a string' });
        return;
      }
      // Basic emoji validation - just check length for now
      if (emoji.length > 10) {
        res.status(400).json({ error: 'Emoji must be a single emoji character' });
        return;
      }
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(400).json({ error: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    const tag = await createTag({
      projectId,
      name: name.trim(),
      color: color.toUpperCase(),
      emoji: emoji?.trim() || null,
    });

    res.status(201).json(tag);
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) {
      res.status(400).json({ error: 'A tag with this name already exists' });
      return;
    }
    logger.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const tagId = req.params.id;
    const { name, color, emoji } = req.body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Tag name cannot be empty' });
        return;
      }

      if (name.length > 100) {
        res.status(400).json({ error: 'Tag name must be 100 characters or less' });
        return;
      }
    }

    if (color !== undefined) {
      if (typeof color !== 'string') {
        res.status(400).json({ error: 'Tag color must be a string' });
        return;
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        res.status(400).json({ error: 'Tag color must be a valid hex color (e.g., #FF5733)' });
        return;
      }
    }

    if (emoji !== undefined && emoji !== null) {
      if (typeof emoji !== 'string') {
        res.status(400).json({ error: 'Emoji must be a string' });
        return;
      }
      if (emoji.length > 10) {
        res.status(400).json({ error: 'Emoji must be a single emoji character' });
        return;
      }
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    const projectId = projects[0].id;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color.toUpperCase();
    if (emoji !== undefined) updates.emoji = emoji?.trim() || null;

    const tag = await updateTag(tagId, projectId, updates);
    res.json(tag);
  } catch (error: any) {
    if (error.message === 'Tag not found or access denied') {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    if (error.message?.includes('Unique constraint')) {
      res.status(400).json({ error: 'A tag with this name already exists' });
      return;
    }
    logger.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const tagId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    const projectId = projects[0].id;
    await deleteTag(tagId, projectId);
    
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Tag not found or access denied') {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    logger.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

/**
 * PUT /api/tags/reorder
 * Reorder tags
 */
router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { tagIds } = req.body;

    // Validation
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      res.status(400).json({ error: 'Tag IDs array is required' });
      return;
    }

    if (!tagIds.every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'All tag IDs must be strings' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(400).json({ error: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    const updatedTags = await reorderTags(projectId, tagIds);
    
    res.json(updatedTags);
  } catch (error: any) {
    if (error.message?.includes('not found or access denied')) {
      res.status(404).json({ error: 'One or more tags not found' });
      return;
    }
    logger.error('Error reordering tags:', error);
    res.status(500).json({ error: 'Failed to reorder tags' });
  }
});

export default router;
