import { Router, Request, Response, NextFunction } from 'express';
import { requireUserContext } from '../middleware/userContext';
import { requireTrustedMutationOrigin } from '../middleware/originGuard';
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../services/personalAccessTokenService';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireUserContext);
router.use(requireTrustedMutationOrigin);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const personalAccessTokens = await listPersonalAccessTokens(req.userContext!.personId);
    res.json({ personalAccessTokens });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createPersonalAccessToken(req.userContext!.personId, {
      name: req.body?.name,
      scopes: req.body?.scopes,
      expiresAt: req.body?.expiresAt,
    });

    logger.info(
      JSON.stringify({
        event: 'personal_access_token.created',
        personId: req.userContext!.personId,
        personalAccessTokenId: result.personalAccessToken.id,
        tokenPrefix: result.personalAccessToken.tokenPrefix,
        scopes: result.personalAccessToken.scopes,
        expiresAt: result.personalAccessToken.expiresAt,
      })
    );

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
      return;
    }
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await revokePersonalAccessToken(req.userContext!.personId, req.params.id);
    logger.info(
      JSON.stringify({
        event: 'personal_access_token.revoke_requested',
        personId: req.userContext!.personId,
        personalAccessTokenId: req.params.id,
      })
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
