import db from '../db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'user' | 'admin';
  credits: number;
  plan: 'free' | 'hobby' | 'clipper' | 'pro';
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: number;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  credits: number;
  plan: string;
  created_at: string;
}

const CREDITS_BY_PLAN = { free: 100, hobby: 500, clipper: 1500, pro: 3000 } as const;

export function toSafeUser(u: User): SafeUser {
  const { password_hash, ...safe } = u;
  return safe;
}

export function findByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function findById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(email: string, password: string, displayName?: string): SafeUser {
  const hash = bcrypt.hashSync(password, 10);
  const name = displayName || email.split('@')[0];
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
  ).run(email, hash, name);
  return toSafeUser(findById(info.lastInsertRowid as number)!);
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export function deductCredits(userId: number, amount: number): boolean {
  const user = findById(userId);
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.credits < amount) return false;
  db.prepare('UPDATE users SET credits = credits - ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, userId);
  return true;
}

export function addCredits(userId: number, amount: number): void {
  db.prepare('UPDATE users SET credits = credits + ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, userId);
}

export function setPlan(userId: number, plan: 'free' | 'hobby' | 'clipper' | 'pro'): void {
  const credits = CREDITS_BY_PLAN[plan];
  db.prepare('UPDATE users SET plan = ?, credits = ?, updated_at = datetime(\'now\') WHERE id = ?').run(plan, credits, userId);
}

export function adminGrantPremium(userId: number): void {
  db.prepare('UPDATE users SET role = \'admin\', plan = \'pro\', credits = 999999, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
}

export function listUsers(limit = 50, offset = 0): SafeUser[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset) as User[];
  return rows.map(toSafeUser);
}

export function logUsage(userId: number, tool: string, credits: number): void {
  db.prepare('INSERT INTO usage_log (user_id, tool, credits_used) VALUES (?, ?, ?)').run(userId, tool, credits);
}

export function getUsageStats(userId: number): { tool: string; count: number; credits: number }[] {
  return db.prepare(
    'SELECT tool, COUNT(*) as count, SUM(credits_used) as credits FROM usage_log WHERE user_id = ? GROUP BY tool ORDER BY count DESC'
  ).all(userId) as { tool: string; count: number; credits: number }[];
}
