// runs-hero.spec.ts — THE DECLARED HERO (the mask hero defect,
// 2026-10-09): the history/preview hero is gallery[0] (engine
// completion order) — a card that saves secondary same-kind
// artifacts (the mask card's manifest photo beside mask_combined)
// declares its product stem on the DECL (primaryFile) and the
// match moves first. Pure arms only (declaredPrimaryFirst); the
// runOne glue reads the run's cardId against the cached defs.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import type { RunRecord } from "../src/runsTypes.ts";
import { declaredPrimaryFirst, runOne } from "../src/runsExecute.ts";

class FakeEngine extends ComfyUIHostService {
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });

  constructor(ctx: Context) {
    super(ctx, {});
  }

  override executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    return this.onFlow(rows, runDir, inputNames, initials, opts);
  }
}

const runWithCard = (cardId: string): RunRecord => ({
  runId: "run-hero-00000000-00000000",
  status: "queued",
  stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: "d",
  dir: "/tmp/run-hero",
  testFlag: false,
  stopFlag: false,
  params: [{ workflow: { "1": { class_type: "X", inputs: {} } } }],
  outputNodes: [{}],
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
  cardId,
});

describe("declaredPrimaryFirst (the declared hero)", () => {
  it("the declared stem moves first (the mask shape: manifest finished first, product leads)", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_manifest_00001_.png", "mask/mask_combined_00001_.png", "mask/instance_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_combined leads the gallery");
    assert.deepEqual(
      [...out].sort(),
      ["mask/mask_combined_00001_.png", "mask/instance_00001_.png", "mask/mask_manifest_00001_.png"].sort(),
      "the reorder drops nothing",
    );
  });

  it("no stem (or an empty stem) keeps engine order (inline flows + undeclared cards)", () => {
    const names = ["b.png", "a.png"];
    assert.deepEqual(declaredPrimaryFirst(names, undefined), names, "undefined = engine order");
    assert.deepEqual(declaredPrimaryFirst(names, ""), names, "empty = engine order");
  });

  it("no match keeps engine order (never a reorder into nothing)", () => {
    const names = ["mask/mask_manifest_00001_.png", "mask/instance_00001_.png"];
    assert.deepEqual(declaredPrimaryFirst(names, "mask_combined"), names, "a missing hero changes nothing");
  });

  it("an exact or extension stem matches (stem + counter is the engine shape)", () => {
    assert.deepEqual(declaredPrimaryFirst(["b.png", "hero.png"], "hero"), ["hero.png", "b.png"], "exact stem");
    assert.deepEqual(declaredPrimaryFirst(["b.png", "herox_00001_.png"], "hero"), ["b.png", "herox_00001_.png"], "the underscore boundary holds (a longer stem never steals the hero)");
  });

  it("a same-stem figure never steals the product hero", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_figure_2_00001_.png", "mask/mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_figure_2 starts with mask_ but not mask_combined_");
  });

  it("THE AUDIT'S G8: a stem-sharing LONGER name (the union) never steals the hero — the counter must be digits", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_combined_union_00001_.png", "mask/mask_figure_1_00001_.png", "mask/mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_combined_union shares the stem but the char after 'mask_combined_' is 'u', not a digit — the exact product stays the hero even ordered LAST");
    assert.equal(out[1], "mask/mask_combined_union_00001_.png", "the union rides beside, never above");
    // and the digit rule still catches the engine counter shape
    const digits = declaredPrimaryFirst(["a.png", "mask/mask_combined_00002_.png"], "mask_combined");
    assert.equal(digits[0], "mask/mask_combined_00002_.png", "stem + digit counter still matches");
  });

  it("THE LIVE SEAM-PROOF'S CATCH (2026-10-09): HARVEST-PREFIXED names — a subfoldered save prefix makes the artifact 'SaveImage.1_mask_combined_00001_.png' — the stem is a bounded TOKEN, never a basename prefix", () => {
    const names = [
      "SaveImage.0_instance_00001_.png",
      "SaveImage.0_instance_00002_.png",
      "SaveImage.1_mask_combined_00001_.png",
    ];
    const out = declaredPrimaryFirst(names, "mask_combined");
    assert.equal(out[0], "SaveImage.1_mask_combined_00001_.png", "the productId leads even from behind a nodeId harvest prefix — engine order alone put the crops first (the defect the seam-proof caught live)");
    // the union stays rejected in the prefixed shape too
    const union = declaredPrimaryFirst(
      ["SaveImage.2_mask_combined_union_00001_.png", "SaveImage.1_mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(union[0], "SaveImage.1_mask_combined_00001_.png", "prefixed union never steals");
    // stem as a bare token still matches (no prefix, no counter)
    assert.equal(declaredPrimaryFirst(["x.png", "mask_combined.png"], "mask_combined")[0], "mask_combined.png", "bare stem + ext");
  });
});

describe("runOne declared-card artifact ordering", () => {
  it("a semantic output binding leads the gallery over engine completion order", async () => {
    const ctx = new Context();
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: {
        s: {
          outputs: { default: "/tmp/run-hero/film.mp4" },
          artifacts: ["/tmp/run-hero/mix.flac", "/tmp/run-hero/window.mp4", "/tmp/run-hero/film.mp4"],
        },
      },
      promptId: "p",
    });
    const run = runWithCard("h3-timeline");
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(run.stages[0]?.url, "film.mp4");
    assert.equal((run.stages[0]?.gallery as Array<{ name: string }>)[0]?.name, "film.mp4");
  });

  it("reads the card declaration when a run carries a card id", async () => {
    const ctx = new Context();
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: {
        s: {
          outputs: {},
          artifacts: ["mask_manifest_00001_.png", "mask_combined_00001_.png"],
        },
      },
      promptId: "p",
    });
    const run = runWithCard("mask");
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(run.stages[0]?.url, "mask_combined_00001_.png");
  });
});
