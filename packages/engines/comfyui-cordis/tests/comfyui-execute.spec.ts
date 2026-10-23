// comfyui-execute.spec.ts — the execute core's every arm (TEST-2
// breadth, the deterministic census). The seams are mocked — the
// transport (sdkClient), the upload plane, the outputs plane, the
// config — so THIS file pins the real orchestration laws: the
// receipt law (no prompt_id refuses), the stop probe (stop
// interrupts, dispose clears the tick), the wait loop's verdict
// order (ComfyError rides, PollingTimeout becomes the budget
// voice, strangers become ComfyError), the history verdict's
// failed/completed/loop arms, the progress tap's fold (progress
// with/without max, foreign prompt_ids filtered, nodeless events
// dropped), and the execute faces' resolution order.
import { describe, it, expect, vi, beforeEach } from "vitest";

let interruptCalls = 0;
let qvoicePath = "";
/** Every server the transport was constructed with — the wire's own
 *  receipt (the walls audit's H3: the old empty-override arm asserted
 *  `true` and proved nothing). */
const serverSeen: string[] = [];
let loudReading: { loudness_lufs: number; peak_db: number } | null = null;
let freshReading: { reused_existing: boolean; voice_file: string } | null = null;
// THE VRAM GATE RIG (the prevent-oom law wall): stats answers shift
// off a queue then fall back; both doors count. Declared BEFORE the
// transport mock — the factory's lazy arrows read them at call time.
let vramStatsQueue: unknown[] = [];
let vramStatsFallback: unknown = { devices: [] };
let vramStatsCalls = 0;
const vramFreeBodies: unknown[] = [];
let submitCalls = 0;

vi.mock("../src/comfyui-transport.ts", () => ({
  // THE BOUND IS REAL HERE (2026-10-12): the salvage read rides
  // withBound — a mock that just invokes work() would leave a hung
  // engine's salvage waiting forever. Instant-settling calls (the
  // interrupt, the submit) never see the timer.
  withBound: (
    work: () => Promise<unknown>,
    boundMs?: number,
    voice?: string,
  ): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout((): void => {
        reject(new Error(String(voice ?? "the call") + " did not answer within its bound"));
      }, boundMs ?? 60_000);
      work().then(
        (value: unknown) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    }),
  sdkClient: (server: string) => ({
    server,
    ...(serverSeen.push(server), {}),
    clientId: "client-1",
    queuePrompt: async () => {
      submitCalls++;
      return { prompt_id: "p-1" };
    },
    getSystemStats: async (): Promise<unknown> => {
      vramStatsCalls++;
      return vramStatsQueue.length > 0 ? vramStatsQueue.shift() : vramStatsFallback;
    },
    free: async (body: unknown): Promise<void> => {
      vramFreeBodies.push(body);
    },
    fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
      rawWire(route, init),
    interrupt: async () => {
      interruptCalls++;
    },
    on: (kind: string, fn: (d: unknown) => void) => {
      // THE TAP-THROW RIG (audit M-S8): a synchronous throw from the
      // tap's seat must not skip the finally (close + active drop)
      if (onThrows) throw new Error("tap died");
      (progressHooks as Record<string, Array<(d: unknown) => void>>)[kind] ??= [];
      (progressHooks as Record<string, Array<(d: unknown) => void>>)[kind].push(fn);
      return () => {};
    },
    connect: async () => {
      // THE DEAD-TAP RIG (D11): a refused socket must not take the
      // run down (progress is never load-bearing) — the tap stays
      // dead and the replay verdict withholds.
      if (connectDeath !== null) throw connectDeath;
    },
    close: () => {
      closed = true;
    },
  }),
}));

vi.mock("../src/comfyui-upload.ts", () => ({
  spliceWorkflow: (params: Record<string, unknown>) => ({ graph: params, staged: true }),
  uploadReferenced: async () => ({ graph: { k: "v" } }),
}));

vi.mock("../src/comfyui-outputs.ts", () => ({
  fetchOutputs: async () => ["/v1/assets/runs/run-1/out.png"],
  mapHistoryEntry: (entry: unknown) => (mapVerdict as (e: unknown) => { kind: string; detail?: string })(entry),
  normalizeTimeoutS: (v: unknown) => (typeof v === "number" && v > 0 ? v : 2400),
  publishOutputChannels: () => ({ image: ["/v1/assets/runs/run-1/out.png"] }),
  // THE QVOICE CHANNEL: the real collector has its own wall — here
  // it stays the identity pass-through (no qvoice rides these
  // fixtures; the "" arm is the exercised one).
  qvoicePathsOf: () => qvoicePath,
  loudnessOf: () => loudReading,
  qvoiceFreshnessOf: () => freshReading,
}));

vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: () => "http://config-resolved:8188",
}));

let onThrows = false;
// THE DEAD-TAP RIG (D11): when non-null, the mocked socket refuses
// with this (thrown verbatim — a non-Error pins the warn's
// String() arm).
let connectDeath: unknown = null;
let mapVerdict: (e: unknown) => { kind: string; detail?: string } = () => ({ kind: "completed" });
const progressHooks: Record<string, Array<(d: unknown) => void>> = {};
let closed = false;

import {
  submitPrompt,
  waitTerminal,
  hookProgress,
  executeSingle,
} from "../src/comfyui-execute.ts";
import { ComfyError, activeCount } from "../src/comfyui-types.ts";
import type { Client } from "@stable-canvas/comfyui-client";

let localInterrupts = 0;

/** THE RAW-WIRE SEAM (audit P-E3's rewrite): waitTerminal polls
 *  fetchApi("/queue" | "/history") directly now — these controllables
 *  drive it. queueHasPrompt answers /queue; historyBody answers
 *  /history; wireDeath/historyDeath make the reads throw (a dead
 *  engine surfaces as a THROW, never as an empty result). */
let queueHasPrompt = true;
let historyBody: Record<string, unknown> | null = null;
let wireDeath: Error | null = null;
let historyDeath: Error | null = null;
const resetWire = (): void => {
  queueHasPrompt = true;
  historyBody = null;
  wireDeath = null;
  historyDeath = null;
};

/** The wire both client doubles ride (the vi.mock factory reaches it
 *  only through the lazy arrow below — factory time must not read
 *  these bindings). rawWireSeam lets a wall wrap it; null restores. */
let wireOverride: ((route: string, init?: { signal?: AbortSignal }) => Promise<unknown>) | null = null;
const rawWireSeam = (
  wrap: ((route: string, init?: { signal?: AbortSignal }) => Promise<unknown>) | null,
): void => {
  wireOverride = wrap;
};
const rawWire = (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
  wireOverride !== null
    ? wireOverride(route, init)
    : baseWire(route, init);
const baseWire = (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const die = (): void => reject(init?.signal?.reason ?? new Error("aborted"));
    const signal = init?.signal;
    if (signal !== undefined) {
      if (signal.aborted) return die();
      signal.addEventListener("abort", die, { once: true });
    }
    if (route.startsWith("/history")) {
      if (historyDeath !== null) return reject(historyDeath);
      return resolve({ ok: true, json: async () => historyBody ?? {} });
    }
    if (wireDeath !== null) return reject(wireDeath);
    resolve({
      ok: true,
      json: async () => (queueHasPrompt
        ? { queue_running: [{ prompt: ["x", "p-1"] }], queue_pending: [] }
        : { queue_running: [], queue_pending: [] }),
    });
  });

const fakeClient = (over: Partial<Record<string, unknown>> = {}): Client =>
  ({
    clientId: "client-1",
    queuePrompt: async () => ({ prompt_id: "p-1" }),
    interrupt: async () => {
      localInterrupts++;
    },
    fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
      rawWire(route, init),
    connect: async () => {},
    on: (kind: string, fn: (d: unknown) => void) => {
      const arr = (progressHooks as Record<string, Array<(d: unknown) => void>>)[kind] ??= [];
      arr.push(fn);
      return () => {
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      };
    },
    ...over,
  }) as unknown as Client;

describe("submitPrompt (the receipt law)", () => {
  it("a string prompt_id rides back with the client id", async () => {
    const r = await submitPrompt(fakeClient(), { n: {} });
    expect(r).toEqual({ promptId: "p-1", clientId: "client-1" });
  });
  it("no prompt_id refuses (missing or non-string)", async () => {
    await expect(submitPrompt(fakeClient({ queuePrompt: async () => ({}) }), {}))
      .rejects.toThrow("no prompt_id");
    await expect(submitPrompt(fakeClient({ queuePrompt: async () => ({ prompt_id: 7 }) }), {}))
      .rejects.toThrow(ComfyError);
  });
  it("THE SILENT-TRUNCATION REFUSAL (the red-box hunt, 2026-10-08): a 200 answer carrying node_errors REFUSES LOUD — the node, its message, and the outputs that would have silently vanished — never a success with half the artifacts", async () => {
    const dropped = {
      queuePrompt: async () => ({
        prompt_id: "p-2",
        node_errors: {
          "CheckpointLoaderSimple.0": {
            errors: [{ type: "value_not_in_list", message: "Value not in list", details: "ckpt_name: 'sam3.1_multiplex_fp16.safetensors' not in […]" }],
            dependent_outputs: ["SaveImage.0"],
            class_type: "CheckpointLoaderSimple",
          },
        },
      }),
    };
    await expect(submitPrompt(fakeClient(dropped), {}))
      .rejects.toThrow(/TRUNCATED graph.*CheckpointLoaderSimple\.0: Value not in list.*silently dropped outputs: SaveImage\.0/s);
  });
  it("an EMPTY node_errors object rides clean (the refusal fires only on dropped nodes)", async () => {
    const r = await submitPrompt(fakeClient({ queuePrompt: async () => ({ prompt_id: "p-3", node_errors: {} }) }), {});
    expect(r.promptId).toBe("p-3");
  });
  it("node error rows without errors or dependent outputs use the defensive voices", async () => {
    await expect(submitPrompt(fakeClient({
      queuePrompt: async () => ({
        prompt_id: "p-4",
        node_errors: {
          empty: { errors: [], dependent_outputs: [] },
          missing: { errors: [{}] },
        },
      }),
    }), {})).rejects.toThrow(/empty: validation error.*missing:/s);
  });
  it("a node error with a message and dependent output keeps both details", async () => {
    await expect(submitPrompt(fakeClient({
      queuePrompt: async () => ({
        prompt_id: "p-5",
        node_errors: { bad: { errors: [{ message: "bad value" }], dependent_outputs: ["Out.0"] } },
      }),
    }), {})).rejects.toThrow(/bad: bad value.*Out\.0/s);
  });
});

describe("waitTerminal (verdict order + the loop)", () => {
  beforeEach(() => {
    resetWire();
    queueHasPrompt = false;
    historyBody = { "p-1": { prompt: ["x", "p-1"], status: { completed: true } } };
    mapVerdict = () => ({ kind: "completed" });
  });
  it("a completed history entry returns it", async () => {
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .resolves.toBeTruthy();
  });
  it("a failed verdict refuses with the history detail", async () => {
    mapVerdict = () => ({ kind: "failed", detail: "node 12 errored" });
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("ComfyUI run failed: node 12 errored");
  });
  it("a ComfyError from a read rides untouched, interrupt first (already the estate's voice)", async () => {
    wireDeath = new ComfyError("the estate's own refusal");
    localInterrupts = 0;
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("the estate's own refusal");
    expect(localInterrupts).toBeGreaterThan(0);
  });
  it("a spent budget refuses the budget voice (audit P-E6: the check is OURS, before each read)", async () => {
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() - 1, () => false))
      .rejects.toThrow("exceeded its budget");
  });
  it("a stranger error becomes a ComfyError (Error and non-Error causes)", async () => {
    wireDeath = new Error("wire died");
    const c1 = fakeClient();
    await expect(waitTerminal(c1, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("wire died");
    wireDeath = "plain string" as unknown as Error;
    const c2 = fakeClient();
    await expect(waitTerminal(c2, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("plain string");
  });
  it("not-terminal-yet loops until the verdict lands (queue keeps the prompt, verdict goes pending once)", async () => {
    let calls = 0;
    mapVerdict = () => {
      calls++;
      return calls < 2 ? { kind: "pending" } : { kind: "completed" };
    };
    // first read: still in queue; the loop turns queueHasPrompt off
    // so the second iteration reads the terminal history
    let reads = 0;
    const c = fakeClient({
      fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
        new Promise((resolve) => {
          reads++;
          if (reads >= 2) queueHasPrompt = false;
          resolve({
            ok: true,
            json: async () => (route.startsWith("/history")
              ? historyBody ?? {}
              : queueHasPrompt
                ? { queue_running: [{ prompt: ["x", "p-1"] }], queue_pending: [] }
                : { queue_running: [], queue_pending: [] }),
          }) as unknown as Promise<never>;
        }),
    } as Partial<Record<string, unknown>>);
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .resolves.toBeTruthy();
    expect(calls).toBe(2);
  });
  it("a hung read breaches its bound and refuses loud (audit P-E3/E4: no blind spin)", async () => {
    const c = fakeClient({
      fetchApi: (_route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    } as Partial<Record<string, unknown>>);
    await expect(
      waitTerminal(c, "p-1", Date.now() + 60_000, () => false, { readBoundMs: 40 }),
    ).rejects.toThrow(/stopped answering its queue\/history reads/);
  });
  // THE SALVAGE READ (2026-10-12): live lane 05:46 — the queue poll
  // hung its 10s bound while the engine executed the tagger in
  // 3.16s; the old path refused a COMPLETED run. These three arms
  // pin the cure: answered-completed, answered-failed, and the
  // false-diagnosis resume.
  it("a read-bound abort salvages a completed entry — finished work is never discarded", async () => {
    const c = fakeClient({
      fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
        new Promise((resolve, reject) => {
          if (route.startsWith("/history")) {
            resolve({ ok: true, json: async () => historyBody ?? {} } as unknown as never);
            return;
          }
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    } as Partial<Record<string, unknown>>);
    await expect(
      waitTerminal(c, "p-1", Date.now() + 5_000, () => false, { readBoundMs: 40 }),
    ).resolves.toBeTruthy();
  });
  it("a salvaged FAILED entry refuses with the engine's own detail, not the bound's", async () => {
    mapVerdict = () => ({ kind: "failed", detail: "node 12 errored" });
    const c = fakeClient({
      fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
        new Promise((resolve, reject) => {
          if (route.startsWith("/history")) {
            resolve({ ok: true, json: async () => historyBody ?? {} } as unknown as never);
            return;
          }
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    } as Partial<Record<string, unknown>>);
    await expect(
      waitTerminal(c, "p-1", Date.now() + 5_000, () => false, { readBoundMs: 40 }),
    ).rejects.toThrow("ComfyUI run failed: node 12 errored");
  });
  it("a salvage that answers not-terminal resumes polling (the diagnosis was false)", async () => {
    let queueReads = 0;
    let historyReads = 0;
    const c = fakeClient({
      fetchApi: (route: string, init?: { signal?: AbortSignal }): Promise<unknown> =>
        new Promise((resolve, reject) => {
          if (route.startsWith("/history")) {
            historyReads++;
            // the salvage finds no entry yet; the resumed loop's
            // verdict read finds the terminal one
            const body = historyReads === 1 ? {} : historyBody ?? {};
            resolve({ ok: true, json: async () => body } as unknown as never);
            return;
          }
          queueReads++;
          if (queueReads === 1) {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
            return;
          }
          resolve({
            ok: true,
            json: async () => ({ queue_running: [], queue_pending: [] }),
          } as unknown as never);
        }),
    } as Partial<Record<string, unknown>>);
    await expect(
      waitTerminal(c, "p-1", Date.now() + 5_000, () => false, { readBoundMs: 40 }),
    ).resolves.toBeTruthy();
    expect(queueReads).toBe(2);
    expect(historyReads).toBe(2);
  });
  it("a refused interrupt never masks the cause (best-effort)", async () => {
    wireDeath = new ComfyError("stopped (interrupt delivered)");
    const c = fakeClient({ interrupt: async () => { throw new Error("interrupt refused"); } });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("stopped");
  });
});

describe("hookProgress (the additive tap)", () => {
  it("no report fold: no tap (null)", () => {
    expect(hookProgress(fakeClient(), "p-1", undefined)).toBeNull();
  });
  it("progress events fold value/max/node + activity", () => {
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    const seen: unknown[] = [];
    hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    progressHooks["progress"][0]({ value: 3, max: 10, node: "12" });
    expect(seen[0]).toMatchObject({ progress: { value: 3, max: 10, node: "12" }, activity: "sampling 3/10" });
    progressHooks["progress"][0]({ value: 1, max: null, node: null });
    expect(String((seen[1] as { activity: string }).activity)).toBe("sampling 1/?");
    progressHooks["progress"][0]({ value: "x" });
    progressHooks["progress_text"][0]({ nodeId: "12", text: "loading text encoder" });
    expect(seen[2]).toEqual({ activity: "loading text encoder" });
    progressHooks["progress_text"][0]({ nodeId: "12", text: "" });
    expect(seen.length).toBe(3);
  });
  it("executing events: foreign prompt filtered, nodeless dropped, own voiced", () => {
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    const seen: unknown[] = [];
    hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    // a FOREIGN prompt_id is filtered; an ABSENT prompt_id is not
    // prompt-specific — it rides; a nodeless event is silent
    progressHooks["executing"][0]({ prompt_id: "other", node: "5" });
    progressHooks["executing"][0]({ prompt_id: null, node: "6" });
    progressHooks["executing"][0]({ prompt_id: undefined, node: null });
    progressHooks["executing"][0]({ prompt_id: "p-1" });
    progressHooks["executing"][0]({ prompt_id: "p-1", node: "7" });
    expect(seen.length).toBe(2);
    expect((seen[0] as { activity: string }).activity).toBe("node 6");
    expect((seen[1] as { activity: string }).activity).toBe("node 7");
  });
  it("the unhook retires the tap", () => {
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    const seen: unknown[] = [];
    const unhook = hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    expect(
      progressHooks["progress"].length
        + progressHooks["executing"].length
        + progressHooks["progress_text"].length,
    ).toBe(3);
    unhook?.();
    expect(progressHooks["progress"].length).toBe(0);
    expect(progressHooks["executing"].length).toBe(0);
    expect(progressHooks["progress_text"].length).toBe(0);
    expect(seen.length).toBe(0);
  });
});

describe("the engine-loss arm (roadmap §21: settle fast, never sit the deadline)", () => {
  const refused = (): Error =>
    Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8188"), { code: "ECONNREFUSED" });
  beforeEach(() => {
    resetWire();
    queueHasPrompt = false;
    historyBody = { "p-1": { prompt: ["x", "p-1"], status: { completed: true } } };
    mapVerdict = () => ({ kind: "completed" });
  });
  it("a dead engine settles LOUD with the sanctioned recovery (audit P-E3: the raw read THROWS — never a swallowed empty)", async () => {
    wireDeath = refused();
    localInterrupts = 0;
    const started = Date.now();
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 60_000, () => false, { streak: 3, minMs: 0 }))
      .rejects.toThrow(/engine unreachable.*restart \+ rerun sanctioned/);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(localInterrupts).toBeGreaterThan(0);
  });
  it("a lone transport failure then success never settles (transient tolerance)", async () => {
    let n = 0;
    const c = fakeClient({
      fetchApi: (route: string): Promise<unknown> => {
        n++;
        if (n === 1) return Promise.reject(refused());
        return Promise.resolve({
          ok: true,
          json: async () => (route.startsWith("/history")
            ? historyBody ?? {}
            : { queue_running: [], queue_pending: [] }),
        }) as unknown as Promise<never>;
      },
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 3, minMs: 0 }))
      .resolves.toBeTruthy();
    expect(n).toBeGreaterThan(1);
  });
  it("a dead history read feeds the same streak", async () => {
    historyDeath = refused();
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 2, minMs: 0 }))
      .rejects.toThrow(/engine unreachable/);
  });
  it("a sick engine (timeout, no transport code) keeps the generic voice — never the engine-loss settle", async () => {
    wireDeath = new Error("socket timed out");
    const c = fakeClient();
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 1, minMs: 0 }))
      .rejects.toThrow("socket timed out");
  });
});

describe("the stop probe (250ms tick)", () => {
  beforeEach(() => {
    resetWire();
    historyBody = { "p-1": { prompt: ["x", "p-1"], status: { completed: true } } };
  });
  it("a true shouldStop verdict rejects with the interrupt voice", async () => {
    const c = fakeClient();
    const p = waitTerminal(c, "p-1", Date.now() + 10000, () => true);
    // the probe fires within one 250ms tick
    await expect(p).rejects.toThrow("stopped (interrupt delivered)");
  });
});

describe("connect refused (progress never load-bearing)", () => {
  it("a refused socket stays silent — the tap still works", () => {
    const seen: unknown[] = [];
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    const c = fakeClient({ connect: () => Promise.reject(new Error("no ws")) });
    const unhook = hookProgress(c, "p-1", (u) => seen.push(u));
    expect(unhook).toBeTruthy(); // the hook exists even if connect refuses
    unhook?.();
  });
  it("the tap reports its own liveness: dead before the socket seats, alive after, dead on refusal (D11)", async () => {
    const live = hookProgress(fakeClient(), "p-1", () => {});
    expect(live?.tapAlive()).toBe(false); // the socket has not seated yet
    await Promise.resolve();
    await Promise.resolve();
    expect(live?.tapAlive()).toBe(true);
    live?.();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const dead = hookProgress(
        fakeClient({ connect: () => Promise.reject(new Error("no ws")) }),
        "p-1",
        () => {},
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(dead?.tapAlive()).toBe(false);
      // THE VOICED TAP (D11): the refusal rides the lane log — never
      // silent again.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("progress tap unavailable"),
        expect.anything(),
      );
      dead?.();
    } finally {
      warn.mockRestore();
    }
  });
  it("the tap counts folded engine events only — dropped events never count (D11)", () => {
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    const seen: unknown[] = [];
    const tap = hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    expect(tap?.tapEvents()).toBe(0);
    progressHooks["progress"][0]({ value: 3, max: 10, node: "12" });
    expect(tap?.tapEvents()).toBe(1);
    progressHooks["progress"][0]({ value: "x" }); // dropped: no number
    progressHooks["executing"][0]({ prompt_id: "other", node: "5" }); // dropped: foreign
    progressHooks["executing"][0]({ prompt_id: null, node: null }); // dropped: nodeless
    expect(tap?.tapEvents()).toBe(1);
    progressHooks["executing"][0]({ prompt_id: "p-1", node: "7" });
    progressHooks["progress_text"][0]({ nodeId: "7", text: "" }); // dropped: empty
    expect(tap?.tapEvents()).toBe(2);
    progressHooks["progress_text"][0]({ nodeId: "7", text: "loading" });
    expect(tap?.tapEvents()).toBe(3);
    expect(seen.length).toBe(3);
    tap?.();
  });
  it("a non-Error refusal still voices (the warn's String() arm — D11)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tap = hookProgress(
        fakeClient({ connect: () => Promise.reject("hung up") }),
        "p-1",
        () => {},
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(tap?.tapAlive()).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("progress tap unavailable"),
        "hung up",
      );
      tap?.();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("executeSingle (the non-plugin face)", () => {
  beforeEach(() => {
    resetWire();
    queueHasPrompt = false;
    connectDeath = null;
    historyBody = { "p-1": { prompt: ["x", "p-1"], status: { completed: true } } };
  });
  it("rides the inner path, resolves the server, closes the client, clears active", async () => {
    closed = false;
    const r = await executeSingle(
      "/tmp/run-1",
      { timeout_s: 10 },
      {},
      { report: () => {} },
      "http://override:8188",
    );
    expect(r.promptId).toBe("p-1");
    expect(r.artifacts).toEqual(["/v1/assets/runs/run-1/out.png"]);
    expect((r.outputs as Record<string, unknown>)["prompt_id"]).toBe("p-1");
    expect((r.outputs as Record<string, unknown>)["image"]).toBeTruthy();
    expect(closed).toBe(true);
  });
  it("a synchronous throw from the progress tap still closes the client and clears active (audit M-S8 — the tap sits inside the fence)", async () => {
    closed = false;
    onThrows = true;
    try {
      await expect(
        executeSingle("/tmp/run-tap-died", { timeout_s: 10 }, {}, { report: () => {} }, "http://override:8188"),
      ).rejects.toThrow(/tap died/u);
      expect(closed).toBe(true);
      expect(activeCount()).toBe(0);
    } finally {
      onThrows = false;
    }
  });
  it("a slow run rides ticks with the DEFAULT no-stop verdict (the ?? closure runs)", async () => {
    // the mocked engine holds the prompt past one 250ms read tick
    // before completing: the probe's default false verdict must NOT
    // reject while the run is still queued.
    let reads = 0;
    rawWireSeam((route, init) => {
      reads++;
      if (route.startsWith("/queue") && reads >= 2) queueHasPrompt = false;
      return baseWire(route, init);
    });
    try {
      const r = await executeSingle("/tmp/run-slow", {}, {}, {});
      expect(r.promptId).toBe("p-1");
      expect(reads).toBeGreaterThanOrEqual(2);
    } finally {
      rawWireSeam(null);
    }
  });
  it("an empty override falls to the CONFIG-RESOLVED server (the walls audit's H3 — `expect(true)` proved nothing)", async () => {
    // The old arm ran the call and asserted true: an empty override
    // passed VERBATIM to the SDK (or the config resolution was
    // dropped) and the arm stayed green. The transport mock's own
    // receipt is the oracle: the server the seat handed the SDK must
    // be the config's endpoint, never the empty string.
    serverSeen.length = 0;
    await executeSingle("/tmp/run-2", {}, {}, {}, "");
    expect(serverSeen.length, "the transport was constructed").toBeGreaterThan(0);
    for (const server of serverSeen) {
      expect(server, "the empty override never reached the SDK verbatim").not.toBe("");
    }
    // and a NON-empty override DOES reach it (the other half: the
    // receipt is live, not a formality)
    serverSeen.length = 0;
    await executeSingle("/tmp/run-3", {}, {}, {}, "http://override:8188");
    expect(serverSeen).toContain("http://override:8188");
  });
  it("carries a non-empty engine qvoice path into the result", async () => {
    qvoicePath = "/mnt/data/models/audio/voices/demo.qvoice";
    try {
      const r = await executeSingle("/tmp/run-qvoice", {}, {}, {}, "http://override:8188");
      expect((r.outputs as Record<string, unknown>)["qvoice_path"]).toBe(qvoicePath);
    } finally {
      qvoicePath = "";
    }
  });
  it("stamps the engine's loudness reading onto the outputs (the MeliteLoudness receipt seat)", async () => {
    loudReading = { loudness_lufs: -20.0, peak_db: -16.3 };
    try {
      const r = await executeSingle("/tmp/run-loud", {}, {}, {}, "http://override:8188");
      expect((r.outputs as Record<string, unknown>)["loudness"]).toEqual(loudReading);
    } finally {
      loudReading = null;
    }
  });
  it("stamps the voice freshness receipt onto the outputs (the loudness sibling — reused_existing never thrown away again)", async () => {
    freshReading = { reused_existing: false, voice_file: "tide_meter_14_harbour_watchman_2.qvoice" };
    try {
      const r = await executeSingle("/tmp/run-fresh", {}, {}, {}, "http://override:8188");
      expect((r.outputs as Record<string, unknown>)["voice_freshness"]).toEqual(freshReading);
    } finally {
      freshReading = null;
    }
  });
  it("a seated tap that folded nothing marks the run replay-suspect (D11 — the memo'd-output verdict)", async () => {
    // the mocked engine completes with NO ws events at all: the
    // verdict must read suspect, never clean-by-silence.
    const r = await executeSingle(
      "/tmp/run-replay",
      { timeout_s: 10 },
      {},
      { report: () => {} },
      "http://override:8188",
    );
    expect(r.promptId).toBe("p-1");
    expect(r.replaySuspect).toBe(true);
  });
  it("one folded engine event clears the replay verdict (D11 — execution voiced itself)", async () => {
    // the event arrives MID-RUN: the seam fires the tap's newest
    // progress hook on the first queue read, before settlement.
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
    progressHooks["progress_text"] = [];
    let fired = false;
    rawWireSeam((route, init) => {
      if (!fired) {
        fired = true;
        progressHooks["progress"][0]({ value: 1, max: 2, node: "1" });
      }
      return baseWire(route, init);
    });
    try {
      const r = await executeSingle(
        "/tmp/run-voiced",
        { timeout_s: 10 },
        {},
        { report: () => {} },
        "http://override:8188",
      );
      expect(fired).toBe(true);
      expect(r.replaySuspect).toBe(false);
    } finally {
      rawWireSeam(null);
    }
  });
  it("a dead tap withholds the verdict on the single path too (D11 — silence without a witness is never a claim)", async () => {
    // the socket refuses, the run still settles on the polls
    // (progress is never load-bearing — proven here, not assumed),
    // and the verdict stays down: a dead tap never suspects.
    connectDeath = new Error("no ws");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const r = await executeSingle(
        "/tmp/run-dead-tap",
        { timeout_s: 10 },
        {},
        { report: () => {} },
        "http://override:8188",
      );
      expect(r.promptId).toBe("p-1");
      expect(r.replaySuspect).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("progress tap unavailable"),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("executeSingle × THE VRAM HEADROOM GATE (the prevent-oom law, 2026-10-23)", () => {
  const MB = 1024 * 1024;
  const stats = (freeMb: number): unknown => ({
    devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: freeMb * MB }],
  });
  beforeEach(() => {
    resetWire();
    queueHasPrompt = false;
    connectDeath = null;
    historyBody = { "p-1": { prompt: ["x", "p-1"], status: { completed: true } } };
    vramStatsQueue = [];
    vramStatsFallback = stats(20_000);
    vramStatsCalls = 0;
    vramFreeBodies.length = 0;
    submitCalls = 0;
  });
  it("no vram_budget_mb knob: the gate stays silent — getSystemStats never called, the run submits (back-compat law)", async () => {
    const r = await executeSingle("/tmp/run-no-vram", { timeout_s: 10 }, {}, {}, "http://override:8188");
    expect(r.promptId).toBe("p-1");
    expect(vramStatsCalls).toBe(0);
    expect(vramFreeBodies).toHaveLength(0);
  });
  it("a declared budget headroom proves: the run submits, /free never fired", async () => {
    const r = await executeSingle(
      "/tmp/run-vram-ok",
      { timeout_s: 10, vram_budget_mb: 13500 },
      {},
      {},
      "http://override:8188",
    );
    expect(r.promptId).toBe("p-1");
    expect(vramFreeBodies).toHaveLength(0);
    expect(submitCalls).toBe(1);
  });
  it("a budget the engine cannot prove REFUSES BEFORE SUBMIT — queuePrompt never reached, the voice names headroom vs budget and the reclaim", async () => {
    // short probe → /free → three re-probes still short (the burn:
    // engine cache 10.26 GiB resident, the estimator needing ~12.9).
    vramStatsQueue = [stats(9_000), stats(9_500), stats(9_600), stats(9_700)];
    await expect(
      executeSingle("/tmp/run-vram-refuse", { timeout_s: 10, vram_budget_mb: 13500 }, {}, {}, "http://override:8188"),
    ).rejects.toThrow(/refusing rather than OOM at run time.*9700 MiB free.*13500 MiB/s);
    expect(submitCalls, "the refusal fires BEFORE the engine queues anything").toBe(0);
    expect(vramFreeBodies).toEqual([{ unload_models: true, free_memory: true }]);
  });
});
