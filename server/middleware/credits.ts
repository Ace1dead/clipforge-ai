import type { Response } from 'express';
import type { AuthRequest } from './auth.js';
import { deductCredits, logUsage } from '../models/user.js';

const TOOL_COSTS: Record<string, number> = {
  'auto-clip': 3,
  'split-screen': 2,
  'reddit-story': 2,
  'fake-text': 2,
  'voiceover': 1,
  'ai-images': 2,
  'voice-changer': 1,
  'face-swap': 2,
  'speech-enhancer': 1,
  'video-cutter': 1,
  'video-crop': 1,
  'subtitle-remover': 1,
  'remove-bg': 2,
  'video-compressor': 1,
  'mp3-converter': 1,
  'audio-balancer': 1,
  'editor-export': 3,
};

export function getToolCost(tool: string): number {
  return TOOL_COSTS[tool] ?? 1;
}

export function requireCredits(tool: string) {
  return (req: AuthRequest, res: Response, next: () => void): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const cost = getToolCost(tool);
    if (req.user.role === 'admin') {
      logUsage(req.user.id, tool, cost);
      next();
      return;
    }
    if (!deductCredits(req.user.id, cost)) {
      res.status(402).json({ error: 'Insufficient credits', credits_needed: cost, credits_remaining: req.user.credits });
      return;
    }
    logUsage(req.user.id, tool, cost);
    next();
  };
}
