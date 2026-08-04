import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { findById, type SafeUser } from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'clipforge-dev-secret-CHANGE-IN-PRODUCTION';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'clipforge-dev-refresh-secret-CHANGE-IN-PRODUCTION';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('WARNING: JWT secrets not configured in .env — using development defaults (insecure for production)');
}

export interface JwtPayload {
  userId: number;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: SafeUser & { role: 'user' | 'admin' };
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const { password_hash, ...safe } = user;
    req.user = safe;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { next(); return; }
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = findById(payload.userId);
    if (user) {
      const { password_hash, ...safe } = user;
      req.user = safe;
    }
  } catch { /* ignore */ }
  next();
}
