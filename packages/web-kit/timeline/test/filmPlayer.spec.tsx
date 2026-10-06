// filmPlayer.spec.tsx — the SHARED FilmPlayer (moved from
// h3-timeline's studio-kit spec 2026-09-17 with the component: the
// imperative seam the timeline bar's playhead drives — seekTo
// clamps/coalesces on the raf, the handle reports element clocks,
// the 4Hz poll never freezes the bar on a silent event path).
import { afterEach, describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { createRef } from "react"
import { createElement as h } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { FilmPlayer, type FilmPlayerHandle } from "../src/timeline/FilmPlayer"

afterEach(cleanup)

describe("FilmPlayer (one film, one native player)", () => {
  function silenceMedia() {
    // happy-dom's media element is a stub shell: pin play/pause so the
    // handle arms run without a decoder.
    const proto = (globalThis as unknown as { HTMLMediaElement: { prototype: HTMLMediaElement } }).HTMLMediaElement.prototype
    const origPlay = proto.play
    const origPause = proto.pause
    proto.play = (() => Promise.resolve()) as unknown as typeof proto.play
    proto.pause = (() => {}) as unknown as typeof proto.pause
    return () => {
      proto.play = origPlay
      proto.pause = origPause
    }
  }

  it("renders the native player with its contract props", () => {
    const restore = silenceMedia()
    try {
      const times: number[] = []
      render(h(FilmPlayer, {
        src: "https://x/final.mp4", className: "pl", "data-testid": "fp",
        muted: true, loop: true, autoPlay: true, poster: "https://x/p.png",
        onTime: (t) => { times.push(t) },
      }))
      const v = screen.getByTestId("fp") as HTMLVideoElement
      assert.ok(v.src.includes("final.mp4"))
      assert.equal(v.muted, true)
      assert.equal(v.loop, true)
      // the element clocks report through the handle-time path
      fireEvent.timeUpdate(v, { target: { currentTime: 1.5 } })
      assert.deepEqual(times, [1.5])
    } finally {
      restore()
    }
  })

  it("play/pause/ended reports ride; missing callbacks never throw", () => {
    const restore = silenceMedia()
    try {
      const playing: boolean[] = []
      let ended = 0
      render(h(FilmPlayer, {
        src: "https://x/a.mp4", "data-testid": "fp2",
        onPlayingChange: (p) => { playing.push(p) }, onEnded: () => { ended++ },
      }))
      const v = screen.getByTestId("fp2")
      fireEvent.play(v)
      fireEvent.pause(v)
      fireEvent.ended(v)
      assert.deepEqual(playing, [true, false])
      assert.equal(ended, 1)
      cleanup()
      // no callbacks at all: the same events are safe no-ops
      render(h(FilmPlayer, { src: "https://x/b.mp4", "data-testid": "fp3" }))
      const w = screen.getByTestId("fp3")
      fireEvent.play(w)
      fireEvent.pause(w)
      fireEvent.ended(w)
      fireEvent.loadedMetadata(w)
    } finally {
      restore()
    }
  })

  it("loadedMetadata reports finite positive durations only", () => {
    const restore = silenceMedia()
    try {
      const durs: number[] = []
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp4", onDuration: (d) => { durs.push(d) } }))
      const v = screen.getByTestId("fp4") as HTMLVideoElement
      Object.defineProperty(v, "duration", { value: 12.5, configurable: true })
      fireEvent.loadedMetadata(v)
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      fireEvent.loadedMetadata(v)
      Object.defineProperty(v, "duration", { value: 0, configurable: true })
      fireEvent.loadedMetadata(v)
      assert.deepEqual(durs, [12.5])
    } finally {
      restore()
    }
  })

  it("the imperative seam: current/duration/play/pause/toggle", async () => {
    const restore = silenceMedia()
    try {
      const ref = createRef<FilmPlayerHandle>()
      render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp5" }))
      const v = screen.getByTestId("fp5") as HTMLVideoElement
      assert.equal(ref.current!.current(), 0)
      assert.equal(ref.current!.duration(), 0)
      Object.defineProperty(v, "duration", { value: 10, configurable: true })
      assert.equal(ref.current!.duration(), 10)
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      assert.equal(ref.current!.duration(), 0)
      // play/pause ride the element
      ref.current!.play()
      ref.current!.pause()
      // toggle BOTH ways: paused → play, playing → pause
      Object.defineProperty(v, "paused", { value: true, configurable: true })
      ref.current!.toggle()
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      ref.current!.toggle()
    } finally {
      restore()
    }
  })

  it("seekTo rides the raf (coalesced; clamped to a finite duration; unmount cancels)", async () => {
    const restore = silenceMedia()
    try {
      const ref = createRef<FilmPlayerHandle>()
      const { unmount } = render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp6" }))
      const v = screen.getByTestId("fp6") as HTMLVideoElement
      Object.defineProperty(v, "duration", { value: 10, configurable: true })
      ref.current!.seekTo(4)
      ref.current!.seekTo(40) // coalesces: latest wins, clamped to 10
      await new Promise((r) => setTimeout(r, 50))
      assert.equal(v.currentTime, 10)
      // negative seeks floor at 0; NaN durations skip the clamp
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      ref.current!.seekTo(-3)
      await new Promise((r) => setTimeout(r, 50))
      assert.equal(v.currentTime, 0)
      unmount() // the raf-cancel cleanup runs (no throw after settle)
      await new Promise((r) => setTimeout(r, 50))
    } finally {
      restore()
    }
  })

  it("the 4Hz poll reports while playing; silent otherwise", async () => {
    const restore = silenceMedia()
    try {
      const times: number[] = []
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp7", onTime: (t) => { times.push(t) } }))
      const v = screen.getByTestId("fp7") as HTMLVideoElement
      // paused shell: no poll reports (the interval returns early)
      await new Promise((r) => setTimeout(r, 300))
      assert.deepEqual(times, [])
      // playing shell: the poll reports the element clock
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      Object.defineProperty(v, "currentTime", { value: 2.5, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.ok(times.length >= 1, "the poll reported while playing")
      assert.ok(times.every((t) => t === 2.5))
      // ended shell: silent again
      const n = times.length
      Object.defineProperty(v, "ended", { value: true, configurable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
      // negative / NaN clocks never report
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      Object.defineProperty(v, "currentTime", { value: -1, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
      Object.defineProperty(v, "currentTime", { value: NaN, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
    } finally {
      restore()
    }
  })

  it("the poll without onTime is a safe no-op (playing, no listener)", async () => {
    const restore = silenceMedia()
    try {
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp8" }))
      const v = screen.getByTestId("fp8") as HTMLVideoElement
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      await new Promise((r) => setTimeout(r, 300))
    } finally {
      restore()
    }
  })

  it("a pending seek unmounts safely: cleanup cancels, the late raf finds no element", () => {
    const restore = silenceMedia()
    const rafs: FrameRequestCallback[] = []
    let cancelled = 0
    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      rafs.push(cb)
      return rafs.length
    }) as typeof requestAnimationFrame)
    vi.stubGlobal("cancelAnimationFrame", (() => { cancelled++ }) as typeof cancelAnimationFrame)
    try {
      const ref = createRef<FilmPlayerHandle>()
      const { unmount } = render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp9" }))
      ref.current!.seekTo(3)
      assert.equal(rafs.length, 1)
      unmount() // cleanup runs with a raf in flight → cancel rides
      assert.equal(cancelled, 1)
      rafs[0]!(0) // the orphaned raf: no element, safe return
    } finally {
      restore()
    }
  })
})
