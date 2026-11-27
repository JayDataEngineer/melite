// @contract gates-teardown-quiet-law
// manage-quiet-law.spec.ts — THE QUIET LAW wall (B4, 2026-11-27: the
// restart-under-a-press burn). The teardown doors (restart, stop)
// read the ENGINE's own queue — every lane's press is a row there —
// and wait for a queue that is empty AND stays empty for the ctx's
// quiet window before they tear; a prompt landing inside the window
// re-arms the clock; a queue that never goes quiet refuses, naming
// the rows; force is the operator's override; an unanswerable queue
// is not a busy signal (the vendor call is the truth-teller). Fetch
// is routed per test with a scripted queue; state roots are temp
// dirs; the timer seat is real with a 5ms cap so the polls do not
// spin hot.
import { describe, it, afterEach, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "../src/managePlane.ts";
import { LifecycleLatch } from "../src/lifecycleLatch.ts";
import { awaitEngineQuiet, seatSleep } from "../src/engineQuiet.ts";
import { ManageConfig } from "../src/manageRegistry.ts";

type Queue = { queue_running: unknown[]; queue_pending: unknown[] };
const EMPTY: Queue = { queue_running: [], queue_pending: [] };
const busy = (running: number, pending: number): Queue => ({
  queue_running: Array.from({ length: running }, () => ({})),
  queue_pending: Array.from({ length: pending }, () => ({})),
});
const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });

interface Log {
  queueReads: Queue[];
  queueReadAt: number[];
  reboots: number;
}
let LOG: Log = { queueReads: [], queueReadAt: [], reboots: 0 };
/** The scripted queue: a list consumed per read; the last row holds. */
let SCRIPT: Queue[] = [EMPTY];
let QUEUE_STATUS = 200;

const realFetch = globalThis.fetch;
function route(): void {
  globalThis.fetch = (async (url: unknown) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/queue")) {
      const q = SCRIPT[Math.min(LOG.queueReads.length, SCRIPT.length - 1)]!;
      LOG.queueReads.push(q);
      LOG.queueReadAt.push(Date.now());
      return json(QUEUE_STATUS === 200 ? q : { error: "no queue" }, QUEUE_STATUS);
    }
    if (path.endsWith("/manager/reboot")) {
      LOG.reboots += 1;
      return json({});
    }
    return json({ error: "unused route " + path }, 500);
  }) as typeof fetch;
}

let ROOT = "";
const ctx = (over: Partial<ManageCtx> = {}): ManageCtx =>
  ({
    latch: new LifecycleLatch(),
    repoRoot: ROOT,
    stateRoots: [join(ROOT, "runs")],
    comfyUnit: "estate-comfyui.service",
    autoProvision: false,
    engineQuiesceMs: 0,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => [] },
    timeout: (cb: () => void, ms: number) => {
      const t = setTimeout(cb, Math.min(ms, 5));
      return () => { clearTimeout(t); };
    },
    ...over,
  }) as unknown as ManageCtx;

async function manage(doc: unknown, c: ManageCtx): Promise<[number, ManageEnvelope]> {
  return (await dispatchManage(doc, c)) as [number, ManageEnvelope];
}

describe("the quiet law — awaitEngineQuiet", () => {
  beforeEach(() => {
    ROOT = mkdtempSync(join(tmpdir(), "quiet-"));
    LOG = { queueReads: [], queueReadAt: [], reboots: 0 };
    SCRIPT = [EMPTY];
    QUEUE_STATUS = 200;
    route();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    rmSync(ROOT, { recursive: true, force: true });
  });

  it("an empty queue with a zero window is quiet on the FIRST reading (no second read)", async () => {
    const verdict = await awaitEngineQuiet(ctx(), 1000, 0);
    assert.equal(verdict.quiet, true);
    assert.equal(LOG.queueReads.length, 1, "one reading — the zero window tears at once");
    assert.deepEqual([verdict.running, verdict.pending, verdict.busyReads], [0, 0, 0]);
  });

  it("an empty queue holds for the WHOLE window: the verdict lands no earlier than quiesceMs after the first empty reading", async () => {
    SCRIPT = [EMPTY];
    const t0 = Date.now();
    const verdict = await awaitEngineQuiet(ctx(), 2000, 60);
    assert.equal(verdict.quiet, true);
    assert.ok(Date.now() - t0 >= 60, "the window elapsed before the verdict");
    assert.ok(LOG.queueReads.length >= 2, "the window is POLLED — one empty reading never tears (" + LOG.queueReads.length + " reads)");
  });

  it("a busy queue is waited on: busy readings are counted, and quiet needs a FULL window after the last busy read", async () => {
    SCRIPT = [busy(1, 0), busy(1, 2), EMPTY];
    const verdict = await awaitEngineQuiet(ctx(), 2000, 60);
    assert.equal(verdict.quiet, true);
    assert.equal(verdict.busyReads, 2);
    assert.deepEqual([verdict.running, verdict.pending], [0, 0], "the verdict reports the LAST answerable reading");
    const lastBusy = Math.max(...LOG.queueReadAt.filter((_, i) => LOG.queueReads[i] !== EMPTY));
    assert.ok(Date.now() - lastBusy >= 60, "the verdict waited a whole window after the queue drained");
  });

  it("A PROMPT LANDING INSIDE THE WINDOW RE-ARMS THE CLOCK (the film-between-windows burn)", async () => {
    // empty, empty (the gap between two windows), BUSY (the next
    // window presses inside the window), then empty forever.
    SCRIPT = [EMPTY, EMPTY, busy(1, 0), EMPTY];
    const verdict = await awaitEngineQuiet(ctx(), 2000, 60);
    assert.equal(verdict.quiet, true);
    assert.equal(verdict.busyReads, 1);
    const busyAt = LOG.queueReadAt[LOG.queueReads.findIndex((q) => q !== EMPTY)]!;
    assert.ok(LOG.queueReads.length >= 4, "the clock re-armed: reads continued past the busy reading");
    assert.ok(Date.now() - busyAt >= 60, "quiet was judged from the busy reading, never from the first empty one");
  });

  it("a queue that never goes quiet inside the budget answers unquiet with the rows it waited on", async () => {
    SCRIPT = [busy(1, 2)];
    const verdict = await awaitEngineQuiet(ctx(), 40, 20);
    assert.equal(verdict.quiet, false);
    assert.deepEqual([verdict.running, verdict.pending], [1, 2]);
    assert.ok(verdict.busyReads >= 1);
  });

  it("an unanswerable queue is NOT a busy signal (null folds to the last reading — never a lying 'busy')", async () => {
    QUEUE_STATUS = 500;
    const verdict = await awaitEngineQuiet(ctx(), 200, 0);
    assert.equal(verdict.quiet, true);
    assert.deepEqual([verdict.running, verdict.pending], [0, 0]);
  });

  it("a caller ALREADY GONE never reads the engine — the wait rejects with the abort reason at the loop top", async () => {
    SCRIPT = [busy(1, 0)];
    const controller = new AbortController();
    const reason = new Error("caller left before the door opened");
    controller.abort(reason);
    const before = LOG.queueReads.length;
    await assert.rejects(awaitEngineQuiet(ctx({ signal: controller.signal }), 2000, 20), (e: unknown) => e === reason);
    assert.equal(LOG.queueReads.length, before, "no queue read for a caller that is gone");
  });

  it("the caller's abort during the wait rejects with the abort reason", async () => {
    SCRIPT = [busy(1, 0)];
    const controller = new AbortController();
    const c = ctx({ signal: controller.signal });
    const reason = new Error("caller went away");
    const pending = awaitEngineQuiet(c, 2000, 20);
    setTimeout(() => controller.abort(reason), 15);
    await assert.rejects(pending, (e: unknown) => e === reason);
  });
});

describe("the quiet law — the teardown doors", () => {
  beforeEach(() => {
    ROOT = mkdtempSync(join(tmpdir(), "quiet-door-"));
    LOG = { queueReads: [], queueReadAt: [], reboots: 0 };
    SCRIPT = [EMPTY];
    QUEUE_STATUS = 200;
    route();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    rmSync(ROOT, { recursive: true, force: true });
  });

  it("RESTART WAITS: a foreign press in the queue holds the reboot until the queue is quiet — the reboot lands AFTER the last busy read", async () => {
    SCRIPT = [busy(1, 0), busy(0, 1), EMPTY];
    const [code, env] = await manage({ action: "restart" }, ctx({ engineQuiesceMs: 30 }));
    assert.equal(code, 200, env.detail);
    assert.equal(LOG.reboots, 1);
    const lastBusyIndex = LOG.queueReads.map((q, i) => (q === EMPTY ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
    assert.ok(lastBusyIndex >= 1, "the door read a busy queue");
    assert.ok(LOG.queueReads.length > lastBusyIndex + 1, "the door kept reading after the queue drained (the window held)");
  });

  it("RESTART REFUSES: a queue that never goes quiet inside the rail is a 409 naming the rows — NO reboot", async () => {
    SCRIPT = [busy(1, 2)];
    const [code, env] = await manage({ action: "restart", timeout_seconds: 1 }, ctx({ engineQuiesceMs: 20 }));
    assert.equal(code, 409);
    assert.match(env.detail, /engine's queue is busy — 1 running, 2 pending/);
    assert.match(env.detail, /not restarted after waiting 1s/);
    assert.match(env.detail, /force=true/);
    assert.equal(LOG.reboots, 0, "the reboot never issued");
  });

  it("FORCE IS THE OPERATOR'S OVERRIDE: force tears under a busy queue without reading it", async () => {
    SCRIPT = [busy(1, 0)];
    // `force` is the boolean the door parses (`force: 1` is NOT force —
    // the manage-plane wall's own "even force=1" arm); the override
    // skips the wait exactly as it skips the lifecycle guard.
    const [code, env] = await manage({ action: "restart", force: true }, ctx({ engineQuiesceMs: 10_000 }));
    assert.equal(code, 200, env.detail);
    assert.equal(LOG.reboots, 1);
    assert.equal(LOG.queueReads.length, 0, "force never waits — and never reads the queue");
  });

  it("STOP RIDES THE SAME LAW: a busy queue refuses the stop before systemctl (409, never the 500 a reached systemctl would answer)", async () => {
    SCRIPT = [busy(2, 0)];
    const [code, env] = await manage({ action: "stop", timeout_seconds: 1 }, ctx({ engineQuiesceMs: 20 }));
    assert.equal(code, 409);
    assert.match(env.detail, /engine's queue is busy — 2 running, 0 pending/);
    assert.match(env.detail, /not stopped after waiting 1s/);
  });

  it("an unanswerable queue does not refuse the restart: the vendor call is the truth-teller (here it answers — reboot issued)", async () => {
    QUEUE_STATUS = 500;
    const [code, env] = await manage({ action: "restart" }, ctx({ engineQuiesceMs: 60 }));
    assert.equal(code, 200, env.detail);
    assert.equal(LOG.reboots, 1);
  });
});

describe("the quiet law — the seat and the provider", () => {
  it("seatSleep settles on the seat's timer and cancels it on abort (no stray timer after either settle)", async () => {
    let fired = 0;
    let cancelled = 0;
    const seat = {
      signal: undefined,
      timeout: (cb: () => void, ms: number) => {
        const t = setTimeout(() => { fired += 1; cb(); }, ms);
        return () => { cancelled += 1; clearTimeout(t); };
      },
    } as unknown as ManageCtx;
    await seatSleep(seat, 5);
    assert.deepEqual([fired, cancelled], [1, 0]);

    const controller = new AbortController();
    const seat2 = { ...seat, signal: controller.signal } as ManageCtx;
    const pending = seatSleep(seat2, 10_000);
    controller.abort();
    await assert.rejects(pending, /aborted/);
    assert.equal(cancelled, 1, "the abort cancelled the pending timer");
  });

  it("AN UNPINNED WINDOW FAILS LOUD — never a silent rail-long stall (an undefined or negative engineQuiesceMs)", async () => {
    for (const bad of [undefined, -1, Number.NaN]) {
      const before = LOG.queueReads.length;
      await assert.rejects(
        awaitEngineQuiet(ctx(), 1000, bad as number),
        /quiet window is unpinned on the manage context \(engineQuiesceMs=/,
        "engineQuiesceMs=" + String(bad),
      );
      assert.equal(LOG.queueReads.length, before, "the refusal precedes any engine read");
    }
  });

  it("THE REGISTRATION RACE: an abort landing between the entry check and the listener's registration still rejects and cancels the timer", async () => {
    // a signal that reads live at the entry check and aborted by the
    // time the listener is registered — the post-registration re-check
    // is the only thing that can see it
    let reads = 0;
    const raced = new AbortController().signal;
    Object.defineProperty(raced, "aborted", { get: () => { reads += 1; return reads > 1; }, configurable: true });
    let cancelled = 0;
    const seat = ctx({ signal: raced, timeout: () => () => { cancelled += 1; } });
    await assert.rejects(seatSleep(seat, 10_000), (e: unknown) => e instanceof DOMException && e.name === "AbortError");
    assert.equal(cancelled, 1);
  });

  it("the provider's config: the quiet window defaults to 10 000ms and refuses a negative", () => {
    const dflt = ManageConfig({});
    assert.equal(dflt.engineQuiesceMs, 10_000);
    assert.equal(ManageConfig({ engineQuiesceMs: 0 }).engineQuiesceMs, 0);
    assert.throws(() => ManageConfig({ engineQuiesceMs: -1 }));
  });
});
