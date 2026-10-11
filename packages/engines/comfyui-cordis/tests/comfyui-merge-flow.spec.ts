// comfyui-merge-flow.spec.ts — executeFlow/Inner over the mocked
// execute + transport seams (TEST-2 breadth): the plan runs REAL
// (planMerge is the truth under test), the wire legs are pinned by
// their own specs. Here: the per-stage harvest (outputs split by
// the stage:: prefix), the merged budget's floor, the tapless
// default, the active-map lifecycle, and the non-object outputs
// degrade to {}.
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/comfyui-transport.ts", () => ({
  withBound: (work: () => Promise<unknown>) => work(),
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
  // THE HARVEST SPELLING (outputs-stroke): merge rides
  // fetchOutputArtifacts (records with .path), not fetchOutputs.
  fetchOutputArtifacts: async (_c: unknown, dir: unknown) => [
    { nodeId: "save", path: String(dir) + "/out.png", kind: "images" },
  ],
  mapHistoryEntry: () => ({ kind: "completed" }),
  normalizeTimeoutS: (v: unknown) => (typeof v === "number" && v > 0 ? v : 2400),
  publishOutputChannels: (_o: unknown, arts: unknown) => ({ image: arts }),
  // THE PUBLISH ASSERT (outputs-stroke): merge asserts the published
  // channels — the loud-refusal arms live in comfyui-outputs.spec,
  // here the assert is pinned pass-through.
  assertPublishedOutputChannels: () => undefined,
  qvoicePathsOf: (outputs: unknown): string => {
    const row = (outputs as { save?: { qvoice_path?: unknown } } | undefined)?.save;
    const path = row?.qvoice_path;
    return Array.isArray(path) && typeof path[0] === "string" ? path[0] : "";
  },
  loudnessOf: (outputs: unknown): { loudness_lufs: number; peak_db: number } | null => {
    // subOutputs arrive with the stage prefix already stripped
    const row = (outputs as { save?: { loudness_lufs?: unknown } } | undefined)?.save;
    const lufs = row?.loudness_lufs;
    return Array.isArray(lufs) && typeof lufs[0] === "number" ? { loudness_lufs: lufs[0]!, peak_db: -16.3 } : null;
  },
  qvoiceFreshnessOf: (outputs: unknown): { reused_existing: boolean; voice_file: string } | null => {
    // same stripped-prefix law: the save row's ui keys
    const row = (outputs as { save?: { reused_existing?: unknown; voice_file?: unknown } } | undefined)?.save;
    const reused = row?.reused_existing;
    const file = row?.voice_file;
    return Array.isArray(reused) && typeof reused[0] === "boolean" && Array.isArray(file) && typeof file[0] === "string"
      ? { reused_existing: reused[0]!, voice_file: file[0]! }
      : null;
  },
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
          : {
              "gen::save": { images: ["a.png"], ...(qvoiceShape ? { qvoice_path: ["/voices/test.qvoice"] } : {}), ...(loudShape ? { loudness_lufs: [-20.0] } : {}), ...(freshShape ? { reused_existing: [true], voice_file: ["stale_2.qvoice"] } : {}) },
              "up::up": { images: ["b.png"] },
            },
    };
  },
  hookProgress: (...seam: unknown[]) => {
    // THE TAP-THROW RIG (audit M-S8): the merged path's tap sits
    // inside the fence too — a synchronous throw must not skip the
    // finally (close + active drop)
    if (tapThrows) throw new Error("tap died");
    // THE REAL TAP'S FIRST LAW, mirrored: no report fold, no tap
    // (null) — the replay verdict below must never read a tapless
    // run as a silent one.
    if (seam[2] === undefined) return null;
    const tap = (() => {}) as (() => void) & {
      tapAlive: () => boolean;
      tapEvents: () => number;
    };
    tap.tapAlive = () => tapAlive;
    tap.tapEvents = () => tapEvents;
    return tap;
  },
  executeSingleInner: async () => ({}),
  executeSingle: async () => ({}),
}));

let closed = false;
let tapThrows = false;
// THE REPLAY RIG (D11): the mocked tap's two readings — the verdict
// arms below drive them; the defaults (seated, silent) match the
// tapless-era mock's shape (a bare live tap).
let tapAlive = true;
let tapEvents = 0;
let qvoiceShape = false;
let loudShape = false;
let freshShape = false;
let outputsShape: "staged" | "flat" | "none" = "staged";

import { executeFlow } from "../src/comfyui-merge.ts";
import type { MergeRow } from "../src/comfyui-merge.ts";

const rows: MergeRow[] = [
  {
    stageId: "gen",
    workflow: { save: { class_type: "SaveImage", inputs: {} } },
    outputs: { image: "png" },
    outputNodes: { image: "save" },
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
  it("a synchronous throw from the progress tap still closes the client (audit M-S8 — the tap sits inside the fence)", async () => {
    closed = false;
    tapThrows = true;
    try {
      await expect(
        executeFlow(
          rows,
          "/tmp/run-merge-tap-died",
          { up: { src: "gen.image" } },
          {},
          { report: () => {} },
          "http://override:8188",
        ),
      ).rejects.toThrow(/tap died/u);
      expect(closed).toBe(true);
    } finally {
      tapThrows = false;
    }
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
  it("declared node bindings and the engine-reported qvoice path reach the stage result", async () => {
    qvoiceShape = true;
    try {
      const r = await executeFlow(rows, "/tmp/run-qvoice", { up: { src: "gen.image" } }, {});
      expect(r.stages["gen"]?.outputs["qvoice_path"]).toBe("/voices/test.qvoice");
    } finally {
      qvoiceShape = false;
    }
  });

  it("the engine's loudness reading reaches the stage result (the per-stage MeliteLoudness receipt)", async () => {
    loudShape = true;
    try {
      const r = await executeFlow(rows, "/tmp/run-loud", { up: { src: "gen.image" } }, {});
      expect(r.stages["gen"]?.outputs["loudness"]).toEqual({ loudness_lufs: -20.0, peak_db: -16.3 });
      // the loudness-free stage carries no fabricated reading
      expect("loudness" in (r.stages["up"]?.outputs ?? {})).toBe(false);
    } finally {
      loudShape = false;
    }
  });

  it("the voice freshness receipt reaches the stage result (the per-stage loudness sibling)", async () => {
    freshShape = true;
    try {
      const r = await executeFlow(rows, "/tmp/run-fresh", { up: { src: "gen.image" } }, {});
      expect(r.stages["gen"]?.outputs["voice_freshness"]).toEqual({ reused_existing: true, voice_file: "stale_2.qvoice" });
      // the freshness-free stage carries no fabricated receipt
      expect("voice_freshness" in (r.stages["up"]?.outputs ?? {})).toBe(false);
    } finally {
      freshShape = false;
    }
  });

  it("an empty override resolves through the config", async () => {
    const r = await executeFlow(rows, "/tmp/run-merge2", { up: { src: "gen.image" } }, {});
    expect(r.promptId).toBe("p-9");
  });

  it("a seated tap that folded nothing marks the run replay-suspect (D11 — the memo'd-output verdict)", async () => {
    tapAlive = true;
    tapEvents = 0;
    const r = await executeFlow(
      rows,
      "/tmp/run-replay",
      { up: { src: "gen.image" } },
      {},
      { report: () => {} },
      "http://override:8188",
    );
    expect(r.promptId).toBe("p-9");
    expect(r.replaySuspect).toBe(true);
  });
  it("one folded engine event clears the replay verdict (D11 — execution voiced itself)", async () => {
    tapAlive = true;
    tapEvents = 3;
    try {
      const r = await executeFlow(
        rows,
        "/tmp/run-voiced",
        { up: { src: "gen.image" } },
        {},
        { report: () => {} },
        "http://override:8188",
      );
      expect(r.replaySuspect).toBe(false);
    } finally {
      tapEvents = 0;
    }
  });
  it("a dead tap withholds the verdict, and a tapless run never suspects (D11 — silence without a witness is never a claim)", async () => {
    tapAlive = false;
    tapEvents = 0;
    try {
      const dead = await executeFlow(
        rows,
        "/tmp/run-dead-tap",
        { up: { src: "gen.image" } },
        {},
        { report: () => {} },
        "http://override:8188",
      );
      expect(dead.replaySuspect).toBe(false);
    } finally {
      tapAlive = true;
    }
    // no report fold: the mock mirrors the real tap's first law
    // (null) — the verdict stays down.
    const tapless = await executeFlow(rows, "/tmp/run-tapless", { up: { src: "gen.image" } }, {});
    expect(tapless.replaySuspect).toBe(false);
  });
});
