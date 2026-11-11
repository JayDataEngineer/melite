// @melite/models-h3 — THE SHEET SEAT (queue 13, P0-1, operator
// 2026-11-08: "a repair cannot be conditioned on the character
// sheet" + the ruling "ref_mods and ref_images should appear the
// same to the AI, they are input slots"). The defect file's
// acceptance test 5, compose half: ref_mods + ref_images on an EDIT
// run are accepted and ride the graph — the refmod bake
// (MiniMaxH3RefModApply + the pack extractor) appended onto the
// conditioning the chain applies to every window, the sheet's
// LoadImage wired into the cell's r2v reference slots after the
// cell's own anchors. Both stated identically at the doc level: a
// list of paths, nothing else — the machinery is behind the scenes.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Repair, renderH3Swap, renderH3Edit, renderH3Extend } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const REPAIR_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  repair_prompt: "the same hands, five clean fingers",
  mask: "masks/hands_union.png",
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

/** The r2v creator node of the graph (the conditioning's owner). */
const r2vOf = (o: Record<string, Node>): Node =>
  Object.values(o).find((n) => n.class_type === "MiniMaxH3ReferenceToVideo")!;

describe("THE SHEET SEAT (P0-1 — ref_mods + ref_images ride the edit chain, both input slots)", () => {
  it("THE SHEET TEST: a repair with ref_mods + ref_images composes the bake onto the chain conditioning and the sheet into the r2v slots", () => {
    const g = new GraphBuilder();
    renderH3Repair(REPAIR_ENTRY(), {
      ref_mods: ["refs/face_crop.png"],
      ref_images: ["refs/sheet.png"],
    }, FACTS, g, "run_sheet");
    const o = out(g);
    // the bake: one extractor for the visual mod, one Apply appending
    // it onto the conditioning
    const extract = ofClass(o, "MiniMaxH3RefModExtract");
    assert.equal(extract.length, 1, "the face crop bakes through the pack extractor");
    const faceLoad = extract[0]![1].inputs["refs_image.ref_image_0"];
    assert.ok(typeof faceLoad === "object" && faceLoad !== null,
      "the face crop rides the extractor's image container");
    const apply = ofClass(o, "MiniMaxH3RefModApply");
    assert.equal(apply.length, 1, "one Apply appends the mod onto the conditioning");
    // the Apply's output IS the conditioning the chain context consumes
    const ctx = ofClass(o, "MiniMaxH3ChainContext")[0]![1].inputs;
    const ctxCond = ctx.conditioning as [string, number];
    assert.equal(ctxCond[0], apply[0]![0],
      "ChainContext consumes the WRAPPED conditioning — the bake rides every window the chain applies");
    // the sheet: the r2v's own reference slots, after the cell's anchors
    const r2v = r2vOf(o).inputs;
    const sheetSlot = r2v["ref_images.ref_image_0"];
    assert.ok(typeof sheetSlot === "object" && sheetSlot !== null,
      "the sheet's LoadImage wires into the r2v's ref_images.ref_image_0 (repair mounts no image anchor)");
  });

  it("THE SYMMETRY: both slots stated identically — the same wire form, the same acceptance, one grammar", () => {
    // both stated as bare string lists at the doc level (the agent's
    // one grammar); the graph carries each through its own machinery
    for (const key of ["ref_mods", "ref_images"] as const) {
      const g = new GraphBuilder();
      const p: Record<string, unknown> = {};
      p[key] = ["refs/a.png"];
      renderH3Repair(REPAIR_ENTRY(), p, FACTS, g, `run_sym_${key}`);
      const o = out(g);
      // each slot alone composes EXACTLY its own machinery — neither
      // door drags the other in, and neither door needs the other
      const bake = ofClass(o, "MiniMaxH3RefModApply").length;
      const sheetSlot = r2vOf(o).inputs["ref_images.ref_image_0"] !== undefined;
      assert.equal(bake, key === "ref_mods" ? 1 : 0, `ref_mods alone bakes; ref_images alone does not (${key})`);
      assert.equal(sheetSlot, key === "ref_images", `ref_images alone seats the sheet; ref_mods alone does not (${key})`);
    }
  });

  it("THE ABSENCE LAW: an edit run with neither slot composes the pre-cure posture — no bake, no sheet slot", () => {
    const g = new GraphBuilder();
    renderH3Repair(REPAIR_ENTRY(), {}, FACTS, g, "run_bare");
    const o = out(g);
    assert.equal(ofClass(o, "MiniMaxH3RefModApply").length, 0, "no stated mods, no Apply");
    assert.equal(ofClass(o, "MiniMaxH3RefModExtract").length, 0, "no stated mods, no extractor");
    assert.equal(r2vOf(o).inputs["ref_images.ref_image_0"], undefined,
      "no stated sheet, no sheet slot");
  });

  it("THE SLOT LAW: each cell wires the sheet after its own anchors", () => {
    // swap: still at 0 → sheet at 1
    {
      const g = new GraphBuilder();
      renderH3Swap({
        source_clip: "clips/take.mp4", still: "refs/still.png", mannequin: "clips/mannequin.mp4",
        mask: "masks/region.png", swap_prompt: "the twin sister, same room",
      }, { ref_images: ["refs/sheet.png"] }, FACTS, g, "run_swap_sheet");
      const r2v = r2vOf(out(g)).inputs;
      assert.ok(r2v["ref_images.ref_image_0"] !== undefined, "swap's still keeps slot 0");
      assert.ok(r2v["ref_images.ref_image_1"] !== undefined, "the sheet follows the still at slot 1");
    }
    // edit, self posture: no image anchor → sheet at 0
    {
      const g = new GraphBuilder();
      renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "flatten the bust volume", denoise: 0.32,
      }, { source: "static-png", image: "masks/union.png" } as never, { mode: "self" } as never,
        { ref_images: ["refs/sheet.png"] }, FACTS, g, "run_edit_self_sheet");
      const r2v = r2vOf(out(g)).inputs;
      assert.ok(r2v["ref_images.ref_image_0"] !== undefined, "the self posture owns no anchor — the sheet rides slot 0");
    }
    // edit, still+mannequin: still at 0 → sheet at 1
    {
      const g = new GraphBuilder();
      renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "flatten the bust volume",
      }, { source: "static-png", image: "masks/union.png" } as never, { mode: "still+mannequin", still: "refs/still.png", mannequin: "clips/mannequin.mp4" } as never,
        { ref_images: ["refs/sheet.png"] }, FACTS, g, "run_edit_pair_sheet");
      const r2v = r2vOf(out(g)).inputs;
      assert.ok(r2v["ref_images.ref_image_1"] !== undefined, "the pair posture's still owns slot 0 — the sheet rides 1");
    }
    // extend: the pixel anchor at 0 → sheet at 1
    {
      const g = new GraphBuilder();
      renderH3Extend({
        source_clip: "clips/take.mp4", extend_prompt: "she keeps walking",
      }, { ref_images: ["refs/sheet.png"] }, FACTS, g, "run_extend_sheet");
      const r2v = r2vOf(out(g)).inputs;
      assert.ok(r2v["ref_images.ref_image_1"] !== undefined, "the extend anchor owns slot 0 — the sheet follows at 1");
    }
  });

  it("THE CAP: a sheet longer than the reference-image cap refuses LOUD, naming the cap", () => {
    const g = new GraphBuilder();
    const nine = Array.from({ length: 9 }, (_, i) => `refs/sheet_${i}.png`);
    assert.throws(
      () => renderH3Repair(REPAIR_ENTRY(), { ref_images: nine }, FACTS, g, "run_cap"),
      /ref_images exceeds the reference-image cap \(saw 9, max 8\)/,
      "the edit bus refuses loud — never a silent clobber onto the video lane");
  });

  it("THE AUDIO ARM (defect board D-39a, the operator's rank-0 1:1 law: 'Ref Audios and putting audio into refmod should work 1:1 with images'): a mixed bag composes — a .flac NEVER refuses, it bakes through the audio extractor, declared order kept", () => {
    // ref_mods takes ANY media (fdf838a9e, 2026-11-06) — image,
    // video and audio board the SAME seat with the SAME list
    // grammar; the system bakes each kind. This arm is the parity
    // law's wall: an audio path in the bag is a path like any
    // other, never a type refusal.
    const g = new GraphBuilder();
    renderH3Repair(REPAIR_ENTRY(), {
      ref_mods: ["refs/face_crop.png", "voice/take-one.flac"],
    }, FACTS, g, "run_audio_mod");
    const o = out(g);
    const extract = ofClass(o, "MiniMaxH3RefModExtract");
    assert.equal(extract.length, 1, "the visual entry bakes through the pack extractor");
    // the audio extractor node class (refmodBake's audio arm): one
    // node per audio entry, voice-grade defaults
    const audioExtract = ofClass(o, "MiniMaxH3RefModAudioExtract");
    assert.equal(audioExtract.length, 1,
      "the .flac bakes through the audio extractor — a path is a path (never a type refusal)");
    const loads = ofClass(o, "LoadAudio");
    assert.equal(loads.length, 1, "the audio path rides a LoadAudio loader like any media");
    const audioName = audioExtract[0]![1].inputs["name"];
    assert.equal(audioName, "take-one",
      "the baked audio pack is named for its source stem (the save/reuse law, same as the visual pack)");
    const apply = ofClass(o, "MiniMaxH3RefModApply");
    assert.ok(apply.length >= 2,
      "the baked visual pack AND the baked audio pack each append through their own Apply (declared order)");
  });

  it("THE PRE-BAKED STEM ARM: a .safetensors mod rides the loader, not the extractor (the reuse door on the edit chain)", () => {
    const g = new GraphBuilder();
    renderH3Repair(REPAIR_ENTRY(), { ref_mods: ["models/refmods/twin_v1.safetensors"] }, FACTS, g, "run_stem");
    const o = out(g);
    assert.equal(ofClass(o, "MiniMaxH3RefModsLoader").length, 1, "the pre-baked stem loads through the 8-slot loader");
    assert.equal(ofClass(o, "MiniMaxH3RefModExtract").length, 0, "a stem bakes nothing — it IS the pack");
    assert.equal(ofClass(o, "MiniMaxH3RefModApply").length, 1, "the loader's pack still appends onto the conditioning");
  });
});
