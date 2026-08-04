import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  user_id: number;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export function createProject(userId: number, name: string, data: Record<string, unknown> = {}): Project {
  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, user_id, name, data) VALUES (?, ?, ?, ?)').run(id, userId, name, JSON.stringify(data));
  return findById(id)!;
}

export function findById(id: string): Project | undefined {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function findByUser(userId: number, limit = 50): Project[] {
  return db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').all(userId, limit) as Project[];
}

export function updateProject(id: string, data: Record<string, unknown>): Project | undefined {
  db.prepare('UPDATE projects SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(data), id);
  return findById(id);
}

export function deleteProject(id: string): boolean {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return info.changes > 0;
}
