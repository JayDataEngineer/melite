/**
 * docHydrate — params ⇄ Layer A (BEHAVIORAL).
 *
 * PINS (the Layer A/B law stroke, 2026-09-17): the wire-name
 * vocabulary (steps / sampler_name / sched_name / sla_* /
 * interp_* / sr_switch), legacy py-era migration at hydration,
 * defaults for empty docs, every hydration arm (numbers, enums,
 * dense-steps regex, stem→clip conversion, clip filtering), and
 * the serialize law (only card-read keys ride; preset/fps are
 * document-local and never serialize).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

describe("hydrateLayerA (params → Layer A)", () => {
  it("an empty doc hydrates the engine defaults", () => {
    const a = hydrateLayerA(undefined)
    // (Rule A, 2026-09-18) `preset` is DEAD — the geometry recipes
    // ride the family's Recipe pills now; width/height are the keys.
    assert.equal(a.width, undefined)
    assert.equal(a.fps, 24)
    assert.equal(a.seed, 42)
    assert.equal(a.sla_protect_audio, true)
    assert.equal(a.sla_stabilize_motion, true)
    assert.equal(a.sla_disable_fp16_accum, false)
    assert.equal(a.sharpen_enabled, false)
    assert.equal(a.interpolate_enabled, false)
    assert.equal(a.sr_switch, false)
    assert.equal(a.audio_clips, undefined)
    assert.equal(a.audio_stem, undefined)
    assert.equal(a.loras, undefined)
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

  it("wire-name sampler rows hydrate (preset is dead — Rule A rides the family pills)", () => {
    assert.equal(hydrateLayerA({ width: 768, height: 448 }).width, 768)
    assert.equal(hydrateLayerA({ sampler_name: "euler", sched_name: "karras" }).sampler_name, "euler")
    assert.equal(hydrateLayerA({ sampler_name: "", sched_name: 7 }).sched_name, undefined)
  })

  it("the knob-audit reals hydrate (denoise/width/height/shifts/steps)", () => {
    const a = hydrateLayerA({
      shift_video: "12", shift_audio: 3, steps: 20,
      denoise: 0.8, width: 768, height: 448,
    })
    assert.equal(a.shift_video, 12)
    assert.equal(a.shift_audio, 3)
    assert.equal(a.steps, 20)
    assert.equal(a.denoise, 0.8)
    assert.equal(a.width, 768)
    assert.equal(a.height, 448)
    const b = hydrateLayerA({})
    assert.equal(b.shift_video, undefined)
    assert.equal(b.denoise, undefined)
  })

  it("LEGACY py-era spellings migrate at hydration", () => {
    const a = hydrateLayerA({
      sampling_steps: 20, sampler: "euler", scheduler: "karras",
      h3_sla_sparsity: 0.9, h3_sla_block_size: "64",
      interpolate_model: "rife47.pth", interpolate_multiplier: 4,
      rtx_vsr_enabled: true, h3_ref_image_size: "max",
    })
    assert.equal(a.steps, 20)
    assert.equal(a.sampler_name, "euler")
    assert.equal(a.sched_name, "karras")
    assert.equal(a.sla_sparsity, 0.9)
    assert.equal(a.sla_block_size, "64")
    assert.equal(a.interp_model, "rife47.pth")
    assert.equal(a.interp_multiplier, 4)
    assert.equal(a.sr_switch, true)
    assert.equal(a.ref_image_size, "max")
  })

  it("a legacy lora knob pair migrates into the mod bag when the filename serves", () => {
    const a = hydrateLayerA({
      lora_name: "h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
      lora_strength: 0.6,
    })
    assert.deepEqual(a.loras, [{ id: "h3_lightx2v_turbo", strength: 0.6 }])
    // an unknown filename drops (it was decorative — compose never read it)
    const b = hydrateLayerA({ lora_name: "h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors", lora_strength: 0.8 })
    assert.equal(b.loras, undefined)
  })

  it("the loras mod bag hydrates (id rows, junk filters)", () => {
    const a = hydrateLayerA({ loras: [{ id: "h3_lightx2v_turbo", strength: 0.5 }, { strength: 1 }, null] })
    assert.deepEqual(a.loras, [{ id: "h3_lightx2v_turbo", strength: 0.5 }])
    assert.equal(hydrateLayerA({ loras: "x" }).loras, undefined)
  })

  it("SLA numbers + the block-size vocabulary (wire names)", () => {
    const a = hydrateLayerA({
      sla_sparsity: 0.9, sla_block_size: "32",
      sla_min_seq_len: 64, sla_dense_last_steps: 4,
    })
    assert.equal(a.sla_sparsity, 0.9)
    assert.equal(a.sla_block_size, "32")
    assert.equal(hydrateLayerA({ sla_block_size: "16" }).sla_block_size, undefined)
    // pin-equals-default booleans: absent/false → the node default rides
    assert.equal(hydrateLayerA({}).sla_protect_audio, true)
    assert.equal(hydrateLayerA({ sla_protect_audio: false }).sla_protect_audio, false)
    assert.equal(hydrateLayerA({ sla_stabilize_motion: false }).sla_stabilize_motion, false)
  })

  it("SLA enums admit only members; dense-steps only interval lists", () => {
    const a = hydrateLayerA({
      sla_reference_protection: "Heavy Enforcement",
      sla_dense_backend: "auto",
      sla_dense_steps: " 1-3, 5 ",
    })
    assert.equal(a.sla_reference_protection, "Heavy Enforcement")
    assert.equal(a.sla_dense_backend, "auto")
    assert.equal(a.sla_dense_steps, "1-3, 5")
    assert.equal(hydrateLayerA({ sla_reference_protection: "max" }).sla_reference_protection, undefined)
    assert.equal(hydrateLayerA({ sla_dense_backend: "x" }).sla_dense_backend, undefined)
    assert.equal(hydrateLayerA({ sla_dense_steps: "soon" }).sla_dense_steps, undefined)
    assert.equal(hydrateLayerA({ sla_dense_steps: 42 }).sla_dense_steps, undefined)
    assert.equal(hydrateLayerA({}).sla_dense_steps, undefined)
  })

  it("sharpen + interpolate vocabulary (wire names)", () => {
    const a = hydrateLayerA({
      sharpen_enabled: true, sharpen_method: "adaptive_usm",
      sharpen_strength: 0.5, sharpen_radius: 2, sharpen_threshold: 0.1,
      sharpen_iterations: 3, interpolate_enabled: true,
      interp_model: "rife47.pth", interp_multiplier: 4,
    })
    assert.equal(a.sharpen_method, "adaptive_usm")
    assert.equal(a.interp_model, "rife47.pth")
    assert.equal(a.interp_multiplier, 4)
    assert.equal(hydrateLayerA({ sharpen_method: "blur" }).sharpen_method, undefined)
    assert.equal(hydrateLayerA({ interp_model: "x" }).interp_model, undefined)
    assert.equal(hydrateLayerA({}).sharpen_strength, undefined)
    assert.equal(hydrateLayerA({}).interp_multiplier, undefined)
  })

  it("variant/model/ref-size/sr rows", () => {
    const a = hydrateLayerA({
      variant: "v1", model: "h3-timeline-ref",
      ref_image_size: "max", sr_switch: true, sr_resolution: 1440,
    })
    assert.equal(a.variant, "v1")
    assert.equal(a.model, "h3-timeline-ref")
    assert.equal(a.ref_image_size, "max")
    assert.equal(a.sr_switch, true)
    assert.equal(a.sr_resolution, 1440)
    assert.equal(hydrateLayerA({ ref_image_size: "huge" }).ref_image_size, undefined)
    assert.equal(hydrateLayerA({ ref_image_size: 42 }).ref_image_size, undefined)
    assert.equal(hydrateLayerA({ variant: 7 }).variant, undefined)
    assert.equal(hydrateLayerA({ model: 7 }).model, undefined)
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
  it("always-on keys ride; document-local keys NEVER ride; dead vocabulary never rides", () => {
    const out = serializeLayerA(hydrateLayerA(undefined))
    assert.equal(out["seed"], 42)
    assert.equal(out["sla_protect_audio"], true)
    // preset/fps are document-local — never serialized
    assert.ok(!("preset" in out))
    assert.ok(!("fps" in out))
    // the py-era dead vocabulary never rides
    for (const dead of ["audio_mode", "continuity", "h3_attention", "h3_fp16_accumulation",
                        "h3_torch_compile", "cfg", "h3_context_steps", "h3_audio_context_steps",
                        "sampler", "scheduler", "sampling_steps", "lora_name", "lora_strength",
                        "crf", "rtx_vsr_enabled", "rtx_vsr_multiplier", "rtx_vsr_quality",
                        "h3_ref_images", "h3_ref_videos", "h3_ref_audios"]) {
      assert.ok(!(dead in out), `${dead} must never serialize`)
    }
    assert.ok(!("sampler_name" in out))
    assert.ok(!("denoise" in out))
    assert.ok(!("audio_clips" in out))
    assert.ok(!("loras" in out))
  })

  it("set optionals ride at their wire names (the full loop vocabulary)", () => {
    const out = serializeLayerA(hydrateLayerA({
      shift_video: 12, shift_audio: 3, sampler_name: "euler", sched_name: "simple",
      steps: 20, denoise: 0.8, width: 768, height: 448,
      audio_stem: "theme",
      sla_sparsity: 0.9, sla_block_size: "64",
      sla_min_seq_len: 64, sla_dense_last_steps: 4,
      sla_reference_protection: "Light", sla_dense_backend: "pytorch",
      sla_dense_steps: "1-3", sharpen_method: "rcas", sharpen_strength: 0.5,
      interp_model: "rife47.pth", interp_multiplier: 2,
      ref_image_size: "match", model: "h3-timeline-ref",
    }))
    for (const k of ["shift_video", "sampler_name", "sched_name", "steps", "denoise", "width", "height",
      "audio_stem", "sla_block_size", "sharpen_method",
      "interp_model", "ref_image_size", "model"]) {
      assert.ok(k in out, `${k} rides when set`)
    }
  })

  it("clips ride only when present; the loras bag rides only when non-empty", () => {
    const good = { id: "c1", name: "n", src: "theme", start_frame: 0, dur_frames: 96 }
    const withClips = serializeLayerA({ ...hydrateLayerA(undefined), audio_clips: [good] })
    assert.deepEqual(withClips["audio_clips"], [good])
    const emptyClips = serializeLayerA({ ...hydrateLayerA(undefined), audio_clips: [] })
    assert.ok(!("audio_clips" in emptyClips))
    const bag = serializeLayerA({ ...hydrateLayerA(undefined), loras: [{ id: "h3_lightx2v_turbo", strength: 0.6 }] })
    assert.deepEqual(bag["loras"], [{ id: "h3_lightx2v_turbo", strength: 0.6 }])
    const bagEmpty = serializeLayerA({ ...hydrateLayerA(undefined), loras: [] })
    assert.ok(!("loras" in bagEmpty))
  })

  it("Super-Res rides only when ON (switch + target together)", () => {
    const on = serializeLayerA({ ...hydrateLayerA(undefined), sr_switch: true, sr_resolution: 1440 })
    assert.equal(on["sr_switch"], true)
    assert.equal(on["sr_resolution"], 1440)
    const off = serializeLayerA(hydrateLayerA(undefined))
    assert.ok(!("sr_switch" in off))
    assert.ok(!("sr_resolution" in off))
    // switch off but resolution set: nothing rides (resolution without the switch is dead)
    const stray = serializeLayerA({ ...hydrateLayerA(undefined), sr_resolution: 1440 })
    assert.ok(!("sr_resolution" in stray))
  })
})
