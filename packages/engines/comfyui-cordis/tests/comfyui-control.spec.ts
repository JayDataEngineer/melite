// comfyui-control.spec.ts — direct pins for the control plane's
// every arm: interrupt's best-effort swallow (ok + refusing
// engine), the stop core's both rows (known prompt / unknown
// runDir), unload's server resolution (override vs config), and
// the /free refusal folding into ComfyError (Error and non-Error
// causes). The transport is mocked at the sdkClient seam — the
// wire itself is the e2e tier's truth, not this spec's.
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const freeWill: { mode: "ok" | "refuse-error" | "refuse-string" } = {
  mode: "ok",
};
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

vi.mock("../src/comfyui-transport.ts", () => ({
  sdkClient: (): unknown => ({ deleteItem, interrupt: doInterrupt, free }),
}));
vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: (): string => "http://config-resolved:8188",
}));

import { interrupt, stopForRunDir, stopForRunDirInner, unloadModels, unloadModelsInner } from "../src/comfyui-control.ts";
import { ComfyError } from "../src/comfyui-types.ts";

afterEach(() => {
  calls.length = 0;
  freeWill.mode = "ok";
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
    const active = new Map([["run-1", { server: "http://e:8188", promptId: "p9" }]]);
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
    expect(calls).toEqual(["free"]);
  });
  it("an explicit override wins over the config", async () => {
    // both arms of the resolution ternary — the override path
    // must reach the same inner (observable only via free firing)
    await unloadModels("http://override:9999");
    expect(calls).toEqual(["free"]);
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
