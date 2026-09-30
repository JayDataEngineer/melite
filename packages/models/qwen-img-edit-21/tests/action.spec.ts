// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// imageEdit still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law.1 arm on the same resolved facts — the
// card's binding change moves no wire — the variant merge (bf16's re-spelled
// unet) parses green at the door, the autogrow mapping carries stated
// references contiguously, and the door refuses drift loud through
// instantiateAction. The interpreter's own contract walls live in card-kit's
// tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { edit, parseEditFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the DECL's own
// lane_inputs on a minimal family row (mods = the DECL's own
// boarding — mask only).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the qwen-img-edit-21 DECL declares lane_inputs");
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

const PARAMS = {
  prompt: "make the hallway blue",
  negative_prompt: "blur",
  input_images: ["input/anchor.png"],
  width: 1280,
  height: 768,
  seed: 7,
  steps: 25,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the edit action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the 2.1 path", () => {
    const action = new GraphBuilder({});
    instantiateAction(edit, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-action-s-serialized-prompt-is-identical-to-the-2-1-path"), graphOf(action), "the action's serialized prompt is identical to the 2.1 path");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "QwenImage21Cache"), "the cache-wrapped model rides");
    assert.ok(nodes.some((n) => n.class_type === "TextEncodeQwenImage21"), "the 2.1 encoder rides");
    assert.ok(nodes.some((n) => n.class_type === "EmptyLatentImage"), "the target-resolution latent rides");
  });

  it("the golden holds with stated references — the autogrow keys map contiguously", () => {
    const p = { ...PARAMS, input_images: ["input/anchor.png", "input/r1.png", "input/r2.png", "input/r3.png"] };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-refs");
    assertGraphGolden(golden("the-golden-holds-with-stated-references-the-autog-53923e6b71"), graphOf(action), "the golden holds with stated references — the autogrow keys map contiguously");
    const enc = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "TextEncodeQwenImage21",
    )!;
    assert.ok("images.image_1" in (enc.inputs ?? {}), "the anchor rides the dotted autogrow key");
    assert.ok("images.image_2" in (enc.inputs ?? {}) && "images.image_4" in (enc.inputs ?? {}), "refs map contiguously from image_2");
  });

  it("the golden holds on the legacy spellings (the one-list merge: image1 + reference_images)", () => {
    const p = { ...PARAMS, input_images: undefined, image1: "input/anchor.png", reference_images: ["input/r1.png", ""] };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-legacy");
    assertGraphGolden(golden("the-golden-holds-on-the-legacy-spellings-the-one-e79ec34ffd"), graphOf(action), "the golden holds on the legacy spellings (the one-list merge: image1 + reference_images)");
  });

  it("the golden holds on the crop_stitch arm (the region detailer tail)", () => {
    const p = {
      ...PARAMS,
      width: undefined,
      height: undefined,
      mask: [{ mask_mode: "crop_stitch", input_mask: "input/region.png", mask_denoise: 0.4 }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-region");
    assertGraphGolden(golden("the-golden-holds-on-the-crop-stitch-arm-the-regio-31708a99e6"), graphOf(action), "the golden holds on the crop_stitch arm (the region detailer tail)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "DetailerForEach"), "the region detailer rides");
    assert.ok(nodes.some((n) => n.class_type === "SaveImage"), "the tail saves directly");
  });

  it("the golden holds on the bf16 variant's MERGED view (the variant override rides)", () => {
    // The resolved row for the bf16 route is the family row ⊕ the
    // variant's own lane_inputs (the re-spelled unet + encoder).
    // The door reads the MERGE, never the family row alone.
    const merged: ModelFacts = {
      ...FACTS,
      id: "qwen-img-edit-21-bf16",
      lane_inputs: {
        ...FACTS.lane_inputs,
        unet: "qwen_image_2.1_bf16.safetensors",
        text_encoder: "qwen3vl_8b_bf16.safetensors",
      },
    };
    const facts = parseEditFacts(merged.lane_inputs);
    assert.equal(facts.unet, "qwen_image_2.1_bf16.safetensors");
    const action = new GraphBuilder({});
    instantiateAction(edit, PARAMS, merged, action, "probe-bf16");
    assertGraphGolden(golden("the-golden-holds-on-the-bf16-variant-s-merged-vie-30d10ef239"), graphOf(action), "the golden holds on the bf16 variant's MERGED view (the variant override rides)");
    const unet = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "UNETLoader",
    )!;
    assert.equal(unet.inputs?.unet_name, "qwen_image_2.1_bf16.safetensors");
  });

  it("the shared ceiling refuses LOUD past the DECL cap — never a quiet drop", () => {
    const legal = ["input/anchor.png", ...Array.from({ length: 15 }, (_, i) => `input/r${String(i)}.png`)];
    instantiateAction(edit, { ...PARAMS, input_images: legal }, FACTS, new GraphBuilder({}), "probe-cap");
    const past = [...legal, "input/r15.png"];
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, input_images: past }, FACTS, new GraphBuilder({}), "probe-cap"),
      /this lane takes 16 input images total.*but the list counts 17.*drop 1/,
    );
  });

  it("an empty one-list refuses — the anchor is mandatory (direct action callers)", () => {
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, input_images: [], image1: "" }, FACTS, new GraphBuilder({}), "probe-empty"),
      /required param 'input_images' missing on the image-edit card \(the first image is the one being edited/,
    );
  });

  it("the golden holds when a flat key WINS over the bag (explicit flat keys override the region row)", () => {
    const p = {
      ...PARAMS,
      width: undefined,
      height: undefined,
      input_mask: "input/flat-mask.png",
      mask: [{ mask_mode: "crop_stitch", input_mask: "input/bag-mask.png", mask_denoise: 0.4 }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-flatwins");
    assertGraphGolden(golden("the-golden-holds-when-a-flat-key-wins-over-the-ba-49740cfd1d"), graphOf(action), "the golden holds when a flat key WINS over the bag (explicit flat keys override the region row)");
    const loader = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "LoadImageMask",
    )!;
    assert.equal(loader.inputs?.image, "input/flat-mask.png", "the flat input_mask wins over the bag's row");
  });

  it("the golden holds on the full_frame mode (it maps to auto — the plain arm)", () => {
    const p = {
      ...PARAMS,
      mask: [{ mask_mode: "full_frame", input_mask: "input/region.png" }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-fullframe");
    assertGraphGolden(golden("the-golden-holds-on-the-full-frame-mode-it-maps-t-6bb62deac9"), graphOf(action), "the golden holds on the full_frame mode (it maps to auto — the plain arm)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(!nodes.some((n) => n.class_type === "DetailerForEach"), "full_frame maps to auto — the plain arm builds");
  });

  it("GATE S rides the declared rule: the sentinel -1 mints a concrete seed, two runs differ", () => {
    const g1 = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, seed: -1 }, FACTS, g1, "r-a");
    const g2 = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, seed: -1 }, FACTS, g2, "r-b");
    const seed = (g: GraphBuilder): unknown =>
      (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed;
    const s1 = seed(g1);
    const s2 = seed(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0, `minted a concrete int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under the sentinel mints fresh");
  });
});

describe("the edit facts door (closed-set drift refuses loud)", () => {
  it("a drifted encoder class refuses — never a silent topology route", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImageEditPlus" }),
      /text_encode_node.*TextEncodeQwenImage21/,
    );
  });

  it("a missing weight string refuses field-named", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, vae: undefined }),
      /lane_inputs\.vae.*non-empty string/,
    );
  });

  it("a degenerate max_images refuses", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, max_images: 0 }),
      /lane_inputs\.max_images.*number ≥ 1/,
    );
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, max_images: "16" }),
      /lane_inputs\.max_images.*number ≥ 1/,
    );
  });
});
