import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import {
  getCategoriesByProjectId,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categoryService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/categories
 * Get all categories for the user's default project
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
    const categories = await getCategoriesByProjectId(projectId);

    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { name, color, emoji } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({ error: 'Category name must be 100 characters or less' });
      return;
    }

    if (!color || typeof color !== 'string') {
      res.status(400).json({ error: 'Category color is required' });
      return;
    }

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      res.status(400).json({ error: 'Category color must be a valid hex color (e.g., #FF5733)' });
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
    const category = await createCategory({
      projectId,
      name: name.trim(),
      color: color.toUpperCase(),
      emoji: emoji?.trim() || null,
    });

    res.status(201).json(category);
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) {
      res.status(400).json({ error: 'A category with this name already exists' });
      return;
    }
    logger.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/categories/reorder
 * Reorder categories
 * NOTE: Must come BEFORE /:id route to avoid treating "reorder" as an ID
 */
router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { categoryIds } = req.body;

    logger.info(`Reorder request from person ${personId} with ${categoryIds?.length || 0} categories`);

    // Validation
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      res.status(400).json({ error: 'Category IDs array is required' });
      return;
    }

    if (!categoryIds.every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'All category IDs must be strings' });
      return;
    }

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      logger.error(`No project found for person ${personId}`);
      res.status(400).json({ error: 'No project found for user' });
      return;
    }

    const projectId = projects[0].id;
    logger.info(`Reordering categories for project ${projectId}`);
    
    const updatedCategories = await reorderCategories(projectId, categoryIds);
    
    logger.info(`Successfully reordered ${updatedCategories.length} categories`);
    res.json(updatedCategories);
  } catch (error: any) {
    logger.error('Error in reorder endpoint:', error);
    if (error.message?.includes('not found or access denied')) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    logger.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

/**
 * PUT /api/categories/:id
 * Update a category
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const categoryId = req.params.id;
    const { name, color, emoji } = req.body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Category name cannot be empty' });
        return;
      }

      if (name.length > 100) {
        res.status(400).json({ error: 'Category name must be 100 characters or less' });
        return;
      }
    }

    if (color !== undefined) {
      if (typeof color !== 'string') {
        res.status(400).json({ error: 'Category color must be a string' });
        return;
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        res.status(400).json({ error: 'Category color must be a valid hex color (e.g., #FF5733)' });
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
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const projectId = projects[0].id;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color.toUpperCase();
    if (emoji !== undefined) updates.emoji = emoji?.trim() || null;

    const category = await updateCategory(categoryId, projectId, updates);
    res.json(category);
  } catch (error: any) {
    if (error.message === 'Category not found or access denied') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (error.message?.includes('Unique constraint')) {
      res.status(400).json({ error: 'A category with this name already exists' });
      return;
    }
    logger.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const categoryId = req.params.id;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const projectId = projects[0].id;
    await deleteCategory(categoryId, projectId);
    
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Category not found or access denied') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    logger.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
