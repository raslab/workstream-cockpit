import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface ResourceChangeRequestContext {
  originClientId?: string;
}

const storage = new AsyncLocalStorage<ResourceChangeRequestContext>();

export function resourceChangeRequestContext(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('X-Resource-Change-Client-Id')?.trim();
  storage.run({ originClientId: header || undefined }, next);
}

export function getResourceChangeRequestContext(): ResourceChangeRequestContext {
  return storage.getStore() ?? {};
}
