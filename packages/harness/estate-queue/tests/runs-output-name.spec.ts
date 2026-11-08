// runs-output-name.spec.ts — THE OUTPUT-LABEL MINT (queue 12,
// operator 2026-11-08: "With the video outputs, and all the
// generation outputs from meltie, there is no place for the ai
// agent or the user through the card UI to label output names").
// The reserved `output_name` stage param (STAGE_RESERVED_PARAMS
// carries it onto the composed row — the agent's patch seat) labels
// the settled gallery on the DISPLAY plane: `label` is what faces
// read, `name` stays the machine file key (the media route and
// every dedup law ride it). These walls pin the mint at settle, the
// no-stem silence, the name's immobility, the param's seat beside
// (never inside) the graph, and the sidecar carry.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { runOne } from "../src/runsExecute.ts";
import { sidecarStageOf } from "../src/queueSidecar.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

class FakeEngine extends ComfyUIHostService {
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });

  seenRows: MergeRow[] = [];

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
    this.seenRows = rows;
    return this.onFlow(rows, runDir, inputNames, initials, opts);
  }
}

/** The hero rig's fixture shape, with the stage params spelled by
 *  the caller (the output_name seat rides run.params[i], the same
 *  bag the composed row carries — index-aligned with stages). */
const runWithParams = (params: Array<Record<string, unknown>>): RunRecord => ({
  runId: "run-outname-00000000-0000000" as RunId,
  status: "queued",
  stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: draftIdOf("d"),
  dir: "/tmp/run-outname",
  testFlag: false,
  stopFlag: false,
  params,
  outputNodes: [{}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
  cardId: undefined,
});

/** A settled two-artifact engine answer: the film is the semantic
 *  hero (outputs.default) regardless of engine completion order. */
const twoArtifacts = (): FlowResult => ({
  stages: {
    s: {
      outputs: { default: "/tmp/run-outname/film.mp4" },
      artifacts: ["/tmp/run-outname/w1.mp4", "/tmp/run-outname/film.mp4"],
    },
  },
  promptId: "p",
});

describe("THE OUTPUT-LABEL MINT (queue 12 — the settle seam)", () => {
  it("a spelled stem labels every gallery row: the hero wears it bare, the rest wear `stem · 2…n`", async () => {
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => twoArtifacts();
    const run = runWithParams([
      { workflow: { "1": { class_type: "X", inputs: {} } }, output_name: "golden hour" },
    ]);
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    const gallery = run.stages[0]?.gallery as Array<{ name: string; label?: string }>;
    assert.equal(gallery.length, 2, "both artifacts ride the gallery");
    assert.equal(gallery[0]?.name, "film.mp4", "the semantic hero still leads");
    assert.equal(gallery[0]?.label, "golden hour", "the hero wears the bare stem");
    assert.equal(gallery[1]?.name, "w1.mp4");
    assert.equal(gallery[1]?.label, "golden hour · 2", "the second wears the counter tail");
  });

  it("a single artifact wears the bare stem alone (never `stem · 2` on an only child)", async () => {
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: { s: { outputs: {}, artifacts: ["/tmp/run-outname/only.mp4"] } },
      promptId: "p",
    });
    const run = runWithParams([
      { workflow: { "1": { class_type: "X", inputs: {} } }, output_name: "the cut" },
    ]);
    await runOne(run, ctx, () => undefined);
    const gallery = run.stages[0]?.gallery as Array<{ name: string; label?: string }>;
    assert.equal(gallery[0]?.label, "the cut");
  });

  it("THE NO-STEM SILENCE: absent, empty, whitespace, or non-string stems mint NO label key at all", async () => {
    for (const bad of [undefined, "", "   ", 42, null]) {
      const ctx = new Context();
      (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
      const engine = new FakeEngine(ctx);
      engine.onFlow = async () => twoArtifacts();
      const params: Record<string, unknown> = { workflow: { "1": { class_type: "X", inputs: {} } } };
      if (bad !== undefined) params["output_name"] = bad;
      const run = runWithParams([params]);
      await runOne(run, ctx, () => undefined);
      const gallery = run.stages[0]?.gallery as Array<{ name: string; label?: string }>;
      for (const row of gallery) {
        assert.equal("label" in row, false, `output_name ${JSON.stringify(bad)} mints no label`);
      }
    }
  });

  it("THE NAME NEVER MOVES: the label rides BESIDE the file name — with a stem and without, the names are identical", async () => {
    const namesFor = async (outputName: string | undefined): Promise<string[]> => {
      const ctx = new Context();
      (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
      const engine = new FakeEngine(ctx);
      engine.onFlow = async () => twoArtifacts();
      const params: Record<string, unknown> = { workflow: { "1": { class_type: "X", inputs: {} } } };
      if (outputName !== undefined) params["output_name"] = outputName;
      const run = runWithParams([params]);
      await runOne(run, ctx, () => undefined);
      return (run.stages[0]?.gallery as Array<{ name: string }>).map((g) => g.name);
    };
    assert.deepEqual(
      await namesFor("golden hour"),
      await namesFor(undefined),
      "the media-route key is the same file name whether labeled or not",
    );
  });

  it("THE PARAM RIDES BESIDE THE GRAPH: the engine's row carries output_name in its params bag, never inside the workflow", async () => {
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => twoArtifacts();
    const run = runWithParams([
      { workflow: { "1": { class_type: "X", inputs: {} } }, output_name: "golden hour" },
    ]);
    await runOne(run, ctx, () => undefined);
    assert.equal(engine.seenRows.length, 1, "one stage row reached the engine");
    assert.equal(
      (engine.seenRows[0]?.params as Record<string, unknown>)["output_name"],
      "golden hour",
      "the estate bag reaches the merge plane (the same channel vram_budget_mb rides)",
    );
    assert.equal(
      JSON.stringify(engine.seenRows[0]?.workflow).includes("golden hour"),
      false,
      "the label NEVER lands inside the serialized graph — the display plane is not the engine's",
    );
  });

  it("THE SIDECAR CARRY: the minted labels ride the sidecar's gallery beside their file names", async () => {
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => twoArtifacts();
    const run = runWithParams([
      { workflow: { "1": { class_type: "X", inputs: {} } }, output_name: "golden hour" },
    ]);
    await runOne(run, ctx, () => undefined);
    const out = sidecarStageOf(run.stages[0] as unknown as Parameters<typeof sidecarStageOf>[0]);
    assert.deepEqual(out.gallery, [
      { name: "film.mp4", label: "golden hour" },
      { name: "w1.mp4", label: "golden hour · 2" },
    ], "the restored row renders labeled");
  });
});
