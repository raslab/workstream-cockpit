import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getTimeline } from '../services/timelineService';
import { logger } from '../utils/logger';

const router = Router();
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const VALID_EVENT_TYPES = ['status_update', 'workstream_created', 'workstream_closed', 'parent_changed', 'sub_stream_created'] as const;
const VALID_EVENT_TYPE_SET = new Set<string>(VALID_EVENT_TYPES);

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/timeline
 * Get timeline of status updates with optional filters
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - categoryIds: comma-separated category IDs (optional)
 *   - tags: comma-separated tag names/IDs (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { startDate, endDate, categoryIds, tags, eventTypes, streamScope, parentId, includeSubstreams } = req.query;

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
    
    if (categoryIds && typeof categoryIds === 'string') {
      filters.categoryIds = categoryIds.split(',').filter((id: string) => id.trim());
    }
    
    if (tags && typeof tags === 'string') {
      filters.tags = tags.split(',').filter((tag: string) => tag.trim());
    }

    if (eventTypes !== undefined) {
      if (typeof eventTypes !== 'string' && !Array.isArray(eventTypes)) {
        res.status(400).json({ error: 'eventTypes must be a comma-separated string' });
        return;
      }
      const eventTypeValues = (Array.isArray(eventTypes) ? eventTypes : [eventTypes]).flatMap((value) => String(value).split(','));
      filters.eventTypes = eventTypeValues.map((type: string) => type.trim()).filter(Boolean);
      const invalid = filters.eventTypes.filter((type: string) => !VALID_EVENT_TYPE_SET.has(type));
      if (invalid.length > 0) {
        res.status(400).json({ error: `Invalid eventTypes: ${invalid.join(', ')}` });
        return;
      }
    }

    if (streamScope !== undefined) {
      if (typeof streamScope !== 'string' || !['all', 'top-level', 'sub-streams', 'under-parent'].includes(streamScope)) {
        res.status(400).json({ error: 'streamScope must be all, top-level, sub-streams, or under-parent' });
        return;
      }
      filters.streamScope = streamScope;
    }

    if (parentId !== undefined) {
      if (typeof parentId !== 'string' || !UUID_RE.test(parentId)) {
        res.status(400).json({ error: 'parentId must be a valid UUID' });
        return;
      }
      filters.parentId = parentId;
    }

    if (includeSubstreams !== undefined) {
      if (!['true', 'false'].includes(String(includeSubstreams))) {
        res.status(400).json({ error: 'includeSubstreams must be true or false' });
        return;
      }
      filters.includeSubstreams = includeSubstreams === 'true';
    }

    const timeline = await getTimeline(filters);
    res.json(timeline);
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

export default router;
