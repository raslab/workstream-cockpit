import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';

import passport from '../config/passport';
import { sessionConfig } from '../middleware/session';
import { attachUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from './projectService';
import { subscribeToResourceChanges } from './resourceChangeService';
import { logger } from '../utils/logger';
import { WebSocket, WebSocketServer } from 'ws';

function runMiddleware(
  middleware: (req: any, res: any, next: (error?: any) => void) => void,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req as any, res as any, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function rejectUpgrade(socket: NodeJS.WritableStream & { destroy: () => void }, status = 401) {
  socket.write(`HTTP/1.1 ${status} Unauthorized\r\n\r\n`);
  socket.destroy();
}

async function authenticatedProjectIds(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<string[] | null> {
  await runMiddleware(sessionConfig as any, req, res);
  await runMiddleware(passport.initialize() as any, req, res);
  await runMiddleware(passport.session() as any, req, res);
  await runMiddleware(attachUserContext as any, req, res);

  const userContext = (req as any).userContext;
  if (!userContext?.personId) return null;

  const projects = await getProjectsByPersonId(userContext.personId);
  if (projects.length === 0) return null;

  const parsedUrl = new URL(req.url ?? '', 'http://localhost');
  const requestedProjectId = parsedUrl.searchParams.get('projectId');
  if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) {
    return [requestedProjectId];
  }
  return projects.map((project) => project.id);
}

export function setupResourceChangeWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const parsedUrl = new URL(req.url ?? '', 'http://localhost');
    if (parsedUrl.pathname !== '/api/resource-changes/stream') return;

    const res = new ServerResponse(req);
    try {
      const projectIds = await authenticatedProjectIds(req, res);
      if (!projectIds) {
        rejectUpgrade(socket);
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const unsubscribers = projectIds.map((projectId) =>
          subscribeToResourceChanges(projectId, (change) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'resource-change', change }));
          }),
        );
        ws.on('close', () => unsubscribers.forEach((unsubscribe) => unsubscribe()));
        ws.on('error', (error) => logger.warn(`Resource change websocket error: ${error.message}`));
        ws.send(JSON.stringify({ type: 'ready' }));
        wss.emit('connection', ws, req);
      });
    } catch (error) {
      logger.error('Resource change websocket upgrade failed:', error);
      rejectUpgrade(socket);
    }
  });

  return wss;
}
