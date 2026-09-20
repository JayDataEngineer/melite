// @melite/image-edit — the card's compose gate (TEST-2 breadth,
// 2026-09-12). TWO admissions (prompt + the anchor image1) plus the
// FIRING REFUSALS (refuseImageEditFiring — knobs whose graph this
// plane does not build refuse loud instead of silently
// plain-editing) plus the REVIVED LANPAINT ARM (2026-09-15 — a
// stated region switches to LanPaint_KSamplerAdvanced; the arm's
// exact wiring is pinned below).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
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
  def = (await loadCardDefs()).get("image-edit")!;
  assert.ok(def, "the composition root serves the image-edit card");
  model = facts.models["qwen-img-edit-2511"]!;
  assert.ok(model, "the qwen-img-edit-2511 facts row serves");
});

describe("the image-edit compose gate", () => {
  it("a missing prompt refuses (WHAT to change, not the whole image)", () => {
    assert.throws(
      () => def.compose(def.schema({ image1: "/m/i.png" }), model, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the image-edit card/,
    );
  });

  it("a missing anchor image1 refuses", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "make it night" }), model, new GraphBuilder(), "r1"),
      /required param 'image1' missing on the image-edit card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope steps refuses loud (declared 1–50), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", steps: 999 }, model, new GraphBuilder(), "r_oob"),
      /steps|999|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed cfg refuses loud (declared number)", () => {
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", cfg: "low" }, model, new GraphBuilder(), "r_wt"),
      /cfg|expected number/i,
    );
  });

  it("THE SCHEMA GATE: unstated steps/cfg arrive as the declared defaults 4/1 (the walk fills them)", () => {
    const g = new GraphBuilder();
    def.compose({ prompt: "make it night", image1: "/m/i.png" }, model, g, "r_def");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["KSampler.0"]?.inputs.steps, 4,
      "the fresh doc composes the schema-declared default steps 4, not undefined");
    assert.equal(graph["KSampler.0"]?.inputs.cfg, 1,
      "the fresh doc composes the schema-declared default cfg 1, not undefined");
  });

  it("THE SCHEMA GATE: the mod-plane surface passes the walk verbatim (anchor + region + firing knobs reach the composer)", () => {
    const doc = def.schema({
      prompt: "x", image1: "/m/i.png", input_mask: "/m/region.png", lanpaint_num_steps: 20,
    }) as Record<string, unknown>;
    assert.equal(doc.image1, "/m/i.png", "the undeclared anchor survives the gate");
    assert.equal(doc.input_mask, "/m/region.png", "the undeclared region survives the gate");
    assert.equal(doc.lanpaint_num_steps, 20, "the undeclared lanpaint knob survives the gate");
  });

  it("the firing refusals name the unbuildable graph (no silent plain-edit)", () => {
    const arms: Array<[Record<string, unknown>, RegExp]> = [
      [{ reference_images: ["/m/a.png"] }, /'reference_images' fires .*\(multi-image lists/],
      [{ double_reference: true }, /'double_reference' fires .*\(the second encode/],
      // forcing the sampler with no region stated refuses —
      // there is nothing to regenerate.
      [{ lanpaint_enabled: true }, /'lanpaint_enabled' fires .*\(force LanPaint with no region/],
      // retired upstream (fixed 1/15 on the new node) — the fields
      // stay declared for form-spec parity and refuse off-default.
      [{ lanpaint_beta: 0.9 }, /'lanpaint_beta' fires .*\(retired upstream/],
      [{ lanpaint_friction: 0.9 }, /'lanpaint_friction' fires .*\(retired upstream/],
      [{ outpaint_top: 64 }, /'outpaint_top' fires .*\(canvas expansion/],
      [{ outpaint_overlap: 32 }, /'outpaint_overlap' fires .*off its lane promise/],
      // a bare-string mask states nothing the arm can read.
      [{ mask: "/m/mask.png" }, /'mask' fires .*\(the mask bag is a list/],
      [{ mask: [{ input_mask: "/m/a.png" }, { input_mask: "/m/b.png" }] }, /'mask' fires .*\(one region per run/],
      [{ mask_mode: "hard" }, /'mask_mode' fires .*\(only auto rides/],
      [{ mask_context_pad: 128 }, /'mask_context_pad' fires .*\(context padding belongs to the unbuilt crop_stitch/],
      [{ mask_threshold: 0.5 }, /'mask_threshold' fires .*\(no core node re-binarizes/],
    ];
    for (const [over, voice] of arms) {
      assert.throws(
        () => def.compose(def.schema({ prompt: "x", image1: "/m/i.png", ...over }), model, new GraphBuilder(), "r1"),
        voice,
      );
    }
  });

  it("a stated region switches to the lanpaint sampler (the revived arm)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "remove the watermark", image1: "/m/i.png", seed: 42,
        input_mask: "/m/region.png", lanpaint_enabled: true,
        lanpaint_num_steps: 20, lanpaint_lambda: 0.5, lanpaint_step_size: 1.0,
        mask_grow: 8, mask_feather: 8,
      }),
      model, g, "run_lp",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    // the mask prep chain (the py host-side chain, node form).
    assert.equal(graph["LoadImageMask.0"].inputs.channel, "alpha", "alpha marks the region");
    assert.equal(graph["GrowMask.0"].inputs.expand, 8, "grow rides");
    assert.deepEqual(
      [graph["FeatherMask.0"].inputs.left, graph["FeatherMask.0"].inputs.top,
       graph["FeatherMask.0"].inputs.right, graph["FeatherMask.0"].inputs.bottom],
      [8, 8, 8, 8], "one feather radius, all four sides",
    );
    assert.ok(graph["LanPaint_ImageEncode.0"], "masked encode rides");
    // the sampler — every drift from the pack pinned.
    const ks = graph["LanPaint_KSamplerAdvanced.0"].inputs;
    assert.equal(ks.steps, 20, "steps <- lanpaint_num_steps");
    assert.equal(ks.noise_seed, 42, "the minted seed rides");
    assert.equal(ks.add_noise, "enable", "their example wiring");
    assert.equal(ks.LanPaint_NumSteps, 5, "upstream default, no pack knob");
    assert.equal(ks.LanPaint_Lambda, 0.5, "pack default (lighter pull than their 5.0)");
    assert.equal(ks.LanPaint_StepSize, 1.0, "pack default (theirs is 0.2)");
    assert.equal(ks.LanPaint_Beta, 1, "retired-upstream fixed value, explicit");
    assert.equal(ks.LanPaint_Friction, 15, "retired-upstream fixed value, explicit");
    assert.equal(ks.LanPaint_PromptMode, "Image First", "negative maps image-first");
    assert.equal(ks.start_at_step, 0, "their example wiring");
    assert.equal(ks.end_at_step, 10000, "their example wiring");
    assert.equal(ks.return_with_leftover_noise, "disable", "their example wiring");
    // the decode merges back inside the mask.
    assert.equal(graph["LanPaint_ImageDecode.0"].inputs.blend_overlap, 9, "MaskBlend-style boundary");
    assert.ok(graph["SaveImage.0"], "the edit saves");
    assert.ok(!graph["KSampler.0"], "no plain sampler beside the arm");
    assert.ok(!graph["VAEEncode.0"], "no plain encode beside the arm");
  });

  it("positive prompt mode rides Prompt First, the bag feeds the arm", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "x", image1: "/m/i.png",
        mask: [{ input_mask: "/m/bag.png", mask_grow: 0, mask_feather: 0 }],
        lanpaint_prompt_mode: "positive",
      }),
      model, g, "r1",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(
      graph["LanPaint_KSamplerAdvanced.0"].inputs.LanPaint_PromptMode,
      "Prompt First", "positive maps prompt-first",
    );
    assert.ok(graph["LoadImageMask.0"], "the bag's region feeds the arm");
    assert.ok(!graph["GrowMask.0"], "grow 0 builds no node");
    assert.ok(!graph["FeatherMask.0"], "feather 0 builds no node");
  });
  it("the firing refusals pass the DEFAULT lanes (the blank() law)", () => {
    // the lanpaint/outpaint/mask knobs at their declared defaults
    // do NOT fire — the plain-edit graph builds.
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "make it night", image1: "/m/i.png", lanpaint_num_steps: 20, outpaint_overlap: 16, mask_grow: 8 }),
      model, g, "run_1",
    );
    const graph = g.toJSON();
    assert.ok(graph["TextEncodeQwenImageEditPlus.0"], "the family edit encoder rides");
    assert.ok(graph["LoadImage.0"], "the anchor loads");
    assert.ok(graph["KSampler.0"], "the stock sampler rides when no region is stated");
    assert.ok(!graph["LanPaint_KSamplerAdvanced.0"], "no lanpaint arm without a region");
  });
});

describe("the lane-bespoke leaves (the model guard — the naming law's visibility half)", () => {
  it("THE FOUR LEAVES DECLARE THEIR FAMILY: width/height ride the 2.1 lane, use_stock_nodes/double_reference ride 2511 — never visible on the sibling", () => {
    // the carrier dance (same as formSchemas: schemaCarrier ?? schema)
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string } } }> } };
    const json = carrier.toJSON();
    const root = Object.values(json.refs).find((n) => n.type === "object" && n.dict !== undefined);
    assert.ok(root, "the schema envelope serves");
    const leaf = (name: string): string | undefined => {
      const refId = root!.dict![name];
      if (refId === undefined) return undefined;
      return json.refs[refId]?.meta?.extra?.visible_when;
    };
    // the 2.1-only resolution knobs
    assert.equal(leaf("width"), "model=qwen-img-edit-21", "width declares its family");
    assert.equal(leaf("height"), "model=qwen-img-edit-21", "height declares its family");
    // the 2511-only tuning knobs
    assert.equal(leaf("use_stock_nodes"), "model=qwen-img-edit-2511", "use_stock_nodes declares its family");
    assert.equal(leaf("double_reference"), "model=qwen-img-edit-2511", "double_reference declares its family");
    // the SHARED surface never hides (no guard on the plain knobs)
    assert.equal(leaf("prompt"), undefined, "the shared surface never carries a model guard");
    assert.equal(leaf("image1"), undefined, "the anchor is every edit lane's surface");
    assert.equal(leaf("seed"), undefined);
  });
});

describe("the rail labels (the naming law: version-explicit, never the bare genre)", () => {
  it("the two edit families are distinguishable by label alone", () => {
    assert.equal(registryModel("qwen-img-edit-2511").label, "Qwen Image Edit 2511");
    assert.equal(registryModel("qwen-img-edit-21").label, "Qwen Image Edit 2.1");
  });
});
