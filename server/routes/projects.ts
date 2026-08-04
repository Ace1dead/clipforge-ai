import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createProject, findById, findByUser, updateProject, deleteProject } from '../models/project.js';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const projects = findByUser(req.user!.id);
  res.json({ projects });
});

router.get('/:id', requireAuth, (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const project = findById(id);
  if (!project || project.user_id !== req.user!.id) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project });
});

router.post('/', requireAuth, (req: AuthRequest, res) => {
  const { name, data } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name required' });
    return;
  }
  const project = createProject(req.user!.id, name, data || {});
  res.json({ project });
});

router.put('/:id', requireAuth, (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const project = findById(id);
  if (!project || project.user_id !== req.user!.id) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const updated = updateProject(id, req.body.data || {});
  res.json({ project: updated });
});

router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const project = findById(id);
  if (!project || project.user_id !== req.user!.id) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  deleteProject(id);
  res.json({ ok: true });
});

export default router;
