/**
 * docCalls — hydrate ⇄ serialize for the call document (BEHAVIORAL).
 *
 * PINS (fakes-not-mocks: plain objects in, deep-equal out):
 *  - hydrateCalls: string-encoded arrays, legacy beats, per-call
 *    segment joining (no word lost), guide/prev-sec/transition/refs
 *    hydration, vocabulary-gated knob hydration, sorting, STARTER
 *    fallbacks, malformed-row skips.
 *  - hydrateKeyframes / hasKnobs / callsToPrompts / keyframesToLanes
 *    / serializeCalls / callIndexOf / kfIndexOf.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  callIndexOf,
  callsToPrompts,
  hasKnobs,
  hydrateCalls,
  hydrateKeyframes,
  keyframesToLanes,
  kfIndexOf,
  serializeCalls,
  serializeKeyframes,
} from "../src/ui/studio/docCalls.ts"
import { STARTER_CALLS } from "../src/ui/studio/docModel.ts"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"

const CALL = { text: "a dolly shot", start_frame: 0, end_frame: 48 }

describe("hydrateCalls (params → document)", () => {
  it("no calls and no beats = the starter (never an empty doc)", () => {
    assert.deepEqual(hydrateCalls({}), STARTER_CALLS)
    assert.deepEqual(hydrateCalls({ calls: [], beats: [] }), STARTER_CALLS)
    assert.deepEqual(hydrateCalls({ calls: "not-json", beats: 42 }), STARTER_CALLS)
  })

  it("the happy lane hydrates verbatim", () => {
    assert.deepEqual(hydrateCalls({ calls: [CALL] }), [CALL])
  })

  it("string-encoded calls parse before the Array check (the 2026-08-30 loss)", () => {
    const raw = JSON.stringify([CALL, { ...CALL, start_frame: 48, end_frame: 96 }])
    const out = hydrateCalls({ calls: raw })
    assert.equal(out.length, 2)
    assert.equal(out[1]!.start_frame, 48)
  })

  it("a string-encoded NON-array falls through to beats, then the starter", () => {
    assert.deepEqual(hydrateCalls({ calls: '{"a":1}', beats: [CALL] }), [CALL])
    assert.deepEqual(hydrateCalls({ calls: '{"a":1}' }), STARTER_CALLS)
  })

  it("unparseable strings fall through (never throw)", () => {
    assert.deepEqual(hydrateCalls({ calls: "[{broken", beats: [CALL] }), [CALL])
    assert.deepEqual(hydrateCalls({ beats: "[{broken" }), STARTER_CALLS)
  })

  it("an array-shaped unparseable string is NAMED, never silently replaced (CRITICAL-1)", () => {
    const errors: string[] = []
    const orig = console.error
    console.error = (...a: unknown[]) => { errors.push(a.join(" ")) }
    try {
      // the corrupt case: starter as VIEW state + one loud crime
      assert.deepEqual(hydrateCalls({ calls: "[{broken" }), STARTER_CALLS)
      assert.equal(errors.length, 1)
      assert.match(errors[0]!, /params\.calls is array-shaped but unparseable/)
      assert.match(errors[0]!, /nothing persists over the corrupt source/)
      errors.length = 0
      // a corrupt beats outranked by healthy calls: still named
      assert.deepEqual(hydrateCalls({ calls: [CALL], beats: "[{broken" }), [CALL])
      assert.equal(errors.length, 1)
      assert.match(errors[0]!, /params\.beats/)
      errors.length = 0
      // a parse-but-non-array STRING ("[object…"-shaped objects are
      // rare; '{"a":1}' never looked like a calls doc) is tolerated
      // foreign, like "not-json" — the crime class is strictly the
      // unparseable array-shaped string. Junk ROWS inside a real
      // array are the separately-pinned malformed-row skip.
      assert.deepEqual(hydrateCalls({ calls: "not-json", beats: 42 }), STARTER_CALLS)
      assert.equal(errors.length, 0)
      // healthy string-encoded arrays never log
      assert.deepEqual(hydrateCalls({ calls: JSON.stringify([CALL]) }), [CALL])
      assert.equal(errors.length, 0)
    } finally {
      console.error = orig
    }
  })

  it("legacy beats map 1:1 when calls are absent", () => {
    assert.deepEqual(hydrateCalls({ beats: [CALL] }), [CALL])
  })

  it("string-encoded beats parse too", () => {
    assert.deepEqual(hydrateCalls({ beats: JSON.stringify([CALL]) }), [CALL])
  })

  it("malformed rows skip — non-objects, bad spans, reversals", () => {
    assert.deepEqual(hydrateCalls({ calls: [null, 42, "x", CALL] }), [CALL])
    assert.deepEqual(
      hydrateCalls({ calls: [{ ...CALL, start_frame: "a" }, { ...CALL, end_frame: NaN }] }),
      STARTER_CALLS,
    )
    assert.deepEqual(hydrateCalls({ calls: [{ ...CALL, start_frame: 10, end_frame: 10 }] }), STARTER_CALLS)
    assert.deepEqual(hydrateCalls({ calls: [{ ...CALL, start_frame: 20, end_frame: 10 }] }), STARTER_CALLS)
  })

  it("fractional spans round (the doc is integer frames)", () => {
    const [c] = hydrateCalls({ calls: [{ ...CALL, start_frame: 0.4, end_frame: 47.6 }] })
    assert.equal(c!.start_frame, 0)
    assert.equal(c!.end_frame, 48)
  })

  it("old per-call beats JOIN into the one prompt (no word lost, one warn)", () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => { warns.push(a) }
    try {
      const [c] = hydrateCalls({
        calls: [{ ...CALL, text: "", beats: [{ text: "  first  " }, { text: "second" }, { nope: 1 }, null, { text: "   " }] }],
      })
      assert.equal(c!.text, "first second")
      assert.equal(warns.length, 1)
    } finally {
      console.warn = orig
    }
  })

  it("empty segment lists leave the text lane alone", () => {
    const [a] = hydrateCalls({ calls: [{ ...CALL, beats: [] }] })
    assert.equal(a!.text, CALL.text)
    const [b] = hydrateCalls({ calls: [{ ...CALL, beats: "nope" }] })
    assert.equal(b!.text, CALL.text)
    // segments that carry no words keep the text field
    const [c] = hydrateCalls({ calls: [{ ...CALL, text: "", beats: [{ nope: 1 }] }] })
    assert.equal(c!.text, "")
    // wordless segments with NO text key at all: nothing to fall back to
    const { text: _t, ...notext } = CALL
    void _t
    const [d] = hydrateCalls({ calls: [{ ...notext, beats: [{ nope: 1 }] }] })
    assert.equal(d!.text, "")
  })

  it("guides hydrate as trimmed non-blank strings only", () => {
    const [c] = hydrateCalls({
      calls: [{ ...CALL, image: "  still-a ", clip: "", audio: "stem-a", bogus: "x" }],
    })
    assert.equal(c!.image, "  still-a ")
    assert.ok(!("clip" in c!))
    assert.equal(c!.audio, "stem-a")
    assert.ok(!("bogus" in c!))
  })

  it("legacy last_frame drops LOUD (never silent loss)", () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => { warns.push(a) }
    try {
      const [c] = hydrateCalls({ calls: [{ ...CALL, last_frame: "still-z" }] })
      assert.ok(!("last_frame" in c!))
      assert.equal(warns.length, 1)
      // blank last_frame = no warn, no key
      warns.length = 0
      hydrateCalls({ calls: [{ ...CALL, last_frame: "   " }] })
      hydrateCalls({ calls: [{ ...CALL, last_frame: 42 }] })
      assert.equal(warns.length, 0)
    } finally {
      console.warn = orig
    }
  })

  it("the retired prev-sec opener never hydrates (dead vocabulary, dropped on read)", () => {
    // (2026-09-20: the seam is automatic — drift control carries
    // every non-cut join; old drafts carrying the field lose it)
    for (const v of [2, 0, -1, NaN, Infinity, "2", null]) {
      assert.ok(!("first_frame_prev_sec" in hydrateCalls({ calls: [{ ...CALL, first_frame_prev_sec: v }] })[0]!))
    }
  })

  it("transition hydrates only the two seam modes", () => {
    assert.equal(hydrateCalls({ calls: [{ ...CALL, transition: "extend" }] })[0]!.transition, "extend")
    assert.equal(hydrateCalls({ calls: [{ ...CALL, transition: "cut" }] })[0]!.transition, "cut")
    assert.ok(!("transition" in hydrateCalls({ calls: [{ ...CALL, transition: "wipe" }] })[0]!))
  })

  it("per-call refs: arrays join, strings trim, empties vanish; video_audios is dead", () => {
    const [c] = hydrateCalls({
      calls: [{ ...CALL, refs: { images: ["a", " b ", ""], videos: "x, y", audios: "" } }],
    })
    assert.deepEqual(c!.refs, { images: "a, b", videos: "x, y" })
    // audios rides the same join law; the legacy video_audios bucket drops
    const [c2] = hydrateCalls({
      calls: [{ ...CALL, refs: { audios: " s1 ", video_audios: ["v1", " v2 "] } }],
    })
    assert.deepEqual(c2!.refs, { audios: "s1" })
    assert.ok(!("refs" in hydrateCalls({ calls: [{ ...CALL, refs: { images: [] } }] })[0]!))
    assert.ok(!("refs" in hydrateCalls({ calls: [{ ...CALL, refs: ["a"] }] })[0]!))
    assert.ok(!("refs" in hydrateCalls({ calls: [{ ...CALL, refs: null }] })[0]!))
    assert.ok(!("refs" in hydrateCalls({ calls: [{ ...CALL }] })[0]!))
  })

  it("foreign knob keys drop with a warning (never re-sent); py-era spellings MIGRATE silently", () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => { warns.push(a) }
    try {
      const [c] = hydrateCalls({ calls: [{ ...CALL, knobs: { sampling_steps: 20, h3_attention: "sla", nope: 1 } }] })
      assert.deepEqual(c!.knobs, { steps: 20 })
      assert.ok(warns.some((w) => String(w[0]).includes("nope")))
      assert.ok(warns.some((w) => String(w[0]).includes("h3_attention")))
    } finally {
      console.warn = orig
    }
  })

  it("null/blank knob values skip (absent = inherit)", () => {
    const [c] = hydrateCalls({
      calls: [{ ...CALL, knobs: { steps: null, denoise: undefined, sampler_name: "" } }],
    })
    assert.ok(!("knobs" in c!))
  })

  it("steps lands at its wire name", () => {
    const [a] = hydrateCalls({ calls: [{ ...CALL, knobs: { steps: "30" } }] })
    assert.deepEqual(a!.knobs, { steps: 30 })
    const [b] = hydrateCalls({ calls: [{ ...CALL, knobs: { steps: "junk" } }] })
    assert.ok(!("knobs" in b!))
  })

  it("length (the per-call window pin) hydrates", () => {
    const [a] = hydrateCalls({ calls: [{ ...CALL, knobs: { length: "77" } }] })
    assert.deepEqual(a!.knobs, { length: 77 })
  })

  it("every number knob hydrates finite values and drops junk", () => {
    const [c] = hydrateCalls({
      calls: [{
        ...CALL,
        knobs: {
          steps: 20, denoise: 0.8, shift_video: "12", shift_audio: 3,
          sla_sparsity: 0.9, sla_min_seq_len: 64, sla_dense_last_steps: 4,
          sharpen_strength: 0.5, sharpen_radius: 2, sharpen_threshold: 0.1,
          sharpen_iterations: 3, interp_multiplier: 2,
        },
      }],
    })
    assert.equal((c!.knobs as Record<string, number>).steps, 20)
    assert.equal((c!.knobs as Record<string, number>).denoise, 0.8)
    assert.equal((c!.knobs as Record<string, number>).interp_multiplier, 2)
    const [d] = hydrateCalls({ calls: [{ ...CALL, knobs: { steps: "junk", cfg: NaN } }] })
    assert.ok(!("knobs" in d!))
  })

  it("string knobs hydrate trimmed values only", () => {
    const [c] = hydrateCalls({ calls: [{ ...CALL, knobs: { sampler_name: "euler", sched_name: "  " } }] })
    assert.deepEqual(c!.knobs, { sampler_name: "euler" })
  })

  it("enum knobs hydrate only legal members", () => {
    const [c] = hydrateCalls({
      calls: [{
        ...CALL,
        knobs: {
          sla_block_size: "64", sla_reference_protection: "Heavy Enforcement",
          sla_dense_backend: "pytorch", sharpen_method: "rcas", interp_model: "rife47.pth",
        },
      }],
    })
    assert.equal(c!.knobs!.sla_block_size, "64")
    const [d] = hydrateCalls({
      calls: [{ ...CALL, knobs: { sla_reference_protection: "max", sla_dense_backend: "x", sharpen_method: "x", interp_model: "x" } }],
    })
    assert.ok(!("knobs" in d!))
    // "32" is a legal wire value — the per-call hydrate admits the
    // full enum (the knob override law; Layer A owns only defaults)
    const [e] = hydrateCalls({ calls: [{ ...CALL, knobs: { sla_block_size: "32" } }] })
    assert.equal(e!.knobs!.sla_block_size, "32")
  })

  it("dense-steps hydrate only interval-list strings", () => {
    const [c] = hydrateCalls({ calls: [{ ...CALL, knobs: { sla_dense_steps: " 1-3,5 " } }] })
    assert.equal(c!.knobs!.sla_dense_steps, "1-3,5")
    const [d] = hydrateCalls({ calls: [{ ...CALL, knobs: { sla_dense_steps: "soon" } }] })
    assert.ok(!("knobs" in d!))
  })

  it("boolean knobs ride booleans and their stringified forms", () => {
    const [c] = hydrateCalls({
      calls: [{
        ...CALL,
        knobs: {
          sla_protect_audio: "false", sla_stabilize_motion: false,
          sla_disable_fp16_accum: "yes", sharpen_enabled: 1, interpolate_enabled: true,
        },
      }],
    })
    assert.equal(c!.knobs!.sla_protect_audio, false)
    assert.equal(c!.knobs!.sla_stabilize_motion, false)
    assert.equal(c!.knobs!.interpolate_enabled, true)
    assert.ok(!("sla_disable_fp16_accum" in c!.knobs!))
    assert.ok(!("sharpen_enabled" in c!.knobs!))
  })

  it("boolean true-forms hydrate (true + \"true\")", () => {
    const [c] = hydrateCalls({
      calls: [{ ...CALL, knobs: { sla_protect_audio: true, sharpen_enabled: "true", sla_disable_fp16_accum: true } }],
    })
    assert.equal(c!.knobs!.sla_protect_audio, true)
    assert.equal(c!.knobs!.sharpen_enabled, true)
    assert.equal(c!.knobs!.sla_disable_fp16_accum, true)
  })

  it("calls sort by start (the compiler's vocabulary) without re-tiling", () => {
    const b = { ...CALL, text: "b", start_frame: 48, end_frame: 96 }
    const out = hydrateCalls({ calls: [b, CALL] })
    assert.deepEqual(out.map((c) => c.text), ["a dolly shot", "b"])
  })

  it("uses expect at least once", () => {
    expect(hydrateCalls({})).toEqual(STARTER_CALLS)
  })
})

describe("hydrateKeyframes (the pin channel: {image, frame})", () => {
  it("non-arrays are no keyframes", () => {
    assert.deepEqual(hydrateKeyframes(undefined), [])
    assert.deepEqual(hydrateKeyframes({}), [])
  })

  it("rows hydrate to pins with rounded frames; junk rows skip", () => {
    assert.deepEqual(
      hydrateKeyframes([
        { image: "a", frame: 10.6 },
        { image: "b", frame: NaN },
        null,
        42,
        { image: "c" }, // no frame — not a pin
        { frame: 7 },
      ]),
      [
        { image: "", frame: 7 },
        { image: "a", frame: 11 },
      ],
    )
  })

  it("HYDRATION BOTH WAYS: hydrate → serialize round-trips the pin verbatim", () => {
    const doc = hydrateKeyframes([{ image: "refs/anchor.png", frame: 24 }])
    assert.deepEqual(serializeKeyframes(doc), [{ image: "refs/anchor.png", frame: 24 }])
  })

  it("LEGACY MIGRATION: kinded rows ride source→image; clip/audio rows drop LOUD, never silent", () => {
    const warns: string[] = []
    const orig = console.warn
    console.warn = (m: string) => { warns.push(m) }
    try {
      assert.deepEqual(
        hydrateKeyframes([
          { frame: 5, kind: "image", source: "still-a" }, // the legacy image pin migrates
          { frame: 9, source: "bare-source" },            // kind-absent rows read as image
          { frame: 12, kind: "clip", source: "clip.mov" }, // no pin home — named, dropped
          { frame: 15, kind: "audio", source: "" },
        ]),
        [
          { image: "still-a", frame: 5 },
          { image: "bare-source", frame: 9 },
        ],
      )
    } finally {
      console.warn = orig
    }
    assert.equal(warns.length, 2, "each dropped clip/audio row names its loss")
    assert.match(warns[0]!, /kind "clip".*dropped/)
    assert.match(warns[1]!, /kind "audio".*dropped/)
  })

  it("the pin vocabulary sorts by frame at hydration (the plan vocabulary, like the calls)", () => {
    assert.deepEqual(
      hydrateKeyframes([{ image: "late", frame: 90 }, { image: "early", frame: 3 }]),
      [{ image: "early", frame: 3 }, { image: "late", frame: 90 }],
    )
  })
})

describe("serializeKeyframes (the sorted-write law)", () => {
  it("the write sorts by frame and carries vocabulary-only rows", () => {
    assert.deepEqual(
      serializeKeyframes([
        { image: "late", frame: 90 },
        { image: "early", frame: 3 },
        { image: "mid", frame: 30 },
      ]),
      [
        { image: "early", frame: 3 },
        { image: "mid", frame: 30 },
        { image: "late", frame: 90 },
      ],
    )
  })

  it("the write never re-orders equal frames (stable — insertion order holds)", () => {
    assert.deepEqual(
      serializeKeyframes([
        { image: "first", frame: 30 },
        { image: "second", frame: 30 },
      ]),
      [
        { image: "first", frame: 30 },
        { image: "second", frame: 30 },
      ],
    )
  })
})

describe("hasKnobs / callsToPrompts / keyframesToLanes", () => {
  it("hasKnobs is true only for a non-empty dict", () => {
    assert.equal(hasKnobs({ ...CALL }), false)
    assert.equal(hasKnobs({ ...CALL, knobs: {} }), false)
    assert.equal(hasKnobs({ ...CALL, knobs: { denoise: 0.5 } }), true)
  })

  it("callsToPrompts: the bar vocabulary (inclusive end, index uuids)", () => {
    const [p] = callsToPrompts([{ ...CALL, knobs: { denoise: 0.5 }, audio: "stem" }], 24)
    assert.equal(p!.uuid, "call-0")
    assert.equal(p!.start_frame, 0)
    assert.equal(p!.end_frame, 47)
    assert.equal(p!.override, true)
    assert.equal(p!.audio, true)
    assert.ok(p!.text.startsWith("C1 · 2.0s — "))
  })

  it("callsToPrompts: missing text, no audio, ref-image counting, seam glyph", () => {
    const ps = callsToPrompts([
      { start_frame: 0, end_frame: 24, image: "still-a", refs: { images: "x, y" }, transition: "extend" },
      { start_frame: 24, end_frame: 48, audio: "  " },
    ], 24)
    assert.equal(ps[0]!.audio, false)
    assert.equal(ps[0]!.refImages, 3)
    assert.equal(ps[0]!.seam, "extend")
    assert.equal(ps[1]!.refImages, 0)
    // ABSENT = EXTEND (operator catch d, ledger xiv: only an explicit
    // "cut" reads as a cut — the glyph never disagrees with the card's
    // spanOverlap law). This arm held the pre-catch "cut" and failed
    // at HEAD until the catch reached it.
    assert.equal(ps[1]!.seam, "extend")
    assert.ok(ps[1]!.text.includes("C2"))
  })

  it("callsToPrompts: zero fps never divides by zero", () => {
    const [p] = callsToPrompts([{ ...CALL }], 0)
    assert.ok(p!.text.includes("C1"))
  })

  it("keyframesToLanes: flat diamonds on the image track, negatives clamp to 0", () => {
    assert.deepEqual(keyframesToLanes([
      { image: "x", frame: -5 },
      { image: "", frame: 9 },
    ]), [
      { uuid: "kf-0", track_id: "image", frame: 0, value: null },
      { uuid: "kf-1", track_id: "image", frame: 9, value: null },
    ])
  })

  it("keyframesToLanes: a displayable source rides the chip thumb; a bare NAME never does (slice 3)", () => {
    const lanes = keyframesToLanes([
      { image: "data:image/png;base64,AA", frame: 5 },
      { image: "https://u/pic.png", frame: 6 },
      { image: "/assets/runs/r1/face.png", frame: 7 },
      { image: "own_out", frame: 8 },
    ])
    // the SHARED isImageUrl rule (data:image/blob, http(s)/root-relative
    // + extension); the bare artifact name stays absent HERE —
    // useDerivedView resolves names through the index, and an
    // unresolvable name leaves the diamond-only chip.
    assert.equal(lanes[0]!.thumbUrl, "data:image/png;base64,AA")
    assert.equal(lanes[1]!.thumbUrl, "https://u/pic.png")
    assert.equal(lanes[2]!.thumbUrl, "/assets/runs/r1/face.png")
    assert.ok(!("thumbUrl" in lanes[3]!), "a bare name is not a displayable URL")
    // the diamond shape is otherwise untouched
    assert.deepEqual(lanes[3], { uuid: "kf-3", track_id: "image", frame: 8, value: null })
  })

  it("callsToPrompts: the clip header IS the dictionary's clipHeader (F-B1)", () => {
    // byte-parity with the seeded dict key — the format face has ONE
    // home; the wall's census arm sees the consumption in docCalls.
    assert.equal(studioCopy.clipHeader(0, "2.0", "x"), "C1 · 2.0s — x")
    const [p] = callsToPrompts([{ text: "x", start_frame: 0, end_frame: 48 }], 24)
    assert.equal(p!.text, studioCopy.clipHeader(0, "2.0", "x"))
  })

  it("F-B1 — the consumption seat: docCalls routes the header through the dict call", () => {
    // (2026-11-05) the byte-parity arm above cannot distinguish a
    // byte-identical revert, and the census's id regex counts `: "`
    // strings — parameterized dict functions sit outside it by
    // construction. This arm is the consumption judge: the mapper's
    // source must CALL the dict seat at the header site.
    const src = readFileSync(resolve(import.meta.dirname, "../src/ui/studio/docCalls.ts"), "utf8")
    assert.ok(src.includes("studioCopy.clipHeader("), "the clip-header format face regressed to a literal — consume studioCopy.clipHeader at the callsToPrompts seat")
  })
})

describe("serializeCalls (document → persisted shape)", () => {
  it("the happy lane round-trips; undefined text becomes empty", () => {
    assert.deepEqual(serializeCalls([{ start_frame: 0, end_frame: 8 }]), [
      { text: "", start_frame: 0, end_frame: 8 },
    ])
  })

  it("blank guides never ride (blank = none)", () => {
    const [c] = serializeCalls([{ ...CALL, image: "  ", clip: "clip-a", audio: "" }])
    assert.equal(c!.clip, "clip-a")
    assert.ok(!("image" in c!))
    assert.ok(!("audio" in c!))
  })

  it("transition rides only when set; prev-sec never serializes (retired)", () => {
    const [a] = serializeCalls([{ ...CALL, transition: "cut" }])
    assert.equal(a!.transition, "cut")
    const [b] = serializeCalls([{ ...CALL, transition: "wipe" as never }])
    assert.ok(!("transition" in b!))
    assert.ok(!("first_frame_prev_sec" in b!))
  })

  it("per-call refs serialize as the COMMA STRING — all three buckets", () => {
    const [c] = serializeCalls([{ ...CALL, refs: { images: "a, b", videos: "v1, v2", audios: "s1" } }])
    assert.deepEqual(c!.refs, { images: "a, b", videos: "v1, v2", audios: "s1" })
    // blank buckets vanish (never "" noise)
    const [d] = serializeCalls([{ ...CALL, refs: { videos: "v", images: "  " } }])
    assert.deepEqual(d!.refs, { videos: "v" })
    const [e] = serializeCalls([{ ...CALL, refs: { images: "  " } }])
    assert.ok(!("refs" in e!))
    const [f] = serializeCalls([{ ...CALL }])
    assert.ok(!("refs" in f!))
  })

  it("knobs ride verbatim only when non-empty", () => {
    const knobs = { denoise: 0.5 }
    const [c] = serializeCalls([{ ...CALL, knobs }])
    assert.deepEqual(c!.knobs, { denoise: 0.5 })
    assert.ok(c!.knobs !== knobs, "a copy, not the live dict")
    const [d] = serializeCalls([{ ...CALL, knobs: {} }])
    assert.ok(!("knobs" in d!))
  })
})

describe("callIndexOf / kfIndexOf", () => {
  it("index-derived ids parse; junk is -1", () => {
    assert.equal(callIndexOf("call-3"), 3)
    assert.equal(callIndexOf("call-x"), -1)
    assert.equal(kfIndexOf("kf-2"), 2)
    assert.equal(kfIndexOf("kf-x"), -1)
    expect(callIndexOf("call-0")).toBe(0)
  })
})
