/**
 * refUtils — the studio's genre + ref-list vocabulary (BEHAVIORAL).
 *
 * PINS:
 *  - refGenreOf: estate window-name patterns (films vs stills), url
 *    extensions, query-string stripping, the "other" fallthrough.
 *  - splitRefList: comma lists WITHOUT shredding data: URLs (the
 *    mime-separator comma survives, later commas end the token).
 *  - artifactThumbNote + REF_UPLOAD_SPEC shapes.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import {
  REF_UPLOAD_SPEC,
  artifactThumbNote,
  declaredShortName,
} from "../src/ui/studio/refUtils.ts"
import {
  mergeDeclaredRefs,
  normalizeDeclaredRefs,
  refGenreOf,
  splitRefList,
} from '@melite/models-h3/timelineContract'

describe("refGenreOf (genre-typed ref buckets)", () => {
  it("window renders are films — *_main and the final cut class video", () => {
    assert.equal(refGenreOf("video_w1_main", "https://x/clip.mp4"), "video")
    assert.equal(refGenreOf("video_w12_main"), "video")
    assert.equal(refGenreOf("video", "https://x/final.mp4"), "video")
  })

  it("window stills are images — *_last_frame and *_prev seam stills", () => {
    assert.equal(refGenreOf("video_w1_last_frame"), "image")
    assert.equal(refGenreOf("video_w3_prev"), "image")
    assert.equal(refGenreOf("VIDEO_W2_PREV_SEAM", "https://x/s.png"), "image")
  })

  it("estate names without extensions classify WITHOUT the url (the 2026-09-02 audit)", () => {
    // video_w1_main carries no extension — still a film, url or not.
    assert.equal(refGenreOf("video_w1_main"), "video")
    assert.equal(refGenreOf("video_w1_last_frame"), "image")
  })

  it("plain names classify by the url extension (served urls carry real ones)", () => {
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.png"), "image")
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.JPG"), "image")
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.webp"), "image")
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.gif"), "image")
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.bmp"), "image")
    assert.equal(refGenreOf("still-a", "https://cdn/x/a.avif"), "image")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.mp4"), "video")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.webm"), "video")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.mov"), "video")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.mkv"), "video")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.avi"), "video")
    assert.equal(refGenreOf("clip-a", "https://cdn/x/a.m4v"), "video")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.mp3"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.wav"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.flac"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.ogg"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.m4a"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.aac"), "audio")
    assert.equal(refGenreOf("stem-a", "https://cdn/x/a.opus"), "audio")
  })

  it("query strings strip before extension sniffing", () => {
    assert.equal(refGenreOf("n", "https://cdn/x/a.png?token=abc&e=1"), "image")
    assert.equal(refGenreOf("n", "https://cdn/x/a.mp4?x=1"), "video")
  })

  it("the name itself can carry the extension (no url at all)", () => {
    assert.equal(refGenreOf("photo.jpeg"), "image")
    assert.equal(refGenreOf("take.mov"), "video")
    assert.equal(refGenreOf("voice.wav"), "audio")
  })

  it("unknown kinds are other (never a wrong bucket)", () => {
    assert.equal(refGenreOf("notes", "https://cdn/x/notes.txt"), "other")
    assert.equal(refGenreOf("notes"), "other")
    assert.equal(refGenreOf(""), "other")
  })
})

describe("splitRefList (data:-aware comma split)", () => {
  it("empty/undefined is no chips", () => {
    assert.deepEqual(splitRefList(undefined), [])
    assert.deepEqual(splitRefList(""), [])
    assert.deepEqual(splitRefList("   "), [])
  })

  it("plain comma lists split + trim + drop empties", () => {
    assert.deepEqual(splitRefList("a, b ,c"), ["a", "b", "c"])
    assert.deepEqual(splitRefList("a,,b"), ["a", "b"])
    assert.deepEqual(splitRefList("  solo  "), ["solo"])
  })

  it("tabs count as separators alongside commas and spaces", () => {
    assert.deepEqual(splitRefList("a,\tb"), ["a", "b"])
  })

  it("an inline upload survives: the mime comma is not a separator", () => {
    const data = "data:image/png;base64,iVBORw0KGgo="
    assert.deepEqual(splitRefList(data), [data])
  })

  it("uploads mix with names — later commas DO end the token", () => {
    const data = "data:image/png;base64,iVBORw0KGgo="
    assert.deepEqual(splitRefList(`${data}, still-b`), [data, "still-b"])
    assert.deepEqual(splitRefList(`still-a, ${data} , still-b`), ["still-a", data, "still-b"])
  })

  it("trailing separators never emit a ghost chip", () => {
    assert.deepEqual(splitRefList("a, "), ["a"])
    assert.deepEqual(splitRefList("a,"), ["a"])
  })

  it("uses expect at least once (the harness precedent)", () => {
    expect(splitRefList("x")).toEqual(["x"])
  })
})

describe("upload spec + thumb note", () => {
  it("every genre has an accept, a cap, and a note", () => {
    assert.equal(REF_UPLOAD_SPEC.image.accept, "image/*")
    assert.equal(REF_UPLOAD_SPEC.image.maxMb, 20)
    assert.equal(REF_UPLOAD_SPEC.video.accept, "video/*")
    assert.equal(REF_UPLOAD_SPEC.video.maxMb, 24)
    assert.equal(REF_UPLOAD_SPEC.audio.accept, "audio/*")
    assert.equal(REF_UPLOAD_SPEC.audio.maxMb, 16)
    for (const g of ["image", "video", "audio"] as const) {
      assert.ok(REF_UPLOAD_SPEC[g].note.length > 0, `${g} carries a hover note`)
    }
  })

  it("the chip hover names the artifact (unknown names flagged by being named)", () => {
    assert.equal(artifactThumbNote("video_w1_main"), "artifact: video_w1_main")
  })
})

describe("the declared surface (2026-09-23 — the bundle shows what the compose merges)", () => {
  it("normalizeDeclaredRefs: arrays pass, comma strings split, junk absents", () => {
    assert.deepEqual(normalizeDeclaredRefs(["a.png", "", "  ", "b.png"]), ["a.png", "b.png"])
    assert.deepEqual(normalizeDeclaredRefs("a.png, b.png"), ["a.png", "b.png"])
    assert.deepEqual(normalizeDeclaredRefs(undefined), [])
    assert.deepEqual(normalizeDeclaredRefs(null), [])
    assert.deepEqual(normalizeDeclaredRefs(42), [])
  })

  it("mergeDeclaredRefs: declared PRIMARY first, per-call appended deduped (the compose twin)", () => {
    assert.deepEqual(mergeDeclaredRefs(["d1", "d2"], ["p1", "d1", "p2"]), ["d1", "d2", "p1", "p2"])
    assert.deepEqual(mergeDeclaredRefs([], ["p1"]), ["p1"])
    assert.deepEqual(mergeDeclaredRefs(["d1"], []), ["d1"])
  })

  it("declaredShortName: last path segment shows, the full URL rides the title", () => {
    assert.equal(declaredShortName("/melite-media/runs/run-x/edit/SaveImage.0_edit_00001_.png"), "SaveImage.0_edit_00001_.png")
    assert.equal(declaredShortName("https://u/a.png?v=2"), "a.png")
    assert.equal(declaredShortName("https://u/?v=2"), "https://u/?v=2")
    assert.equal(declaredShortName(""), "")
  })
})
