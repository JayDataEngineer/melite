// flowEvents.test.ts — the gateway events door client (2026-09-02).
// The stream is a LIVE PATCH channel; the poll stays terminal authority.
// Pins: frame dispatch, terminal closes the stream (no reconnect),
// non-terminal close reconnects with backoff, and the silent degrade
// (no WebSocket runtime → poll-only, never throws).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { streamFlowEvents, type FlowEventFrame } from "@melite/catalog"

/** Minimal WS stub: records frames to send, lets the test drive events. */
class FakeWS {
  static instances: FakeWS[] = []
  static NEXT: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sentClose = 0
  url: string
  constructor(url: string) {
    this.url = url
    FakeWS.instances.push(this)
  }
  close() { this.sentClose++ }
  // test drives a server frame in
  server(frame: FlowEventFrame) {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }
  serverClose() { this.onclose?.() }
}

describe("streamFlowEvents", () => {
  const realWS = globalThis.WebSocket
  beforeEach(() => { FakeWS.instances = []; FakeWS.NEXT = null })
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.WebSocket = realWS
  })

  it("opens the events door URL for the run", () => {
    // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
    streamFlowEvents("run-abc", () => {})
    expect(FakeWS.instances).toHaveLength(1)
    // QUERY FORM (2026-09-04): the DSH web-ui proxy registers upgrade
    // tunnels at EXACT paths only, so the run id rides the query at the
    // bare events path — the one URL shape that survives every proxy.
    expect(FakeWS.instances[0].url).toContain("/v1/flows/events?run_id=run-abc")
  })

  it("dispatches stage frames to onEvent", () => {
    // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
    const got: FlowEventFrame[] = []
    streamFlowEvents("r", (f) => got.push(f))
    const ws = FakeWS.instances[0]
    ws.server({ type: "stage", stage: "s0", index: 0, progress: { value: 3, max: 30 } })
    expect(got).toHaveLength(1)
    expect(got[0].type).toBe("stage")
    if (got[0].type === "stage") expect(got[0].progress?.value).toBe(3)
  })

  it("terminal run frame ends the stream WITHOUT reconnect", () => {
    // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
    const h = streamFlowEvents("r", () => {})
    const ws = FakeWS.instances[0]
    ws.server({ type: "run", status: "completed" })
    expect(h.done()).toBe(true)
    expect(ws.sentClose).toBe(1)
    // a later server close must NOT spawn a second socket
    ws.serverClose()
    expect(FakeWS.instances).toHaveLength(1)
  })

  it("non-terminal run frame keeps the stream open", () => {
    // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
    const h = streamFlowEvents("r", () => {})
    FakeWS.instances[0].server({ type: "run", status: "running" })
    expect(h.done()).toBe(false)
    expect(FakeWS.instances[0].sentClose).toBe(0)
  })

  it("reconnects with backoff after a dropped socket", async () => {
    vi.useFakeTimers()
    try {
      // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
      const h = streamFlowEvents("r", () => {})
      const first = FakeWS.instances[0]
      first.serverClose() // drop
      await vi.advanceTimersByTimeAsync(600) // past the first backoff
      expect(FakeWS.instances.length).toBeGreaterThanOrEqual(2)
      h.close()
    } finally {
      vi.useRealTimers()
    }
  })

  it("silent degrade: no WebSocket runtime → poll-only handle, no throw", () => {
    globalThis.WebSocket = undefined as unknown as typeof WebSocket
    const h = streamFlowEvents("r", () => { throw new Error("never") })
    expect(h.done()).toBe(false)
    expect(() => h.close()).not.toThrow()
  })

  it("abort signal closes the stream", () => {
    // @ts-expect-error stub injection (FakeWS lacks the const enums)
    globalThis.WebSocket = FakeWS
    const ac = new AbortController()
    const h = streamFlowEvents("r", () => {}, { signal: ac.signal })
    ac.abort()
    expect(FakeWS.instances[0].sentClose).toBe(1)
    expect(h.done()).toBe(false) // aborted ≠ terminal
  })
})
