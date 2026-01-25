import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateRequest, validateQuery } from './validation';

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      body: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
  });

  it('calls next when validation passes', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    mockReq.body = { name: 'John', age: 30 };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns 400 when validation fails', () => {
    const schema = z.object({
      email: z.string().email(),
    });

    mockReq.body = { email: 'invalid-email' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'email',
          message: expect.any(String),
        }),
      ]),
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns detailed validation errors', () => {
    const schema = z.object({
      username: z.string().min(3),
      password: z.string().min(8),
    });

    mockReq.body = { username: 'ab', password: '1234' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'username',
        }),
        expect.objectContaining({
          path: 'password',
        }),
      ]),
    });
  });

  it('handles missing required fields', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });

    mockReq.body = { name: 'John' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'email',
        }),
      ]),
    });
  });

  it('handles non-ZodError exceptions', () => {
    const mockSchema = {
      parse: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      }),
    };
    
    const brokenMiddleware = validate(mockSchema as unknown as z.ZodSchema);
    brokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid request data' });
  });
});

describe('validateRequest middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
  });

  it('validates body, query, and params', () => {
    const schema = z.object({
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.string() }),
      params: z.object({ id: z.string() }),
    });

    mockReq.body = { name: 'Test' };
    mockReq.query = { page: '1' };
    mockReq.params = { id: '123' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('updates req.body with validated data', () => {
    const schema = z.object({
      body: z.object({
        age: z.string().transform((val) => parseInt(val, 10)),
      }),
    });

    mockReq.body = { age: '25' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual({ age: 25 });
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 400 when validation fails', () => {
    const schema = z.object({
      body: z.object({ email: z.string().email() }),
    });

    mockReq.body = { email: 'invalid' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.any(Array),
    });
  });

  it('handles non-ZodError exceptions', () => {
    const mockSchema = {
      parse: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      }),
    };

    const middleware = validateRequest(mockSchema as unknown as z.ZodSchema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid request data' });
  });
});

describe('validateQuery middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      query: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
  });

  it('validates query parameters successfully', () => {
    const schema = z.object({
      page: z.string(),
      limit: z.string(),
    });

    mockReq.query = { page: '1', limit: '10' };

    const middleware = validateQuery(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns 400 when query validation fails', () => {
    const schema = z.object({
      sortBy: z.enum(['name', 'date']),
    });

    mockReq.query = { sortBy: 'invalid' };

    const middleware = validateQuery(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'sortBy',
        }),
      ]),
    });
  });

  it('handles optional query parameters', () => {
    const schema = z.object({
      search: z.string().optional(),
      filter: z.string().optional(),
    });

    mockReq.query = {};

    const middleware = validateQuery(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('handles non-ZodError exceptions', () => {
    const mockSchema = {
      parse: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      }),
    };

    const middleware = validateQuery(mockSchema as unknown as z.ZodSchema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid query parameters' });
  });
});
