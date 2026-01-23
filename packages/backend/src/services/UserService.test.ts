import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserService } from './UserService';
import bcrypt from 'bcrypt';

vi.mock('@prisma/client');

describe('UserService', () => {
  let userService: UserService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    userService = new UserService(mockPrisma as PrismaClient);
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await userService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(
        userService.register({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should authenticate user and return token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        userService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correctpassword', 10),
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        userService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = userService['generateToken']('user-1');
      const result = UserService.verifyToken(token);

      expect(result.userId).toBe('user-1');
    });

    it('should throw error for invalid token', () => {
      expect(() => UserService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });
});
