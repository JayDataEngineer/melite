// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// imageEdit still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The interpreter's own contract walls live
// in card-kit's tests/action.spec.ts.
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
// boarding — lanpaint, loras, mask).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the qwen-img-edit-2511 DECL declares lane_inputs");
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
  seed: 7,
  steps: 20,
  cfg: 2.5,
  sampler: "euler",
  scheduler: "simple",
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the edit action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden arm (the plain VAEEncode-of-source path)", () => {
    const action = new GraphBuilder({});
    instantiateAction(edit, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-t-0efa4cf18f"), graphOf(action), "the composed prompt is the committed golden arm (the plain VAEEncode-of-source path)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.filter((n) => n.class_type === "TextEncodeQwenImageEditPlus").length === 2, "the pos/neg encoder pair rides");
    assert.ok(nodes.some((n) => n.class_type === "VAEEncode"), "the edit rides the source's own resolution");
    assert.ok(nodes.some((n) => n.class_type === "ModelSamplingAuraFlow"), "the fixed 1.0 shift wraps the unet");
  });

  it("the golden holds with references — the stock node's native image2/image3 optionals", () => {
    const p = { ...PARAMS, input_images: ["input/anchor.png", "input/r1.png", "input/r2.png"] };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-refs");
    assertGraphGolden(golden("the-golden-holds-with-references-the-stock-node-s-21e914dca7"), graphOf(action), "the golden holds with references — the stock node's native image2/image3 optionals");
    const enc = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "TextEncodeQwenImageEditPlus",
    )!;
    assert.ok("image1" in (enc.inputs ?? {}) && "image2" in (enc.inputs ?? {}) && "image3" in (enc.inputs ?? {}), "both reference slots filled");
    const blank = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, input_images: ["input/anchor.png", ""] }, FACTS, blank, "probe-blank");
    const enc2 = Object.values(blank.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "TextEncodeQwenImageEditPlus",
    )!;
    assert.ok(!("image2" in (enc2.inputs ?? {})), "a blank ref contributes no input at all (byte-stable plain graphs)");
  });

  it("the golden holds on the lanpaint arm (mask prep → LanPaint sampler → decode → save)", () => {
    const p = {
      ...PARAMS,
      input_mask: "input/region.png",
      lanpaint_prompt_mode: "positive",
      lanpaint_num_steps: 30,
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-lp");
    assertGraphGolden(golden("the-golden-holds-on-the-lanpaint-arm-mask-prep-la-4ed34f1f78"), graphOf(action), "the golden holds on the lanpaint arm (mask prep → LanPaint sampler → decode → save)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "LanPaint_ImageEncode"), "the lanpaint latent rides");
    const sampler = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "LanPaint_KSamplerAdvanced",
    )!;
    assert.equal(sampler.inputs?.steps, 30, "lanpaint_num_steps maps to the sampler's steps");
    assert.equal(sampler.inputs?.LanPaint_PromptMode, "Prompt First", "positive mode maps to Prompt First");
    assert.ok(nodes.some((n) => n.class_type === "LanPaint_ImageDecode"), "the lanpaint decode rides");
    assert.ok(nodes.some((n) => n.class_type === "VAEDecode") === false, "no plain decode on this arm");
  });

  it("THE STATED-KNOB WALL (models-hop56 wave-2): the lanpaint knobs ride their stated VALUES, not the defaults — feather 12, lambda 0.8, step size 1.5", () => {
    const p = {
      ...PARAMS,
      input_mask: "input/region.png",
      mask_feather: "12",
      lanpaint_lambda: "0.8",
      lanpaint_step_size: "1.5",
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-stated");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>);
    const feather = nodes.find((n) => n.class_type === "FeatherMask");
    assert.ok(feather, "the stated mask rides the feather node");
    assert.strictEqual(feather!.inputs?.left, 12, "FeatherMask.left carries the stated 12 (number, not the string)");
    assert.strictEqual(feather!.inputs?.bottom, 12, "all four edges carry the stated feather");
    const sampler = nodes.find((n) => n.class_type === "LanPaint_KSamplerAdvanced")!;
    assert.strictEqual(sampler.inputs?.LanPaint_Lambda, 0.8, "the stated lambda rides");
    assert.strictEqual(sampler.inputs?.LanPaint_StepSize, 1.5, "the stated step size rides");
  });

  it("the golden holds on the crop_stitch arm (the region detailer tail)", () => {
    const p = {
      ...PARAMS,
      mask: [{ mask_mode: "crop_stitch", input_mask: "input/region.png", mask_denoise: 0.4, mask_detector: "person" }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-region");
    assertGraphGolden(golden("the-golden-holds-on-the-crop-stitch-arm-the-regio-31708a99e6"), graphOf(action), "the golden holds on the crop_stitch arm (the region detailer tail)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "SAMLoader") === false, "the detector rides the Impact provider, not SAMLoader");
    assert.ok(nodes.some((n) => n.class_type === "DetailerForEach"), "the region detailer rides");
  });

  it("the golden holds on the lightning variant's MERGED view (the variant override rides)", () => {
    // The resolved row for the lightning route is the family row ⊕
    // the variant's own lane_inputs (the recipe↔weights law — the
    // re-spelled unet rides WITH its recipe).
    const merged: ModelFacts = {
      ...FACTS,
      id: "qwen-img-edit-2511-lightning4",
      lane_inputs: {
        ...FACTS.lane_inputs,
        unet: "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors",
      },
    };
    const facts = parseEditFacts(merged.lane_inputs);
    assert.equal(facts.unet, "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors");
    const action = new GraphBuilder({});
    instantiateAction(edit, { ...PARAMS, steps: 4, cfg: 1 }, merged, action, "probe-lw");
    assertGraphGolden(golden("the-golden-holds-on-the-lightning-variant-s-merge-cec1f25ab9"), graphOf(action), "the golden holds on the lightning variant's MERGED view (the variant override rides)");
    const unet = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "UNETLoader",
    )!;
    assert.equal(unet.inputs?.unet_name, "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors");
  });

  it("the never-lie guard keeps width/height 2.1-only — stated here they refuse field-named", () => {
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, width: 1024 }, FACTS, new GraphBuilder({}), "probe-w"),
      /'width'\/'height' fire on the image-edit card only on the Qwen Image 2\.1 lane/,
    );
  });

  it("the node-shape assert refuses a lying DECL cap past the stock node's own 3 slots", () => {
    const lying: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, max_images: 4 } };
    assert.throws(
      () => instantiateAction(edit, PARAMS, lying, new GraphBuilder({}), "probe-shape"),
      /routes to the stock TextEncodeQwenImageEditPlus node.*declares max_images 4/,
    );
  });

  it("the shared ceiling refuses LOUD past the DECL cap — never a quiet drop", () => {
    assert.throws(
      () => instantiateAction(edit, { ...PARAMS, input_images: ["input/a.png", "input/b.png", "input/c.png", "input/d.png"] }, FACTS, new GraphBuilder({}), "probe-cap"),
      /this lane takes 3 input images total.*but the list counts 4.*drop 1/,
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
      input_mask: "input/flat-mask.png",
      mask: [{ mask_mode: "crop_stitch", input_mask: "input/bag-mask.png", mask_denoise: 0.4 }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-flatwins");
    assertGraphGolden(golden("the-golden-holds-when-a-flat-key-wins-over-the-ba-49740cfd1d"), graphOf(action), "the golden holds when a flat key WINS over the bag (explicit flat keys override the region row)");
    const graph = action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>;
    const flatRides = Object.values(graph).some((n) => Object.values(n.inputs ?? {}).includes("input/flat-mask.png"));
    const bagRides = Object.values(graph).some((n) => Object.values(n.inputs ?? {}).includes("input/bag-mask.png"));
    assert.ok(flatRides, "the flat input_mask wins over the bag's row");
    assert.ok(!bagRides, "the bag's own mask path rides nowhere");
  });

  it("the golden holds on the lanpaint spell arm (a spelled mask rides verbatim; grow 0 skips GrowMask; invert rides)", () => {
    const p = {
      ...PARAMS,
      input_mask: "$region",
      mask: [{ mask_grow: 0, mask_invert: true }],
    };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-spell");
    assertGraphGolden(golden("the-golden-holds-on-the-lanpaint-spell-arm-a-spel-d798fc2b90"), graphOf(action), "the golden holds on the lanpaint spell arm (a spelled mask rides verbatim; grow 0 skips GrowMask; invert rides)");
    const graph = action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const nodes = Object.values(graph);
    assert.ok(!nodes.some((n) => n.class_type === "LoadImageMask"), "a spelled mask rides verbatim — no mask load");
    assert.ok(!nodes.some((n) => n.class_type === "GrowMask"), "grow 0 skips the grow node");
    assert.ok(nodes.some((n) => n.class_type === "InvertMask"), "the stated invert rides");
    const sampler = nodes.find((n) => n.class_type === "LanPaint_KSamplerAdvanced")!;
    assert.equal(sampler.inputs.LanPaint_PromptMode, "Image First", "the default prompt mode is Image First");
  });

  it("the spell arm covers the input list too — a spelled anchor and reference ride verbatim, never a loader", () => {
    // The $spell law (the kit's TensorRef doc): '$name' names a
    // FromStage-wired input — the upstream stage's output, never a
    // file on disk. The anchor AND the references ride the raw spell
    // into the stock node's image1/image2 slots; ROW-4 refuses
    // producer links in Load* file slots, so no LoadImage may build.
    const p = { ...PARAMS, input_images: ["$image1", "$image2"] };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-input-spells");
    const graph = action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const nodes = Object.values(graph);
    assert.ok(!nodes.some((n) => n.class_type === "LoadImage"), "no loader builds for a spelled list");
    const pos = nodes.find((n) => n.class_type === "TextEncodeQwenImageEditPlus" && n.inputs.prompt === PARAMS.prompt)!;
    assert.equal(pos.inputs.image1, "$image1", "the spelled anchor rides verbatim");
    assert.equal(pos.inputs.image2, "$image2", "the spelled reference rides verbatim");
    assert.ok(!("image3" in pos.inputs), "two stated images map two slots — never a padded third");
    const encode = nodes.find((n) => n.class_type === "VAEEncode")!;
    assert.equal(encode.inputs.pixels, "$image1", "the plain arm encodes the spelled anchor, not a re-load");
  });

  it("full_frame is the auto edit scope — the same mask composes the SAME graph, never the region detailer", () => {
    // mask_mode's declared vocabulary (pack-fields mask_mode union):
    // auto | crop_stitch | full_frame — full_frame declares "the mask
    // covers the whole frame", so it must normalize onto auto at the
    // arm choice (the kit's region arm reads the same law). A mapping
    // that routes full_frame to the crop_stitch detailer diverges
    // from the auto graph and this arm reads red.
    const withMode = (mode: string): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
      const action = new GraphBuilder({});
      instantiateAction(edit, { ...PARAMS, input_mask: "input/region.png", mask_mode: mode }, FACTS, action, "probe-scope");
      return action.toJSON() as never;
    };
    const full = withMode("full_frame");
    assert.deepEqual(full, withMode("auto"), "full_frame composes the auto graph byte-for-byte");
    const nodes = Object.values(full);
    assert.ok(nodes.some((n) => n.class_type === "LanPaint_KSamplerAdvanced"), "the mask rides the lanpaint arm");
    assert.ok(!nodes.some((n) => n.class_type === "DetailerForEach"), "full_frame never routes the region detailer");
  });

  it("a stated non-numeric knob refuses field-named — the wire's string spill is coerced, never cast", () => {
    // numOf's refusal arm: a JSON form can spill "twenty" where the
    // node's input wants a number; a bare cast would ride the string
    // into the graph and the graph would lie. The knob's own name
    // names the refusal.
    assert.throws(
      () => instantiateAction(
        edit,
        { ...PARAMS, input_mask: "input/region.png", lanpaint_num_steps: "twenty" },
        FACTS,
        new GraphBuilder({}),
        "probe-non-numeric",
      ),
      /lanpaint_num_steps.*not a number/,
    );
  });

  it("a stated feather 0 skips FeatherMask — the rest of the mask prep still rides", () => {
    // The feather<=0 arm of the mask-prep chain (the grow-0 twin the
    // spell arm already pins): a stated 0 is a REAL stated value —
    // only the feather node skips, the loaded mask and the default
    // grow still compose.
    const p = { ...PARAMS, input_mask: "input/region.png", mask_feather: "0" };
    const action = new GraphBuilder({});
    instantiateAction(edit, p, FACTS, action, "probe-feather-0");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type: string }>);
    assert.ok(nodes.some((n) => n.class_type === "LoadImageMask"), "the file mask still loads");
    assert.ok(nodes.some((n) => n.class_type === "GrowMask"), "the default grow still rides");
    assert.ok(!nodes.some((n) => n.class_type === "FeatherMask"), "a stated feather 0 skips the feather node");
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
  it("a drifted encoder class refuses — the 2.1 key never routes this family's weights", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }),
      /text_encode_node.*TextEncodeQwenImageEditPlus/,
    );
  });

  it("a missing weight string refuses field-named", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, text_encoder: undefined }),
      /lane_inputs\.text_encoder.*non-empty string/,
    );
  });

  it("a degenerate max_images refuses", () => {
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, max_images: 0 }),
      /lane_inputs\.max_images.*number ≥ 1/,
    );
    assert.throws(
      () => parseEditFacts({ ...FACTS.lane_inputs, max_images: "3" }),
      /lane_inputs\.max_images.*number ≥ 1/,
    );
  });
});
