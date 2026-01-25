import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth';
import { UserService } from '../../services/UserService';

vi.mock('../../services/UserService');

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
  });

  it('returns 401 when no authorization header is present', async () => {
    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not start with Bearer', async () => {
    mockReq.headers = { authorization: 'Basic sometoken' };

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    mockReq.headers = { authorization: 'Bearer invalidtoken' };
    vi.mocked(UserService.verifyToken).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('sets req.userId and req.user when token is valid', async () => {
    const validToken = 'validtoken123';
    mockReq.headers = { authorization: `Bearer ${validToken}` };
    
    vi.mocked(UserService.verifyToken).mockReturnValue({ userId: 'user-123' });

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(UserService.verifyToken).toHaveBeenCalledWith(validToken);
    expect(mockReq.userId).toBe('user-123');
    expect(mockReq.user).toEqual({ userId: 'user-123' });
    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('extracts token correctly from Bearer authorization header', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    mockReq.headers = { authorization: `Bearer ${token}` };
    
    vi.mocked(UserService.verifyToken).mockReturnValue({ userId: 'user-456' });

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(UserService.verifyToken).toHaveBeenCalledWith(token);
    expect(mockNext).toHaveBeenCalled();
  });

  it('handles authorization header with extra spaces', async () => {
    mockReq.headers = { authorization: 'Bearer  token-with-spaces' };
    
    vi.mocked(UserService.verifyToken).mockReturnValue({ userId: 'user-789' });

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(UserService.verifyToken).toHaveBeenCalledWith(' token-with-spaces');
    expect(mockNext).toHaveBeenCalled();
  });
});
