import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from './ConnectionManager';
import type { AuthenticatedWebSocket } from './types';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    connectionManager = new ConnectionManager(1000);
  });

  it('should add a connection', () => {
    const mockWs = createMockWebSocket();
    
    connectionManager.addConnection(mockWs, 'session-1', 'user-1');

    const stats = connectionManager.getStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.totalSessions).toBe(1);
  });

  it('should track multiple connections for same session', () => {
    const mockWs1 = createMockWebSocket();
    const mockWs2 = createMockWebSocket();

    connectionManager.addConnection(mockWs1, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs2, 'session-1', 'user-1');

    const stats = connectionManager.getStats();
    expect(stats.totalConnections).toBe(2);
    expect(stats.totalSessions).toBe(1);

    const connections = connectionManager.getConnectionsBySession('session-1');
    expect(connections).toHaveLength(2);
  });

  it('should send event to all connections in a session', () => {
    const mockWs1 = createMockWebSocket();
    const mockWs2 = createMockWebSocket();

    connectionManager.addConnection(mockWs1, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs2, 'session-1', 'user-1');

    const event = {
      type: 'PHASE_CHANGED' as const,
      phase: 'planning' as const,
      timestamp: Date.now(),
    };

    connectionManager.sendToSession('session-1', event);

    expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(event));
    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it('should broadcast event to all connections', () => {
    const mockWs1 = createMockWebSocket();
    const mockWs2 = createMockWebSocket();
    const mockWs3 = createMockWebSocket();

    connectionManager.addConnection(mockWs1, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs2, 'session-2', 'user-2');
    connectionManager.addConnection(mockWs3, 'session-3', 'user-3');

    const event = {
      type: 'ERROR' as const,
      message: 'Test error',
    };

    connectionManager.broadcast(event);

    expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(event));
    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(event));
    expect(mockWs3.send).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it('should handle connection close', () => {
    const mockWs = createMockWebSocket();
    let closeHandler: (() => void) | undefined;

    mockWs.on = vi.fn((event: string, handler: () => void) => {
      if (event === 'close') {
        closeHandler = handler;
      }
      return mockWs;
    });

    connectionManager.addConnection(mockWs, 'session-1', 'user-1');
    
    expect(connectionManager.getStats().totalConnections).toBe(1);

    closeHandler?.();

    expect(connectionManager.getStats().totalConnections).toBe(0);
  });

  it('should not send to closed connections', () => {
    const mockWs = createMockWebSocket();
    mockWs.readyState = 3;

    connectionManager.addConnection(mockWs, 'session-1', 'user-1');

    const event = {
      type: 'PHASE_CHANGED' as const,
      phase: 'execution' as const,
      timestamp: Date.now(),
    };

    connectionManager.sendToSession('session-1', event);

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('should get connections by session', () => {
    const mockWs1 = createMockWebSocket();
    const mockWs2 = createMockWebSocket();
    const mockWs3 = createMockWebSocket();

    connectionManager.addConnection(mockWs1, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs2, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs3, 'session-2', 'user-2');

    const session1Connections = connectionManager.getConnectionsBySession('session-1');
    const session2Connections = connectionManager.getConnectionsBySession('session-2');

    expect(session1Connections).toHaveLength(2);
    expect(session2Connections).toHaveLength(1);
  });

  it('should return empty array for non-existent session', () => {
    const connections = connectionManager.getConnectionsBySession('non-existent');
    expect(connections).toEqual([]);
  });

  it('should close all connections', () => {
    const mockWs1 = createMockWebSocket();
    const mockWs2 = createMockWebSocket();

    connectionManager.addConnection(mockWs1, 'session-1', 'user-1');
    connectionManager.addConnection(mockWs2, 'session-2', 'user-2');

    connectionManager.closeAllConnections();

    expect(mockWs1.close).toHaveBeenCalledWith(1000, 'Server shutting down');
    expect(mockWs2.close).toHaveBeenCalledWith(1000, 'Server shutting down');
    expect(connectionManager.getStats().totalConnections).toBe(0);
  });
});

function createMockWebSocket(): AuthenticatedWebSocket {
  return {
    userId: '',
    sessionId: '',
    isAlive: true,
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    ping: vi.fn(),
    on: vi.fn().mockReturnThis(),
  } as unknown as AuthenticatedWebSocket;
}
