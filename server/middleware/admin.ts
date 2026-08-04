import type { AuthRequest } from './auth.js';

export function adminKeyAuth(req: AuthRequest, res: any, next: () => void): void {
  const key = req.headers['x-admin-key'] as string | undefined;
  if (!key) {
    res.status(401).json({ error: 'Admin key required' });
    return;
  }
  if (key !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Invalid admin key' });
    return;
  }
  // Admin key grants full access - no user account needed for admin operations
  next();
}
