/**
 * hydrateAudioClips' DROP SPEECH (E7 — keyframes-audio plan row 89).
 *
 * THE LAW: every dropped audio_clips row names itself, at its index —
 * the non-object row, the parse-rejected row, and the parser's one
 * formerly-silent skip (the CONTENTLESS row: src-less, no
 * position/identity marker). A row the saved doc carried must never
 * leave the timeline without its name; and each drop must be REAL
 * (the row never reaches the doc state). Sibling suite:
 * studio-doc-hydrate.spec.ts owns the HIGH-4 round-trip arms; this
 * wall owns the speech law itself.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

/** Capture the hydrate's voice without touching the sibling suite's
 *  shape (the manual swap it already rides). */
function captureVoice(): { warns: string[]; restore: () => void } {
  const warns: string[] = []
  const origWarn = console.warn
  console.warn = (...a: unknown[]) => { warns.push(a.join(" ")) }
  return { warns, restore: () => { console.warn = origWarn } }
}

describe("hydrateLayerA audio_clips drop speech (E7, row 89 — every dropped row names itself)", () => {
  it("the CONTENTLESS row — the parser's silent skip — drops AND names itself at its index", () => {
    const { warns, restore } = captureVoice()
    try {
      const doc = hydrateLayerA({
        audio_clips: [
          { src: "/a/x.flac", start_frame: 0, dur_frames: 24 },
          {},
        ],
      })
      // the drop is REAL: the kept row survives whole, the empty row
      // is gone
      expect(doc.audio_clips).toEqual([
        { id: "aclip-0", name: "x.flac", src: "/a/x.flac", start_frame: 0, dur_frames: 24 },
      ])
      // the drop SPEAKS: index + the row's own verdict
      assert.equal(warns.length, 1)
      assert.match(warns[0]!, /audio_clips\[1\] carries no src and no position — not a clip row; dropped/)
      // the kept row rides the serializer untouched (the drop never
      // disturbs the survivors)
      const out = serializeLayerA(doc).audio_clips as Array<Record<string, unknown>>
      assert.equal(out.length, 1)
      assert.equal(out[0]!["src"], "/a/x.flac")
    } finally {
      restore()
    }
  })

  it("a junk object with no clip meaning drops under the same voice — alone, the lane is honestly absent", () => {
    const { warns, restore } = captureVoice()
    try {
      const doc = hydrateLayerA({ audio_clips: [{ note: "not a clip" }] })
      assert.equal(doc.audio_clips, undefined)
      assert.equal(warns.length, 1)
      assert.match(warns[0]!, /audio_clips\[0\] carries no src and no position/)
    } finally {
      restore()
    }
  })

  it("the THREE drop voices are all named, each with its own index — no silent arm among named siblings", () => {
    const { warns, restore } = captureVoice()
    try {
      const doc = hydrateLayerA({
        audio_clips: [
          null,
          {},
          { src: "", start_frame: 3, dur_frames: 24 },
        ],
      })
      assert.equal(doc.audio_clips, undefined)
      assert.equal(warns.length, 3)
      assert.match(warns[0]!, /audio_clips\[0\] is not a clip row/)
      assert.match(warns[1]!, /audio_clips\[1\] carries no src and no position/)
      assert.match(warns[2]!, /audio_clips\[2\] failed to hydrate \(Error: audio_clips: a positioned clip row has no src/)
      // three DISTINCT voices — the drop-speech asymmetry class (a
      // silent continue beside warning siblings) stays dead
      assert.equal(new Set(warns).size, 3)
    } finally {
      restore()
    }
  })

  it("a clean doc never speaks — the law arms only on real drops", () => {
    const { warns, restore } = captureVoice()
    try {
      const doc = hydrateLayerA({
        audio_clips: [
          { src: "/a/x.flac", start_frame: 0, dur_frames: 24 },
          { src: "data:audio/wav;base64,AA", start_frame: 48, dur_frames: 12, name: "bed" },
        ],
      })
      assert.equal(doc.audio_clips?.length, 2)
      assert.equal(warns.length, 0)
    } finally {
      restore()
    }
  })
})
