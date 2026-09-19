/**
 * CallCardsPanel — Layer B rail (BEHAVIORAL).
 *
 * PINS: global mode lists compact rows (click = focus that call);
 * focused mode is the call's editor with a back door; legacy
 * frame-exact keyframes edit/move/delete in global mode only.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { CallCardsPanel } from "../src/ui/studio/CallCardsPanel.tsx"
import type { DocCall, DocKeyframe } from "../src/ui/studio/docModel.ts"
import { fieldsOfEnvelope, type SpecField } from "@melite/card-base"
import { carrier } from "../src/card.ts"

// THE SERVED WALK (hour 22): the fold's schema truth, keyed by wire name.
const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()
const REAL_KNOB_FIELDS: Record<string, SpecField> = {}
for (const f of fieldsOfEnvelope(REAL_ENV as never, "h3-timeline")) REAL_KNOB_FIELDS[f.name] = f

const CALLS: DocCall[] = [
  { text: "opening", start_frame: 0, end_frame: 48, knobs: { denoise: 0.7 } },
  { start_frame: 48, end_frame: 96 },
]

function panel(over?: Record<string, unknown>) {
  const seen = {
    selected: [] as unknown[],
    moves: [] as [string, number][],
    deleted: [] as string[],
    sources: [] as [number, string][],
  }
  const p = {
    calls: CALLS,
    selected: null as { callIdx: number; beatIdx?: number } | null,
    setSelected: (s: unknown) => { seen.selected.push(s) },
    fps: 24,
    sourceOptions: [{ title: "up", name: "still-a" }],
    keyframes: [] as DocKeyframe[],
    handleKeyframeMove: (id: string, f: number) => { seen.moves.push([id, f]) },
    handleKeyframeDelete: (id: string) => { seen.deleted.push(id) },
    setKeyframeSource: (i: number, s: string) => { seen.sources.push([i, s]) },
    deps: {
      selected: null, fps: 24, knobFields: REAL_KNOB_FIELDS, callCardRefs: { current: [] },
      artifactIndex: { byName: new Map(), byUrl: new Map() }, linkGroups: [],
      isRef2va: false, refArtifacts: [],
      handlePromptDelete: () => {}, handlePromptUpdate: () => {},
      enhanceOne: () => {}, undoEnhance: () => {},
      enhancing: {}, enhanceErr: {}, enhanceUndo: {},
      setCallSpan: () => {}, setCallGuide: () => {}, setCallPrevSec: () => {},
      setCallTransition: () => {}, setCallRefs: () => {}, setCallKnob: () => {},
    },
    ...over,
  }
  return { p, seen }
}

describe("global mode (compact rows)", () => {
  it("rows excerpt + badge + duration; click focuses", () => {
    const { p, seen } = panel()
    render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByText("Model calls"))
    assert.ok(screen.getByText("opening"))
    assert.ok(screen.getByText("(empty — needs a prompt)"))
    // the LIST shows the DELIVERED duration (after the seam's carry):
    // the opener carries nothing; the carried second row delivers
    // 48 − 22 = 26f ≈ 1.1s (the span stays in the row's title).
    assert.equal(screen.getAllByText("2.0s").length, 1)
    assert.ok(screen.getByText("1.1s"))
    fireEvent.click(screen.getByText("opening"))
    assert.deepEqual(seen.selected, [{ callIdx: 0 }])
    // datalist carries the source options
    assert.equal(document.getElementById("tl-kf-sources")!.querySelectorAll("option").length, 1)
  })

  it("no options = bare datalist + fallback placeholder", () => {
    const { p } = panel({
      sourceOptions: [],
      keyframes: [{ frame: 10, kind: "clip", source: "" }],
    })
    render(<CallCardsPanel {...p} />)
    assert.equal(document.getElementById("tl-kf-sources")!.querySelectorAll("option").length, 0)
    const src = screen.getByLabelText("Keyframe 0 source") as HTMLInputElement
    assert.equal(src.placeholder, "uploaded filename…")
  })
})

describe("focused mode (one call's editor)", () => {
  it("back returns to global; beat flag shows", () => {
    const { p, seen } = panel({ selected: { callIdx: 1, beatIdx: 2 } })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByText("beat 3 selected"))
    assert.ok(document.querySelector('[data-call-card="1"]'))
    fireEvent.click(screen.getByLabelText("Back to global parameters"))
    assert.deepEqual(seen.selected, [null])
  })

  it("no beat = no flag; keyframes hide while focused", () => {
    const { p } = panel({
      selected: { callIdx: 0 },
      keyframes: [{ frame: 10, kind: "image", source: "still-a" }],
    })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.equal(screen.queryByText(/beat \d+ selected/), null)
    assert.equal(screen.queryByTestId("tl-keyframe-panel"), null)
  })
})

describe("legacy keyframes (global mode only)", () => {
  it("move / source / delete write; wired faces differ", () => {
    const { p, seen } = panel({
      keyframes: [
        { frame: 10, kind: "image", source: "still-a" },
        { frame: 20, kind: "audio", source: "  " },
      ],
    })
    render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByTestId("tl-keyframe-panel"))
    const rows = document.querySelectorAll("[data-kf-row]")
    assert.equal(rows.length, 2)
    assert.equal(rows[0]!.getAttribute("data-wired"), "true")
    assert.equal(rows[1]!.getAttribute("data-wired"), "false")
    fireEvent.change(screen.getByLabelText("Keyframe 0 frame"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("Keyframe 1 frame"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Keyframe 0 source"), { target: { value: "still-b" } })
    fireEvent.click(screen.getByLabelText("Delete keyframe 1"))
    assert.deepEqual(seen.moves, [["kf-0", 12]])
    assert.deepEqual(seen.sources, [[0, "still-b"]])
    assert.deepEqual(seen.deleted, ["kf-1"])
  })

  it("no keyframes = no panel", () => {
    const { p } = panel()
    render(<CallCardsPanel {...p} />)
    assert.equal(screen.queryByTestId("tl-keyframe-panel"), null)
  })
})
