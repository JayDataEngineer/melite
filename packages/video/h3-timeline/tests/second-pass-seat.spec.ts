// @contract cards-second-pass-one-seat
// second-pass-seat.spec.ts — THE SECOND_PASS SEAT'S ONE DOOR (the
// §0.4 unification's first increment).
//
// THE LAW: the family's second-pass spellings — the refine switch
// (same-run latents), a stated chain_run (prior-run checkpoints),
// the film's latent_2x route, the postImage finish — are ARMS of
// ONE seat (secondPass.ts owns the vocabulary and the shared
// refusal laws; the arms keep their own nodes — a vocabulary and
// gate unification, never a graph change). A doc stating TWO arms
// refuses loud NAMING THE SEAT, and every arm refuses the
// full-noise pole with the seat's own clause and reason.
//
// The byte-exact frozen suites (edit-refine, edit-upscale,
// upscale-mod, refine-bag, chainUpscale, value-roundtrip) pin the
// arms' own emissions; this wall pins the SEAT — the shared
// naming, the single-arm compose, and the shared clause riding the
// real edit compose door.
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
  FULL_NOISE_REASON, SECOND_PASS_SOURCES, fullNoiseClause, secondPassSourceOf,
} from "@melite/models-h3/secondPass";
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

/** The edit door's base entry: the classic refine posture (blank
 *  mask, self anchors, partial denoise, the design window). */
const ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "the same shot, sharper detail, nothing else changes",
  mask_source: "whole-frame",
  reference: "self",
  denoise: 0.32,
  keep_audio: true,
  clip_seconds: 2.5,
  overlap_frames: 39,
});

const compose = (entry: Record<string, unknown>): Record<string, Node> => {
  const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, "run_second_pass_seat");
  return graphOf(g);
};

describe("the second-pass seat (one door, one arm per doc)", () => {
  it("ARM 1 — two stated arms refuse loud NAMING THE SEAT, through the real edit compose door", () => {
    assert.throws(
      () => compose({ ...ENTRY(), refine: true, scale: 2, chain_run: "prior-run" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        // the frozen phrase (edit-upscale.spec's pin) AND the seat's
        // own naming — the pair-wise refusal grew the shared seat.
        assert.match(err.message, /the refine switch under an upscale/);
        assert.match(err.message, /second-pass seat/);
        return true;
      },
    );
  });

  it("ARM 2 — each arm ALONE composes: the switch arms the same-run handoff, the stated run delegates to the prior-run loop", () => {
    const refineOut = compose({ ...ENTRY(), refine: true, scale: 2 });
    assert.equal(ofClass(refineOut, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 1,
      "the same-run arm composes its learned handoff");
    // the prior-run arm's own posture is minimal (the clip dials are
    // inert on the loop — no masked target, no source clip rides)
    const loopOut = compose({
      source_clip: "clips/take.mp4",
      edit_prompt: "sharpen every subject, keep the framing",
      chain_run: "run-1d3540406726",
      denoise: 0.24,
      steps: 20,
    });
    assert.equal(ofClass(loopOut, "MiniMaxH3ChainCheckpointManager").length >= 1, true,
      "the prior-run arm delegates to the checkpoint loop");
    // the vocabulary resolves each stated arm to its source
    assert.equal(secondPassSourceOf({ refine: true }), "same-run");
    assert.equal(secondPassSourceOf({ chain_run: "prior-run" }), "prior-run");
    assert.equal(secondPassSourceOf({}), undefined);
    assert.deepEqual([...SECOND_PASS_SOURCES], ["same-run", "prior-run", "decoded"]);
  });

  it("ARM 3 — the full-noise refusal rides the seat's OWN clause and reason (an inlined copy reds)", () => {
    assert.throws(
      () => compose({ ...ENTRY(), refine: true, scale: 2, mask_source: "region", region_prompt: "hands", denoise: 1 }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes(fullNoiseClause("refine")),
          "the refusal carries the shared clause verbatim");
        assert.ok(err.message.includes(FULL_NOISE_REASON),
          "the refusal carries the shared reason verbatim");
        return true;
      },
    );
  });
});
