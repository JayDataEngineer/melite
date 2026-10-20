/**
 * CallCard — one focused model-call card (BEHAVIORAL).
 *
 * PINS (the rail is the call's editor): focused mode shows only the
 * selected call; delete merges the span; span edits ripple; guides
 * write; the ref badge counts; identity refs replace run refs; the
 * knob fold replaces per call.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CallCard } from "../src/ui/studio/CallCard.tsx"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { DOC_FPS_DEFAULT, deliveredFrames } from "@melite/models-h3/timelineContract"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { bindEstateRemote, fieldsOfEnvelope, unbindEstateRemote, type SpecField, ASSET_DRAG_MIME } from "@melite/card-base/client"
import { carrier } from "../src/card.ts"

// THE SERVED WALK (hour 22): the fold's schema truth — the carrier's
// own serialization, the same bytes the lane serves.
const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()
const REAL_KNOB_FIELDS: Record<string, SpecField> = {}
for (const f of fieldsOfEnvelope(REAL_ENV as never, "h3-timeline")) REAL_KNOB_FIELDS[f.name] = f

const BY_NAME = new Map([["still-a", "https://u/a.png"]])
const BY_URL = new Map([...BY_NAME].map(([n, u]) => [u, n] as [string, string]))

/** The upload-reader stand-in (the any-media arms): answers the
 *  commit read with the given data URL on the next microtask. */
function fakeReader(result: string): unknown {
  return class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(): void {
      this.result = result
      queueMicrotask(() => { this.onload?.() })
    }
  }
}

function deps(over?: Record<string, unknown>) {
  const calls = {
    deleted: [] as string[],
    spans: [] as [number, string, number][],
    guides: [] as [number, string, string][],
    prevs: [] as [number, number | null][],
    trans: [] as [number, string][],
    refs: [] as [number, string, string][],
    knobs: [] as [number, string, unknown][],
  }
  const d = {
    selected: null as { callIdx: number } | null,
    fps: 24,
    layerA: undefined,
    // THE OVERRIDE LAYER'S TRUTH (hour 22): the real served walk —
    // schemastery's own serialization, never a hand stub (the fold
    // rides the generic OverlayKnob on these fields).
    knobFields: REAL_KNOB_FIELDS,
    callCardRefs: { current: [] as (HTMLDivElement | null)[] },
    artifactIndex: { byName: BY_NAME, byUrl: BY_URL },
    linkGroups: [], guideLinks: { clip: [], audio: [] },
    refArtifacts: [{ name: "ra", url: "https://u/ra.png" }],
    handlePromptDelete: (id: string) => { calls.deleted.push(id) },
    handlePromptUpdate: () => {},
    enhanceOne: () => {},
    undoEnhance: () => {},
    enhancing: {},
    enhanceErr: {},
    enhanceUndo: {},
    setCallSpan: (i: number, w: "start" | "end", f: number) => { calls.spans.push([i, w, f]) },
    setCallGuide: (i: number, k: string, s: string) => { calls.guides.push([i, k, s]) },
    setCallTransition: (i: number, t: string) => { calls.trans.push([i, t]) },
    setCallRefs: (i: number, k: string, v: string) => { calls.refs.push([i, k, v]) },
    setCallKnob: (i: number, k: string, v: unknown) => { calls.knobs.push([i, k, v]) },
    ...over,
  }
  return { d, calls }
}

const BASE: DocCall = { text: "a shot", start_frame: 0, end_frame: 48 }

describe("focus + header", () => {
  it("focused mode: only the selected call renders", () => {
    const { d } = deps({ selected: { callIdx: 1 } })
    const h1 = render(<CallCard c={BASE} i={0} deps={d} />)
    assert.equal(document.querySelector('[data-call-card="0"]'), null)
    h1.unmount()
    const h2 = render(<CallCard c={BASE} i={1} deps={deps({ selected: { callIdx: 1 } }).d} />)
    assert.ok(document.querySelector('[data-call-card="1"]'))
    h2.unmount()
  })

  it("global mode renders unselected; selected marks", () => {
    const h1 = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    const card = document.querySelector('[data-call-card="0"]')!
    assert.equal(card.getAttribute("data-selected"), null)
    assert.equal(card.getAttribute("data-guides"), null)
    assert.equal(card.getAttribute("data-knobs"), null)
    h1.unmount()
    const h2 = render(<CallCard c={{ ...BASE, image: "still-a" }} i={0} deps={deps({ selected: { callIdx: 0 } }).d} />)
    const sel = document.querySelector('[data-call-card="0"]')!
    assert.equal(sel.getAttribute("data-selected"), "true")
    assert.equal(sel.getAttribute("data-guides"), "image")
    h2.unmount()
  })

  it("delete asks for the merge (the bar clip's hover ✕ twin)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={2} deps={d} />)
    fireEvent.click(screen.getByLabelText("Delete call 2"))
    assert.deepEqual(calls.deleted, ["call-2"])
  })

  it("knobs count the tag (singular, plural, absent)", () => {
    const one = render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={deps().d} />)
    assert.ok(screen.getByText("1 knob"))
    assert.equal(document.querySelector('[data-call-card="0"]')!.getAttribute("data-knobs"), "1")
    one.unmount()
    const two = render(
      <CallCard c={{ ...BASE, knobs: { denoise: 0.7, sampler_name: "euler" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByText("2 knobs"))
    two.unmount()
  })

  // (timeline-plane wave-2 G5, the S6 seat) the card header's span
  // readout was unwalled — the copy census saw the dict key, never the
  // booked seconds. Both seconds derive through the clock: the const
  // at the doc-clock arm, the prop at the stated arm, and the carried
  // window's delivered arm pins span ≠ delivered — a frozen literal at
  // the seat reds at least one of the three.
  describe("the span readout's clock (G5)", () => {
    it("span + delivered seconds divide by DOC_FPS_DEFAULT (the doc clock)", () => {
      const h = render(<CallCard c={BASE} i={0} deps={deps({ fps: DOC_FPS_DEFAULT }).d} />)
      const span = ((BASE.end_frame - BASE.start_frame) / DOC_FPS_DEFAULT).toFixed(1)
      const delivered = (deliveredFrames(BASE, 0) / DOC_FPS_DEFAULT).toFixed(1)
      assert.ok(
        screen.getByText(studioCopy.spanReadout(BASE.start_frame, BASE.end_frame, span, delivered)),
        `frames ${BASE.start_frame}–${BASE.end_frame} book ${span}s → delivered ${delivered}s at the doc clock`,
      )
      h.unmount()
    })

    it("the readout rides the card's OWN fps — a stated 12fps doc books double", () => {
      const h = render(<CallCard c={BASE} i={0} deps={deps({ fps: 12 }).d} />)
      const span = ((BASE.end_frame - BASE.start_frame) / 12).toFixed(1)
      const delivered = (deliveredFrames(BASE, 0) / 12).toFixed(1)
      assert.ok(screen.getByText(studioCopy.spanReadout(BASE.start_frame, BASE.end_frame, span, delivered)))
      h.unmount()
    })

    it("a carried window's delivered seconds lose the 22f seam (span ≠ delivered)", () => {
      const carried: DocCall = { text: "b", start_frame: 48, end_frame: 90 }
      const h = render(<CallCard c={carried} i={1} deps={deps({ fps: DOC_FPS_DEFAULT }).d} />)
      const span = ((carried.end_frame - carried.start_frame) / DOC_FPS_DEFAULT).toFixed(1)
      const delivered = (deliveredFrames(carried, 1) / DOC_FPS_DEFAULT).toFixed(1)
      assert.notEqual(delivered, span, "a carried window delivers span − 22f, never the span itself")
      assert.ok(screen.getByText(studioCopy.spanReadout(carried.start_frame, carried.end_frame, span, delivered)))
      h.unmount()
    })
  })

  // THE MASTER-GATED NINE (calls-stanza audit #3, 2026-10-16):
  // sharpen_*/interp_* read ONLY inside the post chain, whose only
  // door is the DOC-level second_pass_enabled master — a switch the
  // call plane cannot state. Offered with the master off (the
  // default), they sold dead knobs: stated, seen by no node, silent.
  // The fold gates its rows on the master.
  it("THE MASTER-GATED NINE: the fold never offers a dead post-chain knob (master off) — and offers all nine when the master opens the chain", async () => {
    const openFold = (): void => { fireEvent.click(screen.getByText("Call knobs")) }
    // master OFF (the default): the nine are absent from the fold
    const off = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    openFold()
    assert.equal(screen.queryByLabelText("Call 0 knob: sharpen_strength"), null,
      "a post-chain knob is never offered with the master off")
    assert.equal(screen.queryByLabelText("Call 0 knob: interp_model"), null,
      "the interp knobs ride the same master")
    assert.ok(screen.getByLabelText("Call 0 knob: denoise"), "the ungated knobs still ride")
    off.unmount()
    // master ON: all nine ride
    const on = render(<CallCard c={BASE} i={0} deps={deps({ layerA: { fps: 24, second_pass_enabled: true } }).d} />)
    openFold()
    for (const knob of ["sharpen_enabled", "sharpen_method", "sharpen_strength", "sharpen_radius", "sharpen_threshold", "sharpen_iterations", "interpolate_enabled", "interp_model", "interp_multiplier"]) {
      assert.ok(screen.getByLabelText(`Call 0 knob: ${knob}`), `${knob} rides when the master opens the chain`)
    }
    on.unmount()
  })
})

describe("span + guides", () => {
  it("span edits ripple (a clear holds — never a write)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={0} deps={d} />)
    fireEvent.change(screen.getByLabelText("Call 0 start frame"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("Call 0 end frame"), { target: { value: "60" } })
    fireEvent.change(screen.getByLabelText("Call 0 start frame"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Call 0 end frame"), { target: { value: "" } })
    assert.deepEqual(calls.spans, [[0, "start", 12], [0, "end", 60]])
  })

  it("THE ANCHOR-SLOT FACE IS DEAD (operator 2026-11-05: keyframes own anchors) — no first-frame square, no slot-1 language; the seam still writes", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, image: "still-a" }} i={1} deps={d} />)
    assert.equal(screen.queryByLabelText("anchor ref · slot 1 source"), null, "no anchor square")
    assert.equal(screen.queryByTestId("tl-first-frame"), null, "no first-frame slot")
    assert.equal(screen.queryByTestId("tl-anchor-truth"), null, "no anchor-truth prose")
    fireEvent.click(screen.getByLabelText("Call 1 seam mode"))
    fireEvent.click(screen.getByRole("menuitem", { name: /^Carried/ }))
    assert.deepEqual(calls.trans, [[1, "extend"]])
  })

  it("bus order + the picker filter (images \u2192 videos \u2192 audios \u2192 seam; audio/video files not grayed out)", () => {
    const { d } = deps()
    render(<CallCard c={{ ...BASE }} i={1} deps={d} />)
    // the lanes render in the BUNDLE'S OWN wire order: images, videos, audios
    const buckets = screen.getAllByTestId("tl-call-ref-bucket")
    assert.equal(buckets.length, 3, "three lanes on the bus")
    const files = buckets.map((b) => b.querySelector("input[type=file]")!.getAttribute("accept"))
    assert.deepEqual(files, ["image/png,image/jpeg,image/webp", "video/*", "audio/*"],
      "each lane's OS picker accepts its own MIME family (the two-audio fix)")
    // the seam rides AFTER the bus — the call's join, never a lane between lanes
    const seam = screen.getByLabelText("Call 1 seam mode")
    assert.ok(buckets[2].compareDocumentPosition(seam) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the audios lane precedes the seam in the DOM")
  })

  it("THE GUIDE SLOTS ARE DEAD FACES (operator 2026-11-05: clip guide / audio guide — WHAT IS THAT THERE FOR?) — no clip/audio squares; conditioning rides the timeline's own lanes", () => {
    const { d } = deps()
    ;(d as { guideLinks: unknown }).guideLinks = {
      clip: [{ name: "clip-one", url: "https://u/c1.mp4", title: "up" }],
      audio: [],
    }
    const h = render(<CallCard c={{ ...BASE, audio: "still-a" }} i={0} deps={d} />)
    assert.equal(screen.queryByLabelText("Call 0 clip guide source"), null, "no clip guide square")
    assert.equal(screen.queryByLabelText("Call 0 audio guide source"), null, "no audio guide square")
    assert.equal(document.querySelector('[data-testid="tl-guide-clip"]'), null)
    assert.equal(document.querySelector('[data-testid="tl-guide-audio"]'), null)
    h.unmount()
  })
})

describe("the image-bus count (the 9-slot bundle lane)", () => {
  it("counts the ref chips against the 9-slot bus (the anchor offset died with the anchor face)", () => {
    const h0 = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("0/8"))
    h0.unmount()

    const h1 = render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps().d} />)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/8"))
    h1.unmount()

    // (2026-11-05) the anchor offset died with the anchor face: a
    // stated c.image never counts against the ref bus (the keyframe
    // pins own anchors) — one chip is one slot, whatever the image.
    const h2 = render(
      <CallCard c={{ ...BASE, image: "still-a", refs: { images: "still-a" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/8"))
    h2.unmount()
  })

  it("over the 8-slot bus wears the over face (the compose slices the overflow)", () => {
    const names = Array.from({ length: 9 }, (_, k) => `r${k}`).join(", ")
    const h = render(<CallCard c={{ ...BASE, refs: { images: names } }} i={0} deps={deps().d} />)
    const b = screen.getByTestId("tl-call-ref-images")
    assert.ok(b.textContent!.includes("9/8"))
    assert.ok(b.className.includes("refCountOver"))
    h.unmount()
  })

  it("a ref chip's — clear — verb removes THAT chip from the wire (the SourceRow clear arm)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { images: "still-a, still-b" } }} i={0} deps={d} />)
    // open the still-a chip's source row menu and take the clear verb
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(calls.refs, [[0, "images", "still-b"]],
      "the clear removes exactly the cleared chip, the sibling survives")
  })

  it("a FOREIGN media URL picked at a chip refuses loud — the error face shows, the wire never hears it", async () => {
    const { d, calls } = deps()
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [{ url: "https://lib/foreign.png", name: "foreign.png" }] } }) } } as never)
    render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("foreign.png"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [], "a URL outside this run's artifacts never commits")
    assert.ok(screen.getByTestId("tl-call-ref-images-error").textContent!.includes("not in this run"),
      "the refusal lands on the bucket's error face")
    unbindEstateRemote()
  })

  it("a From-flow pick AT an existing chip REPLACES that chip in place (the edit arm — never a duplicate)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    const row = rows.find((r) => r.textContent!.includes("ra"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [[0, "images", "ra"]],
      "the pick rewrites the chip's own seat in the lane list")
  })

  it("THE ANCHOR SQUARE IS GONE — the lane is the reference bus only (operator 2026-11-05)", () => {
    const h = render(<CallCard c={{ ...BASE, image: "still-a" }} i={0} deps={deps().d} />)
    const chipsRow = screen.getAllByTestId("tl-call-ref-bucket")[0]
    assert.equal(chipsRow.querySelector('[data-testid="tl-first-frame"]'), null, "no anchor in the chips row")
    h.unmount()
  })
})

describe("identity refs + knob fold", () => {
  it("the refs group rides EVERY family (refs imply t4r — the bundle mounts per call)", () => {
    render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.notEqual(screen.queryByTestId("tl-call-refs"), null)
  })

  it("a From-flow pick writes the artifact NAME (the URL translates)", () => {
    const { d, calls } = deps({})
    function Live() {
      const [c, setC] = useState<DocCall>(BASE)
      return (
        <CallCard
          c={c} i={0}
          deps={{
            ...d,
            setCallRefs: (i: number, k: string, v: string) => {
              calls.refs.push([i, k, v])
              setC((p) => ({ ...p, refs: { images: v } }))
            },
          }}
        />
      )
    }
    render(<Live />)
    // the add slot's SourceRow: square → the three-entry menu → From flow → the row
    fireEvent.click(screen.getByRole("button", { name: "+ image source" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "From flow" }))
    fireEvent.click(screen.getByTestId("source-pick-row"))
    // the pick hands the URL; the wire carries the NAME
    assert.deepEqual(calls.refs, [[0, "images", "ra"]])
  })

  it("the knob fold replaces per call", () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={d} />)
    // the DisclosureRow law (pattern campaign S2): closed folds hold
    // NO hidden DOM — open the row before touching its knobs
    fireEvent.click(screen.getByText(studioCopy.knobsHead))
    fireEvent.change(screen.getByLabelText("Call 0 knob: denoise"), { target: { value: "0.5" } })
    assert.deepEqual(calls.knobs, [[0, "denoise", 0.5]])
    // (the first-call prev note died with the seconds picker — the
    // seam is automatic; the first call simply has nothing to carry)
  })

  it("later calls own the live seam select (cut is the one authored fact)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={1} deps={d} />)
    // S7h: the seam select rides the DSH Menu — absent transition
    // displays the carried face (the option's titled prose)
    const mode = screen.getByLabelText("Call 1 seam mode") as HTMLButtonElement
    assert.match(mode.textContent ?? "", /^Carried/, "absent transition displays carried")
    fireEvent.click(mode)
    fireEvent.click(screen.getByRole("menuitem", { name: /^Cut/ }))
    assert.deepEqual(calls.trans, [[1, "cut"]])
    assert.deepEqual(calls.prevs, [])
  })
})

describe("THE BLOCKER (2026-09-22): clips and reference audio are mutually exclusive", () => {
  it("any D-M-E clip present → the Ref audios bucket is disabled on EVERY call, with the law as the hint", () => {
    const d = deps({ audioClipsPresent: true }).d
    const h = render(<CallCard c={BASE} i={0} deps={d} />)
    const bucket = h.container.querySelector('[data-disabled="true"]')
    assert.ok(bucket, "the bucket stands down")
    assert.match(bucket.getAttribute("title") ?? "", /clips own the model's audio inputs/, "the hint states the blocker")
    h.unmount()
  })

  it("no clips → the bucket is live (the lock lifts when the lanes clear)", () => {
    const d = deps({ audioClipsPresent: false }).d
    const h = render(<CallCard c={BASE} i={0} deps={d} />)
    assert.ok(!h.container.querySelector('[data-disabled="true"]'), "bucket live")
    h.unmount()
  })
})

describe("D2 (operator 2026-11-06): image chips preview through the DSH ImagePreview primitive", () => {
  it("a declared IMAGE chip carries the thumb door — clicking opens the DSH lightbox (the preview primitive)", async () => {
    const h = render(
      <CallCard
        c={{ ...BASE }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_images: ["https://u/l1.png"] } }).d}
      />,
    )
    // no refs.images stated → the images lane INHERITS the declared
    // URL → its declared chip renders WITH the thumb door
    const declared = h.container.querySelectorAll('[data-testid="tl-declared-ref"]')
    assert.equal(declared.length, 1)
    const chip = declared[0]!
    const img = chip.querySelector("img")
    assert.ok(img, "the estate thumb renders inside the chip")
    assert.equal(img!.getAttribute("src"), "https://u/l1.png")
    const door = chip.querySelector("button")
    assert.ok(door, "the thumb is a button — the lightbox opener")
    assert.equal(door!.getAttribute("aria-label"), "preview l1.png")
    assert.equal(document.querySelector('[role="dialog"]'), null, "the lightbox starts closed")
    fireEvent.click(door!)
    const dialog = await screen.findByRole("dialog")
    assert.ok(dialog.querySelector('img[src="https://u/l1.png"]'),
      "the DSH ImageLightbox opens with the original URL")
    fireEvent.click(screen.getByRole("button", { name: "close preview" }))
    await waitFor(() => { assert.equal(document.querySelector('[role="dialog"]'), null, "the close verb unmounts the lightbox") })
    h.unmount()
  })

  it("THE SQUARE GRAMMAR (operator 2026-10-16: 'IT FLOATS ON TOP'): a data: image chip on the mods lane renders INSIDE the square", () => {
    const h = render(
      <CallCard
        c={{ ...BASE, refs: { mods: "data:image/png;base64,AA" } }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42 } }).d}
      />,
    )
    // THE LAW: a committed image renders INSIDE its SourceRow square
    // (the refs seat's canon — one grammar, every bucket); the
    // floating declaredChip span that hovered its own thumbnail OVER
    // an empty square is dead, and the detach verb rides the held
    // image (a write verb, never PLUS over a full slot)
    const inSquare = h.container.querySelector('[data-source-row] [data-slot-square] img[src="data:image/png;base64,AA"]')
    assert.ok(inSquare, "the image renders inside the square")
    assert.equal(h.container.querySelector('[data-testid="tl-call-mod-chip"]'), null, "the floating chip is dead")
    assert.ok(screen.getAllByRole("button", { name: /^Detach/ }).length >= 1, "the detach verb is armed over the held image")
    h.unmount()
  })

  it("an image-currency chip on ANY lane carries the same door — the judge is isImageUrl, one spelling", () => {
    const h = render(
      <CallCard
        c={{ ...BASE }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_videos: ["https://u/declared.png"] } }).d}
      />,
    )
    const chip = h.container.querySelector('[data-testid="tl-declared-ref"]')
    assert.ok(chip, "the inheriting lane renders its declared chip")
    const door = chip!.querySelector("button")
    assert.ok(door, "image currency on the video lane carries the preview door")
    assert.equal(door!.getAttribute("aria-label"), "preview declared.png")
    h.unmount()
  })
})

describe("THE LAYER A/B CANON (2026-10-24): a stated call lane REPLACES the declared lane; absent inherits", () => {
  const LAYER = { fps: 24, seed: 42, ref_images: ["https://u/d1.png", "https://u/d2.png"] }
  it("a stated call lane hides the card defaults — the count rides the EFFECTIVE list, the tail names the arm", () => {
    const h = render(
      <CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps({ layerA: LAYER }).d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0,
      "the stated lane replaces — the card defaults do not render")
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/8"))
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("overrides"))
    h.unmount()
  })

  it("an absent call lane inherits the card defaults (the inherit arm)", () => {
    const h = render(
      <CallCard c={{ ...BASE }} i={0} deps={deps({ layerA: LAYER }).d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 2)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("2/8"))
    h.unmount()
  })

  it("no declared surface → the lane renders exactly as before (zero-behavior delta)", () => {
    const h = render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps().d} />)
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/8"))
    h.unmount()
  })

  it("THE DEAD DOOR: the redundant-copy strip is gone (a stated chip replaces, it never duplicates)", () => {
    const { d, calls } = deps({ layerA: LAYER })
    const h = render(
      <CallCard c={{ ...BASE, refs: { images: "https://u/d1.png, still-a" } }} i={0} deps={d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-redundant-ref"]').length, 0,
      "the merge died with its door")
    // a stated chip EQUAL to a declared default still replaces: 2/9, no card chips
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("2/8"))
    h.unmount()
    assert.deepEqual(calls.refs, [], "rendering writes nothing")
  })

  it("the canon holds across every media lane, per lane (images replace while videos inherit)", () => {
    const dataImage = "data:image/png;base64,AAA"
    const dataAudio = "data:audio/wav;base64,BBB"
    const { d } = deps({
      layerA: {
        fps: 24,
        seed: 42,
        ref_images: [dataImage],
        ref_videos: ["https://u/declared.mp4"],
        ref_audios: [dataAudio],
      },
    })
    const h = render(
      <CallCard
        c={{ ...BASE, refs: { images: "still-a", audios: "loop-a" } }}
        i={0}
        deps={d}
      />,
    )
    const declared = h.container.querySelectorAll('[data-testid="tl-declared-ref"]')
    // images lane states chips → its default hides; videos lane
    // inherits → its declared chip renders; audios lane states
    // chips → its default hides. One chip total, on the video lane.
    assert.equal(declared.length, 1)
    assert.ok(declared[0]!.textContent!.includes("declared.mp4"))
    assert.equal(declared[0]!.querySelector("img"), null, "video chips carry no thumb")
    h.unmount()
  })

  it("THE MODS LANE: a picked pack writes the refs.mods wire, the bucket counts the effective list, the strip verb removes (the path door died 2026-11-05)", async () => {
    const { d, calls } = deps({ modsListing: ["pack_one", "pack_two"] })
    const h = render(<CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />)
    assert.ok(screen.getByTestId("tl-call-mods-bucket"), "the bucket mounts after the audios lane")
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("1/8"))
    // the add door is the SQUARE (operator 2026-11-05: the upload
    // square grammar): From flow lists the engine's own stems BESIDE
    // the run's artifacts (the from-flow union law, 2026-10-20)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("pack_two"))
    assert.deepEqual(calls.refs, [[0, "mods", "refmods/pack_one.safetensors, pack_two.safetensors"]])
    // the strip door (the square's own detach verb now): this
    // harness renders once, so the strip's pass addresses the
    // RENDERED chips (the original one) — the mutation stream
    // records the add, then the strip of the rendered chip (real
    // usage re-renders between mutations).
    const detaches = screen.getAllByRole("button", { name: /^Detach/ })
    assert.equal(detaches.length, 1)
    fireEvent.click(detaches[0]!)
    assert.deepEqual(calls.refs.at(-1), [0, "mods", ""])
    h.unmount()
  })

  it("THE MODS LANE estate-media arm (2026-11-06): a legacy run-media pick commits in its canonical live spelling (chipOfListing's estate face)", async () => {
    const { d, calls } = deps({ modsListing: [] })
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [{ url: "/v1/assets/runs/legacy.png", name: "legacy.png" }] } }) } } as never)
    try {
      fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
      fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
      const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("legacy.png"))!
      fireEvent.click(row)
      await waitFor(() => {
        // estateMediaChip's face: the legacy /v1/assets/runs prefix
        // rides canonicalRunMediaUrl — the live spelling lands
        assert.ok(calls.refs.some(([, lane, v]) => lane === "mods" && v.includes("runs/legacy.png")),
          `the estate-media pick committed: ${JSON.stringify(calls.refs)}`)
      })
    } finally {
      unbindEstateRemote()
    }
    h.unmount()
  })

  it("THE MODS LANE from-flow union arm (ERRORS_2 FROM-REF, 2026-10-20): the From-flow verb offers the run's artifacts BESIDE the engine's stems — never stems-only", async () => {
    const { d, calls } = deps({ modsListing: ["pack_one", "pack_two"] })
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 3, `stems + the run artifact ride: ${rows.map((r) => r.textContent)}`)
    assert.ok(rows.some((r) => r.textContent!.includes("pack_one")), "stem one still rides")
    assert.ok(rows.some((r) => r.textContent!.includes("pack_two")), "stem two still rides")
    assert.ok(rows.some((r) => r.textContent!.includes("ra")), "the run's artifact rides the same verb")
    fireEvent.click(rows.find((r) => r.textContent!.includes("ra"))!)
    assert.deepEqual(calls.refs, [[0, "mods", "https://u/ra.png"]],
      "the artifact pick commits the canonical URL the compose bakes")
    h.unmount()
  })

  it("THE MODS LANE from-flow artifact arm (the burn verbatim): an empty stems listing still offers the run's artifact — never 'nothing to pick yet' beside a run full of media", async () => {
    const { d, calls } = deps({ modsListing: [] })
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 1, "the empty listing starves no door while the run holds media")
    assert.ok(rows[0]!.textContent!.includes("ra"), "the run's artifact is the row")
    fireEvent.click(rows[0]!)
    assert.deepEqual(calls.refs, [[0, "mods", "https://u/ra.png"]],
      "the pick commits — no foreign-URL refusal for the run's own artifact")
    h.unmount()
  })

  it("THE MODS LANE honest-empty arm: no stems AND no run artifacts — the picker is honestly empty, never a synthetic row", async () => {
    const { d } = deps({ modsListing: [], refArtifacts: [] })
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    assert.ok(await screen.findByText("nothing to pick yet"))
    assert.equal(screen.queryAllByTestId("source-pick-row").length, 0)
    h.unmount()
  })

  it("THE MODS LANE committed-artifact arm (the no-duplicate-offer law's artifact half, 2026-10-20): a picked run artifact leaves the picker — only the unpicked rows offer", async () => {
    const { d } = deps({ modsListing: ["pack_one"] })
    const h = render(<CallCard c={{ ...BASE, refs: { mods: "https://u/ra.png" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 1, "the chipped artifact is held — only the engine's stems are offered")
    assert.ok(rows[0]!.textContent!.includes("pack_one"))
    h.unmount()
  })

  it("THE MODS LANE declared arm: card-declared packs render as declared chips and the count names the inherit", () => {
    const h = render(
      <CallCard
        c={{ ...BASE }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_mods: ["refmods/declared.safetensors"] } }).d}
      />,
    )
    const declared = h.container.querySelectorAll('[data-testid="tl-declared-ref"]')
    assert.equal(declared.length, 1, "the declared pack renders as a declared chip")
    assert.ok(declared[0]!.textContent!.includes("declared.safetensors"))
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("1/8"))
    assert.ok(screen.getByTestId("tl-call-mods-count").getAttribute("title")!.includes("card mods"),
      "the count's title names the inherit arm (add a path to override)")
    h.unmount()
  })

  it("THE MODS LANE merge arm: a stated lane rides WITH the declared packs — both render, the count names the union", () => {
    const h = render(
      <CallCard
        c={{ ...BASE, refs: { mods: "refmods/mine.safetensors" } }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_mods: ["refmods/declared.safetensors"] } }).d}
      />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 1,
      "the merge law: the declared chip renders — a stated call seat never hides the declared packs")
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("2/8"),
      "the count is the union (declared + this call's), the merged face of the compose")
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("merged"))
    h.unmount()
  })

  it("THE MODS LANE over face: 9 claimed paths wear the over count (the loader holds 8 slots)", () => {
    const paths = Array.from({ length: 9 }, (_, k) => `refmods/p${k}.safetensors`).join(", ")
    const h = render(<CallCard c={{ ...BASE, refs: { mods: paths } }} i={0} deps={deps().d} />)
    const b = screen.getByTestId("tl-call-mods-count")
    assert.ok(b.textContent!.includes("9/8"), b.textContent)
    assert.ok(b.getAttribute("title")!.includes("8 slots"), b.getAttribute("title") ?? "")
    assert.ok(b.className.includes("refCountOver"), "the over face wears the danger count")
    h.unmount()
  })

  it("THE MODS LANE file arm takes ANY MEDIA (the any-media law, 2026-11-06): a dropped still reads into a data: chip — the system bakes the pack", async () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    const inp = screen.getByTestId("tl-call-mods-bucket").querySelector('input[type="file"][class*="squareFileInput"]') as HTMLInputElement
    const realReader = globalThis.FileReader
    globalThis.FileReader = fakeReader("data:image/png;base64,QUJD") as unknown as typeof FileReader
    try {
      fireEvent.change(inp, { target: { files: [new File(["bytes"], "hero.png", { type: "image/png" })] } })
      await waitFor(() => assert.equal(calls.refs.length, 1))
      assert.ok(calls.refs[0][2].startsWith("data:image/png;base64,"), "the still lands as a data: chip — the run's staging walk bakes it into the pack")
    } finally {
      globalThis.FileReader = realReader
    }
    h.unmount()
  })

  })

describe("THE MODS SQUARE (slice 4, design §B): the add door rides the SourceRow grammar", () => {
  it("THE CHIP-REPLACE seat (the square grammar on the mods lane): a listing pick over an existing stem swaps IN PLACE; the stem's verbatim name rides the chip", async () => {
    // the mods chip row's own edit arm (the 2026-11-06 sweep: the
    // ADD door was walled, the chip row's swap never rode — and the
    // verbatim fallback of chipOfListing fires exactly HERE: a stem
    // pick is neither a candidate URL nor estate media)
    const { d, calls } = deps({ modsListing: ["pack_one", "pack_two", "pack_three"] })
    render(<CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />)
    // the chip row's square opens the same picker over its own seat
    fireEvent.click(screen.getByRole("button", { name: "pack_one.safetensors source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("pack_two"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [[0, "mods", "pack_two.safetensors"]],
      "one write, the picked stem IN the old chip's seat — the swap is in place, never an append")
    assert.equal(calls.refs.length, 1, "a single write — the commit is atomic")
  })
  it("THE CHIP-REPLACE seat, FILE arm: a good media file over an existing stem chip swaps the chip for the data: URL in place", async () => {
    // the mods commitUpload's replace ternary (the 2026-11-06
    // sweep: the ADD file arm was walled, the chip-row file swap
    // never rode)
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />)
    const realReader = globalThis.FileReader
    globalThis.FileReader = fakeReader("data:audio/wav;base64,QUJD") as unknown as typeof FileReader
    try {
      fireEvent.click(screen.getByRole("button", { name: "pack_one.safetensors source" }))
      fireEvent.click(await screen.findByRole("menuitem", { name: "From file" }))
      const inp = document.querySelector('input[type="file"][class*="squareFileInput"]') as HTMLInputElement
      assert.ok(inp, "the retargeted file input")
      fireEvent.change(inp, { target: { files: [new File(["bytes"], "line.wav", { type: "audio/wav" })] } })
      await waitFor(() => assert.equal(calls.refs.length, 1))
      assert.ok(calls.refs[0][2].startsWith("data:audio/wav;base64,"), "the stem chip became the data: chip — swapped in place")
    } finally {
      globalThis.FileReader = realReader
    }
  })
  it("THE CHIP-REPLACE seat refuses bad files too (the mods lane owes the anchor's law on its own chip rows)", async () => {
    // the mods commitUpload's own too-large arm and unreadable
    // catch (491/499 in the sweep): the refs bucket's failure modes
    // were walled at their seat; the mods chip rows ride the same
    // law — a drop that neither commits nor refuses is THE SILENT
    // DROP
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />)
    const openChip = async (): Promise<HTMLInputElement> => {
      fireEvent.click(screen.getByRole("button", { name: "pack_one.safetensors source" }))
      fireEvent.click(await screen.findByRole("menuitem", { name: "From file" }))
      // scope INSIDE the mods bucket — the call card carries many
      // SourceRows; the first [data-source-row] in the document is
      // never necessarily this one
      const bucket = screen.getByTestId("tl-call-mods-bucket")
      const row = bucket.querySelector("[data-source-row]") as HTMLElement | null
      const inp = (row?.querySelector('input[type="file"]') ?? bucket.querySelector('input[type="file"][class*="squareFileInput"]')) as HTMLInputElement
      assert.ok(inp, "the chip's retargeted file input")
      return inp
    }
    // TOO LARGE: the mods lane's own cap row refuses loud
    const inp = await openChip()
    const big = new File([new Uint8Array(8)], "big.mp4", { type: "video/mp4" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-mods-error")
    assert.ok(err.textContent!.includes("too large"), err.textContent!)
    // UNREADABLE: the reader's failure surfaces, never a silent drop
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL(): void { this.onerror?.() }
    }
    const realReader = globalThis.FileReader
    globalThis.FileReader = FailReader as unknown as typeof FileReader
    try {
      const inp2 = await openChip()
      fireEvent.change(inp2, { target: { files: [new File(["x"], "bad.mp3", { type: "audio/mpeg" })] } })
      const err2 = await screen.findByTestId("tl-call-mods-error")
      assert.ok(err2.textContent!.includes("could not read"), err2.textContent!)
    } finally {
      globalThis.FileReader = realReader
    }
    assert.equal(calls.refs.length, 0, "neither refusal commits a chip")
  })

  it("THE DOOR'S CANDIDATE-SET ARM: the engine listing → the pick commits the stem's wire form", async () => {
    const { d, calls } = deps({ modsListing: ["pack_one", "pack_two"] })
    render(<CallCard c={BASE} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("pack_two"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [[0, "mods", "pack_two.safetensors"]],
      "the pick commits stem.safetensors — exactly the entry the compose's modStem basenames into the loader")
  })

  it("a committed stem leaves the picker (the no-duplicate-offer law, per stem)", async () => {
    // (2026-10-20, the from-flow union: refArtifacts [] isolates the
    // stem law — the union arm pins the combined face above)
    const { d } = deps({ modsListing: ["pack_one", "pack_two"], refArtifacts: [] })
    render(<CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 1, "the chipped stem is held — only the engine's other stems are offered")
    assert.ok(rows[0]!.textContent!.includes("pack_two"))
  })

  it("a chipped BARE stem (no suffix) still excludes its listing row (the stem grammar, both chip spellings)", async () => {
    // (2026-10-20: refArtifacts [] isolates the stem grammar)
    const { d } = deps({ modsListing: ["solo"], refArtifacts: [] })
    render(<CallCard c={{ ...BASE, refs: { mods: "solo" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    assert.ok(await screen.findByText("nothing to pick yet"), "the committed stem is held — the picker is honestly empty")
  })

  it('THE UPLOAD DOOR IS OPEN TO ANY MEDIA (operator, 2026-11-06: the system handles the conversion): a video file gesture commits a data: chip; a .safetensors pack file refuses at the gesture (packs ride the engine listing, never the OS door)', async () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={0} deps={d} />)
    const realReader = globalThis.FileReader
    globalThis.FileReader = fakeReader("data:video/mp4;base64,QUJD") as unknown as typeof FileReader
    try {
      const inp = screen.getByTestId("tl-call-mods-bucket").querySelector('input[type="file"][class*="squareFileInput"]') as HTMLInputElement
      fireEvent.change(inp, { target: { files: [new File(["bytes"], "turn.mp4", { type: "video/mp4" })] } })
      await waitFor(() => assert.equal(calls.refs.length, 1))
      assert.ok(calls.refs[0][2].startsWith("data:video/mp4;base64,"), "a VIDEO rides the same door — any media kind boards")
    } finally {
      globalThis.FileReader = realReader
    }
    // the pack-file refusal: an uploaded .safetensors would land in
    // the estate input tree, not models/refmods/ — the loader cannot
    // resolve it, so the gesture refuses HERE with the seat's words
    const inp2 = screen.getByTestId("tl-call-mods-bucket").querySelector('input[type="file"][class*="squareFileInput"]') as HTMLInputElement
    fireEvent.change(inp2, { target: { files: [new File(["bytes"], "pack.safetensors", { type: "application/octet-stream" })] } })
    const err = await screen.findByTestId("tl-call-mods-error")
    assert.ok(err.textContent!.includes("is not media"), err.textContent)
    assert.deepEqual(calls.refs.length, 1, "the refused pack file never commits")
  })

  it("a foreign-URL drop refuses at the gesture (the M1 law rides the mods seat too — never mid-run)", async () => {
    const { d, calls } = deps({ modsListing: [] })
    render(<CallCard c={BASE} i={0} deps={d} />)
    const square = screen.getByRole("button", { name: "+ ref mods source" })
    fireEvent.drop(square, {
      dataTransfer: {
        getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: "https://foreign/shot.png" }) : ""),
        files: [],
      },
    })
    const err = await screen.findByTestId("tl-call-mods-error")
    assert.ok(err.textContent!.includes("not in this run"), err.textContent)
    assert.ok(!err.textContent!.includes("ref_mods entries are"), "the seat speaks its own words — the loud refusal stays compose-side")
    assert.deepEqual(calls.refs, [], "the refused drop never commits")
  })

  it("AN ESTATE-MEDIA drop commits in its canonical spelling (the any-media door boards the estate's live media)", async () => {
    const { d, calls } = deps({ modsListing: [] })
    render(<CallCard c={BASE} i={0} deps={d} />)
    const square = screen.getByRole("button", { name: "+ ref mods source" })
    fireEvent.drop(square, {
      dataTransfer: {
        getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: "/melite-media/runs/hero/sheet.png" }) : ""),
        files: [],
      },
    })
    await waitFor(() => assert.equal(calls.refs.length, 1))
    assert.equal(calls.refs[0][2], "/melite-media/runs/hero/sheet.png", "the estate media path commits canonical — media is legal refmod currency")
    assert.equal(screen.queryByTestId("tl-call-mods-error"), null, "estate media never refuses")
  })

  it("THE INTERIM DOOR (no listing): the pick face is honestly empty and the ANY-MEDIA file arm is the fallback write (the path form died 2026-11-05)", async () => {
    // (2026-10-20, the from-flow union: refArtifacts [] isolates the
    // no-listing degrade — the honest-empty arm pins the both-empty
    // face, the union arms pin the artifact face)
    const { d, calls } = deps({ refArtifacts: [] })
    render(<CallCard c={BASE} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    assert.ok(await screen.findByText("nothing to pick yet"), "no door, no rows — the honest empty, never a hidden fetch")
    assert.equal(screen.queryByTestId("tl-call-mod-path"), null, "the path form is dead — one square, one grammar")
    const realReader = globalThis.FileReader
    globalThis.FileReader = fakeReader("data:audio/wav;base64,QUJD") as unknown as typeof FileReader
    try {
      const inp = screen.getByTestId("tl-call-mods-bucket").querySelector('input[type="file"][class*="squareFileInput"]') as HTMLInputElement
      fireEvent.change(inp, { target: { files: [new File(["bytes"], "voice.wav", { type: "audio/wav" })] } })
      await waitFor(() => assert.equal(calls.refs.length, 1))
      assert.ok(calls.refs[0][2].startsWith("data:audio/wav;base64,"), "audio boards the fallback write — any media kind")
    } finally {
      globalThis.FileReader = realReader
    }
  })

  it("the strip verb keeps its seat and its wire law (the square's detach ✕ — the element changed with the grammar, never the behavior)", () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={{ ...BASE, refs: { mods: "refmods/a.safetensors, refmods/b.safetensors" } }} i={0} deps={d} />)
    const detaches = screen.getAllByRole("button", { name: /^Detach/ })
    assert.equal(detaches.length, 2)
    fireEvent.click(detaches[0]!)
    assert.deepEqual(calls.refs, [[0, "mods", "refmods/b.safetensors"]], "the strip removes exactly that pack")
  })

  it("THE FOLD LAWS (operator 2026-11-05: the call editor fold behavior is wrong — the BAR click owns the toggle): bar click opens; a click INSIDE the content never collapses the fold", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={d} />)
    // LAW 1: the BAR click toggles — the FULL bar (the row element,
    // not just its title text — the operator hits the whole bar)
    const bar = screen.getByText(studioCopy.knobsHead).closest("[class*=knobFold]") as HTMLElement | null
      ?? (screen.getByText(studioCopy.knobsHead).closest("div") as HTMLElement)
    fireEvent.click(bar)
    fireEvent.click(screen.getByText(studioCopy.knobsHead))
    const knob = await screen.findByLabelText("Call 0 knob: denoise")
    // LAW 2: interacting INSIDE the content (the knob's own face)
    // never rides the row toggle — the fold STAYS open, the edit lands
    fireEvent.change(knob, { target: { value: "0.5" } })
    assert.ok(screen.getByLabelText("Call 0 knob: denoise"), "the fold is still open after the content click")
    assert.deepEqual(calls.knobs, [[0, "denoise", 0.5]])
  })
})

// THE SPAN NOTE'S SEAT (operator 2026-11-05: the old inline note
// "end exclusive · edit ripples the cut into the neighbor" "makes
// zero sense" and belongs under the (i) icon) — the inline span is
// DEAD; the one fact rides the Tip seat in plain words.
describe("the span note seat (2026-11-05)", () => {
  it("the ⓘ tip carries the plain-words fact; the inline jargon span is gone", async () => {
    const h = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    const info = await screen.findByTestId("tl-span-info")
    assert.equal(info.textContent, "\u24d8")
    // the Tip's portal opens on hover — then the plain words show
    fireEvent.mouseEnter(info)
    await waitFor(() => {
      assert.ok(document.body.textContent?.includes("the frame where this call ends"),
        "the plain-words fact rides the tip portal")
    })
    assert.ok(!document.body.textContent?.includes("end exclusive"),
      "the jargon spelling is dead everywhere")
    h.unmount()
  })
})
