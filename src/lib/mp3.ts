import { floatTo16 } from './wav'

interface LameModule { Mp3Encoder: new (ch: number, sr: number, kbps: number) => { encodeBuffer(l: Int16Array, r?: Int16Array): Int8Array; flush(): Int8Array } }
let lame: LameModule | null = null

async function getLame(): Promise<LameModule> {
  if (lame) return lame
  const mod = await import('lamejs')
  const m = mod as unknown as { default?: LameModule; Mp3Encoder?: LameModule['Mp3Encoder'] }
  const encoder = m.Mp3Encoder ?? m.default?.Mp3Encoder
  if (!encoder) throw new Error('MP3 encoder unavailable in this browser')
  lame = { Mp3Encoder: encoder }
  return lame
}

export async function encodeMp3(buffer: AudioBuffer, kbps = 160): Promise<Blob> {
  const lame = await getLame()
  const channels = Math.min(2, buffer.numberOfChannels)
  const encoder = new lame.Mp3Encoder(channels, buffer.sampleRate, kbps)
  const left = floatTo16(buffer.getChannelData(0))
  const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : undefined
  const blockSize = 1152
  const chunks: Uint8Array<ArrayBuffer>[] = []
  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize)
    const r = right ? right.subarray(i, i + blockSize) : undefined
    const out = encoder.encodeBuffer(l as Int16Array, r as Int16Array)
    if (out.length > 0) chunks.push(new Uint8Array(out))
  }
  const end = encoder.flush()
  if (end.length > 0) chunks.push(new Uint8Array(end))
  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
}