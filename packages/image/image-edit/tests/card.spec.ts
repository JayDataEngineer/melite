// @melite/image-edit — the card's compose gate (TEST-2 breadth,
// 2026-09-12). TWO admissions (prompt + the anchor image1) plus the
// FIRING REFUSALS (refuseImageEditFiring — knobs whose graph this
// plane does not build refuse loud instead of silently
// plain-editing) plus the RETIRED INLINE-INPAINT ARM (2026-11-12 —
// no lane inpaints in place: a stated region in auto refuses
// field-named, and stale inpaint/outpaint knobs refuse as
// undeclared params at admission).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { BOARDED } from "../src/card.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL as maskSelectDecl, DETECTOR_PROVISIONS, PROVISIONS as MASK_PROVISIONS } from "@melite/models-mask";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { declCap, ACTION_BINDINGS } from "../src/card.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

// THE VERBATIM CONTENT LAW: the card's detector downloads are literals
// here, compared field-by-field against the card-kit catalog the card
// spreads — an identity check against that same constant cannot fail,
// so the digest, url and size are the pins.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, url: string, folder: string, sha256: string, size_bytes: number]
> = [
  ["person_yolov8m-seg.pt", "https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt", "ultralytics/segm", "c8ab26f517173b1fe8342d336a09f443eb61cb08dcbfc78d53fff4c2547ae81e", 54827683],
  ["face_yolov8m.pt", "https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt", "ultralytics/bbox", "717923c19b3f4bbf5250b728f1fa6b2cb72a33aed1d236ea9caf0e21ad943e5f", 52026019],
  ["hand_yolov8s.pt", "https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt", "ultralytics/bbox", "70b540063fbc385736d8258970744a4afbc4cbf7932134bae3b24cdadeadec06", 22507643],
];

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

  it("a missing anchor refuses — the ONE list must carry position 0 (THE MERGE, 2026-10-10)", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "make it night" }), model, new GraphBuilder(), "r1"),
      /required param 'input_images' missing on the image-edit card \(the first image is the one being edited/,
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

  // THE SIZE LAW AT THE CARD (2026-11-08, restated by the
  // ground-truth cure 2026-11-12): a stated pair SIZES THE RENDER —
  // the 2.1 lane derives the encoder's pixel budget from w·h and
  // samples an exact w×h empty latent (the delivered frame is the
  // rendered frame, NO post-decode ImageScale); 2511 (legacy)
  // keeps its own post-decode resize. The match toggle owns the
  // door: ON + a stated axis refuses field-named with the flip in
  // the voice (the clean compose builds no stated-size latent);
  // OFF + both axes composes the render-sizing on the graph.
  it("THE SIZE LAW AT THE CARD: a stated pair sizes the render — match ON refuses with the flip in the voice, match OFF + both axes renders at the stated canvas", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.ok(model21, "the qwen-img-edit-21 facts row serves");
    // Match ON (the default) + a stated pair refuses field-named,
    // naming the flip — never a silent ignore.
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", width: 512, height: 512, steps: 25, cfg: 1 }, model21, new GraphBuilder(), "r_size21"),
      /match_input_resolution is ON/,
      "the 2.1 lane refuses the stated pair field-named, teaching the flip",
    );
    // …and on the 2511 lane (the same never-lie voice).
    assert.throws(
      () => def.compose(def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", width: 512, height: 512 }), model, new GraphBuilder(), "r_size2511"),
      /match_input_resolution is ON/,
      "the 2511 lane refuses the stated pair field-named, teaching the flip",
    );
    // The clean compose builds NO stated-size latent and NO resize:
    // its KSampler rides the encoder's own third output.
    const g = new GraphBuilder();
    def.compose({ prompt: "make it night", image1: "/m/i.png", steps: 25, cfg: 1 }, model21, g, "r_latent21");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(!Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"), "no EmptyLatentImage — the encoder's latent is the geometry");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "ImageScale"), "no ImageScale — match ON delivers at the source's frame");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.match(String(sampler?.inputs?.latent_image ?? ""), /^TextEncodeQwenImage21/, "the latent wire is the encoder's own");
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.equal(enc?.inputs?.resolution, 0, "the reference budget is 0 — each reference at its own size");
    // Match OFF + both axes SIZES THE RENDER: an exact empty latent
    // at the stated canvas, a matched encoder budget, and ZERO
    // ImageScale (a post-decode stretch is the pixel defect).
    const gSized = new GraphBuilder();
    def.compose({ prompt: "make it night", image1: "/m/i.png", match_input_resolution: false, width: 1024, height: 768, steps: 25, cfg: 1 }, model21, gSized, "r_sizeoff21");
    const sized = gSized.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.equal(Object.values(sized).filter((n) => n.class_type === "ImageScale").length, 0,
      "no ImageScale — the delivered frame IS the rendered frame");
    const empty = Object.values(sized).find((n) => n.class_type === "EmptyLatentImage")!;
    assert.ok(empty, "the stated pair renders through an exact empty latent");
    assert.deepEqual([empty.inputs.width, empty.inputs.height, empty.inputs.batch_size], [1024, 768, 1],
      "the latent IS the stated canvas");
    const sizedSampler = Object.values(sized).find((n) => n.class_type === "KSampler")!;
    assert.match(String(sizedSampler.inputs.latent_image), /^EmptyLatentImage/,
      "the sampler samples the stated canvas");
    const sizedEnc = Object.values(sized).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    // sqrt(1024·768) = 886.8 → round32 = 896 → the node's own
    // working band floors it at 1024 — references process at the
    // stated scale
    assert.equal(sizedEnc.inputs.resolution, 1024, "the encoder budget derives from the stated pair (round32·sqrt(w·h), clamped)");
  });

  // THE MATCH INCOMPLETE: match OFF demands BOTH axes (a single
  // axis is a malformed deliverable, never a half-resize), and the
  // axes must be whole pixels ≥ 16px (the input-prep laws).
  it("THE MATCH INCOMPLETE: match OFF with one axis, a fractional axis, or a blank-sized axis refuses field-named", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", match_input_resolution: false, width: 1024, steps: 25, cfg: 1 }, model21, new GraphBuilder(), "r_half"),
      /state both width and height/,
      "a single stated axis refuses — the deliverable needs both",
    );
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", match_input_resolution: false, width: 1024.5, height: 768, steps: 25, cfg: 1 }, model21, new GraphBuilder(), "r_frac"),
      /\$\.width expected number multiple of 1/,
      "a fractional axis refuses at the schema — the step(1) integer spelling rejects before the compose door (still loud, still field-named)",
    );
    assert.throws(
      () => def.compose({ prompt: "make it night", image1: "/m/i.png", match_input_resolution: false, width: 12, height: 12, steps: 25, cfg: 1 }, model21, new GraphBuilder(), "r_blank"),
      /at least 16px/,
      "a blank-sized axis refuses — the blank-image law",
    );
  });

  // THE MATCH DEFAULT (the no-typing convenience): the schema default
  // is ON, so a draft that never mentions the toggle still matches.
  it("THE MATCH DEFAULT: match_input_resolution defaults ON (the schema walk carries it)", () => {
    const walked = def.schema({ prompt: "make it night", image1: "/m/i.png" }) as Record<string, unknown>;
    assert.equal(walked.match_input_resolution, true, "the toggle defaults ON — no typing needed");
  });

  // THE 2511 POLE: the toggle is admitted on the 2511 lane (a
  // default-ON draft never refuses there); ON edits and delivers at
  // source resolution, OFF + both axes resizes the deliverable.
  it("THE 2511 POLE: match_input_resolution ON composes clean, OFF demands the pair and resizes the deliverable", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", match_input_resolution: true }),
      model, g, "r_match2511",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "TextEncodeQwenImageEditPlus"), "the 2511 lane still composes with the toggle on");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"), "the 2511 lane builds no target latent — the toggle changes nothing while ON");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "ImageScale"), "no resize — ON delivers at the source's frame");
    const gOff = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", match_input_resolution: false, width: 1024, height: 1024 }),
      model, gOff, "r_match2511off",
    );
    const offGraph = gOff.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(offGraph).some((n) => n.class_type === "ImageScale"), "match OFF + both axes resizes the 2511 deliverable too");
  });

  it("the edit-scope field names whole-image and masked-region choices", () => {
    const pack = theService().cardModFields("image-edit").find((row) => row.pack === "mask");
    assert.ok(pack, "the image-edit mask pack is absorbed");
    const field = pack.fields.dict?.["mask_mode"] as {
      meta?: { description?: unknown; default?: unknown; extra?: Record<string, unknown> };
    } | undefined;
    assert.ok(field, "the mask scope field serves");
    assert.equal(field.meta?.description, "Edit Scope");
    assert.equal(field.meta?.default, "crop_stitch");
    assert.deepEqual(field.meta?.extra?.options, [
      { value: "auto", label: "Whole image (default)" },
      { value: "crop_stitch", label: "Masked region (crop + stitch)" },
    ]);
    assert.match(String(field.meta?.extra?.tooltip), /whole-image/);
    assert.match(String(field.meta?.extra?.tooltip), /Masked region/);
  });

  it("THE SCHEMA GATE: the mod-plane surface passes the walk verbatim — but stale inpaint knobs refuse at admission (undeclared params never compose)", () => {
    const doc = def.schema({
      prompt: "x", image1: "/m/i.png", input_mask: "/m/region.png",
    }) as Record<string, unknown>;
    assert.equal(doc.image1, "/m/i.png", "the declared anchor survives the gate");
    assert.equal(doc.input_mask, "/m/region.png", "the hidden mask-seat gate key survives the gate (declared, hidden — never a face)");
    // the retired arm's knobs are undeclared on every surface now —
    // admission refuses them before the firing gate ever runs.
    for (const stale of ["lanpaint_enabled", "lanpaint_num_steps", "lanpaint_lambda", "outpaint_top", "outpaint_overlap"]) {
      assert.throws(
        () => def.compose(def.schema({ prompt: "x", image1: "/m/i.png", [stale]: 1 }), model, new GraphBuilder(), "r_stale"),
        new RegExp(`undeclared param\\(s\\): ${stale}`),
        `the stale ${stale} knob refuses at admission`,
      );
    }
  });

  it("THE MIGRATION LAW: a stated input_images folds the legacy keys away (the operator's old drafts run forward)", () => {
    // The refusal fired on the operator's own history — a draft
    // written pre-merge carries image1 under the hidden face while
    // the new list collects entries. The one list WINS.
    const doc = def.schema({
      prompt: "x", image1: "/m/stale.png", reference_images: ["/m/stale-ref.png"], input_images: ["/m/in.png", "/m/r.png"],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(doc, model, g, "migrate1");
    const files = Object.values(g.toJSON()).map((n) => (n.inputs as Record<string, unknown>)["image"]).filter((v) => typeof v === "string") as string[];
    assert.ok(files.includes("/m/in.png") && files.includes("/m/r.png"), "the canonical list reaches the graph");
    assert.ok(!files.includes("/m/stale.png") && !files.includes("/m/stale-ref.png"), "the stale legacy values never reach a slot — folded, not refused");
  });

  it("the firing refusals name the unbuildable graph (no silent plain-edit)", () => {
    // stale inpaint/outpaint knobs refuse EARLIER — at admission
    // (undeclared params, pinned in the schema-gate test above), so
    // the firing gate never sees them. What reaches the gate and no
    // graph carries refuses field-named here.
    const undeclared = (key: string): RegExp => new RegExp(`undeclared param\\(s\\): ${key}`);
    const arms: Array<[Record<string, unknown>, RegExp]> = [
      // (the merge's old mixed-vocab refusal is RETIRED — the
      // migration law folds legacy keys under a stated input_images;
      // pinned in its own test below)
      [{ double_reference: true }, /'double_reference' fires .*\(the second encode/],
      // the retired arm's knobs are undeclared — admission refuses.
      [{ lanpaint_enabled: true }, undeclared("lanpaint_enabled")],
      [{ lanpaint_beta: 0.9 }, undeclared("lanpaint_beta")],
      [{ lanpaint_friction: 0.9 }, undeclared("lanpaint_friction")],
      [{ outpaint_top: 64 }, undeclared("outpaint_top")],
      [{ outpaint_overlap: 32 }, undeclared("outpaint_overlap")],
      // a bare-string mask states nothing the arm can read.
      [{ mask: "/m/mask.png" }, /'mask' fires .*\(the mask bag is a list/],
      [{ mask: [{ input_mask: "/m/a.png" }, { input_mask: "/m/b.png" }] }, /'mask' fires .*\(one region per run/],
      [{ mask_mode: "hard" }, /'mask_mode' fires .*\(unknown region mode/],
      [{ mask_detector: "yolo" }, /'mask_detector' fires .*\(unknown region detector/],
      [{ mask_mode: "crop_stitch" }, /'mask_mode' fires .*needs a region/],
      [{ mask_mode: "crop_stitch", input_mask: "/m/a.png", mask_detector: "face" }, /'mask_detector' fires .*both stated/],
      [{ mask_mode: "crop_stitch", input_mask: "/m/a.png", mask_threshold: 0.5 }, /'mask_threshold' fires .*re-binarizes/],
      [{ mask_detector: "face" }, /'mask_detector' fires .*ride crop_stitch only/],
      [{ mask_detector_threshold: 0.7 }, /'mask_detector_threshold' fires .*rides crop_stitch only/],
      [{ mask_detail_size: 768 }, /'mask_detail_size' fires .*rides crop_stitch only/],
      [{ mask_denoise: 0.8 }, /'mask_denoise' fires .*rides crop_stitch only/],
      [{ mask_context_pad: 128 }, /'mask_context_pad' fires .*rides crop_stitch only/],
      [{ mask_threshold: 0.5 }, /'mask_threshold' fires .*\(no core node re-binarizes/],
      // the retired arm: a stated region in auto refuses field-named
      // on EVERY lane — the voice teaches crop_stitch.
      [{ input_mask: "/m/a.png" }, /'input_mask' fires .*no edit lane inpaints in place.*state mask_mode crop_stitch/],
      [{ mask: [{ input_mask: "/m/a.png" }] }, /'input_mask' fires .*no edit lane inpaints in place/],
    ];
    for (const [over, voice] of arms) {
      assert.throws(
        () => def.compose(def.schema({ prompt: "x", image1: "/m/i.png", ...over }), model, new GraphBuilder(), "r1"),
        voice,
      );
    }
    // THE NARROW END, canonical spelling (no legacy key): 2511's
    // DECL caps at 3 — a FOURTH list entry refuses loud.
    assert.throws(
      () => def.compose(def.schema({ prompt: "x", input_images: ["/m/in.png", "/m/a.png", "/m/b.png", "/m/c.png"] }), model, new GraphBuilder(), "r1"),
      /'input_images' fires .*\(this lane takes 3 input images total/,
    );
  });

  it("a stated region in auto refuses through the card door (the retired inline-inpaint arm — no lane inpaints in place)", () => {
    assert.throws(
      () => def.compose(
        def.schema({
          prompt: "remove the watermark", image1: "/m/i.png", seed: 42,
          input_mask: "/m/region.png",
        }),
        model, new GraphBuilder(), "run_lp",
      ),
      /'input_mask' fires .*no edit lane inpaints in place.*state mask_mode crop_stitch/,
    );
    // the same region under crop_stitch composes the detailer — the
    // refusal names the fix, and the fix works.
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "remove the watermark", image1: "/m/i.png", seed: 42,
        input_mask: "/m/region.png", mask_mode: "crop_stitch",
      }),
      model, g, "run_cs_fix",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "DetailerForEach"), "the taught fix composes the region detailer");
    assert.ok(!Object.values(graph).some((n) => (n.class_type ?? "").startsWith("LanPaint")), "no legacy inpaint topology beside the arm");
  });

  it("a bag-stated region feeds the detailer (the bag's painted mask drives MaskToSEGS)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "x", image1: "/m/i.png",
        mask: [{ input_mask: "/m/bag.png", mask_mode: "crop_stitch", mask_grow: 0, mask_context_pad: 0 }],
      }),
      model, g, "r1",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.deepEqual(
      graph["MaskToSEGS.0"].inputs.mask,
      ["LoadImageMask.0", 0], "the bag's region feeds the segmenter",
    );
    assert.ok(graph["DetailerForEach.0"], "the bag's region feeds the detailer");
    assert.ok(Object.values(graph).every((n) => !(n.class_type ?? "").startsWith("LanPaint")), "no legacy inpaint topology");
    assert.ok(!graph["GrowMask.0"], "zero halo builds no node");
  });
  it("crop_stitch with a painted mask builds the region detailer (MaskToSEGS → DetailerForEach → save)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "repaint the sign", image1: "/m/i.png", seed: 42, steps: 20, cfg: 2.5,
        input_mask: "/m/region.png", mask_mode: "crop_stitch",
        mask_detail_size: 768, mask_denoise: 0.8, mask_grow: 0, mask_feather: 4,
      }),
      model, g, "run_cs",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["LoadImageMask.0"].inputs.channel, "alpha", "alpha marks the region");
    assert.equal(graph["GrowMask.0"].inputs.expand, 64, "grow 0 + context pad 64 compose one halo");
    assert.equal(graph["MaskToSEGS.0"].inputs.combined, true, "one region from the user mask");
    assert.equal(graph["MaskToSEGS.0"].inputs.crop_factor, 3, "canonical detailer context");
    const detail = graph["DetailerForEach.0"].inputs;
    assert.equal(detail.guide_size, 768, "detail size rides");
    assert.equal(detail.guide_size_for, true, "bbox sizing");
    assert.equal(detail.max_size, 1024, "canonical DetailerForEach ceiling");
    assert.equal(detail.denoise, 0.8, "region denoise rides");
    assert.equal(detail.feather, 4, "feather blends the paste");
    assert.equal(detail.seed, 42, "the minted seed rides");
    assert.equal(detail.steps, 20, "steps ride the detailer");
    assert.equal(detail.cfg, 2.5, "cfg rides the detailer");
    assert.equal(detail.noise_mask, true, "the crop edits inside the mask");
    assert.equal(detail.force_inpaint, true, "their example wiring");
    assert.ok(graph["SaveImage.0"], "the edit saves");
    // THE DIRECT-SAVE LAW (the bug the GPU receipt caught pre-flight):
    // DetailerForEach returns IMAGE — SaveImage wires it DIRECTLY, and
    // a VAEDecode under it (the latent-path habit) would refuse at
    // execute time.
    assert.deepEqual(graph["SaveImage.0"].inputs.images, ["DetailerForEach.0", 0], "the detailer's IMAGE output saves directly — no latent decode");
    assert.ok(!graph["VAEDecode.0"], "no decode under an IMAGE output");
    assert.ok(!graph["KSampler.0"], "no plain sampler beside the arm");
    assert.ok(!graph["VAEEncode.0"], "no plain encode beside the arm");
    assert.ok(!graph["LanPaint_KSamplerAdvanced.0"], "no legacy inpaint sampler beside the arm");
  });

  // THE SPELL ARM (the wired-anchor law, 2026-10-09 — the operator's
  // live refusal: a wired edit stage died at the merge because the
  // compose ALWAYS built LoadImage for the anchor, and ROW-4 refuses
  // a producer link in a file slot). A $name names a WIRED stage
  // input: the spell rides the tensor slots VERBATIM (the merge's
  // rewriteSpells lands the producer link there) and NO loader is
  // built for it — the spell IS the tensor.
  it("THE SPELL ARM: a wired anchor ($spell) rides tensor slots verbatim — no LoadImage, the merge lands the link", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "edit the upstream", image1: "$up", reference_images: ["$ref1"],
        seed: 42, steps: 20, cfg: 2.5,
      }),
      model, g, "r_spell",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    // NO loader exists at all: the anchor AND the one ref are both
    // spelled — a loader would refuse at the merge (ROW-4)
    const loaders = Object.entries(graph).filter(([, n]) => n.class_type.startsWith("Load"));
    assert.equal(loaders.length, 0, "a spelled anchor builds no LoadImage (ROW-4: producer links never land in file slots)");
    // the anchor spell rides the encoder's image1 TENSOR slots (pos+neg)
    assert.equal(graph["TextEncodeQwenImageEditPlus.0"].inputs.image1, "$up", "pos encode carries the spell");
    assert.equal(graph["TextEncodeQwenImageEditPlus.1"].inputs.image1, "$up", "neg encode carries the spell");
    // the ref spell rides the stock node's image2 slot
    assert.equal(graph["TextEncodeQwenImageEditPlus.0"].inputs.image2, "$ref1", "the spelled ref rides its tensor slot");
    // the 2511 lane encodes the source at its own resolution — the
    // spelled anchor rides the VAEEncode pixels tensor too
    assert.equal(graph["VAEEncode.0"].inputs.pixels, "$up", "the encode pixels carry the spell");
  });

  it("THE SPELL ARM: an unwired file path keeps the LoadImage handoff (the disk path owns files)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "edit the file", image1: "/m/i.png", seed: 42, steps: 20, cfg: 2.5 }),
      model, g, "r_file",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.equal(graph["LoadImage.0"].inputs.image, "/m/i.png", "the file anchor keeps its loader");
    assert.ok(Array.isArray(graph["VAEEncode.0"].inputs.pixels), "the encode wires the loader's handle");
  });

  it("THE SPELL ARM (2.1 lane): spelled anchor+ref ride the encoder's dotted slots — parity with 2511, never a loader", () => {
    // THE AUDIT'S LOW (the independent audit's gap 4): parity was
    // construction-only — no wall pinned a spell through the 2.1
    // dotted-slot path, one refactor from silent divergence. The
    // shared preamble loads spelled values (no LoadImage); the
    // 2.1 arm maps them onto images.image_1 + image_2+ in order.
    const model21 = facts.models["qwen-img-edit-21"]!;
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "edit the upstream", image1: "$up", reference_images: ["$ref1"],
        seed: 42, steps: 20, cfg: 2.5,
      }),
      model21, g, "r_spell21",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const loaders = Object.entries(graph).filter(([, n]) => n.class_type.startsWith("Load"));
    assert.equal(loaders.length, 0, "a spelled 2.1 run builds no loader");
    const enc = graph["TextEncodeQwenImage21.0"]!;
    assert.equal(enc.inputs["images.image_1"], "$up", "the anchor spell rides the first dotted slot");
    assert.equal(enc.inputs["images.image_2"], "$ref1", "the ref spell rides the second dotted slot");
  });

  it("crop_stitch with zero halo builds no GrowMask, invert splices before the SEGS", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "x", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        input_mask: "/m/r.png", mask_mode: "crop_stitch",
        mask_grow: 0, mask_context_pad: 0, mask_feather: 0, mask_invert: true,
      }),
      model, g, "run_cs0",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.ok(!graph["GrowMask.0"], "zero halo builds no node");
    assert.deepEqual(graph["InvertMask.0"].inputs.mask, ["LoadImageMask.0", 0], "the invert reads the loaded mask");
    assert.deepEqual(graph["MaskToSEGS.0"].inputs.mask, ["InvertMask.0", 0], "the SEGS reads the INVERTED mask");
  });

  it("crop_stitch with the face detector wires the bbox chain (provider slot 0)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "studio portrait", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        mask_mode: "crop_stitch", mask_detector: "face", mask_detector_threshold: 0.7,
      }),
      model, g, "run_face",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["UltralyticsDetectorProvider.0"].inputs.model_name, "bbox/face_yolov8m.pt", "the face weights ride");
    assert.deepEqual(graph["BboxDetectorSEGS.0"].inputs.bbox_detector, ["UltralyticsDetectorProvider.0", 0], "face rides the bbox detector slot");
    assert.equal(graph["BboxDetectorSEGS.0"].inputs.threshold, 0.7, "the detector threshold rides");
    assert.equal(graph["BboxDetectorSEGS.0"].inputs.dilation, 72, "grow 8 + context pad 64 compose the halo");
    assert.ok(graph["DetailerForEach.0"], "the detailer pastes the face crop back");
    assert.ok(!graph["LoadImageMask.0"], "no painted mask beside the detector");
  });

  it("crop_stitch with the person detector wires the segm chain (provider slot 1)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "new jacket", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        mask_mode: "crop_stitch", mask_detector: "person",
      }),
      model, g, "run_person",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["UltralyticsDetectorProvider.0"].inputs.model_name, "segm/person_yolov8m-seg.pt", "the person weights ride");
    assert.deepEqual(graph["SegmDetectorSEGS.0"].inputs.segm_detector, ["UltralyticsDetectorProvider.0", 1], "person rides the segm detector slot");
    assert.ok(graph["DetailerForEach.0"], "the detailer pastes the person crop back");
  });

  // ── THE 2.1 LANE (the operator's lane, 2026-09-22: "2511 is the
  // legacy model… 2.1 is the new Qwen edit model") — the SAME generic
  // region detailer rides the cache-wrapped model + the 2.1 encoder's
  // conditioning; no EmptyLatentImage (the detailer sizes each crop
  // itself), no source VAEEncode (this lane never encodes the source).
  it("crop_stitch on the 2.1 lane rides the cache model + encoder conditioning (the operator's lane)", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.ok(model21, "the qwen-img-edit-21 facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "studio portrait", image1: "/m/i.png", seed: 7, steps: 25, cfg: 1,
        mask_mode: "crop_stitch", mask_detector: "face",
      }),
      model21, g, "run_21cs",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.ok(graph["QwenImage21Cache.0"], "the unet rides the 2.1 cache wrapper");
    assert.equal(graph["TextEncodeQwenImage21.0"].inputs.prompt, "studio portrait", "the 2.1 encoder conditions the crops");
    assert.equal(graph["UltralyticsDetectorProvider.0"].inputs.model_name, "bbox/face_yolov8m.pt", "the face weights ride");
    assert.deepEqual(graph["BboxDetectorSEGS.0"].inputs.bbox_detector, ["UltralyticsDetectorProvider.0", 0], "face rides the bbox detector slot");
    const detail = graph["DetailerForEach.0"].inputs;
    assert.deepEqual(detail.model, ["QwenImage21Cache.0", 0], "the detailer samples the CACHE-WRAPPED model");
    assert.deepEqual(detail.positive, ["TextEncodeQwenImage21.0", 0], "positive rides the encoder's out 0");
    assert.deepEqual(detail.negative, ["TextEncodeQwenImage21.0", 1], "negative rides the encoder's out 1");
    assert.deepEqual(graph["SaveImage.0"].inputs.images, ["DetailerForEach.0", 0], "the IMAGE output saves directly");
    assert.ok(!graph["EmptyLatentImage.0"], "the detailer path builds no target latent");
    assert.ok(!graph["KSampler.0"], "no plain sampler beside the arm");
    assert.ok(!graph["VAEEncode.0"], "this lane never encodes the source");
    assert.ok(!graph["VAEDecode.0"], "no decode under an IMAGE output");
  });

  // THE DELIVERABLE RESIZE RIDES CROP_STITCH TOO (the size door):
  // the detailer owns the CROP size (guide 512/max 1024 per region
  // — untouched); a stated Width/Height resizes the PASTED
  // DELIVERABLE through the same match door as the plain arm
  // (match ON + stated refuses with the flip; match OFF + both
  // axes mounts one ImageScale after the DetailerForEach paste —
  // the detailer path is byte-stable under the ground-truth cure;
  // the plain arm's cure sizes its render instead).
  it("width/height on a 2.1 crop_stitch run ride the same match door (the detailer owns the crop size, the stated pair owns the deliverable)", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    // match ON (schema default) + stated refuses with the flip.
    assert.throws(
      () => def.compose(
        def.schema({
          prompt: "studio portrait", image1: "/m/i.png", seed: 7, steps: 25, cfg: 1,
          mask_mode: "crop_stitch", mask_detector: "face", width: 1024, height: 1024,
        }),
        model21, new GraphBuilder(), "run_21wh",
      ),
      /match_input_resolution is ON/,
      "crop_stitch + match ON + stated refuses — teaching the flip",
    );
    // match OFF + both axes mounts the deliverable resize AFTER the
    // region paste (the DetailerForEach still owns the crop).
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "studio portrait", image1: "/m/i.png", seed: 7, steps: 25, cfg: 1,
        mask_mode: "crop_stitch", mask_detector: "face",
        match_input_resolution: false, width: 1600, height: 900,
      }),
      model21, g, "run_21resize",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "DetailerForEach"), "the region detailer still mounts — the crop is its own");
    const detailer = Object.values(graph).find((n) => n.class_type === "DetailerForEach");
    assert.equal(detailer?.inputs?.guide_size, 512, "the crop size is untouched");
    const scales = Object.values(graph).filter((n) => n.class_type === "ImageScale");
    assert.equal(scales.length, 1, "exactly one ImageScale — the pasted deliverable resizes to the stated pair");
    assert.equal(scales[0].inputs.width, 1600, "the stated width lands on the deliverable");
    assert.equal(scales[0].inputs.height, 900, "the stated height lands on the deliverable");
  });

  it("crop_stitch with the hand detector wires the nano bbox chain", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "fix the fingers", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        mask_mode: "crop_stitch", mask_detector: "hand",
      }),
      model, g, "run_hand",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["UltralyticsDetectorProvider.0"].inputs.model_name, "bbox/hand_yolov8s.pt", "the hand weights ride");
    assert.deepEqual(graph["BboxDetectorSEGS.0"].inputs.bbox_detector, ["UltralyticsDetectorProvider.0", 0], "hand rides the bbox detector slot");
  });

  it("crop_stitch with a bag-stated detector merges under the flat params", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "x", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        mask_mode: "crop_stitch", mask: [{ mask_detector: "hand" }],
      }),
      model, g, "run_bagdet",
    );
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["UltralyticsDetectorProvider.0"].inputs.model_name, "bbox/hand_yolov8s.pt", "the bag's detector feeds the arm");
  });

  it("THE ARM WEIGHTS: only a crop_stitch detector run names its provision row", () => {
    const arm = def.armWeights!;
    assert.deepEqual(arm({}), [], "no params names nothing");
    assert.deepEqual(arm({ mask_mode: "auto", mask_detector: "face" }), [], "auto names nothing — the gate refuses that combo after this read");
    assert.deepEqual(arm({ mask_mode: "crop_stitch" }), [], "a painted-mask run touches no detector weights");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask: "nope" }), [], "a non-list bag names nothing");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask: [{}, {}] }), [], "a multi-entry bag names nothing");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask: ["nope"] }), [], "a non-object bag entry names nothing");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask: [null] }), [], "a null bag entry names nothing");
    assert.deepEqual(
      arm({ mask_mode: "crop_stitch", mask_detector: "off", mask: [{ mask_mode: "auto" }] }),
      [], "an explicit flat key wins over the bag",
    );
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask_detector: "person" }), ["person_yolov8m-seg.pt"], "person names its row");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask: [{ mask_detector: "face" }] }), ["face_yolov8m.pt"], "a bag-stated detector names its row");
    assert.deepEqual(arm({ mask_mode: "crop_stitch", mask_detector: "hand" }), ["hand_yolov8s.pt"], "hand names its row");
  });
  it("THE FAMILY OWNS THE DOWNLOADS (the class law's member cure — the card serves, never authors)", () => {
    // IDENTITY, not verbatim: the card's rows ARE the family's rows
    // (whole array, the DETECTOR_PROVISIONS export) — a spread COPY
    // of the kit constant reds here (the exact shape whose death
    // PROOF-14 proved on the mask card).
    assert.equal(def.provisions, DETECTOR_PROVISIONS, "the card's detector rows are the family export BY IDENTITY — a copy fails");
    // and every row object is one of the family DECL's own PROVISIONS rows
    for (const row of def.provisions ?? []) {
      assert.ok(MASK_PROVISIONS.includes(row), `row '${(row as { name: string }).name}' is a row of the mask-select DECL's PROVISIONS`);
    }
    // the owner is stamped and names the family — the rescue reads
    // provision_model model=mask-select, the ONE door by family id
    assert.equal(def.provisionOwner, maskSelectDecl.id, "the owner is the family, never the card");
    // the verbatim pins still hold (url, folder, digest, size)
    assert.deepEqual(
      (def.provisions ?? []).map((r) => [r.name, r.url, r.folder, r.sha256, r.size_bytes]),
      PROVISION_PINS,
      "every served provision row carries its pinned url, folder, digest and size",
    );
  });
  it("THE PROVISIONS ↔ ARM-WEIGHTS AGREEMENT (both directions, the mask card's twin)", () => {
    // every weight the arm can name has a served row (a name without
    // a row is a run-time download refusal), and no served row exists
    // that no arm can touch (a dead row rides every press's gate).
    const DETECTABLE = ["person", "face", "hand"] as const;
    const names = DETECTABLE.flatMap((d) => def.armWeights!({ mask_mode: "crop_stitch", mask_detector: d }));
    const rows = (def.provisions ?? []).map((r) => (r as { name: string }).name);
    for (const n of names) assert.ok(rows.includes(n), `arm weight '${n}' has a served provision row`);
    assert.equal(rows.length, new Set(names).size, "every served row is reachable by some arm weight (no dead rows)");
  });
  it("the firing refusals pass the DEFAULT lanes (the blank() law)", () => {
    // the mask knobs at their declared defaults do NOT fire — the
    // plain-edit graph builds. (The retired inpaint/outpaint knobs
    // are undeclared and refuse at admission — pinned above.)
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "make it night", image1: "/m/i.png", mask_grow: 8 }),
      model, g, "run_1",
    );
    const graph = g.toJSON();
    assert.ok(graph["TextEncodeQwenImageEditPlus.0"], "the family edit encoder rides");
    assert.ok(graph["LoadImage.0"], "the anchor loads");
    assert.ok(graph["KSampler.0"], "the stock sampler rides when no region is stated");
    assert.ok(Object.values(graph).every((n) => !(n as { class_type: string }).class_type.startsWith("LanPaint")), "no legacy inpaint arm without a region");
  });

  it("full_frame and auto produce the same whole-image graph", () => {
    const params = { prompt: "make it night", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5 };
    const defaultMode = new GraphBuilder();
    const auto = new GraphBuilder();
    const fullFrame = new GraphBuilder();
    def.compose(def.schema(params), model, defaultMode, "run_alias");
    def.compose(def.schema({ ...params, mask_mode: "auto" }), model, auto, "run_alias");
    def.compose(def.schema({ ...params, mask_mode: "full_frame" }), model, fullFrame, "run_alias");
    assert.deepEqual(defaultMode.toJSON(), auto.toJSON());
    assert.deepEqual(auto.toJSON(), fullFrame.toJSON());
    const graph = fullFrame.toJSON() as Record<string, { class_type: string }>;
    const classes = Object.values(graph).map((node) => node.class_type);
    assert.ok(classes.includes("VAEEncode"), "the existing whole-image encode remains");
    assert.ok(classes.includes("KSampler"), "the existing whole-image sampler remains");
    assert.ok(!classes.includes("LoadImageMask"), "no mask topology is added");
    assert.ok(!classes.includes("DetailerForEach"), "no region topology is added");
    assert.ok(!classes.includes("LanPaint_KSamplerAdvanced"), "no legacy inpaint topology is added");
  });

  it("a mask modifier with crop_stitch still takes the region lane", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "repaint the sign", image1: "/m/i.png", seed: 7, steps: 20, cfg: 2.5,
        mask: [{ input_mask: "/m/region.png", mask_mode: "crop_stitch" }],
      }),
      model, g, "run_mask_modifier",
    );
    const graph = g.toJSON() as Record<string, { class_type: string }>;
    assert.ok(Object.values(graph).some((node) => node.class_type === "MaskToSEGS"), "the modifier feeds the region segmenter");
    assert.ok(Object.values(graph).some((node) => node.class_type === "DetailerForEach"), "the modifier keeps the region detailer");
    assert.ok(!Object.values(graph).some((node) => node.class_type === "VAEEncode"), "the region lane does not use the whole-image encode");
  });
});

describe("the lane-bespoke leaves (the DECL surface — fix shape 2's successor)", () => {
  it("THE LEAVES RIDE THEIR DECL SURFACE: the deliverable pair is surfaced on every edit lane (the size door), use_stock_nodes/double_reference are 2511's — the card carries NO model guard; references are ONE unguarded stack", () => {
    // the carrier dance (same as formSchemas: schemaCarrier ?? schema)
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as { toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string; max_stack?: number; hidden?: boolean; zone?: string } } }> } };
    const json = carrier.toJSON();
    const root = Object.values(json.refs).find((n) => n.type === "object" && n.dict !== undefined);
    assert.ok(root, "the schema envelope serves");
    const leaf = (name: string): string | undefined => {
      const refId = root!.dict![name];
      if (refId === undefined) return undefined;
      return json.refs[refId]?.meta?.extra?.visible_when;
    };
    // MODEL guards stay dead (fix shape 2 — "visible_when: 'model=…'
    // dies"): the family scoping lives in the DECL params surfaces,
    // judged at bench-write and rendered from the declaration. A
    // model guard here would be a second declaration drifting beside
    // the first.
    for (const name of ["match_input_resolution", "use_stock_nodes", "double_reference"]) {
      assert.equal(leaf(name), undefined, `${name} carries no model guard — its family is its DECL params surface`);
    }
    // WIDTH/HEIGHT (served by the size door, 2026-11-12): the pair
    // is a SERVED face row, visible only when
    // Match Input Resolution is OFF (the only toggle state that
    // makes the knobs usable). The face never hides them: they are no
    // longer legacy keys.
    const face = (name: string): { hidden?: boolean; visible_when?: string } | undefined => {
      const refId = root!.dict![name];
      if (refId === undefined) return undefined;
      return json.refs[refId]?.meta?.extra;
    };
    for (const axis of ["width", "height"]) {
      assert.equal(face(axis)?.hidden, undefined, `${axis} rides served — the face offers it under the toggle`);
      assert.equal(face(axis)?.visible_when, "match_input_resolution=false", `${axis} appears only with Match OFF`);
    }
    // the DECL surfaces themselves (the one truth): EVERY edit
    // lane lists the deliverable pair (the size door — 2.1 sizes
    // its render through the pair: encoder budget + exact latent;
    // 2511 and fibo2 keep their own deliverable tails). 2511 owns
    // the edit-tuning pair. The
    // match toggle is SHARED (all lanes admit it as the deliverable
    // switch).
    const decl21 = facts.models["qwen-img-edit-21"]!;
    const decl2511 = facts.models["qwen-img-edit-2511"]!;
    const surf = (m: { params?: string[] }): ReadonlySet<string> => new Set(m.params ?? []);
    assert.ok(surf(decl21).has("width") && surf(decl21).has("height"), "2.1's surface lists the deliverable pair (run params, kit tail)");
    assert.ok(surf(decl2511).has("width") && surf(decl2511).has("height"), "2511's surface lists the deliverable pair (source-resolution lane, deliverable tail)");
    assert.ok(surf(decl21).has("match_input_resolution") && surf(decl2511).has("match_input_resolution"), "both lanes admit the match toggle (the deliverable switch)");
    assert.ok(surf(decl2511).has("use_stock_nodes") && surf(decl2511).has("double_reference"), "2511's surface owns the edit-tuning pair");
    assert.ok(!surf(decl21).has("use_stock_nodes") && !surf(decl21).has("double_reference"), "2.1's surface excludes the 2511 tuning pair");
    // the SHARED surface never hides (no guard on the plain knobs)
    assert.equal(leaf("prompt"), undefined, "the shared surface never carries a model guard");
    assert.equal(leaf("image1"), undefined, "the anchor is every edit lane's surface");
    assert.equal(leaf("seed"), undefined);
    // THE MERGE (2026-10-10 — image inputs and reference images are
    // ONE concept): input_images is THE one visible face — an ordered
    // list, anchor at position 0 — riding BOTH lanes unguarded; the
    // CAP rides the boarded DECLs (roomiest max_images, anchor
    // included — 16 today); each lane refuses past its own DECL cap
    // LOUD at compose.
    assert.equal(leaf("input_images"), undefined, "the one list carries no model guard — one row, both lanes");
    const listId = root!.dict!["input_images"];
    assert.equal(json.refs[listId]?.meta?.extra?.max_stack, 16, "the list caps at the roomiest boarded DECL (2.1's 16, anchor included)");
    // every legacy spelling is HIDDEN — no form row, no seat, ever.
    for (const alias of ["image1", "image2", "image3", "reference_images"]) {
      const id: number | undefined = root?.dict?.[alias];
      assert.equal(json.refs[id as number]?.meta?.extra?.hidden, true, `${alias} rides hidden:true — the alias validates, the face never offers it`);
    }
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
    // THE LIST-SEAT LAW (the operator's rework, 2026-09-26:
    // "reference images and input images are the same thing — but
    // reference images isn't even in the input category"): the
    // signature CARRIES the reference stack as a wireable input
    // port (kind image_list). The /v1/forms table, the picker's
    // edge law, and the flow lattice all derive the input category
    // from this declaration — before the rework it listed only the
    // legacy aliases while the actual reference input sat outside.
    //
    // THE NAMING LAW (2026-10-09, the operator's catch: "both lanes
    // use the same thing, but it's always mixed because the naming
    // is WRONG"): `inputs` declares EXACTLY the seats a user can
    // mean — the prompt, the input image, the reference stack, and
    // the region mask. The numbered spellings leave the seat list
    // (they were a SECOND vocabulary for the same concept, offered
    // as extra picker seats) and ride legacyAliases: the lattice
    // still derives their kind (old graphs keep validating), no
    // face offers them. input_mask's seat kind is seg (the mask
    // card's product feeds it); its VISIBLE face stays mod-owned
    // (the mask pack's Region Mask row) — the carrier key below is
    // hidden, validation-only, so no second row can seat.
    const ports = def.flowKinds.inputs as Record<string, string>;
    assert.deepEqual(
      Object.keys(ports).sort(),
      ["input_images", "input_mask", "prompt"],
      "the input category names the text seat, the ONE image-list seat, and the mask seat — no numbered mix, no second image row",
    );
    assert.equal(ports.input_images, "image_list", "input_images is a wireable input port (the inputs category)");
    assert.equal(ports.input_mask, "seg", "the mask seat takes the mask card's seg producer");
    // THE MERGE (2026-10-10): every legacy spelling rides
    // legacyAliases — kinds still derive, so old graphs wiring
    // image1/reference_images keep validating; no seat, no rail
    // square, no form row.
    const aliases = def.flowKinds.legacyAliases as Record<string, string>;
    assert.deepEqual(
      Object.keys(aliases).sort(),
      ["image1", "image2", "image3", "reference_images"],
      "all four legacy spellings ride legacyAliases",
    );
    assert.equal(aliases.image1, "image", "the legacy anchor keeps its kind");
    assert.equal(aliases.reference_images, "image_list", "the legacy stack keeps its kind");
    // THE MASK-SEAT GATE KEY: the seat names a carrier key (the
    // strict contract gate reads the card's own carrier only), and
    // that key is hidden — validation-only, never a face.
    const maskId: number | undefined = root?.dict?.["input_mask"];
    assert.ok(maskId !== undefined, "input_mask stays declared for the flow seat + compose");
    assert.equal(json.refs[maskId]?.meta?.extra?.hidden, true, "input_mask never renders — the mask pack owns the visible row");
    // THE FACE LABEL: the ONE list is named for its CONCEPT —
    // "Input Images", never a slot number or a second vocabulary.
    const listRef = json.refs[root!.dict!["input_images"]] as {
      meta?: { description?: unknown; extra?: { zone?: unknown } };
    } | undefined;
    assert.equal(listRef?.meta?.description, "Input Images", "the one list's label speaks the concept");
    assert.equal(listRef?.meta?.extra?.zone, "inputs", "the one list declares the inputs zone");
    // the aliases never render a zone or an order — hidden means
    // unserved, on every projection.
    assert.equal(json.refs[root!.dict!["reference_images"]]?.meta?.extra?.zone, undefined, "the legacy stack carries no zone — hidden, unserved");
    assert.equal(json.refs[root!.dict!["image1"]]?.meta?.extra?.zone, undefined, "the legacy anchor carries no zone — hidden, unserved");
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

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the image-edit card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row — no address silently rides
// the legacy lane while its siblings compose the declared segment;
// (2) the row composes ITS OWN declared truth — the unet the row
// spells is the unet the graph loads (the wrong-weights half), and
// the encoder class the row spells is the class the graph builds
// (the 2.1/EditPlus split). The row's lane_inputs are the oracle;
// the graph is the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const editRows = Object.values(facts.models).filter((m) => m.card === "image-edit");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(editRows.length >= 4, `expected the served edit addresses (families + routes), found ${String(editRows.length)}`);
  });

  for (const row of editRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared weights + classes.
      const g = new GraphBuilder();
      def.compose(
        def.schema({ ...row.defaults, prompt: "make the hallway blue", input_images: ["/m/anchor.png"], seed: 5 }),
        row, g, `wall_${row.id}`,
      );
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const nodes = Object.values(graph);
      const li = row.lane_inputs as Record<string, unknown>;
      const unet = nodes.find((n) => n.class_type === "UNETLoader")!;
      assert.equal(
        unet.inputs.unet_name, li.unet,
        "the graph loads the row's OWN unet (the variant-merged view, not the family default)",
      );
      assert.ok(
        nodes.some((n) => n.class_type === li.text_encode_node),
        `the row's encoder class '${String(li.text_encode_node)}' builds`,
      );
    });
  }

  it("THE ROUTE SPREAD: route addresses resolve their owning family (the family field rides the derived rows)", () => {
    const bf16 = facts.models["qwen-img-edit-21-bf16"]!;
    assert.ok(bf16, "the bf16 route's derived row serves");
    assert.equal(bf16.family, "qwen-img-edit-21");
    assert.equal(bf16.lane_inputs.unet, "qwen_image_2.1_bf16.safetensors",
      "the bf16 route's derived row carries the merged lane view");
    const lw = facts.models["qwen-img-edit-2511-lightning4"]!;
    assert.ok(lw, "the lightning route's derived row serves");
    assert.equal(lw.family, "qwen-img-edit-2511");
    assert.equal(lw.lane_inputs.unet, "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors",
      "the lightning route's derived row carries the recipe↔weights merge");
  });

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape — the derived rows all resolve family): the dispatch
    // refuses loud rather than riding a legacy lane in the open
    // (the interlock).
    const row = { ...facts.models["qwen-img-edit-2511"]!, id: "synthetic-edit", family: undefined };
    assert.throws(
      () => def.compose(
        def.schema({ prompt: "make the hallway blue", input_images: ["/m/anchor.png"], seed: 5 }),
        row as never, new GraphBuilder(), "wall_fallback",
      ),
      /no declared action for family 'synthetic-edit' on the image-edit card — every boarded family \(qwen-img-edit-21, qwen-img-edit-2511, fibo2-edit\).*State params\.model \(one of those families\)/,
    );
  });
});
