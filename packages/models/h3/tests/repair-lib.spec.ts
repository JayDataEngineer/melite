// @melite/models-h3 — the repair renderer as a library (the
// swap-lib precedent, friction-report #6: the renderer-as-library
// property is what makes direct-drive safe). Guards: the barrel
// exports renderH3Repair; a minimal entry composes the masked
// second-pass chain ending in MiniMaxH3ChainAssemble; the inline
// SAM3 mask chain is present and region-prompted; the partial
// denoise law refuses at >= 1; an empty seat refuses naming the
// seat; the window seats stamp both loaders.
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
  region_prompt: "hands",
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

  it("composes the inline per-frame SAM3 mask chain, region-prompted (zero staged mask artifacts)", () => {
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_sam3");
    const o = out(g);
    const ckpt = ofClass(o, "CheckpointLoaderSimple");
    assert.equal(ckpt.length, 1, "one SAM3 checkpoint loader");
    assert.equal(ckpt[0]![1].inputs.ckpt_name, "sam3.1_multiplex_fp16.safetensors",
      "the mask family's own declared + hash-pinned SAM3 weights");
    const enc = ofClass(o, "CLIPTextEncode");
    assert.equal(enc.length, 1, "one region conditioning encode");
    assert.equal(enc[0]![1].inputs.text, "hands", "the region prompt is the free-text detection target");
    const track = ofClass(o, "SAM3_VideoTrack");
    assert.equal(track.length, 1, "one native video track over the window frames");
    assert.equal(track[0]![1].inputs.max_objects, 0, "all objects tracked — the union IS the region (region-agnostic law)");
    const toMask = ofClass(o, "SAM3_TrackToMask");
    assert.equal(toMask.length, 1, "one track-to-mask decoder");
    assert.equal(toMask[0]![1].inputs.object_indices, "", "empty indices = the union of every tracked object");
    const grow = ofClass(o, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "one grow seat before the edit");
    assert.equal(grow[0]![1].inputs.expand, 16, "the default grow (seam ring protection)");
    // THE SWAP-DELTAS: no staged mask artifacts ride a repair.
    assert.equal(ofClass(o, "LoadImage").length, 0, "no LoadImage — the mask is inline, never a staged PNG");
    assert.equal(ofClass(o, "ImageToMask").length, 0, "no ImageToMask — the swap's staged-mask decoder never appears");
  });

  // F7 — THE PER-SCENE MASK SLICE (whole-clip parity, 2026-11-12):
  // the plan head segments engine-side and the loop drives the
  // scenes, so the tracked mask TIMELINE must be sliced to the
  // current scene's interval before the grow — never fed whole to
  // every scene (the F7 burn's mask leg).
  it("F7: the tracked mask timeline is SLICED per scene before the grow — whole-clip parity", () => {
    const g = new GraphBuilder();
    renderH3Repair(ENTRY(), {}, FACTS, g, "run_lib_slice");
    const o = out(g);
    const slice = ofClass(o, "MiniMaxH3ContexLoopMaskSlice");
    assert.equal(slice.length, 1, "one loop mask slice — the tracked stack never feeds a scene whole");
    const toMask = ofClass(o, "SAM3_TrackToMask");
    assert.equal(toMask.length, 1);
    assert.deepEqual(slice[0]![1].inputs.mask, [toMask[0]![0], 0],
      "the slice reads the RAW tracked timeline (pre-grow), per the extension's own posture: slice, then Grow Mask");
    // the slice rides the loop's CURRENT-SHOT state — the same state
    // wire the source slice consumes (scene-locked, never a stale copy)
    const srcSlice = ofClass(o, "H3SourceSlice");
    assert.equal(srcSlice.length, 1);
    assert.deepEqual(slice[0]![1].inputs.state, srcSlice[0]![1].inputs.state,
      "the mask slice and the source slice answer ONE state — one scene clock");
    assert.equal(slice[0]![1].inputs.source_fps, 24, "the film clock");
    // the grow derives from the SLICE, and the edit + target consume
    // the grown slice (the whole-stack wire is dead)
    const grow = ofClass(o, "GrowMaskWithBlur");
    assert.equal(grow.length, 1);
    assert.deepEqual(grow[0]![1].inputs.mask, [slice[0]![0], 0],
      "grow follows the slice — each scene grows its own interval");
    const edit = ofClass(o, "MiniMaxH3FantasticVideoEditLatent");
    assert.equal(edit.length, 1);
    assert.deepEqual(edit[0]![1].inputs.mask, [grow[0]![0], 0],
      "the edit latent masks with the scene's grown slice, never the whole timeline");
    const target = ofClass(o, "MiniMaxH3ContexMaskedTarget");
    assert.equal(target.length, 1);
    assert.deepEqual(target[0]![1].inputs.mask, [grow[0]![0], 0],
      "the masked target carries the same scene slice (mask_meaning's own law)");
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

  it("refuses loud naming the empty seat", () => {
    const entry = ENTRY();
    delete entry.region_prompt;
    assert.throws(
      () => renderH3Repair(entry, {}, FACTS, new GraphBuilder(), "run_lib_missing"),
      /'region_prompt' names no media/,
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
