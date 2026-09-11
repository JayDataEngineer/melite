/**
 * FlowEvents.ts — the gateway events door client (2026-09-02, the
 * streaming restoration).
 *
 * GET ws(s)://<gateway>/v1/flows/events/<run_id> streams the run's
 * event bus live: stage flips, per-KSampler-step progress, activity
 * strings, the terminal run status. Frames are one-line JSON text
 * frames (the gateway speaks RFC 6455, stdlib asyncio — no framework).
 *
 * CONTRACT vs the 700ms poll (`pollFlowRun`, FlowProtocol.ts):
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
export type FlowProgress = { value: number; max: number; node?: string }

/** One frame off the events bus. `stage` frames are idempotent patches;
 * `run` frames with a terminal status end the stream. */
export type FlowEventFrame =
  | { type: "run"; status: string }
  | {
      type: "stage"
      stage: string
      index?: number
      status?: string
      progress?: FlowProgress
      activity?: string
      error?: string
    }

export type FlowEventsHandle = {
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
export function streamFlowEvents(
  runId: string,
  onEvent: (frame: FlowEventFrame) => void,
  opts: { signal?: AbortSignal } = {},
): FlowEventsHandle {
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
    /* v8 ignore next -- defensive: close()/finish() always clear the pending reconnect timer, so connect() can never run after close or a terminal frame (2026-09-12) */
    if (closed || terminal) return
    if (typeof WebSocket === "undefined") return // no ws runtime → poll only
    const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws"
    const host = typeof location !== "undefined" ? location.host : ""
    // QUERY FORM (run_id as a query param at the BARE events path):
    // the DSH web-ui proxy (which serves /editor inside the DSH origin)
    // registers upgrade tunnels at EXACT paths only — a per-run path
    // segment can never match one. The gateway accepts BOTH forms; the
    // query form is the one that survives every proxy (live bug
    // 2026-09-04: the embed's per-run WS 502'd on every connect and the
    // card showed no live comfyui feedback).
    try {
      ws = new WebSocket(`${proto}://${host}/v1/flows/events?run_id=${encodeURIComponent(runId)}`)
    } catch {
      return // constructor refused → poll only
    }
    ws.onmessage = (ev) => {
      if (closed || terminal) return
      attempt = 0 // live frames reset the backoff
      let frame: FlowEventFrame | null = null
      try { frame = JSON.parse(String(ev.data)) as FlowEventFrame } catch { return }
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
