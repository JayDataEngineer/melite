// engine-supervisor.test.ts — the DSH mcp-client connection pattern
// ported to engine reachability (supervisor.ts). Pure unit suite (no
// sandbox boot): fake probe (scripted resolve/reject) + manual
// timers (captured callbacks fired by the test) + fake clock.
// Relative source import — walls have no workspace package boundary.
//
// What this pins (the pattern, adapted to stateless HTTP):
//   ready settles with the FIRST probe outcome (startup-await);
//   failures back off initial x2^n capped at max (500/30s/10);
//   uptime past the ceiling resets the budget (stability window);
//   exhaustion stops the background timer but submits re-arm;
//   down submits fail FAST with the recorded error (never wait);
//   traffic is the liveness channel (noteSuccess/noteFailure —
//   MCP keeps no ping either): transport failures drop the state,
//   successes recover it, timeouts/HTTP statuses stay neutral by
//   caller discipline (only transport errors are reported);
//   a stale in-flight probe never overrides traffic-proven state;
//   bad policy fails LOUD at construction; dispose quiesces.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/engine-supervisor.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EngineSupervisor,
  isTransportDownError,
  resolveSupervisorPolicy,
} from "../../../../packages/engines/comfyui-cordis/src/supervisor.ts";
import {
  ComfyUIHostService,
  NO_ENDPOINT_MESSAGE,
} from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";
import { Context } from "../../../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.2_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.3/node_modules/@deepseek-ai/cordis/lib/index.js";

interface ManualClock {
  timers: Array<{ delayMs: number; fire: () => void }>;
  cleared: unknown[];
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
}

function manualTimers(): ManualClock {
  const timers: Array<{ delayMs: number; fire: () => void }> = [];
  const cleared: unknown[] = [];
  const setTimer = ((fn: () => void, delayMs: number): unknown => {
    const entry = {
      delayMs,
      fire: (): void => {
        fn();
      },
    };
    timers.push(entry);
    return entry;
  }) as unknown as typeof setTimeout;
  const clearTimer = ((t: unknown): void => {
    cleared.push(t);
  }) as unknown as typeof clearTimeout;
  return { timers, cleared, setTimer, clearTimer };
}

const REFUSED = new Error("connect ECONNREFUSED 127.0.0.1:18466");

function scriptProbe(
  script: Array<"ok" | "fail">,
  calls: string[],
): () => Promise<void> {
  let n = 0;
  return (): Promise<void> => {
    calls.push("probe" + String(n));
    const step: "ok" | "fail" = script[Math.min(n, script.length - 1)] ?? "ok";
    n += 1;
    if (step === "ok") return Promise.resolve();
    return Promise.reject(REFUSED);
  };
}

async function tick(): Promise<void> {
  // Macrotask flush: the fired timer runs an async probe chain
  // (reject -> onProbeFailure -> armTimer) that pure microtask
  // hops lose the race against.
  await new Promise<void>((r) => setTimeout(r, 0));
  await new Promise<void>((r) => setTimeout(r, 0));
}

describe("resolveSupervisorPolicy fails loud", () => {
  it("rejects unknown keys, bad delays, bad attempts", () => {
    assert.throws(
      () => resolveSupervisorPolicy({ nope: 1 } as never, "supervisor"),
      /not a supervisor option/,
    );
    assert.throws(
      () => resolveSupervisorPolicy({ initialDelayMs: -5 }, "supervisor"),
      /initialDelayMs/,
    );
    assert.throws(
      () =>
        resolveSupervisorPolicy(
          { initialDelayMs: 60_000, maxDelayMs: 1_000 },
          "supervisor",
        ),
      /less than or equal/,
    );
    assert.throws(
      () => resolveSupervisorPolicy({ maxAttempts: 0 }, "supervisor"),
      /maxAttempts/,
    );
  });

  it("defaults match the MCP supervisor (500/30s/10)", () => {
    const p = resolveSupervisorPolicy(undefined, "supervisor");
    assert.equal(p.initialDelayMs, 500);
    assert.equal(p.maxDelayMs, 30_000);
    assert.equal(p.maxAttempts, 10);
    assert.equal(p.enabled, true);
  });
});

describe("isTransportDownError classification", () => {
  it("dead transports report (refused/reset/unreachable/DNS/pipe)", () => {
    for (const code of [
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "EPIPE",
    ]) {
      const err = new Error("connect " + code + " 127.0.0.1:18466") as Error & {
        code: string;
      };
      err.code = code;
      assert.equal(isTransportDownError(err), true, code);
    }
    // Message-only shape (no .code — errno prose in the text).
    assert.equal(
      isTransportDownError(new Error("connect ECONNREFUSED 127.0.0.1:18466")),
      true,
    );
  });

  it("slow/sick/alive stays neutral (never fail-fast on these)", () => {
    assert.equal(
      isTransportDownError(new Error("request timed out after 30000ms")),
      false,
    );
    const hangup = new Error("socket hang up") as Error & { code: string };
    hangup.code = "ECONNABORTED";
    assert.equal(isTransportDownError(hangup), false);
    assert.equal(
      isTransportDownError(new Error("POST /prompt 400: validation failed")),
      false,
    );
    assert.equal(isTransportDownError(new Error("boom")), false);
    assert.equal(isTransportDownError(null), false);
    assert.equal(isTransportDownError("ECONNREFUSED"), false);
  });
});

describe("ComfyUIHostService repoint (settings onChange)", () => {
  const URL_A = "http://127.0.0.1:8188";
  const URL_B = "http://127.0.0.1:18499";

  function hermeticEnv(): () => void {
    const savedUrl = process.env["COMFYUI_URL"];
    const savedCfg = process.env["COMFYUI_ENDPOINT_CONFIG"];
    const savedBox = process.env["INFERENCE_TEST_SANDBOX"];
    delete process.env["COMFYUI_URL"];
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    return (): void => {
      if (savedUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = savedUrl;
      if (savedCfg === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      else process.env["COMFYUI_ENDPOINT_CONFIG"] = savedCfg;
      if (savedBox === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
      else process.env["INFERENCE_TEST_SANDBOX"] = savedBox;
    };
  }

  function service(
    ctx: Context,
    config: { url?: string; host?: string; port?: number } = {},
  ): ComfyUIHostService {
    return new ComfyUIHostService(ctx, config);
  }

  function loudText(fn: () => unknown): string {
    try {
      fn();
    } catch (error: unknown) {
      return error instanceof Error ? error.message : String(error);
    }
    throw new Error("expected LOUD, resolved quiet");
  }

  it("empty source stays LOUD (no silent default, no fallback)", async () => {
    const ctx = new Context();
    const restore = hermeticEnv();
    try {
      assert.equal(loudText(() => service(ctx).baseUrl()), NO_ENDPOINT_MESSAGE);
    } finally {
      restore();
    }
  });

  it("unresolved repoint swaps the pin silently (registration arm)", async () => {
    const ctx = new Context();
    const s = service(ctx, { url: URL_A });
    // Registration calls onChange once with the entry value —
    // same pin, and nothing resolved yet: pure no-op, no probe.
    s.setSource(() => ({ url: URL_A }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_A);
    s.resetForTests();
  });

  it("host/port source composes the triple (no url key needed)", async () => {
    const ctx = new Context();
    const s = service(ctx);
    s.setSource(() => ({ host: "127.0.0.1", port: 18499 }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_B);
    s.resetForTests();
  });

  it("resolved + changed repoints; the switch is symmetric", async () => {
    const ctx = new Context();
    const s = service(ctx, { url: URL_A });
    assert.equal(s.baseUrl(), URL_A);
    s.setSource(() => ({ url: URL_B }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_B);
    s.setSource(() => ({ url: URL_A }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_A);
    s.resetForTests();
  });
});

describe("EngineSupervisor reachability", () => {
  it("ready ok on first-probe success; no timer armed", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: scriptProbe(["ok"], calls),
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    const outcome = await s.ready;
    assert.equal(outcome.ok, true);
    assert.equal(s.current, "up");
    assert.equal(t.timers.length, 0);
    await s.dispose();
  });

  it("ready reports the first failure; backoff starts at initial", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail", "ok"], calls),
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    const outcome = await s.ready;
    assert.equal(outcome.ok, false);
    assert.equal(s.current, "down");
    assert.equal(t.timers.length, 1);
    assert.equal(t.timers[0]?.delayMs, 500);
    await s.dispose();
  });

  it("backoff doubles per failure and caps at max", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail"], calls),
      policy: { initialDelayMs: 100, maxDelayMs: 250, maxAttempts: 100 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    await s.ready;
    t.timers[0]?.fire();
    await tick();
    assert.equal(t.timers[1]?.delayMs, 200);
    t.timers[1]?.fire();
    await tick();
    assert.equal(t.timers[2]?.delayMs, 250);
    t.timers[2]?.fire();
    await tick();
    assert.equal(t.timers[3]?.delayMs, 250);
    await s.dispose();
  });

  it("stability window resets the budget (long uptime ends the outage)", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    let now = 1_000;
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail", "ok"], calls),
      policy: { initialDelayMs: 100, maxDelayMs: 1_000, maxAttempts: 1 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
      now: () => now,
    });
    s.start();
    await s.ready;
    // Outage 1: one failure (attempt 1 of 1), then the re-probe recovers.
    t.timers[0]?.fire();
    await tick();
    assert.equal(s.current, "up");
    // Long stable uptime ends the outage. A fresh transport failure
    // must start a FRESH budget (delay back at initial, not exhausted).
    now += 5_000;
    s.noteFailure(REFUSED);
    assert.equal(s.current, "down");
    assert.equal(t.timers.length, 2);
    assert.equal(t.timers[1]?.delayMs, 100);
    await s.dispose();
  });

  it("without the stability window the budget carries (exhaustion)", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const now = 1_000;
    let exhausted = 0;
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail"], calls),
      policy: { initialDelayMs: 10, maxDelayMs: 10, maxAttempts: 2 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
      now: () => now,
      onExhausted: () => {
        exhausted += 1;
      },
    });
    s.start();
    await s.ready;
    t.timers[0]?.fire();
    await tick();
    t.timers[1]?.fire();
    await tick();
    assert.equal(s.current, "exhausted");
    assert.equal(exhausted, 1);
    assert.equal(t.timers.length, 2);
    await s.dispose();
  });

  it("exhausted submits re-arm with one fresh probe and proceed", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail", "fail", "fail", "ok"], calls),
      policy: { initialDelayMs: 10, maxDelayMs: 10, maxAttempts: 2 },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    await s.ready;
    t.timers[0]?.fire();
    await tick();
    t.timers[1]?.fire();
    await tick();
    assert.equal(s.current, "exhausted");
    const timersBefore: number = t.timers.length;
    await s.ensureUp();
    assert.equal(s.current, "up");
    assert.equal(t.timers.length, timersBefore);
    assert.deepEqual(calls, ["probe0", "probe1", "probe2", "probe3"]);
    await s.dispose();
  });

  it("down submits fail fast with the recorded error", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: scriptProbe(["fail"], calls),
      label: "comfyui",
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    await s.ready;
    await assert.rejects(s.ensureUp(), /comfyui is unreachable.*ECONNREFUSED/);
    await s.dispose();
  });

  it("unknown (first probe in flight) never blocks a submit", async () => {
    let release!: () => void;
    const gate: Promise<void> = new Promise<void>((r) => {
      release = r;
    });
    const t = manualTimers();
    const s = new EngineSupervisor({
      probe: () => gate,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    await tick();
    assert.equal(s.current, "unknown");
    await s.ensureUp();
    release();
    const outcome = await s.ready;
    assert.equal(outcome.ok, true);
    await s.dispose();
  });

  it("traffic drops and recovers the state (the liveness channel)", async () => {
    const t = manualTimers();
    const calls: string[] = [];
    let ups = 0;
    let downs = 0;
    const s = new EngineSupervisor({
      probe: scriptProbe(["ok"], calls),
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
      onUp: () => {
        ups += 1;
      },
      onDown: () => {
        downs += 1;
      },
    });
    s.start();
    await s.ready;
    assert.equal(s.current, "up");
    s.noteFailure(REFUSED);
    assert.equal(s.current, "down");
    assert.equal(downs, 1);
    s.noteSuccess();
    assert.equal(s.current, "up");
    assert.equal(ups, 1);
    await s.dispose();
  });

  it("a stale in-flight probe never overrides traffic-proven state", async () => {
    let release!: (v: "ok" | "fail") => void;
    const gate: Promise<"ok" | "fail"> = new Promise((r) => {
      release = r;
    });
    const t = manualTimers();
    const calls: string[] = [];
    const s = new EngineSupervisor({
      probe: (): Promise<void> => {
        calls.push("probe");
        return gate.then((v) => {
          if (v === "ok") return;
          throw REFUSED;
        });
      },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    s.start();
    await tick();
    // Traffic proves reachability while the first probe hangs.
    s.noteSuccess();
    assert.equal(s.current, "up");
    // The stale probe fails late: state must not move.
    release("fail");
    await tick();
    await tick();
    assert.equal(s.current, "up");
    assert.deepEqual(calls, ["probe"]);
    await s.dispose();
  });
});
