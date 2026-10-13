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
import { serializeCalls, hydrateCalls } from "../src/ui/studio/docCalls.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
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
    // card declares must survive — 2 of 26 was a sample, not a wall
    assert.equal(c0.knobs?.steps, 6)
    assert.equal(c0.knobs?.denoise, 0.85)
    assert.equal(c0.knobs?.sampler_name, "euler")
    assert.equal(c0.knobs?.sched_name, "beta")
    assert.equal(c0.knobs?.shift_video, 3.1)
    assert.equal(c0.knobs?.shift_audio, 0.4)
    assert.equal(c0.knobs?.sla_sparsity, 0.9)
    assert.equal(c0.knobs?.sla_min_seq_len, 3)
    assert.equal(c0.knobs?.sla_dense_last_steps, 2)
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
    // matches the starter's shape and useDocState's sentinel holds
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
