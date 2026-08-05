import { Router } from 'express';
import { URL } from 'url';
import { spawn } from 'child_process';
import { existsSync, chmodSync } from 'fs';
import { join } from 'path';

const router = Router();

const BLOCKED_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.169.254',
  'metadata.google.internal',
]);

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (BLOCKED_HOSTS.has(url.hostname)) return false;
    if (url.hostname.endsWith('.internal') || url.hostname.endsWith('.local')) return false;
    const ip = url.hostname.replace(/^\[|^::ffff:/, '').replace(/\]$/, '');
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.)/.test(ip)) return false;
    return true;
  } catch {
    return false;
  }
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|youtube\.com\/embed|youtube\.com\/shorts)/i.test(url);
}

function getYtDlpPath(): string | null {
  const candidates = [
    join(process.cwd(), 'yt-dlp'),
    join(process.cwd(), 'node_modules', '.bin', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

// YouTube video download via yt-dlp
router.get('/youtube', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  if (!isYouTubeUrl(url)) {
    res.status(400).json({ error: 'Not a YouTube URL' });
    return;
  }

  const ytDlpPath = getYtDlpPath();
  if (!ytDlpPath) {
    res.status(500).json({ error: 'yt-dlp not installed on server' });
    return;
  }

  try {
    res.setHeader('Content-Type', 'video/mp4');

    // Stream video directly — no info fetch needed
    const proc = spawn(ytDlpPath, [
      '-f', 'best[height<=720]/best',
      '--no-check-certificates',
      '--no-warnings',
      '--newline',
      '-o', '-',  // output to stdout
      url,
    ], {
      timeout: 180000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    proc.stdout.pipe(res);

    let errorOutput = '';
    proc.stderr.on('data', (d: Buffer) => { errorOutput += d.toString(); });

    proc.on('error', (err) => {
      console.error('yt-dlp spawn error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
      else res.end();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp error:', errorOutput.slice(0, 300));
        if (!res.headersSent) {
          res.status(500).json({ error: `Download failed: ${errorOutput.slice(0, 200)}` });
        }
      }
      res.end();
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('YouTube download error:', msg);
    if (!res.headersSent) {
      res.status(500).json({ error: `YouTube download failed: ${msg.slice(0, 200)}` });
    }
  }
});

// Proxy media downloads (avoids CORS for direct media URLs)
router.get('/media', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  if (!isSafeUrl(url)) {
    res.status(403).json({ error: 'URL not allowed (blocked host or private IP)' });
    return;
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `Fetch failed: ${r.status}` });
      return;
    }
    const contentType = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment');
    const buffer = await r.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Proxy Reddit posts (avoids CORS)
router.get('/reddit/:id', async (req, res) => {
  try {
    const url = `https://www.reddit.com/comments/${req.params.id}.json`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ClipForge-AI/1.0' }
    });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Reddit fetch failed' });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Proxy Reddit subreddit search (avoids CORS)
router.get('/reddit/r/:subreddit/:sort', async (req, res) => {
  const { subreddit, sort = 'top' } = req.params;
  const { t = 'week', limit = '25' } = req.query;
  try {
    const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?t=${t}&limit=${limit}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ClipForge-AI/1.0' }
    });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Reddit fetch failed' });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Proxy Pexels API (hides API key)
router.get('/pexels/search', async (req, res) => {
  const { query, per_page = '12', page = '1', orientation = 'portrait' } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Pexels API key not configured' });
    return;
  }
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query as string)}&per_page=${per_page}&page=${page}&orientation=${orientation}`;
    const r = await fetch(url, { headers: { Authorization: apiKey } });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Pexels API error' });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Proxy error' });
  }
});

router.get('/pexels/photos', async (req, res) => {
  const { query, per_page = '12', page = '1', orientation = 'portrait' } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Pexels API key not configured' });
    return;
  }
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&per_page=${per_page}&page=${page}&orientation=${orientation}`;
    const r = await fetch(url, { headers: { Authorization: apiKey } });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Pexels API error' });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Proxy error' });
  }
});

export default router;
