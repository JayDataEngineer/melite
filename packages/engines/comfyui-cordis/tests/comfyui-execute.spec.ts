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
import { describe, it, expect, vi } from "vitest";

let interruptCalls = 0;
let qvoicePath = "";
/** Every server the transport was constructed with — the wire's own
 *  receipt (the walls audit's H3: the old empty-override arm asserted
 *  `true` and proved nothing). */
const serverSeen: string[] = [];
let loudReading: { loudness_lufs: number; peak_db: number } | null = null;
let freshReading: { reused_existing: boolean; voice_file: string } | null = null;

vi.mock("../src/comfyui-transport.ts", () => ({
  sdkClient: (server: string) => ({
    server,
    ...(serverSeen.push(server), {}),
    clientId: "client-1",
    queuePrompt: async () => ({ prompt_id: "p-1" }),
    getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }),
    waitForPrompt: () => new Promise<void>((done) => setTimeout(done, 320)),
    interrupt: async () => {
      interruptCalls++;
    },
    on: (kind: string, fn: (d: unknown) => void) => {
      (progressHooks as Record<string, Array<(d: unknown) => void>>)[kind] ??= [];
      (progressHooks as Record<string, Array<(d: unknown) => void>>)[kind].push(fn);
      return () => {};
    },
    connect: async () => {},
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

let mapVerdict: (e: unknown) => { kind: string; detail?: string } = () => ({ kind: "completed" });
const progressHooks: Record<string, Array<(d: unknown) => void>> = {};
let closed = false;

import {
  submitPrompt,
  waitTerminal,
  hookProgress,
  executeSingle,
} from "../src/comfyui-execute.ts";
import { ComfyError } from "../src/comfyui-types.ts";
import type { Client } from "@stable-canvas/comfyui-client";

let localInterrupts = 0;

const fakeClient = (over: Partial<Record<string, unknown>> = {}): Client =>
  ({
    clientId: "client-1",
    queuePrompt: async () => ({ prompt_id: "p-1" }),
    interrupt: async () => {
      localInterrupts++;
    },
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
  const base = { getHistory: async () => ({ History: [] }), waitForPrompt: async () => {} };
  it("a completed history entry returns it", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      ...base,
      getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .resolves.toBeTruthy();
  });
  it("a failed verdict refuses with the history detail", async () => {
    mapVerdict = () => ({ kind: "failed", detail: "node 12 errored" });
    const c = fakeClient({ ...base, getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }) });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("ComfyUI run failed: node 12 errored");
  });
  it("a ComfyError from the wait rides untouched (already the estate's voice)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      waitForPrompt: async () => { throw new ComfyError("stopped (interrupt delivered)"); },
      getHistory: async () => ({ History: [] }),
    });
    localInterrupts = 0;
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("stopped");
    expect(localInterrupts).toBeGreaterThan(0);
  });
  it("a PollingTimeoutError becomes the budget voice", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const { PollingTimeoutError: PT } = await import("@stable-canvas/comfyui-client");
    const c = fakeClient({
      waitForPrompt: async () => { throw new PT(1); },
      getHistory: async () => ({ History: [] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("exceeded its budget");
  });
  it("a stranger error becomes a ComfyError (Error and non-Error causes)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c1 = fakeClient({
      waitForPrompt: async () => { throw new Error("wire died"); },
      getHistory: async () => ({ History: [] }),
    });
    await expect(waitTerminal(c1, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("wire died");
    const c2 = fakeClient({
      waitForPrompt: async () => { throw "plain string"; },
      getHistory: async () => ({ History: [] }),
    });
    await expect(waitTerminal(c2, "p-1", Date.now() + 5000, () => false))
      .rejects.toThrow("plain string");
  });
  it("not-terminal-yet loops until the verdict lands", async () => {
    let calls = 0;
    mapVerdict = () => {
      calls++;
      return calls < 2 ? { kind: "pending" } : { kind: "completed" };
    };
    const c = fakeClient({
      waitForPrompt: async () => {},
      getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false))
      .resolves.toBeTruthy();
    expect(calls).toBe(2);
  });
  it("a refused interrupt never masks the cause (best-effort)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      waitForPrompt: async () => { throw new ComfyError("stopped (interrupt delivered)"); },
      interrupt: async () => { throw new Error("interrupt refused"); },
      getHistory: async () => ({ History: [] }),
    });
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
  it("a dead engine settles LOUD with the sanctioned recovery (never sits the deadline)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      waitForPrompt: async () => { throw refused(); },
      getHistory: async () => ({ History: [] }),
    });
    localInterrupts = 0;
    const started = Date.now();
    await expect(waitTerminal(c, "p-1", Date.now() + 60_000, () => false, { streak: 3, minMs: 0 }))
      .rejects.toThrow(/engine unreachable.*restart \+ rerun sanctioned/);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(localInterrupts).toBeGreaterThan(0);
  });
  it("a lone transport failure then success never settles (transient tolerance)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    let n = 0;
    const c = fakeClient({
      waitForPrompt: async () => {
        n++;
        if (n === 1) throw refused();
      },
      getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 3, minMs: 0 }))
      .resolves.toBeTruthy();
    expect(n).toBeGreaterThan(1);
  });
  it("consecutive failures back the cadence off (250 → cap)", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const cadences: Array<unknown> = [];
    let n = 0;
    const c = fakeClient({
      waitForPrompt: async (_id: unknown, interval: unknown) => {
        cadences.push(interval);
        n++;
        if (n <= 3) throw refused();
      },
      getHistory: async () => ({ History: [{ prompt: ["x", "p-1"] }] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 99, minMs: 0, backoffCapMs: 1000 }))
      .resolves.toBeTruthy();
    expect(cadences.slice(0, 4)).toEqual([250, 500, 1000, 1000]);
  });
  it("a sick engine (timeout, no transport code) keeps the old voice — never the engine-loss settle", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      waitForPrompt: async () => { throw new Error("socket timed out"); },
      getHistory: async () => ({ History: [] }),
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 1, minMs: 0 }))
      .rejects.toThrow("socket timed out");
  });
  it("a dead history-GET feeds the same streak", async () => {
    mapVerdict = () => ({ kind: "completed" });
    const c = fakeClient({
      waitForPrompt: async () => {},
      getHistory: async () => { throw refused(); },
    });
    await expect(waitTerminal(c, "p-1", Date.now() + 5000, () => false, { streak: 2, minMs: 0 }))
      .rejects.toThrow(/engine unreachable/);
  });
});

describe("the stop probe (250ms tick)", () => {
  it("a true shouldStop verdict rejects with the interrupt voice", async () => {
    const c = fakeClient({
      waitForPrompt: () => new Promise(() => {}), // never settles
      getHistory: async () => ({ History: [] }),
    });
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
});

describe("executeSingle (the non-plugin face)", () => {
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
  it("a slow run rides ticks with the DEFAULT no-stop verdict (the ?? closure runs)", async () => {
    // the mocked sdkClient's waitForPrompt is 320ms — slower than one
    // 250ms tick: the probe's default false verdict must NOT reject
    const r = await executeSingle("/tmp/run-slow", {}, {}, {});
    expect(r.promptId).toBe("p-1");
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
});
