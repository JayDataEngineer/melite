// studio-clock-axis-ledger.spec.tsx — THE CLOCK-SPLIT WALL (SD-10
// sub-findings i and iii; the purge audit's F2/SUSPECT row).
//
// THE LESION IT KILLS: the bar's axis clock and the run's served
// film ledger (stage.result.metadata.film — the probed truth) were
// computed by separate code paths — the playhead converters rode a
// live ref mirrored inside useFilmAudio while every other consumer
// (the strip's barFps, barTotal, the mixer's fpsEff) read the filmMap
// prop directly. Two spellings of one clock is the split the F2 burn
// (post-run fps edit desyncing playhead, readout and player by the
// fps ratio) lived one refactor away from. And the mirror's own
// precedence — filmFpsRef.current ?? fps — was flagged SUSPECT: a
// stale filmFpsRef would mislabel the axis exactly the F2 way.
//
// THE ARMS: (1) the axis clock IS the ledger's film clock — the
// overlay's converters and the strip's own `filmMap?.fps ?? fps`
// spelling agree, and the playhead math is film-true; (2) the
// precedence is live, never stale — with no map the axis falls to
// the doc rail (the plan clock), and a re-run whose ledger fps
// changed re-reads the new fps on the next render (the mirror
// re-writes every render — the staleness the SUSPECT feared cannot
// land). Each arm reds on its OWN toggle: arm 1 when the mirror is
// deleted from useFilmAudio (the axis falls to the doc rail while
// the ledger says otherwise — the split, live), arm 2 when the
// mirror goes write-once (the stale fps sticks — the mislabel, live).
//
// Run: npx vitest run --project dom packages/video/h3-timeline/tests/studio-clock-axis-ledger.spec.tsx

import { describe, expect, it, afterEach } from "vitest"
import { useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import { act, cleanup, render } from "@testing-library/react"
import type { CardResult, CardStage } from "@melite/contracts/card"
import { useFilmSync } from "../src/ui/studio/useFilmSync.ts"
import { useFilmAudio } from "../src/ui/studio/useFilmAudio.ts"
import type { LayerA, SetLayerAKey } from "../src/ui/studio/docModel.ts"

/** THE WIRING, THE COMPONENT'S OWN: useFilmSync first, useFilmAudio
 *  second, the filmFpsRef threaded between them — the exact order
 *  studio component.tsx renders (the split finding lives in THIS
 *  wiring, so the judge rides THIS wiring). */
interface ClockProbe {
  axisFps: () => number
  handleFilmTime: (sec: number) => void
  filmFpsRef: { current: number | null }
  filmMap: { fps?: number; totalFrames?: number } | null
  frameIdx: number
}
function ClockHarness({ stage, fps, probeRef }: {
  stage: CardStage
  fps: number
  probeRef: MutableRefObject<ClockProbe | null>
}) {
  const [frameIdx, setFrameIdx] = useState(0)
  const [layerA] = useState<LayerA>({ seed: 42 })
  const setLayerA: Dispatch<SetStateAction<LayerA>> = () => {}
  const setLayerAKey: SetLayerAKey = () => {}
  const film = useFilmSync({ fps, totalFrames: 240, keyframes: [], calls: [], setFrameIdx })
  const audio = useFilmAudio({
    stage, layerA, setLayerA, setLayerAKey,
    fps, frameIdx, filmPlaying: film.filmPlaying, filmFpsRef: film.filmFpsRef,
  })
  probeRef.current = {
    axisFps: film.axisFps,
    handleFilmTime: film.handleFilmTime,
    filmFpsRef: film.filmFpsRef,
    filmMap: audio.filmMap,
    frameIdx,
  }
  return null
}

/** A stage whose run ledger carries a probed film map (the gateway's
 *  result.metadata.film shape — useFilmAudio's own read). */
function stageWithMap(mapFps: number, mapFrames = 360): CardStage {
  const result: CardResult = {
    assetUrls: [],
    artifacts: {},
    metadata: {
      film: {
        fps: mapFps,
        totalFrames: mapFrames,
        windows: [{ start: 0, len: mapFrames, trim: 0, docStart: 0, docSpan: 240 }],
      },
    },
  }
  return {
    id: "probe", title: "probe", kind: "video", service: "h3",
    params: {}, inputs: [], inputIndices: [],
    result, status: "done",
  }
}

/** A fresh card: no run, no ledger — the mirror's null face. */
function stageWithoutMap(): CardStage {
  return {
    id: "probe", title: "probe", kind: "video", service: "h3",
    params: {}, inputs: [], inputIndices: [],
    result: null, status: "pending",
  }
}

const DOC_FPS = 24

afterEach(() => { cleanup() })

describe("SD-10: the overlay axis clock and the run's film ledger are ONE clock", () => {
  it("the axis rides the ledger's film fps — the playhead converters and the strip's own spelling agree, and the playhead math is film-true", () => {
    // The F2 geometry: the doc rail says 24, the run's film says 30.
    // ONE clock means the axis, the strip's barFps and the playhead
    // math all read 30 — the doc rail never leaks into the axis.
    const probeRef: MutableRefObject<ClockProbe | null> = { current: null }
    render(<ClockHarness stage={stageWithMap(30)} fps={DOC_FPS} probeRef={probeRef} />)
    const probe = probeRef.current
    expect(probe, "the harness mounts the studio's own wiring").not.toBeNull()
    expect(probe!.filmMap?.fps, "the run ledger carries the probed 30 (the fixture is live)").toBe(30)
    // THE ONE-CLOCK LAW: the axis equals the ledger fps — and equals
    // the strip's own spelling (barFps, StudioStripPane) for the same
    // stage. Any split between the two spellings reds here.
    const stripFps = probe!.filmMap?.fps ?? DOC_FPS
    expect(probe!.axisFps(), "the axis reads the ledger's film fps, never the doc rail").toBe(30)
    expect(probe!.axisFps(), "the overlay axis and the strip's clock are ONE value").toBe(stripFps)
    // THE PLAYHEAD MATH IS FILM-TRUE: 2s of film time is 60 film
    // frames at 30fps — the doc rail would book 48 (the F2 desync).
    act(() => { probe!.handleFilmTime(2) })
    expect(probeRef.current!.frameIdx, "2s at the film's 30fps books 60 frames — the axis is film-true").toBe(60)
  })

  it("the axis precedence is live, never stale — no map falls to the doc rail and a re-run's new fps re-reads on the next render", () => {
    // THE SUSPECT'S OWN SCENARIO, JUDGED: filmFpsRef could stick at a
    // previous run's fps and mislabel the axis after a re-run. The
    // mirror re-writes EVERY render, so it cannot: fresh card → doc
    // rail; run at 30 → 30; re-run whose ledger says 24 → 24.
    const probeRef: MutableRefObject<ClockProbe | null> = { current: null }
    const view = render(<ClockHarness stage={stageWithoutMap()} fps={DOC_FPS} probeRef={probeRef} />)
    // (a) THE NO-MAP FACE: no ledger exists — the axis falls to the
    // doc rail (the plan clock; fps arrives defaulted from
    // useViewSelection, so the ?? fps arm never sees null fps).
    expect(probeRef.current!.filmMap, "the fresh card carries no ledger").toBeNull()
    expect(probeRef.current!.axisFps(), "with no ledger the axis is the doc rail's plan clock").toBe(DOC_FPS)
    // (b) THE FIRST RUN: the ledger lands at 30 — the axis follows.
    view.rerender(<ClockHarness stage={stageWithMap(30)} fps={DOC_FPS} probeRef={probeRef} />)
    expect(probeRef.current!.axisFps(), "the first run's ledger moves the axis to the film's 30").toBe(30)
    // (c) THE RE-RUN: the ledger drops to 24 — a STALE filmFpsRef
    // would keep the axis at 30 and mislabel every frame by 30/24.
    view.rerender(<ClockHarness stage={stageWithMap(24)} fps={DOC_FPS} probeRef={probeRef} />)
    expect(probeRef.current!.axisFps(), "the re-run's ledger re-reads 24 on the next render — the mirror is live, never stale").toBe(24)
  })
})
