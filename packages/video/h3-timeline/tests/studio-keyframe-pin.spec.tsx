/**
 * THE IMAGELESS PIN WALL (C6 — tc-8 = KF-C; timeline-calls-burn
 * §CURES-OWED 8, keyframes-audio KF-C): "a row the card cannot compose
 * never looks settled — the empty pin renders its pending face and the
 * gate names it."
 *
 * RULING (2026-11-06): NAMED-PENDING. The double-click stays the
 * frame-precise gesture and authors the pin PENDING ({image:""}) —
 * the bar's onKeyframeAdd contract is synchronous (the diamond binds
 * to the returned id immediately), while the lawful atomic add
 * (addKeyframeWithImage) commits through the picker doors ASYNC
 * (the fit promise chain) and at the PLAYHEAD, not the clicked
 * frame — the two gestures keep one owner each. The pending state is
 * named at hop 1 on every face — the chip's aria/readout/drop hint
 * (StudioStripPane.kfChips) and the studio's gate (useFilmSync.unwired
 * → the shell's unwiredWarning line) — and the compose door's
 * "image is required" refusal (h3 actions plan gate, walled in
 * packages/models/h3/tests/anchor-guide.spec.ts) stays the loud
 * backstop at the run.
 *
 * RED-PROOF: strip the pending branch from kfChips (every pin renders
 * the settled faces) → the arms below red (the empty pin is
 * indistinguishable from a wired one) → restore → green.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { useState } from "react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { keyframesToLanes } from "../src/ui/studio/docCalls.ts"
import { useBeatMutations } from "../src/ui/studio/useBeatMutations.ts"
import { useFilmSync } from "../src/ui/studio/useFilmSync.ts"
import type { DocKeyframe } from "../src/ui/studio/docModel.ts"

// happy-dom returns zero rects (no layout) — the bar's ClientX→frame
// doors need a viewport width, as every real browser provides.
const RealRect = window.Element.prototype.getBoundingClientRect
window.Element.prototype.getBoundingClientRect = function () {
  return {
    width: 800, height: 200, top: 0, left: 0, right: 800, bottom: 200,
    x: 0, y: 0, toJSON() {},
  } as DOMRect
}
void RealRect
// (the RO famine — see studio-strip-pane.spec.tsx) happy-dom's
// ResizeObserver re-dispatches against the patched rect in a sync
// loop; the famine makes the scale ride the mount effect alone.
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined

const WINDOW = [{ text: "solo", start_frame: 0, end_frame: 90 }] as never
const WIRED: DocKeyframe = { image: "data:image/png;base64,AA", frame: 40 }

function strip(over?: Record<string, unknown>) {
  const rec: Record<string, unknown[]> = {
    bar: [], scrubStart: [], scrubEnd: [], kfAdd: [], kfMove: [], kfDel: [], kfDoor: [], kfWithImage: [],
    promptUpdate: [], promptMove: [], promptResize: [], promptDel: [],
    extend: [], addCall: [], select: [], addedClip: [], taken: [],
    movedClip: [], delClip: [], keys: [], audioDoor: [],
  }
  const els = render(
    <StudioStripPane
      calls={WINDOW}
      refAudiosBlocked={false}
      fps={24}
      barPrompts={[] as never}
      barLanes={keyframesToLanes([WIRED]) as never}
      barAudioClips={[]}
      barTotal={200}
      frameIdx={0}
      callPreviews={{}}
      selectedBarId={null}
      filmMap={null}
      handleBarFrame={(f) => { rec.bar.push([f]) }}
      handleScrubStart={() => { rec.scrubStart.push([]) }}
      handleScrubEnd={() => { rec.scrubEnd.push([]) }}
      handleKeyframeAdd={(t, f) => { rec.kfAdd.push([t, f]); return "k9" }}
      handleKeyframeMove={(id, f) => { rec.kfMove.push([id, f]) }}
      handleKeyframeDelete={(id) => { rec.kfDel.push([id]) }}
      handlePromptUpdate={(id, t) => { rec.promptUpdate.push([id, t]) }}
      handlePromptMove={(id, s, e) => { rec.promptMove.push([id, s, e]) }}
      handlePromptResize={(id, s, e) => { rec.promptResize.push([id, s, e]) }}
      handlePromptDelete={(id) => { rec.promptDel.push([id]) }}
      handleExtend={(n) => { rec.extend.push([n]) }}
      addCallAt={(f) => { rec.addCall.push([f]) }}
      handleTimelineSelect={(id) => { rec.select.push([id]) }}
      layerA={{ audio_stem: "https://u/bed.mp3" } as never}
      addAudioClip={(n, s, at) => { rec.addedClip.push([n, s, at]) }}
      takeAudioFile={(f, at) => { rec.taken.push([f.name, at]) }}
      moveAudioClip={(id, f) => { rec.movedClip.push([id, f]) }}
      deleteAudioClip={(id) => { rec.delClip.push([id]) }}
      updateAudioClip={() => {}}
      setLayerAKey={(k, v) => { rec.keys.push([k, v]) }}
      artifactIndex={{ byUrl: new Map() }}
      docFromFilm={(g: number) => g}
      keyframes={[WIRED] as never}
      addKeyframeWithImage={(image, frame) => { rec.kfWithImage.push([image, frame]); return "k77" }}
      enterKfView={() => { rec.kfDoor.push(0) }}
      enterAudioView={(id) => { rec.audioDoor.push(id) }}
      {...over}
    />,
  )
  // (the happy-dom index famine) the container-scoped sweep completes
  // the shared element index — later document queries ride it clean.
  void els.container.querySelectorAll("*").length
  return { rec, els }
}

describe("the pending face (C6 — the empty pin never looks settled)", () => {
  it("the double-click's pin renders PENDING on every face; the wired sibling stays settled", () => {
    const pins: DocKeyframe[] = [WIRED, { image: "", frame: 50 }]
    strip({ barLanes: keyframesToLanes(pins) as never, keyframes: pins as never })
    // the pending aria names the state — never the settled spelling
    assert.ok(screen.getByLabelText(studioCopy.keyframePendingAria(50)), "the pending chip's accessible name says PENDING")
    assert.ok(screen.getByLabelText(studioCopy.keyframeLaneChipAria(40)), "the wired chip keeps its settled aria — the faces diverge")
    // the visible readouts diverge too: frame number vs frame · pending
    assert.equal(document.querySelector('[data-kf-frame="kf-1"]')?.textContent, studioCopy.keyframePendingReadout(50))
    assert.equal(document.querySelector('[data-kf-frame="kf-0"]')?.textContent, "40")
    // the drop hint carries the pending law (the repair + the backstop)
    const k1 = document.querySelector('[data-kf="kf-1"]')?.closest("[data-drop-hint]")
    assert.equal(k1?.getAttribute("data-drop-hint"), studioCopy.keyframePendingHint)
    const k0 = document.querySelector('[data-kf="kf-0"]')?.closest("[data-drop-hint]")
    assert.equal(k0?.getAttribute("data-drop-hint"), studioCopy.dropInteriorHint)
    // and the empty pin carries NO thumb — nothing about it reads wired
    assert.equal(document.querySelector('[data-kf-thumb="kf-1"]'), null, "a pending pin never renders a thumbnail")
    const thumb = document.querySelector('[data-kf-thumb="kf-0"]') as HTMLImageElement
    assert.equal(thumb?.getAttribute("src"), "data:image/png;base64,AA", "the wired pin keeps its thumb")
  })

  it("ONE judge with the gate: a whitespace pin is imageless too — pending faces, no thumb", () => {
    const pins: DocKeyframe[] = [{ image: "  ", frame: 40 }]
    strip({ barLanes: keyframesToLanes(pins) as never, keyframes: pins as never })
    assert.ok(screen.getByLabelText(studioCopy.keyframePendingAria(40)),
      "blank = no image, the unwired walk's own spelling (useFilmSync) — the chip never reads it as wired")
    assert.equal(document.querySelector('[data-kf-thumb="kf-0"]'), null)
  })
})

describe("the gesture keeps ONE owner (the double-click is the pending author)", () => {
  it("handleKeyframeAdd lands {image:\"\"} — and that exact row renders the pending faces through the real mapper", () => {
    const { result } = renderHook(() => {
      const [kf, setKf] = useState<DocKeyframe[]>([])
      const m = useBeatMutations(kf, setKf)
      return { kf, ...m }
    })
    act(() => { result.current.handleKeyframeAdd("image", 42) })
    const pins = result.current.kf
    assert.deepEqual(pins, [{ image: "", frame: 42 }], "the write is the PENDING author (the picker doors own the atomic add)")
    // the write feeds the strip through the real keyframes→lanes seam
    strip({ barLanes: keyframesToLanes(pins) as never, keyframes: pins as never })
    assert.ok(screen.getByLabelText(studioCopy.keyframePendingAria(42)),
      "the row the gesture authored IS the row the pending face names — write and face judge one state")
    assert.equal(document.querySelector('[data-kf-thumb="kf-0"]'), null)
  })
})

describe("the gate names it before the run (the studio's gate face)", () => {
  it("useFilmSync counts blank-image pins and the warning line names PENDING + the door's refusal", () => {
    const { result } = renderHook(() => useFilmSync({
      fps: 24,
      totalFrames: 90,
      keyframes: [
        { image: "a.png", frame: 10 },
        { image: "", frame: 20 },
        { image: "  ", frame: 30 },
      ],
      calls: [{ text: "one", start_frame: 0, end_frame: 90 }],
      setFrameIdx: () => {},
    }))
    assert.equal(result.current.unwired, 2, "empty AND whitespace pins count — one judge with the chip's")
    const line = studioCopy.unwiredWarning(result.current.unwired)
    assert.ok(line.includes("2 keyframe sources unwired"), line)
    assert.ok(line.includes("PENDING"), "the gate names the PENDING state (the wall's own words)")
    assert.ok(line.includes("image is required"), "the gate names the compose door's refusal — the honest backstop")
  })
})
