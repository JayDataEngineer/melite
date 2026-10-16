/**
 * useFilmSync — player↔bar playhead sync + rail stats (BEHAVIORAL).
 *
 * PINS: the scrub law (reports swallowed mid-hold, pause under the
 * hand, resume-only-if-playing), the axis-fps law (film fps wins),
 * bar→film seeks, the playing mirror, and the rail readouts
 * (seconds/unwired/empty-text/guides/knobs).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useFilmSync } from "../src/ui/studio/useFilmSync.ts"
import { DOC_FPS_DEFAULT } from "@melite/models-h3/timelineContract"
import type { FilmPlayerHandle } from "@melite-plugin/timeline/ui/timeline"
import type { DocCall, DocKeyframe } from "../src/ui/studio/docModel.ts"

const CALLS: DocCall[] = [
  { text: "a", start_frame: 0, end_frame: 48, image: "still-a", knobs: { denoise: 0.5 } },
  { text: "", start_frame: 48, end_frame: 96 },
]
const KEYS: DocKeyframe[] = [
  { image: "s", frame: 1 },
  { image: "   ", frame: 50 },
]

function fakePlayer() {
  const calls: string[] = []
  const seeks: number[] = []
  const handle: FilmPlayerHandle = {
    seekTo: (s) => { seeks.push(s) },
    current: () => 0,
    duration: () => 10,
    play: () => { calls.push("play") },
    pause: () => { calls.push("pause") },
    toggle: () => {},
  }
  return { handle, calls, seeks }
}

function harness(fps = DOC_FPS_DEFAULT) {
  return renderHook(() => {
    const [frame, setFrame] = useState(0)
    const s = useFilmSync({ fps, totalFrames: 96, keyframes: KEYS, calls: CALLS, setFrameIdx: setFrame })
    return { frame, ...s }
  })
}

describe("handleFilmTime (playback moves the bar)", () => {
  it("seconds × axis fps rounds to the frame (same-frame keeps identity)", () => {
    const { result } = harness()
    act(() => { result.current.handleFilmTime(1) })
    assert.equal(result.current.frame, 24)
    const before = result.current.frame
    act(() => { result.current.handleFilmTime(1) })
    assert.equal(result.current.frame, before)
  })

  it("mid-scrub reports are swallowed (no yank under the hand)", () => {
    const { result } = harness()
    act(() => { result.current.handleScrubStart() })
    act(() => { result.current.handleFilmTime(3) })
    assert.equal(result.current.frame, 0)
    act(() => { result.current.handleScrubEnd() })
    act(() => { result.current.handleFilmTime(3) })
    assert.equal(result.current.frame, 72)
  })

  it("the film's fps wins the axis (not the doc rail's)", () => {
    const { result } = harness(DOC_FPS_DEFAULT)
    act(() => { result.current.filmFpsRef.current = 30 })
    assert.equal(result.current.axisFps(), 30)
    act(() => { result.current.handleFilmTime(1) })
    assert.equal(result.current.frame, 30)
    act(() => { result.current.filmFpsRef.current = null })
    assert.equal(result.current.axisFps(), DOC_FPS_DEFAULT)
  })
})

describe("the scrub law (pause under the hand, resume-only-if-playing)", () => {
  it("a playing film pauses on grab and resumes on release", () => {
    const { result } = harness()
    const p = fakePlayer()
    act(() => {
      result.current.filmRef.current = p.handle
      result.current.handlePlayingChange(true)
    })
    assert.equal(result.current.filmPlaying, true)
    act(() => { result.current.handleScrubStart() })
    assert.deepEqual(p.calls, ["pause"])
    act(() => { result.current.handleScrubEnd() })
    assert.deepEqual(p.calls, ["pause", "play"])
  })

  it("a paused film stays paused (no resume on release); no player = no crash", () => {
    const { result } = harness()
    act(() => { result.current.handlePlayingChange(false) })
    act(() => { result.current.handleScrubStart() })
    act(() => { result.current.handleScrubEnd() })
    assert.equal(result.current.filmPlaying, false)
    // filmRef null throughout: the `?.` arms — never a throw
    const p = fakePlayer()
    act(() => { result.current.filmRef.current = p.handle })
    act(() => { result.current.handlePlayingChange(false) })
    act(() => { result.current.handleScrubStart() })
    assert.deepEqual(p.calls, [])
    expect(result.current.isScrubbingRef.current).toBe(true)
  })
})

describe("handleBarFrame (the hand moves the film)", () => {
  it("sets the frame and seeks the player (seconds, not frames)", () => {
    const { result } = harness()
    const p = fakePlayer()
    act(() => { result.current.filmRef.current = p.handle })
    act(() => { result.current.handleBarFrame(48) })
    assert.equal(result.current.frame, 48)
    assert.deepEqual(p.seeks, [2])
  })

  it("no player = frame still moves (the bar never waits on the film)", () => {
    const { result } = harness()
    act(() => { result.current.handleBarFrame(12) })
    assert.equal(result.current.frame, 12)
  })

  // (timeline-plane wave-2 G6) the triangle's OTHER direction: the
  // bar→film seek must divide by the FILM's fps too. The audit's F2
  // disease was exactly this half — an axis riding the doc fps scaled
  // every seek by the fps ratio. Film 30 vs doc DOC_FPS_DEFAULT: a
  // regression to doc-fps-only lands 60/24 = 2.5 and reds here.
  it("the seek divides by the FILM fps when the axis diverges (G6, the override arm)", () => {
    const { result } = harness(DOC_FPS_DEFAULT)
    const p = fakePlayer()
    act(() => {
      result.current.filmRef.current = p.handle
      result.current.filmFpsRef.current = 30
    })
    act(() => { result.current.handleBarFrame(60) })
    assert.equal(result.current.frame, 60, "the playhead takes the bar's film frame verbatim")
    assert.deepEqual(p.seeks, [2], "60 film frames @ 30fps = 2s — the film clock, never the doc rail's")
  })
})

describe("the rail readouts", () => {
  it("seconds / unwired / empty-text / guides / knob overrides", () => {
    const { result } = harness()
    assert.equal(result.current.seconds, "4.0")
    assert.equal(result.current.unwired, 1)
    assert.equal(result.current.emptyText, 1)
    assert.equal(result.current.guideCount, 1)
    assert.equal(result.current.knobOverrides, 1)
    expect(result.current.filmPlaying).toBe(false)
  })
})
