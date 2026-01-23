import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);

    const { userId } = UserService.verifyToken(token);
    req.userId = userId;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
