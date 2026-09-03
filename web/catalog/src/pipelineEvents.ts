/**
 * pipelineEvents.ts — the gateway events door client (2026-09-02, the
 * streaming restoration).
 *
 * GET ws(s)://<gateway>/v1/pipelines/events/<run_id> streams the run's
 * event bus live: stage flips, per-KSampler-step progress, activity
 * strings, the terminal run status. Frames are one-line JSON text
 * frames (the gateway speaks RFC 6455, stdlib asyncio — no framework).
 *
 * CONTRACT vs the 700ms poll (`pollPipelineRun`, pipelineProtocol.ts):
 * the poll stays the TERMINAL AUTHORITY — a dropped socket must never
 * lose a run. The stream only carries intra-tick frames; every frame
 * is an idempotent patch onto the same store the poll writes. Silent
 * degrade: this module NEVER throws — no WebSocket (old runtime),
 * refused upgrade, network blip → reconnect with backoff; the run
 * still completes via the poll.
 *
 * Distinct from comfyEvents.ts (the DIRECT ComfyUI ws client,
 * parity scaffolding for engine-local attachments): this is the
 * gateway-owned transport, same-origin with the REST API, no
 * engine knowledge crosses this wire.
 */

/** A per-step progress frame (ComfyUI progress, KSampler steps). */
export type PipelineProgress = { value: number; max: number; node?: string }

/** One frame off the events bus. `stage` frames are idempotent patches;
 * `run` frames with a terminal status end the stream. */
export type PipelineEventFrame =
  | { type: "run"; status: string }
  | {
      type: "stage"
      stage: string
      index?: number
      status?: string
      progress?: PipelineProgress
      activity?: string
      error?: string
    }

export type PipelineEventsHandle = {
  /** Idempotent; safe to call twice or after the terminal frame. */
  close: () => void
  /** True once a terminal `run` frame arrived (stream is over). */
  done: () => boolean
}

const TERMINAL = new Set(["completed", "failed", "stopped", "unknown"])
const BACKOFF_BASE_MS = 500
const BACKOFF_CAP_MS = 5_000

/**
 * Open the events stream for one run. Returns immediately; frames land
 * in `onEvent`. Auto-reconnects with capped backoff until a terminal
 * `run` frame, an explicit close, or `signal` aborts.
 */
export function streamPipelineEvents(
  runId: string,
  onEvent: (frame: PipelineEventFrame) => void,
  opts: { signal?: AbortSignal } = {},
): PipelineEventsHandle {
  let ws: WebSocket | null = null
  let terminal = false
  let closed = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const cleanup = () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (ws) {
      // Detach handlers so a server-initiated close after our close()
      // cannot trigger a reconnect.
      ws.onmessage = null
      ws.onclose = null
      ws.onerror = null
      try { ws.close() } catch { /* already closing */ }
      ws = null
    }
  }

  const finish = () => {
    terminal = true
    cleanup()
  }

  const connect = () => {
    if (closed || terminal) return
    if (typeof WebSocket === "undefined") return // no ws runtime → poll only
    const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws"
    const host = typeof location !== "undefined" ? location.host : ""
    try {
      ws = new WebSocket(`${proto}://${host}/v1/pipelines/events/${encodeURIComponent(runId)}`)
    } catch {
      return // constructor refused → poll only
    }
    ws.onmessage = (ev) => {
      if (closed || terminal) return
      attempt = 0 // live frames reset the backoff
      let frame: PipelineEventFrame | null = null
      try { frame = JSON.parse(String(ev.data)) as PipelineEventFrame } catch { return }
      if (!frame || typeof frame !== "object" || typeof (frame as { type?: unknown }).type !== "string") return
      onEvent(frame)
      if (frame.type === "run" && TERMINAL.has(String(frame.status))) finish()
    }
    ws.onclose = () => {
      if (closed || terminal) return
      // reconnect with capped backoff — the poll carries the run regardless
      const wait = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt++)
      timer = setTimeout(connect, wait)
    }
    ws.onerror = () => { /* onclose follows; reconnect logic lives there */ }
  }

  connect()
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => {
      closed = true
      cleanup()
    }, { once: true })
  }

  return {
    close: () => {
      closed = true
      cleanup()
    },
    done: () => terminal,
  }
}
