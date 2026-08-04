import { useState } from 'react'
import { FileMusic } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Field, Select } from '../components/ui'
import { decodeAudio, bufferToBlob } from '../lib/audio'
import { fmtTime } from '../lib/format'

export function Mp3Converter() {
  const [kbps, setKbps] = useState('160')

  return (
    <MediaToolShell
      title="MP3 Converter"
      subtitle="Convert any video or audio file to MP3 in seconds — perfect for podcast clips and music."
      icon={<FileMusic size={20} />}
      dropType="any"
      processLabel="Convert to MP3"
      config={
        <Field label="Quality">
          <Select value={kbps} onChange={(e) => setKbps(e.target.value)}>
            <option value="128">128 kbps — Standard</option>
            <option value="160">160 kbps — Good</option>
            <option value="192">192 kbps — High</option>
            <option value="256">256 kbps — Very high</option>
            <option value="320">320 kbps — Best</option>
          </Select>
        </Field>
      }
      process={async (p, ctx) => {
        const buffer = await decodeAudio(p.url)
        const blob = await bufferToBlob(buffer, 'mp3', Number(kbps))
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}.mp3`, kind: 'audio', meta: `${fmtTime(buffer.duration)} · ${kbps} kbps` }
      }}
    />
  )
}