import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loading = false;

export async function loadFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loading) {
    while (loading) await new Promise(r => setTimeout(r, 100));
    if (!ffmpeg) throw new Error('FFmpeg failed to load');
    return ffmpeg;
  }
  loading = true;
  try {
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.round(progress * 100));
    });
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
  } finally {
    loading = false;
  }
}

export async function webmToMp4(
  webmBlob: Blob,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(onProgress);
  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
  await ffmpeg.writeFile('input.webm', inputData);
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'output.mp4'
  ]);
  const data = await ffmpeg.readFile('output.mp4');
  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');
  const arr = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  return new Blob([buf], { type: 'video/mp4' });
}

export async function transcodeToFormat(
  inputBlob: Blob,
  inputName: string,
  outputName: string,
  args: string[],
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(onProgress);
  const inputData = new Uint8Array(await inputBlob.arrayBuffer());
  await ffmpeg.writeFile(inputName, inputData);
  await ffmpeg.exec(['-i', inputName, ...args, outputName]);
  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  const arr = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  return new Blob([buf], { type: outputName.endsWith('.mp4') ? 'video/mp4' : 'video/webm' });
}

export function isFFmpegSupported(): boolean {
  return typeof WebAssembly !== 'undefined';
}
