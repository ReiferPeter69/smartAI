import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import type { RegisterRequest, LoginRequest, AuthResponse } from '@obsidian/core';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static verifyToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
