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
 * 2026-11-16-timeline-plan.md item 11):
 * - THE SWAP — the edit bag's presence swaps the calls lane into the
 *   v2v face (the label + the visible ADD CUT door render); mod
 *   absent keeps the plain calls face; a non-edit dormant kind never
 *   grows the door.
 * - THE PRESS — the door rides the split verb at the playhead; a
 *   window at its shape's floor refuses LOUD (the §0.5 voice).
 * - THE FRESH-TIMELINE DISCOVERABILITY — one long clip + the mod:
 *   the door is visible with no gesture (the one-long-clip violation
 *   is the burn this row cures).
 * - THE DOORS — under v2v every GEOMETRY door is live (seam chip,
 *   split seat, the double-click add); only the prose goes quiet.
 * - THE JOURNEY — the real studio: the press lands a two-window doc,
 *   the second half transition "cut" (§0.5's split law, ridden
 *   through the strip's own button).
 */
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
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
  const rec: Record<string, unknown[]> = {
    addCall: [] as Array<[number] | [number, (() => void) | undefined]>,
    promptUpdate: [] as unknown[],
    seam: [] as unknown[],
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
      handlePromptMove={() => {}}
      handlePromptResize={() => {}}
      handlePromptDelete={() => {}}
      handleExtend={() => {}}
      addCallAt={(f: number, onRefuse?: () => void) => { rec.addCall.push([f, onRefuse]) }}
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

  it("THE DOORS — under v2v every geometry door is live; only the prose goes quiet", async () => {
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
    // the double-click add stays live (the lane's own cut gesture)
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 100 })
    assert.equal(rec.addCall.length, 1, "the double-click add routes the verb under v2v")
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
})
