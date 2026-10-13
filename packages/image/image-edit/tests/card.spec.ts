// @melite/image-edit — the card's compose gate (TEST-2 breadth,
// 2026-09-12). TWO admissions (prompt + the anchor image1) plus the
// FIRING REFUSALS (refuseImageEditFiring — knobs whose graph this
// plane does not build refuse loud instead of silently
// plain-editing) plus the REVIVED LANPAINT ARM (2026-09-15 — a
// stated region switches to LanPaint_KSamplerAdvanced; the arm's
// exact wiring is pinned below).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { tmpdir } from "node:os";
import { writeFileSync, rmSync } from "node:fs";
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

let anchorSeq = 0;

// A compose-time JPEG anchor: the given header bytes padded past
// the probe's segment walk (the walk reads at most the first 256
// bytes; padding keeps short headers from ending the walk early).
const writeAnchor = (bytes: number[], pad = true): string => {
  anchorSeq += 1;
  const anchorPath = join(tmpdir(), `melite-f8-anchor-${Date.now()}-${anchorSeq}.jpg`);
  const body = Buffer.from(bytes);
  writeFileSync(anchorPath, pad ? Buffer.concat([body, Buffer.alloc(Math.max(0, 64 - body.length))]) : body);
  return anchorPath;
};

// A minimal SOF frame header for 1344x768 (marker + length +
// precision + height + width — the only bytes the probe reads).
const SOF_1344x768 = (marker: number): number[] =>
  [0xff, marker, 0x00, 0x0b, 0x08, 0x03, 0x00, 0x05, 0x40];

// The 2.1 target latent's geometry for an anchor file — the
// inheritance (or the lane fallback) made visible.
const latentGeometry = (anchorPath: string): { width: unknown; height: unknown } => {
  const model21 = facts.models["qwen-img-edit-21"]!;
  assert.ok(model21, "the qwen-img-edit-21 facts row serves");
  const g = new GraphBuilder();
  def.compose({ prompt: "make it night", image1: anchorPath, steps: 25, cfg: 1 }, model21, g, `r_probe_${anchorSeq}`);
  const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
  return { width: graph["EmptyLatentImage.0"]?.inputs.width, height: graph["EmptyLatentImage.0"]?.inputs.height };
};

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

  // THE SOURCE-GEOMETRY INHERITANCE (finding 8 + the match
  // toggle, 2026-10-13): Match Input Resolution is ON by default —
  // a 1344x768 source comes back 1344x768 with no typing (the probe
  // reads the ANCHOR's own header: PNG IHDR / JPEG SOF, and the hit
  // OVERRIDES any Width/Height — the toggle wins, so cascade 1024s
  // never starve it). Turn it OFF for a custom pair verbatim.
  // Unprobeable anchors (missing file, spell) keep the lane
  // fallback, never a new refusal.
  it("THE SOURCE-GEOMETRY INHERITANCE: omitted axes inherit the anchor's own geometry on the 2.1 lane", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.ok(model21, "the qwen-img-edit-21 facts row serves");
    // A compose-time anchor: real header bytes (PNG signature +
    // IHDR width 1344 height 768 — the probe reads only the head).
    const png = Buffer.alloc(33)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0)
    png.writeUInt32BE(13, 8) // IHDR chunk length
    png.write("IHDR", 12, "ascii")
    png.writeUInt32BE(1344, 16)
    png.writeUInt32BE(768, 20)
    const anchorPath = join(tmpdir(), "melite-f8-source-" + Date.now() + ".png")
    writeFileSync(anchorPath, png)
    try {
      const g = new GraphBuilder()
      def.compose({ prompt: "make it night", image1: anchorPath, steps: 25, cfg: 1 }, model21, g, "r_f8")
      const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
      assert.equal(graph["EmptyLatentImage.0"]?.inputs.width, 1344, "width inherits the source's own")
      assert.equal(graph["EmptyLatentImage.0"]?.inputs.height, 768, "height inherits the source's own")

      // THE MATCH TOGGLE (default ON): a stated pair is OVERRIDDEN
      // by the anchor geometry while the toggle is on — no typing
      // needed, and a stale custom size never silently wins.
      const gMatch = new GraphBuilder()
      def.compose({ prompt: "make it night", image1: anchorPath, width: 512, height: 512, steps: 25, cfg: 1 }, model21, gMatch, "r_f8match")
      const matched = gMatch.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
      assert.equal(matched["EmptyLatentImage.0"]?.inputs.width, 1344, "match ON (default) overrides the stated pair")
      assert.equal(matched["EmptyLatentImage.0"]?.inputs.height, 768)

      // MATCH OFF: the stated pair rides verbatim.
      const gStated = new GraphBuilder()
      def.compose({ prompt: "make it night", image1: anchorPath, width: 512, height: 512, match_input_resolution: false, steps: 25, cfg: 1 }, model21, gStated, "r_f8b")
      const stated = gStated.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
      assert.equal(stated["EmptyLatentImage.0"]?.inputs.width, 512)
      assert.equal(stated["EmptyLatentImage.0"]?.inputs.height, 512)

      // MATCH OFF + omitted axes: the lane fallback stands (no probe).
      const gOffBlind = new GraphBuilder()
      def.compose({ prompt: "make it night", image1: anchorPath, match_input_resolution: false, steps: 25, cfg: 1 }, model21, gOffBlind, "r_f8off")
      const offBlind = gOffBlind.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
      assert.equal(offBlind["EmptyLatentImage.0"]?.inputs.width, 1024, "match OFF never probes — the lane fallback stands")
      assert.equal(offBlind["EmptyLatentImage.0"]?.inputs.height, 1024)

      // UNPROBEABLE anchor (no such file): the lane fallback stands — no new refusal.
      const gBlind = new GraphBuilder()
      def.compose({ prompt: "make it night", image1: "/m/not-on-disk.png", steps: 25, cfg: 1 }, model21, gBlind, "r_f8c")
      const blind = gBlind.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
      assert.equal(blind["EmptyLatentImage.0"]?.inputs.width, 1024, "the lane fallback covers unprobeable anchors")
      assert.equal(blind["EmptyLatentImage.0"]?.inputs.height, 1024)
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  // THE MATCH DEFAULT (the no-typing convenience): the schema default
  // is ON, so a draft that never mentions the toggle still matches.
  it("THE MATCH DEFAULT: match_input_resolution defaults ON (the schema walk carries it)", () => {
    const walked = def.schema({ prompt: "make it night", image1: "/m/i.png" }) as Record<string, unknown>;
    assert.equal(walked.match_input_resolution, true, "the toggle defaults ON — no typing needed");
  });

  // THE 2511 NO-OP: the toggle is admitted on the 2511 lane (a
  // default-ON draft never refuses there) and changes nothing — that
  // lane always edits at source resolution.
  it("THE 2511 NO-OP: match_input_resolution rides the 2511 lane without refusal or effect", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", match_input_resolution: true }),
      model, g, "r_match2511",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "TextEncodeQwenImageEditPlus"), "the 2511 lane still composes with the toggle on");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"), "the 2511 lane builds no target latent — the toggle changes nothing");
    const gOff = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dress the mannequin", image1: "/m/anchor.png", match_input_resolution: false }),
      model, gOff, "r_match2511off",
    );
    assert.ok(Object.values(gOff.toJSON() as Record<string, unknown>).length > 0, "match OFF is admitted too — a no-op either way");
  });

  // THE JPEG MARKER ARMS (finding 8's probe walks marker segments
  // to the first SOF0/SOF2 frame header — APP segments carry a
  // length, filler bytes and standalone markers carry none). Each
  // arm below pins one walk shape against the 2.1 target latent:
  // inherited geometry when a frame header lands, the lane fallback
  // otherwise — never a new refusal on an unprobeable anchor.
  it("THE JPEG SOF0 ARM: a baseline-JPEG anchor inherits its frame geometry on the 2.1 lane", () => {
    const anchorPath = writeAnchor([0xff, 0xd8, ...SOF_1344x768(0xc0)])
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1344, height: 768 }, "SOF0 width/height ride the target latent")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE JPEG SOF2 ARM: a progressive-JPEG anchor inherits the same way (the C2 disjunct)", () => {
    const anchorPath = writeAnchor([0xff, 0xd8, ...SOF_1344x768(0xc2)])
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1344, height: 768 }, "SOF2 is the same frame header, progressive scan")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE JPEG SKIP ARMS: APP segments, filler bytes and standalone markers walk past to the frame header", () => {
    // SOI + APP0 (length-prefixed) + a stray filler byte + an
    // embedded SOI + an RST0 standalone + SOF0 — every skip shape
    // in one header, the frame geometry still lands.
    const anchorPath = writeAnchor([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, ...new Array<number>(14).fill(0),
      0x00,
      0xff, 0xd8,
      0xff, 0xd0,
      ...SOF_1344x768(0xc0),
    ])
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1344, height: 768 }, "skipped segments never hide the frame header")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE ZERO-FRAME ARM: a zero-dimension JPEG header keeps the lane fallback (never a 0-wide latent)", () => {
    const anchorPath = writeAnchor([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x00, 0x00, 0x00])
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1024, height: 1024 }, "a 0x0 frame header is no geometry")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE ZERO-PNG ARM: a zero-dimension IHDR keeps the lane fallback", () => {
    const png = Buffer.alloc(33)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0)
    png.writeUInt32BE(13, 8)
    png.write("IHDR", 12, "ascii")
    png.writeUInt32BE(0, 16)
    png.writeUInt32BE(0, 20)
    const anchorPath = join(tmpdir(), "melite-f8-zero-png-" + Date.now() + ".png")
    writeFileSync(anchorPath, png)
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1024, height: 1024 }, "a 0x0 IHDR is no geometry")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE NON-IMAGE ARM: a long non-image anchor keeps the lane fallback (signature mismatch, never a refusal)", () => {
    const anchorPath = writeAnchor(new Array<number>(32).fill(0))
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1024, height: 1024 }, "neither signature matches — the fallback stands")
    } finally {
      rmSync(anchorPath, { force: true })
    }
  });

  it("THE TRUNCATED ARM: a bare SOI keeps the lane fallback (the walk never runs past the head)", () => {
    const anchorPath = writeAnchor([0xff, 0xd8], false)
    try {
      assert.deepEqual(latentGeometry(anchorPath), { width: 1024, height: 1024 }, "no segment to walk — the fallback stands")
    } finally {
      rmSync(anchorPath, { force: true })
    }
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

  it("THE SCHEMA GATE: the mod-plane surface passes the walk verbatim (anchor + region + firing knobs reach the composer)", () => {
    const doc = def.schema({
      prompt: "x", image1: "/m/i.png", input_mask: "/m/region.png", lanpaint_num_steps: 20,
    }) as Record<string, unknown>;
    assert.equal(doc.image1, "/m/i.png", "the declared anchor survives the gate");
    assert.equal(doc.input_mask, "/m/region.png", "the hidden mask-seat gate key survives the gate (declared, hidden — never a face)");
    assert.equal(doc.lanpaint_num_steps, 20, "the undeclared lanpaint knob survives the gate");
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
    const arms: Array<[Record<string, unknown>, RegExp]> = [
      // (the merge's old mixed-vocab refusal is RETIRED — the
      // migration law folds legacy keys under a stated input_images;
      // pinned in its own test below)
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
      [{ mask_mode: "hard" }, /'mask_mode' fires .*\(unknown region mode/],
      [{ mask_detector: "yolo" }, /'mask_detector' fires .*\(unknown region detector/],
      [{ mask_mode: "crop_stitch" }, /'mask_mode' fires .*needs a region/],
      [{ mask_mode: "crop_stitch", input_mask: "/m/a.png", mask_detector: "face" }, /'mask_detector' fires .*both stated/],
      [{ mask_mode: "crop_stitch", input_mask: "/m/a.png", lanpaint_enabled: true }, /'lanpaint_enabled' fires .*\(pick one sampler/],
      [{ mask_mode: "crop_stitch", input_mask: "/m/a.png", mask_threshold: 0.5 }, /'mask_threshold' fires .*re-binarizes/],
      [{ mask_detector: "face" }, /'mask_detector' fires .*ride crop_stitch only/],
      [{ mask_detector_threshold: 0.7 }, /'mask_detector_threshold' fires .*rides crop_stitch only/],
      [{ mask_detail_size: 768 }, /'mask_detail_size' fires .*rides crop_stitch only/],
      [{ mask_denoise: 0.8 }, /'mask_denoise' fires .*rides crop_stitch only/],
      [{ mask_context_pad: 128 }, /'mask_context_pad' fires .*rides crop_stitch only/],
      [{ mask_threshold: 0.5 }, /'mask_threshold' fires .*\(no core node re-binarizes/],
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
    assert.ok(!graph["LanPaint_KSamplerAdvanced.0"], "no lanpaint sampler beside the arm");
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

  it("width/height on a 2.1 crop_stitch run refuse field-named (the detailer owns the crop size)", () => {
    const model21 = facts.models["qwen-img-edit-21"]!;
    assert.throws(
      () => def.compose(
        def.schema({
          prompt: "studio portrait", image1: "/m/i.png", seed: 7, steps: 25, cfg: 1,
          mask_mode: "crop_stitch", mask_detector: "face", width: 1024, height: 1024,
        }),
        model21, new GraphBuilder(), "run_21wh",
      ),
      /'width' fires .*clear them/,
    );
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
  it("THE LEAVES RIDE THEIR DECL SURFACE: width/height are 2.1's params, use_stock_nodes/double_reference are 2511's — the card carries NO model guard; references are ONE unguarded stack", () => {
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
    // the ONE sibling-value guard: width/height HIDE while Match
    // Input Resolution is on — the toggle owns the size, nothing to
    // type. The tool face keeps the pair stateable (flip the toggle
    // off); the form just never shows a row the toggle ignores.
    assert.equal(leaf("width"), "match_input_resolution=false", "width hides while the match toggle is on");
    assert.equal(leaf("height"), "match_input_resolution=false", "height hides while the match toggle is on");
    // the DECL surfaces themselves (the one truth): 2.1 owns the
    // resolution pair (and rides them together); 2511 owns the
    // edit-tuning pair and refuses a stated size by ABSENCE. The
    // match toggle is SHARED (both lanes admit it; 2511 holds it as
    // a no-op — it always edits at source resolution).
    const decl21 = facts.models["qwen-img-edit-21"]!;
    const decl2511 = facts.models["qwen-img-edit-2511"]!;
    const surf = (m: { params?: string[] }): ReadonlySet<string> => new Set(m.params ?? []);
    assert.ok(surf(decl21).has("width") && surf(decl21).has("height"), "2.1's surface owns the resolution pair");
    assert.ok(!surf(decl2511).has("width") && !surf(decl2511).has("height"), "2511's surface excludes a stated size (source-resolution lane)");
    assert.ok(surf(decl21).has("match_input_resolution") && surf(decl2511).has("match_input_resolution"), "both lanes admit the match toggle (2511 as a no-op)");
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
      /no declared action for family 'synthetic-edit' on the image-edit card — every boarded family \(qwen-img-edit-21, qwen-img-edit-2511\)/,
    );
  });
});
