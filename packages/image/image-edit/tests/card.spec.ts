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
import { BOARDED } from "../src/card.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { declCap } from "../src/card.ts";

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

  // RIDE-THE-MODEL (operator catch e, 2026-09-22): the schema pins
  // NO steps/cfg default — one lane's lightning recipe (4/1) served
  // as universal made the washed-out edits. The model DECL owns the
  // default through the service cascade (2511 standard 20/2.5,
  // 2.1 25/1); raw compose calls state them like the estate's
  // merged params always do.
  it("THE SCHEMA GATE: steps/cfg carry NO schema default (the model's DECL owns the recipe)", () => {
    const walked = def.schema({ prompt: "make it night", image1: "/m/i.png" }) as Record<string, unknown>;
    assert.equal(walked.steps, undefined, "no universal steps default on the walk");
    assert.equal(walked.cfg, undefined, "no universal cfg default on the walk");
    const g = new GraphBuilder();
    def.compose({ prompt: "make it night", image1: "/m/i.png", steps: 20, cfg: 2.5 }, model, g, "r_def");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["KSampler.0"]?.inputs.steps, 20, "stated values ride verbatim");
    assert.equal(graph["KSampler.0"]?.inputs.cfg, 2.5, "stated values ride verbatim");
  });

  it("THE MODEL ORDER (operator catch e): 2.1 boards FIRST — the tool's default and the GUI's head", () => {
    assert.equal(BOARDED[0], "qwen-img-edit-21", "2.1 is the LATEST lane — the default");
    assert.equal(BOARDED[1], "qwen-img-edit-2511", "2511 is the BACKUP");
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
      // the unification's narrow end: 2511's DECL caps at 3 — the
      // THIRD reference refuses loud (one or two ride the stock slots).
      [{ reference_images: ["/m/a.png", "/m/b.png", "/m/c.png"] }, /'reference_images' fires .*\(this lane takes 2 references/],
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
  it("THE LEAVES DECLARE THEIR FAMILY: width/height ride the 2.1 lane, use_stock_nodes/double_reference ride 2511 — never visible on the sibling; references are ONE unguarded stack", () => {
    // the carrier dance (same as formSchemas: schemaCarrier ?? schema)
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string; max_stack?: number; hidden?: boolean } } }> } };
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
    // THE UNIFICATION (image inputs and reference images are ONE
    // concept): the stack rides BOTH lanes unguarded; the CAP rides
    // the boarded DECLs (roomiest max_images minus the anchor — 15
    // today); each lane refuses past its own DECL cap LOUD at compose.
    assert.equal(leaf("reference_images"), undefined, "the stack carries no model guard — one row, both lanes");
    const refId = root!.dict!["reference_images"];
    assert.equal(json.refs[refId]?.meta?.extra?.max_stack, 15, "the stack caps at the roomiest boarded DECL (2.1's 16 minus the anchor)");
    // THE DECL CAPS (the max_images law): each lane's own node truth
    // rides its DECL into the runtime facts — the gate and the lane
    // read them, never a hardcoded count.
    assert.equal((model.lane_inputs as Record<string, unknown>).max_images, 3, "2511 declares its stock node: 3 total");
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.equal((model21.lane_inputs as Record<string, unknown>).max_images, 16, "2.1 declares its encoder: 16 total");
    // THE LEGACY ALIASES: image2/image3 stay declared for old
    // drafts/agents/flows but NEVER render (hidden — validation-only
    // gate keys; compose merges them to the reference front).
    for (const alias of ["image2", "image3"]) {
      const aliasId: number | undefined = root?.dict?.[alias];
      assert.ok(aliasId !== undefined, `${alias} stays declared for legacy callers`);
      assert.equal(json.refs[aliasId]?.meta?.extra?.hidden, true, `${alias} never renders — one input row, not two`);
    }
  });

  it("a 2-entry stack RIDES the 2511 lane through the card door (the narrow end, no refusal)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", reference_images: ["/m/pose.png", "/m/fabric.png"] }),
      model, g, "r_stack2511",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImageEditPlus");
    assert.ok(enc, "the stock encoder renders through the card door");
    assert.ok("image2" in enc!.inputs && "image3" in enc!.inputs, "the stack's refs ride the stock slots");
  });
});

describe("the reference stack composes on the 2.1 lane (contiguous from image_2, legacy named first)", () => {
  it("stated stack entries ride the encoder's image_2+ slots through the card's own compose door", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.ok(model21, "the qwen-img-edit-21 facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", image2: "/m/garment.png", reference_images: ["/m/pose.png", "/m/fabric.png"] }),
      model21, g, "r_stack",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the 2.1 encoder renders through the card door");
    assert.ok(enc!.inputs["images.image_1"], "anchor on image_1");
    assert.ok(enc!.inputs["images.image_2"], "the legacy named slot keeps image_2");
    assert.ok(enc!.inputs["images.image_3"], "first stack entry shifts to image_3 (no gap)");
    assert.ok(enc!.inputs["images.image_4"], "second stack entry on image_4");
    assert.equal(enc!.inputs["images.image_5"], undefined, "nothing past the stated order");
  });
});

describe("the rail labels (the naming law: version-explicit, never the bare genre)", () => {
  it("the two edit families are distinguishable by label alone", () => {
    assert.equal(registryModel("qwen-img-edit-2511").label, "Qwen Image Edit 2511");
    assert.equal(registryModel("qwen-img-edit-21").label, "Qwen Image Edit 2.1");
  });
});

describe("declCap (the max_images law — the card face rides the DECLs, missing caps break registration LOUD)", () => {
  it("declared caps ride through", () => {
    assert.equal(declCap({ id: "t", lane_inputs: { max_images: 16 } }), 16);
    assert.equal(declCap({ id: "t", lane_inputs: { max_images: 16.9 } }), 16, "a fractional cap floors");
  });
  it("a boarded family without max_images breaks LOUD (fail-loud over a degenerate floor)", () => {
    const bads = [{ id: "t", lane_inputs: {} }, { id: "t" }, { id: "t", lane_inputs: { max_images: "16" } }, { id: "t", lane_inputs: { max_images: 0 } }];
    for (const bad of bads) {
      assert.throws(() => declCap(bad as never), /declares no lane_inputs\.max_images/,
        `missing cap refuses: ${JSON.stringify(bad)}`);
    }
  });
});
