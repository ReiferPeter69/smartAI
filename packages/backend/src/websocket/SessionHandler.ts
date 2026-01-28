import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { ConnectionManager } from './ConnectionManager';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';
import type {
  AuthenticatedWebSocket,
  ClientEvent,
  ServerEvent,
} from './types';

export class SessionHandler {
  private wss: WebSocketServer;
  private connectionManager: ConnectionManager;

  constructor(private port?: number) {
    this.connectionManager = new ConnectionManager();
    this.wss = new WebSocketServer({ noServer: true });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage, sessionId: string, userId: string) => {
      const authenticatedWs = ws as AuthenticatedWebSocket;
      authenticatedWs.userId = userId;
      authenticatedWs.sessionId = sessionId;
      authenticatedWs.isAlive = true;

      this.connectionManager.addConnection(authenticatedWs, sessionId, userId);

      logger.info('WebSocket connection established', {
        sessionId,
        userId,
        url: request.url,
      });

      authenticatedWs.on('message', (data: Buffer) => {
        this.handleClientMessage(authenticatedWs, data, sessionId, userId);
      });

      authenticatedWs.on('error', (error: Error) => {
        logger.error('WebSocket error', {
          sessionId,
          userId,
          error: error.message,
        });
      });

      authenticatedWs.on('close', (code: number, reason: Buffer) => {
        logger.info('WebSocket connection closed', {
          sessionId,
          userId,
          code,
          reason: reason.toString(),
        });
      });

      this.sendEvent(authenticatedWs, {
        type: 'PHASE_CHANGED',
        phase: 'discovery',
        timestamp: Date.now(),
      });
    });

    logger.info('WebSocket server setup complete');
  }

  handleUpgrade(
    request: IncomingMessage,
    socket: any,
    head: Buffer
  ): void {
    try {
      const { sessionId, userId } = this.authenticateRequest(request);

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request, sessionId, userId);
      });
    } catch (error) {
      logger.error('WebSocket upgrade failed', {
        error: error instanceof Error ? error.message : String(error),
        url: request.url,
      });

      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  private authenticateRequest(request: IncomingMessage): { sessionId: string; userId: string } {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathParts = parsedUrl.pathname?.split('/').filter(Boolean) || [];

    if (pathParts[0] !== 'ws' || pathParts[1] !== 'session' || !pathParts[2]) {
      throw new Error('Invalid WebSocket path');
    }

    const sessionId = pathParts[2];

    let token: string | undefined;

    if (parsedUrl.query.token && typeof parsedUrl.query.token === 'string') {
      token = parsedUrl.query.token;
    } else if (request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.substring(7);
    }

    if (!token) {
      throw new Error('Authentication token required');
    }

    const { userId } = UserService.verifyToken(token);

    return { sessionId, userId };
  }

  private handleClientMessage(
    ws: AuthenticatedWebSocket,
    data: Buffer,
    sessionId: string,
    userId: string
  ): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (!this.isValidClientEvent(message)) {
        this.sendError(ws, 'Invalid event format');
        return;
      }

      logger.info('Client event received', {
        sessionId,
        userId,
        eventType: message.type,
      });

      this.handleClientEvent(message, sessionId, userId);
    } catch (error) {
      logger.error('Failed to process client message', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.sendError(ws, 'Failed to process message');
    }
  }

  private isValidClientEvent(data: unknown): data is ClientEvent {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const event = data as { type?: unknown };

    return (
      event.type === 'CLARIFICATION_RESPONSE' ||
      event.type === 'APPROVE_SPEC' ||
      event.type === 'CANCEL_GENERATION'
    );
  }

  private handleClientEvent(event: ClientEvent, sessionId: string, userId: string): void {
    switch (event.type) {
      case 'CLARIFICATION_RESPONSE':
        logger.info('Clarification response received', {
          sessionId,
          userId,
          answerLength: event.answer.length,
        });
        break;

      case 'APPROVE_SPEC':
        logger.info('Spec approved', {
          sessionId,
          userId,
        });
        break;

      case 'CANCEL_GENERATION':
        logger.info('Generation cancelled', {
          sessionId,
          userId,
        });
        break;
    }
  }

  sendToSession(sessionId: string, event: ServerEvent): void {
    this.connectionManager.sendToSession(sessionId, event);
  }

  broadcast(event: ServerEvent): void {
    this.connectionManager.broadcast(event);
  }

  private sendEvent(ws: WebSocket, event: ServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendEvent(ws, {
      type: 'ERROR',
      message,
    });
  }

  start(): void {
    this.connectionManager.startHeartbeat();
    logger.info('SessionHandler started');
  }

  stop(): void {
    this.connectionManager.closeAllConnections();
    this.wss.close();
    logger.info('SessionHandler stopped');
  }

  getStats() {
    return this.connectionManager.getStats();
  }

  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }
}
