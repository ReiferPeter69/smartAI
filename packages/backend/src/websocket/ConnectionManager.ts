import type { WebSocketConnection, AuthenticatedWebSocket, ServerEvent } from './types';
import { logger } from '../utils/logger';

export class ConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private sessionConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private heartbeatIntervalMs: number = 30000) {}

  addConnection(ws: AuthenticatedWebSocket, sessionId: string, userId: string): void {
    const connectionId = this.generateConnectionId();
    
    const connection: WebSocketConnection = {
      ws,
      sessionId,
      userId,
      connectedAt: Date.now(),
    };

    this.connections.set(connectionId, connection);

    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId)!.add(connectionId);

    logger.info('WebSocket connection added', {
      connectionId,
      sessionId,
      userId,
      totalConnections: this.connections.size,
    });

    ws.on('close', () => {
      this.removeConnection(connectionId);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return;
    }

    const { sessionId, userId } = connection;

    this.connections.delete(connectionId);

    const sessionConns = this.sessionConnections.get(sessionId);
    if (sessionConns) {
      sessionConns.delete(connectionId);
      if (sessionConns.size === 0) {
        this.sessionConnections.delete(sessionId);
      }
    }

    logger.info('WebSocket connection removed', {
      connectionId,
      sessionId,
      userId,
      totalConnections: this.connections.size,
    });
  }

  getConnectionsBySession(sessionId: string): WebSocketConnection[] {
    const connectionIds = this.sessionConnections.get(sessionId);
    
    if (!connectionIds) {
      return [];
    }

    const connections: WebSocketConnection[] = [];
    
    for (const id of connectionIds) {
      const conn = this.connections.get(id);
      if (conn) {
        connections.push(conn);
      }
    }

    return connections;
  }

  sendToSession(sessionId: string, event: ServerEvent): void {
    const connections = this.getConnectionsBySession(sessionId);
    
    if (connections.length === 0) {
      logger.warn('No connections found for session', { sessionId });
      return;
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    for (const connection of connections) {
      if (connection.ws.readyState === 1) {
        try {
          connection.ws.send(message);
          sentCount++;
        } catch (error) {
          logger.error('Failed to send message to WebSocket', error instanceof Error ? error : undefined, {
            sessionId,
            userId: connection.userId,
          });
        }
      }
    }

    logger.debug('Event sent to session', {
      sessionId,
      eventType: event.type,
      sentCount,
      totalConnections: connections.length,
    });
  }

  broadcast(event: ServerEvent): void {
    const message = JSON.stringify(event);
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === 1) {
        try {
          connection.ws.send(message);
          sentCount++;
        } catch (error) {
          logger.error('Failed to broadcast message', error instanceof Error ? error : undefined, {
            sessionId: connection.sessionId,
            userId: connection.userId,
          });
        }
      }
    }

    logger.debug('Event broadcast to all connections', {
      eventType: event.type,
      sentCount,
      totalConnections: this.connections.size,
    });
  }

  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      const deadConnections: string[] = [];

      for (const [id, connection] of this.connections.entries()) {
        if (!connection.ws.isAlive) {
          connection.ws.terminate();
          deadConnections.push(id);
        } else {
          connection.ws.isAlive = false;
          connection.ws.ping();
        }
      }

      for (const id of deadConnections) {
        this.removeConnection(id);
      }

      if (deadConnections.length > 0) {
        logger.info('Cleaned up dead connections', {
          count: deadConnections.length,
        });
      }
    }, this.heartbeatIntervalMs);

    logger.info('WebSocket heartbeat started', {
      intervalMs: this.heartbeatIntervalMs,
    });
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('WebSocket heartbeat stopped');
    }
  }

  closeAllConnections(): void {
    for (const connection of this.connections.values()) {
      try {
        connection.ws.close(1000, 'Server shutting down');
      } catch (error) {
        logger.error('Error closing WebSocket connection', error instanceof Error ? error : undefined);
      }
    }

    this.connections.clear();
    this.sessionConnections.clear();
    this.stopHeartbeat();

    logger.info('All WebSocket connections closed');
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      totalSessions: this.sessionConnections.size,
      connectionsBySession: Array.from(this.sessionConnections.entries()).map(
        ([sessionId, connections]) => ({
          sessionId,
          connectionCount: connections.size,
        })
      ),
    };
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
