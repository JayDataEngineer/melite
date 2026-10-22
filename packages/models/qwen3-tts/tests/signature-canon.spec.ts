// THE SIGNATURE CANON (operator 2026-10-12: "compared to the qwen3tts
// source, we aren't matching signatures per variant — and why is there
// no canon"; recut 2026-10-26 for the size-at-quant fold). Upstream is
// the contract of record — installed package qwen_tts,
// site-packages/qwen_tts/inference/qwen3_tts_model.py:
//
//   generate_custom_voice(text, speaker, language=None, instruct=None, **kw)   — 1.7B
//   generate_custom_voice(text, speaker, language=None, **kw)                  — 0.6B
//   generate_voice_design(text, instruct, language=None, **kw)
//   generate_voice_clone(text, language=None, ref_audio=None, ref_text=None, **kw)
//
// with **kw = the _merge_generate_kwargs set (do_sample, top_k, top_p,
// temperature, repetition_penalty, max_new_tokens, subtalker_*). Every
// qwen3-tts lane's VISIBLE surface is family base (text + sampling)
// ∪ the variant's own inputs ∪ the SIZE CELL's own inputs — NOTHING
// ELSE. The size axis is part of the signature now: the SAME variant
// carries a different instruct capability per cell, exactly as
// upstream's checkpoints differ. This canon fires red the moment a
// (variant × cell) surface drifts from the table below — judged
// through the REAL DECL and the REAL projection (laneSurfaceOf with
// the third axis), never a hand-copied list.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { laneSurfaceOf } from "@melite/contracts/laneRelations";
import { DECL } from "../src/index.ts";

/** The resolved surface for one (variant × cell) lane — the same
 * projection the form and the bench door run (family base ∪ variant
 * additions ∪ cell additions). An absent quantId judges the
 * variant's own surface (the unstated coordinate). */
const surfaceOf = (variantId: string, quantId?: string): readonly string[] => {
  const variant = DECL.variants.find((v) => v.id === variantId)
  const cell = quantId === undefined ? undefined : (variant?.cells ?? []).find((c) => c.quant === quantId)
  const resolved = laneSurfaceOf(DECL.params, variant?.params ?? null, cell?.params ?? null)
  assert.ok(resolved, `qwen3-tts × ${variantId} declares no surface — the canon cannot judge a family that hides its params`)
  return resolved
}

// THE TABLE — upstream signature → estate row names, per lane × size.
const SAMPLING = ["temperature", "top_p", "top_k", "speed", "repetition_penalty", "seed"] as const
const TABLE: ReadonlyArray<{
  variant: string
  quant: string
  /** The upstream function this lane composes (the citation). */
  upstream: string
  laneOwned: readonly string[]
}> = [
  // 1.7B — generate_custom_voice(text, speaker, language, instruct):
  // the LARGE cell adds the instruct input on top of the variant's
  // persona picker.
  { variant: "customvoice", quant: "1_7b", upstream: "generate_custom_voice(text, speaker, language, instruct) — 1.7B", laneOwned: ["voice", "style_instruction"] },
  // 0.6B — generate_custom_voice(text, speaker, language): the
  // small checkpoint reserves no instruct control; the cell adds
  // NOTHING over the variant's own surface.
  { variant: "customvoice", quant: "0_6b", upstream: "generate_custom_voice(text, speaker, language) — 0.6B: no instruct control", laneOwned: ["voice"] },
  // 1.7B — generate_voice_design(text, instruct, language): the
  // persona description IS this lane's instruct (the qvoice
  // boolean law, operator 2026-10-22: the name is the SAVE QVOICE
  // mod's boolean — never a lane input). No 0.6B row — upstream
  // ships no small design checkpoint.
  { variant: "voicedesign", quant: "1_7b", upstream: "generate_voice_design(text, instruct, language)", laneOwned: ["design_prompt"] },
  // 1.7B — generate_voice_clone(text, language, ref_audio, ref_text)
  { variant: "base", quant: "1_7b", upstream: "generate_voice_clone(text, language, ref_audio, ref_text) — 1.7B", laneOwned: ["ref_audio", "ref_text"] },
  // 0.6B clone lane — same signature, smaller tree.
  { variant: "base", quant: "0_6b", upstream: "generate_voice_clone(text, language, ref_audio, ref_text) — 0.6B", laneOwned: ["ref_audio", "ref_text"] },
]

describe("THE SIGNATURE CANON: every qwen3-tts lane's surface equals its upstream signature at its size (text + sampling + the lane's own inputs — nothing else)", () => {
  for (const row of TABLE) {
    it(`qwen3-tts × ${row.variant} × ${row.quant} = ${row.upstream}`, () => {
      const surface = surfaceOf(row.variant, row.quant)
      const expected = ["text", ...SAMPLING, ...row.laneOwned].sort()
      assert.deepEqual([...surface].sort(), expected,
        `the ${row.variant} × ${row.quant} lane's surface must equal its upstream signature ${row.upstream} — base(sampling) ∪ ${row.laneOwned.join(", ")}`)
    })
  }

  it("THE LEAK ARMS — a signature input NEVER renders on a lane upstream does not take it on", () => {
    // generate_custom_voice takes no design prompt, no save name, no refs — at EITHER size.
    for (const quant of ["1_7b", "0_6b"]) {
      const cv = surfaceOf("customvoice", quant)
      assert.ok(!cv.includes("design_prompt"), `customvoice × ${quant}: generate_custom_voice takes no persona description — the export row leaked (the 2026-10-12 GUI injury)`)
      assert.ok(!cv.includes("voice_name"), `customvoice × ${quant}: the save mod's name is not a synthesis input`)
      assert.ok(!cv.includes("ref_audio") && !cv.includes("ref_text"), `customvoice × ${quant}: generate_custom_voice clones no reference`)
    }
    // generate_voice_design takes no speaker, no delivery style, no refs.
    const vd = surfaceOf("voicedesign", "1_7b")
    assert.ok(!vd.includes("voice"), "voicedesign: generate_voice_design takes no speaker id")
    assert.ok(!vd.includes("style_instruction"), "voicedesign: the delivery style is a performance input, not a design input")
    assert.ok(!vd.includes("ref_audio"), "voicedesign: generate_voice_design clones no reference")
    // generate_voice_clone takes no speaker, no instructs, no export pair — at EITHER size.
    for (const quant of ["1_7b", "0_6b"]) {
      const clone = surfaceOf("base", quant)
      assert.ok(!clone.includes("voice") && !clone.includes("style_instruction") && !clone.includes("design_prompt") && !clone.includes("voice_name"),
        `base × ${quant}: generate_voice_clone(text, language, ref_audio, ref_text) takes no persona, no instruct, no export pair`)
    }
    // The 0.6B has no VoiceDesign checkpoint — no variant×cell of the
    // small size surfaces the design pair at all.
    for (const v of DECL.variants) {
      for (const c of v.cells ?? []) {
        if (c.quant !== "0_6b") continue
        const s = surfaceOf(v.id, c.quant)
        assert.ok(!s.includes("design_prompt") && !s.includes("voice_name"),
          `qwen3-tts × ${v.id} × 0_6b: upstream ships no 0.6B design checkpoint — the export pair rides no surface here`)
      }
    }
  })

  it("THE INSTRUCT SPLIT — style rides ONLY the 1.7B CustomVoice cell (upstream reserves instruction control for the large checkpoint)", () => {
    assert.ok(surfaceOf("customvoice", "1_7b").includes("style_instruction"), "the large cell owns the instruct-text style control")
    assert.ok(!surfaceOf("customvoice", "0_6b").includes("style_instruction"), "the small cell has no instruction control — upstream's own capability matrix")
    // THE VARIANT'S OWN SURFACE (the unstated coordinate) carries no
    // instruct either: style on the variant would leak to every cell.
    assert.ok(!surfaceOf("customvoice").includes("style_instruction"), "the variant surface stays instruct-clean — the split lives at the cell alone")
  })
});
