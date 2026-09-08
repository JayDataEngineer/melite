import { useEffect, useRef } from "react"

interface AudioWaveformProps {
  audioUrl: string
  height?: number
  color?: string
}

export function AudioWaveform({ audioUrl, height = 60, color = "#3b82f6" }: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    const loadWaveSurfer = async () => {
      try {
        const WaveSurfer = (await import("wavesurfer.js")).default
        const ws = WaveSurfer.create({
          container: containerRef.current as HTMLElement,
          height,
          waveColor: color,
          progressColor: color,
          cursorColor: "#ffffff",
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          normalize: true,
          autoplay: false,
          interact: true,
        })

        ws.load(audioUrl).catch((err: unknown) => {
          // Unreachable / undecodable audio (server URL down, e2e env with
          // no backend) must degrade gracefully — an uncaught rejection
          // here leaks out of the component and trips the vitest
          // unhandled-error gate. The tile just stays an empty waveform.
          console.warn("AudioWaveform: failed to load", audioUrl, err)
        })
        wavesurferRef.current = ws

        return () => {
          ws.destroy()
        }
      } catch (error) {
        console.error("Failed to load WaveSurfer:", error)
      }
    }

    const cleanup = loadWaveSurfer()

    return () => {
      cleanup?.then((fn) => fn?.())
    }
  }, [audioUrl, height, color])

  return (
    <div ref={containerRef} className="w-full rounded-md bg-background border" />
  )
}
