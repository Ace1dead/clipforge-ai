import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import adminRoutes from './routes/admin.js';
import toolRoutes from './routes/tools.js';
import proxyRoutes from './routes/proxy.js';
import aiRoutes from './routes/ai.js';
import transcribeRoutes from './routes/transcribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security: Restrict CORS to known origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3002'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Always check allowed origins list
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // In production, also allow the Render domain
    if (process.env.NODE_ENV === 'production' && origin.includes('onrender.com')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// COOP/COEP headers for SharedArrayBuffer (required by ffmpeg.wasm multi-thread, browser-whisper)
// Only set on routes that need them, NOT on API routes (breaks fetch + localStorage)
app.get('/{*splat}', (_req, res, next) => {
  // Only set COEP/COOP for HTML pages (frontend routes), not API routes
  if (!_req.path.startsWith('/api')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  }
  next()
})

app.use(express.json({ limit: '10mb' }));

// Simple rate limiting middleware
const rateLimit = new Map<string, { count: number; resetAt: number }>();
function rateLimitMiddleware(maxRequests = 100, windowMs = 60000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimit.get(ip);
    
    if (!entry || now > entry.resetAt) {
      rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Apply rate limiting to sensitive routes
app.use('/api/auth', rateLimitMiddleware(20, 60000)); // 20 auth requests per minute
app.use('/api/proxy', rateLimitMiddleware(30, 60000)); // 30 proxy requests per minute

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tools', toolRoutes);
  app.use('/api/proxy', proxyRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/transcribe', rateLimitMiddleware(10, 60000)); // 10 transcriptions per minute
  app.use('/api/transcribe', transcribeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', features: ['auth', 'projects', 'credits', 'admin'] });
});

// Serve Vite build in production
const possiblePaths = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, '../../dist'),
  '/opt/render/project/src/dist',
];
const distPath = possiblePaths.find(p => fs.existsSync(p + '/index.html')) || possiblePaths[0];
console.log('Serving frontend from:', distPath, 'exists:', fs.existsSync(distPath + '/index.html'));
if (fs.existsSync(distPath + '/index.html')) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.error('Frontend build not found. Checked:', possiblePaths);
  app.get('/', (_req, res) => {
    res.status(500).json({ error: 'Frontend not built', checked: possiblePaths });
  });
}

// Initialize database then start server
initDb().then(() => {
  console.log('Database initialized');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge API running on http://localhost:${PORT}`);
    console.log(`Admin key: ${process.env.ADMIN_KEY ? 'configured' : 'NOT SET'}`);
  });
}).catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
