import { Router } from 'express';

const router = Router();

// Credit costs for display purposes only.
// All processing happens client-side in the browser.
// Credits are only deducted via explicit premium feature usage (voiceover, AI images, bg removal).
const costs: Record<string, number> = {
  'auto-clip': 0, 'split-screen': 0, 'reddit-story': 0, 'fake-text': 0,
  'voiceover': 1, 'ai-images': 2, 'voice-changer': 0, 'face-swap': 0,
  'speech-enhancer': 0, 'video-cutter': 0, 'video-crop': 0, 'subtitle-remover': 0,
  'remove-bg': 2, 'video-compressor': 0, 'mp3-converter': 0, 'audio-balancer': 0,
  'editor-export': 0
};

// Get credit costs for all tools
router.get('/costs', (_req, res) => {
  res.json({ costs });
});

export default router;
