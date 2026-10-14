/**
 * THE PERSISTENCE WALL (2026-10-26, the operator's burn: "when I
 * close and reopen, it drops EVERYTHING I did to the card"). The
 * studio's close/reopen ride is serialize→persist→hydrate: every
 * field the studio can author MUST survive the roundtrip through
 * the WIRE FORM (what serializeCalls writes into params.calls) —
 * a field that survives in memory but dies on the wire is the
 * silent drop, green in-state and gone on reopen.
 *
 * This wall judges the roundtrip for EVERY authorable field: text,
 * frames, all three guide kinds, every refs bucket, knobs,
 * transition — per call, multi-call, and the exact live shape from
 * the operator's bench (an inline data: URL riding refs.images).
 */
import { describe, test } from "vitest"
import assert from "node:assert/strict"
import { serializeCalls, hydrateCalls, serializeKeyframes, hydrateKeyframes } from "../src/ui/studio/docCalls.ts"
import type { DocCall, DocKeyframe } from "../src/ui/studio/docModel.ts"
import { STARTER_CALLS } from "../src/ui/studio/docModel.ts"

/** The wire form is lossless iff hydrate(serialize(doc)) === doc
 *  for every authorable field. */
const roundtrip = (doc: DocCall[]): DocCall[] =>
  hydrateCalls({ calls: serializeCalls(doc) })

const full: DocCall[] = [
  {
    text: "a lone figure crosses the ridge at dusk",
    start_frame: 0, end_frame: 39,
    image: "https://u/anchor.png",
    clip: "https://u/clip.mp4",
    audio: "https://u/score.mp3",
    transition: "extend",
    refs: {
      images: "https://u/a.png, data:image/png;base64,AAA",
      videos: "https://u/v.mp4",
      audios: "https://u/s1.mp3, https://u/s2.mp3",
      mods: "/eng/models/refmods/flux_stem.safetensors, wan_csm.safetensors",
    },
    knobs: {
      steps: 6, denoise: 0.85, sampler_name: "euler", sched_name: "beta",
      shift_video: 3.1, shift_audio: 0.4, sla_sparsity: 0.9,
      sla_min_seq_len: 3, sla_dense_last_steps: 2,
      // THE FULL SWEEP (persistence audit hardening, 2026-10-26): all
      // 26 KNOB_ORDER keys — every hydrate branch in docCalls.ts owns
      // an arm now (booleans, the three sla enums, the dense-steps
      // pattern, sharpen/interp lanes, length). A dropped branch reds.
      length: 121, sla_block_size: "64",
      sla_protect_audio: true, sla_stabilize_motion: false,
      sla_disable_fp16_accum: true,
      sla_reference_protection: "Light", sla_dense_backend: "auto",
      sla_dense_steps: "1-3,5",
      sharpen_enabled: true, sharpen_method: "rcas",
      sharpen_strength: 0.5, sharpen_radius: 2,
      sharpen_threshold: 0.1, sharpen_iterations: 3,
      interpolate_enabled: true, interp_model: "rife47.pth",
      interp_multiplier: 2,
    },
  },
  {
    text: "second shot, cut hard",
    start_frame: 39, end_frame: 90,
    transition: "cut",
  },
]

describe("the persistence roundtrip (close/reopen never drops a field)", () => {
  test("every authorable field survives the wire form", () => {
    const back = roundtrip(full)
    assert.equal(back.length, 2)
    const c0 = back[0]
    assert.equal(c0.text, full[0].text)
    assert.equal(c0.start_frame, 0)
    assert.equal(c0.end_frame, 39)
    assert.equal(c0.image, "https://u/anchor.png")
    assert.equal(c0.clip, "https://u/clip.mp4")
    assert.equal(c0.audio, "https://u/score.mp3")
    assert.equal(c0.transition, "extend")
    assert.equal(c0.refs?.images, full[0].refs?.images)
    assert.equal(c0.refs?.videos, full[0].refs?.videos)
    assert.equal(c0.refs?.audios, full[0].refs?.audios)
    // THE MODS SEAT (the persistence audit's CRITICAL-1, 2026-10-26):
    // authorable in the studio, read at compose — a dropped seat is
    // "close/reopen, chips gone" for this lane. Two entries, both
    // stems, exact string back.
    assert.equal(c0.refs?.mods, full[0].refs?.mods)
    // THE VOCABULARY SWEEP (MAJOR-1): every numeric/enum knob the
    // card declares must survive — all 26 KNOB_ORDER keys ride the
    // fixture above, one assert per key per hydrate branch
    assert.equal(c0.knobs?.steps, 6)
    assert.equal(c0.knobs?.denoise, 0.85)
    assert.equal(c0.knobs?.sampler_name, "euler")
    assert.equal(c0.knobs?.sched_name, "beta")
    assert.equal(c0.knobs?.shift_video, 3.1)
    assert.equal(c0.knobs?.shift_audio, 0.4)
    assert.equal(c0.knobs?.sla_sparsity, 0.9)
    assert.equal(c0.knobs?.sla_min_seq_len, 3)
    assert.equal(c0.knobs?.sla_dense_last_steps, 2)
    assert.equal(c0.knobs?.length, 121)
    assert.equal(c0.knobs?.sla_block_size, "64")
    assert.equal(c0.knobs?.sla_protect_audio, true)
    assert.equal(c0.knobs?.sla_stabilize_motion, false)
    assert.equal(c0.knobs?.sla_disable_fp16_accum, true)
    assert.equal(c0.knobs?.sla_reference_protection, "Light")
    assert.equal(c0.knobs?.sla_dense_backend, "auto")
    assert.equal(c0.knobs?.sla_dense_steps, "1-3,5")
    assert.equal(c0.knobs?.sharpen_enabled, true)
    assert.equal(c0.knobs?.sharpen_method, "rcas")
    assert.equal(c0.knobs?.sharpen_strength, 0.5)
    assert.equal(c0.knobs?.sharpen_radius, 2)
    assert.equal(c0.knobs?.sharpen_threshold, 0.1)
    assert.equal(c0.knobs?.sharpen_iterations, 3)
    assert.equal(c0.knobs?.interpolate_enabled, true)
    assert.equal(c0.knobs?.interp_model, "rife47.pth")
    assert.equal(c0.knobs?.interp_multiplier, 2)
    assert.equal(back[1].transition, "cut")
  })

  test("the operator's live shape: an inline data: URL in refs.images rides the wire intact", () => {
    const data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOoAAALKCAIA"
    const back = roundtrip([{ text: "t", start_frame: 0, end_frame: 90, refs: { images: data } }])
    assert.equal(back[0].refs?.images, data)
  })

  test("a multi-call plan never collapses to the starter (the string-calls lesson, pinned forever)", () => {
    const back = roundtrip(full)
    assert.equal(back.length, 2)
    assert.equal(back[0].text, full[0].text)
    assert.equal(back[1].text, full[1].text)
  })

  test("a STRING-encoded calls document (the 2026-08-30 wire) parses and never collapses (MAJOR-2: the arm that never sent a string)", () => {
    const wire = JSON.stringify(serializeCalls(full))
    const back = hydrateCalls({ calls: wire })
    assert.equal(back.length, 2)
    assert.equal(back[0].text, full[0].text)
    assert.equal(back[0].refs?.mods, full[0].refs?.mods)
    assert.equal(back[1].transition, "cut")
  })

  test("an UNPARSEABLE array-shaped string is corrupt — the starter is view state, never a write-back (the sentinel)", () => {
    const back = hydrateCalls({ calls: "[{\"text\": \"broken" })
    // the corrupt doc surfaces STARTER_CALLS as VIEW ONLY — the count
    // matches the starter's shape and the corrupt-doc sentinel
    // (corruptCallsField, read by useShownDoc's starter branch) holds
    // the source; nothing here persists over it
    assert.ok(Array.isArray(back))
    assert.equal(back.length, STARTER_CALLS.length)
  })

  test("the wire form itself carries every field (judge the wire, not just the hydrate)", () => {
    const wire = serializeCalls(full)
    const w0 = wire[0] as unknown as Record<string, unknown>
    assert.ok("image" in w0 && w0["image"] === "https://u/anchor.png")
    assert.ok("clip" in w0 && "audio" in w0)
    assert.ok(typeof w0["refs"] === "object" && w0["refs"] !== null)
    const refs = w0["refs"] as Record<string, string>
    assert.ok(refs["images"]!.includes("data:image/png;base64,AAA"))
    assert.ok(refs["mods"]!.includes("flux_stem.safetensors"))
    assert.ok("knobs" in w0)
    const knobs = w0["knobs"] as Record<string, unknown>
    assert.equal(knobs["sampler_name"], "euler")
    assert.equal(knobs["shift_video"], 3.1)
  })
})

// THE KEYFRAMES CHANNEL (the keyframe lane's companion arm, slice 2 —
// 2026-11-05): the pins are a film-level doc channel with its own
// persist doors (the retirement digest's serializeChannel and the
// commit's write door both ride serializeKeyframes; reopen rides
// hydrateKeyframes) — the same close/reopen ride the calls wall
// judges, one channel over. The wire form is lossless iff
// hydrate(serialize(pins)) === pins, sorted by frame (the
// sorted-write law the door itself owns).
describe("the keyframes channel roundtrip (pins never drop on close/reopen)", () => {
  const authored: DocKeyframe[] = [
    { image: "https://u/mid.png", frame: 45 },
    { image: "data:image/png;base64,AA", frame: 0 },
    { image: "https://u/end.png", frame: 89 },
  ]

  test("every pin survives the wire form — image and frame, sorted by frame", () => {
    const back = hydrateKeyframes(serializeKeyframes(authored))
    assert.equal(back.length, 3)
    assert.deepEqual(back.map((k) => k.frame), [0, 45, 89])
    assert.equal(back[0].image, "data:image/png;base64,AA")
    assert.equal(back[1].image, "https://u/mid.png")
    assert.equal(back[2].image, "https://u/end.png")
  })

  test("the wire form itself is vocabulary-only rows in frame order (judge the wire)", () => {
    const wire = serializeKeyframes(authored) as unknown as Array<Record<string, unknown>>
    assert.deepEqual(wire.map((r) => r.frame), [0, 45, 89])
    for (const row of wire) {
      assert.deepEqual(Object.keys(row).sort(), ["frame", "image"],
        "a stale kind/source spelling on the wire is the drop-in-waiting")
    }
  })
})
