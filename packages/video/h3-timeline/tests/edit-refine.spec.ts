// @melite/models-h3 — THE UPSCALE DIAL (the fourth dial, slice 1 of
// the collapse — FRICTION_3's DESIGN PROPOSAL, the operator's own
// switch: "I flip a switch for refine, it opens up a submenu for
// scaling (1x, 2x) — this adds on nodes for the refine pass").
// This spec fires on the card's OWN compose door (def.compose) for
// the edit kind: the refine switch swaps the chain's sampler tail
// for the learned RefineHandoff over the edit's OWN latents (the
// same-run second pass — never the refine bag's VHS re-encode of a
// saved clip), the tail's three laws (partial denoise only, the
// multiplier band, the >=2x OOM ceiling with its two cures), the
// default path staying byte-clean of the dial vocabulary (the
// default-fill burn's law: resolve fills scale:2 on EVERY entry —
// presence is never authorship, so inertness is the wall, not a
// refusal), and the refine-2x section cell composing through the
// door at its own design window. The chain spine's own emission
// laws live in models/h3 edit-matrix.spec.ts; the section-chip wire
// in edit-sections.spec.ts. No @contract marker: package-local law,
// prose header (the registry row owns the door law).
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
import { judgeDeclaredBands } from "../src/card.ts";
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

/** The classic refine posture as the edit door's own entry: blank
 * mask, self-anchored, partial denoise, the design window (2.5 s =
 * 60 f, the band floor — the >=2x ceiling is 141 f), refine on. */
const REFINE_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "the same shot, sharper detail, nothing else changes",
  mask_source: "whole-frame",
  reference: "self",
  denoise: 0.32,
  keep_audio: true,
  refine: true,
  scale: 2,
  clip_seconds: 2.5,
  overlap_frames: 39,
});

const compose = (entry: Record<string, unknown>): Record<string, Node> => {
  const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, "run_edit_refine");
  return graphOf(g);
};

describe("the fourth dial — the refine switch on the one edit bag (the collapse, slice 1)", () => {
  it("refine ON swaps the chain's sampler tail for the learned handoff riding the edit's OWN latents", () => {
    const out = compose(REFINE_ENTRY());
    const handoffs = ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(handoffs.length, 1, "exactly one learned handoff serves the chain tail");
    const inputs = handoffs[0][1].inputs;
    assert.equal(inputs.model_name, "minimax_h3_latent_upscaler_3d_bf16.safetensors");
    assert.equal(inputs.mode, "scale by multiplier");
    assert.equal(inputs.scale, 2);
    assert.equal(inputs.denoise, undefined, "the denoise rides the handoff's sigmas, never a widget");
    assert.equal(ofClass(out, "SamplerCustomAdvanced").length, 0,
      "the plain tail is GONE when the switch is on — one tail, not two");
    const sigmas = ofClass(out, "BasicScheduler");
    assert.ok(sigmas.length >= 1 && sigmas.some(([, n]) => n.inputs.denoise === 0.32),
      "the partial window rides the scheduler the handoff samples");
  });

  it("refine OFF (the default path) is inert: the plain tail serves and the graph carries no upscaler weights", () => {
    const { refine: _refine, ...entry } = REFINE_ENTRY();
    const out = compose(entry);
    assert.equal(ofClass(out, "SamplerCustomAdvanced").length >= 1, true,
      "the plain sampler tail serves the default path");
    assert.equal(ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 0,
      "no handoff node when the switch is off");
    assert.equal(
      JSON.stringify(out).includes("minimax_h3_latent_upscaler_3d_bf16"),
      false,
      "the dial's weights never ride the graph — resolve default-fills scale:2 on every entry (the default-fill burn), so INERTNESS is the law, never a refusal",
    );
  });

  it("the full-noise cell refuses: a second pass is a refine, never a re-render", () => {
    // a REGION mask at denoise 1 is the swap posture (boil-lawful —
    // the masked side re-renders whole); the refine switch on top
    // of it is the unlawful cell this law owns.
    assert.throws(
      () => compose({ ...REFINE_ENTRY(), mask_source: "region", region_prompt: "hands", denoise: 1 }),
      /second pass is a refine, never a re-render/,
    );
  });

  it("the >=2x OOM ceiling refuses past the measured 141 f naming both cures; the same-size pass is exempt", () => {
    // 6 s = 144 f > 141 at 2x — the refusal names the window cut and
    // the same-size cure, in the door's own words.
    assert.throws(
      () => compose({ ...REFINE_ENTRY(), clip_seconds: 6 }),
      /TOO LONG.*Cut the window \(window_length \/ clip_seconds\) or lower scale below 2/s,
    );
    // the same window at scale 1 — the capacity cure — composes.
    const out = compose({ ...REFINE_ENTRY(), scale: 1, clip_seconds: 6 });
    const handoffs = ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0][1].inputs.scale, 1);
  });

  it("the multiplier band binds at the walk's declared-band judge (the declaration, not the tooltip)", () => {
    assert.throws(
      () => compose({ ...REFINE_ENTRY(), scale: 5 }),
      /'scale': 5 is outside this seat's declared band 1–4 — the declaration binds, not the tooltip/,
    );
  });

  it("the refine-2x section cell composes through the door at its own design window", () => {
    // the chip's patch over the entry defaults — exactly what a
    // chip press lands on an empty bag
    const out = compose({
      source_clip: "clips/take.mp4",
      edit_prompt: "the same shot, sharper detail, nothing else changes",
      mask_source: "whole-frame",
      reference: "self",
      denoise: 0.32,
      refine: true,
      scale: 2,
      clip_seconds: 2.5,
      keep_audio: true,
    });
    const handoffs = ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(handoffs.length, 1, "the section posture reaches the learned pass");
  });

  it("THE BAND JUDGE'S OWN GUARDS (the coverage-arm law, 2026-11-07): a malformed bag entry never reaches a band verdict, and the reshoot carve-out holds", () => {
    // the judge walks the DECLARED kinds' bags entry by entry; an
    // entry that is not a plain object (an array, a null) carries
    // no stated seats, so the band walk CONTINUES past it — the
    // dispatch's own laws own that shape downstream, never a band
    // misfire on a shape the seats cannot state. The reshoot kind
    // never reaches the walk at all (ARM 3's carve-out: its camera
    // door judges with a richer voice).
    assert.doesNotThrow(() => judgeDeclaredBands({ edit: [[]] }),
      "an array entry skips the band walk (no seats to state)");
    assert.doesNotThrow(() => judgeDeclaredBands({ edit: [null] }),
      "a null entry skips the band walk");
    assert.doesNotThrow(() => judgeDeclaredBands({ reshoot: [{ orbit: 9999, tilt: 9999 }] }),
      "the reshoot carve-out holds — its camera door owns the voice, whatever the numbers");
  });

  it("THE ONE-ENTRY LAW refuses a present-but-non-array bag at the binding's own door (max_stack 1's other half)", () => {
    // a bag that is present but carries no entry shape (a string, a
    // bare null-ish scalar) is neither the unused arm (absent) nor
    // the explicit off ([]) — it is a doc the bag reader would
    // quietly misread, so the binding refuses loud naming the bag.
    const walked = def.schema({}) as Record<string, unknown>;
    assert.throws(
      () => {
        const g = new GraphBuilder();
        def.compose({ ...walked, reshoot: "a string is not a bag" }, model, g, "run_bad_bag");
      },
      /the reshoot bag is present but carries no entry — state exactly one reshoot entry \(max_stack 1\) or omit the arm/,
      "a non-array reshoot bag refuses naming the bag and the max_stack law",
    );
  });

  it("THE ONE-ENTRY LAW refuses a bag of two entries — the silent-drop class max_stack kills", () => {
    // two armed entries would have the bag reader quietly take the
    // first and drop the second — the refusal names the count so the
    // doc states one posture, not two (the law that underwrote the
    // fifteen pairwise alias edges the collapse deleted).
    const walked = def.schema({}) as Record<string, unknown>;
    assert.throws(
      () => {
        const g = new GraphBuilder();
        def.compose(
          { ...walked, reshoot: [{ orbit: 12, tilt: 6 }, { orbit: 30, tilt: 9 }] },
          model, g, "run_two_bag",
        );
      },
      /the reshoot bag carries 2 entries — max_stack is 1, so every entry after the first would be silently dropped\. Keep exactly one reshoot entry\./,
      "a two-entry reshoot bag refuses naming the count and the drop it prevents",
    );
  });
});
