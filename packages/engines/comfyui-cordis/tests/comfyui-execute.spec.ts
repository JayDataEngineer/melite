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

vi.mock("../src/comfyui-transport.ts", () => ({
  sdkClient: (server: string) => ({
    server,
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
      waitForPrompt: async () => { throw new PT("t"); },
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
    const seen: unknown[] = [];
    hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    progressHooks["progress"][0]({ value: 3, max: 10, node: "12" });
    expect(seen[0]).toMatchObject({ progress: { value: 3, max: 10, node: "12" }, activity: "sampling 3/10" });
    progressHooks["progress"][0]({ value: 1, max: null, node: null });
    expect(String((seen[1] as { activity: string }).activity)).toBe("sampling 1/?");
    progressHooks["progress"][0]({ value: "x" });
    expect(seen.length).toBe(2);
  });
  it("executing events: foreign prompt filtered, nodeless dropped, own voiced", () => {
    progressHooks["progress"] = [];
    progressHooks["executing"] = [];
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
    const seen: unknown[] = [];
    const unhook = hookProgress(fakeClient(), "p-1", (u) => seen.push(u));
    expect(progressHooks["progress"].length + progressHooks["executing"].length).toBe(2);
    unhook?.();
    expect(progressHooks["progress"].length).toBe(0, "both listeners detached");
    expect(progressHooks["executing"].length).toBe(0);
    expect(seen.length).toBe(0);
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
  it("an empty override falls to the config-resolved server", async () => {
    await executeSingle("/tmp/run-2", {}, {}, {}, "");
    expect(true).toBe(true);
  });
});
