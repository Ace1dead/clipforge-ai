/**
 * XML Export — Generate Premiere Pro, DaVinci Resolve, and Final Cut Pro timelines.
 * Opus Clip charges $29/mo for this. We do it free.
 */

export interface TimelineClip {
  id: string
  name: string
  start: number
  end: number
  duration: number
  sourceStart: number
  sourceEnd: number
  filePath: string
  trackIndex: number
  effects?: TimelineEffect[]
  transitions?: TimelineTransition[]
}

export interface TimelineEffect {
  name: string
  params: Record<string, number | string>
}

export interface TimelineTransition {
  type: string
  duration: number
}

export interface TimelineTrack {
  index: number
  name: string
  type: 'video' | 'audio'
  clips: TimelineClip[]
}

export interface TimelineSettings {
  width: number
  height: number
  fps: number
}

// ═══════════════════════════════════════════════════════════════
// PREMIERE PRO XML (FCP XML compatible)
// ═══════════════════════════════════════════════════════════════

export function generatePremiereXML(
  tracks: TimelineTrack[],
  settings: TimelineSettings,
): string {
  const fps = settings.fps
  const timebase = fps

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>ClipForge Export</name>
    <duration>${Math.max(...tracks.flatMap(t => t.clips.map(c => c.end))) * timebase}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>false</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>${settings.width}</width>
            <height>${settings.height}</height>
          </samplecharacteristics>
        </format>
        <track>`

  for (const track of tracks.filter(t => t.type === 'video')) {
    for (const clip of track.clips) {
      const startFrame = Math.round(clip.start * timebase)
      const endFrame = Math.round(clip.end * timebase)
      const inFrame = Math.round(clip.sourceStart * timebase)
      const outFrame = Math.round(clip.sourceEnd * timebase)

      xml += `
          <clipitem>
            <name>${escapeXml(clip.name)}</name>
            <duration>${Math.round(clip.duration * timebase)}</duration>
            <rate>
              <timebase>${timebase}</timebase>
            </rate>
            <in>${inFrame}</in>
            <out>${outFrame}</out>
            <start>${startFrame}</start>
            <end>${endFrame}</end>
            <file>
              <name>${escapeXml(clip.filePath.split('/').pop() ?? clip.name)}</name>
              <pathurl>file://${escapeXml(clip.filePath)}</pathurl>
              <rate>
                <timebase>${timebase}</timebase>
              </rate>
              <duration>${Math.round(clip.duration * timebase)}</duration>
              <media>
                <video>
                  <samplecharacteristics>
                    <width>${settings.width}</width>
                    <height>${settings.height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
          </clipitem>`
    }
  }

  xml += `
        </track>
      </video>
      <audio>
        <track>`

  for (const track of tracks.filter(t => t.type === 'audio')) {
    for (const clip of track.clips) {
      xml += `
          <clipitem>
            <name>${escapeXml(clip.name)}</name>
            <duration>${Math.round(clip.duration * timebase)}</duration>
            <rate>
              <timebase>${timebase}</timebase>
            </rate>
            <in>${Math.round(clip.sourceStart * timebase)}</in>
            <out>${Math.round(clip.sourceEnd * timebase)}</out>
            <start>${Math.round(clip.start * timebase)}</start>
            <end>${Math.round(clip.end * timebase)}</end>
            <file>
              <name>${escapeXml(clip.filePath.split('/').pop() ?? clip.name)}</name>
              <pathurl>file://${escapeXml(clip.filePath)}</pathurl>
            </file>
          </clipitem>`
    }
  }

  xml += `
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`

  return xml
}

// ═══════════════════════════════════════════════════════════════
// DAVINCI RESOLVE XML
// ═══════════════════════════════════════════════════════════════

export function generateDaVinciXML(
  tracks: TimelineTrack[],
  settings: TimelineSettings,
): string {
  const fps = settings.fps

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<timeline>
  <name>ClipForge Export</name>
  <rate>
    <timelineFPS>${fps}</timelineFPS>
  </rate>
  <resolution>
    <width>${settings.width}</width>
    <height>${settings.height}</height>
  </resolution>
  <tracks>`

  for (const track of tracks) {
    xml += `
    <track index="${track.index}" type="${track.type}">
      <name>${escapeXml(track.name)}</name>
      <clips>`

    for (const clip of track.clips) {
      xml += `
        <clip>
          <name>${escapeXml(clip.name)}</name>
          <start>${Math.round(clip.start * fps)}</start>
          <end>${Math.round(clip.end * fps)}</end>
          <in>${Math.round(clip.sourceStart * fps)}</in>
          <out>${Math.round(clip.sourceEnd * fps)}</out>
          <media>
            <file>
              <name>${escapeXml(clip.filePath.split('/').pop() ?? clip.name)}</name>
              <path>${escapeXml(clip.filePath)}</path>
            </file>
          </media>
        </clip>`
    }

    xml += `
      </clips>
    </track>`
  }

  xml += `
  </tracks>
</timeline>`

  return xml
}

// ═══════════════════════════════════════════════════════════════
// FINAL CUT PRO XML
// ═══════════════════════════════════════════════════════════════

export function generateFCPXML(
  tracks: TimelineTrack[],
  settings: TimelineSettings,
): string {
  const fps = settings.fps

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>`

  // Asset declarations
  const allClips = tracks.flatMap(t => t.clips)
  const uniqueFiles = [...new Set(allClips.map(c => c.filePath))]

  for (let i = 0; i < uniqueFiles.length; i++) {
    const filePath = uniqueFiles[i]
    const clip = allClips.find(c => c.filePath === filePath)
    if (!clip) continue
    xml += `
    <asset id="asset${i}" name="${escapeXml(clip.filePath.split('/').pop() ?? '')}" src="file://${escapeXml(filePath)}" start="0s" duration="${clip.duration}s">
      <media-rep kind="original-media" src="file://${escapeXml(filePath)}"/>
    </asset>`
  }

  xml += `
  </resources>
  <library>
    <event name="ClipForge Export">
      <project name="ClipForge Timeline">`

  for (const track of tracks.filter(t => t.type === 'video')) {
    xml += `
        <spine>`

    for (const clip of track.clips) {
      const fileIdx = uniqueFiles.indexOf(clip.filePath)
      xml += `
          <asset-clip ref="asset${fileIdx}" name="${escapeXml(clip.name)}" offset="${clip.start}s" duration="${clip.duration}s" start="${clip.sourceStart}s"/>`
    }

    xml += `
        </spine>`
  }

  xml += `
      </project>
    </event>
  </library>
</fcpxml>`

  return xml
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
