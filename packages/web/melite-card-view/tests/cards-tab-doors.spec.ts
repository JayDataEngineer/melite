// cards-tab-doors.spec.ts — the tab's door arms, second battery
// (2026-09-16 burn-down, installment 1): the fresh-read law's
// fallback arms (non-object params, cardless fresh row), the
// select-normalization keep arms (undeclared numerics ride verbatim,
// non-numerics skip), the preview-artifact junk filters + fallbacks,
// and the sequential pass's pre-aborted return. Estate verbs ride
// mountEstateFakes (the one-lane seam); fetch answers ONLY the /v1
// discovery doors.
import { describe, expect, test, afterEach, vi } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import {
  previewArtifactsFor,
  runBenchSequential,
  runCardStage,
} from "../src/client/CardsTab.tsx";
import { terminalOutcomeOf } from "../src/client/cards-resource.ts";
import { benchResultDefects } from "@melite/contracts";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { patchStageParams, resetStageWrites } from "../src/client/draft.ts";

function stage(over: Partial<BenchStageView> & { id: string }): BenchStageView {
  return { engine: "comfyui", ...over };
}

interface Call { method: string; args: Record<string, unknown> }
let calls: Call[] = [];
let fakes: { calls: Call[]; unmount: () => void } | null = null;

function stubWire(opts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes(opts);
  fakes = estate;
  calls = estate.calls;
  resetCardFamiliesCache();
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/model-catalog") {
      return new Response(JSON.stringify({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.startsWith("/v1/form-spec")) {
      return new Response(JSON.stringify({ form: "img-to-mesh", schema: schemaEnvelope({
        input_image: { type: "string", meta: { description: "Source image", extra: { wtype: "image" } } },
        resolution: { consts: ["512", "1024", "1536"], meta: { description: "Resolution" } },
      }) }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  // the write ledger is module state shared across tests in this
  // file (same discipline as the view specs): a refusal recorded by
  // one test must not refuse the next test's run.
  resetStageWrites();
  vi.unstubAllGlobals();
  resetCardFamiliesCache();
});

function startDoc(): Record<string, unknown> {
  return (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
}

describe("runCardStage — the fresh-read law's fallback arms", () => {
  test("fresh params that are no object compose empty (never a lying array)", async () => {
    stubWire({
      draftStages: [{ id: "s_1", card: "img-to-mesh", params: ["junk"] as unknown as Record<string, unknown> }],
    });
    const res = await runCardStage("bench-main", stage({ id: "s_1", card: "img-to-mesh", params: { prompt: "held" } }));
    expect(res).toEqual({ runId: "run-1" });
    // the held prompt is GONE (the fresh row won), the model rode
    expect(startDoc()).toEqual({ model: "trellis2-native", draft_id: "bench-main", test: false });
  });

  test("a fresh row naming no card refuses (the held card never overrules)", async () => {
    stubWire({
      draftStages: [{ id: "s_1", card: "", params: {} }],
    });
    const res = await runCardStage("bench-main", stage({ id: "s_1", card: "img-to-mesh", params: {} }));
    expect(res).toEqual({ refused: "this stage names no card — nothing to compose" });
    expect(calls.some((c) => c.method === "runs/start")).toBe(false);
  });
});

describe("runCardStage — the select-normalization keep arms", () => {
  test("a numeric select outside the declared options rides verbatim", async () => {
    stubWire();
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 999 },
    }));
    expect(startDoc()["resolution"]).toBe(999);
  });

  test("a non-numeric select value skips normalization untouched", async () => {
    stubWire();
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: "1024" },
    }));
    expect(startDoc()["resolution"]).toBe("1024");
  });
});

describe("previewArtifactsFor — the junk filters and the fallback chain", () => {
  test("non-string and empty artifacts filter out (never a broken thumb)", () => {
    expect(previewArtifactsFor({ result: { artifacts: { a: 42, b: "", c: "/x.png" } } }))
      .toEqual([{ name: "c", url: "/x.png" }]);
  });

  test("no artifacts: the assetUrls carry, junk filtered", () => {
    expect(previewArtifactsFor({ result: { assetUrls: ["", 7, "/a.png"] } }))
      .toEqual([{ name: "output", url: "/a.png" }]);
  });

  test("neither: the lone url carries", () => {
    expect(previewArtifactsFor({ result: { url: "/u.png" } }))
      .toEqual([{ name: "output", url: "/u.png" }]);
  });

  test("a resultless row previews nothing (never a throw)", () => {
    expect(previewArtifactsFor({})).toEqual([]);
    expect(previewArtifactsFor({ result: "junk" })).toEqual([]);
  });
});

describe("runBenchSequential — the pre-aborted pass returns empty", () => {
  test("an aborted signal before the first card runs nothing", async () => {
    stubWire();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "never" } }),
    ] };
    const res = await runBenchSequential(bench, { signal: AbortSignal.abort() });
    expect(res).toEqual({ ran: [], stoppedAt: null, refused: null });
    expect(calls).toEqual([]);
  });
});

describe("the audit's A1 — Run ALL rides the same gate (the gate lives in runCardStage, so the sequential pass inherits it)", () => {
  test("a stage whose write has not landed stops the pass with the refusal — no runs/start", async () => {
    stubWire({ patchFailures: [{ draftId: "bench-main", stageId: "s_1", delivered: false, reason: "stage not found" }] });
    await expect(patchStageParams("bench-main", "s_1", { prompt: "never" }, 5)).rejects.toThrow(/stage not found/);
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "img-to-mesh", params: {} }),
    ] };
    const res = await runBenchSequential(bench, {});
    expect(res.ran).toEqual([]);
    expect(res.stoppedAt).toEqual("s_1");
    expect(res.refused).toMatch(/THE WRITE DID NOT LAND/);
    expect(res.refused).toMatch(/unlanded keys: prompt/);
    expect(calls.some((c) => c.method === "runs/start")).toBe(false);
  });
});

describe("the audit's B2 — failure memory is per-key (an unrelated landing never lifts the refusal; the failed key landing does)", () => {
  test("unrelated success refuses; failed-key success runs", async () => {
    stubWire({ patchFailures: [{ draftId: "bench-main", stageId: "s_1", delivered: false, reason: "stage not found" }] });
    await expect(patchStageParams("bench-main", "s_1", { prompt: "never" }, 5)).rejects.toThrow(/stage not found/);
    await patchStageParams("bench-main", "s_1", { steps: 9 }, 5);
    const held = stage({ id: "s_1", card: "img-to-mesh", params: {} });
    const refused = await runCardStage("bench-main", held);
    expect("refused" in refused && refused.refused).toMatch(/unlanded keys: prompt/);
    expect(calls.some((c) => c.method === "runs/start")).toBe(false);
    await patchStageParams("bench-main", "s_1", { prompt: "now" }, 5);
    stubWire({
      draftStages: [{ id: "s_1", card: "img-to-mesh", params: {} }],
    });
    const res = await runCardStage("bench-main", held);
    expect(res).toEqual({ runId: "run-1" });
  });
});

// ── ONE FILE, ONE ARTIFACT (2026-09-20, the operator's catch:
// "why are there two rowsets under the preview image") ───────────
// The live lane served every image-gen result with the SAME png
// under two keys (the observer's legacy 'video' stamp + the
// gallery name) — the preview rendered the picture twice. These
// walls pin BOTH ends against the real bytes: the harvest renders
// legacy rows clean, and the terminal builder WRITES clean rows
// only (contract-fenced).
describe("previewArtifactsFor — one file, one artifact (the legacy live row renders clean)", () => {
  test("THE LIVE LEGACY ROW (the exact double-keyed shape the lane served): ONE artifact, the phantom 'video' name never paints", () => {
    // live receipt, bench doc rev 404, stage s_0, 2026-09-20
    expect(previewArtifactsFor({
      result: {
        run_id: "run-2f36ee24c85e-bccac24f",
        url: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
        artifacts: {
          video: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
          "generate/SaveImage.0_gen_00001_.png": "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
        },
      },
    })).toEqual([{
      name: "generate/SaveImage.0_gen_00001_.png",
      url: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
    }]);
  });

  test("a lone 'video'-keyed image retitles 'output' — the word video never paints on an image row", () => {
    expect(previewArtifactsFor({ result: { artifacts: { video: "/x/y.png" } } }))
      .toEqual([{ name: "output", url: "/x/y.png" }]);
  });

  test("distinct files stay distinct (the h3 film + windows shape)", () => {
    expect(previewArtifactsFor({ result: { artifacts: {
      "film.mp4": "/r/film.mp4", "w1.mp4": "/r/w1.mp4",
    } } })).toEqual([
      { name: "film.mp4", url: "/r/film.mp4" },
      { name: "w1.mp4", url: "/r/w1.mp4" },
    ]);
  });
});

describe("terminalOutcomeOf — the terminal row builder, contract-fenced", () => {
  test("THE IMAGE-GEN SHAPE (the real status row): ONE key per file, NO 'video' stamp, contract-clean", () => {
    const { result, terminal } = terminalOutcomeOf(
      "run-x", "completed",
      { url: "/melite-media/runs/run-x/generate/SaveImage.0_gen_00001_.png",
        gallery: [{ name: "generate/SaveImage.0_gen_00001_.png" }] },
      undefined,
    );
    expect(terminal).toBe("done");
    expect(result["artifacts"]).toEqual({
      "generate/SaveImage.0_gen_00001_.png": "/melite-media/runs/run-x/generate/SaveImage.0_gen_00001_.png",
    });
    expect(Object.keys(result["artifacts"] as Record<string, string>)).not.toContain("video");
    expect(benchResultDefects(result)).toEqual([]);
  });

  test("THE REGRESSION NEEDLE: the old builder's row (the 'video' stamp) FAILS the contract — the fence catches the disease", () => {
    const diseased = {
      run_id: "run-x",
      url: "/r/SaveImage.png",
      artifacts: { video: "/r/SaveImage.png", "SaveImage.png": "/r/SaveImage.png" },
    };
    expect(benchResultDefects(diseased)).toHaveLength(1);
    expect(benchResultDefects(diseased)[0]).toMatch(/one-file-one-key/);
  });

  test("THE H3 SHAPE (film + windows): every file once, assetUrls primary-first", () => {
    const { result } = terminalOutcomeOf(
      "run-h3", "completed",
      { url: "/runs/run-h3/film.mp4", gallery: [{ name: "film.mp4" }, { name: "win1.mp4" }] },
      undefined,
    );
    expect(result["artifacts"]).toEqual({ "film.mp4": "/melite-media/runs/run-h3/film.mp4", "win1.mp4": "/melite-media/runs/run-h3/win1.mp4" });
    expect(result["assetUrls"]).toEqual(["/runs/run-h3/film.mp4", "/melite-media/runs/run-h3/film.mp4", "/melite-media/runs/run-h3/win1.mp4"]);
    expect(benchResultDefects(result)).toEqual([]);
  });

  test("a failed run carries its reason (the silent-failure cure) and stays contract-clean", () => {
    const { result, terminal } = terminalOutcomeOf(
      "run-f", "failed",
      { error: "KSampler: model not found" },
      "engine exploded",
    );
    expect(terminal).toBe("failed");
    expect(result["error"]).toBe("KSampler: model not found");
    expect(benchResultDefects(result)).toEqual([]);
  });

  test("a DUPLICATED gallery name (an engine emitting the same file twice) lands ONE key", () => {
    const { result } = terminalOutcomeOf(
      "run-d", "completed",
      { url: "/melite-media/runs/run-d/a.png", gallery: [{ name: "a.png" }, { name: "a.png" }] },
      undefined,
    );
    expect(result["artifacts"]).toEqual({ "a.png": "/melite-media/runs/run-d/a.png" });
    expect(result["assetUrls"]).toEqual(["/melite-media/runs/run-d/a.png"]);
    expect(benchResultDefects(result)).toEqual([]);
  });

  test("a stage with no gallery and no url rides the run_id alone (contract-clean)", () => {
    const { result, terminal } = terminalOutcomeOf("run-e", "stopped", undefined, undefined);
    expect(terminal).toBe("stopped");
    expect(result).toEqual({ run_id: "run-e" });
    expect(benchResultDefects(result)).toEqual([]);
  });

  // THE REPORTS CARRY (2026-10-17, the rig-reports writer): the
  // status row's stage arrives with its mounted report sidecars;
  // the builder carries the verdict map INLINE verbatim — the same
  // object the row paints through the default atom.
  test("THE REPORTS CARRY: a mounted verdict map rides the row verbatim (contract-clean)", () => {
    const report = { kind: "report", status: "fail", title: "Rig validation",
      chips: ["CRITICAL 1"], rows: { passed: false, critical_count: 1 } };
    const { result } = terminalOutcomeOf(
      "run-r", "completed",
      { url: "/melite-media/runs/run-r/3D/rigged.glb",
        gallery: [{ name: "3D/rigged.glb" }],
        reports: { rigged: report } },
      undefined,
    );
    expect(result["reports"]).toEqual({ rigged: report });
    expect(benchResultDefects(result)).toEqual([]);
  });

  test("a degenerate reports value (not an object / array entries) never rides the row", () => {
    const str = terminalOutcomeOf("run-g", "completed", { reports: "nope" } as never, undefined).result;
    expect(str["reports"]).toBeUndefined();
    const arr = terminalOutcomeOf("run-g", "completed", { gallery: [{ name: "a.png" }],
      reports: { bad: ["not", "an", "entry"], keep: { kind: "report", status: "pass" } } }, undefined).result;
    expect(arr["reports"]).toEqual({ keep: { kind: "report", status: "pass" } });
    expect(benchResultDefects(arr)).toEqual([]);
  });

  test("a reports map with no valid entries is omitted entirely (never an empty object)", () => {
    const none = terminalOutcomeOf("run-h", "completed", {
      reports: { bad: ["x"], worse: 7 },
    }, undefined).result;
    expect(none["reports"]).toBeUndefined();
    expect(benchResultDefects(none)).toEqual([]);
  });
});
