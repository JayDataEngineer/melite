// comfyui-control.spec.ts — direct pins for the control plane's
// every arm: interrupt's best-effort swallow (ok + refusing
// engine), the stop core's both rows (known prompt / unknown
// runDir), unload's server resolution (override vs config), the
// /free refusal folding into ComfyError (Error and non-Error
// causes), and the NEW-3 warmed-seat chain (release_warmed fires
// after native /free, tolerates a pack-less engine, never fires
// after a refused /free). The transport is mocked at the sdkClient
// seam — the wire itself is the e2e tier's truth, not this spec's.
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const freeWill: { mode: "ok" | "refuse-error" | "refuse-string" } = {
  mode: "ok",
};
const releaseWill: { mode: "ok" | "no-pack" } = { mode: "ok" };
const deleteItem = vi.fn(async (): Promise<void> => {
  calls.push("delete");
});
const doInterrupt = vi.fn(async (): Promise<void> => {
  calls.push("interrupt");
});
const free = vi.fn(async (): Promise<void> => {
  if (freeWill.mode === "refuse-error") throw new Error("engine 502");
  if (freeWill.mode === "refuse-string") throw "plain string";
  calls.push("free");
});
const fetchApi = vi.fn(async (path: string): Promise<Response> => {
  if (path === "/audiocore/release_warmed") {
    if (releaseWill.mode === "no-pack") throw new Error("404 no route");
    calls.push("release_warmed");
    return new Response('{"released":0}', { status: 200 });
  }
  throw new Error(`unexpected fetchApi path ${path}`);
});

vi.mock("../src/comfyui-transport.ts", () => ({
  withBound: (work: () => Promise<unknown>) => work(),
  sdkClient: (): unknown => ({ deleteItem, interrupt: doInterrupt, free, fetchApi }),
}));
vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: (): string => "http://config-resolved:8188",
}));

import { interrupt, stopForRunDir, stopForRunDirInner, unloadModels, unloadModelsInner } from "../src/comfyui-control.ts";
import { ComfyError } from "../src/comfyui-types.ts";

afterEach(() => {
  calls.length = 0;
  freeWill.mode = "ok";
  releaseWill.mode = "ok";
  vi.clearAllMocks();
});

describe("interrupt (delete-from-queue + interrupt, best-effort)", () => {
  it("a healthy engine: delete then interrupt, in order", async () => {
    await interrupt("http://e:8188", "pid-1");
    expect(calls).toEqual(["delete", "interrupt"]);
  });
  it("a refusing engine: swallowed (audited <6s), never rethrown", async () => {
    deleteItem.mockRejectedValueOnce(new Error("gone"));
    await expect(interrupt("http://e:8188", "pid-2")).resolves.toBeUndefined();
  });
});

describe("stopForRunDirInner (the stop core)", () => {
  it("a known runDir interrupts its recorded prompt", async () => {
    const active = new Map([["run-1", { server: "http://e:8188", promptId: "p9", clientId: "c9" }]]);
    await stopForRunDirInner("run-1", active);
    expect(calls).toEqual(["delete", "interrupt"]);
  });
  it("an unknown runDir is a no-op (nothing to stop)", async () => {
    await stopForRunDirInner("run-none", new Map());
    expect(calls).toEqual([]);
  });
});

describe("stopForRunDir (the non-plugin wrapper over the live ACTIVE map)", () => {
  it("a runDir absent from the live map is a documented no-op", async () => {
    await expect(stopForRunDir("run-not-in-map")).resolves.toBeUndefined();
    expect(calls).toEqual([]);
  });
});

describe("unloadModels (server resolution + the /free door)", () => {
  it("no override: the config-resolved engine", async () => {
    await unloadModels();
    expect(calls).toEqual(["free", "release_warmed"]);
  });
  it("an explicit override wins over the config", async () => {
    // both arms of the resolution ternary — the override path
    // must reach the same inner (observable only via free firing)
    await unloadModels("http://override:9999");
    expect(calls).toEqual(["free", "release_warmed"]);
  });
  it("NEW-3: the warmed-seat chain fires AFTER native /free, in order", async () => {
    await unloadModelsInner("http://e:8188");
    expect(calls, "one free door drops both seat classes: core-tracked first, the qwen3 warmed seats second")
      .toEqual(["free", "release_warmed"]);
  });
  it("NEW-3: a pack-less engine (route 404) never fails the unload", async () => {
    releaseWill.mode = "no-pack";
    await expect(unloadModelsInner("http://e:8188")).resolves.toBeUndefined();
    expect(calls, "the native /free succeeded — the tolerant chain must not convert it into a refusal")
      .toEqual(["free"]);
  });
  it("NEW-3: a refused /free stays loud AND never chains the release", async () => {
    freeWill.mode = "refuse-error";
    await expect(unloadModelsInner("http://e:8188")).rejects.toThrow(ComfyError);
    expect(calls, "nothing released when the engine refused the unload itself")
      .toEqual([]);
  });
  it("inner: a refusing engine folds into ComfyError (Error cause)", async () => {
    freeWill.mode = "refuse-error";
    await expect(unloadModelsInner("http://e:8188")).rejects.toThrow(ComfyError);
    await expect(unloadModelsInner("http://e:8188")).rejects.toThrow(/engine 502/);
  });
  it("inner: a non-Error cause folds through String (the loud arm)", async () => {
    freeWill.mode = "refuse-string";
    await expect(unloadModelsInner("http://e:8188")).rejects.toThrow(/plain string/);
  });
});
