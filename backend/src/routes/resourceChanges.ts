import { Router, Request, Response } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from '../services/projectService';
import { listResourceChanges } from '../services/resourceChangeService';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireUserContext);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await getProjectsByPersonId(req.userContext!.personId);
    if (projects.length === 0) {
      res.json({ cursor: null, changes: [] });
      return;
    }

    const after = typeof req.query.after === 'string' ? req.query.after : null;
    const limitValue = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
    const result = await listResourceChanges(
      projects[0].id,
      after,
      Number.isFinite(limitValue) ? limitValue : 10,
    );
    res.json(result);
  } catch (error) {
    logger.error('Error fetching resource changes:', error);
    res.status(500).json({ error: 'Failed to fetch resource changes' });
  }
});

export default router;
