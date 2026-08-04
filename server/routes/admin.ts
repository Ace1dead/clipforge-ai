import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { listUsers, setPlan, addCredits, getUsageStats, findById } from '../models/user.js';
import { adminKeyAuth } from '../middleware/admin.js';

const router = Router();

// Admin routes - require admin role OR admin key
router.get('/users', requireAuth, requireAdmin, (_req, res) => {
  const users = listUsers();
  res.json({ users });
});

router.get('/stats', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const stats = getUsageStats(req.user!.id);
  res.json({ stats });
});

router.post('/grant-plan', requireAuth, requireAdmin, (req, res) => {
  const { userId, plan } = req.body;
  if (!userId || !plan) {
    res.status(400).json({ error: 'userId and plan required' });
    return;
  }
  setPlan(userId, plan);
  const user = findById(userId);
  res.json({ user });
});

router.post('/add-credits', requireAuth, requireAdmin, (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) {
    res.status(400).json({ error: 'userId and amount required' });
    return;
  }
  addCredits(userId, amount);
  const user = findById(userId);
  res.json({ user });
});

// Admin key routes - no user account needed
router.get('/key/users', adminKeyAuth, (_req, res) => {
  const users = listUsers();
  res.json({ users });
});

router.post('/key/grant-plan', adminKeyAuth, (req, res) => {
  const { userId, plan } = req.body;
  if (!userId || !plan) {
    res.status(400).json({ error: 'userId and plan required' });
    return;
  }
  setPlan(userId, plan);
  const user = findById(userId);
  res.json({ user });
});

export default router;
