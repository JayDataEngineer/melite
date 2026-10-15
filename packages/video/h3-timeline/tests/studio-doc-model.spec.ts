/**
 * docModel — the document vocabulary (BEHAVIORAL).
 *
 * The file is types + vocabulary tables; the ONE executable is
 * stemToClip (legacy audio_stem → a positioned clip at frame 0).
 * This spec pins the conversion law plus the vocabulary invariants
 * the serializers rely on (CALL_KNOB_KEYS ∩ KNOB_ORDER, the option
 * lists, the starter doc, the track table).
 */
import { DEFAULT_SEGMENT_PARAMS } from '@melite/contracts/timelineTypes'
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import {
  CALL_KNOB_KEYS,
  GUIDE_KINDS,
  H3_ENHANCE_SYSTEM,
  KNOB_LABELS,
  LEGACY_KNOB_KEY,
  KNOB_ORDER,
  STARTER_CALLS,
  VIDEO_TIMELINE_TRACKS,
  stemToClip,
  trackColor,
} from "../src/ui/studio/docModel.ts"

describe("stemToClip (legacy stem → positioned clip at frame 0)", () => {
  it("a bare artifact name becomes its own display name", () => {
    const c = stemToClip("theme-song", 24, "fixed-id")
    assert.deepEqual(c, {
      id: "fixed-id",
      name: "theme-song",
      src: "theme-song",
      start_frame: 0,
      dur_frames: 96,
      gain: 1,
    })
  })

  it("a pathed source takes the basename as the display name", () => {
    const c = stemToClip("runs/r1/theme-song", 24, "fixed-id")
    assert.equal(c.name, "theme-song")
    assert.equal(c.src, "runs/r1/theme-song")
  })

  it("duration is 4 seconds of doc frames at the doc fps", () => {
    assert.equal(stemToClip("s", 24, "a").dur_frames, 96)
    assert.equal(stemToClip("s", 30, "a").dur_frames, 120)
    // fps 0 is not a clock: the declared segment fps is the default
    // (the film's own 16), never a hardcoded 24 that stretched every
    // dialogue and sfx slice 1.5x
    assert.equal(stemToClip("s", 0, "a").dur_frames, Math.round(4 * DEFAULT_SEGMENT_PARAMS.fps))
  })

  it("no id = a generated stable-unique id (never empty, never colliding)", () => {
    const a = stemToClip("s", 24)
    const b = stemToClip("s", 24)
    assert.ok(a.id.length > 0)
    assert.ok(!a.id.includes("/"))
    expect(a.id).not.toBe(b.id)
  })

  it("gain is unity, position is frame 0 — the MIX law", () => {
    const c = stemToClip("s", 24, "x")
    assert.equal(c.gain, 1)
    assert.equal(c.start_frame, 0)
  })
})

describe("the vocabulary invariants (what the serializers assume)", () => {
  it("KNOB_ORDER keys all carry labels", () => {
    assert.ok(KNOB_ORDER.length > 0)
    for (const k of KNOB_ORDER) assert.ok(KNOB_LABELS[k], `${k} is labeled`)
    // the wire-name steps rides ONCE (never the py-era sampling_steps twin)
    assert.equal(KNOB_ORDER.filter((k) => k === "steps").length, 1)
    assert.ok(!KNOB_ORDER.includes("sampling_steps" as never))
  })

  it("CALL_KNOB_KEYS admits the card's wire-name vocabulary", () => {
    assert.ok(CALL_KNOB_KEYS.has("steps"))
    assert.ok(CALL_KNOB_KEYS.has("denoise"))
    assert.ok(CALL_KNOB_KEYS.has("sampler_name"))
    assert.ok(CALL_KNOB_KEYS.has("sched_name"))
    assert.ok(CALL_KNOB_KEYS.has("interp_model"))
    assert.ok(CALL_KNOB_KEYS.has("interp_multiplier"))
    assert.ok(CALL_KNOB_KEYS.has("length"))
    // recipe-level / retired / py-era keys are NOT per-call vocabulary
    assert.ok(!CALL_KNOB_KEYS.has("h3_attention"))
    assert.ok(!CALL_KNOB_KEYS.has("h3_fp16_accumulation"))
    assert.ok(!CALL_KNOB_KEYS.has("sampling_steps"))
    assert.ok(!CALL_KNOB_KEYS.has("sampler"))
    assert.ok(!CALL_KNOB_KEYS.has("scheduler"))
    assert.ok(!CALL_KNOB_KEYS.has("interpolate_model"))
  })

  it("LEGACY_KNOB_KEY migrates every py-era spelling to a wire name", () => {
    for (const wire of Object.values(LEGACY_KNOB_KEY)) {
      assert.ok(CALL_KNOB_KEYS.has(wire) || wire === "steps", `${wire} must be live vocabulary`)
    }
    assert.equal(LEGACY_KNOB_KEY.sampling_steps, "steps")
    assert.equal(LEGACY_KNOB_KEY.h3_sla_sparsity, "sla_sparsity")
    assert.equal(LEGACY_KNOB_KEY.interpolate_multiplier, "interp_multiplier")
  })

  it("the enhance system pins ONE-shot H3 JSON output", () => {
    assert.ok(H3_ENHANCE_SYSTEM.includes("MiniMax H3"))
    assert.ok(H3_ENHANCE_SYSTEM.includes("positive"))
  })

  it("the track table keeps the strip's ONE lane decl; the guide kinds are the call's, not lanes", () => {
    // (re-pin 2026-11-06) the clip/audio LANE decls are dead — the
    // audio lanes ride the bar's D-M-E rows and the clip/audio
    // guides ride the call cards (GuideSlot). The strip's own track
    // table is the IMAGE lane alone; GUIDE_KINDS stays the call's
    // three guide sources (a card grammar, never lane decls).
    assert.deepEqual([...GUIDE_KINDS], ["image", "clip", "audio"])
    assert.deepEqual(VIDEO_TIMELINE_TRACKS.map((t) => t.uuid), ["image"])
    for (const t of VIDEO_TIMELINE_TRACKS) {
      assert.ok(Array.isArray(t.color) && t.color.length === 3)
    }
  })

  it("the starter is ONE 90-frame window (the t4_open physics budget) with a real prompt", () => {
    assert.equal(STARTER_CALLS.length, 1)
    assert.equal(STARTER_CALLS[0]!.start_frame, 0)
    assert.equal(STARTER_CALLS[0]!.end_frame, 90) // the physics budget: the canvas IS the film (2026-09-17)
    assert.ok((STARTER_CALLS[0]!.text ?? "").trim().length > 0)
    expect(STARTER_CALLS[0]!.end_frame - STARTER_CALLS[0]!.start_frame).toBe(90)
  })

  it("trackColor renders a color's rgb() and a colorless track's neutral-gray fallback (the caller never guards)", () => {
    assert.equal(trackColor({ color: [255, 0, 0] }), "rgb(255, 0, 0)")
    assert.equal(trackColor({ color: null }), "rgb(128, 128, 128)")
  })
})
