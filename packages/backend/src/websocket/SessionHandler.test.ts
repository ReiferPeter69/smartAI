import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IncomingMessage } from 'http';
import { SessionHandler } from './SessionHandler';
import { UserService } from '../services/UserService';

vi.mock('../services/UserService');

describe('SessionHandler', () => {
  let sessionHandler: SessionHandler;

  beforeEach(() => {
    sessionHandler = new SessionHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionHandler.stop();
  });

  describe('authenticateRequest', () => {
    it('should authenticate valid request with token in query', () => {
      const mockRequest = createMockRequest('/ws/session/session-123?token=valid-token');
      
      vi.mocked(UserService.verifyToken).mockReturnValue({ userId: 'user-123' });

      const result = (sessionHandler as any).authenticateRequest(mockRequest);

      expect(result).toEqual({
        sessionId: 'session-123',
        userId: 'user-123',
      });
      expect(UserService.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should authenticate valid request with token in Authorization header', () => {
      const mockRequest = createMockRequest('/ws/session/session-456');
      mockRequest.headers.authorization = 'Bearer header-token';

      vi.mocked(UserService.verifyToken).mockReturnValue({ userId: 'user-456' });

      const result = (sessionHandler as any).authenticateRequest(mockRequest);

      expect(result).toEqual({
        sessionId: 'session-456',
        userId: 'user-456',
      });
      expect(UserService.verifyToken).toHaveBeenCalledWith('header-token');
    });

    it('should reject request with invalid path', () => {
      const mockRequest = createMockRequest('/invalid/path');

      expect(() => {
        (sessionHandler as any).authenticateRequest(mockRequest);
      }).toThrow('Invalid WebSocket path');
    });

    it('should reject request without token', () => {
      const mockRequest = createMockRequest('/ws/session/session-789');

      expect(() => {
        (sessionHandler as any).authenticateRequest(mockRequest);
      }).toThrow('Authentication token required');
    });

    it('should reject request with invalid token', () => {
      const mockRequest = createMockRequest('/ws/session/session-999?token=invalid');

      vi.mocked(UserService.verifyToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        (sessionHandler as any).authenticateRequest(mockRequest);
      }).toThrow('Invalid token');
    });
  });

  describe('isValidClientEvent', () => {
    it('should validate CLARIFICATION_RESPONSE event', () => {
      const event = {
        type: 'CLARIFICATION_RESPONSE',
        answer: 'test answer',
      };

      const result = (sessionHandler as any).isValidClientEvent(event);
      expect(result).toBe(true);
    });

    it('should validate APPROVE_SPEC event', () => {
      const event = {
        type: 'APPROVE_SPEC',
      };

      const result = (sessionHandler as any).isValidClientEvent(event);
      expect(result).toBe(true);
    });

    it('should validate CANCEL_GENERATION event', () => {
      const event = {
        type: 'CANCEL_GENERATION',
      };

      const result = (sessionHandler as any).isValidClientEvent(event);
      expect(result).toBe(true);
    });

    it('should reject invalid event type', () => {
      const event = {
        type: 'INVALID_TYPE',
      };

      const result = (sessionHandler as any).isValidClientEvent(event);
      expect(result).toBe(false);
    });

    it('should reject non-object events', () => {
      expect((sessionHandler as any).isValidClientEvent(null)).toBe(false);
      expect((sessionHandler as any).isValidClientEvent('string')).toBe(false);
      expect((sessionHandler as any).isValidClientEvent(123)).toBe(false);
      expect((sessionHandler as any).isValidClientEvent(undefined)).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return connection stats', () => {
      const stats = sessionHandler.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('connectionsBySession');
    });
  });

  describe('lifecycle', () => {
    it('should start successfully', () => {
      expect(() => sessionHandler.start()).not.toThrow();
    });

    it('should stop successfully', () => {
      sessionHandler.start();
      expect(() => sessionHandler.stop()).not.toThrow();
    });
  });
});

function createMockRequest(url: string): IncomingMessage {
  return {
    url,
    headers: {},
  } as IncomingMessage;
}
