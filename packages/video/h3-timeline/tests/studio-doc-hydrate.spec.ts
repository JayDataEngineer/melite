/**
 * docHydrate — params ⇄ Layer A (BEHAVIORAL).
 *
 * PINS: defaults for empty docs, every hydration arm (numbers,
 * enums, legacy h3_sage_attention, dense-steps regex, stem→clip
 * conversion, clip filtering), and the serialize law (undefined =
 * absent = the engine decides).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

describe("hydrateLayerA (params → Layer A)", () => {
  it("an empty doc hydrates the engine defaults", () => {
    const a = hydrateLayerA(undefined)
    assert.equal(a.preset, "draft_02mp")
    assert.equal(a.fps, 24)
    assert.equal(a.seed, 42)
    assert.equal(a.audio_mode, "none")
    assert.equal(a.continuity, true)
    assert.equal(a.h3_fp16_accumulation, false)
    assert.equal(a.h3_torch_compile, false)
    assert.equal(a.h3_sla_protect_audio, true)
    assert.equal(a.h3_sla_stabilize_motion, true)
    assert.equal(a.h3_sla_disable_fp16_accum, false)
    assert.equal(a.sharpen_enabled, false)
    assert.equal(a.interpolate_enabled, false)
    assert.equal(a.rtx_vsr_enabled, false)
    assert.equal(a.audio_clips, undefined)
    assert.equal(a.audio_stem, undefined)
  })

  it("numbers hydrate verbatim; junk falls back (never NaN, never ≤0 for clock keys)", () => {
    const a = hydrateLayerA({ fps: 30, seed: 7 })
    assert.equal(a.fps, 30)
    assert.equal(a.seed, 7)
    const bad = hydrateLayerA({ fps: 0, seed: -3 })
    assert.equal(bad.fps, 24)
    assert.equal(bad.seed, 42)
    const str = hydrateLayerA({ fps: "30", seed: "x" })
    assert.equal(str.fps, 30)
    assert.equal(str.seed, 42)
  })

  it("audio_mode admits only the three door modes", () => {
    assert.equal(hydrateLayerA({ audio_mode: "native" }).audio_mode, "native")
    assert.equal(hydrateLayerA({ audio_mode: "lipSync" }).audio_mode, "lipSync")
    assert.equal(hydrateLayerA({ audio_mode: "mp3" }).audio_mode, "none")
  })

  it("preset/continuity/sampler/scheduler", () => {
    assert.equal(hydrateLayerA({ preset: "final_hd" }).preset, "final_hd")
    assert.equal(hydrateLayerA({ preset: "" }).preset, "draft_02mp")
    assert.equal(hydrateLayerA({ preset: 42 }).preset, "draft_02mp")
    assert.equal(hydrateLayerA({ continuity: false }).continuity, false)
    assert.equal(hydrateLayerA({ sampler: "euler", scheduler: "karras" }).sampler, "euler")
    assert.equal(hydrateLayerA({ sampler: "", scheduler: 7 }).scheduler, undefined)
  })

  it("the knob-audit reals hydrate (denoise/width/height/shifts/steps)", () => {
    const a = hydrateLayerA({
      shift_video: "12", shift_audio: 3, sampling_steps: 20,
      denoise: 0.8, width: 768, height: 448,
    })
    assert.equal(a.shift_video, 12)
    assert.equal(a.shift_audio, 3)
    assert.equal(a.sampling_steps, 20)
    assert.equal(a.denoise, 0.8)
    assert.equal(a.width, 768)
    assert.equal(a.height, 448)
    const b = hydrateLayerA({})
    assert.equal(b.shift_video, undefined)
    assert.equal(b.denoise, undefined)
  })

  it("attention: the four backends, legacy sage flag, else engine default", () => {
    for (const v of ["kitchen", "sol", "sage", "sla"] as const) {
      assert.equal(hydrateLayerA({ h3_attention: v }).h3_attention, v)
    }
    assert.equal(hydrateLayerA({ h3_sage_attention: true }).h3_attention, "sage")
    assert.equal(hydrateLayerA({ h3_attention: "sage-x" }).h3_attention, undefined)
    assert.equal(hydrateLayerA({}).h3_attention, undefined)
  })

  it("build flags are explicit-true only", () => {
    const a = hydrateLayerA({ h3_fp16_accumulation: true, h3_torch_compile: 1 })
    assert.equal(a.h3_fp16_accumulation, true)
    assert.equal(a.h3_torch_compile, false)
  })

  it("cfg/context/sparsity numbers + the 32-wide block vocabulary", () => {
    const a = hydrateLayerA({
      cfg: 4, h3_context_steps: 2, h3_audio_context_steps: 40,
      h3_sla_sparsity: 0.9, h3_sla_block_size: "32",
      h3_sla_min_seq_len: 64, h3_sla_dense_last_steps: 4,
    })
    assert.equal(a.cfg, 4)
    assert.equal(a.h3_sla_block_size, "32")
    assert.equal(hydrateLayerA({ h3_sla_block_size: "16" }).h3_sla_block_size, undefined)
    // pin-equals-default booleans: absent/false → the node default rides
    assert.equal(hydrateLayerA({}).h3_sla_protect_audio, true)
    assert.equal(hydrateLayerA({ h3_sla_protect_audio: false }).h3_sla_protect_audio, false)
    assert.equal(hydrateLayerA({ h3_sla_stabilize_motion: false }).h3_sla_stabilize_motion, false)
  })

  it("SLA enums admit only members; dense-steps only interval lists", () => {
    const a = hydrateLayerA({
      h3_sla_reference_protection: "Heavy Enforcement",
      h3_sla_dense_backend: "auto",
      h3_sla_dense_steps: " 1-3, 5 ",
    })
    assert.equal(a.h3_sla_reference_protection, "Heavy Enforcement")
    assert.equal(a.h3_sla_dense_backend, "auto")
    assert.equal(a.h3_sla_dense_steps, "1-3, 5")
    assert.equal(hydrateLayerA({ h3_sla_reference_protection: "max" }).h3_sla_reference_protection, undefined)
    assert.equal(hydrateLayerA({ h3_sla_dense_backend: "x" }).h3_sla_dense_backend, undefined)
    assert.equal(hydrateLayerA({ h3_sla_dense_steps: "soon" }).h3_sla_dense_steps, undefined)
    assert.equal(hydrateLayerA({ h3_sla_dense_steps: 42 }).h3_sla_dense_steps, undefined)
    assert.equal(hydrateLayerA({}).h3_sla_dense_steps, undefined)
  })

  it("sharpen + interpolate vocabulary", () => {
    const a = hydrateLayerA({
      sharpen_enabled: true, sharpen_method: "adaptive_usm",
      sharpen_strength: 0.5, sharpen_radius: 2, sharpen_threshold: 0.1,
      sharpen_iterations: 3, interpolate_enabled: true,
      interpolate_model: "rife47.pth", interpolate_multiplier: 4,
    })
    assert.equal(a.sharpen_method, "adaptive_usm")
    assert.equal(a.interpolate_model, "rife47.pth")
    assert.equal(a.interpolate_multiplier, 4)
    assert.equal(hydrateLayerA({ sharpen_method: "blur" }).sharpen_method, undefined)
    assert.equal(hydrateLayerA({ interpolate_model: "x" }).interpolate_model, undefined)
    assert.equal(hydrateLayerA({}).sharpen_strength, undefined)
    assert.equal(hydrateLayerA({}).interpolate_multiplier, undefined)
  })

  it("variant/model/refs/size/trim/lora/rtx/crf", () => {
    const a = hydrateLayerA({
      variant: "v1", model: "h3-timeline-ref",
      h3_ref_images: "a, b", h3_ref_videos: " ", h3_ref_audios: "s",
      h3_ref_video_audios: "vs", h3_ref_image_size: "max",
      h3_ref_audio_trim_start: 1, h3_ref_audio_trim_duration: 5,
      lora_name: " h3/x.safetensors ", lora_strength: 0.8,
      rtx_vsr_enabled: true, rtx_vsr_multiplier: 4, rtx_vsr_quality: "ULTRA", crf: 19,
    })
    assert.equal(a.variant, "v1")
    assert.equal(a.model, "h3-timeline-ref")
    assert.equal(a.h3_ref_images, "a, b")
    assert.equal(a.h3_ref_videos, undefined)
    assert.equal(hydrateLayerA({ h3_ref_videos: "clip-v", h3_ref_audios: "s", h3_ref_video_audios: "vs" }).h3_ref_videos, "clip-v")
    assert.equal(a.h3_ref_image_size, "max")
    assert.equal(a.lora_name, " h3/x.safetensors ")
    assert.equal(a.rtx_vsr_multiplier, 4)
    assert.equal(hydrateLayerA({ h3_ref_image_size: "huge" }).h3_ref_image_size, undefined)
    assert.equal(hydrateLayerA({ h3_ref_image_size: 42 }).h3_ref_image_size, undefined)
    assert.equal(hydrateLayerA({ variant: 7 }).variant, undefined)
    assert.equal(hydrateLayerA({ model: 7 }).model, undefined)
    assert.equal(hydrateLayerA({ lora_name: "  " }).lora_name, undefined)
    assert.equal(hydrateLayerA({ rtx_vsr_quality: 9 }).rtx_vsr_quality, undefined)
    assert.equal(hydrateLayerA({}).lora_strength, undefined)
    assert.equal(hydrateLayerA({}).rtx_vsr_multiplier, undefined)
    assert.equal(hydrateLayerA({}).crf, undefined)
  })

  it("audio_stem round-trips raw; blank stems vanish", () => {
    assert.equal(hydrateLayerA({ audio_stem: "theme" }).audio_stem, "theme")
    assert.equal(hydrateLayerA({ audio_stem: "  " }).audio_stem, undefined)
    assert.equal(hydrateLayerA({ audio_stem: 7 }).audio_stem, undefined)
  })

  it("audio_clips: valid clips survive, junk rows filter out", () => {
    const good = { id: "c1", name: "n", src: "theme", start_frame: 0, dur_frames: 96 }
    const a = hydrateLayerA({ audio_clips: [good, null, 42, { ...good, id: 9 }, { ...good, src: "  " }, { ...good, dur_frames: 0 }, { ...good, start_frame: NaN }] })
    assert.deepEqual(a.audio_clips, [good])
    assert.equal(hydrateLayerA({ audio_clips: [] }).audio_clips, undefined)
    assert.equal(hydrateLayerA({ audio_clips: "x" }).audio_clips, undefined)
  })

  it("legacy stem converts to a positioned clip at frame 0 (4s fallback)", () => {
    const a = hydrateLayerA({ audio_stem: "theme-song", fps: 30 })
    assert.equal(a.audio_clips!.length, 1)
    assert.equal(a.audio_clips![0]!.src, "theme-song")
    assert.equal(a.audio_clips![0]!.start_frame, 0)
    assert.equal(a.audio_clips![0]!.dur_frames, 120)
    // clips present = no conversion (the stem stays a stem)
    const good = { id: "c1", name: "n", src: "theme", start_frame: 0, dur_frames: 96 }
    const b = hydrateLayerA({ audio_stem: "theme", audio_clips: [good] })
    assert.deepEqual(b.audio_clips, [good])
    // stem all-junk-clips = conversion still fires (parsed empty)
    const c = hydrateLayerA({ audio_stem: "theme", audio_clips: [null] })
    assert.equal(c.audio_clips!.length, 1)
    assert.equal(c.audio_clips![0]!.src, "theme")
  })

  it("uses expect at least once", () => {
    expect(hydrateLayerA(undefined).fps).toBe(24)
  })
})

describe("serializeLayerA (Layer A → persisted shape)", () => {
  it("always-on keys ride; untouched optionals stay absent", () => {
    const out = serializeLayerA(hydrateLayerA(undefined))
    assert.equal(out["preset"], "draft_02mp")
    assert.equal(out["fps"], 24)
    assert.equal(out["h3_fp16_accumulation"], false)
    assert.equal(out["h3_sla_protect_audio"], true)
    assert.ok(!("sampler" in out))
    assert.ok(!("denoise" in out))
    assert.ok(!("audio_clips" in out))
    assert.ok(!("lora_name" in out))
    assert.ok(!("rtx_vsr_enabled" in out))
  })

  it("set optionals ride (the full loop vocabulary)", () => {
    const out = serializeLayerA(hydrateLayerA({
      shift_video: 12, shift_audio: 3, sampler: "euler", scheduler: "simple",
      sampling_steps: 20, denoise: 0.8, width: 768, height: 448,
      h3_attention: "sla", audio_stem: "theme",
      h3_sla_sparsity: 0.9, h3_sla_block_size: "64",
      h3_sla_min_seq_len: 64, h3_sla_dense_last_steps: 4,
      h3_sla_reference_protection: "Light", h3_sla_dense_backend: "pytorch",
      h3_sla_dense_steps: "1-3", sharpen_method: "rcas", sharpen_strength: 0.5,
      interpolate_model: "rife47.pth", interpolate_multiplier: 2,
      h3_ref_images: "a", h3_ref_image_size: "match", model: "h3-timeline-ref",
    }))
    for (const k of ["shift_video", "sampler", "sampling_steps", "denoise", "width",
      "h3_attention", "audio_stem", "h3_sla_block_size", "sharpen_method",
      "interpolate_model", "h3_ref_images", "h3_ref_image_size", "model"]) {
      assert.ok(k in out, `${k} rides when set`)
    }
  })

  it("clips ride only when present; the LoRA pair rides trimmed + strength-optional", () => {
    const good = { id: "c1", name: "n", src: "theme", start_frame: 0, dur_frames: 96 }
    const withClips = serializeLayerA({ ...hydrateLayerA(undefined), audio_clips: [good] })
    assert.deepEqual(withClips["audio_clips"], [good])
    const emptyClips = serializeLayerA({ ...hydrateLayerA(undefined), audio_clips: [] })
    assert.ok(!("audio_clips" in emptyClips))
    const lora = serializeLayerA({ ...hydrateLayerA(undefined), lora_name: "  h3/x  ", lora_strength: 0.8 })
    assert.equal(lora["lora_name"], "h3/x")
    assert.equal(lora["lora_strength"], 0.8)
    const loraBare = serializeLayerA({ ...hydrateLayerA(undefined), lora_name: "h3/x", lora_strength: undefined })
    assert.equal(loraBare["lora_name"], "h3/x")
    assert.ok(!("lora_strength" in loraBare))
    const loraBlank = serializeLayerA({ ...hydrateLayerA(undefined), lora_name: "   " })
    assert.ok(!("lora_name" in loraBlank))
  })

  it("RTX rides only when ON", () => {
    const on = serializeLayerA({ ...hydrateLayerA(undefined), rtx_vsr_enabled: true })
    assert.equal(on["rtx_vsr_enabled"], true)
    const off = serializeLayerA(hydrateLayerA(undefined))
    assert.ok(!("rtx_vsr_enabled" in off))
  })
})
