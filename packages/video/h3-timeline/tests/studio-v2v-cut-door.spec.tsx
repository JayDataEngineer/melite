/**
 * THE VIDEO-TO-VIDEO AND CUTS FACE (queue 11, operator 2026-11-08,
 * verbatim): "WHEN YOU ADD THE MOD FOR VIDEO TO VIDEO, IT CHANGES
 * THE TIMELINE BAR UNDER THE 'CALLS' SECTION FOR THE VIDEO TO VIDEO
 * AND CUTS." + "THE CALLS WINDOWS ALONG THE BOTTOM WAS SUPOSED TO BE
 * *REPLACED* WITH THE VIDEO TO VIDEO SECTION, WITH THE ABILITY TO
 * ADD *CUTS* THERE IS NO WAY I CAN EVEN ADD *CUTS* AT ALL AS A USER,
 * IT HAS TO BE ONE LONG CLIP!"
 *
 * THE WALLS (the plan's own spell, dev_docs/agents/plans/
 * 2026-11-09-timeline-plan.md item 11):
 * - THE SWAP — the edit bag's presence swaps the calls lane into the
 *   v2v face (the label + the visible ADD CUT door render); mod
 *   absent keeps the plain calls face; a non-edit dormant kind never
 *   grows the door.
 * - THE PRESS — the door rides the split verb at the playhead; a
 *   window at its shape's floor refuses LOUD (the §0.5 voice).
 * - THE FRESH-TIMELINE DISCOVERABILITY — one long clip + the mod:
 *   the door is visible with no gesture (the one-long-clip violation
 *   is the burn this row cures).
 * - THE DOORS — under v2v the geometry doors live (seam chip, divide
 *   seat) and THE ADD IS DEAD (the operator's second block: "This
 *   section would no longer allow people to add clips"); only the
 *   prose goes quiet.
 * - THE JOURNEY — the real studio: the press lands a two-window doc,
 *   the second half transition "cut" (§0.5's split law, ridden
 *   through the strip's own button).
 * - THE DERIVED WHOLE-FILM WINDOW (D-19) — under v2v with zero
 *   authored spans the lane paints the run's ONE implicit window
 *   (the whole film, derived join — the lane mirrors the chain); the
 *   first press (Add cut / the divide seat) authors REAL spans
 *   through the split law; geometry gestures on the row refuse LOUD
 *   (the pre-cure path dropped them SILENT — the named disease).
 * - THE DIVIDE RIDES THE CARRY — the per-window divide ("cut in the
 *   middle to split the clips into context carry") routes the same
 *   carry-riding verb as the strip head's door.
 * - THE TIMESTAMP SPLIT + CARRY — the form states 2 seconds + carry:
 *   the split lands at that timestamp (snapped to the authoring
 *   lattice) with the selected seam.
 */
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StudioStripPane, V2V_DERIVED_WINDOW_UUID } from "../src/ui/studio/StudioStripPane.tsx"
import { callsLaneFace, deriveCommissions } from "../src/ui/studio/commissions.ts"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { STARTER_CALLS, type DocCall } from "../src/ui/studio/docModel.ts"
import "../../../../tests/helpers/boot-models.ts"
import { specBody } from "../../../harness/melite-tools/src/discovery.ts"
import { loadCardDefs, theService } from "@melite/comfyui-cordis"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"

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
// undefined): the seam chip's Tip constructs an RO UNGUARDED, so
// undefined throws where the chip first renders.
class RoStub { observe(): void {} unobserve(): void {} disconnect(): void {} }
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = RoStub

const P1 = { uuid: "p1", text: "hello", start_frame: 0, end_frame: 56, color: null }
const P2 = { uuid: "p2", text: "world", start_frame: 56, end_frame: 124, color: null }

/** One armed edit bag as the doc itself carries it (deriveCommissions
 *  is the real derivation — the wall never hand-builds a commission). */
const EDIT_PARAMS = { edit: [{ edit_prompt: "make it rain" }] }
const UPSACLE_PARAMS = { upscale: [{ scale: 2 }] }

function strip(over?: Record<string, unknown>) {
  // (the typed record: the asserts below slice the firstCut rows —
  // a bare Record<string, unknown[]> narrows them to {} at the use)
  const rec: {
    addCall: Array<[number] | [number, (() => void) | undefined]>
    firstCut: Array<[number, number, (() => void) | undefined]>
    promptUpdate: unknown[]
    promptMove: unknown[]
    promptDelete: unknown[]
    seam: unknown[]
  } = {
    addCall: [],
    firstCut: [],
    promptUpdate: [],
    promptMove: [],
    promptDelete: [],
    seam: [],
  }
  const els = render(
    <StudioStripPane
      calls={[{ text: "a", start_frame: 0, end_frame: 56 }] as never}
      refAudiosBlocked={false}
      fps={24}
      barPrompts={[P1] as never}
      barLanes={[] as never}
      barAudioClips={[]}
      commissions={deriveCommissions(EDIT_PARAMS)}
      barTotal={56}
      frameIdx={28}
      callPreviews={{}}
      selectedBarId={null}
      filmMap={null}
      handleBarFrame={() => {}}
      handleScrubStart={() => {}}
      handleScrubEnd={() => {}}
      handleKeyframeMove={() => {}}
      handleKeyframeDelete={() => {}}
      handlePromptUpdate={(id, t) => { rec.promptUpdate.push([id, t]) }}
      handlePromptMove={(id, s, e) => { rec.promptMove.push([id, s, e]) }}
      handlePromptResize={() => {}}
      handlePromptDelete={(id) => { rec.promptDelete.push([id]) }}
      handleExtend={() => {}}
      addCallAt={(f: number, onRefuse?: () => void) => { rec.addCall.push([f, onRefuse]) }}
      addFirstWindowCut={(extent: number, at: number, onRefuse?: () => void) => { rec.firstCut.push([extent, at, onRefuse]) }}
      setCallTransition={(i, t) => { rec.seam.push([i, t]) }}
      handleTimelineSelect={() => {}}
      layerA={{} as never}
      addAudioClip={() => {}}
      takeAudioFile={() => {}}
      moveAudioClip={() => {}}
      deleteAudioClip={() => {}}
      updateAudioClip={() => {}}
      setLayerAKey={() => {}}
      artifactIndex={{ byUrl: new Map() }}
      docFromFilm={(f: number) => f}
      keyframes={[] as never}
      addKeyframeWithImage={() => "k" }
      enterKfView={() => {}}
      enterAudioView={() => {}}
      {...over}
    />,
  )
  return { els, rec }
}

describe("THE VIDEO-TO-VIDEO AND CUTS FACE (queue 11 — the cut door)", () => {
  it("THE SWAP — the edit bag swaps the calls lane into the v2v face; no mod keeps the plain face; a non-edit dormant kind never grows the door", () => {
    // the face derivation itself (the law's own spelling)
    assert.deepEqual(callsLaneFace(deriveCommissions(EDIT_PARAMS)), { face: "v2v", kind: "edit" })
    assert.deepEqual(callsLaneFace(deriveCommissions({})), { face: "plain" })
    assert.equal(callsLaneFace(deriveCommissions(UPSACLE_PARAMS)).face, "dormant")
    // mod absent: the plain calls face, NO cut door
    const plain = strip({ commissions: [] })
    assert.equal(plain.els.container.querySelector('[data-testid="tl-add-cut"]'), null)
    assert.ok(screen.getByText(studioCopy.callsLabel), "the plain calls label renders")
    plain.els.unmount()
    // the edit bag: the door + the face's own label render
    const v2v = strip()
    const door = v2v.els.container.querySelector('[data-testid="tl-add-cut"]')
    assert.ok(door instanceof HTMLButtonElement, "the ADD CUT door renders as a button under the edit bag")
    assert.equal(door.getAttribute("aria-label"), studioCopy.addCutDoor)
    assert.ok(screen.getByText(studioCopy.callsV2vLabel), "the v2v head names the face")
    v2v.els.unmount()
    // a non-edit dormant kind (upscale): dormant — NO door, NO v2v label
    const dormant = strip({ commissions: deriveCommissions(UPSACLE_PARAMS) })
    assert.equal(dormant.els.container.querySelector('[data-testid="tl-add-cut"]'), null)
    dormant.els.unmount()
    // THE OPERATOR'S REAL DOC SHAPE (queue 11 reopened 2026-11-08:
    // their live DOM carried edit + loras BOTH armed and the lane
    // still drew the plain prompt face — "Calls — the LoRAs run's
    // prompt" — because the reader check fired before the edit
    // check). The edit bag's swap is UNCONDITIONAL: a reader beside
    // it changes nothing the operator can see.
    const EDIT_PLUS_LORAS = {
      edit: [{ edit_prompt: "make it rain" }],
      loras: [{ id: "h3_silver_dareties" }],
    }
    assert.deepEqual(callsLaneFace(deriveCommissions(EDIT_PLUS_LORAS)),
      { face: "v2v", kind: "edit" },
      "edit + loras co-armed (the operator's exact doc): the v2v face — no reader-precedence clause exists in the operator's law")
    const coArmed = strip({ commissions: deriveCommissions(EDIT_PLUS_LORAS) })
    const coDoor = coArmed.els.container.querySelector('[data-testid="tl-add-cut"]')
    assert.ok(coDoor instanceof HTMLButtonElement,
      "the ADD CUT door renders under edit + loras (the reader never disarms the face)")
    assert.ok(screen.getByText(studioCopy.callsV2vLabel),
      "the v2v head names the face under the co-armed doc")
    assert.ok(screen.queryByText("Calls — the LoRAs run's prompt") === null,
      "the LoRAs prompt label is GONE under the co-armed doc — the section changed like the operator told")
    coArmed.els.unmount()
  })

  it("THE PRESS — the door rides the split verb at the playhead, and a too-short split refuses LOUD (the §0.5 voice)", () => {
    const { els, rec } = strip()
    fireEvent.click(els.container.querySelector('[data-testid="tl-add-cut"]')!)
    assert.equal(rec.addCall.length, 1, "the press routes the verb once")
    const [frame, onRefuse] = rec.addCall[0] as [number, (() => void) | undefined]
    assert.equal(frame, 28, "the press hands addCallAt the playhead frame")
    assert.ok(typeof onRefuse === "function", "the press wires the refusal callback")
    assert.ok(typeof onRefuse === "function", "the door wires the refusal callback")
    act(() => { onRefuse!() })
    const face = screen.getByTestId("tl-strip-file-error")
    assert.equal(face.textContent, studioCopy.splitRefusal)
    els.unmount()
  })

  it("THE PRESS ALWAYS CUTS — a playhead at a boundary or past the end resolves the window's midpoint, never the raw append (the visual audit's critical 2)", () => {
    // playhead 0 = the first window's start boundary: pre-cure the
    // raw verb appended junk; the door resolves the midpoint cut
    const atZero = strip({ frameIdx: 0 })
    fireEvent.click(atZero.els.container.querySelector('[data-testid="tl-add-cut"]')!)
    assert.equal((atZero.rec.addCall[0] as [number])[0], 28,
      "a boundary playhead cuts the window's midpoint (28 of [0,56))")
    atZero.els.unmount()
    // past the end: the LAST window is the target
    const past = strip({ frameIdx: 400 })
    fireEvent.click(past.els.container.querySelector('[data-testid="tl-add-cut"]')!)
    assert.equal((past.rec.addCall[0] as [number])[0], 28,
      "a past-the-end playhead cuts the last window's midpoint")
    past.els.unmount()
  })

  it("THE FRESH-TIMELINE DISCOVERABILITY — one long clip + the mod: the door is visible with no gesture at all", () => {
    const starter: DocCall[] = [STARTER_CALLS[0]]
    // a real fresh timeline's one window is a legal split shape (the
    // starter's own span, the shape every fresh doc carries)
    const span = { ...P1, start_frame: starter[0].start_frame, end_frame: starter[0].end_frame }
    const { els, rec } = strip({
      calls: starter as never,
      barPrompts: [span] as never,
      barTotal: starter[0].end_frame,
      frameIdx: Math.floor(starter[0].end_frame / 2),
    })
    const door = els.container.querySelector('[data-testid="tl-add-cut"]')
    assert.ok(door, "the door renders on the fresh one-clip timeline — the burn's cure")
    fireEvent.click(door!)
    assert.equal(rec.addCall.length, 1, "the press routes the cut verb")
    els.unmount()
  })

  it("THE DERIVED WINDOW — zero authored spans under the armed edit paint the run's one implicit window, and the first press authors REAL spans (D-19)", async () => {
    // THE PAINT: the empty doc's lane is no longer an empty lane —
    // the v2v run composes one implicit window (the whole film,
    // derived join), and the lane MIRRORS it where the cut doors
    // live. The row is display prose for what the compose WILL
    // build; it is not the starter's return (nothing authored,
    // nothing persists).
    const { els, rec } = strip({
      calls: [] as never,
      barPrompts: [] as never,
      barTotal: 56,
      frameIdx: 28,
    })
    const derivedRow = els.container.querySelector(`[data-prompt-clip="${V2V_DERIVED_WINDOW_UUID}"]`)
    assert.ok(derivedRow instanceof HTMLElement,
      "the derived whole-film window paints as a lane row in the authoring lane")
    assert.ok(els.container.textContent?.includes(studioCopy.v2vDerivedWindowText),
      "the derived row speaks its own words (the whole-film derived join)")
    // THE FIRST PRESS: Add cut on the derived window routes the
    // first-window cut verb — extent = the whole film's frames, at =
    // the playhead — NEVER the stock append (an ADD the face bars)
    // and never a silent no-op.
    fireEvent.click(els.container.querySelector('[data-testid="tl-add-cut"]')!)
    assert.equal(rec.firstCut.length, 1,
      "the press routes the first-window cut verb once (addFirstWindowCut)")
    assert.deepEqual(rec.firstCut[0]!.slice(0, 2), [56, 28],
      "extent = the derived window's own frames (56), at = the playhead (28)")
    assert.equal(rec.addCall.length, 0,
      "the stock addCallAt verb NEVER fires for the derived window")
    // THE DEFAULT CARRY frames nothing ("cut" is the no-reframe
    // mode — the reframe proof rides the carry-selected arm below)
    assert.equal(rec.seam.length, 0,
      "the default carry (cut) frames no seam on the first press")
    els.unmount()
    // THE STATED TIMESTAMP rides the same door: split-at 1.625s on a
    // 24fps film cuts at frame 39 — ON the authoring lattice (22+17,
    // the only frames a legal split lands on) — stated through the
    // REAL form doors (tl-split-at input + the carry menu)
    const at2s = strip({
      calls: [] as never,
      barPrompts: [] as never,
      barTotal: 56,
      frameIdx: 10,
    })
    const splitAt = at2s.els.container.querySelector('[data-testid="tl-split-at"]') as HTMLInputElement | null
    assert.ok(splitAt, "the seconds input renders for the derived window's first cut")
    fireEvent.change(splitAt, { target: { value: "1.625" } })
    fireEvent.click(at2s.els.container.querySelector('[data-testid="tl-split-carry"]')!)
    const carryRow = (await screen.findAllByRole("menuitem"))
      .find((n) => n.textContent?.toLowerCase().includes("22-frame"))
    assert.ok(carryRow, "the carry row (22-frame overlap) serves in the menu")
    fireEvent.click(carryRow)
    fireEvent.click(at2s.els.container.querySelector('[data-testid="tl-add-cut"]')!)
    assert.deepEqual(at2s.rec.firstCut[0]!.slice(0, 2), [56, 39],
      "the stated timestamp overrides the playhead for the first cut (1.625s × 24fps = frame 39, lattice-legal)")
    assert.deepEqual(at2s.rec.seam, [[1, "extend"]],
      "the selected carry mode (Carry — 22-frame overlap, the 'extend' seam) frames the new seam")
    at2s.els.unmount()
    // THE DEAD AXIS: barTotal 0 (no film, no edit extent) paints NO
    // derived row — there is nothing to mirror and nothing to cut
    const dead = strip({
      calls: [] as never,
      barPrompts: [] as never,
      barTotal: 0,
      frameIdx: 0,
    })
    assert.equal(dead.els.container.querySelector(`[data-prompt-clip="${V2V_DERIVED_WINDOW_UUID}"]`), null,
      "a zero-length axis paints no derived window (never an invented span)")
    dead.els.unmount()
  })

  it("THE DERIVED WINDOW IS READ-ONLY — geometry gestures on it refuse LOUD; the stock handlers never see them (the silent-drop disease)", () => {
    const { els, rec } = strip({
      calls: [] as never,
      barPrompts: [] as never,
      barTotal: 56,
      frameIdx: 28,
    })
    // A REAL body drag on the derived row: the kit's pointer session
    // (pointerdown on the clip, pointermove on window) commits
    // through onPromptMove — the pane's guard must answer BEFORE the
    // stock handler, LOUD, in the shared refusal slot.
    const derivedRow = els.container.querySelector(`[data-prompt-clip="${V2V_DERIVED_WINDOW_UUID}"]`)!
    fireEvent.pointerDown(derivedRow, { clientX: 200, buttons: 1 })
    fireEvent.pointerMove(window, { clientX: 320, buttons: 1 })
    fireEvent.pointerUp(window)
    assert.equal(rec.promptMove.length, 0,
      "the derived window never moves — the stock handler sees no gesture (the pre-cure path resolved uuid −1 and dropped it SILENT)")
    assert.ok(els.container.textContent?.includes(studioCopy.v2vDerivedReadonly),
      "the read-only refusal speaks LOUD in the shared laneErr slot")
    els.unmount()
  })

  it("THE DERIVED DIVIDE — the divide seat on the derived row authors the first spans at its midpoint (the same verb, the same carry)", () => {
    // 107 = 22+17·5 (the authoring lattice) — the derived window
    // inherits the lattice law, and the divide cuts its midpoint
    // (round(107/2) = 54). The seat rides the derived row's own uuid
    // (the kit arms it iff onPromptSplit is wired); the pre-cure
    // path resolved no call for the uuid and dropped the press
    // SILENT — the named disease. The carry stays at its default
    // ("cut") — the reframe is the timestamp arm's proof.
    const { els, rec } = strip({
      calls: [] as never,
      barPrompts: [] as never,
      barTotal: 107,
      frameIdx: 10,
    })
    const divide = els.container.querySelector(`[data-split-toggle="${V2V_DERIVED_WINDOW_UUID}"] button`)
    assert.ok(divide, "the divide seat renders on the derived row (the §0.5 verb arms on it too)")
    fireEvent.click(divide)
    assert.equal(rec.firstCut.length, 1, "the derived divide routes the first-window cut verb")
    assert.deepEqual(rec.firstCut[0]!.slice(0, 2), [107, 54],
      "extent = the derived window's frames, at = its midpoint (round(107/2) = 54)")
    assert.equal(rec.addCall.length, 0,
      "the stock addCallAt verb NEVER fires for the derived divide")
    assert.equal(rec.seam.length, 0,
      "the default carry (cut) frames no seam — the reframe is the timestamp arm's proof")
    els.unmount()
  })

  it("THE DIVIDE RIDES THE CARRY — the per-window divide ('cut in the middle') routes the same carry-riding verb; the menu's third row + outside dismiss serve", async () => {
    // ONE long window on the authoring lattice: 107 = 22+17·5 (a
    // legal cut shape — the mock strip passes calls raw, no hydrate
    // snap; an off-lattice span like 110 has NO legal split frame
    // and refuses). The divide cuts its midpoint (round(107/2) = 54).
    const span107 = { ...P1, end_frame: 107 }
    const { els, rec } = strip({
      calls: [{ text: "a", start_frame: 0, end_frame: 107 }] as never,
      barPrompts: [span107] as never,
      barTotal: 107,
      frameIdx: 10,
    })
    // select the CARRY+KEYFRAME mode first (the menu's third row —
    // the divide's seam rides whatever mode the face states)
    fireEvent.click(els.container.querySelector('[data-testid="tl-split-carry"]')!)
    const keyframeRow = (await screen.findAllByRole("menuitem"))
      .find((n) => n.textContent?.toLowerCase().includes("keyframe"))
    assert.ok(keyframeRow, "the Carry + keyframe row serves in the menu")
    fireEvent.click(keyframeRow)
    // the anchor names the selected mode (the third spelling renders)
    assert.ok(els.container.textContent?.includes(studioCopy.splitCarryKeyframe),
      "the carry anchor names the selected keyframe mode")
    // the menu dismisses on an OUTSIDE press (no selection, no leak)
    fireEvent.click(els.container.querySelector('[data-testid="tl-split-carry"]')!)
    assert.ok((await screen.findAllByRole("menuitem")).length > 0, "the menu reopens")
    fireEvent.pointerDown(screen.getByTestId("motion-timeline-ruler"))
    await waitFor(() => {
      assert.equal(screen.queryAllByRole("menuitem").length, 0,
        "an outside press dismisses the carry menu")
    })
    // THE DIVIDE: the per-window ✂ under v2v is "cut in the middle
    // to split the clips into context carry" — the same verb as the
    // strip head's door, the selected carry framing its seam
    const divide = els.container.querySelector('[data-split-toggle="p1"] button')
    assert.ok(divide, "the per-window divide seat renders under v2v")
    fireEvent.click(divide)
    assert.equal(rec.addCall.length, 1, "the divide routes the cut verb")
    assert.equal((rec.addCall[0] as [number])[0], 54,
      "the divide cuts the containing window's midpoint")
    assert.deepEqual(rec.seam, [[1, "carry+keyframe"]],
      "the divide's seam rides the selected carry (the §0.9 reframe)")
    els.unmount()
  })

  it("THE DOORS — under v2v the geometry doors live (seam chip, divide seat) and THE ADD IS DEAD; only the prose goes quiet", async () => {
    // TWO windows: a seam chip arms only at a join (call 2+), so the
    // fixture carries the two-window doc the chip lives on
    const { els, rec } = strip({
      calls: [{ text: "a", start_frame: 0, end_frame: 56 }, { text: "b", start_frame: 56, end_frame: 124 }] as never,
      barPrompts: [P1, P2] as never,
      barTotal: 124,
    })
    // the seam chip + the split seat render (the kit arms them iff the handlers are wired)
    assert.ok(els.container.querySelector("[data-seam-toggle]"),
      "the seam chip renders under v2v (cut ⇄ extend is the face's own verb)")
    assert.ok(els.container.querySelector("[data-split-toggle]"),
      "the split seat renders under v2v (the divide IS a cut)")
    // (queue 11's SECOND BLOCK) THE ADD IS DEAD under v2v — the
    // operator: "This section would no longer allow people to add
    // clips" — a double-click on the ruler fires NO verb
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 100 })
    assert.equal(rec.addCall.length, 0,
      "the double-click add is DEAD under v2v — the section no longer allows adding clips")
    // the prose goes quiet: editing a clip's text refuses LOUD, the write never fires
    const clip = els.container.querySelector('[data-prompt-clip="p1"]')!
    fireEvent.doubleClick(clip)
    // the editor is the clip's own dsh Input (autoFocus), rendered
    // in place of the body while editing
    const input = await waitFor(() => {
      const el = clip.querySelector("input")
      assert.ok(el, "the inline prose editor opened")
      return el as HTMLInputElement
    }, { timeout: 2000 })
    fireEvent.change(input, { target: { value: "new prose" } })
    fireEvent.keyDown(input, { key: "Enter" })
    assert.deepEqual(rec.promptUpdate, [], "the prose write never fires under v2v")
    const face = screen.getByTestId("tl-strip-file-error")
    assert.equal(face.textContent, studioCopy.callsV2vProseHint,
      "the prose refusal names why: the windows and cuts are read, the prose is not")
    els.unmount()
  })

  it("THE JOURNEY — the real studio: the ADD CUT press lands a two-window doc, the second half transition \"cut\"", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    })
    const saved: Array<Record<string, unknown>> = []
    vi.stubGlobal("fetch", (url: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
    })
    render(
      <VideoTimelineStudio
        stageId="s_v2v"
        cardName="h3-timeline"
        row={{
          id: "s_v2v", card: "h3-timeline", title: "H3 Timeline",
          params: {
            // THE MOD IS ADDED (the operator's law: this is what
            // changes the timeline bar's CALLS section) + one long clip
            edit: [{ edit_prompt: "make it rain" }],
            calls: [{ text: "a", start_frame: 0, end_frame: 56 }],
            fps: 24,
          },
        }}
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
    // the face swapped: the door renders on the REAL studio
    const door = await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-add-cut"]')
      assert.ok(el, "the ADD CUT door renders on the real studio under the armed edit bag")
      return el as HTMLElement
    }, { timeout: 4000 })
    // THE OPERATOR'S ACTUAL PRESS (the visual audit's critical 2):
    // a fresh doc's playhead sits at frame 0 — NO scrub, NO gesture.
    // The door itself must resolve the cut (the window at the
    // playhead, at its midpoint): the press that landed an empty
    // appended window pre-cure now lands a CUT.
    fireEvent.click(door)
    // THE §0.5 LAW, ridden through the door: one window becomes its
    // own two halves, the seam the split births states CUT
    await waitFor(() => {
      const withCalls = saved.filter((p) => Array.isArray(p.calls)) as Array<{ calls: DocCall[] }>
      assert.ok(withCalls.length > 0, `the press must land the calls write — got: ${JSON.stringify(saved)}`)
      const doc = withCalls[withCalls.length - 1]!.calls
      assert.equal(doc.length, 2, `two windows after the cut — got ${JSON.stringify(doc)}`)
      assert.equal(doc[1]!.transition, "cut", "the second half's seam states CUT")
    }, { timeout: 4000 })
  })

  it("THE TIMESTAMP SPLIT + CARRY — the form states 2 seconds + carry: the split lands at that timestamp with the selected seam", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    })
    const saved: Array<Record<string, unknown>> = []
    vi.stubGlobal("fetch", (url: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
    })
    render(
      <VideoTimelineStudio
        stageId="s_ts"
        cardName="h3-timeline"
        row={{
          id: "s_ts", card: "h3-timeline", title: "H3 Timeline",
          params: {
            edit: [{ edit_prompt: "make it rain" }],
            // ONE long clip: 0–110 frames at 24fps (~4.58s). Split at
            // 2s (frame 48) — interior to the window
            calls: [{ text: "a", start_frame: 0, end_frame: 110 }],
            fps: 24,
          },
        }}
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
    // the timestamp seat + the carry menu render on the v2v face
    const splitAt = await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-split-at"]') as HTMLInputElement | null
      assert.ok(el, "the timestamp input renders on the v2v face")
      return el
    }, { timeout: 4000 })
    const carryMenu = await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-split-carry"]')
      assert.ok(el, "the carry-mode menu renders on the v2v face")
      return el as HTMLElement
    }, { timeout: 4000 })
    // state the timestamp: 2 seconds
    fireEvent.change(splitAt, { target: { value: "2" } })
    fireEvent.input(splitAt, { target: { value: "2" } })
    // pick the carry mode: "Carry" (extend — the 22-frame overlap).
    // The row matcher starts with "carry": the stock row's label
    // ("Stock — no carry") CONTAINS the word and would match first.
    fireEvent.click(carryMenu)
    const carryRow = await screen.findAllByRole("menuitem")
      .then((items) => items.find((n) => n.textContent?.toLowerCase().startsWith("carry") && !n.textContent?.toLowerCase().includes("keyframe")))
    assert.ok(carryRow, "the Carry row serves in the menu")
    fireEvent.click(carryRow)
    // press the cut
    const door = await waitFor(() => {
      const el = document.querySelector('[data-testid="tl-add-cut"]')
      assert.ok(el, "the Add cut door renders")
      return el as HTMLElement
    }, { timeout: 4000 })
    fireEvent.click(door)
    // THE LAW: the stated timestamp resolves to its frame (2s × 24fps
    // = 48) and the split lands at the NEAREST LEGAL lattice point —
    // the authoring grid (22+17k authored spans; legal split frames
    // here are 39 and 56; 48 is 8 from 56, 9 from 39 → 56). The §0.5
    // split law carries; the seam states the SELECTED carry (extend —
    // the §0.9 reframe, tiling and total preserved).
    await waitFor(() => {
      const withCalls = saved.filter((p) => Array.isArray(p.calls)) as Array<{ calls: DocCall[] }>
      assert.ok(withCalls.length > 0, `the timestamp split must land the calls write — got: ${JSON.stringify(saved)}`)
      const doc = withCalls[withCalls.length - 1]!.calls
      assert.equal(doc.length, 2, `two windows after the timestamp split — got ${JSON.stringify(doc)}`)
      assert.equal(doc[0]!.end_frame, 56,
        `the first half ends at 56 (2s→frame 48, snapped to the nearest legal 22+17k lattice point) — got end ${doc[0]!.end_frame}`)
      assert.equal(doc[1]!.start_frame, 56, "the second half starts at the split frame")
      assert.equal(doc[1]!.transition, "extend",
        `the second half's seam states the CARRY (extend) — got ${JSON.stringify(doc[1]!.transition)}`)
    }, { timeout: 4000 })
    // THE DISCRIMINATOR PRESS (the toggle-proof's teeth): 2s and the
    // playhead-0 midpoint BOTH resolve to 56 on this doc, and 1s
    // collides with the midpoint's own snap — a press stating 1.5
    // SECONDS (frame 36 → nearest legal 39, versus the midpoint
    // fallthrough's 22) proves the STATED timestamp drives the split,
    // never the playhead.
    const splitAt2 = document.querySelector('[data-testid="tl-split-at"]') as HTMLInputElement | null
    assert.ok(splitAt2, "the timestamp input still serves")
    fireEvent.change(splitAt2, { target: { value: "1.5" } })
    fireEvent.input(splitAt2, { target: { value: "1.5" } })
    saved.length = 0
    fireEvent.click(document.querySelector('[data-testid="tl-add-cut"]')!)
    await waitFor(() => {
      const withCalls = saved.filter((p) => Array.isArray(p.calls)) as Array<{ calls: DocCall[] }>
      assert.ok(withCalls.length > 0, "the 1.5s press lands the calls write")
      const doc = withCalls[withCalls.length - 1]!.calls
      // frame 36 sits interior to the first window [0,56) → the split
      // cuts THAT window into [0,39)+[39,56): three windows total
      assert.equal(doc.length, 3, `three windows after the 1.5s split — got ${JSON.stringify(doc)}`)
      assert.equal(doc[0]!.end_frame, 39,
        `1.5s→frame 36, snapped to 39 (NOT the midpoint fallthrough's 22) — got end ${doc[0]!.end_frame}`)
    }, { timeout: 4000 })
  })
})

// ── THE V2V PROMPT SEAT (the no-UI burn, operator 2026-11-10:
// "THERE IS NO USER INTERFACE FOR THE ACTUAL PROMPT THAT GOES — THE
// AGENT MAKES ONE, THEN I GET NO UI FOR IT"). The edit bag's
// edit_prompt lived only in a drill-down leaf; the user's surface
// (the strip's v2v lane) rendered windows and cuts and NO prompt.
// These arms judge the seat: the agent's authored text RENDERS on
// the strip, typing MERGES into the one storage (other bag fields
// preserved), and an agent-side patch RESEEDS the seat.
describe("THE V2V PROMPT SEAT — the prompt that goes, on the surface the user lives on", () => {
  const BAG = { edit: [{ edit_prompt: "the anime girl in the reference", denoise: 0.32, reference: "still+mannequin" }] }

  it("the seat renders the agent's authored prompt verbatim under the v2v face — and never under the plain face", () => {
    const seen: unknown[] = []
    const v2v = strip({ layerA: BAG as never, setLayerAKey: ((n: string, v: unknown) => { seen.push([n, v]) }) as never })
    const input = v2v.els.container.querySelector('[data-testid="tl-v2v-prompt-input"]')
    assert.ok(input instanceof HTMLInputElement, "the prompt seat renders as an input on the strip")
    assert.equal(input.value, "the anime girl in the reference", "the agent's text lands in the seat verbatim")
    assert.ok(screen.getByText(studioCopy.v2vPromptLabel), "the seat names what it is")
    v2v.els.unmount()
    const plain = strip({ commissions: [] })
    assert.equal(plain.els.container.querySelector('[data-testid="tl-v2v-prompt"]'), null,
      "no edit armed: no prompt seat (the plain calls prose is the surface)")
    plain.els.unmount()
    assert.deepEqual(seen, [], "rendering alone writes nothing")
  })

  it("typing commits into the ONE storage, MERGING — other bag fields preserved, never replaced", () => {
    const seen: unknown[] = []
    const v2v = strip({ layerA: BAG as never, setLayerAKey: ((n: string, v: unknown) => { seen.push([n, v]) }) as never })
    const input = v2v.els.container.querySelector('[data-testid="tl-v2v-prompt-input"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: "her wardrobe is the tape bands, no leotard" } })
    fireEvent.blur(input)
    assert.equal(seen.length, 1, "blur commits once")
    const [name, bag] = seen[0] as [string, Array<Record<string, unknown>>]
    assert.equal(name, "edit", "the write targets the edit bag key")
    assert.equal(bag.length, 1)
    assert.equal(bag[0]!.edit_prompt, "her wardrobe is the tape bands, no leotard", "the new prompt rides")
    assert.equal(bag[0]!.denoise, 0.32, "the bag's other fields ride MERGED — never replaced")
    assert.equal(bag[0]!.reference, "still+mannequin")
    v2v.els.unmount()
  })

  it("an unchanged draft never writes; an agent-side patch reseeds the seat", () => {
    const seen: unknown[] = []
    const cap = ((n: string, v: unknown) => { seen.push([n, v]) }) as never
    const v2v = strip({ layerA: BAG as never, setLayerAKey: cap })
    const input = v2v.els.container.querySelector('[data-testid="tl-v2v-prompt-input"]') as HTMLInputElement
    fireEvent.blur(input) // untouched draft: no write
    assert.deepEqual(seen, [], "an unchanged draft never writes")
    // the agent patches the prompt behind the user's back — the seat
    // reseed shows the new truth
    v2v.els.rerender(
      <StudioStripPane
        calls={[{ text: "a", start_frame: 0, end_frame: 56 }] as never}
        refAudiosBlocked={false}
        fps={24}
        barPrompts={[P1] as never}
        barLanes={[] as never}
        barAudioClips={[]}
        commissions={deriveCommissions(EDIT_PARAMS)}
        barTotal={56}
        frameIdx={28}
        callPreviews={{}}
        selectedBarId={null}
        filmMap={null}
        handleBarFrame={() => {}}
        handleScrubStart={() => {}}
        handleScrubEnd={() => {}}
        handleKeyframeMove={() => {}}
        handleKeyframeDelete={() => {}}
        handlePromptUpdate={() => {}}
        handlePromptMove={() => {}}
        handlePromptResize={() => {}}
        handlePromptDelete={() => {}}
        handleExtend={() => {}}
        addCallAt={() => {}}
        addFirstWindowCut={() => {}}
        setCallTransition={() => {}}
        handleTimelineSelect={() => {}}
        layerA={{ edit: [{ edit_prompt: "the agent rewrote this mid-session" }] } as never}
        addAudioClip={() => {}}
        takeAudioFile={() => {}}
        moveAudioClip={() => {}}
        deleteAudioClip={() => {}}
        updateAudioClip={() => {}}
        setLayerAKey={cap}
        artifactIndex={{ byUrl: new Map() }}
        docFromFilm={(f: number) => f}
        keyframes={[] as never}
        addKeyframeWithImage={() => "k" }
        enterKfView={() => {}}
        enterAudioView={() => {}}
      />,
    )
    const reseeded = v2v.els.container.querySelector('[data-testid="tl-v2v-prompt-input"]') as HTMLInputElement
    assert.equal(reseeded.value, "the agent rewrote this mid-session",
      "the seat reseeds from the one storage — the agent's patch is the user's next view")
    v2v.els.unmount()
  })
})
