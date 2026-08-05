import { Router } from 'express';
import { URL } from 'url';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import https from 'https';
import http from 'http';

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

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; data: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c: Buffer) => { data += c.toString(); });
      res.on('end', () => resolve({ status: res.statusCode || 0, data, headers: res.headers as Record<string, string> }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpGetBinary(url: string, headers: Record<string, string> = {}): Promise<{ status: number; stream: import('stream').Readable; contentType: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGetBinary(res.headers.location, headers).then(resolve).catch(reject);
      }
      resolve({
        status: res.statusCode || 0,
        stream: res,
        contentType: res.headers['content-type'] || 'video/mp4',
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function downloadYouTube(videoId: string): Promise<{ stream: import('stream').Readable; contentType: string }> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': 'CONSENT=YES+cb.20240101-00-p0.en+FX+999',
  };

  // Fetch watch page
  const page = await httpGet(`https://www.youtube.com/watch?v=${videoId}`, headers);

  // Extract ytInitialPlayerResponse
  const match = page.data.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
  if (!match) throw new Error('Could not extract player response');

  const playerResponse = JSON.parse(match[1]);
  const streamingData = playerResponse.streamingData;
  if (!streamingData) throw new Error('No streaming data found');

  // Try formats first (muxed audio+video)
  const formats = streamingData.formats || [];
  const adaptive = streamingData.adaptiveFormats || [];

  // Pick best muxed format (has both audio and video)
  let chosen = formats.find((f: any) => f.qualityLabel && f.url);
  if (!chosen) chosen = formats.find((f: any) => f.url);
  // Fallback to adaptive video + audio
  if (!chosen) {
    const videoStream = adaptive.find((f: any) => f.mimeType?.startsWith('video/') && f.url && f.qualityLabel?.includes('720'));
    if (videoStream) chosen = videoStream;
  }
  if (!chosen) {
    chosen = adaptive.find((f: any) => f.mimeType?.startsWith('video/') && f.url);
  }

  if (!chosen) {
    // All formats use signatureCipher — need decryption
    // Try the android client approach
    throw new Error('All video formats require signature decryption. Try uploading the file directly.');
  }

  if (chosen.signatureCipher) {
    throw new Error('Video requires signature decryption. Try uploading the file directly.');
  }

  if (!chosen.url) {
    throw new Error('No direct video URL available. Try uploading the file directly.');
  }

  // Fetch the actual video
  const video = await httpGetBinary(chosen.url, {
    'User-Agent': headers['User-Agent'],
    'Referer': 'https://www.youtube.com/',
  });

  return { stream: video.stream, contentType: video.contentType || 'video/mp4' };
}

// YouTube video download
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

  const videoId = extractVideoId(url);
  if (!videoId) {
    res.status(400).json({ error: 'Could not extract video ID' });
    return;
  }

  try {
    const { stream, contentType } = await downloadYouTube(videoId);
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('YouTube stream error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
      else res.end();
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('YouTube download error:', msg);
    res.status(500).json({ error: msg });
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
