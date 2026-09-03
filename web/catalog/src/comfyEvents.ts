/**
 * ComfyUI graph-event forwarding client.
 *
 * Connects to a ComfyUI websocket (`ws://<host>:<port>/ws?clientId=<id>`) and
 * surfaces graph execution events — `execution_start`, `progress`, `executing`,
 * `executed`, `execution_success`, `execution_error` — as a typed stream. The
 * UniCanvas backend already exposes progress via polled `/progress/<id>`; this
 * client is the parity scaffolding for real-time streaming once the gateway
 * proxies the websocket. It auto-reconnects with backoff and degrades to a
 * no-op when WebSockets are unavailable (SSR/tests).
 *
 * 2026-09-02 status: the ENGINE side of that law landed — the comfyui
 * plugin owns a native ws tap (compose/native.py) that shares the
 * submitting client_id, and the gateway re-publishes through its own
 * events door (consumed via pipelineEvents.ts). This client remains
 * for DIRECT ComfyUI attachments (engine-local UI, no gateway hop).
 */

export type ComfyEventType =
  | 'status'
  | 'execution_start'
  | 'execution_cached'
  | 'progress'
  | 'executing'
  | 'executed'
  | 'execution_error'
  | 'execution_success'
  | 'execution_interrupted'
  | 'raw'

export interface ComfyEvent {
  type: ComfyEventType
  data: Record<string, unknown>
  /** Original JSON message string, for events we don't model. */
  raw?: string
}

export interface ComfyEventClient {
  readonly connected: boolean
  close(): void
}

const RETRY_MS = 3000

/**
 * Open a ComfyUI websocket and forward parsed events to `onEvent`.
 * `onStatus` fires with `true`/`false` on connect/disconnect.
 */
export function connectComfyEvents(
  url: string,
  onEvent: (e: ComfyEvent) => void,
  onStatus?: (connected: boolean) => void,
): ComfyEventClient {
  if (typeof WebSocket === 'undefined') {
    return { connected: false, close() {} }
  }
  let ws: WebSocket | null = null
  let closed = false
  let retry: ReturnType<typeof setTimeout> | null = null
  let connected = false

  const scheduleRetry = () => {
    if (closed) return
    if (retry) clearTimeout(retry)
    retry = setTimeout(open, RETRY_MS)
  }

  function open() {
    if (closed) return
    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.warn('[comfy-events] websocket open failed:', err)
      scheduleRetry()
      return
    }
    ws.onopen = () => {
      connected = true
      onStatus?.(true)
    }
    ws.onclose = () => {
      connected = false
      onStatus?.(false)
      scheduleRetry()
    }
    ws.onerror = () => {
      try { ws?.close() } catch { /* noop */ }
    }
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return
      try {
        const msg = JSON.parse(ev.data) as { type?: string; data?: Record<string, unknown> }
        const type = (msg.type ?? 'raw') as ComfyEventType
        onEvent({ type, data: msg.data ?? {}, raw: ev.data })
      } catch {
        onEvent({ type: 'raw', data: {}, raw: ev.data })
      }
    }
  }

  open()

  return {
    get connected() { return connected },
    close() {
      closed = true
      if (retry) clearTimeout(retry)
      try { ws?.close() } catch { /* noop */ }
    },
  }
}
