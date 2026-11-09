/**
 * THE V2V WINDOWS FORM FACE (queue 11 REOPENED — the operator's
 * correction, 2026-11-08, with the live DOM dumps of their REAL
 * doc): "Doesn't have a cut here. … NO WINDOWS IN THE FORM! BOOM
 * KNEECASP GONE!" — the strip-head seat alone was MY reading; the
 * operator's law seats the windows + the split-by-timestamp IN THE
 * VIDEO2VIDEO FORM: "the part of the video2video form that would
 * allow clips to split by timestamp. I.e. split at 2 seconds, with
 * the option to select how context is carried."
 *
 * THE WALLS (the re-owed row's own spell):
 * - THE FACE — the operator's REAL doc shape (the edit bag with its
 *   axes + the loras bag CO-ARMED + one long window at 24fps) opens
 *   the edit leaf and the FORM CARRIES THE WINDOWS: the list, the
 *   split seat (timestamp input + the VISIBLE three-state segmented
 *   + the cut verb).
 * - THE SPLIT LANDS THROUGH THE FORM — 2 seconds + carry pressed in
 *   the form commits the next calls array through the bench door
 *   (two windows, the seam at the lattice-snapped frame, the
 *   transition stating the selected carry).
 * - THE PARITY — ONE TRUTH, TWO DOORS, ONE LAW: the same fixture +
 *   the same gesture through the STRIP door and the FORM door and
 *   the PURE split verb produce the IDENTICAL calls array (the
 *   mutation updaters and the form face ride the same v2vSplit).
 */
// @vitest-environment happy-dom
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "../../../../tests/helpers/boot-models.ts"
import { specBody } from "../../../harness/melite-tools/src/discovery.ts"
import { loadCardDefs, theService } from "@melite/comfyui-cordis"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"
import { V2vLeafFace } from "../src/ui/studio/V2vLeafFace.tsx"
import { splitCallsAt } from "../src/ui/studio/v2vSplit.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { V2vWindowView } from "@melite/contracts"

// happy-dom returns zero rects (no layout) — the bar's ClientX→frame
// doors need a viewport width, as every real browser provides.
window.Element.prototype.getBoundingClientRect = function () {
  return {
    width: 800, height: 200, top: 0, left: 0, right: 800, bottom: 200,
    x: 0, y: 0, toJSON() {},
  } as DOMRect
}
// (the RO famine) happy-dom's ResizeObserver re-dispatches against
// the constant rect above into a sync spin. A no-op stub (not
// undefined): the chip's Tip constructs an RO UNGUARDED.
class RoStub { observe(): void {} unobserve(): void {} disconnect(): void {} }
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = RoStub

/** THE OPERATOR'S REAL DOC SHAPE (the live dumps' own shape): the
 *  edit bag armed with its axes + the LORAS bag CO-ARMED (the
 *  co-armed shape is the one the strip face failed under — every
 *  arm of this wall rides IT, never an edit-only convenience
 *  fixture) + ONE long window, 0–90 frames at 24fps (an ON-LATTICE
 *  span: 90 = 22+17·4, so the split law's lattice serves). */
const OPERATOR_DOC = {
  edit: [{
    edit_prompt: "make it rain",
    mask_source: "region",
    region_prompt: "the sky",
    denoise: 0.32,
    refine: true,
  }],
  loras: [{ id: "h3_silver_dareties" }],
  calls: [{ text: "a", start_frame: 0, end_frame: 90 }],
  fps: 24,
}

async function mountStudio(stageId: string, saved: Array<Record<string, unknown>>): Promise<() => void> {
  const body = specBody(theService(), await loadCardDefs(), {
    card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
  })
  vi.stubGlobal("fetch", (url: unknown) => {
    const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
    if (u.startsWith("/v1/form-spec")) {
      return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
  })
  const { unmount } = render(
    <VideoTimelineStudio
      stageId={stageId}
      cardName="h3-timeline"
      row={{ id: stageId, card: "h3-timeline", title: "H3 Timeline", params: OPERATOR_DOC }}
      runStatus=""
      onPatch={(p: Record<string, unknown>) => { saved.push(p) }}
      onRun={() => {}}
      onStop={() => {}}
      onRemove={() => {}}
      onSurface={() => {}}
      upstream={[]}
      runId={null}
    />,
  )
  return unmount
}

/** the seated edit bag's own tile — the operator's press door into
 *  the leaf (EDIT mode on the armed bag, never a re-add). */
async function openEditLeaf(): Promise<void> {
  const tile = await waitFor(() => {
    const el = document.querySelector('[data-mod-tile]')
    assert.ok(el, "the armed edit bag renders its tile")
    return el as HTMLElement
  }, { timeout: 4000 })
  fireEvent.click(tile)
  await waitFor(() => {
    assert.ok(document.querySelector('[data-v2v-face="windows"]'), "the leaf's windows face renders")
  }, { timeout: 4000 })
}

/** the split seat's segmented carry pick (the operator's 2026-11-09
 *  segmented law: all three states render VISIBLE — the pick is a
 *  button press, never a menu row). */
function pickCarrySegment(which: "cut" | "extend" | "carry+keyframe"): void {
  const btn = document.querySelector(`[data-testid="v2v-split-carry-${which}"]`)
  assert.ok(btn, `the ${which} segment renders in the split seat's segmented control`)
  fireEvent.click(btn as HTMLElement)
}

/** the STRIP door's own carry menu row (the strip head keeps its
 *  menu — only the leaf face went segmented; the strip door's
 *  matcher law: the stock row CONTAINS the word — match the row
 *  that STARTS with it). */
async function pickStripCarryRow(): Promise<void> {
  const row = await screen.findAllByRole("menuitem")
    .then((items) => items.find((n) => n.textContent?.toLowerCase().startsWith("carry") && !n.textContent?.toLowerCase().includes("keyframe")))
  assert.ok(row, "the Carry row serves in the strip's carry menu")
  fireEvent.click(row)
}

function lastCallsWrite(saved: Array<Record<string, unknown>>): DocCall[] {
  const withCalls = saved.filter((p) => Array.isArray(p.calls)) as Array<{ calls: DocCall[] }>
  assert.ok(withCalls.length > 0, `the press must land the calls write — got: ${JSON.stringify(saved)}`)
  return withCalls[withCalls.length - 1]!.calls
}

describe("THE V2V WINDOWS FORM FACE (queue 11 reopened — the operator's correction)", () => {
  it("THE FACE — the operator's real doc opens the edit leaf and the FORM CARRIES THE WINDOWS: the list + the split seat render inside the popup", async () => {
    const saved: Array<Record<string, unknown>> = []
    await mountStudio("s_ff", saved)
    await openEditLeaf()
    const dlg = screen.getByRole("dialog")
    // THE WINDOWS LIST (dump 1's charge: "NO WINDOWS IN THE FORM!")
    const face = dlg.querySelector('[data-v2v-face="windows"]')
    assert.ok(face, "the windows face renders inside the leaf popup")
    const windows = dlg.querySelectorAll("[data-v2v-window]")
    assert.equal(windows.length, 1, `the doc's one window lists in the form — got ${windows.length}`)
    assert.ok(windows[0]!.textContent?.includes("W1"), `the window row names itself — got "${windows[0]!.textContent}"`)
    // THE SPLIT SEAT (the operator's named seat: timestamp + the
    // VISIBLE three-state segmented + verb — no collapsed anchor
    // hiding the carry modes)
    assert.ok(dlg.querySelector('[data-testid="v2v-split-at"]'), "the timestamp input renders in the form")
    assert.ok(dlg.querySelector('[data-testid="v2v-split-carry"]'), "the carry segmented control renders in the form")
    for (const [id, label, tip] of [["cut", "Stock", "stock — no context carry"], ["extend", "Carry", "the latent tail continues across the seam at the proven 22-frame overlap"], ["carry+keyframe", "Carry + keyframe", "the previous window's final frame is pinned as this window's first frame"]] as const) {
      const seg = dlg.querySelector(`[data-testid="v2v-split-carry-${id}"]`)
      assert.ok(seg, `the ${id} segment renders visible (never behind a menu)`)
      assert.ok(seg!.textContent?.includes(label), `the ${id} segment carries its studioCopy seamMode label verbatim — got "${seg!.textContent}"`)
      assert.ok((seg as HTMLElement).title.includes(tip), `the ${id} segment's tip teaches verbatim — got "${(seg as HTMLElement).title}"`)
    }
    assert.ok(dlg.querySelector('[data-testid="v2v-split-cut"]'), "the split verb renders in the form")
    // THE FIELDS HOLD (the additive law — the face rides ABOVE the
    // grammar, it does not replace it)
    assert.ok(dlg.querySelector('input[type="number"]'), "the bag's own number fields still render beside the face")
  })

  it("THE SPLIT LANDS THROUGH THE FORM — 2 seconds + carry: the bench door receives the two-window doc, the seam at the lattice frame, the transition stating the carry", async () => {
    const saved: Array<Record<string, unknown>> = []
    await mountStudio("s_fs", saved)
    await openEditLeaf()
    // state the timestamp: 2 seconds (2 × 24fps = frame 48; the
    // lattice snaps to 56 — the nearest authored 22+17k point)
    const at = document.querySelector('[data-testid="v2v-split-at"]') as HTMLInputElement
    fireEvent.change(at, { target: { value: "2" } })
    fireEvent.input(at, { target: { value: "2" } })
    // pick the carry: extend (the 22-frame overlap) — a VISIBLE
    // segment press, never a menu row
    pickCarrySegment("extend")
    // press the cut IN THE FORM
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    await waitFor(() => {
      const doc = lastCallsWrite(saved)
      assert.equal(doc.length, 2, `two windows after the form's split — got ${JSON.stringify(doc)}`)
      assert.equal(doc[0]!.end_frame, 56,
        `the first half ends at 56 (2s → frame 48, snapped to the lattice) — got end ${doc[0]!.end_frame}`)
      assert.equal(doc[1]!.start_frame, 56, "the second half starts at the split frame")
      assert.equal(doc[1]!.transition, "extend",
        `the seam states the SELECTED carry — got ${JSON.stringify(doc[1]!.transition)}`)
    }, { timeout: 4000 })
  })

  it("THE PURE LAW'S OWN BRANCHES — the empty doc, the too-short window, the boundary and past-end gestures, the downstream rebase, and all three carries, each judged at the pure verb", () => {
    // THE EMPTY DOC refuses (the form's own empty-note voice covers
    // the same law at the face)
    assert.equal(splitCallsAt([], 48, "cut"), null, "an empty doc has nothing to split")
    // THE TOO-SHORT WINDOW refuses: [0,22) admits no interior
    // lattice point (22+17k ≥ 39 > 22)
    assert.equal(splitCallsAt([{ text: "a", start_frame: 0, end_frame: 22 }], 11, "cut"), null,
      "a floor-length window refuses (the doc keeps its identity)")
    // THE BOUNDARY GESTURE resolves the target window's midpoint,
    // never an append: gesture 56 on [{0,107)] splits at the
    // midpoint's own snapped lattice point
    const atBoundary = splitCallsAt([{ text: "a", start_frame: 0, end_frame: 107 }], 0, "cut")
    assert.ok(atBoundary !== null, "a boundary gesture cuts the target at its midpoint")
    assert.equal(atBoundary!.length, 2, "the boundary resolution lands a two-window doc")
    // THE PAST-END GESTURE resolves the LAST window's midpoint
    const pastEnd = splitCallsAt([{ text: "a", start_frame: 0, end_frame: 107 }], 10000, "cut")
    assert.ok(pastEnd !== null, "a past-the-end gesture cuts the last window")
    // THE DOWNSTREAM REBASE + THE THIRD CARRY: three windows, split
    // the first, the windows after the seam rebase by the cut price
    // and the window AFTER the new seam follows the reflowed start
    const THREE: DocCall[] = [
      { text: "one", start_frame: 0, end_frame: 107 },
      { text: "two", start_frame: 107, end_frame: 214 },
      { text: "three", start_frame: 214, end_frame: 321 },
    ]
    const withKeyframe = splitCallsAt(THREE, 48, "carry+keyframe")
    assert.ok(withKeyframe !== null, "the three-window split serves")
    assert.equal(withKeyframe!.length, 4, "the split grows the doc by one window")
    assert.equal(withKeyframe![1]!.transition, "carry+keyframe",
      "the seam states the THIRD carry (the segmented control's last state)")
    assert.ok(withKeyframe![2]!.start_frame >= THREE[1]!.start_frame,
      "the window after the seam rebases by the cut price (never left behind)")
    // THE STOCK CARRY keeps the split's own default seam
    const stock = splitCallsAt(THREE, 48, "cut")
    assert.ok(stock !== null && stock[1]!.transition === "cut",
      "the stock carry keeps the split's birth seam (cut)")
    // THE IDENTITY LAW: a refused split never mangles the doc
    const KEPT = [{ text: "a", start_frame: 0, end_frame: 22 }]
    const refused = splitCallsAt(KEPT, 11, "extend")
    assert.equal(refused, null, "the refusal is null")
    assert.deepEqual(KEPT, [{ text: "a", start_frame: 0, end_frame: 22 }], "the caller's array is untouched")
  })

  it("THE FACE'S OWN EDGES — the empty doc's own note, the unstated timestamp's refusal, and the refused split's loud voice (never a silent drop)", async () => {
    const saved: Array<Record<string, unknown>> = []
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    })
    vi.stubGlobal("fetch", (url: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
    })
    // THE EMPTY DOC, judged at the REAL component (the studio
    // hydrates an empty calls array to the starter doc by design —
    // the leaf's own empty branch is the face's own law): the
    // face's own note, and the press refuses in the form's words
    const commits: unknown[][] = []
    const { unmount } = render(
      <V2vLeafFace value={{ calls: [], fps: 24 }} onChange={(next) => { commits.push(next) }} />,
    )
    assert.ok(document.querySelector("[data-v2v-empty]"), "the empty doc's own note renders (not a bare list)")
    // THE UNSTATED TIMESTAMP: the press refuses LOUD, nothing lands
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    await waitFor(() => {
      assert.ok(document.querySelector("[data-v2v-refusal]"), "the unstated timestamp refuses in the form's words")
    }, { timeout: 4000 })
    assert.equal(commits.length, 0, "a refused press lands nothing (never a silent write)")
    // A REFUSED SPLIT (a floor-length window) refuses LOUD too: the
    // stated timestamp is legal prose, the window cannot halve
    unmount()
    const { unmount: u2 } = render(
      <V2vLeafFace
        value={{ calls: [{ text: "a", start_frame: 0, end_frame: 22 }], fps: 24 }}
        onChange={(next) => { commits.push(next) }}
      />,
    )
    const at = document.querySelector('[data-testid="v2v-split-at"]') as HTMLInputElement
    fireEvent.change(at, { target: { value: "0.5" } })
    fireEvent.input(at, { target: { value: "0.5" } })
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    await waitFor(() => {
      assert.ok(document.querySelector("[data-v2v-refusal]"), "the too-short window refuses in the form's words")
    }, { timeout: 4000 })
    assert.equal(commits.length, 0, "the refused split lands nothing")
    u2()
    // THE CLOCK FALLBACK + THE TEXTLESS ROW + THE VISIBLE THREE:
    // fps 0 falls to the film clock's 24; a window with no text
    // renders its row whole; the segmented control's three states
    // render WITHOUT opening anything (the collapsed-anchor burn:
    // no menu to open, no dismiss to need)
    const { unmount: u3 } = render(
      <V2vLeafFace
        value={{ calls: [
          // textless BY OMITTION (real docs carry windows whose
          // text key never landed — the face's row law holds on it)
          { start_frame: 0, end_frame: 107 } as DocCall,
          { text: "b", start_frame: 107, end_frame: 214 },
          { text: "c", start_frame: 214, end_frame: 321, transition: "extend" },
        ], fps: 0 }}
        onChange={(next) => { commits.push(next) }}
      />,
    )
    assert.ok(document.querySelector('[data-v2v-window="0"]')?.textContent?.includes("0.00s"),
      "fps 0 falls to the 24 clock (never a divide-by-zero)")
    assert.ok(document.querySelector('[data-v2v-window="1"]')?.textContent?.includes("extend"),
      "an UNSTATED seam's row states the engine's own default (carry) in the list — the old 'cut' label lied about the seam the engine renders")
    // THE VISIBLE THREE: every state present with zero gestures —
    // the operator's "ONE knob" burn dies here, not in a menu
    for (const id of ["cut", "extend", "carry+keyframe"] as const) {
      assert.ok(document.querySelector(`[data-testid="v2v-split-carry-${id}"]`),
        `the ${id} state renders visible with no menu opened`)
    }
    assert.equal(screen.queryAllByRole("menuitem").length, 0, "no menu owns the carry states anymore")
    // THE PRESS AT fps 0: the frame math falls to the 24 clock and
    // the split lands (1s × 24 = 24, snapped to the lattice's 22 —
    // the first window splits, three windows become four)
    const at3 = document.querySelector('[data-testid="v2v-split-at"]') as HTMLInputElement
    fireEvent.change(at3, { target: { value: "1" } })
    fireEvent.input(at3, { target: { value: "1" } })
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    await waitFor(() => {
      assert.equal(commits.length, 1, "the press at fps 0 lands the split through the 24 clock")
      assert.equal((commits[0] as DocCall[]).length, 4, "the three-window doc grows to four")
    }, { timeout: 4000 })
    u3()
  })

  it("THE PARITY — one truth, two doors: the same fixture + gesture through the STRIP door, the FORM door, and the PURE verb produce the IDENTICAL calls array", async () => {
    // THE PURE DOOR (the law itself): 1.5s × 24 = 36 → the lattice
    // snaps to 39 (22+17); the carry extends the seam
    const PURE = splitCallsAt(OPERATOR_DOC.calls as DocCall[], 36, "extend")
    assert.ok(PURE !== null, "the pure verb serves the gesture")

    // THE STRIP DOOR: the same doc through the strip head's seat
    const stripSaved: Array<Record<string, unknown>> = []
    const stripUnmount = await mountStudio("s_ps", stripSaved)
    const stripAt = await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-split-at"]') as HTMLInputElement
      assert.ok(el, "the strip's timestamp input renders (the edit bag swapped the lane)")
      return el
    }, { timeout: 4000 })
    fireEvent.change(stripAt, { target: { value: "1.5" } })
    fireEvent.input(stripAt, { target: { value: "1.5" } })
    fireEvent.click(await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-split-carry"]')
      assert.ok(el, "the strip's carry menu renders")
      return el as HTMLElement
    }, { timeout: 4000 }))
    await pickStripCarryRow()
    fireEvent.click(await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-add-cut"]')
      assert.ok(el, "the strip's cut door renders")
      return el as HTMLElement
    }, { timeout: 4000 }))
    const stripDoc = await waitFor(() => lastCallsWrite(stripSaved), { timeout: 4000 })
    assert.deepEqual(stripDoc, PURE,
      `the STRIP door's write equals the pure verb's array — strip ${JSON.stringify(stripDoc)} vs pure ${JSON.stringify(PURE)}`)
    stripUnmount()

    // THE FORM DOOR: the same doc through the leaf popup's seat
    const formSaved: Array<Record<string, unknown>> = []
    await mountStudio("s_pf", formSaved)
    await openEditLeaf()
    const at = document.querySelector('[data-testid="v2v-split-at"]') as HTMLInputElement
    fireEvent.change(at, { target: { value: "1.5" } })
    fireEvent.input(at, { target: { value: "1.5" } })
    pickCarrySegment("extend")
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    const formDoc = await waitFor(() => lastCallsWrite(formSaved), { timeout: 4000 })
    assert.deepEqual(formDoc, PURE,
      `the FORM door's write equals the pure verb's array — form ${JSON.stringify(formDoc)} vs pure ${JSON.stringify(PURE)}`)
    assert.deepEqual(formDoc, stripDoc, "the two doors write the IDENTICAL array (one law, two views)")
  })

  it("THE FACE'S OWN APPEARANCE (operator 2026-11-09: 'the modal that appears for vid2vid … looks awful') — the face styles ITSELF inline (the paint/bbox/orbit law: never a css module in the emit closure, never the host's stylesheet), the windows list is NOT a browser-default <ol>, and every row carries the panel-card recipe", () => {
    const commits: unknown[][] = []
    const { unmount } = render(
      <V2vLeafFace
        value={{ calls: [
          { text: "a", start_frame: 0, end_frame: 48 },
          { text: "b", start_frame: 48, end_frame: 96, transition: "carry" },
        ], fps: 24 }}
        onChange={(next) => { commits.push(next) }}
      />,
    )
    // THE LIST: no decimal numerals, no list indent — the face owns
    // the list's look, not the browser's default
    const list = document.querySelector("[data-v2v-windows]") as HTMLElement
    const listStyle = list.style
    assert.equal(listStyle.listStyle, "none", "the ol kills the browser's decimal numerals")
    assert.equal(listStyle.margin, "0px", "no default list margin")
    assert.equal(listStyle.padding, "0px", "no default list indent")
    assert.equal(listStyle.display, "flex", "the windows stack as a flex column, gap-spaced")
    // THE WINDOW ROWS: the panel-card recipe (hairline border +
    // layer background + radius), tabular numerals for the spans.
    // (jsdom cannot serialize a var() inside the border shorthand —
    // it parks the token in the longhands — so the token is judged
    // on the element's whole cssText, the honest "the recipe
    // carries the token" read.)
    const row = document.querySelector("[data-v2v-window='1']") as HTMLElement
    assert.ok(row.style.cssText.includes("var(--dsw-alias-border-l1)"), "the window row carries the hairline border token")
    assert.equal(row.style.background, "var(--dsw-alias-bg-layer-1)", "the window row carries the layer background token")
    assert.ok(row.style.borderRadius !== "", "the window row is rounded (the panel card voice)")
    assert.equal(row.style.fontVariantNumeric, "tabular-nums", "the span numerals align (W2 · 2.00s–4.00s reads as a column)")
    // THE SPLIT SEAT: one flex row — the timestamp input fills, the
    // carry segmented control and the split button ride beside it
    // (never unstyled inline blocks wrapping under each other)
    const seat = document.querySelector("[data-v2v-split-seat]") as HTMLElement
    assert.equal(seat.style.display, "flex", "the split seat lays out as one row")
    const at = document.querySelector('[data-testid="v2v-split-at"]') as HTMLInputElement
    assert.ok(at.style.flex.startsWith("1"), "the timestamp input fills the row's slack")
    // THE HEAD + HINT: the caption voice (uppercase, tracking) over
    // the muted hint — never two undifferentiated body paragraphs
    const head = document.querySelector("[data-v2v-head]") as HTMLElement
    assert.equal(head.style.textTransform, "uppercase", "the head is the caption voice")
    const hint = document.querySelector("[data-v2v-hint]") as HTMLElement
    assert.equal(hint.style.color, "var(--dsw-alias-label-tertiary)", "the hint is the muted voice")
    // THE REFUSAL: the error token, never undifferentiated body text
    fireEvent.click(document.querySelector('[data-testid="v2v-split-cut"]') as HTMLElement)
    const refusal = document.querySelector("[data-v2v-refusal]") as HTMLElement
    assert.ok(refusal !== null, "the refused press states itself")
    assert.equal(refusal.style.color, "var(--dsw-alias-state-error-primary)", "the refusal carries the error token")
    unmount()
  })

  it("THE PER-SEAM OVERRIDE (operator 2026-11-09: 'no per-window seam editor in the leaf') — every non-first window carries its own compact 3-state segmented, and a press commits ONLY that seam through onChange", () => {
    const commits: V2vWindowView[][] = []
    const { unmount } = render(
      <V2vLeafFace
        value={{ calls: [
          { text: "a", start_frame: 0, end_frame: 107 },
          { text: "b", start_frame: 107, end_frame: 214 },
          { text: "c", start_frame: 214, end_frame: 321, transition: "cut" },
        ] as DocCall[], fps: 24 }}
        onChange={(next) => { commits.push(next as V2vWindowView[]) }}
      />,
    )
    // THE FIRST WINDOW HAS NO SEAM (nothing joins into W1 — no
    // control, never an orphan seat)
    assert.equal(document.querySelector("[data-v2v-seam='0']"), null, "W1 carries no seam seat")
    // THE OTHERS DO — all three states visible, compact, the
    // strip's own vocabulary (seamMode labels, verbatim)
    for (const i of [1, 2]) {
      const seat = document.querySelector(`[data-v2v-seam='${i}']`)
      assert.ok(seat, `W${i + 1} carries its seam seat`)
      for (const [id, label] of [["cut", "Stock"], ["extend", "Carry"], ["carry+keyframe", "Carry + keyframe"]] as const) {
        const btn = seat!.querySelector(`[data-testid="v2v-seam-${i}-${id}"]`)
        assert.ok(btn, `W${i + 1}'s ${id} state renders visible`)
        assert.ok(btn!.textContent?.includes(label), `W${i + 1}'s ${id} state carries its studioCopy label verbatim — got "${btn!.textContent}"`)
      }
    }
    // THE DEFAULTS: W2's unstated seam reads the engine's carry
    // (never the old 'cut' lie); W3's stated cut reads cut
    const pressed = (i: number, id: string): boolean =>
      (document.querySelector(`[data-testid="v2v-seam-${i}-${id}"]`) as HTMLElement)?.getAttribute("aria-pressed") === "true"
    assert.ok(pressed(1, "extend"), "W2's unstated seam presses Carry (the engine's default)")
    assert.ok(pressed(2, "cut"), "W3's stated cut presses Stock")
    // THE COMMIT: pressing keyframe on W2 restates ONLY W2's seam
    // (W1 untouched, W3's cut untouched — the per-window override,
    // never a global rewrite)
    fireEvent.click(document.querySelector('[data-testid="v2v-seam-1-carry+keyframe"]') as HTMLElement)
    assert.equal(commits.length, 1, "the seam press commits through onChange")
    const [w1, w2, w3] = commits[0] as unknown as DocCall[]
    assert.equal(w1!.transition, undefined, "W1 still carries no seam")
    assert.equal(w2!.transition, "carry+keyframe", "W2's seam restates to carry+keyframe")
    assert.equal(w3!.transition, "cut", "W3's seam is untouched")
    assert.equal(w2!.start_frame, 107, "the override restates the seam only — the span is untouched")
    unmount()
  })
})
