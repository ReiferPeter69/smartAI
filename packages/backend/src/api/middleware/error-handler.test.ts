import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, AppError } from './error-handler';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      path: '/api/test',
      method: 'GET',
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('handles errors with default 500 status code', () => {
    const error: AppError = new Error('Something went wrong');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Something went wrong',
    });
  });

  it('handles errors with custom status code', () => {
    const error: AppError = new Error('Not found');
    error.statusCode = 404;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Not found',
    });
  });

  it('uses default message when error message is empty', () => {
    const error: AppError = new Error('');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });

  it('logs error details to console', () => {
    const error: AppError = new Error('Test error');
    error.statusCode = 400;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', {
      statusCode: 400,
      message: 'Test error',
      stack: error.stack,
      path: '/api/test',
      method: 'GET',
    });
  });

  it('includes stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const error: AppError = new Error('Dev error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Dev error',
      stack: error.stack,
    });
  });

  it('excludes stack trace in production mode', () => {
    process.env.NODE_ENV = 'production';
    const error: AppError = new Error('Prod error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Prod error',
    });
  });

  it('handles operational errors', () => {
    const error: AppError = new Error('Operational error');
    error.statusCode = 422;
    error.isOperational = true;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Operational error',
    });
  });
});

describe('notFoundHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      path: '/api/nonexistent',
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('returns 404 with resource not found message', () => {
    notFoundHandler(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Resource not found',
      path: '/api/nonexistent',
    });
  });

  it('includes the request path in the response', () => {
    mockReq.path = '/api/users/999';

    notFoundHandler(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Resource not found',
      path: '/api/users/999',
    });
  });
});
