// comfy-events.spec.ts — the direct-ComfyUI websocket client: connect,
// auto-reconnect, typed frame forwarding, SSR no-op.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { connectComfyEvents } from "../src/comfyEvents.ts";
import type { ComfyEvent } from "../src/comfyEvents.ts";

class FakeWS {
  static instances: FakeWS[] = [];
  static throwNext: Error | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
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
    if (this.failClose) throw new Error("already gone");
  }
}

const realWS = (globalThis as Record<string, unknown>).WebSocket;
function install(): void {
  FakeWS.instances = [];
  FakeWS.throwNext = null;
  (globalThis as Record<string, unknown>).WebSocket = FakeWS;
}
afterEach(() => {
  (globalThis as Record<string, unknown>).WebSocket = realWS;
  vi.useRealTimers();
});

const last = (): FakeWS => FakeWS.instances[FakeWS.instances.length - 1]!;

describe("connectComfyEvents without a WebSocket runtime", () => {
  it("degrades to a no-op client", () => {
    (globalThis as Record<string, unknown>).WebSocket = undefined;
    let events = 0;
    const c = connectComfyEvents("ws://x/ws", () => events++);
    assert.equal(c.connected, false);
    c.close();
    assert.equal(events, 0);
  });
});

describe("connectComfyEvents lifecycle", () => {
  it("opens, reports status, and forwards typed frames", () => {
    install();
    const events: ComfyEvent[] = [];
    const statuses: boolean[] = [];
    const c = connectComfyEvents("ws://h:8188/ws?clientId=1", (e) => events.push(e), (s) => statuses.push(s));
    assert.equal(FakeWS.instances.length, 1);
    assert.equal(c.connected, false);
    last().onopen!();
    assert.equal(c.connected, true);
    assert.deepEqual(statuses, [true]);
    last().onmessage!({ data: JSON.stringify({ type: "progress", data: { value: 3, max: 10 } }) });
    assert.deepEqual(events, [
      { type: "progress", data: { value: 3, max: 10 }, raw: JSON.stringify({ type: "progress", data: { value: 3, max: 10 } }) },
    ]);
    c.close();
  });

  it("defaults a missing type/data to raw/{} and routes junk to raw", () => {
    install();
    const events: ComfyEvent[] = [];
    const c = connectComfyEvents("ws://h/ws", (e) => events.push(e));
    last().onmessage!({ data: JSON.stringify({}) });
    assert.deepEqual(events[0], { type: "raw", data: {}, raw: "{}" });
    last().onmessage!({ data: JSON.stringify({ type: "status" }) });
    assert.deepEqual(events[1], { type: "status", data: {}, raw: JSON.stringify({ type: "status" }) });
    last().onmessage!({ data: "not-json{{{" });
    assert.deepEqual(events[2], { type: "raw", data: {}, raw: "not-json{{{" });
    c.close();
  });

  it("ignores non-string frames", () => {
    install();
    let n = 0;
    const c = connectComfyEvents("ws://h/ws", () => n++);
    last().onmessage!({ data: new Uint8Array([1, 2]) });
    last().onmessage!({ data: null });
    assert.equal(n, 0);
    c.close();
  });

  it("reconnects with backoff after a close", () => {
    install();
    vi.useFakeTimers();
    const statuses: boolean[] = [];
    const c = connectComfyEvents("ws://h/ws", () => {}, (s) => statuses.push(s));
    assert.equal(FakeWS.instances.length, 1);
    last().onopen!();
    last().onclose!();
    assert.deepEqual(statuses, [true, false]);
    assert.equal(c.connected, false);
    assert.equal(FakeWS.instances.length, 1);
    vi.advanceTimersByTime(3000);
    assert.equal(FakeWS.instances.length, 2);
    c.close();
  });

  it("clears a pending retry before scheduling the next", () => {
    install();
    vi.useFakeTimers();
    const c = connectComfyEvents("ws://h/ws", () => {});
    last().onclose!();
    last().onclose!();
    vi.advanceTimersByTime(3000);
    // Two closes scheduled two retries; the second cleared the first —
    // exactly one reconnect fires.
    assert.equal(FakeWS.instances.length, 2);
    c.close();
  });

  it("a throwing constructor schedules a retry", () => {
    install();
    vi.useFakeTimers();
    const warn = console.warn;
    console.warn = () => {};
    try {
      FakeWS.throwNext = new Error("refused");
      const c = connectComfyEvents("ws://h/ws", () => {});
      assert.equal(FakeWS.instances.length, 0);
      vi.advanceTimersByTime(3000);
      assert.equal(FakeWS.instances.length, 1);
      c.close();
    } finally {
      console.warn = warn;
    }
  });

  it("onerror closes the socket (and survives a throwing close)", () => {
    install();
    const c = connectComfyEvents("ws://h/ws", () => {});
    const ws = last();
    ws.onerror!();
    assert.equal(ws.closeCalls, 1);
    ws.failClose = true;
    ws.onerror!();
    assert.equal(ws.closeCalls, 2);
    c.close();
  });

  it("close() is terminal: no reconnect, failing socket close tolerated", () => {
    install();
    vi.useFakeTimers();
    const c = connectComfyEvents("ws://h/ws", () => {});
    const ws = last();
    ws.failClose = true;
    last().onclose!(); // pending retry scheduled
    c.close(); // clears the retry; ws.close throws inside close() -> swallowed
    vi.advanceTimersByTime(10_000);
    assert.equal(FakeWS.instances.length, 1);
    // A late server close after our close cannot reconnect either.
    ws.onclose!();
    vi.advanceTimersByTime(10_000);
    assert.equal(FakeWS.instances.length, 1);
  });

  it("open() after close never dials (retry fired post-close)", () => {
    install();
    vi.useFakeTimers();
    const c = connectComfyEvents("ws://h/ws", () => {});
    c.close();
    last().onclose!(); // scheduleRetry returns early: closed
    vi.advanceTimersByTime(10_000);
    assert.equal(FakeWS.instances.length, 1);
  });
});
