// useAudioPlayback.spec.tsx — R-E1 (2026-10-22): the playhead loop
// is SINGLE-TENANT. play() over a playing timeline used to mint a
// second rAF loop while the first kept running (its id overwritten,
// so pause could never cancel it — currentTime kept moving after
// pause, a ghost writing beside the live loop). The generation token
// + the entry cancel make every tick self-identifying: only the
// newest play()'s loop writes, and pause/seek/unmount bury all of
// them.
import { afterEach, describe, it, expect, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { createElement as h } from "react"
import { useAudioPlayback } from "../src/playback/useAudioPlayback.ts"
import { useTimelineStore } from "../src/store/index.ts"

const realRaf = globalThis.requestAnimationFrame
const realCancel = globalThis.cancelAnimationFrame

class FakeGain {
  gain = { value: 1, setValueAtTime(): void {} }
  connect(): void {}
}
class FakeSource {
  connect(): void {}
  start(): void {}
  stop(): void {}
}
class FakeCtx {
  static instances: FakeCtx[] = []
  currentTime = 0
  destination = {}
  state = "running"
  constructor() { FakeCtx.instances.push(this) }
  decodeAudioData(): Promise<{ getChannelData(): Float32Array }> {
    return Promise.resolve({ getChannelData: () => new Float32Array(64) })
  }
  createGain(): FakeGain { return new FakeGain() }
  createBufferSource(): FakeSource { return new FakeSource() }
  close(): Promise<void> { return Promise.resolve() }
}

const frames: Array<() => void> = []
const stepFrame = (): void => {
  const pending = frames.splice(0, frames.length)
  for (const f of pending) f()
}

interface Ctl { play(): void; pause(): void; seek(t: number): void }

function mount(): Ctl {
  const ctl: Ctl = { play(): void {}, pause(): void {}, seek(): void {} }
  function Harness(): null {
    const p = useAudioPlayback()
    ctl.play = p.play
    ctl.pause = p.pause
    ctl.seek = p.seek
    return null
  }
  render(h(Harness))
  return ctl
}

const start = (): { ctl: Ctl; clock: FakeCtx } => {
  vi.stubGlobal("AudioContext", FakeCtx)
  frames.length = 0
  globalThis.requestAnimationFrame = ((cb: () => void): number => {
    frames.push(cb)
    return frames.length
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame
  useTimelineStore.getState().reset()
  useTimelineStore.getState().setPlayback({ isPlaying: false, currentTime: 0, totalDuration: 600 })
  FakeCtx.instances = []
  return { ctl: mount(), clock: (undefined as unknown as FakeCtx) }
}

afterEach(() => {
  cleanup()
  globalThis.requestAnimationFrame = realRaf
  globalThis.cancelAnimationFrame = realCancel
  vi.unstubAllGlobals()
  useTimelineStore.getState().reset()
})

describe("the playhead loop is single-tenant (R-E1)", () => {
  it("a play over a playing timeline leaves ONE writer; pause freezes the playhead cold", async () => {
    const { ctl } = start()
    const clock = FakeCtx.instances[0]!

    await act(async () => { ctl.play() })
    await act(async () => { stepFrame() })
    clock.currentTime += 5
    await act(async () => { stepFrame() })
    expect(useTimelineStore.getState().playback.currentTime).toBe(5)

    // THE GHOST CASE: play() again over a playing timeline — the old
    // loop must die, the new one restarts from the CURRENT offset
    // (the act-flush above landed currentTime 5 in the store, so the
    // re-rendered play() closure carries offset 5)
    await act(async () => { ctl.play() })
    clock.currentTime += 5
    await act(async () => { stepFrame() })
    // one writer: the new loop's own math (5s offset + 5s elapsed) —
    // a surviving ghost would double-write this frame
    expect(useTimelineStore.getState().playback.currentTime).toBe(10)

    // pause buries every loop: the clock keeps ticking, the
    // playhead never moves again (the ghost kept it moving before)
    await act(async () => { ctl.pause() })
    clock.currentTime += 100
    await act(async () => { stepFrame() })
    await act(async () => { stepFrame() })
    expect(useTimelineStore.getState().playback.currentTime).toBe(10)
    expect(useTimelineStore.getState().playback.isPlaying).toBe(false)
  })

  it("seek while playing restarts one loop from the sought time", async () => {
    const { ctl } = start()
    const clock = FakeCtx.instances[0]!

    await act(async () => { ctl.play() })
    await act(async () => { stepFrame() })
    await act(async () => { ctl.seek(10) })
    clock.currentTime += 5
    await act(async () => { stepFrame() })
    expect(useTimelineStore.getState().playback.currentTime).toBe(15)
    expect(useTimelineStore.getState().playback.isPlaying).toBe(true)
  })
})
