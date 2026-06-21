import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { getTimeline } from '../services/timelineService';
import { logger } from '../utils/logger';

const router = Router();
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const STRICT_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const VALID_EVENT_TYPES = ['status_update', 'workstream_created', 'workstream_closed', 'parent_changed', 'sub_stream_created'] as const;
const VALID_EVENT_TYPE_SET = new Set<string>(VALID_EVENT_TYPES);
const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

function parseStrictDate(value: string): Date | null {
  if (!STRICT_DATE_RE.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const dateOnly = new Date(Date.UTC(year, month - 1, day));
  if (dateOnly.getUTCFullYear() !== year || dateOnly.getUTCMonth() !== month - 1 || dateOnly.getUTCDate() !== day) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLimit(value: unknown): number | null {
  if (value === undefined) return 50;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 200 ? parsed : null;
}

// All routes require authentication
router.use(requireUserContext);

/**
 * GET /api/timeline
 * Get timeline of status updates with optional filters
 * Query params:
 *   - startDate: strict ISO date string (optional)
 *   - endDate: strict ISO date string (optional)
 *   - categoryIds: comma-separated category IDs (optional)
 *   - tags: comma-separated tag names/IDs (optional)
 *   - limit: page size, 1..200 (default 50)
 *   - cursor: opaque pagination cursor (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const personId = req.userContext!.personId;
    const { startDate, endDate, categoryIds, tags, eventTypes, streamScope, parentId, includeSubstreams, limit, cursor } = req.query;

    // Get user's projects
    const projects = await getProjectsByPersonId(personId);
    
    if (projects.length === 0) {
      res.json({ events: [], nextCursor: null });
      return;
    }

    const projectId = projects[0].id;
    
    // Parse filters
    const filters: any = { projectId };
    
    if (startDate && typeof startDate === 'string') {
      const parsed = parseStrictDate(startDate);
      if (!parsed) {
        res.status(400).json({ error: 'Invalid startDate format' });
        return;
      }
      filters.startDate = parsed;
    } else if (startDate !== undefined) {
      res.status(400).json({ error: 'Invalid startDate format' });
      return;
    }
    
    if (endDate && typeof endDate === 'string') {
      const parsed = parseStrictDate(endDate);
      if (!parsed) {
        res.status(400).json({ error: 'Invalid endDate format' });
        return;
      }
      filters.endDate = parsed;
    } else if (endDate !== undefined) {
      res.status(400).json({ error: 'Invalid endDate format' });
      return;
    }

    if (!filters.startDate && !filters.endDate) {
      filters.endDate = new Date();
      filters.startDate = new Date(filters.endDate.getTime() - DEFAULT_RANGE_MS);
    } else if (filters.startDate && !filters.endDate) {
      filters.endDate = new Date(filters.startDate.getTime() + MAX_RANGE_MS);
    } else if (!filters.startDate && filters.endDate) {
      filters.startDate = new Date(filters.endDate.getTime() - MAX_RANGE_MS);
    }

    if (filters.startDate.getTime() > filters.endDate.getTime()) {
      res.status(400).json({ error: 'startDate must be before or equal to endDate' });
      return;
    }
    if (filters.endDate.getTime() - filters.startDate.getTime() > MAX_RANGE_MS) {
      res.status(400).json({ error: 'Date range must not exceed 366 days' });
      return;
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

    const parsedLimit = parseLimit(limit);
    if (parsedLimit === null) {
      res.status(400).json({ error: 'limit must be an integer between 1 and 200' });
      return;
    }
    filters.limit = parsedLimit;

    if (cursor !== undefined) {
      if (typeof cursor !== 'string' || cursor.length === 0) {
        res.status(400).json({ error: 'cursor must be a non-empty string' });
        return;
      }
      filters.cursor = cursor;
    }

    const timeline = await getTimeline(filters);
    res.json(timeline);
  } catch (error: any) {
    if (error?.message === 'Invalid timeline cursor') {
      res.status(400).json({ error: 'Invalid cursor' });
      return;
    }
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

export default router;
