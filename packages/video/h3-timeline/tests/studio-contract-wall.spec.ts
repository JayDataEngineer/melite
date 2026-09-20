/**
 * studio-contract-wall.spec.ts — THE LAYER A/B CONTRACT WALL (goal
 * part 3, 2026-09-17). The studio's serialization vocabulary is a
 * GUEST of the card's declared surface: every key serializeLayerA
 * can emit, and every CALL_KNOB_KEYS entry, must be a name the
 * card's params schema DECLARES (or an explicitly-admitted
 * non-knob carrier: the mod bag, the NLE clips, the doc-local
 * clock). A key the card never declared is a fiction the UI can
 * author and the run door would silently drop — this wall refuses
 * it at test time (the compose path bypasses the admission gate, so
 * the TEST is the wall).
 */
import { describe, expect, it } from "vitest"
import { carrier, BOARDED } from "../src/card.ts"
import { emitParamsSpec } from "@melite/comfyui-cordis/params-emit"
import { serializeLayerA, hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import { CALL_KNOB_KEYS } from "../src/ui/studio/docModel.ts"

/** The card's declared surface: the params schema's own names (the
 * same walk the freshness gate trusts). */
const SURFACE = new Set(Object.keys(emitParamsSpec(carrier as never, BOARDED)))

/** Non-knob carriers the card admits OUTSIDE the params schema — the
 * mod plane (params.loras, resolved against the family catalog at
 * compose), the NLE audio clips (stitch consumes), and the audio
 * stem (legacy round-trip only). Each is a deliberate admission,
 * listed once here, never a wildcard. */
const ADMITS = new Set(["loras", "audio_clips", "audio_stem"])

const LAYER_A_ALL_KEYS: string[] = [
  "seed", "shift_video", "shift_audio", "steps", "denoise", "width", "height",
  "sampler_name", "sched_name",
  "refine_lora", "refine_strength", "refine_steps",
  "attention_backend",
  "sla_enabled",
  "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps",
  "sla_dense_steps", "sla_dense_backend", "sla_reference_protection",
  "sla_protect_audio", "sla_stabilize_motion", "sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interp_model", "interp_multiplier",
  "sr_switch", "sr_model", "sr_resolution",
  "ref_image_size", "model", "audio_stem", "loras", "audio_clips",
]

describe("the studio contract wall (Layer A writes only card truth)", () => {
  it("every key serializeLayerA can emit sits on the declared surface", () => {
    expect(SURFACE.size).toBeGreaterThan(20) // the walk answered
    for (const key of LAYER_A_ALL_KEYS) {
      expect(
        SURFACE.has(key) || ADMITS.has(key),
        `serializeLayerA key "${key}" is neither declared on the card nor admitted`,
      ).toBe(true)
    }
  })

  it("the emitted vocabulary is EXACTLY the truth (walk the serializer with everything set)", () => {
    // a maximally-populated Layer A — every value non-default so no
    // key can hide behind the undefined-means-absent law
    const populated: Record<string, unknown> = {}
    for (const key of LAYER_A_ALL_KEYS) {
      if (key === "loras") populated.loras = [{ id: "x", strength: 0.5 }]
      else if (key === "audio_clips") populated.audio_clips = [{ id: "a", name: "a", src: "data:audio/x", start_frame: 0, dur_frames: 24 }]
      else if (key === "seed") populated.seed = 7
      else if (key === "sharpen_enabled" || key === "interpolate_enabled" || key === "sr_switch") populated[key] = true
      // the SLA master switch rides the wire ONLY as false (absent =
      // on); populate the override so the emitted vocabulary pins it
      else if (key === "sla_enabled") populated[key] = false
      else if (key === "audio_stem" || key === "model" || key === "ref_image_size"
        || key === "sampler_name" || key === "sched_name" || key === "sharpen_method"
        || key === "interp_model" || key === "sla_dense_backend") populated[key] = "euler"
      else if (key === "refine_lora") populated[key] = "h3_taomate_3step"
      else if (key === "attention_backend") populated[key] = "pytorch attention"
      else if (key === "sr_model") populated[key] = "seedvr2_ema_3b_fp16.safetensors"
      else populated[key] = 1
    }
    populated.sr_resolution = 1080
    const out = serializeLayerA(hydrateLayerA(populated))
    for (const key of Object.keys(out)) {
      expect(
        SURFACE.has(key) || ADMITS.has(key),
        `serializeLayerA emitted "${key}" — neither declared nor admitted`,
      ).toBe(true)
    }
  })

  it("every CALL_KNOB_KEYS entry sits on the declared surface (the per-call stanza is card truth too)", () => {
    for (const key of CALL_KNOB_KEYS) {
      expect(
        SURFACE.has(key),
        `CALL_KNOB_KEYS entry "${key}" is not declared on the card`,
      ).toBe(true)
    }
  })

  it("the doc-local clock never serializes (fps is a document fact; the DEAD preset key never resurrects)", () => {
    // (Rule A, 2026-09-18) `preset` died with the hand select — a
    // stale document still carrying one hydrates to nothing and
    // never serializes it back.
    const out = serializeLayerA(hydrateLayerA({ preset: "final_hd", fps: 30, seed: 1 } as never))
    expect("preset" in out).toBe(false)
    expect("fps" in out).toBe(false)
  })
})
