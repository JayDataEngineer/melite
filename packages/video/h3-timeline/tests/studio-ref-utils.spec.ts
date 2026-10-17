/**
 * refUtils — the studio's genre + ref-list vocabulary (BEHAVIORAL).
 *
 * PINS:
 *  - refGenreOf: estate window-name patterns (films vs stills), url
 *    extensions, query-string stripping, the "other" fallthrough.
 *  - splitRefList: comma lists WITHOUT shredding data: URLs (the
 *    mime-separator comma survives, later commas end the token).
 *  - REF_UPLOAD_SPEC shapes.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import {
  REF_UPLOAD_SPEC,
  declaredShortName,
  displaySource,
  estateMediaChip,
  FOREIGN_URL_REFUSAL,
  fitRect,
  fitImageToAspect,
  classifyImageSrc,
  commitKeyframePinImage,
  refitKeyframePinImage,
} from "../src/ui/studio/refUtils.ts"
import {
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
})

describe("the declared surface (2026-09-23 — the bundle shows what the compose merges)", () => {
  it("normalizeDeclaredRefs: arrays pass, comma strings split, junk absents", () => {
    assert.deepEqual(normalizeDeclaredRefs(["a.png", "", "  ", "b.png"]), ["a.png", "b.png"])
    assert.deepEqual(normalizeDeclaredRefs("a.png, b.png"), ["a.png", "b.png"])
    assert.deepEqual(normalizeDeclaredRefs(undefined), [])
    assert.deepEqual(normalizeDeclaredRefs(null), [])
    assert.deepEqual(normalizeDeclaredRefs(42), [])
  })

  it("declaredShortName: last path segment shows, the full URL rides the title", () => {
    assert.equal(declaredShortName("/melite-media/runs/run-x/edit/SaveImage.0_edit_00001_.png"), "SaveImage.0_edit_00001_.png")
    assert.equal(declaredShortName("https://u/a.png?v=2"), "a.png")
    assert.equal(declaredShortName("https://u/?v=2"), "https://u/?v=2")
    assert.equal(declaredShortName(""), "")
  })
})

describe("displaySource (THE ONE DISPLAY SPELLING, 2026-11-04)", () => {
  const nameToUrl = new Map([["a.png", "https://art/a.png"]])

  it("a data: URL passes verbatim — the square renders it", () => {
    assert.equal(displaySource("data:image/png;base64,AAA", nameToUrl), "data:image/png;base64,AAA")
  })

  it("a mapped name translates through the artifact index", () => {
    assert.equal(displaySource("a.png", nameToUrl), "https://art/a.png")
  })

  it("an unmapped value rides raw — the held face carries it, never a null into PLUS", () => {
    assert.equal(displaySource("ghost-name.png", nameToUrl), "ghost-name.png")
    assert.equal(displaySource("ghost-name.png", new Map()), "ghost-name.png")
  })
})

// ── THE ESTATE-MEDIA LAW (operator 2026-11-05: "I CAN'T EVEN USE AN
// IMAGE FROM MEDIA IN THE KEYFRAME" — the estate's own library was
// refusing as foreign at every pick door) ─────────────────────────
describe("estateMediaChip (the estate's own media is never foreign)", () => {
  it("a root-relative run-media path commits in its canonical spelling", () => {
    assert.equal(estateMediaChip("/melite-media/runs/r1/frame.png"), "/melite-media/runs/r1/frame.png")
  })

  it("a browser-absolutized run-media URL (the From-media pick's live shape) strips to the canonical path", () => {
    assert.equal(
      estateMediaChip("http://127.0.0.1:3080/melite-media/runs/r1/frame.png"),
      "/melite-media/runs/r1/frame.png",
    )
  })

  it("a legacy /v1/assets/runs spelling canonicalizes to the live prefix", () => {
    assert.equal(estateMediaChip("/v1/assets/runs/r1/x.jpg"), "/melite-media/runs/r1/x.jpg")
  })

  it("a TRULY foreign URL stays foreign — the M1 law keeps its teeth", () => {
    assert.equal(estateMediaChip("https://example.org/pic.png"), null)
    assert.ok(FOREIGN_URL_REFUSAL.includes("not in this run's artifacts"))
  })

  it("bare names and data: URLs are not this door's currency (they ride their own laws)", () => {
    assert.equal(estateMediaChip("frame_001"), null)
    assert.equal(estateMediaChip("data:image/png;base64,AA"), null)
  })
})

// ── D1 (operator 2026-11-06: "keyframe image insert must shrink-to-fit
// into the movie, never clipped") — the contain math + its rider. ────
describe("fitRect (the D1 contain math — pure, one spelling)", () => {
  it("a wide source letterboxes: height fits, width centers", () => {
    // 2688×768 into 1344×768: scale 0.5 → 1344×384? no — contain by
    // the LIMITING axis: min(1344/2688, 768/768, 1) = 0.5 → 1344×384
    // is wrong arithmetic; 2688×768 × 0.5 = 1344×384... the honest
    // expectation: dw=1344, dh=384, centered dy=(768-384)/2=192
    const r = fitRect(2688, 768, 1344, 768)
    expect(r).toEqual({ dx: 0, dy: 192, dw: 1344, dh: 384 })
  })

  it("a tall source pillarboxes: width fits, height centers", () => {
    const r = fitRect(768, 1536, 1344, 768)
    expect(r).toEqual({ dx: 480, dy: 0, dw: 384, dh: 768 })
  })

  it("a same-aspect SMALLER source never upscales — it centers at native size (the cap at 1)", () => {
    // same aspect 672×384 → 1344×768: the uncapped scale is 2, the
    // cap holds it at 1 — the movie pads, never blows up the source
    const r = fitRect(672, 384, 1344, 768)
    expect(r).toEqual({ dx: 336, dy: 192, dw: 672, dh: 384 })
  })

  it("NEVER upscales: a smaller same-aspect source centers at its own size", () => {
    const r = fitRect(336, 192, 1344, 768)
    expect(r).toEqual({ dx: 504, dy: 288, dw: 336, dh: 192 })
  })

  it("a smaller OFF-aspect source scales down to the limiting axis, never past 1", () => {
    // min(1344/1000, 768/300, 1) = 1 → native size, centered
    const r = fitRect(1000, 300, 1344, 768)
    expect(r).toEqual({ dx: 172, dy: 234, dw: 1000, dh: 300 })
  })
})

describe("fitImageToAspect (the D1 canvas rider)", () => {
  it("THE AUTORIZE SEAM (E7, KF-B — plan row 86): the wall rides the classifyImageSrc→fit seam on the spelling a picker arm actually commits", async () => {
    // THE TWIN-WALL CURE: the old AUTORIZE arm fed the fitter an
    // origin-qualified legacy spelling (`https://estate/v1/assets/
    // runs/pin.png`) that NO picker arm ever commits — the wall stayed
    // green while the seam the operator's gesture crosses could
    // reorder freely. The real arms commit rooted `/melite-media/...`
    // (classifyImageSrc canonicalizes the From-media pick's live
    // browser-absolutized shape) or data:. Both ride the FULL seam
    // here: the judge's canonical commit, then the fit's contain rect.
    const draws: unknown[][] = []
    class StubImg {
      naturalWidth = 2688
      naturalHeight = 768
      crossOrigin = ""
      set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    const origCreate = document.createElement.bind(document)
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const c = {
          width: 0, height: 0,
          getContext: () => ({ drawImage: (...a: unknown[]) => { draws.push(a) } }),
          toDataURL: () => "data:image/png;base64,FITTED",
        }
        return c as unknown as HTMLCanvasElement
      }
      return origCreate(tag)
    })
    try {
      vi.stubGlobal("Image", StubImg as unknown as typeof Image)
      // the judge half: the From-media pick's live shape commits the
      // ROOTED canonical chip — never the origin, never the legacy prefix
      const got = classifyImageSrc("http://127.0.0.1:3080/melite-media/runs/r1/pin.png", new Map())
      expect(got).toEqual({ image: "/melite-media/runs/r1/pin.png" })
      // the fit half: the committed spelling fits like the file arm
      const out = await fitImageToAspect(got.image, 1344, 768)
      expect(out).toBe("data:image/png;base64,FITTED")
      expect(draws.length).toBe(1)
      expect(draws[0]!.slice(1), "the same contain rect as the file arm").toEqual([0, 192, 1344, 384])
      // the whole spine end-to-end on the same pick (the doors' one call)
      draws.length = 0
      await expect(commitKeyframePinImage("http://127.0.0.1:3080/melite-media/runs/r1/pin.png", new Map(), 1344, 768))
        .resolves.toEqual({ image: "data:image/png;base64,FITTED" })
      expect(draws.length).toBe(1)
      // the data: chip arm rides the same seam verdict
      draws.length = 0
      const chip = classifyImageSrc("data:image/png;base64,AA", new Map())
      expect(chip).toEqual({ image: "data:image/png;base64,AA" })
      await expect(commitKeyframePinImage("data:image/png;base64,AA", new Map(), 1344, 768))
        .resolves.toEqual({ image: "data:image/png;base64,FITTED" })
      expect(draws.length).toBe(1)
    } finally {
      spy.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it("a bare artifact name rides verbatim (engine-side resolution — no browser decode)", async () => {
    await expect(fitImageToAspect("shot.png", 1344, 768)).resolves.toBe("shot.png")
  })

  it("a zero target rides verbatim (no aspect truth yet)", async () => {
    await expect(fitImageToAspect("data:image/png;base64,AA", 0, 768)).resolves.toBe("data:image/png;base64,AA")
  })

  it("a source that cannot decode rides verbatim — the fit is a courtesy, never a blocker", async () => {
    // jsdom: Image never fires onload for data: URLs (no decode) —
    // the natural environment IS the refusal arm
    await expect(fitImageToAspect("data:image/png;base64,AA", 1344, 768))
      .resolves.toBe("data:image/png;base64,AA")
  })

  it("an off-aspect source that DECODES draws contain-fit onto the canvas (the shrink-to-fit law)", async () => {
    // a stubbed Image + canvas: the rider's browser face, judged on
    // the recorded drawImage rect (the pure math's own output)
    const draws: unknown[][] = []
    class StubImg {
      naturalWidth = 2688
      naturalHeight = 768
      set src(_v: string) {
        queueMicrotask(() => { this.onload?.() })
      }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    const origImg = globalThis.Image
    const origCreate = document.createElement.bind(document)
    vi.stubGlobal("Image", StubImg as unknown as typeof Image)
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const c = {
          width: 0, height: 0,
          getContext: () => ({ drawImage: (...a: unknown[]) => { draws.push(a) } }),
          toDataURL: () => "data:image/png;base64,FITTED",
        }
        return c as unknown as HTMLCanvasElement
      }
      return origCreate(tag)
    })
    try {
      const out = await fitImageToAspect("data:image/png;base64,AA", 1344, 768)
      expect(out).toBe("data:image/png;base64,FITTED")
      expect(draws.length).toBe(1)
      // the recorded rect IS fitRect(2688,768 → 1344,768)
      expect(draws[0]!.slice(1)).toEqual([0, 192, 1344, 384])
    } finally {
      spy.mockRestore()
      vi.unstubAllGlobals()
      void origImg
    }
  })

  it("a decode FAILURE rejects into the verbatim catch — the reject arrow is live", async () => {
    class StubImgErr {
      set src(_v: string) { queueMicrotask(() => { this.onerror?.() }) }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    vi.stubGlobal("Image", StubImgErr as unknown as typeof Image)
    try {
      await expect(fitImageToAspect("data:image/png;base64,AA", 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("a decoded source with ZERO natural dims rides verbatim (the 0×0 guard)", async () => {
    class StubImgZero {
      naturalWidth = 0
      naturalHeight = 0
      set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    vi.stubGlobal("Image", StubImgZero as unknown as typeof Image)
    try {
      await expect(fitImageToAspect("data:image/png;base64,AA", 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("a canvas with a NULL 2d context rides verbatim (the ctx guard)", async () => {
    class StubImgTall {
      naturalWidth = 768
      naturalHeight = 1536
      set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    const origCreate = document.createElement.bind(document)
    vi.stubGlobal("Image", StubImgTall as unknown as typeof Image)
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement
      }
      return origCreate(tag)
    })
    try {
      await expect(fitImageToAspect("data:image/png;base64,AA", 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
    } finally {
      spy.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it("a same-aspect source that decodes rides VERBATIM — no re-encode, no generation loss", async () => {
    class StubImg {
      naturalWidth = 672
      naturalHeight = 384
      set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    vi.stubGlobal("Image", StubImg as unknown as typeof Image)
    try {
      await expect(fitImageToAspect("data:image/png;base64,AA", 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

// ── E7 — THE FIT'S STATE ARMS (keyframes-audio plan rows 84-85):
// the fit law covers what the doc CARRIES, not only what a picker
// commits. The stubs below reuse the D1 rider's own decode-shape
// (queueMicrotask onload / onerror) — no real decode, no timer waits. ──

/** Stub the decode to an (nw, nh) source and the canvas to a recorder.
 *  @returns the restore fn plus the recorded draw rects. */
function stubFitDecode(nw: number, nh: number): { restore: () => void; draws: unknown[][] } {
  const draws: unknown[][] = []
  class StubImg {
    naturalWidth = nw
    naturalHeight = nh
    set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
  }
  const origCreate = document.createElement.bind(document)
  const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const c = {
        width: 0, height: 0,
        getContext: () => ({ drawImage: (...a: unknown[]) => { draws.push(a) } }),
        toDataURL: () => "data:image/png;base64,FITTED",
      }
      return c as unknown as HTMLCanvasElement
    }
    return origCreate(tag)
  })
  vi.stubGlobal("Image", StubImg as unknown as typeof Image)
  return {
    draws,
    restore: () => { spy.mockRestore(); vi.unstubAllGlobals() },
  }
}

/** Stub the decode to FAIL (onerror — the immediate refusal arm).
 *  @returns the restore fn. */
function stubFitDecodeFailure(): () => void {
  class StubImgErr {
    set src(_v: string) { queueMicrotask(() => { this.onerror?.() }) }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
  }
  vi.stubGlobal("Image", StubImgErr as unknown as typeof Image)
  return () => { vi.unstubAllGlobals() }
}

describe("commitKeyframePinImage (E7, KF-A(1) — the name arm's fit story)", () => {
  const byUrl = new Map([["https://engine:8188/view?filename=pin.png", "video_w1_main"]])
  const ENGINE_URL = "https://engine:8188/view?filename=pin.png"

  it("an off-aspect run-artifact URL pick commits the FITTED data: — never the unfittable bare name", async () => {
    // KF-A(1): the byUrl→NAME arm used to commit the bare name; the
    // fit gate skips names, the engine cover-cropped the pin, and no
    // client arm could ever fit it again. The spine fits the servable
    // URL the pick arrived as and the name dies at the commit seam.
    const stub = stubFitDecode(2688, 768)
    try {
      await expect(commitKeyframePinImage(ENGINE_URL, byUrl, 1344, 768))
        .resolves.toEqual({ image: "data:image/png;base64,FITTED" })
      expect(stub.draws.length).toBe(1)
      expect(stub.draws[0]!.slice(1)).toEqual([0, 192, 1344, 384])
    } finally {
      stub.restore()
    }
  })

  it("a same-aspect URL pick commits the NAME — the courtesy law (the commit never depends on the fit)", async () => {
    const stub = stubFitDecode(672, 384)
    try {
      await expect(commitKeyframePinImage(ENGINE_URL, byUrl, 1344, 768))
        .resolves.toEqual({ image: "video_w1_main" })
      expect(stub.draws.length).toBe(0)
    } finally {
      stub.restore()
    }
  })

  it("a decode FAILURE on the name arm rides the name verbatim", async () => {
    const restore = stubFitDecodeFailure()
    try {
      await expect(commitKeyframePinImage(ENGINE_URL, byUrl, 1344, 768))
        .resolves.toEqual({ image: "video_w1_main" })
    } finally {
      restore()
    }
  })

  it("an estate-media pick commits the CANONICAL rooted chip — the legacy origin-qualified spelling dies at this seam", async () => {
    // the J2 canonicalize-at-commit law, judged at the pin's own seam
    const stub = stubFitDecode(672, 384)
    try {
      await expect(commitKeyframePinImage("http://host/v1/assets/runs/r1/x.jpg", new Map(), 1344, 768))
        .resolves.toEqual({ image: "/melite-media/runs/r1/x.jpg" })
    } finally {
      stub.restore()
    }
  })

  it("a foreign URL refuses before any decode — the M1 law keeps its teeth", async () => {
    await expect(commitKeyframePinImage("https://example.org/pic.png", new Map(), 1344, 768))
      .resolves.toEqual({ refusal: FOREIGN_URL_REFUSAL })
  })
})

describe("refitKeyframePinImage (E7, KF-A(2) — the reopen/refit seam)", () => {
  const byName = new Map([["video_w1_main", "https://engine:8188/view?filename=pin.png"]])

  it("a saved off-aspect data: pin REOPENS FITTED — the fit law applies on reopen, not only on pick", async () => {
    const stub = stubFitDecode(2688, 768)
    try {
      await expect(refitKeyframePinImage("data:image/png;base64,AA", byName, 1344, 768))
        .resolves.toBe("data:image/png;base64,FITTED")
      expect(stub.draws[0]!.slice(1)).toEqual([0, 192, 1344, 384])
    } finally {
      stub.restore()
    }
  })

  it("a saved off-aspect rooted pin refits through the same law", async () => {
    const stub = stubFitDecode(768, 1536)
    try {
      await expect(refitKeyframePinImage("/melite-media/runs/r1/pin.png", byName, 1344, 768))
        .resolves.toBe("data:image/png;base64,FITTED")
      expect(stub.draws[0]!.slice(1)).toEqual([480, 0, 384, 768])
    } finally {
      stub.restore()
    }
  })

  it("a saved same-aspect pin rides VERBATIM — no re-encode, no generation loss", async () => {
    const stub = stubFitDecode(672, 384)
    try {
      await expect(refitKeyframePinImage("data:image/png;base64,AA", byName, 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
      await expect(refitKeyframePinImage("/melite-media/runs/r1/pin.png", byName, 1344, 768))
        .resolves.toBe("/melite-media/runs/r1/pin.png")
      expect(stub.draws.length).toBe(0)
    } finally {
      stub.restore()
    }
  })

  it("a saved LEGACY origin-qualified spelling heals to the canonical rooted chip (nothing stored ever breaks)", async () => {
    const stub = stubFitDecode(672, 384)
    try {
      await expect(refitKeyframePinImage("https://estate/v1/assets/runs/r1/pin.png", byName, 1344, 768))
        .resolves.toBe("/melite-media/runs/r1/pin.png")
    } finally {
      stub.restore()
    }
  })

  it("a saved bare NAME refits OFF the servable URL its index resolves — the doc heals off the unfittable name", async () => {
    const stub = stubFitDecode(2688, 768)
    try {
      await expect(refitKeyframePinImage("video_w1_main", byName, 1344, 768))
        .resolves.toBe("data:image/png;base64,FITTED")
      expect(stub.draws[0]!.slice(1)).toEqual([0, 192, 1344, 384])
    } finally {
      stub.restore()
    }
  })

  it("a saved bare NAME with a same-aspect url rides the name verbatim (engine currency, the courtesy law)", async () => {
    const stub = stubFitDecode(672, 384)
    try {
      await expect(refitKeyframePinImage("video_w1_main", byName, 1344, 768))
        .resolves.toBe("video_w1_main")
    } finally {
      stub.restore()
    }
  })

  it("an unresolvable saved name rides verbatim — never a refusal at reopen", async () => {
    const restore = stubFitDecodeFailure()
    try {
      await expect(refitKeyframePinImage("ghost-name.png", new Map(), 1344, 768))
        .resolves.toBe("ghost-name.png")
    } finally {
      restore()
    }
  })

  it("the imageless pin rides \"\" — KF-C's own law, never this seam's input", async () => {
    await expect(refitKeyframePinImage("", byName, 1344, 768)).resolves.toBe("")
  })

  it("a saved source that cannot decode rides verbatim — the fit is a courtesy, never a blocker", async () => {
    const restore = stubFitDecodeFailure()
    try {
      await expect(refitKeyframePinImage("data:image/png;base64,AA", byName, 1344, 768))
        .resolves.toBe("data:image/png;base64,AA")
    } finally {
      restore()
    }
  })
})
