/**
 * CallCardsPanel — Layer B rail (BEHAVIORAL).
 *
 * PINS: global mode lists compact rows (click = focus that call);
 * focused mode is the call's editor with a back door; legacy
 * frame-exact keyframes edit/move/delete in global mode only.
 * The kf SOURCE seat rides the SourceRow grammar (square gap c,
 * 2026-10-31): the shared upload gate, the URL→NAME translation,
 * and the foreign-URL refusal at the gesture.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CallCardsPanel } from "../src/ui/studio/CallCardsPanel.tsx"
import type { DocCall, DocKeyframe } from "../src/ui/studio/docModel.ts"
import { fieldsOfEnvelope, type SpecField, bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"
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
      artifactIndex: {
        byName: new Map([["still-a", "https://u/a.png"]]),
        byUrl: new Map([["https://u/a.png", "still-a"]]),
      }, linkGroups: [], guideLinks: { clip: [], audio: [] },
      refArtifacts: [],
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
    // the datalist hand-roll is DEAD (the rail-law audit's square gap
    // c, 2026-10-31): source options ride the kf square's From-flow
    // rows, never a global <datalist> element.
    assert.equal(document.getElementById("tl-kf-sources"), null)
  })

  it("no options = no flow candidates (the honest empty, never a crash)", async () => {
    const { p } = panel({
      sourceOptions: [],
      keyframes: [{ frame: 10, kind: "clip", source: "" }],
    })
    render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From flow"))
    assert.ok(await screen.findByText("nothing to pick yet"))
  })
})

describe("focused mode (one call's editor)", () => {
  it("back returns to global", () => {
    const { p, seen } = panel({ selected: { callIdx: 1 } })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.ok(document.querySelector('[data-call-card="1"]'))
    fireEvent.click(screen.getByLabelText("Back to global parameters"))
    assert.deepEqual(seen.selected, [null])
  })

  it("keyframes stay wired WHILE FOCUSED (the readout says “wire them below” — the door exists in every mode)", () => {
    const { p } = panel({
      selected: { callIdx: 0 },
      keyframes: [{ frame: 10, kind: "image", source: "still-a" }],
    })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByTestId("tl-keyframe-panel"))
  })
})

describe("legacy keyframes (global mode only)", () => {
  it("move / source / delete write; wired faces differ", async () => {
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
    // THE SOURCE WRITE rides the SourceRow grammar (the datalist
    // hand-roll is dead): From flow → the upstream artifact row →
    // the URL→NAME translation (the NAME is what _resolveSource
    // resolves at run time).
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("up · still-a"))
    fireEvent.click(screen.getByLabelText("Delete keyframe 1"))
    assert.deepEqual(seen.moves, [["kf-0", 12]])
    assert.deepEqual(seen.sources, [[0, "still-a"]])
    assert.deepEqual(seen.deleted, ["kf-1"])
  })

  it("no keyframes = no panel", () => {
    const { p } = panel()
    render(<CallCardsPanel {...p} />)
    assert.equal(screen.queryByTestId("tl-keyframe-panel"), null)
  })
})

/** The kf seat's hidden OS-dialog input (the From-file door). */
const fileInput = (): HTMLInputElement => {
  const inputs = document.body.querySelectorAll('input[type="file"]')
  return inputs[inputs.length - 1]! as HTMLInputElement
}

describe("the kf source seat (the SourceRow grammar at the keyframe rows)", () => {
  it("a wrong-genre upload refuses at the seat — the shared genre gate, the shared words, no write", async () => {
    const { p, seen } = panel({ keyframes: [{ frame: 10, kind: "image", source: "" }] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    const err = await screen.findByTestId("tl-kf-source-error-0")
    assert.ok(err.textContent!.includes("wrong file type (video/mp4"), err.textContent)
    assert.ok(err.textContent!.includes("expected image/*"), err.textContent)
    assert.deepEqual(seen.sources, [], "no commit — the refusal is the whole write")
    h.unmount()
  })

  it("an oversize image refuses at the image cap (20 MB — the genre's own law)", async () => {
    const { p } = panel({ keyframes: [{ frame: 10, kind: "image", source: "" }] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(), {
      target: { files: [new File([new ArrayBuffer(21 * 1024 * 1024)], "big.png", { type: "image/png" })] },
    })
    const err = await screen.findByTestId("tl-kf-source-error-0")
    assert.ok(err.textContent!.includes("file too large (max 20 MB)"), err.textContent)
    h.unmount()
  })

  it("an unreadable file refuses, never throws (the read arm's one spelling)", async () => {
    const { p, seen } = panel({ keyframes: [{ frame: 10, kind: "image", source: "" }] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.change(fileInput(), { target: { files: [new File(["x"], "bad.png", { type: "image/png" })] } })
      const err = await screen.findByTestId("tl-kf-source-error-0")
      assert.ok(err.textContent!.includes("could not read that file"), err.textContent)
    } finally {
      vi.unstubAllGlobals()
    }
    assert.deepEqual(seen.sources, [])
    h.unmount()
  })

  it("an honest image upload lands as a data: source and clears the refusal", async () => {
    const { p, seen } = panel({ keyframes: [{ frame: 10, kind: "image", source: "" }] })
    const h = render(<CallCardsPanel {...p} />)
    // a refusal first, so the CLEAR is observable (not just the write)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    await screen.findByTestId("tl-kf-source-error-0")
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "a.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(seen.sources.length, 1) })
    assert.ok(seen.sources[0]![1]!.startsWith("data:image/png;base64,"), seen.sources[0]![1])
    assert.equal(screen.queryByTestId("tl-kf-source-error-0"), null, "the retry clears the refusal")
    h.unmount()
  })

  it("the value chain: a data: source renders; an unindexed name rides the metric face; a raw URL rides through", () => {
    const { p } = panel({
      // gone-b names an option the index cannot serve — the row's
      // url rides the honest empty (the candidate's ?? "" arm)
      sourceOptions: [{ title: "up", name: "still-a" }, { title: "dead", name: "gone-b" }],
      keyframes: [
        { frame: 5, kind: "image", source: "data:image/png;base64,AAAA" },
        { frame: 6, kind: "image", source: "not-in-index" },
        { frame: 7, kind: "image", source: "https://u/zzz.png" },
      ],
    })
    const h = render(<CallCardsPanel {...p} />)
    assert.ok(document.querySelector('img[src^="data:image/png;base64,"]'), "a data: source renders its bytes inline")
    assert.ok(screen.getByText("not-in-index"), "a name the index cannot serve rides the metric face, verbatim")
    assert.ok(document.querySelector('img[src="https://u/zzz.png"]'), "a raw URL rides through as the square's value")
    h.unmount()
  })

  it("onEdit arms: — clear — writes ''; a foreign media URL refuses at the gesture; a data: media row commits direct", async () => {
    const { p, seen } = panel({ keyframes: [{ frame: 10, kind: "image", source: "still-a" }] })
    bindEstateRemote({
      bench: { get: async () => ({ ok: true, value: {} }) },
      media: { list: async () => ({ ok: true, value: { items: [
        { url: "https://foreign/x.png", name: "foreign" },
        { url: "data:image/png;base64,BBBB", name: "inline" },
      ] } }) },
    } as never)
    let h: ReturnType<typeof render>
    try {
      h = render(<CallCardsPanel {...p} />)
      // CLEAR: the menu's danger verb writes the empty string
      fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
      fireEvent.click(await screen.findByText("— clear —"))
      await waitFor(() => { assert.deepEqual(seen.sources, [[0, ""]]) })
      // FOREIGN: a From-media URL the run never produced refuses loud
      fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
      fireEvent.click(await screen.findByText("From media"))
      const row = await screen.findByText("foreign")
      let click0: HTMLElement | null = row.closest("button")
      if (click0 === null) {
        let hop: HTMLElement | null = row
        while (hop && click0 === null) { hop = hop.parentElement; click0 = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(click0 ?? row)
      const err = await screen.findByTestId("tl-kf-source-error-0")
      assert.ok(err.textContent!.includes("not in this run"), err.textContent)
      // INLINE: a data: media row commits directly (the name→URL
      // translation is for run artifacts only)
      fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
      fireEvent.click(await screen.findByText("From media"))
      const row2 = await screen.findByText("inline")
      let click2: HTMLElement | null = row2.closest("button")
      if (click2 === null) {
        let hop: HTMLElement | null = row2
        while (hop && click2 === null) { hop = hop.parentElement; click2 = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(click2 ?? row2)
      await waitFor(() => { assert.equal(seen.sources.length, 2) })
      assert.deepEqual(seen.sources[1], [0, "data:image/png;base64,BBBB"])
    } finally {
      unbindEstateRemote()
      h!.unmount()
    }
  })
})
