import type { TimedWord } from './tts'

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

export function getProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]') } catch { return [] }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function upsertProject(p: Project): Project[] {
  const projects = getProjects()
  const idx = projects.findIndex((x) => x.id === p.id)
  if (idx >= 0) projects[idx] = p
  else projects.unshift(p)
  saveProjects(projects)
  return projects
}

export function deleteProject(id: string): Project[] {
  const projects = getProjects().filter((x) => x.id !== id)
  saveProjects(projects)
  return projects
}