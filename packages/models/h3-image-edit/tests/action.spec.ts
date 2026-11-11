// action.spec.ts — the edit atom's own conformance: every branch of
// the build (the 4MP pre-scale chain, the ALWAYS-vae conditioning
// with dotted autogrow slots, the stated-pair canvas, the list
// ceiling, the crop_stitch tail) composed through instantiateAction
// on the REAL facts row. The GPU e2e chains the live run; this spec
// owns the unit-tier branches (the fleet's per-family action.spec
// law).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { edit, parseEditFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the DECL's own
// lane_inputs on a minimal family row (mods = the DECL's own
// boarding, narrowed to pack names).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the h3-image-edit DECL declares lane_inputs");
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "image-edit",
  defaults: {},
  lane_inputs: laneInputs,
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};
assert.ok((FACTS.mods ?? []).includes("mask"), "h3-image-edit boards the mask pack");
assert.ok((FACTS.mods ?? []).includes("loras"), "h3-image-edit boards the loras pack");

const PARAMS = {
  prompt: "make the cube blue",
  image1: "/v1/assets/cube.png",
  seed: 5,
  steps: 6,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

type Nodes = Record<string, { class_type: string; inputs: Record<string, unknown> }>;
const graphOf = (g: GraphBuilder): Nodes => g.toJSON() as never;
const byClass = (g: GraphBuilder, cls: string) => Object.entries(graphOf(g)).filter(([, n]) => n.class_type === cls);

describe("the edit action — the official template lane", () => {
  it("every stated picture rides the 4MP + 32-snap pre-scale; vae rides the conditioning ALWAYS; the anchor sizes the canvas", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit, PARAMS, FACTS, g, "probe");
    const resizes = byClass(g, "ResizeImageMaskNode");
    assert.equal(resizes.length, 2, "the anchor rides BOTH pre-scale stages (area-to-4MP, then the 32-multiple snap)");
    const areaStage = resizes.find(([, n]) => n.inputs["resize_type"] === "scale total pixels");
    assert.ok(areaStage, "the first stage scales total pixels");
    assert.equal(areaStage![1].inputs["resize_type.megapixels"], 4, "the working-range law pins 4 megapixels");
    const snapStage = resizes.find(([, n]) => n.inputs["resize_type"] === "scale to multiple");
    assert.ok(snapStage, "the second stage snaps the canvas grid");
    assert.equal(snapStage![1].inputs["resize_type.multiple"], 32, "CANVAS_MULTIPLE 32");
    assert.equal(byClass(g, "GetImageSize").length, 1, "the canvas sizes off the scaled anchor (match_input_resolution default)");
    const enc = byClass(g, "MiniMaxH3ImageConditioning")[0]!;
    const inputs = enc[1].inputs;
    assert.ok("vae" in inputs, "the edit lane wires vae ALWAYS (reference latents anchor identity)");
    assert.ok("images.image_1" in inputs, "the anchor rides the dotted images.image_1 autogrow slot");
    assert.ok(!("images.image_2" in inputs), "one stated picture occupies exactly one slot");
    const zero = byClass(g, "ConditioningZeroOut");
    assert.equal(zero.length, 1, "the edit negative is the zeroed positive");
    const sampler = byClass(g, "KSampler")[0]!;
    const sIn = sampler[1].inputs;
    assert.deepEqual(sIn.positive, [enc[0], 0]);
    assert.deepEqual(sIn.negative, [zero[0]![0], 0]);
    assert.deepEqual(sIn.latent_image, [enc[0], 1], "the sampler rides the conditioning's OWN canvas latent");
    assert.equal(sIn.denoise, 1.0);
    assert.equal(sIn.steps, 6, "the edit variant resolver stamps steps 6");
    const saved = byClass(g, "SaveImage")[0]!;
    assert.equal(saved[1].inputs.filename_prefix, "probe/edit", "the render saves under <run>/edit");
  });

  it("a stated pair sizes the canvas itself: match_input_resolution false + width/height — NO GetImageSize", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, match_input_resolution: false, width: 2048, height: 1024 }, FACTS, g, "probe-pair");
    assert.equal(byClass(g, "GetImageSize").length, 0, "the stated pair owns the canvas door");
    const enc = byClass(g, "MiniMaxH3ImageConditioning")[0]!;
    assert.equal(enc[1].inputs.width, 2048, "the conditioning carries the stated width verbatim");
    assert.equal(enc[1].inputs.height, 1024);
  });

  it("match ON + a stated pair refuses at the shared size door (the flip is the cure the voice names)", () => {
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, width: 2048, height: 1024 }, FACTS, new GraphBuilder({}), "r"),
      /match_input_resolution/,
    );
  });

  it("the multi-image law: anchor + references ride contiguous dotted slots, each with its own pre-scale chain", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, image2: "/v1/assets/ref.png" }, FACTS, g, "probe-multi");
    const enc = byClass(g, "MiniMaxH3ImageConditioning")[0]!;
    assert.ok("images.image_1" in enc[1].inputs, "the anchor keeps slot 1");
    assert.ok("images.image_2" in enc[1].inputs, "the reference takes the next contiguous slot");
    assert.equal(byClass(g, "ResizeImageMaskNode").length, 4, "BOTH pictures ride the full pre-scale chain");
    assert.equal(byClass(g, "LoadImage").length, 2, "each stated file loads on its own node");
  });
});

describe("the one list — the shared ceiling counts the whole list (never drops one quietly)", () => {
  it("an empty list refuses (the first image is the one being edited)", () => {
    const { image1: _gone, ...rest } = PARAMS;
    assert.throws(
      () => instantiateAction(edit, rest, FACTS, new GraphBuilder({}), "r"),
      /required param 'input_images' missing/,
    );
  });

  it("a list past the DECL cap refuses LOUD, naming the cap and the drop count", () => {
    const tight: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, max_images: 2 } };
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, image2: "/v1/assets/b.png", image3: "/v1/assets/c.png" }, tight, new GraphBuilder({}), "r"),
      /'input_images' fires on the image-edit card.*this lane takes 2 input images total.*counts 3.*drop 1/s,
    );
  });
});

describe("the crop_stitch tail — the region detailer over THIS lane's own conditioning", () => {
  it("mask_mode crop_stitch replaces the whole generate: regionSegs over the SCALED anchor, DetailerForEach, NO KSampler", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, FACTS, g, "probe-crop");
    const nodes = Object.values(graphOf(g));
    const classes = nodes.map((n) => String(n.class_type));
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the crop_stitch mode mints the region detailer");
    assert.match(String(detailer!.inputs.image), /^ResizeImageMaskNode/, "the detailer reworks the SCALED anchor (the 4MP frame the conditioning sees)");
    assert.ok(nodes.some((n) => n.class_type === "MaskToSEGS"), "the painted mask converts through MaskToSEGS");
    assert.ok(!classes.includes("KSampler"), "no latent is sampled on the crop_stitch path");
    const saved = nodes.find((n) => n.class_type === "SaveImage")!;
    assert.match(String(saved.inputs?.filename_prefix), /probe-crop/, "the detailed edit saves under its own run prefix");
  });
});

describe("the edit facts door (closed-set drift refuses loud)", () => {
  it("a drifted conditioning class refuses — never a silent topology route", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, text_encode_node: "CLIPTextEncode" }, FACTS),
      /text_encode_node.*MiniMaxH3ImageConditioning/,
    );
  });

  it("a degenerate max_images cap refuses (a DECL bug, never a silent unbounded lane)", () => {
    const broken: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, max_images: 0 } };
    assert.throws(
      () => parseEditFacts(broken.lane_inputs, broken),
      /max_images = 0.*a number ≥ 1 is required/s,
    );
  });
});
