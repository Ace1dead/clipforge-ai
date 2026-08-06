import { describe, it, expect } from 'vitest'
import {
  generatePremiereXML,
  generateDaVinciXML,
  generateFCPXML,
  type TimelineClip,
  type TimelineTrack,
} from './xmlExport'

function makeClip(id: string, start: number, end: number): TimelineClip {
  return {
    id,
    name: `Clip ${id}`,
    start,
    end,
    duration: end - start,
    sourceStart: 0,
    sourceEnd: end - start,
    filePath: `/videos/${id}.mp4`,
    trackIndex: 0,
  }
}

describe('generatePremiereXML', () => {
  it('generates valid Premiere Pro XML', () => {
    const clips = [makeClip('c1', 0, 5), makeClip('c2', 5, 10)]
    const tracks: TimelineTrack[] = [{ index: 0, name: 'V1', type: 'video', clips }]
    const xml = generatePremiereXML(tracks, { width: 1080, height: 1920, fps: 30 })
    expect(xml).toContain('<?xml')
    expect(xml).toContain('xmeml')
    expect(xml).toContain('<sequence>')
    expect(xml).toContain('<clipitem>')
  })
})

describe('generateDaVinciXML', () => {
  it('generates valid DaVinci Resolve XML', () => {
    const clips = [makeClip('c1', 0, 5)]
    const tracks: TimelineTrack[] = [{ index: 0, name: 'V1', type: 'video', clips }]
    const xml = generateDaVinciXML(tracks, { width: 1080, height: 1920, fps: 30 })
    expect(xml).toContain('<?xml')
    expect(xml).toContain('<timeline>')
  })
})

describe('generateFCPXML', () => {
  it('generates valid Final Cut Pro XML', () => {
    const clips = [makeClip('c1', 0, 5), makeClip('c2', 5, 10)]
    const tracks: TimelineTrack[] = [{ index: 0, name: 'V1', type: 'video', clips }]
    const xml = generateFCPXML(tracks, { width: 1080, height: 1920, fps: 30 })
    expect(xml).toContain('<?xml')
    expect(xml).toContain('fcpxml')
    expect(xml).toContain('<asset-clip')
  })
})
