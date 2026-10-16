/**
 * CallCardsPanel — Layer B rail (BEHAVIORAL).
 *
 * PINS: global mode lists compact rows (click = focus that call);
 * focused mode is the call's editor with a back door; the keyframes
 * editor is its OWN STANDALONE SUBVIEW (defect B, operator
 * 2026-11-06): kfView renders it ALONE — Layer A/B banned alongside.
 * Inside: the add door is an UPLOAD ICON beside the title (the
 * audio-lane grammar) and the rows are pick icons — NO input image
 * square renders anywhere.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CallCardsPanel } from "../src/ui/studio/CallCardsPanel.tsx"
import { useBeatMutations } from "../src/ui/studio/useBeatMutations.ts"
import type { DocCall, DocKeyframe } from "../src/ui/studio/docModel.ts"
import { fieldsOfEnvelope, type SpecField, bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"
import { DOC_FPS_DEFAULT } from "@melite/models-h3/timelineContract"
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
  const seenKf = {
    addedWithImage: [] as [string, number][],
    exited: [] as number[],
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
    setKeyframeImage: (i: number, s: string) => { seen.sources.push([i, s]) },
    kfView: false,
    exitKfView: () => { seenKf.exited.push(0) },
    addKeyframeWithImage: (image: string, frame: number) => { seenKf.addedWithImage.push([image, frame]); return "kf-new" },
    playheadDocFrame: 12,
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
  return { p, seen, seenKf }
}

describe("global mode (compact rows)", () => {
  it("THE LIST IS DEAD (operator 2026-11-05: \"people will know to click the timeline bar itself\") — global mode renders NO call rows, NO Model-calls head; selection flows through the bar alone", () => {
    const { p } = panel()
    render(<CallCardsPanel {...p} />)
    assert.equal(screen.queryByText("Model calls"), null, "the head is gone")
    assert.equal(screen.queryByText("opening"), null, "no excerpt rows")
    assert.equal(document.querySelectorAll("[data-call-row]").length, 0, "no row faces at all")
    // the datalist hand-roll is DEAD (the rail-law audit's square gap
    // c, 2026-10-31): source options ride the kf square's From-flow
    // rows, never a global <datalist> element.
    assert.equal(document.getElementById("tl-kf-sources"), null)
  })

  it("no options = no flow candidates (the honest empty, never a crash)", async () => {
    const { p } = panel({
      sourceOptions: [],
      kfView: true,
      keyframes: [{ image: "", frame: 10 }],
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

  it("the focused head carries the cut-position tail (cut i / n, F11's previewCutMeta)", () => {
    const { p } = panel({ selected: { callIdx: 1 } })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByText("cut 2 / 2"), "the focused call's position reads in the SectionLabel tail")
  })

  it("the rail's heads ride the estate SectionLabel — no hand-rolled head spans (F5)", () => {
    const { p } = panel({
      selected: { callIdx: 0 },
      keyframes: [{ image: "", frame: 10 }],
    })
    render(<CallCardsPanel {...p} />)
    // SectionLabel's own module faces (hashed under the test
    // pipeline, the glb-stage pill wall's idiom): a hand-rolled head
    // span carries only the owner class, neither face. (The global
    // Model-calls head died with the list, 2026-11-05 — the
    // SURVIVING heads are the focused call's and Keyframes'.)
    const heads = screen.getAllByText("#0 · Model call 1")
    assert.ok(
      heads.some((el) => /_sectionLabelText_/.test(el.className)),
      "the panel's focused head is SectionLabel's label face (the card's own #0 chip is a chip, not a head)",
    )
  })

  it("the row badge died with the list (F7's seat was the global rows, killed 2026-11-05) — no Pill survives in global mode", () => {
    const { p } = panel()
    render(<CallCardsPanel {...p} />)
    assert.equal(document.querySelectorAll("[data-call-row]").length, 0)
  })

  it("THE KEYFRAME VIEW IS ITS OWN SUBVIEW (operator 2026-11-05: “WHY DO I SEE KEYFRAMES WHEN I AM IN THE MODEL CALL LAYER B VIEW”) — focused mode renders the call ONLY, never both", () => {
    const { p } = panel({
      selected: { callIdx: 0 },
      keyframes: [{ image: "still-a", frame: 10 }],
    })
    ;(p.deps as { selected: unknown }).selected = p.selected
    render(<CallCardsPanel {...p} />)
    assert.equal(screen.queryByTestId("tl-keyframe-panel"), null, "no kf panel inside a focused call")
  })
})

describe("THE STANDALONE KEYFRAMES SUBVIEW (defect B, operator 2026-11-06: its own submenu — the CALL modal grammar, mirrored)", () => {
  it("kfView gates the panel ALONE: Layer A/B banned alongside; pins are NOT the gate — the subview renders empty too", () => {
    // closed view: no panel, whatever the pins (the global rail is the run's parameters alone)
    const closed = panel({ keyframes: [{ image: "still-a", frame: 10 }] })
    const h1 = render(<CallCardsPanel {...closed.p} />)
    assert.equal(screen.queryByTestId("tl-keyframe-panel"), null, "no kf panel outside its subview")
    h1.unmount()
    // open view with ZERO pins: the panel renders with its empty face —
    // the add door beside the title is the FIRST pin's door
    const open = panel({ kfView: true })
    const h2 = render(<CallCardsPanel {...open.p} />)
    assert.ok(screen.getByTestId("tl-keyframe-panel"), "the subview renders even with no pins")
    assert.ok(screen.getByTestId("tl-kf-add"), "the add door rides beside the title")
    assert.ok(screen.getByText(/No pins yet/), "the empty face names the pin doors")
    h2.unmount()
    // open view with a selected call carried over: the kf panel wins —
    // no call card renders alongside (the ban, both directions)
    const mixed = panel({
      kfView: true,
      selected: { callIdx: 0 },
      keyframes: [{ image: "still-a", frame: 10 }],
    })
    ;(mixed.p.deps as { selected: unknown }).selected = mixed.p.selected
    const h3 = render(<CallCardsPanel {...mixed.p} />)
    assert.ok(screen.getByTestId("tl-keyframe-panel"))
    assert.equal(document.querySelectorAll("[data-call-card]").length, 0, "Layer B is banned alongside the subview")
    h3.unmount()
  })

  it("the back button leaves the subview (the focused call's own grammar)", () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByLabelText("Back to global parameters"))
    assert.deepEqual(seenKf.exited, [0], "the back verb rides the tenant's exit")
    h.unmount()
  })

  it("move / source / delete write; wired faces differ; NO INPUT IMAGE SQUARE renders", async () => {
    const { p, seen } = panel({
      kfView: true,
      keyframes: [
        { image: "still-a", frame: 10 },
        { image: "  ", frame: 20 },
      ],
    })
    const h = render(<CallCardsPanel {...p} />)
    assert.ok(screen.getByTestId("tl-keyframe-panel"))
    const rows = document.querySelectorAll("[data-kf-row]")
    assert.equal(rows.length, 2)
    assert.equal(rows[0]!.getAttribute("data-wired"), "true")
    assert.equal(rows[1]!.getAttribute("data-wired"), "false")
    // (2026-11-05) THE MOVE VERB IS THE LANE DRAG's — the frame
    // input died (a keyframe is ONE frame, positioned by drag); the
    // row states the timestamp only
    assert.equal(screen.queryByLabelText("Keyframe 0 frame"), null, "no frame input")
    // DEFECT B: the rows work like the AUDIO UPLOAD INPUTS — a pick
    // icon per row, NO SourceRow square, NO img face anywhere
    assert.equal(document.querySelectorAll("[data-source-row]").length, 0, "no SourceRow square renders")
    assert.equal(document.querySelectorAll("img").length, 0, "no image face renders — the icon grammar owns the row")
    // THE SOURCE WRITE rides the pick icon: From flow → the upstream
    // artifact row → the URL→NAME translation (the NAME is what
    // _resolveSource resolves at run time).
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("up · still-a"))
    fireEvent.click(screen.getByLabelText("Delete keyframe 1"))
    assert.deepEqual(seen.moves, [], "moves ride the lane drag, never a typed number")
    // (D1) the source write rides the fit's promise chain — await it
    await waitFor(() => { assert.equal(seen.sources.length, 1) })
    assert.deepEqual(seen.sources, [[0, "still-a"]])
    assert.deepEqual(seen.deleted, ["kf-1"])
    h.unmount()
  })

  it("THE ADD DOOR beside the title: a pick lands pin+image at the PLAYHEAD in one write", async () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("up · still-a"))
    await waitFor(() => { assert.equal(seenKf.addedWithImage.length, 1) })
    assert.deepEqual(seenKf.addedWithImage[0], ["still-a", 12], "the pin lands at the playhead frame with the artifact NAME")
    h.unmount()
  })

  it("the add door's From-file success: an honest image lands a data: pin at the playhead (one write)", async () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(0), { target: { files: [new File(["bytes"], "a.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(seenKf.addedWithImage.length, 1) })
    assert.ok(seenKf.addedWithImage[0]![0]!.startsWith("data:image/png;base64,"), seenKf.addedWithImage[0]![0])
    assert.equal(screen.queryByTestId("tl-kf-add-error"), null, "a clean read leaves no refusal")
    h.unmount()
  })

  it("the add door's From-file read failure refuses with the read error — never a pin", async () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [] })
    const h = render(<CallCardsPanel {...p} />)
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL(): void { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.click(screen.getByTestId("tl-kf-add"))
      fireEvent.click(await screen.findByText("From file"))
      fireEvent.change(fileInput(0), { target: { files: [new File(["x"], "bad.png", { type: "image/png" })] } })
      const err = await screen.findByTestId("tl-kf-add-error")
      assert.ok(err.textContent!.includes("could not read that file"), err.textContent)
    } finally {
      vi.unstubAllGlobals()
    }
    assert.deepEqual(seenKf.addedWithImage, [], "the unreadable file never pins")
    h.unmount()
  })

  it("a FOREIGN media URL at the add door refuses on its own seat — the row seats stay clean", async () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
    const h = render(<CallCardsPanel {...p} />)
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [{ url: "https://lib/foreign.png", name: "foreign.png" }] } }) } } as never)
    try {
      fireEvent.click(screen.getByTestId("tl-kf-add"))
      fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
      const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("foreign.png"))!
      fireEvent.click(row)
      const err = await screen.findByTestId("tl-kf-add-error")
      assert.ok(err.textContent!.includes("not in this run"), err.textContent)
      assert.equal(screen.queryByTestId("tl-kf-source-error-0"), null, "the row seats stay clean")
    } finally {
      unbindEstateRemote()
    }
    assert.deepEqual(seenKf.addedWithImage, [], "a foreign URL never pins")
    h.unmount()
  })

  it("the clear row at the add door commits the empty string — the guard returns, never a pin", async () => {
    const { p, seenKf } = panel({ kfView: true, keyframes: [] })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(seenKf.addedWithImage, [], "an empty pick never pins")
    h.unmount()
  })

  it("the add door's refusal lands its OWN seat (tl-kf-add-error — never a row's)", async () => {
    const { p, seenKf } = panel({
      kfView: true,
      keyframes: [{ image: "", frame: 10 }],
    })
    const h = render(<CallCardsPanel {...p} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(0), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    const err = await screen.findByTestId("tl-kf-add-error")
    assert.ok(err.textContent!.includes("wrong file type (video/mp4"), err.textContent)
    assert.equal(screen.queryByTestId("tl-kf-source-error-0"), null, "the row seats stay clean")
    assert.deepEqual(seenKf.addedWithImage, [], "the refused file never writes")
    h.unmount()
  })

  it("the kf head rides the estate SectionLabel in its own subview (F5's surviving seat)", () => {
    const { p } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
    const h = render(<CallCardsPanel {...p} />)
    assert.match(screen.getByText("Keyframes").className, /_sectionLabelText_/, "the kf head is SectionLabel's label face")
    h.unmount()
  })

  // (timeline-plane wave-2 G5) the row's seconds label was unwalled —
  // the audit's S7 seat rode doc fps correctly but no wall pinned the
  // VALUE. Both arms derive the expected seconds through the clock:
  // the const at the doc-clock arm, the prop at the stated arm — a
  // frozen literal at the seat reds one of the two.
  describe("the keyframe seconds label's clock (G5)", () => {
    it("the pin's seconds divide by DOC_FPS_DEFAULT (the doc clock)", () => {
      const { p } = panel({ kfView: true, fps: DOC_FPS_DEFAULT, keyframes: [{ image: "still-a", frame: 48 }] })
      const h = render(<CallCardsPanel {...p} />)
      assert.ok(
        screen.getByText(`${(48 / DOC_FPS_DEFAULT).toFixed(2)}s`),
        `48 frames book ${(48 / DOC_FPS_DEFAULT).toFixed(2)}s at the doc clock`,
      )
      h.unmount()
    })

    it("the label rides the panel's OWN fps — a stated 12fps doc books double", () => {
      const { p } = panel({ kfView: true, fps: 12, keyframes: [{ image: "still-a", frame: 48 }] })
      const h = render(<CallCardsPanel {...p} />)
      assert.ok(screen.getByText(`${(48 / 12).toFixed(2)}s`), "48 frames book 4.00s at 12fps")
      h.unmount()
    })
  })
})

/** The kf seat's hidden OS-dialog inputs (the From-file doors).
 * TWO providers ride the subview — the add door's menu first, the
 * row picker's second — so the arm names its door by index (the row
 * door is the default: the last input mounted). */
const fileInput = (from = 1): HTMLInputElement => {
  const inputs = document.body.querySelectorAll('input[type="file"]')
  return inputs[from === 0 ? 0 : inputs.length - 1]! as HTMLInputElement
}

describe("the kf pick icons (the audio-lane grammar at the keyframe rows)", () => {
  it("a wrong-genre upload refuses at the seat — the shared genre gate, the shared words, no write", async () => {
    const { p, seen } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
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
    const { p } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
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
    const { p, seen } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
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
    const { p, seen } = panel({ kfView: true, keyframes: [{ image: "", frame: 10 }] })
    const h = render(<CallCardsPanel {...p} />)
    // a refusal first, so the CLEAR is observable (not just the write)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    await screen.findByTestId("tl-kf-source-error-0")
    // the retry is a NEW gesture (the provider's From-file door is
    // one-shot per opening — the field token is consumed on commit)
    fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
    fireEvent.click(await screen.findByText("From file"))
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "a.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(seen.sources.length, 1) })
    assert.ok(seen.sources[0]![1]!.startsWith("data:image/png;base64,"), seen.sources[0]![1])
    assert.equal(screen.queryByTestId("tl-kf-source-error-0"), null, "the retry clears the refusal")
    h.unmount()
  })

  it("NO SQUARE, NO IMG — the wired value states nothing visual (the icon grammar owns the row; the timestamp is the face)", () => {
    const { p } = panel({
      kfView: true,
      keyframes: [
        { image: "data:image/png;base64,AAAA", frame: 5 },
        { image: "not-in-index", frame: 6 },
        { image: "https://u/zzz.png", frame: 7 },
      ],
    })
    const h = render(<CallCardsPanel {...p} />)
    assert.equal(document.querySelectorAll("img").length, 0, "no image face renders — defect B's square ban")
    assert.equal(document.querySelectorAll("[data-source-row]").length, 0, "no SourceRow renders")
    // the rows still carry their wired state + timestamps (the doc's truth)
    assert.equal(document.querySelectorAll("[data-kf-row]").length, 3)
    assert.ok(screen.getByText("0.21s"), "the timestamp readout is the row's face")
    h.unmount()
  })

  it("pick arms (defect B: replace is the verb — no clear escape; a foreign media URL refuses; an estate media path and a data: row commit)", async () => {
    const { p, seen } = panel({ kfView: true, keyframes: [{ image: "still-a", frame: 10 }] })
    bindEstateRemote({
      bench: { get: async () => ({ ok: true, value: {} }) },
      media: { list: async () => ({ ok: true, value: { items: [
        { url: "https://foreign/x.png", name: "foreign" },
        { url: "/melite-media/runs/hero/sheet.png", name: "estate" },
        { url: "data:image/png;base64,BBBB", name: "inline" },
      ] } }) },
    } as never)
    let h: ReturnType<typeof render>
    try {
      h = render(<CallCardsPanel {...p} />)
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
      // ESTATE MEDIA: the estate's own path commits in the canonical
      // live spelling (2026-11-05 law, carried through the icon door)
      fireEvent.click(screen.getByLabelText("Keyframe 0 source"))
      fireEvent.click(await screen.findByText("From media"))
      const rowE = await screen.findByText("estate")
      let clickE: HTMLElement | null = rowE.closest("button")
      if (clickE === null) {
        let hop: HTMLElement | null = rowE
        while (hop && clickE === null) { hop = hop.parentElement; clickE = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(clickE ?? rowE)
      await waitFor(() => { assert.equal(seen.sources.length, 1) })
      assert.deepEqual(seen.sources[0], [0, "/melite-media/runs/hero/sheet.png"])
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

describe("THE ADD DOOR THROUGH THE REAL HOOK (infra audit #2, mounted half — 2026-11-06)", () => {
  // The mock-prop seats above judge the PANEL's grammar; this
  // describe judges the LAW at its true seat: the door's commit is
  // the REAL useBeatMutations over real useState — every pin it
  // lands is the hook's own write into live state, snapshotted per
  // render so the atomic law is observed, not assumed.
  const pins: DocKeyframe[][] = []
  function RealHookHost({ playheadDocFrame, deps }: { playheadDocFrame: number; deps: unknown }) {
    const [keyframes, setKeyframes] = useState<DocKeyframe[]>([])
    const m = useBeatMutations(keyframes, setKeyframes)
    pins.push(keyframes)
    return (
      <CallCardsPanel
        calls={CALLS} selected={null} setSelected={() => {}} fps={24}
        sourceOptions={[{ title: "up", name: "still-a" }]}
        keyframes={keyframes}
        handleKeyframeMove={m.handleKeyframeMove}
        handleKeyframeDelete={m.handleKeyframeDelete}
        setKeyframeImage={m.setKeyframeImage}
        kfView exitKfView={() => {}}
        addKeyframeWithImage={m.addKeyframeWithImage}
        playheadDocFrame={playheadDocFrame}
        deps={deps as never}
      />
    )
  }

  it("the From-file door lands pin + image in ONE write (the atomic law, mounted)", async () => {
    const { p } = panel()
    pins.length = 0
    const h = render(<RealHookHost playheadDocFrame={31} deps={p.deps} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("From file"))
    // the add door's input is the FIRST of the subview's two hidden
    // inputs (the row picker mounts second — see fileInput's note)
    fireEvent.change(fileInput(0), { target: { files: [new File(["bytes"], "pin.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(pins.at(-1)!.length, 1) })
    const landed = pins.at(-1)![0]!
    assert.equal(landed.frame, 31, "the pin lands at the playhead")
    assert.ok(landed.image.startsWith("data:image/png;base64,"), landed.image)
    // THE ATOMIC LAW'S MOUNTED FACE: every observed snapshot between
    // empty and landed is either empty or already wired — an
    // imageless pin followed by a second write is never observable
    for (const snap of pins) {
      for (const k of snap) {
        assert.ok(k.image.trim() !== "", `no imageless pin snapshot (saw ${JSON.stringify(snap)})`)
      }
    }
    // and the wired face proves it end to end (the row's own state)
    assert.equal(document.querySelector('[data-kf-row="0"]')?.getAttribute("data-wired"), "true")
    h.unmount()
  })

  it("the From-flow door commits the artifact NAME through the real hook (the wire law, mounted)", async () => {
    const { p } = panel()
    pins.length = 0
    const h = render(<RealHookHost playheadDocFrame={12} deps={p.deps} />)
    fireEvent.click(screen.getByTestId("tl-kf-add"))
    fireEvent.click(await screen.findByText("From flow"))
    const row = await screen.findByText("up · still-a")
    fireEvent.click(row.closest("button") ?? row)
    await waitFor(() => { assert.equal(pins.at(-1)!.length, 1) })
    // the URL the picker handed the door became the ctx-key NAME (the
    // estate re-resolves names each run) — one atomic write
    assert.deepEqual(pins.at(-1)![0], { image: "still-a", frame: 12 })
    h.unmount()
  })
})
