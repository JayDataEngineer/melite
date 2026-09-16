/**
 * docModel — the document vocabulary (BEHAVIORAL).
 *
 * The file is types + vocabulary tables; the ONE executable is
 * stemToClip (legacy audio_stem → a positioned clip at frame 0).
 * This spec pins the conversion law plus the vocabulary invariants
 * the serializers rely on (CALL_KNOB_KEYS ∩ KNOB_ORDER, the option
 * lists, the starter doc, the track table).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import {
  AUDIO_MODES,
  CALL_KNOB_KEYS,
  GUIDE_KINDS,
  H3_ENHANCE_SYSTEM,
  KIND_OF_TRACK,
  KNOB_LABELS,
  KNOB_ORDER,
  SAMPLER_OPTIONS,
  SCHEDULER_OPTIONS,
  SPEED_LORA_OPTIONS,
  STARTER_CALLS,
  VIDEO_TIMELINE_TRACKS,
  stemToClip,
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
    assert.equal(stemToClip("s", 0, "a").dur_frames, 96)
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
    // the canonical pair rides once (never two fighting siblings)
    assert.equal(KNOB_ORDER.filter((k) => k === "sampling_steps").length, 1)
  })

  it("CALL_KNOB_KEYS admits the per-call vocabulary (steps rides as sampling_steps)", () => {
    assert.ok(CALL_KNOB_KEYS.has("sampling_steps"))
    assert.ok(CALL_KNOB_KEYS.has("steps"))
    assert.ok(CALL_KNOB_KEYS.has("denoise"))
    assert.ok(CALL_KNOB_KEYS.has("interpolate_model"))
    // recipe-level / retired keys are NOT per-call vocabulary
    assert.ok(!CALL_KNOB_KEYS.has("h3_attention"))
    assert.ok(!CALL_KNOB_KEYS.has("h3_fp16_accumulation"))
  })

  it("the engine option lists are non-empty", () => {
    assert.ok(SAMPLER_OPTIONS.includes("euler"))
    assert.ok(SCHEDULER_OPTIONS.includes("simple"))
    assert.ok(SPEED_LORA_OPTIONS.length >= 1)
    assert.ok(SPEED_LORA_OPTIONS.every((o) => o.value && o.label))
  })

  it("audio modes are the three the run door reads", () => {
    assert.deepEqual([...AUDIO_MODES], ["none", "native", "lipSync"])
  })

  it("the enhance system pins ONE-shot H3 JSON output", () => {
    assert.ok(H3_ENHANCE_SYSTEM.includes("MiniMax H3"))
    assert.ok(H3_ENHANCE_SYSTEM.includes("positive"))
  })

  it("guide kinds and the track table agree (lane order = panel order)", () => {
    assert.deepEqual([...GUIDE_KINDS], ["image", "clip", "audio"])
    assert.deepEqual(VIDEO_TIMELINE_TRACKS.map((t) => t.uuid), ["image", "clip", "audio"])
    for (const t of VIDEO_TIMELINE_TRACKS) {
      assert.equal(KIND_OF_TRACK[t.uuid], t.uuid)
      assert.ok(Array.isArray(t.color) && t.color.length === 3)
    }
  })

  it("the starter is ONE 168-frame window with a real prompt", () => {
    assert.equal(STARTER_CALLS.length, 1)
    assert.equal(STARTER_CALLS[0]!.start_frame, 0)
    assert.equal(STARTER_CALLS[0]!.end_frame, 168)
    assert.ok((STARTER_CALLS[0]!.text ?? "").trim().length > 0)
    expect(STARTER_CALLS[0]!.end_frame - STARTER_CALLS[0]!.start_frame).toBe(168)
  })
})
