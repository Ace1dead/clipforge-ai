import { Router } from 'express';
import { createUser, findByEmail, verifyPassword, toSafeUser, findById } from '../models/user.js';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, requireAuth, type AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  if (findByEmail(email)) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const user = createUser(email, password, displayName);
  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)').run(sessionId, user.id, refreshToken, expiresAt);
  res.json({ user, accessToken, refreshToken, sessionId });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const user = findByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const safeUser = toSafeUser(user);
  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)').run(sessionId, user.id, refreshToken, expiresAt);
  res.json({ user: safeUser, accessToken, refreshToken, sessionId });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const session = db.prepare('SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > datetime(\'now\')').get(refreshToken) as any;
    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const user = findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const newPayload = { userId: user.id, role: user.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    db.prepare('UPDATE sessions SET refresh_token = ? WHERE id = ?').run(newRefreshToken, session.id);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', requireAuth, (req: AuthRequest, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice(7));
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(payload.userId);
    } catch { /* ignore */ }
  }
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Admin key login - grants instant premium
router.post('/admin-login', (req, res) => {
  try {
    const { email, adminKey } = req.body;
    console.log(`[admin-login] email=${email}, key=${adminKey ? 'provided' : 'missing'}, envKey=${process.env.ADMIN_KEY ? 'set' : 'NOT SET'}`);
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      console.log(`[admin-login] Key mismatch: received="${adminKey}", expected="${process.env.ADMIN_KEY}"`);
      res.status(403).json({ error: 'Invalid admin key' });
      return;
    }
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }
    let user = findByEmail(email);
    if (!user) {
      const newUser = createUser(email, 'admin-managed-account', email.split('@')[0]);
      user = { ...newUser, password_hash: '' } as any;
    }
    // Grant admin + pro
    const userId = user!.id;
    db.prepare('UPDATE users SET role = \'admin\', plan = \'pro\', credits = 999999, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
    const freshUser = findById(userId)!;
    const safeUser = toSafeUser(freshUser);
    const payload = { userId: freshUser.id, role: 'admin' as const };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)').run(sessionId, freshUser.id, refreshToken, expiresAt);
    res.json({ user: safeUser, accessToken, refreshToken, sessionId });
  } catch (err: any) {
    console.error('[admin-login] Error:', err?.message || err);
    res.status(500).json({ error: 'Admin login failed: ' + (err?.message || 'unknown error') });
  }
});

export default router;
