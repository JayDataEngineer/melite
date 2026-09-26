/**
 * docCalls gap rows (2026-09-19) — the sla_block_size enum's full
 * vocabulary ("128" rides, off-vocabulary drops) and the serialize
 * refs spread with a videos-less bundle (the images-only refs arm).
 * Every row asserts hydrated/serialized shapes — never expect(true).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { hydrateCalls, serializeCalls } from "../src/ui/studio/docCalls.ts"

const CALL = { text: "a dolly shot", start_frame: 0, end_frame: 48 }

describe("sla_block_size (the three legal widths)", () => {
  it("128 rides like 32 and 64 (the full legal vocabulary)", () => {
    for (const size of ["32", "64", "128"]) {
      const [c] = hydrateCalls({ calls: [{ ...CALL, knobs: { sla_block_size: size } }] })
      assert.deepEqual(c!.knobs, { sla_block_size: size }, size)
    }
    expect(hydrateCalls({ calls: [{ ...CALL, knobs: { sla_block_size: "128" } }] })[0]!.knobs).toEqual({ sla_block_size: "128" })
  })

  it("an off-vocabulary width drops (never composed)", () => {
    const [c] = hydrateCalls({ calls: [{ ...CALL, knobs: { sla_block_size: "16" } }] })
    assert.ok(!("knobs" in c!), "16 is not a legal SLA block width")
  })
})

describe("call reference aliases", () => {
  it("keeps direct per-call reference lists", () => {
    const [call] = hydrateCalls({
      calls: [{
        ...CALL,
        ref_images: ["still-a", "still-b"],
        ref_audios: "line.flac",
      }],
    })
    assert.deepEqual(call!.refs, { images: "still-a, still-b", audios: "line.flac" })
  })
})

describe("serializeCalls refs (the videos-less bundle)", () => {
  it("an images-only bundle rides without the videos/audios spreads", () => {
    const [c] = serializeCalls([{ ...CALL, refs: { images: "still-a" } }])
    assert.deepEqual(c!.refs, { images: "still-a" })
    expect(c!.refs).toEqual({ images: "still-a" })
  })
})
