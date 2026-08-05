import type { TimedWord } from './tts'
import { getApiToken } from './api'

const PROJECTS_KEY = 'cf_projects'

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  videoUrl?: string
  duration: number
  resolution: { w: number; h: number }
  captionStyle: string
  words: TimedWord[]
  voiceoverUrl?: string
  voiceoverScript?: string
  voiceName?: string
  musicUrl?: string
  musicGain: number
  videoGain: number
  layout: 'single' | 'split'
}

// ─── localStorage (always used as cache) ──────────────────────

function getLocal(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]') } catch { return [] }
}

function saveLocal(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

// ─── Server API helpers ───────────────────────────────────────

async function serverGetProjects(): Promise<Project[]> {
  if (!getApiToken()) return []
  try {
    const res = await fetch('/api/projects', {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.projects ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ...JSON.parse(p.data ?? '{}'),
    }))
  } catch { return [] }
}

async function serverSaveProject(p: Project): Promise<void> {
  if (!getApiToken()) return
  try {
    const { id, createdAt, updatedAt, ...data } = p
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiToken()}` },
      body: JSON.stringify({ name: p.name, data }),
    })
  } catch { /* fall back to localStorage */ }
}

async function serverUpdateProject(p: Project): Promise<void> {
  if (!getApiToken()) return
  try {
    const { id, createdAt, updatedAt, ...data } = p
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiToken()}` },
      body: JSON.stringify({ data }),
    })
  } catch { /* fall back to localStorage */ }
}

async function serverDeleteProject(id: string): Promise<void> {
  if (!getApiToken()) return
  try {
    await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
  } catch { /* fall back to localStorage */ }
}

// ─── Synced public API ────────────────────────────────────────

let synced = false

export async function syncFromServer(): Promise<Project[]> {
  if (!getApiToken()) return getLocal()
  const serverProjects = await serverGetProjects()
  if (serverProjects.length > 0) {
    // Merge: server takes precedence, keep local-only projects
    const local = getLocal()
    const serverIds = new Set(serverProjects.map(p => p.id))
    const localOnly = local.filter(p => !serverIds.has(p.id))
    const merged = [...serverProjects, ...localOnly]
    saveLocal(merged)
    synced = true
    return merged
  }
  return getLocal()
}

export function getProjects(): Project[] {
  return getLocal()
}

export function saveProjects(projects: Project[]): void {
  saveLocal(projects)
}

export function upsertProject(p: Project): Project[] {
  const projects = getLocal()
  const idx = projects.findIndex((x) => x.id === p.id)
  const isNew = idx < 0
  if (idx >= 0) projects[idx] = p
  else projects.unshift(p)
  saveLocal(projects)
  // Fire-and-forget server sync
  if (isNew) serverSaveProject(p)
  else serverUpdateProject(p)
  return projects
}

export function deleteProject(id: string): Project[] {
  const projects = getLocal().filter((x) => x.id !== id)
  saveLocal(projects)
  serverDeleteProject(id)
  return projects
}
