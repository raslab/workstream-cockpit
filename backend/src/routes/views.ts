import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { viewService } from '../services/viewService';
import type { CreateViewInput, UpdateViewInput } from '../services/viewService';

const router = Router();

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/views
 * Get all views for the user's default project
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    
    // Get user's projects (for Phase 1, we'll use the first/default project)
    const projects = await getProjectsByPersonId(personId);
    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'No projects found for user' });
      return;
    }
    
    const projectId = projects[0].id;
    
    // Ensure default view exists
    await viewService.ensureDefaultView(projectId);
    
    const views = await viewService.getProjectViews(projectId);
    res.json(views);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/views/:viewId
 * Get a specific view
 */
router.get('/:viewId', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { viewId } = req.params;
    
    const projects = await getProjectsByPersonId(personId);
    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'No projects found for user' });
      return;
    }
    
    const projectId = projects[0].id;
    const view = await viewService.getView(viewId, projectId);
    res.json(view);
  } catch (error: any) {
    res.status(error.message === 'View not found' ? 404 : 500).json({ error: error.message });
  }
});

/**
 * POST /api/views
 * Create a new view
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const input: CreateViewInput = req.body;
    
    const projects = await getProjectsByPersonId(personId);
    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'No projects found for user' });
      return;
    }
    
    const projectId = projects[0].id;
    const view = await viewService.createView(projectId, input);
    res.status(201).json(view);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/views/:viewId
 * Update an existing view
 */
router.put('/:viewId', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { viewId } = req.params;
    const input: UpdateViewInput = req.body;
    
    const projects = await getProjectsByPersonId(personId);
    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'No projects found for user' });
      return;
    }
    
    const projectId = projects[0].id;
    const view = await viewService.updateView(viewId, projectId, input);
    res.json(view);
  } catch (error: any) {
    res.status(error.message === 'View not found' ? 404 : 500).json({ error: error.message });
  }
});

/**
 * DELETE /api/views/:viewId
 * Delete a view
 */
router.delete('/:viewId', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { viewId } = req.params;
    
    const projects = await getProjectsByPersonId(personId);
    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'No projects found for user' });
      return;
    }
    
    const projectId = projects[0].id;
    await viewService.deleteView(viewId, projectId);
    res.status(204).send();
  } catch (error: any) {
    const statusCode = error.message === 'View not found' ? 404
      : error.message === 'Cannot delete the default view' ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
