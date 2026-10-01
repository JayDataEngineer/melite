// @melite/comfyui-cordis — the engine supervisor's state machine
// (TEST-2 breadth, 2026-09-12). The supervisor is fully
// injectable (probe + timers + clock + log) — the battery drives
// every transition with a manual timer harness: no sleeps, no
// real sockets, deterministic backoff.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  EngineSupervisor, isTransportDownError, resolveSupervisorPolicy,
} from "../src/supervisor.ts";

const down = (msg = "connect ECONNREFUSED 127.0.0.1:8188"): Error => {
  const e = new Error(msg) as Error & { code?: string };
  return e;
};

/** A manual clock + timer harness (captures, never fires alone).
 * delays records every arm's delayMs (W10/W12 laws); clearTimer
 * still truncates and fire() still drains — the truncating shape
 * U10/U15 depend on is unchanged. */
const harness = () => {
  let now = 1000;
  const pending: Array<() => void> = [];
  const logs: string[] = [];
  const delays: number[] = [];
  return {
    now: () => now,
    advance: (ms: number): void => { now += ms; },
    delays,
    setTimer: ((fn: () => void, delayMs?: number): unknown => { pending.push(fn); delays.push(delayMs ?? 0); return pending.length; }) as unknown as typeof setTimeout,
    clearTimer: ((_t: unknown): void => { pending.length = 0; }) as unknown as typeof clearTimeout,
    fire: (): void => { pending.splice(0).forEach((fn) => fn()); },
    pending: (): number => pending.length,
    log: {
      info: (m: string): void => { logs.push("info:" + m); },
      warn: (m: string): void => { logs.push("warn:" + m); },
      error: (m: string): void => { logs.push("error:" + m); },
    },
    logs,
  };
};

/** An identity-preserving timer ledger (B-M10): each arm returns a
 * DISTINCT object handle, every clear is RECORDED (never truncated),
 * delays are kept, and fire is per-handle. The truncating harness()
 * above cannot prove handle identity — the two shapes are not
 * interchangeable and neither replaces the other. */
const ledgerTimers = () => {
  const timers: Array<{ delayMs: number; fire: () => void }> = [];
  const cleared: unknown[] = [];
  const setTimer = ((fn: () => void, delayMs: number): unknown => {
    const entry = { delayMs, fire: (): void => { fn(); } };
    timers.push(entry);
    return entry;
  }) as unknown as typeof setTimeout;
  const clearTimer = ((t: unknown): void => { cleared.push(t); }) as unknown as typeof clearTimeout;
  return { timers, cleared, setTimer, clearTimer };
};

/** scripted probe (fail/ok per call, last repeats) with a call ledger */
const scriptProbe = (script: Array<"ok" | "fail">, calls: string[]): (() => Promise<void>) => {
  let n = 0;
  return (): Promise<void> => {
    calls.push("probe" + String(n));
    const step: "ok" | "fail" = script[Math.min(n, script.length - 1)] ?? "ok";
    n += 1;
    return step === "ok" ? Promise.resolve() : Promise.reject(down());
  };
};

/** Macrotask flush: a fired timer runs an async probe chain whose
 * settle -> arm step a single microtask hop loses the race against. */
const tick = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
  await new Promise<void>((r) => setTimeout(r, 0));
};

describe("isTransportDownError (the transport vocabulary)", () => {
  it("non-objects and null are never transport-down", () => {
    assert.equal(isTransportDownError("ECONNREFUSED"), false);
    assert.equal(isTransportDownError(null), false);
    assert.equal(isTransportDownError(undefined), false);
    assert.equal(isTransportDownError(42), false);
  });
  it("dead codes hit, live codes miss", () => {
    assert.equal(isTransportDownError({ code: "ECONNREFUSED" }), true);
    assert.equal(isTransportDownError({ code: "ENOENT" }), false);
    assert.equal(isTransportDownError({ code: 42, message: "x ECONNRESET y" }), true);
    // real Error instances carrying .code (the node-fetch shape)
    for (const code of ["EAI_AGAIN", "ENETUNREACH", "EPIPE"]) {
      const err = new Error("connect " + code + " 127.0.0.1:8188") as Error & { code: string };
      err.code = code;
      assert.equal(isTransportDownError(err), true, code);
    }
    // message-only shape (errno prose in the text, no .code)
    assert.equal(isTransportDownError(new Error("connect ECONNREFUSED 127.0.0.1:8188")), true);
  });
  it("the message vocabulary hits (every code, once)", () => {
    for (const code of ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EHOSTUNREACH"]) {
      assert.equal(isTransportDownError(new Error("dial " + code + " fail")), true, code);
    }
    assert.equal(isTransportDownError(new Error("dial ETIMEDOUT fail")), false, "a timeout proves the engine alive");
    assert.equal(isTransportDownError(new Error("http 500 boom")), false);
    // caller-discipline neutrals (W4's rows): an aborted socket, an
    // HTTP error status, and an unclassified error are all ALIVE
    const hangup = new Error("socket hang up") as Error & { code: string };
    hangup.code = "ECONNABORTED";
    assert.equal(isTransportDownError(hangup), false);
    assert.equal(isTransportDownError(new Error("POST /prompt 400: validation failed")), false);
    assert.equal(isTransportDownError(new Error("boom")), false);
    assert.equal(isTransportDownError({ message: 42 }), false, "a non-string message is not transport-down");
    assert.equal(isTransportDownError({}), false);
  });
});

describe("resolveSupervisorPolicy (misconfiguration fails LOUD)", () => {
  it("unknown keys refuse", () => {
    assert.throws(
      () => resolveSupervisorPolicy({ bogus: 1 } as never, "supervisor"),
      /supervisor\.bogus is not a supervisor option/,
    );
  });
  it("every bound refuses with its voice", () => {
    assert.throws(() => resolveSupervisorPolicy({ initialDelayMs: 0 }, "s"), /s\.initialDelayMs must be a positive finite number/);
    assert.throws(() => resolveSupervisorPolicy({ initialDelayMs: NaN }, "s"), /s\.initialDelayMs must be a positive finite number/);
    assert.throws(() => resolveSupervisorPolicy({ initialDelayMs: 3e9 }, "s"), /s\.initialDelayMs must be a positive finite number/);
    assert.throws(() => resolveSupervisorPolicy({ maxDelayMs: -1 }, "s"), /s\.maxDelayMs must be a positive finite number/);
    assert.throws(
      () => resolveSupervisorPolicy({ initialDelayMs: 5000, maxDelayMs: 1000 }, "s"),
      /s\.initialDelayMs must be less than or equal to maxDelayMs/,
    );
    assert.throws(() => resolveSupervisorPolicy({ maxAttempts: 0 }, "s"), /s\.maxAttempts must be a positive integer/);
    assert.throws(() => resolveSupervisorPolicy({ maxAttempts: 1.5 }, "s"), /s\.maxAttempts must be a positive integer/);
  });
  it("undefined rides the defaults; custom rides verbatim", () => {
    assert.deepEqual(resolveSupervisorPolicy(undefined, "s"), {
      enabled: true, initialDelayMs: 500, maxDelayMs: 30000, maxAttempts: 10,
    });
    assert.deepEqual(
      resolveSupervisorPolicy({ enabled: false, initialDelayMs: 100, maxDelayMs: 200, maxAttempts: 2 }, "s").enabled,
      false,
    );
  });
});

describe("EngineSupervisor (the state machine)", () => {
  it("start is idempotent; a first success settles ready + up", async () => {
    const h = harness();
    const sup = new EngineSupervisor({ probe: () => Promise.resolve(), ...h });
    sup.start();
    sup.start();
    const outcome = await sup.ready;
    assert.deepEqual(outcome, { ok: true });
    assert.equal(sup.current, "up");
    assert.equal(sup.failure, undefined);
    await sup.ensureUp();
    assert.equal(h.pending(), 0, "no timer armed on the success path");
    await sup.dispose();
  });

  it("a first failure settles ready + down; the gate throws the RECORDED error fast", async () => {
    const h = harness();
    const sup = new EngineSupervisor({ probe: () => Promise.reject(down()), label: "comfy", ...h });
    sup.start();
    const outcome = await sup.ready;
    assert.equal(outcome.ok, false);
    assert.equal(sup.current, "down");
    assert.match((sup.failure as Error).message, /ECONNREFUSED/);
    await assert.rejects(sup.ensureUp(), /comfy is unreachable \(connect ECONNREFUSED/);
    assert.equal(h.pending(), 1, "backoff arms");
    assert.equal(h.delays[0], 500, "the backoff starts at initialDelayMs");
    await sup.dispose();
  });

  it("a non-Error failure stringifies into the fast error", async () => {
    const h = harness();
    const sup = new EngineSupervisor({ probe: () => Promise.reject("string-fail"), ...h });
    sup.start();
    await sup.ready;
    await assert.rejects(sup.ensureUp(), /is unreachable \(string-fail\)/);
    await sup.dispose();
  });

  it("traffic proves liveness (noteSuccess) and clears the timer", async () => {
    const h = harness();
    let fail = true;
    const sup = new EngineSupervisor({ probe: () => (fail ? Promise.reject(down()) : Promise.resolve()), ...h });
    sup.start();
    await sup.ready;
    assert.equal(h.pending(), 1);
    sup.noteSuccess();
    assert.equal(sup.current, "up");
    assert.equal(h.pending(), 0, "the timer clears on traffic");
    fail = false;
    await sup.ensureUp();
    await sup.dispose();
  });

  it("a stale probe never contradicts traffic (the hasClosed race rule)", async () => {
    const h = harness();
    let release!: () => void;
    const calls: string[] = [];
    const gate = new Promise<void>((r) => { release = r; });
    const sup = new EngineSupervisor({
      probe: (): Promise<void> => { calls.push("probe"); return gate.then(() => { throw down("late"); }); },
      ...h,
    });
    sup.start();
    sup.noteSuccess(); // traffic proves reachability AFTER the probe started
    release();
    await sup.ready;
    assert.equal(sup.current, "up", "the stale failure does not move state");
    assert.deepEqual(calls, ["probe"], "exactly one probe ran (no re-probe on a stale failure)");
    await sup.dispose();
  });

  it("concurrent probes join the in-flight flight (the identity cell)", async () => {
    const h = harness();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const sup = new EngineSupervisor({
      probe: () => { calls += 1; return gate; },
      ...h,
    });
    sup.start();
    await sup.ensureUp().catch(() => {});
    release();
    await sup.ready;
    assert.equal(calls, 1, "one probe body for overlapping callers");
    await sup.dispose();
  });

  it("uptime past the ceiling resets the outage budget (the stability window)", async () => {
    const h = harness();
    let fail = false;
    const downs: unknown[] = [];
    const sup = new EngineSupervisor({
      probe: () => (fail ? Promise.reject(down()) : Promise.resolve()),
      onDown: (e) => { downs.push(e); },
      policy: { maxAttempts: 2 },
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
      log: h.log,
    });
    sup.start();
    await sup.ready;
    fail = true;
    sup.noteFailure(down("outage-1")); // attempts=1, down
    assert.equal(sup.current, "down");
    sup.noteSuccess();
    sup.noteSuccess(); // second traffic proof while up (the was===up arm)
    h.advance(60000); // past the 30s ceiling
    sup.noteFailure(down("outage-2")); // budget resets: attempts=1 again, NOT exhausted
    assert.equal(sup.current, "down", "a fresh outage, not exhaustion");
    assert.equal(h.delays.at(-1), 500, "the fresh outage's re-arm is back at initialDelayMs");
    assert.equal(downs.length, 2, "onDown fires on every up->down edge");
    await sup.dispose();
  });

  it("exhaustion: maxAttempts failures give up, onExhausted fires, re-arm probes", async () => {
    const h = harness();
    let exhausted = 0;
    let ups = 0;
    const sup = new EngineSupervisor({
      probe: () => Promise.reject(down()),
      policy: { maxAttempts: 1 },
      onExhausted: (n) => { exhausted = n; },
      onUp: () => { ups += 1; },
      ...h,
    });
    sup.start();
    await sup.ready;
    h.fire(); // second failure > maxAttempts -> exhausted
    await new Promise((r) => setImmediate(r));
    assert.equal(sup.current, "exhausted");
    assert.equal(exhausted, 1);
    assert.equal(h.pending(), 0, "no timer past exhaustion");
    await assert.rejects(sup.ensureUp(), /is unreachable/, "exhausted re-arms with one probe, still down");
    await sup.dispose();
  });

  it("backoff doubles per failure and caps at maxDelayMs", async () => {
    const t = ledgerTimers();
    const calls: string[] = [];
    const sup = new EngineSupervisor({
      probe: scriptProbe(["fail"], calls),
      policy: { initialDelayMs: 100, maxDelayMs: 250, maxAttempts: 100 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    sup.start();
    await sup.ready;
    t.timers[0]?.fire();
    await tick();
    assert.equal(t.timers[1]?.delayMs, 200);
    t.timers[1]?.fire();
    await tick();
    assert.equal(t.timers[2]?.delayMs, 250);
    t.timers[2]?.fire();
    await tick();
    assert.equal(t.timers[3]?.delayMs, 250);
    await sup.dispose();
  });

  it("an exhausted submit's re-arm probe can RECOVER (proceeds to up, arms nothing)", async () => {
    const t = ledgerTimers();
    const calls: string[] = [];
    const sup = new EngineSupervisor({
      probe: scriptProbe(["fail", "fail", "fail", "ok"], calls),
      policy: { initialDelayMs: 10, maxDelayMs: 10, maxAttempts: 2 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    sup.start();
    await sup.ready;
    t.timers[0]?.fire();
    await tick();
    t.timers[1]?.fire();
    await tick();
    assert.equal(sup.current, "exhausted");
    const timersBefore: number = t.timers.length;
    await sup.ensureUp();
    assert.equal(sup.current, "up");
    assert.equal(t.timers.length, timersBefore, "the recovery arms no timer");
    assert.deepEqual(calls, ["probe0", "probe1", "probe2", "probe3"]);
    await sup.dispose();
  });

  it("unknown (first probe in flight) never blocks a submit", async () => {
    let release!: () => void;
    const gate: Promise<void> = new Promise<void>((r) => { release = r; });
    const h = harness();
    const sup = new EngineSupervisor({ probe: () => gate, ...h });
    sup.start();
    await new Promise((r) => setImmediate(r));
    assert.equal(sup.current, "unknown");
    await sup.ensureUp();
    release();
    const outcome = await sup.ready;
    assert.deepEqual(outcome, { ok: true });
    await sup.dispose();
  });

  it("a re-arm while a timer pends clears the old timer first", async () => {
    const h = harness();
    let cleared = 0;
    const sup = new EngineSupervisor({
      probe: () => Promise.reject(down()),
      setTimer: h.setTimer,
      clearTimer: ((t: unknown): void => { cleared += 1; }) as unknown as typeof clearTimeout,
      now: h.now,
      log: h.log,
    });
    sup.noteFailure(down("outage-1"));
    sup.noteFailure(down("outage-2"));
    assert.equal(cleared, 1, "the second arm clears the pending timer");
    // (the harness pending list is append-only here — the clear
    // count above is the pin: one clear for the re-arm)
    await sup.dispose();
  });

  it("overlapping probes on an exhausted supervisor join the flight", async () => {
    const h = harness();
    let calls = 0;
    let release!: (e?: unknown) => void;
    const gate = new Promise<void>((_r, rej) => { release = (e?: unknown): void => rej(e ?? down("late")); });
    const sup = new EngineSupervisor({
      probe: () => { calls += 1; return gate; },
      policy: { maxAttempts: 1 },
      ...h,
    });
    sup.noteFailure(down("first")); // down, attempts=1
    sup.noteFailure(down("second")); // attempts=2 > 1 -> exhausted
    assert.equal(sup.current, "exhausted");
    const joined = sup.ensureUp(); // joins the re-arm probe (one body)
    const joined2 = sup.ensureUp(); // joins too
    await new Promise((r) => setImmediate(r));
    assert.equal(calls, 1, "one re-arm body for overlapping callers");
    release();
    await assert.rejects(joined, /is unreachable/);
    await assert.rejects(joined2, /is unreachable/);
    await sup.dispose();
  });

  it("a disposed-exhausted supervisor's probe returns without firing", async () => {
    const h = harness();
    let calls = 0;
    const sup = new EngineSupervisor({
      probe: () => { calls += 1; return Promise.reject(down()); },
      policy: { maxAttempts: 1 },
      ...h,
    });
    sup.noteFailure(down("first"));
    sup.noteFailure(down("second"));
    assert.equal(sup.current, "exhausted");
    await sup.dispose();
    await assert.rejects(sup.ensureUp(), /is unreachable/, "the disposed probe returns, the gate still refuses");
    assert.equal(calls, 0, "no probe body fires after dispose");
  });

  it("a disabled policy never re-probes (submits fail fast until reload)", async () => {
    const h = harness();
    const sup = new EngineSupervisor({
      probe: () => Promise.reject(down()),
      policy: { enabled: false },
      ...h,
    });
    sup.start();
    await sup.ready;
    assert.equal(h.pending(), 0, "no backoff when disabled");
    assert.ok(h.logs.some((l) => l.includes("re-probe disabled")));
    await sup.dispose();
  });

  it("onUp fires on the down->up edge (not on unknown->up)", async () => {
    const h = harness();
    let ups = 0;
    let fail = true;
    const sup = new EngineSupervisor({
      probe: () => (fail ? Promise.reject(down()) : Promise.resolve()),
      onUp: () => { ups += 1; },
      ...h,
    });
    sup.start();
    await sup.ready;
    assert.equal(ups, 0, "unknown->up does not fire onUp");
    fail = false;
    h.fire();
    await new Promise((r) => setImmediate(r));
    assert.equal(ups, 1, "down->up fires onUp");
    await sup.dispose();
  });

// B-M10 (the wall audit, 2026-09-28, moved from the walls copy
// 2026-10-12): the harness RECORDED every cleared timer and no arm
// ever asserted the ledger — so a supervisor that armed, replaced
// and leaked handles passed every test, and "dispose quiesces"
// was a claim, never a check. Both laws are driven now, against
// the source's real semantics (a FIRED handle needs no clear —
// the callback drops it first; dispose waits for an in-flight
// probe by design).
describe("the cleared-timer ledger and dispose quiescence (B-M10)", () => {
  it("every cleared handle is one this supervisor armed, and exhaustion arms nothing", async () => {
    const t = ledgerTimers();
    const calls: string[] = [];
    const sup = new EngineSupervisor({
      probe: scriptProbe(["fail", "fail", "fail", "fail"], calls),
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
      policy: resolveSupervisorPolicy({ maxAttempts: 2 }, "supervisor"),
    });
    sup.start();
    await tick();
    assert.equal(t.timers.length, 1, "the first failure armed a retry timer");
    // drain the budget: every retry fires, fails, and re-arms until
    // the attempt count passes the ceiling — the last failure
    // exhausts the supervisor and arms NOTHING.
    let guard = 0;
    // the loop narrows sup.current to the non-exhausted arm; the
    // fired probe mutates it underneath, so read it through a
    // widened local (the annotation is the defeat, not decoration)
    let current: string = sup.current;
    while (current !== "exhausted" && guard < 10) {
      guard += 1;
      const pending = t.timers[t.timers.length - 1]!;
      const armedBefore: number = t.timers.length;
      pending.fire();
      await tick();
      await tick();
      current = sup.current;
      if (current === "exhausted") {
        assert.equal(t.timers.length, armedBefore, "exhaustion arms nothing (the budget is spent)");
      } else {
        assert.equal(t.timers.length, armedBefore + 1, "a retry within budget re-arms once");
      }
    }
    assert.equal(sup.current, "exhausted", "the budget was spent (the arm could not spin forever)");
    // THE LEDGER LAW: nothing was ever cleared that this
    // supervisor did not arm (a supervisor clearing a foreign
    // handle, or a stale one twice, is a leak of someone else's
    // timer — the bug the recording existed to catch).
    const armed = new Set(t.timers);
    const foreign = t.cleared.filter((h) => !armed.has(h as never));
    assert.deepEqual(foreign, [], "every cleared handle is one this supervisor armed");
    await sup.dispose();
  });

  it("dispose clears a PENDING armed handle and is quiescent afterwards", async () => {
    const t = ledgerTimers();
    const calls: string[] = [];
    const sup = new EngineSupervisor({
      probe: scriptProbe(["fail", "fail", "fail", "fail"], calls),
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    sup.start();
    await tick();
    const armed = t.timers.length;
    assert.ok(armed > 0, "a retry is pending at dispose time");
    const state = sup.current;
    const clearedBefore = t.cleared.length;
    await sup.dispose();
    assert.equal(t.cleared.length, clearedBefore + 1, "dispose cleared the pending handle");
    const cleared = t.cleared[t.cleared.length - 1];
    assert.ok(t.timers.includes(cleared as never), "the cleared handle was one we armed");
    assert.equal(t.timers.length, armed, "dispose armed nothing");
    // THE QUIESCENCE CLAIM: a handle that FIRES after dispose (the
    // real timer was cleared, but a fired-before-clear race, or a
    // direct call, must still be inert) moves nothing and arms
    // nothing; neither does a traffic report.
    for (const entry of t.timers) entry.fire();
    await tick();
    await tick();
    sup.noteFailure(down());
    await tick();
    assert.equal(sup.current, state, "a post-dispose fire moves no state");
    assert.equal(t.timers.length, armed, "a post-dispose fire arms no timer");
  });
});

  it("the REAL default timers ride every arm (the unref contract)", async () => {
    // No injected timers: the constructor's default arms
    // (src/supervisor.ts deps ?? lines) run, and an armed handle is
    // a real Node timer — the unref() branch at :314-317 is this
    // test's alone; every other row injects manual timers.
    const sup = new EngineSupervisor({ probe: () => Promise.reject(down()) });
    sup.start();
    const outcome = await sup.ready;
    assert.equal(outcome.ok, false);
    await sup.dispose();
  });

  it("dispose quiesces: start-after-dispose is a no-op, notes are drops", async () => {
    const h = harness();
    const sup = new EngineSupervisor({ probe: () => Promise.resolve(), ...h });
    await sup.dispose();
    sup.start();
    sup.noteSuccess();
    sup.noteFailure(down());
    assert.equal(sup.current, "unknown", "a disposed supervisor never moves");
    assert.equal(h.pending(), 0);
  });
});
