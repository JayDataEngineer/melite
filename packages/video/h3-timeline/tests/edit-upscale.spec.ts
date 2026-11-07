// @melite/models-h3 — THE UPSCALE POSTURE (slice 3 of the collapse
// — FRICTION_3's collapse map: "upscale = source: prior run +
// scale 2x … a genuinely different mechanism that resumes a PRIOR
// chain run's checkpointed scenes through a requeue loop"). This
// spec fires on the card's OWN compose door (def.compose) for the
// edit kind: a stated chain_run seats the door into the deferred
// second pass (CheckpointManager → UpscaleAdapter → … →
// UpscaleLoopEnd → ChainAssemble), the posture laws refuse loud
// BEFORE the delegation (refine and continuation are refused —
// one second-pass mechanism, one source posture), the loop's own
// denoise law fires THROUGH this door (the delegation proves the
// renderer rides), a blank prompt is lawful (the source run's own
// scene prompts serve), and the empty seat stays inert (resolve
// default-fills chain_run '' on every entry — presence is never
// authorship; inertness is the law). The loop's own emission laws
// live in the upscale suite; the preset cells in
// edit-presets.spec.ts. No @contract marker: package-local law,
// prose header (the registry row owns the law).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

/** The upscale posture as the edit door's own entry: the prior
 * chain run named, the recipe's pass-2 window stated. The clip
 * dials (mask_source, reference) default-fill and are INERT here —
 * the loop has no masked target and no source clip. */
const UP_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "sharpen every subject, keep the framing",
  chain_run: "run-1d3540406726",
  denoise: 0.24,
  steps: 20,
});

const compose = (entry: Record<string, unknown>): Record<string, Node> => {
  const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, "run_edit_upscale");
  return graphOf(g);
};

describe("the upscale posture — the deferred second pass on the one edit bag (the collapse, slice 3)", () => {
  it("chain_run stated composes the requeue loop through the edit door: the checkpoint head, the loop tail, the assemble", () => {
    const out = compose(UP_ENTRY());
    const manager = ofClass(out, "MiniMaxH3ChainCheckpointManager");
    assert.equal(manager.length, 1, "the loop's checkpoint head serves");
    assert.equal(manager[0][1].inputs.selection_json, "run-1d3540406726",
      "the head's selection is the BARE run name (the F19 selection law — resolved to the newest per-scene lineage at the execute door)");
    assert.equal(ofClass(out, "MiniMaxH3ChainUpscaleAdapter").length, 1,
      "the adapter seats the 2x profile over the run's manifest");
    assert.equal(ofClass(out, "MiniMaxH3ChainUpscaleLoopEnd").length, 1,
      "the top_level_requeue tail serves (the estate's requeue driver completes it scene by scene)");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1,
      "the estate's assemble law terminates the loop");
    assert.equal(ofClass(out, "MiniMaxH3FantasticVideoEditLatent").length, 0,
      "no masked-edit latent — the loop is a different family, not the matrix emission");
    assert.equal(ofClass(out, "MiniMaxH3ContexMaskedTarget").length, 0,
      "no masked target — the clip dials are inert under this posture");
  });

  it("the refine switch under an upscale refuses — one second-pass mechanism", () => {
    assert.throws(
      () => compose({ ...UP_ENTRY(), refine: true }),
      /the refine switch under an upscale/,
    );
  });

  it("a continuation under an upscale refuses — fresh seconds off a clip vs a prior run's resumed scenes", () => {
    assert.throws(
      () => compose({ ...UP_ENTRY(), continuation: true }),
      /a continuation under an upscale/,
    );
  });

  it("denoise 1 under an upscale refuses at the loop's own law — the refusal fires THROUGH the edit door", () => {
    assert.throws(
      () => compose({ ...UP_ENTRY(), denoise: 1 }),
      /a second pass is an upscale, never a re-render/,
    );
  });

  it("a BLANK prompt under an upscale composes — the source run's own scene prompts serve", () => {
    const out = compose({ ...UP_ENTRY(), edit_prompt: "" });
    const cond = ofClass(out, "MiniMaxH3ChainUpscaleReferenceConditioning");
    assert.equal(cond.length, 1, "the loop's conditioning rebuild serves");
    assert.equal(cond[0][1].inputs.prompt_override, "",
      "the override is empty — the run's own per-scene prompts ride (the carve-out: the prompt walk exempts this posture alone)");
  });

  it("chain_run empty (the default path) is inert: no loop vocabulary, the matrix emission serves", () => {
    const { chain_run: _c, ...entry } = UP_ENTRY();
    entry.mask_source = "whole-frame";
    const out = compose(entry);
    const json = JSON.stringify(out);
    assert.equal(json.includes("MiniMaxH3ChainCheckpointManager"), false,
      "the checkpoint head never rides the clip path — resolve default-fills chain_run '' on every entry (the default-fill burn), so INERTNESS is the law");
    assert.equal(json.includes("MiniMaxH3ChainUpscale"), false,
      "no loop vocabulary on the matrix path");
    assert.equal(ofClass(out, "MiniMaxH3ContexMaskedTarget").length >= 1, true,
      "the matrix emission serves");
  });

  it("the recipe's pass-2 window rides verbatim: the scheduler carries the stated denoise/steps, the sampler its own select", () => {
    const out = compose(UP_ENTRY());
    const sched = ofClass(out, "BasicScheduler");
    assert.equal(sched.length, 1, "the loop's own scheduler serves");
    assert.equal(sched[0][1].inputs.denoise, 0.24, "the pass-2 window (the recipe's own spelling)");
    assert.equal(sched[0][1].inputs.steps, 20, "the pass-2 steps ride the door's seat verbatim");
    assert.equal(sched[0][1].inputs.scheduler, "simple", "the loop family's schedule");
    const selects = ofClass(out, "KSamplerSelect").filter(([, n]) => n.inputs.sampler_name === "res_multistep");
    assert.equal(selects.length, 1, "the loop's own res_multistep select serves (the family plane seats its euler select beside it — unconsumed, the loop family's documented posture)");
    const ups = ofClass(out, "MinimaxH3LatentUpscaler3D");
    assert.equal(ups.length, 1, "the learned 2x serves (ONE variant path)");
    assert.equal(ups[0][1].inputs["mode.scale"], 2, "scale 2x — the doc's posture spelling");
  });

  // (B-2, the back-end evasion audit 2026-11-07) segment_crf was a
  // pass-through with no declared dial: the band judge skipped it,
  // the served face could not state it, and 9999 composed green —
  // the ride law and the refusal law colliding unseen. The dial is
  // DECLARED now (band 0–51, visible only under chain_run): the
  // judge walks it, and both spellings — the served edit entry AND
  // the legacy upscale through translation — refuse out-of-band.
  it("segment_crf is a DECLARED posture dial: in-band rides to the adapter, out-of-band refuses on BOTH spellings", () => {
    const out = compose({ ...UP_ENTRY(), segment_crf: 22 });
    const adapter = ofClass(out, "MiniMaxH3ChainUpscaleAdapter");
    assert.equal(adapter.length, 1, "the adapter serves the stated CRF");
    assert.equal(adapter[0][1].inputs.segment_crf, 22, "the stated CRF rides verbatim (the ride law)");
    assert.throws(
      () => compose({ ...UP_ENTRY(), segment_crf: 9999 }),
      /segment_crf/,
      "the declared band refuses a wild CRF on the served spelling",
    );
    const walked = def.schema({
      upscale: [{ chain_run: "run-1d3540406726", segment_crf: 9999 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_legacy_crf"),
      /segment_crf/,
      "the legacy upscale translation lands the SAME declared dial — the band judge walks the translated entry too",
    );
  });
});
