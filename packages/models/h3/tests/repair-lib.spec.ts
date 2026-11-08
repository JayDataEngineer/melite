// @melite/models-h3 — the repair renderer as a library (the
// swap-lib precedent, friction-report #6: the renderer-as-library
// property is what makes direct-drive safe). Guards: the barrel
// exports renderH3Repair; a minimal entry composes the masked
// second-pass chain ending in MiniMaxH3ChainAssemble; THE MASK IS
// RECEIVED (P0-2, defect board row 2 — the operator's contract
// "repair receives a mask and errors without one"): one staged PNG
// rides LoadImage → ImageToMask → ImageResize at the plan geometry,
// the inline SAM3 prose manufacture is DEAD (stated region_prompt
// manufactures nothing), the mask-less repair refuses naming
// 'mask'; the partial denoise law refuses at >= 1; the window
// seats stamp both loaders.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Repair } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  repair_prompt: "the same hands, five clean fingers, gripping the cup",
  mask: "masks/hands_union.png",
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

describe("renderH3Repair as a library (the bypass face)", () => {
  it("is exported from the barrel and composes the assemble terminal", () => {
    assert.equal(typeof renderH3Repair, "function", "the barrel serves the repair renderer (the direct-drive import face)");
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_repair");
    const o = out(g);
    const assemble = ofClass(o, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal ends the chain");
    assert.equal(assemble[0]![1].inputs.filename, "run_lib_repair/repair", "the assemble rides the run tree");
    assert.equal(assemble[0]![1].inputs.audio_source, "source",
      "a repair is a visual second pass — the soundtrack is the source's own, always");
  });

  it("P0-2 THE RECEIVED MASK: one staged PNG rides LoadImage → ImageToMask(red) → ImageResize at the plan geometry (F3-16's law, never trust the file's shape)", () => {
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_mask");
    const o = out(g);
    const load = ofClass(o, "LoadImage");
    assert.equal(load.length, 1, "one mask LoadImage — the repair RECEIVES its mask");
    assert.equal(load[0]![1].inputs.image, "masks/hands_union.png", "the staged PNG the entry named");
    const toMask = ofClass(o, "ImageToMask");
    assert.equal(toMask.length, 1, "one staged-mask decoder (red channel)");
    assert.equal(toMask[0]![1].inputs.channel, "red", "the red channel IS the mask (the swap's own law)");
    assert.deepEqual(toMask[0]![1].inputs.image, [load[0]![0], 0], "the decoder reads the received PNG");
    const resize = ofClass(o, "ImageResize");
    assert.equal(resize.length, 1, "one geometry resize — the PNG's shape is the TRACK's shape, not the chain's");
    assert.deepEqual(resize[0]![1].inputs.image, [toMask[0]![0], 0], "the resize reads the decoded mask");
    const w = resize[0]![1].inputs.width as [string, number];
    const h = resize[0]![1].inputs.height as [string, number];
    assert.ok(Array.isArray(w) && w[1] === 8, "width is a loop-state wire (slot 8) — the plan geometry, never a literal");
    assert.ok(Array.isArray(h) && h[1] === 9, "height is a loop-state wire (slot 9) — the plan geometry, never a literal");
    // the edit latent + masked target consume the RESIZED mask — the
    // received mask's own pixels, at the chain's own geometry
    const edit = ofClass(o, "MiniMaxH3FantasticVideoEditLatent");
    assert.equal(edit.length, 1);
    assert.deepEqual(edit[0]![1].inputs.mask, [resize[0]![0], 0],
      "the edit latent masks with the resized received mask");
    const target = ofClass(o, "MiniMaxH3ContexMaskedTarget");
    assert.equal(target.length, 1);
    assert.deepEqual(target[0]![1].inputs.mask, [resize[0]![0], 0],
      "the masked target carries the same received mask (mask_meaning's own law)");
  });

  it("P0-2 THE PROSE DEMOTION: stated region_prompt manufactures NOTHING — the SAM3 chain is dead at this seat even when prose rides the entry", () => {
    const g = new GraphBuilder();
    // region_prompt stated (the old law's own seat) — the entry
    // accepts it as inert junk, but NO node manufactures from it
    renderH3Repair({ ...ENTRY(), region_prompt: "hands", detection_threshold: 0.9, mask_grow: 32 }, {}, FACTS, g, "run_lib_prose");
    const o = out(g);
    assert.equal(ofClass(o, "CheckpointLoaderSimple").length, 0, "no SAM3 checkpoint — the prose door died");
    assert.equal(ofClass(o, "CLIPTextEncode").length, 0, "no region conditioning — prose conditions nothing");
    assert.equal(ofClass(o, "SAM3_VideoTrack").length, 0, "no video track — nothing is tracked");
    assert.equal(ofClass(o, "SAM3_TrackToMask").length, 0, "no track-to-mask decoder");
    assert.equal(ofClass(o, "MiniMaxH3ContexLoopMaskSlice").length, 0, "no per-scene slice — there is no tracked stack to slice");
    assert.equal(ofClass(o, "GrowMaskWithBlur").length, 0, "no grow — the recommended bridge arrives already grown");
    // and the received mask still rides
    assert.equal(ofClass(o, "ImageToMask").length, 1, "the RECEIVED mask composes regardless of stated prose");
  });

  it("P0-2 THE REFUSE: a repair without a mask errors naming 'mask' (the operator's contract — never a silent whole-frame run)", () => {
    const entry = ENTRY();
    delete entry.mask;
    assert.throws(
      () => renderH3Repair(entry, {}, FACTS, new GraphBuilder(), "run_lib_nomask"),
      /'mask' names no media.*a repair needs all three seats bound \(source_clip, repair_prompt, mask\)/s,
    );
    const blank = ENTRY();
    blank.mask = "   ";
    assert.throws(
      () => renderH3Repair(blank, {}, FACTS, new GraphBuilder(), "run_lib_blankmask"),
      /'mask' names no media/,
      "whitespace is absence — the seat must name media",
    );
  });

  it("rides the source as its own identity anchor (no still, no mannequin)", () => {
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_anchor");
    const o = out(g);
    const r2v = ofClass(o, "MiniMaxH3ReferenceToVideo");
    assert.equal(r2v.length, 1, "one reference-to-video conditioner");
    const inputs = r2v[0]![1].inputs;
    const refKeys = Object.keys(inputs).filter((k) => k.startsWith("ref_"));
    assert.ok(inputs["ref_videos.ref_video_0"] !== undefined,
      "the source frames ride ref_video_0 (the zero-new-pixels anchor)");
    assert.ok(!refKeys.some((k) => k.startsWith("ref_images.")),
      "no still rides the conditioner (a repair keeps the source's own person)");
  });

  it("stamps the partial denoise on the scheduler (the refine window)", () => {
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_denoise");
    const o = out(g);
    assert.equal(ofClass(o, "BasicScheduler")[0]![1].inputs.denoise, 0.32,
      "the default partial denoise (0.32 — the 0.30–0.35 refine window)");
    const g2 = new GraphBuilder();
    renderH3Repair({ ...ENTRY(), denoise: 0.2 }, {}, FACTS, g2, "run_lib_denoise_stated");
    assert.equal(ofClass(out(g2), "BasicScheduler")[0]![1].inputs.denoise, 0.2,
      "a stated denoise stamps the scheduler verbatim");
  });

  it("refuses loud at denoise >= 1 (a repair is a refine, never a re-render)", () => {
    assert.throws(
      () => renderH3Repair({ ...ENTRY(), denoise: 1 }, {}, FACTS, new GraphBuilder(), "run_lib_boil"),
      /denoise 1 >= 1.*never a re-render/s,
      "full denoise would boil the held region into a new take — the sigmas law precedent guards this seat",
    );
  });

  it("refuses loud naming an empty text seat (the required-seat law holds for all three)", () => {
    const entry = ENTRY();
    delete entry.repair_prompt;
    assert.throws(
      () => renderH3Repair(entry, {}, FACTS, new GraphBuilder(), "run_lib_missing"),
      /'repair_prompt' names no media/,
    );
  });

  it("refuses loud on a negative window (never a silent clamp)", () => {
    assert.throws(
      () => renderH3Repair({ ...ENTRY(), window_start: -24 }, {}, FACTS, new GraphBuilder(), "run_lib_neg"),
      /window seat never goes negative/,
    );
  });

  it("F3: a stated window length must land on the 22+17k engine grid (nearest legal named, never trial-and-error)", () => {
    assert.throws(
      () => renderH3Repair({ ...ENTRY(), window_length: 120 }, {}, FACTS, new GraphBuilder(), "run_lib_grid"),
      /window_length: length 120f is off-grid.*nearest legal: 124f/,
    );
    // 141 is ON the grid (22 + 17·7) — the burn-lived repair window
    renderH3Repair({ ...ENTRY(), window_length: 141 }, {}, FACTS, new GraphBuilder(), "run_lib_grid_ok");
  });

  it("stamps the window on both loaders identically (frames + audio + timeline stay in sync)", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...ENTRY(), window_start: 48, window_length: 124 }, {}, FACTS, g, "run_lib_window");
    const o = out(g);
    const vhs = ofClass(o, "VHS_LoadVideo");
    assert.equal(vhs.length, 1, "one windowed VHS loader");
    assert.equal(vhs[0]![1].inputs.skip_first_frames, 48, "VHS skips to the window head");
    assert.equal(vhs[0]![1].inputs.frame_load_cap, 124, "VHS caps at the window length");
    const timeline = ofClass(o, "MiniMaxH3SourceTimeline");
    assert.equal(timeline[0]![1].inputs.skip_first_frames, 48,
      "the timeline maps the chain onto the SAME window (both loaders stamped identically)");
  });
});
