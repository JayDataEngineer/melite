// THE SIGNATURE CANON (operator 2026-10-12: "compared to the qwen3tts
// source, we aren't matching signatures per variant — and why is there
// no canon"). Upstream is the contract of record — installed package
// qwen_tts, site-packages/qwen_tts/inference/qwen3_tts_model.py:
//
//   generate_custom_voice(text, speaker, language=None, instruct=None, **kw)
//   generate_voice_design(text, instruct, language=None, **kw)
//   generate_voice_clone(text, language=None, ref_audio=None, ref_text=None, **kw)
//
// with **kw = the _merge_generate_kwargs set (do_sample, top_k, top_p,
// temperature, repetition_penalty, max_new_tokens, subtalker_*). Every
// qwen3-tts lane's VISIBLE surface is family base (prompt + sampling)
// ∪ the lane's own signature inputs — NOTHING ELSE. The persona-export
// pair (design_prompt + voice_name) is the VoiceDesign lane's own input
// (generate_voice_design's instruct IS the persona description) — it
// rode the FAMILY BASE once and leaked onto every lane (the CustomVoice
// form showed "Voice Persona & Timbre", upstream takes no such input
// there). This canon fires red the moment a lane's surface drifts from
// the table below — judged through the REAL DECLs and the REAL
// projection (laneSurfaceOf), never a hand-copied list.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { laneSurfaceOf } from "@melite/contracts/laneRelations";
import { DECL as LATEST } from "../src/index.ts";
import { DECL as SMALL } from "@melite/models-qwen3-tts";

/** The resolved surface for one lane — the same projection the form
 * and the bench door run (family base ∪ variant additions). */
const surfaceOf = (decl: typeof LATEST, variantId: string): readonly string[] => {
  const variant = decl.variants.find((v) => v.id === variantId)
  const resolved = laneSurfaceOf(decl.params, variant?.params ?? null)
  assert.ok(resolved, `${decl.id} declares no surface — the canon cannot judge a family that hides its params`)
  return resolved
}

// THE TABLE — upstream signature → estate row names, per lane.
const SAMPLING = ["temperature", "top_p", "top_k", "speed", "repetition_penalty", "seed"] as const
const TABLE: ReadonlyArray<{
  family: string
  variant: string
  /** The upstream function this lane composes (the citation). */
  upstream: string
  laneOwned: readonly string[]
}> = [
  // 1.7B — generate_custom_voice(text, speaker, language, instruct)
  { family: "qwen3-tts-voicedesign", variant: "customvoice", upstream: "generate_custom_voice(text, speaker, language, instruct)", laneOwned: ["voice", "style_instruction"] },
  // 1.7B — generate_voice_design(text, instruct, language): the
  // persona description IS this lane's instruct; the save mod's name
  // rides with it (the lane exists to export).
  { family: "qwen3-tts-voicedesign", variant: "voicedesign", upstream: "generate_voice_design(text, instruct, language)", laneOwned: ["design_prompt", "voice_name"] },
  // 1.7B — generate_voice_clone(text, language, ref_audio, ref_text)
  { family: "qwen3-tts-voicedesign", variant: "base", upstream: "generate_voice_clone(text, language, ref_audio, ref_text)", laneOwned: ["ref_audio", "ref_text"] },
  // 0.6B CustomVoice — upstream reserves instruct control for the
  // LARGE checkpoint: speaker only, no style row.
  { family: "qwen3-tts", variant: "customvoice", upstream: "generate_custom_voice(text, speaker, language) — 0.6B: no instruct control", laneOwned: ["voice"] },
  // 0.6B clone lane.
  { family: "qwen3-tts", variant: "base", upstream: "generate_voice_clone(text, language, ref_audio, ref_text)", laneOwned: ["ref_audio", "ref_text"] },
]

describe("THE SIGNATURE CANON: every qwen3-tts lane's surface equals its upstream signature (text + sampling + the lane's own inputs — nothing else)", () => {
  for (const row of TABLE) {
    const decl = row.family === LATEST.id ? LATEST : SMALL
    it(`${row.family} × ${row.variant} = ${row.upstream}`, () => {
      const surface = surfaceOf(decl, row.variant)
      const expected = ["text", ...SAMPLING, ...row.laneOwned].sort()
      assert.deepEqual([...surface].sort(), expected,
        `the ${row.variant} lane's surface must equal its upstream signature ${row.upstream} — base(sampling) ∪ ${row.laneOwned.join(", ")}`)
    })
  }

  it("THE LEAK ARMS — a signature input NEVER renders on a lane upstream does not take it on", () => {
    // generate_custom_voice takes no design prompt, no save name, no refs.
    for (const decl of [LATEST, SMALL]) {
      const cv = surfaceOf(decl, "customvoice")
      assert.ok(!cv.includes("design_prompt"), `${decl.id} customvoice: generate_custom_voice takes no persona description — the export row leaked (the 2026-10-12 GUI injury)`)
      assert.ok(!cv.includes("voice_name"), `${decl.id} customvoice: the save mod's name is not a synthesis input`)
      assert.ok(!cv.includes("ref_audio") && !cv.includes("ref_text"), `${decl.id} customvoice: generate_custom_voice clones no reference`)
    }
    // generate_voice_design takes no speaker, no delivery style, no refs.
    const vd = surfaceOf(LATEST, "voicedesign")
    assert.ok(!vd.includes("voice"), "voicedesign: generate_voice_design takes no speaker id")
    assert.ok(!vd.includes("style_instruction"), "voicedesign: the delivery style is a performance input, not a design input")
    assert.ok(!vd.includes("ref_audio"), "voicedesign: generate_voice_design clones no reference")
    // generate_voice_clone takes no speaker, no instructs, no export pair.
    for (const decl of [LATEST, SMALL]) {
      const clone = surfaceOf(decl, "base")
      assert.ok(!clone.includes("voice") && !clone.includes("style_instruction") && !clone.includes("design_prompt") && !clone.includes("voice_name"),
        `${decl.id} base: generate_voice_clone(text, language, ref_audio, ref_text) takes no persona, no instruct, no export pair`)
    }
    // The 0.6B has no VoiceDesign checkpoint — no lane of the small
    // family surfaces the design pair at all.
    for (const variant of SMALL.variants) {
      const s = surfaceOf(SMALL, variant.id)
      assert.ok(!s.includes("design_prompt") && !s.includes("voice_name"),
        `qwen3-tts × ${variant.id}: upstream ships no 0.6B design checkpoint — the export pair rides no surface here`)
    }
  })

  it("THE INSTRUCT SPLIT — style rides ONLY the 1.7B CustomVoice lane (upstream reserves instruction control for the large checkpoint)", () => {
    assert.ok(surfaceOf(LATEST, "customvoice").includes("style_instruction"), "1.7B customvoice owns the instruct-text style control")
    assert.ok(!surfaceOf(SMALL, "customvoice").includes("style_instruction"), "0.6B customvoice has no instruction control — upstream's own capability matrix")
  })
})
