// @melite/models-h3 — THE VIDEO-EDIT MATRIX WALL (the timeline
// rework's stage 2a, 2026-11-15; operator order: "do the rework of
// the timeline mods according to your judgment"). The seven peer
// bags were seven fixed cells of one matrix (mask source ×
// reference conditioning × denoise pole); the presets stay pinned
// by their own suites, and renderH3Edit serves the FREE cells on
// the one spine + the one constructor (contexMaskedTarget, the
// stage-1 seam). This wall fires on the matrix's own paths: every
// dial's emission (the mask dial's three derivations, the
// reference dial's two r2v seatings, the denoise pole through the
// scheduler), the F3-16 defect-1 geometry cure (a staged PNG mask
// RESIZES to the chain geometry in-graph — never the track's own
// shape), the N7/N8 fold-ins (per-frame region dial first-class,
// grow/blur/detection tuning seats), and every safety refusal its
// own arm — the identity boil (F3-17), the audio hold, the grid
// window law, and the empty-dial refusals naming the dial.
// No @contract marker: package-local law, prose header (the
// registry row owns the matrix law, models tier).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Edit, EDIT_IDENTITY_BOIL_FLOOR } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "the same hands, five clean fingers, gripping the cup",
  denoise: 0.32,
  keep_audio: true,
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

const STATIC_PNG = { source: "static-png", image: "masks/union.png" } as const;
const REGION = {
  source: "region", prompt: "hands", grow: 24, blur: 6, detectionThreshold: 0.4,
} as const;
const SELF = { mode: "self" } as const;
const PAIR = { mode: "still+mannequin", still: "stills/girl.png", mannequin: "clips/mannequin.mp4" } as const;

describe("renderH3Edit — the video-edit matrix on the one spine (stage 2a)", () => {
  it("is exported from the barrel and composes the assemble terminal at <runId>/edit", () => {
    assert.equal(typeof renderH3Edit, "function", "the barrel serves the matrix renderer");
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), STATIC_PNG, SELF, {}, FACTS, g, "run_edit");
    const o = out(g);
    const assemble = ofClass(o, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal ends the chain");
    assert.equal(assemble[0]![1].inputs.filename, "run_edit/edit", "the assemble rides the run tree under the edit name");
    assert.equal(assemble[0]![1].inputs.audio_source, "source", "a partial pass holds the source soundtrack");
  });

  it("THE MASK DIAL static-png: the staged PNG DECODES and RESIZES to the chain geometry (F3-16 defect 1)", () => {
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), STATIC_PNG, SELF, {}, FACTS, g, "run_png");
    const o = out(g);
    const dec = ofClass(o, "ImageToMask");
    assert.equal(dec.length, 1, "one staged-PNG decoder");
    assert.equal(dec[0]![1].inputs.channel, "red", "the union PNG decodes off its red channel");
    const resize = ofClass(o, "ImageResize");
    assert.equal(resize.length, 1, "THE GEOMETRY CURE: the mask resizes in-graph — the track card's own shape never rides the chain raw");
    const r = resize[0]![1].inputs;
    assert.equal(r.keep_proportion, false, "the mask fills the chain canvas exactly, aspect and all");
    assert.equal(r.crop, "disabled", "no crop — every masked pixel lands");
    const w = r.width as [string, number]; const h = r.height as [string, number];
    assert.ok(Array.isArray(w) && Array.isArray(h), "width/height ride wires, not literals");
    assert.equal(w[0], h[0], "width and height ride the SAME chain-geometry node (the plan's own canvas, engine-derived)");
    assert.equal(ofClass(o, "SolidMask").length, 0, "no white mask — the dial is the staged PNG");
    assert.equal(ofClass(o, "SAM3_VideoTrack").length, 0, "no tracker — the dial is not the region door");
  });

  it("THE MASK DIAL region: the per-frame SAM3 chain + the tuning seats ride (N7 first-class, N8 tunable)", () => {
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), REGION, SELF, {}, FACTS, g, "run_region");
    const o = out(g);
    const track = ofClass(o, "SAM3_VideoTrack");
    assert.equal(track.length, 1, "the per-frame tracker — the static union PNG is not this dial's only door (N7)");
    assert.equal(track[0]![1].inputs.detection_threshold, 0.4, "the detection threshold dial carries (N8 tuning)");
    const grow = ofClass(o, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "the grow seat before the edit");
    assert.equal(grow[0]![1].inputs.expand, 24, "the grow dial carries");
    assert.equal(grow[0]![1].inputs.blur_radius, 6, "the blur dial carries — thin structures tune at the door (N8)");
    const sliceMask = ofClass(o, "MiniMaxH3ContexLoopMaskSlice");
    assert.equal(sliceMask.length, 1, "the per-scene mask slice (F7's law — the tracked timeline slices before the grow)");
    assert.equal(ofClass(o, "ImageResize").length, 0, "no resize — the tracked mask already lives at the window's shape");
    assert.equal(ofClass(o, "ImageToMask").length, 0, "no staged-PNG decoder on the region door");
  });

  it("THE MASK DIAL whole-frame: the all-white SolidMask sized to the chain's own geometry", () => {
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), { source: "whole-frame" }, PAIR, {}, FACTS, g, "run_white");
    const o = out(g);
    const white = ofClass(o, "SolidMask");
    assert.equal(white.length, 1, "one all-white mask — nothing held");
    assert.equal(white[0]![1].inputs.value, 1, "white = every frame editable");
    assert.equal(ofClass(o, "SAM3_VideoTrack").length, 0, "no tracker");
    assert.equal(ofClass(o, "ImageToMask").length, 0, "no staged PNG");
  });

  it("THE REFERENCE DIAL self: the source clip rides its own ref_video seat, no image seat, the window's first frame anchors the plan", () => {
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), STATIC_PNG, SELF, {}, FACTS, g, "run_self");
    const o = out(g);
    const r2v = ofClass(o, "MiniMaxH3ReferenceToVideo");
    assert.equal(r2v.length, 1, "one r2v conditioning");
    const seats = r2v[0]![1].inputs;
    assert.ok(!("ref_images.ref_image_0" in seats), "no image reference — the identity anchor is the person already in the frame");
    const refVideo = seats["ref_videos.ref_video_0"] as [string, number];
    const sourceLoader = ofClass(o, "VHS_LoadVideo")
      .find(([, n]) => (n.inputs.video as string)?.includes("take.mp4"));
    assert.ok(sourceLoader !== undefined, "the source clip has its own VHS loader");
    assert.equal(refVideo?.[0], sourceLoader?.[0], "ref_video_0 IS the source's own loader (the zero-new-pixels law)");
    const anchor = ofClass(o, "ImageFromBatch");
    assert.equal(anchor.length, 1, "the window's own first frame is the plan anchor (the truthful-anchor posture)");
    assert.equal(anchor[0]![1].inputs.batch_index, 0, "anchored at the window head");
  });

  it("THE REFERENCE DIAL still+mannequin: both seats ride the r2v and the still anchors the plan", () => {
    const g = new GraphBuilder();
    renderH3Edit(ENTRY(), STATIC_PNG, PAIR, {}, FACTS, g, "run_pair");
    const o = out(g);
    const seats = ofClass(o, "MiniMaxH3ReferenceToVideo")[0]![1].inputs;
    const stillImg = ofClass(o, "LoadImage")
      .find(([, n]) => n.inputs.image === "stills/girl.png");
    assert.ok(stillImg !== undefined, "the staged still loads (the appearance anchor)");
    const imgRef = seats["ref_images.ref_image_0"] as [string, number];
    assert.equal(imgRef?.[0], stillImg?.[0], "ref_image_0 IS the still's loader");
    const mannequinLoader = ofClass(o, "VHS_LoadVideo")
      .find(([, n]) => (n.inputs.video as string)?.includes("mannequin.mp4"));
    assert.ok(mannequinLoader !== undefined, "the mannequin rides its own video loader");
    const vidRef = seats["ref_videos.ref_video_0"] as [string, number];
    assert.equal(vidRef?.[0], mannequinLoader?.[0], "ref_video_0 IS the mannequin's loader");
    assert.equal(ofClass(o, "ImageFromBatch").length, 0, "no frame anchor — the still anchors the plan (exactly ONE anchor node, never a stray)");
  });

  it("THE DENOISE POLE: the scheduler carries the stated dial, both poles", () => {
    for (const denoise of [0.32, 1]) {
      const g = new GraphBuilder();
      renderH3Edit({ ...ENTRY(), denoise }, STATIC_PNG, SELF, {}, FACTS, g, "run_pole");
      const o = out(g);
      const sched = ofClass(o, "BasicScheduler");
      assert.equal(sched.length, 1, "one scheduler");
      assert.equal(sched[0]![1].inputs.denoise, denoise, `denoise ${String(denoise)} rides the spine's own pole`);
    }
  });

  it("THE CONSTRUCTOR SEAT: keepAudio spells both audio seats through contexMaskedTarget", () => {
    const g = new GraphBuilder();
    renderH3Edit({ ...ENTRY(), denoise: 1, keep_audio: false }, STATIC_PNG, SELF, {}, FACTS, g, "run_audio");
    const o = out(g);
    const edit = ofClass(o, "MiniMaxH3FantasticVideoEditLatent");
    assert.equal(edit.length, 1);
    assert.equal(edit[0]![1].inputs.keep_audio, false, "the full pole dials the source soundtrack off");
    const tgt = ofClass(o, "MiniMaxH3ContexMaskedTarget");
    assert.equal(tgt.length, 1);
    assert.equal(tgt[0]![1].inputs.audio_mode, "generate all audio", "the constructor spells the generated pole");
    assert.equal(tgt[0]![1].inputs.mask_conversion, "H3 exact (causal/token max)", "the seam's own conversion law");
  });

  // ── the safety refusals, each its own firing arm ──

  it("THE IDENTITY BOIL refuses: whole-frame × self × denoise at the boil floor (F3-17)", () => {
    for (const denoise of [EDIT_IDENTITY_BOIL_FLOOR, 1]) {
      const g = new GraphBuilder();
      assert.throws(
        () => renderH3Edit({ ...ENTRY(), denoise }, { source: "whole-frame" }, SELF, {}, FACTS, g, "run_boil"),
        /identity boil.*reference still\+mannequin.*reshoot door/s,
        `denoise ${String(denoise)} on the boil cell must refuse naming the anchor dial and the reshoot door`,
      );
    }
  });

  it("THE BOIL FLOOR does not over-refuse: an anchored near-full denoise composes (the pair reference holds identity)", () => {
    const g = new GraphBuilder();
    renderH3Edit({ ...ENTRY(), denoise: 0.9 }, { source: "whole-frame" }, PAIR, {}, FACTS, g, "run_anchored");
    assert.equal(ofClass(out(g), "MiniMaxH3ChainAssemble").length, 1, "still+mannequin at 0.9 composes — the anchor is the safety, not the number alone");
  });

  it("THE AUDIO HOLD refuses: a partial pass never drops the source soundtrack", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({ ...ENTRY(), denoise: 0.32, keep_audio: false }, STATIC_PNG, SELF, {}, FACTS, g, "run_audio"),
      /partial pass holds the unmasked region and its sound.*denoise 1/s,
      "partial × keep_audio off is the incoherent cell — refuse naming the pole to state",
    );
  });

  it("THE GRID LAW refuses an off-grid stated window naming the nearest legal value", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({ ...ENTRY(), window_length: 60 }, STATIC_PNG, SELF, {}, FACTS, g, "run_grid"),
      /off-grid.*nearest legal: 56f/s,
      "the window law binds the free cells exactly as it binds repair",
    );
  });

  it("THE WINDOW SEATS refuse negatives, never clamp", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({ ...ENTRY(), window_start: -12 }, STATIC_PNG, SELF, {}, FACTS, g, "run_neg"),
      /window seat never goes negative/,
    );
  });

  it("THE EMPTY DIALS refuse naming the dial to state (prompt, png, region, pair, clip)", () => {
    const base = ENTRY();
    const g1 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({ ...base, edit_prompt: "" }, STATIC_PNG, SELF, {}, FACTS, g1, "r"),
      /edit_prompt.*names no action/,
    );
    const g2 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(base, { source: "static-png", image: "" }, SELF, {}, FACTS, g2, "r"),
      /static-png mask dial names no image.*union is the recommended bridge/,
    );
    const g3 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(base, { ...REGION, prompt: "" }, SELF, {}, FACTS, g3, "r"),
      /region mask dial names no target.*SAM3 detection prompt/,
    );
    const g4 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(base, STATIC_PNG, { ...PAIR, still: "" }, {}, FACTS, g4, "r"),
      /still\+mannequin reference dial needs both seats bound/,
    );
    const g5 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({ ...base, source_clip: "" }, STATIC_PNG, SELF, {}, FACTS, g5, "r"),
      /source_clip.*names no media/,
    );
  });
});
