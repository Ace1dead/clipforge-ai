import { Router } from 'express';
import { URL } from 'url';

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

// Primary: cobalt.tools API (used by SnapTube-like downloaders)
async function downloadViaCobalt(url: string): Promise<{ stream: ReadableStream; contentType: string; filename: string }> {
  const cobaltRes = await fetch('https://api.cobalt.tools/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      url,
      downloadMode: 'auto',
      filenameStyle: 'basic',
      videoQuality: '1080',
      youtubeVideoCodec: 'h264',
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!cobaltRes.ok) {
    const err = await cobaltRes.json().catch(() => ({}));
    throw new Error(`Cobalt error: ${cobaltRes.status} ${JSON.stringify(err)}`);
  }

  const data = await cobaltRes.json();

  if (data.status === 'redirect') {
    // Direct URL redirect
    const videoRes = await fetch(data.url, {
      signal: AbortSignal.timeout(120000),
    });
    if (!videoRes.ok) throw new Error(`Download failed: ${videoRes.status}`);
    return {
      stream: videoRes.body!,
      contentType: videoRes.headers.get('content-type') || 'video/mp4',
      filename: data.filename || 'video.mp4',
    };
  }

  if (data.status === 'tunnel') {
    return {
      stream: data.url instanceof ReadableStream ? data.url : (await fetch(data.url, { signal: AbortSignal.timeout(120000) })).body!,
      contentType: 'video/mp4',
      filename: data.filename || 'video.mp4',
    };
  }

  throw new Error(`Cobalt unexpected response: ${data.status}`);
}

// Fallback: @distube/ytdl-core with Android client
async function downloadViaYtdl(youtubeUrl: string): Promise<{ stream: import('stream').Readable; contentType: string; filename: string }> {
  const ytdl = await import('@distube/ytdl-core');
  const info = await ytdl.default.getInfo(youtubeUrl);
  const format = ytdl.default.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
  const stream = ytdl.default.downloadFromInfo(info, { format });
  return {
    stream: stream as any,
    contentType: format.mimeType || 'video/mp4',
    filename: `${info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
  };
}

// YouTube video download endpoint
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

  // Try cobalt first (most reliable)
  try {
    const { stream, contentType, filename } = await downloadViaCobalt(url);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      pump().catch(() => res.end());
    } else {
      const nodeStream = stream as any;
      nodeStream.pipe(res);
      nodeStream.on('error', () => { if (!res.headersSent) res.status(500).json({ error: 'Stream error' }); });
    }
    return;
  } catch (cobaltErr) {
    console.warn('Cobalt failed, trying ytdl-core:', cobaltErr instanceof Error ? cobaltErr.message : cobaltErr);
  }

  // Fallback: ytdl-core
  try {
    const { stream, contentType, filename } = await downloadViaYtdl(url);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
    stream.on('error', (err: Error) => {
      console.error('ytdl stream error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
    });
  } catch (ytdlErr) {
    console.error('ytdl-core failed:', ytdlErr instanceof Error ? ytdlErr.message : ytdlErr);
    res.status(500).json({
      error: 'YouTube download failed. Try downloading the video manually and uploading the file.',
    });
  }
});

// YouTube video info endpoint
router.get('/youtube/info', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  if (!isYouTubeUrl(url)) {
    res.status(400).json({ error: 'Not a YouTube URL' });
    return;
  }

  try {
    const ytdl = await import('@distube/ytdl-core');
    const info = await ytdl.default.getInfo(url);
    res.json({
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails.pop()?.url,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: `Failed to get info: ${msg.slice(0, 200)}` });
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
