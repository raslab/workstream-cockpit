import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';

import passport from '../config/passport';
import { sessionConfig } from '../middleware/session';
import { attachUserContext } from '../middleware/userContext';
import { getProjectsByPersonId } from './projectService';
import { selectResourceChangeProjectId, subscribeToResourceChanges } from './resourceChangeService';
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

async function authenticatedProjectId(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<string | null> {
  await runMiddleware(sessionConfig as any, req, res);
  await runMiddleware(passport.initialize() as any, req, res);
  await runMiddleware(passport.session() as any, req, res);
  await runMiddleware(attachUserContext as any, req, res);

  const userContext = (req as any).userContext;
  if (!userContext?.personId) return null;

  const projects = await getProjectsByPersonId(userContext.personId);
  if (projects.length === 0) return null;

  return selectResourceChangeProjectId(projects.map((project) => project.id));
}

export function setupResourceChangeWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as WebSocket & { isAlive?: boolean };
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  server.on('upgrade', async (req, socket, head) => {
    const parsedUrl = new URL(req.url ?? '', 'http://localhost');
    if (parsedUrl.pathname !== '/api/resource-changes/stream') return;

    const res = new ServerResponse(req);
    try {
      const projectId = await authenticatedProjectId(req, res);
      if (!projectId) {
        rejectUpgrade(socket);
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const trackedSocket = ws as WebSocket & { isAlive?: boolean };
        trackedSocket.isAlive = true;
        trackedSocket.on('pong', () => {
          trackedSocket.isAlive = true;
        });
        const unsubscribe = subscribeToResourceChanges(projectId, (change) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: 'resource-change', change }));
        });
        ws.on('close', unsubscribe);
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
