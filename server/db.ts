import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './server/data/clipforge.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db: any;

function save() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

const db = {
  prepare(sql: string) {
    return {
      run(...params: any[]) {
        _db.run(sql, params);
        save();
        const lastId = _db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? 0;
        return { changes: _db.getRowsModified(), lastInsertRowid: Number(lastId) };
      },
      get(...params: any[]): any {
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) return stmt.getAsObject();
        return undefined;
      },
      all(...params: any[]): any[] {
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows: any[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
    };
  },
  exec(sql: string) {
    _db.run(sql);
    save();
  },
  pragma(p: string) {
    try { _db.run(`PRAGMA ${p}`); } catch { /* ignore */ }
  },
};

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'User',
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      credits INTEGER NOT NULL DEFAULT 100,
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'hobby', 'clipper', 'pro')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tool TEXT NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  _db.run('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_log(user_id)');

  save();
}

process.on('SIGINT', () => { save(); process.exit(0); });
process.on('SIGTERM', () => { save(); process.exit(0); });

export default db;
