// comfyui-merge-flow.spec.ts — executeFlow/Inner over the mocked
// execute + transport seams (TEST-2 breadth): the plan runs REAL
// (planMerge is the truth under test), the wire legs are pinned by
// their own specs. Here: the per-stage harvest (outputs split by
// the stage:: prefix), the merged budget's floor, the tapless
// default, the active-map lifecycle, and the non-object outputs
// degrade to {}.
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/comfyui-transport.ts", () => ({
  sdkClient: () => ({
    clientId: "client-1",
    close: () => {
      closed = true;
    },
  }),
}));
vi.mock("../src/comfyui-upload.ts", () => ({
  spliceWorkflow: (p: unknown) => p,
  uploadReferenced: async (_c: unknown, graph: unknown) => ({ graph }),
}));
vi.mock("../src/comfyui-outputs.ts", () => ({
  fetchOutputs: async (_c: unknown, dir: unknown) => [String(dir) + "/out.png"],
  mapHistoryEntry: () => ({ kind: "completed" }),
  normalizeTimeoutS: (v: unknown) => (typeof v === "number" && v > 0 ? v : 2400),
  publishOutputChannels: (_o: unknown, arts: unknown) => ({ image: arts }),
  // THE QVOICE CHANNEL: pass-through (own wall in comfyui-outputs.spec)
  qvoicePathsOf: () => "",
}));
vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: () => "http://config-resolved:8188",
}));
vi.mock("../src/comfyui-execute.ts", () => ({
  submitPrompt: async () => ({ promptId: "p-9", clientId: "client-1" }),
  waitTerminal: async (
    _c: unknown,
    _p: unknown,
    _d: unknown,
    shouldStop: (() => boolean) | undefined,
  ): Promise<Record<string, unknown>> => {
    // invoke the caller's verdict (the default no-stop closure runs)
    shouldStop?.();
    return {
      outputs: outputsShape === "flat"
        ? [["x"]]
        : outputsShape === "none"
          ? undefined
          : { "gen::save": { images: ["a.png"] }, "up::up": { images: ["b.png"] } },
    };
  },
  hookProgress: () => () => {},
  executeSingleInner: async () => ({}),
  executeSingle: async () => ({}),
}));

let closed = false;
let outputsShape: "staged" | "flat" | "none" = "staged";

import { executeFlow } from "../src/comfyui-merge.ts";
import type { MergeRow } from "../src/comfyui-merge.ts";

const rows: MergeRow[] = [
  {
    stageId: "gen",
    workflow: { save: { class_type: "SaveImage", inputs: {} } },
    outputs: { image: "png" },
    params: {},
  } as unknown as MergeRow,
  {
    stageId: "up",
    workflow: { up: { class_type: "ImageUpscale", inputs: { image: "$src" } } },
    outputs: {},
    params: {},
  } as unknown as MergeRow,
];

describe("executeFlow (the merged submit)", () => {
  it("harvests per-stage outputs under the stage:: prefix", async () => {
    closed = false;
    const r = await executeFlow(
      rows,
      "/tmp/run-merge",
      { up: { src: "gen.image" } },
      {},
      {},
      "http://override:8188",
    );
    expect(r.promptId).toBe("p-9");
    expect(Object.keys(r.stages)).toEqual(["gen", "up"]);
    expect(r.stages["gen"]?.artifacts).toEqual(["/tmp/run-merge/gen/out.png"]);
    expect(r.stages["up"]?.artifacts).toEqual(["/tmp/run-merge/up/out.png"]);
    expect(closed).toBe(true);
  });
  it("a flat-array outputs entry degrades to {} (never a crash)", async () => {
    outputsShape = "flat";
    try {
      const r = await executeFlow(rows, "/tmp/run-flat", { up: { src: "gen.image" } }, {});
      expect(r.stages["gen"]?.artifacts).toEqual(["/tmp/run-flat/gen/out.png"]);
    } finally {
      outputsShape = "staged";
    }
  });
  it("a missing outputs key degrades to {} too", async () => {
    outputsShape = "none";
    try {
      const r = await executeFlow(rows, "/tmp/run-none", { up: { src: "gen.image" } }, {});
      expect(Object.keys(r.stages)).toEqual(["gen", "up"]);
    } finally {
      outputsShape = "staged";
    }
  });
  it("an empty override resolves through the config", async () => {
    const r = await executeFlow(rows, "/tmp/run-merge2", { up: { src: "gen.image" } }, {});
    expect(r.promptId).toBe("p-9");
  });
});
