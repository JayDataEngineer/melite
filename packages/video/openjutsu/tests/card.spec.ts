// @melite/video-openjutsu — the openjutsu card's compose law.
//
// The card is a thin gate over the family's declared action: the
// schema walk owns types/bounds, the two media seats refuse blank
// in their own field voice, and the segment is pinned here node by
// node — the upstream baseline graph, composed, not hand-drawn.
// The model facts ride the DECL's own lane_inputs (one truth — the
// facts file derives the same rows at load).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { DECL as viggleDecl } from "@melite/models-viggle-animate";

const MODEL: ModelFacts = {
  id: "viggle-animate",
  family: "viggle-animate",
  card: "openjutsu",
  // the family OWNS the numeric floors (the one-owner-per-floor law):
  // the service's one param cascade folds them beneath stated params
  // (service.ts:907) — the fixture mirrors that layering.
  defaults: { ...(viggleDecl.defaults ?? {}) } as never,
  lane_inputs: { ...(viggleDecl.lane_inputs ?? {}) },
  card_knobs: [],
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: ["loras"],
} as never;

const DMD = "h3/viggle_animate_dmd_lora_r64.safetensors";
const GOOD = {
  clip: "drive_clip.mp4",
  ref_image: "character_still.png",
};

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("openjutsu")!;
  assert.ok(def, "the composition root serves the openjutsu card");
});

const compose = (p: Record<string, unknown>, g = new GraphBuilder()) =>
  // the ONE param cascade, mirrored (service.ts:907): schema parse ←
  // model.defaults ← explicit params — the card sees the merged doc.
  def.compose({ ...def.schema(p), ...MODEL.defaults, ...p } as never, MODEL, g, "spec_run");

describe("the openjutsu compose gate", () => {
  it("a missing clip refuses in the field's voice", () => {
    assert.throws(() => compose({ ref_image: GOOD.ref_image }), /required param 'clip' missing on the openjutsu card/);
    assert.throws(() => compose({ clip: "  ", ref_image: GOOD.ref_image }), /required param 'clip' missing/);
  });

  it("a missing identity still refuses in the field's voice", () => {
    assert.throws(() => compose({ clip: GOOD.clip }), /required param 'ref_image' missing on the openjutsu card/);
  });

  it("THE SCHEMA GATE: an unknown key refuses, named", () => {
    assert.throws(() => compose({ ...GOOD, promptt: "x" }), /got undeclared param\(s\): promptt/);
  });

  it("THE SCHEMA GATE: a wrong-typed length refuses loud", () => {
    assert.throws(() => compose({ ...GOOD, length: "many" }), /length/);
  });

  it("THE SCHEMA GATE: an out-of-envelope steps refuses at the walk (the DMD ceiling)", () => {
    assert.throws(() => compose({ ...GOOD, steps: 50 }), /steps/);
  });

  it("the dispatch refuses an unboarded family loud — one family, one action", () => {
    const stray = { ...MODEL, family: "krea-2", id: "krea-2" } as never;
    assert.throws(
      () => def.compose(def.schema({ ...GOOD }), stray, new GraphBuilder(), "spec_stray"),
      /no declared action for family 'krea-2' on the openjutsu card/,
    );
  });
});

describe("the openjutsu segment — the upstream baseline graph, composed", () => {
  it("composes the full single-shot swap with the default DMD bag", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD, loras: [{ name: DMD, strength: 1 }] }, g);
    const nodes = Object.values(g.toJSON());
    const classes = nodes.map((n) => n.class_type);
    for (const cls of [
      "VHS_LoadVideo", "LoadImage", "ViggleTextCondLoader", "ViggleAnimateConditioning",
      "UNETLoader", "LoraLoaderModelOnly", "MiniMaxH3SigmaShift", "RandomNoise",
      "KSamplerSelect", "ManualSigmas", "BasicGuider", "SamplerCustomAdvanced",
      "VAEDecode", "VHS_VideoCombine",
    ]) {
      assert.ok(classes.includes(cls), `the segment composes ${cls}`);
    }
    const unet = nodes.find((n) => n.class_type === "UNETLoader");
    assert.equal((unet!.inputs as Record<string, unknown>).unet_name, viggleDecl.lane_inputs!.unet,
      "the body loads the lane's own INT8 file — never a card-side constant");
    const loader = nodes.find((n) => n.class_type === "VHS_LoadVideo");
    assert.equal((loader!.inputs as Record<string, unknown>).video, GOOD.clip);
    assert.equal((loader!.inputs as Record<string, unknown>).force_rate, 24, "the lane's 24 fps contract");
    assert.equal((loader!.inputs as Record<string, unknown>).frame_load_cap, 124, "the loader caps at the stated window");
    const cond = nodes.find((n) => n.class_type === "ViggleAnimateConditioning");
    assert.deepEqual(
      [cond!.inputs.width, cond!.inputs.height, cond!.inputs.length],
      [0, 0, 124],
      "0/0 = the clip's own geometry (the evaluated configuration)",
    );
    const shift = nodes.find((n) => n.class_type === "MiniMaxH3SigmaShift");
    assert.deepEqual([shift!.inputs.shift_video, shift!.inputs.shift_audio], [3, 3], "the upstream 3/3 baseline");
    const sigmas = nodes.find((n) => n.class_type === "ManualSigmas");
    assert.equal((sigmas!.inputs as Record<string, unknown>).sigmas, "1, 0.8571428571428571, 0.6, 0",
      "three updates emit the upstream four-point schedule");
    const sampler = nodes.find((n) => n.class_type === "KSamplerSelect");
    assert.equal((sampler!.inputs as Record<string, unknown>).sampler_name, "euler", "the DMD schedule assumes euler");
    const combine = nodes.find((n) => n.class_type === "VHS_VideoCombine");
    assert.equal((combine!.inputs as Record<string, unknown>).format, "video/h264-mp4");
    assert.ok("audio" in combine!.inputs, "the clip's own audio rides the combine");
  });

  it("the stated steps re-derives the schedule over the DMD bag (stated > married; five points)", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD, steps: 4, loras: [{ name: DMD, strength: 1 }] }, g);
    const sigmas = Object.values(g.toJSON()).find((n) => n.class_type === "ManualSigmas");
    const points = String((sigmas!.inputs as Record<string, unknown>).sigmas).split(",");
    assert.equal(points.length, 5, "the doc's own stated steps beat the bag's counting row");
  });

  it("an empty bag composes byte-honest: no lora node, the schema default owns steps", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD }, g);
    const nodes = Object.values(g.toJSON());
    assert.ok(!nodes.some((n) => n.class_type === "LoraLoaderModelOnly"),
      "no pick, no mutation — the bare model rides the shift");
  });

  it("two picks fire two lora nodes in bag order (the DMD row, then the drift cure)", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD, loras: [{ name: DMD, strength: 1 }, { name: "h3/h3_character_swap_v1.5.safetensors", strength: 1 }] }, g);
    const loras = Object.values(g.toJSON()).filter((n) => n.class_type === "LoraLoaderModelOnly");
    assert.equal(loras.length, 2);
    assert.equal((loras[0]!.inputs as Record<string, unknown>).lora_name, DMD);
    assert.equal((loras[1]!.inputs as Record<string, unknown>).lora_name, "h3/h3_character_swap_v1.5.safetensors");
  });

  it("the seed-sentinel mints when unstated (-1 never reaches the graph)", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD }, g);
    const noise = Object.values(g.toJSON()).find((n) => n.class_type === "RandomNoise");
    const seed = (noise!.inputs as Record<string, unknown>).noise_seed;
    assert.equal(typeof seed, "number");
    assert.notEqual(seed, -1);
  });

  it("a '$'-wired clip spells the tensor — no loader node, no audio seat", () => {
    const g = new GraphBuilder();
    compose({ ...GOOD, clip: "$stage9" }, g);
    const nodes = Object.values(g.toJSON());
    assert.ok(!nodes.some((n) => n.class_type === "VHS_LoadVideo"),
      "the spell IS the tensor — the loader would double-load the drive");
    const combine = nodes.find((n) => n.class_type === "VHS_VideoCombine");
    assert.ok(!("audio" in combine!.inputs),
      "a wired stream carries no engine-side audio to carry through");
  });
});
