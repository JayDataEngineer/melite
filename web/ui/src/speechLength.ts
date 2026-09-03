/**
 * Speech length estimation client — G5 frontend hook.
 *
 * Calls POST /v1/tools/speech-length to estimate spoken duration of
 * quoted dialogue in a prompt, plus the recommended number of frames
 * for the current fps + latent stride. Used by the prompt textarea
 * hint to show "≈3.2s · 97 frames at 24fps" beside the prompt.
 *
 * Debounced + cancellable — fires only after the user stops typing
 * for 250ms. Earlier in-flight requests are discarded so a slow
 * response can't overwrite a newer one.
 */
import { useEffect, useState } from "react"
import { apiFetch } from "@melite/catalog"

export interface SpeechLengthResult {
  words: number
  seconds: number
  frames: number
  phrases: string[]
  wpm: number
}

const ZERO: SpeechLengthResult = {
  words: 0, seconds: 0, frames: 0, phrases: [], wpm: 150,
}

/**
 * Estimate speech length + recommended frame count for a prompt.
 *
 * @param prompt     Full prompt text (dialogue is extracted from quoted spans)
 * @param fps        Target video FPS (default 24)
 * @param wpm        Speaking rate, words per minute (default 150)
 * @param latentStride  Frame stride per latent step (default 8 — LTX family)
 * @param debounceMs Debounce window (default 250ms)
 */
export function useSpeechLength(
  prompt: string,
  fps = 24,
  wpm = 150,
  latentStride = 8,
  debounceMs = 250,
): { result: SpeechLengthResult | null; loading: boolean; error: string | null } {
  const [result, setResult] = useState<SpeechLengthResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = (prompt ?? "").trim()
    if (!trimmed) {
      setResult(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch("/v1/tools/speech-length", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            fps,
            wpm,
            latent_stride: latentStride,
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const body = await res.text()
          setError(`speech-length ${res.status}: ${body.slice(0, 120)}`)
          setResult(null)
          return
        }
        const data = (await res.json()) as Partial<SpeechLengthResult> & { recommended_frames?: number }
        // The backend returns `recommended_frames` not `frames` — normalize.
        setResult({
          words: Number(data.words ?? 0),
          seconds: Number(data.seconds ?? 0),
          frames: Number(data.recommended_frames ?? data.frames ?? 0),
          phrases: Array.isArray(data.phrases) ? data.phrases : [],
          wpm: Number(data.wpm ?? wpm),
        })
        setError(null)
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [prompt, fps, wpm, latentStride, debounceMs])

  return { result, loading, error }
}

/** Synchronous zero-cost helper for the no-dialogue case. */
export const SPEECH_LENGTH_ZERO = ZERO
