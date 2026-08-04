export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels)
  const sampleRate = buffer.sampleRate
  const samples = buffer.length * numChannels
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = samples * bytesPerSample
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let s = channels[c][i]
      s = Math.max(-1, Math.min(1, s))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

export function floatTo16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i]
    s = Math.max(-1, Math.min(1, s))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

export function copyBufferTo(buffers: AudioBuffer[]): AudioBuffer | null {
  if (buffers.length === 0) return null
  const total = buffers.reduce((n, b) => n + b.length, 0)
  const ctx = new OfflineAudioContext(2, total, buffers[0].sampleRate)
  const out = ctx.createBuffer(2, total, buffers[0].sampleRate)
  let offset = 0
  for (const b of buffers) {
    for (let c = 0; c < Math.min(2, b.numberOfChannels); c++) {
      out.getChannelData(c).set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), offset)
    }
    offset += b.length
  }
  return out
}