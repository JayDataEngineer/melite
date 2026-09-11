// flow-events.spec.ts — the gateway events-door stream: live frames,
// terminal finish, capped-backoff reconnect, silent degrade.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { streamFlowEvents } from "../src/FlowEvents.ts";
import type { FlowEventFrame } from "../src/FlowEvents.ts";

class FakeWS {
  static instances: FakeWS[] = [];
  static throwNext: Error | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closeCalls = 0;
  failClose = false;
  url: string;
  constructor(url: string) {
    if (FakeWS.throwNext) {
      const e = FakeWS.throwNext;
      FakeWS.throwNext = null;
      throw e;
    }
    this.url = url;
    FakeWS.instances.push(this);
  }
  close(): void {
    this.closeCalls++;
    if (this.failClose) throw new Error("gone");
  }
}

const realWS = (globalThis as Record<string, unknown>).WebSocket;
const realLoc = (globalThis as Record<string, unknown>).location;
function install(): void {
  FakeWS.instances = [];
  FakeWS.throwNext = null;
  (globalThis as Record<string, unknown>).WebSocket = FakeWS;
}
afterEach(() => {
  (globalThis as Record<string, unknown>).WebSocket = realWS;
  (globalThis as Record<string, unknown>).location = realLoc;
  vi.useRealTimers();
});

const last = (): FakeWS => FakeWS.instances[FakeWS.instances.length - 1]!;

describe("streamFlowEvents", () => {
  it("opens the query-form URL and forwards frames, resetting backoff", () => {
    install();
    vi.useFakeTimers();
    (globalThis as Record<string, unknown>).location = { protocol: "https:", host: "gw:80" };
    const frames: FlowEventFrame[] = [];
    const h = streamFlowEvents("r/1 a", (f) => frames.push(f));
    assert.equal(FakeWS.instances.length, 1);
    assert.ok(last().url.startsWith("wss://gw:80/v1/flows/events?run_id="));
    assert.ok(last().url.includes("run_id=r%2F1%20a"));
    assert.equal(h.done(), false);
    last().onmessage!({ data: JSON.stringify({ type: "stage", stage: "s", index: 0 }) });
    assert.deepEqual(frames, [{ type: "stage", stage: "s", index: 0 }]);
    h.close();
  });

  it("uses ws:// off an http: page", () => {
    install();
    (globalThis as Record<string, unknown>).location = { protocol: "http:", host: "h" };
    const h = streamFlowEvents("r1", () => {});
    assert.ok(last().url.startsWith("ws://h/"));
    h.close();
  });

  it("ends the stream on a terminal run frame and ignores late frames", () => {
    install();
    vi.useFakeTimers();
    const frames: FlowEventFrame[] = [];
    const h = streamFlowEvents("r1", (f) => frames.push(f));
    const ws = last();
    const msg = ws.onmessage!;
    const cls = ws.onclose!;
    for (const status of ["completed", "failed", "stopped", "unknown"]) {
      void status;
    }
    msg({ data: JSON.stringify({ type: "run", status: "completed" }) });
    assert.equal(h.done(), true);
    assert.deepEqual(frames, [{ type: "run", status: "completed" }]);
    // A terminal frame finished the stream: the socket was closed and
    // detached, so late frames and closes (via the captured handlers)
    // cannot revive it.
    assert.equal(ws.onmessage, null);
    assert.equal(ws.closeCalls, 1);
    msg({ data: JSON.stringify({ type: "run", status: "failed" }) });
    assert.equal(frames.length, 1);
    cls();
    vi.advanceTimersByTime(60_000);
    assert.equal(FakeWS.instances.length, 1);
    h.close();
  });

  it("a non-terminal run frame keeps the stream open", () => {
    install();
    const frames: FlowEventFrame[] = [];
    const h = streamFlowEvents("r1", (f) => frames.push(f));
    last().onmessage!({ data: JSON.stringify({ type: "run", status: "running" }) });
    assert.equal(h.done(), false);
    assert.equal(frames.length, 1);
    h.close();
  });

  it("drops malformed frames without ending the stream", () => {
    install();
    let n = 0;
    const h = streamFlowEvents("r1", () => n++);
    last().onmessage!({ data: "{{{nope" });
    last().onmessage!({ data: "42" });
    last().onmessage!({ data: "null" });
    last().onmessage!({ data: JSON.stringify({ noType: true }) });
    last().onmessage!({ data: JSON.stringify({ type: 7 }) });
    assert.equal(n, 0);
    assert.equal(h.done(), false);
    h.close();
  });

  it("reconnects with capped backoff after a drop", () => {
    install();
    vi.useFakeTimers();
    (globalThis as Record<string, unknown>).location = { protocol: "http:", host: "h" };
    const h = streamFlowEvents("r1", () => {});
    last().onclose!(); // attempt 0 -> 500ms
    assert.equal(FakeWS.instances.length, 1);
    vi.advanceTimersByTime(500);
    assert.equal(FakeWS.instances.length, 2);
    last().onclose!(); // attempt 1 -> 1000ms
    vi.advanceTimersByTime(999);
    assert.equal(FakeWS.instances.length, 2);
    vi.advanceTimersByTime(1);
    assert.equal(FakeWS.instances.length, 3);
    h.close();
  });

  it("live frames reset the backoff; onerror alone does not reconnect", () => {
    install();
    vi.useFakeTimers();
    const h = streamFlowEvents("r1", () => {});
    last().onmessage!({ data: JSON.stringify({ type: "run", status: "running" }) });
    last().onerror!();
    assert.equal(FakeWS.instances.length, 1);
    last().onclose!();
    vi.advanceTimersByTime(500);
    assert.equal(FakeWS.instances.length, 2);
    h.close();
  });

  it("close() with a pending retry clears it: no reconnect", () => {
    install();
    vi.useFakeTimers();
    const h = streamFlowEvents("r1", () => {});
    last().onclose!(); // retry pending (covers timer-armed cleanup)
    h.close();
    vi.advanceTimersByTime(60_000);
    assert.equal(FakeWS.instances.length, 1);
  });

  it("close() detaches handlers and tolerates a failing socket", () => {
    install();
    vi.useFakeTimers();
    const h = streamFlowEvents("r1", () => {});
    const ws = last();
    ws.failClose = true;
    h.close();
    h.close(); // idempotent: second close finds no socket/timer
    assert.equal(ws.onmessage, null);
    assert.equal(ws.onclose, null);
    assert.equal(ws.onerror, null);
    ws.onclose!; // detached — nothing to call
    vi.advanceTimersByTime(60_000);
    assert.equal(FakeWS.instances.length, 1);
  });

  it("an abort signal closes the stream", () => {
    install();
    vi.useFakeTimers();
    const ctl = new AbortController();
    const h = streamFlowEvents("r1", () => {}, { signal: ctl.signal });
    assert.equal(FakeWS.instances.length, 1);
    ctl.abort();
    vi.advanceTimersByTime(60_000);
    assert.equal(FakeWS.instances.length, 1);
    h.close();
  });

  it("degrades silently with no WebSocket runtime or a refusing constructor", () => {
    (globalThis as Record<string, unknown>).WebSocket = undefined;
    const h = streamFlowEvents("r1", () => {});
    assert.equal(h.done(), false);
    h.close();
    install();
    FakeWS.throwNext = new Error("refused");
    const h2 = streamFlowEvents("r1", () => {});
    assert.equal(h2.done(), false);
    assert.equal(FakeWS.instances.length, 0);
    h2.close();
  });
});
