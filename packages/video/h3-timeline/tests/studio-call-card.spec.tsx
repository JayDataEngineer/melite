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
import { fireEvent, render, screen } from "@testing-library/react"
import { CallCard } from "../src/ui/studio/CallCard.tsx"
import type { DocCall } from "../src/ui/studio/docModel.ts"

const BY_NAME = new Map([["still-a", "https://u/a.png"]])
const BY_URL = new Map([...BY_NAME].map(([n, u]) => [u, n] as [string, string]))

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
    callCardRefs: { current: [] as (HTMLDivElement | null)[] },
    artifactIndex: { byName: BY_NAME, byUrl: BY_URL },
    linkGroups: [],
    isRef2va: false,
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
    setCallPrevSec: (i: number, s: number | null) => { calls.prevs.push([i, s]) },
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
      <CallCard c={{ ...BASE, knobs: { denoise: 0.7, sampler: "euler" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByText("2 knobs"))
    two.unmount()
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

  it("the first-frame subcard writes through (image + seam)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, image: "still-a" }} i={1} deps={d} />)
    // the subcard's square (its own label hides — the wire square reads "source")
    fireEvent.click(screen.getByLabelText("source"))
    fireEvent.click(await screen.findByText("— clear —"))
    fireEvent.change(screen.getByLabelText("Call 1 seam mode"), { target: { value: "extend" } })
    assert.deepEqual(calls.guides, [[1, "image", ""]])
    assert.deepEqual(calls.trans, [[1, "extend"]])
  })

  it("guide inputs write; blanks wear the empty face", () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, audio: "a1" }} i={0} deps={d} />)
    const clip = screen.getByLabelText("Call 0 clip guide") as HTMLInputElement
    assert.ok(clip.className.includes("guideInEmpty"))
    fireEvent.change(clip, { target: { value: "c1" } })
    const audio = screen.getByLabelText("Call 0 audio guide") as HTMLInputElement
    assert.ok(!audio.className.includes("guideInEmpty"))
    assert.deepEqual(calls.guides, [[0, "clip", "c1"]])
    expect(clip.placeholder).toBe("clip")
  })
})

describe("the ref badge (guide + extras)", () => {
  it("zero refs = no badge", () => {
    render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.equal(screen.queryByTestId("tl-call-ref-images"), null)
  })

  it("one ref reads singular; two read plural", () => {
    const h1 = render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps().d} />)
    const b1 = screen.getByTestId("tl-call-ref-images")
    assert.ok(b1.textContent!.includes("refs 1/10"))
    assert.ok(b1.querySelector("span")!.title.includes("1 ref image (guide + extras)"))
    h1.unmount()
    const h2 = render(
      <CallCard c={{ ...BASE, image: "still-a", refs: { images: "still-a" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("refs 2/10"))
    h2.unmount()
  })

  it("over the 10-image cap wears the over face", () => {
    const names = Array.from({ length: 11 }, (_, k) => `r${k}`).join(", ")
    render(<CallCard c={{ ...BASE, refs: { images: names } }} i={0} deps={deps().d} />)
    const b = screen.getByTestId("tl-call-ref-images")
    assert.ok(b.textContent!.includes("refs 11/10"))
    assert.ok(b.innerHTML.includes("refBadgeOver"))
  })
})

describe("identity refs + knob fold", () => {
  it("non-Ref2VA calls own no identity block", () => {
    render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.equal(screen.queryByTestId("tl-call-refs"), null)
  })

  it("Ref2VA: pick writes, last removal inherits (empty string)", () => {
    const { d, calls } = deps({ isRef2va: true })
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
    fireEvent.change(screen.getByLabelText("Add call 0 Ref images"), { target: { value: "ra" } })
    assert.deepEqual(calls.refs, [[0, "images", "ra"]])
    fireEvent.click(screen.getByLabelText("Remove Ref images ra"))
    assert.deepEqual(calls.refs, [[0, "images", "ra"], [0, "images", ""]])
  })

  it("the knob fold replaces per call (first call owns no prev)", () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={d} />)
    fireEvent.change(screen.getByLabelText("Call 0 knob: denoise"), { target: { value: "0.5" } })
    assert.deepEqual(calls.knobs, [[0, "denoise", 0.5]])
    assert.ok(screen.getByText("the first call has no previous video to continue from"))
  })

  it("later calls own a live prev door", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={1} deps={d} />)
    assert.equal(screen.queryByText("the first call has no previous video to continue from"), null)
    fireEvent.click(screen.getByLabelText("Call 1 continue from previous"))
    assert.deepEqual(calls.prevs, [[1, 2]])
    assert.deepEqual(calls.trans, [])
  })
})
