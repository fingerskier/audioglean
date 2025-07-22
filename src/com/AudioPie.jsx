import React, { useEffect, useState } from 'react'
import PieSlice from './PieSlice'
import EssentiaWASM from 'essentia.js/dist/essentia-wasm.es.js'
import Essentia from 'essentia.js/dist/essentia.js-core.es.js'

const NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

export default function AudioPie() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const essentia = new Essentia(EssentiaWASM)
    let source
    let processor

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      source = audioCtx.createMediaStreamSource(stream)
      processor = audioCtx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(audioCtx.destination)

      processor.onaudioprocess = e => {
        const frame = e.inputBuffer.getChannelData(0)
        const windowed = essentia.Windowing(frame).frame
        const spectrum = essentia.Spectrum(windowed).spectrum
        const peaks = essentia.SpectralPeaks(spectrum, 0.0001, audioCtx.sampleRate / 2, 60, 40, 'frequency', audioCtx.sampleRate)
        const hpcp = essentia.HPCP(peaks.frequencies, peaks.magnitudes, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, audioCtx.sampleRate).hpcp
        let maxIndex = 0
        for (let i = 1; i < hpcp.length; i++) {
          if (hpcp[i] > hpcp[maxIndex]) maxIndex = i
        }
        setActive(maxIndex)
      }
    })

    return () => {
      processor && processor.disconnect()
      source && source.disconnect()
      audioCtx && audioCtx.close()
    }
  }, [])

  const radius = 40
  const cx = 50
  const cy = 50
  const sliceAngle = 360 / NOTES.length

  return (
    <svg width="500" height="500" viewBox="0 0 100 100" id="audio-pie">
      {NOTES.map((n, i) => (
        <PieSlice
          key={n}
          startAngle={i * sliceAngle}
          endAngle={(i + 1) * sliceAngle}
          radius={radius}
          cx={cx}
          cy={cy}
          label={n}
          fill={active === i ? '#ff8080' : '#ccc'}
        />
      ))}
    </svg>
  )
}
