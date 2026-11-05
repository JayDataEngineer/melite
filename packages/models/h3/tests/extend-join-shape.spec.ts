// @melite/models-h3 — the extend join's SHAPE-TRUE law (the F34 cure,
// 2026-11-13; the qa8 burn run-89976b95026b-8f22c399). The extend seat
// joins the RAW PRIOR (the source clip's own canvas) with the CHAIN'S
// OUTPUT (the canvas the H3OneClickSwapPlan derives from the source's
// own frames under the stated tier). When the tier's short edge
// differs from the source's own short edge, the two members disagree
// and the engine's MeliteConcatVideos refuses mid-render:
// `MeliteConcatVideos.0: Expected size 768 but got size 736` (a
// 1344×768 source extended under the default 736p tier renders the
// extension at 1280×736). THE CURE: the join's prior member rides the
// CHAIN PLAN'S OWN SHOT GEOMETRY — the plan node's width/height
// outputs, engine-derived from the source frames — so both concat
// members share one canvas BY CONSTRUCTION, whatever the caller
// states. The canvas is read from the plan's own wires (the chain
// plan's shot geometry), never assumed from a declared width/height
// row. No @contract marker: package-local law, prose header (the
// registry row owns the card-tier join law).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Extend } from "../src/index.ts";
import { LAST_FRAME_BATCH_INDEX } from "../src/extend.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

type Node = { class_type: string; inputs: Record<string, unknown> };

const composeExtend = (
  entry: Record<string, unknown>,
  runId: string,
): Record<string, Node> => {
  const g = new GraphBuilder();
  renderH3Extend(
    { source_clip: "clips/take.mp4", extend_prompt: "carry the walk", ...entry },
    {}, FACTS, g, runId,
  );
  return g.toJSON() as Record<string, Node>;
};

const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const saveVideoOf = (out: Record<string, Node>, prefix: string): [string, Node] => {
  const row = ofClass(out, "SaveVideo").find(([, n]) => n.inputs.filename_prefix === prefix);
  assert.ok(row, `a SaveVideo at ${prefix} ends the join`);
  return row;
};

/** The mux node behind a SaveVideo (its video seat is a [nodeId, slot] link). */
const muxBehind = (out: Record<string, Node>, save: [string, Node]): Node => {
  const link = save[1].inputs.video as [string, number];
  assert.ok(Array.isArray(link), "the save's video seat is a link");
  return out[link[0]];
};

describe("the extend join's shape-true law (the F34 cure)", () => {
  it("the prior member of the join rides the CHAIN PLAN's own shot geometry (the burn's own shape: default tier)", () => {
    const out = composeExtend({ extend_seconds: 2.33 }, "run_shape");
    const plans = ofClass(out, "H3OneClickSwapPlan");
    assert.equal(plans.length, 1, "one plan node — the geometry's only home");
    const planId = plans[0][0];
    const scales = ofClass(out, "ImageScale");
    assert.equal(scales.length, 1, "one aligning scale on the join's prior leg");
    const [scaleId, scale] = scales[0];
    // THE SCALE TARGET IS THE PLAN'S OWN OUTPUTS (slots 1/2) — the
    // engine-derived canvas, never a literal, never a doc row.
    assert.deepEqual(scale.inputs.width, [planId, 1], "the align target's width IS the plan's width output");
    assert.deepEqual(scale.inputs.height, [planId, 2], "the align target's height IS the plan's height output");
    assert.equal(scale.inputs.crop, "disabled", "no crop — the plan canvas already carries the source's aspect");
    assert.equal(
      scale.inputs.upscale_method, "nearest-exact",
      "nearest-exact: pixel-verbatim when the plan canvas already equals the source's own (the history law — the extension never rewrites history), an honest resize only when the tier disagrees",
    );
    const vhsId = ofClass(out, "VHS_LoadVideo")[0][0];
    assert.deepEqual(scale.inputs.image, [vhsId, 0], "the scale reads the WHOLE prior clip (the loader's frame slot)");
    // THE PRIOR PART-MUX MUXES THE ALIGNED FRAMES — the concat's two
    // members share one canvas by construction.
    const priorMux = muxBehind(out, saveVideoOf(out, "run_shape/x0"));
    assert.deepEqual(priorMux.inputs.images, [scaleId, 0], "the prior mux carries the ALIGNED frames, never the raw loader output");
    // the new part-mux is the chain's own trim — the scale touches the prior leg only.
    const newMux = muxBehind(out, saveVideoOf(out, "run_shape/x1"));
    assert.notDeepEqual(newMux.inputs.images, [scaleId, 0], "the extension's own mux never rides the align scale");
  });

  it("ONE geometry decision — the plan node feeds the chain plan, the mask, and the join alike (never a second canvas source)", () => {
    const out = composeExtend({ extend_seconds: 2.33 }, "run_one_geom");
    const planId = ofClass(out, "H3OneClickSwapPlan")[0][0];
    // the chain renders at the plan's own outputs ...
    const planModern = ofClass(out, "MiniMaxH3ChainPlanModern")[0][1];
    assert.deepEqual(planModern.inputs.width, [planId, 1], "the chain plan's width IS the plan node's output");
    assert.deepEqual(planModern.inputs.height, [planId, 2], "the chain plan's height IS the plan node's output");
    // ... and the join aligns to the SAME outputs — no second canvas
    // decision anywhere in the graph.
    const scale = ofClass(out, "ImageScale")[0][1];
    assert.deepEqual(scale.inputs.width, [planId, 1], "the join's align width IS the same plan output");
    assert.deepEqual(scale.inputs.height, [planId, 2], "the join's align height IS the same plan output");
    // the extension's own canvas rides the chain current's wires (derived
    // from the same plan) — a wire, never a literal row.
    const r2v = ofClass(out, "MiniMaxH3ReferenceToVideo")[0][1];
    assert.ok(Array.isArray(r2v.inputs.width), "the extension canvas width is a wire, never a literal");
    assert.ok(Array.isArray(r2v.inputs.height), "the extension canvas height is a wire, never a literal");
  });

  it("the multi-window join aligns the prior to the same plan canvas (assembled extension appends shape-true)", () => {
    // 379f = two 209f windows under the 39f carry (the solver's own
    // example) — the assembled-extension branch joins the prior by file.
    const out = composeExtend({ extend_seconds: 379 / 24 }, "run_shape_multi");
    const planId = ofClass(out, "H3OneClickSwapPlan")[0][0];
    const [scaleId, scale] = ofClass(out, "ImageScale")[0];
    assert.deepEqual(scale.inputs.width, [planId, 1], "the multi-window join aligns to the same plan output");
    const priorMux = muxBehind(out, saveVideoOf(out, "run_shape_multi/x0"));
    assert.deepEqual(priorMux.inputs.images, [scaleId, 0], "the multi-window prior mux carries the aligned frames");
    // the assembled extension still appends through the concat's wired
    // append seat (the ChainAssemble video_path), unchanged by the cure.
    const concat = ofClass(out, "MeliteConcatVideos");
    assert.equal(concat.length, 1, "one file join");
    assert.deepEqual(concat[0][1].inputs.videos, "run_shape_multi/x0", "the prior rides the prefix members");
    assert.ok(Array.isArray(concat[0][1].inputs.append), "the assembled extension appends through the wired append seat");
  });

  it("a stated tier moves the plan canvas and the prior follows it (the cure never freezes a geometry)", () => {
    // 1080p on the same source: the plan derives a DIFFERENT canvas and
    // the prior aligns to THAT — the canvas is the plan's own decision
    // under the stated tier, read back off its outputs either way.
    const out = composeExtend({ extend_seconds: 2.33, resolution: "1080p" }, "run_shape_tier");
    const planId = ofClass(out, "H3OneClickSwapPlan")[0][0];
    const [scaleId, scale] = ofClass(out, "ImageScale")[0];
    assert.deepEqual(scale.inputs.width, [planId, 1], "the stated tier's plan width is the align target");
    assert.deepEqual(scale.inputs.height, [planId, 2], "the stated tier's plan height is the align target");
    const priorMux = muxBehind(out, saveVideoOf(out, "run_shape_tier/x0"));
    assert.deepEqual(priorMux.inputs.images, [scaleId, 0], "the prior mux aligns under the stated tier too");
  });
});

describe("the extend body's FORCED SEAM (the poncho burn, 2026-11-19)", () => {
  // The r2v ref_image ride is a SOFT prior — the model may introduce
  // whole-new content on the appended clip's FIRST frame (the burn:
  // a second figure at full size with no entry). The cure pins the
  // source's LAST frame at frame_idx 0 through the same H3-native
  // guide lane the reshoot pins its warp with (MiniMaxH3AddGuide, one
  // frame → the first appended frame is FORCED to be the clip's last
  // frame, so anything new must develop from it frame by frame).
  // This arm pins the three facts that make the pin, on the real
  // emission: the guide node exists in the extend body, its image
  // seat rides the LAST-FRAME node (ImageFromBatch at the census's
  // own max index — judged in THE NON-EMPTY TAIL describe below),
  // and the pin lands at frame_idx 0 (the seam itself).
  it("wires MiniMaxH3AddGuide over the r2v conditioning with the last frame pinned at frame_idx 0", () => {
    const out = composeExtend({ extend_seconds: 2.33 }, "run_seam");
    const guides = ofClass(out, "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "one guide pin in the extend body");
    const [guideId, guide] = guides[0];
    assert.equal(guide.inputs.frame_idx, 0,
      "the pin lands at frame_idx 0 — the SEAM; anything but 0 pins a later row and the first appended frame stays free");
    const image = guide.inputs.image as unknown;
    assert.ok(Array.isArray(image), "the image seat is a link");
    const imageNode = out[(image as [string, number])[0]];
    assert.equal(imageNode.class_type, "ImageFromBatch",
      "the pinned image rides the LAST-FRAME node (the source's own final frame)");
    // THE PIXEL ANCHOR RIDES THE SAME NODE (the 2026-11-19 burn's
    // second hollow seat): the r2v ref_image_0 and the plan's
    // picture_1 must resolve to the SAME tail node — when the pick
    // sliced empty, BOTH anchors anchored nothing.
    const tailId = (image as [string, number])[0];
    const r2vId = (guide.inputs.positive as [string, number])[0];
    const r2v = out[r2vId];
    assert.deepEqual(r2v.inputs["ref_images.ref_image_0"], [tailId, 0],
      "ref_images.ref_image_0 resolves to the tail node — the pixel anchor rides the same non-empty frame");
    const planPicture = ofClass(out, "H3OneClickSwapPlan")[0][1].inputs.picture_1;
    assert.deepEqual(planPicture, [tailId, 0],
      "the plan's picture_1 resolves to the tail node — the geometry anchor rides the same non-empty frame");
    // the guide's positive rides the r2v conditioning (the pin wraps
    // the soft prior, never replaces it)
    const positive = guide.inputs.positive as unknown;
    assert.ok(Array.isArray(positive), "the positive seat is a link");
    assert.equal(out[(positive as [string, number])[0]].class_type, "MiniMaxH3ReferenceToVideo",
      "the guide wraps the r2v conditioning — the soft prior stays inside the pin");
    // THE RIDE (why this arm fires): the returned conditioning must BE
    // the guided output — the ChainContext's conditioning input
    // resolves to the AddGuide node. An orphan guide node (emitted
    // but returned around) is the soft prior still ruling the seam.
    const contexts = ofClass(out, "MiniMaxH3ChainContext");
    assert.equal(contexts.length, 1, "one chain context consumes the body");
    const ctxCond = contexts[0][1].inputs.conditioning;
    assert.ok(Array.isArray(ctxCond), "the context's conditioning is a link");
    assert.equal((ctxCond as [string, number])[0], guideId,
      "the ChainContext's conditioning rides the AddGuide output — the pin rules the seam, never an orphan beside it");
  });
});

describe("THE NON-EMPTY TAIL (the 2026-11-19 live burn: \"Extend is completely broken, it never starts with the last frame of the last video\")", () => {
  // THE BURN: the first cut picked the prior's final frame with
  // ImageFromBatch batch_index −1. On the live estate the node
  // slices t[idx : idx+length] with NO negative normalization, so
  // −1 yields t[−1:0] — an EMPTY batch — and the AddGuide census
  // law ("batches shorter than 5 frames use only the first image")
  // anchored NOTHING: the forced seam, ref_image_0 and picture_1
  // all rode a hollow image and every extension opened
  // free-composed. THE CURE: a POSITIVE out-of-band index the
  // engine clamps (min(shape−1, idx)) onto the final row — the
  // boot census's OWN max, derived here at runtime, never a frozen
  // literal.
  const BOOT_OBJECT_INFO_JSON = join(
    dirname(fileURLToPath(import.meta.url)),
    "..", "..", "..", "..",
    "tests", "walls", "fixtures", "object_info.boot.json",
  );

  /** The served batch_index band's max — the clamp idiom's own
   * ceiling, read off the DERIVED boot census. */
  const servedBatchIndexMax = (): number => {
    const fixture = JSON.parse(readFileSync(BOOT_OBJECT_INFO_JSON, "utf8")) as Record<string, unknown>;
    const row = fixture["ImageFromBatch"] as {
      input?: { required?: Record<string, unknown> };
    } | undefined;
    const spec = row?.input?.required?.["batch_index"] as unknown[];
    assert.ok(Array.isArray(spec), "the boot fixture carries ImageFromBatch.batch_index — the served node is gone (regen, never freeze)");
    const body = spec[1] as { max?: unknown; min?: unknown };
    assert.ok(typeof body?.max === "number", "the served batch_index band carries a finite max");
    return body.max as number;
  };

  it("the tail pick is the census's OWN max — the clamp lands the last frame under every engine build", () => {
    const servedMax = servedBatchIndexMax();
    const out = composeExtend({ extend_seconds: 2.33 }, "run_tail_value");
    const picks = ofClass(out, "ImageFromBatch");
    assert.equal(picks.length, 1, "one tail pick in the extend emission");
    const [, pick] = picks[0];
    assert.equal(pick.inputs.batch_index, servedMax,
      `the tail pick rides the served band's own max (${servedMax}) — the engine's min(shape−1, idx) clamp lands it on the FINAL row; any other value either 400s at the widget or picks a wrong frame`);
    assert.equal(pick.inputs.length, 1, "one frame — the tail, never a clip");
    const vhsId = ofClass(out, "VHS_LoadVideo")[0][0];
    assert.deepEqual(pick.inputs.image, [vhsId, 0], "the pick reads the staged prior's own frames");
    assert.equal(servedMax, LAST_FRAME_BATCH_INDEX,
      "the emission's constant and the served census agree — bump the constant when the engine's band moves (this arm reds first)");
  });

  it("THE EMPTY-SLICE BAN: no ImageFromBatch in the emission carries a negative batch_index — t[−1:0] is empty, the anchor class the burn rode", () => {
    const singles = composeExtend({ extend_seconds: 2.33 }, "run_tail_single");
    // multi-window too (beyond GRID_MAX_FRAMES the solver composes
    // N windows — the body is shared, but the ban judges EVERY
    // pick the emission carries, whatever the window count)
    // 379f = two 209f windows under the 39f carry (the solver's own
    // example) — the shared body is judged at both window counts
    const multi = composeExtend({ extend_seconds: 379 / 24, overlap_frames: 39 }, "run_tail_multi");
    for (const [label, out] of [["single-window", singles], ["multi-window", multi]] as const) {
      const picks = ofClass(out, "ImageFromBatch");
      assert.ok(picks.length >= 1, `${label}: the emission carries its tail pick`);
      for (const [id, pick] of picks) {
        assert.ok(
          typeof pick.inputs.batch_index === "number" && (pick.inputs.batch_index as number) >= 0,
          `${label}: ImageFromBatch ${id} carries batch_index ${String(pick.inputs.batch_index)} — a negative index slices an EMPTY batch on the live estate (t[−1:0]); the anchor silently anchors nothing`,
        );
      }
    }
  });
});
