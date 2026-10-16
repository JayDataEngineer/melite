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

// ── G2 (timeline-plane wave-2): the invariants the source comments
// claimed and no wall fired. The E2.5 audible matrix, the
// end-of-timeline reset, the mid-cue offset/skip-past-end start law,
// and scheduleFadeAutomation's four regions + offset translation +
// dur/2 clamp (the export whose JSDoc said "Public for unit testing"
// while no test imported it — the provenance lie).
import { scheduleFadeAutomation } from "../src/playback/useAudioPlayback.ts"
import type { AudioCue, AudioTrackDef } from "@melite/contracts"

class RecSource {
  startArgs: Array<number[]> = []
  stopped = false
  connect(): void {}
  start(when?: number, offset?: number): void { this.startArgs.push([when ?? 0, offset ?? 0]) }
  stop(): void { this.stopped = true }
}
class RecCtx extends FakeCtx {
  static sources: RecSource[] = []
  createBufferSource(): RecSource { const s = new RecSource(); RecCtx.sources.push(s); return s }
}

const track = (id: string, flags: { muted?: boolean; solo?: boolean } = {}): AudioTrackDef =>
  ({ id, label: id, color: "#000", height: 64, ...flags })

const cue = (id: string, tr: string, start = 0, duration = 10): AudioCue =>
  ({ id, track: tr, start, duration, label: id, audioUrl: `https://audio.test/${id}.mp3`,
     audioB64: null, volume: 0.8, waveformPeaks: null, sourceStepId: null })

/** Boot with the recording ctx + audio seeded; returns the ctl. The
 *  file afterEach restores stubs/rAF/store. */
async function bootWithAudio(tracks: AudioTrackDef[], cues: AudioCue[]): Promise<Ctl> {
  vi.stubGlobal("AudioContext", RecCtx)
  RecCtx.sources = []
  FakeCtx.instances = []
  frames.length = 0
  globalThis.requestAnimationFrame = ((cb: () => void): number => { frames.push(cb); return frames.length }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame
  useTimelineStore.getState().reset()
  useTimelineStore.getState().setPlayback({ isPlaying: false, currentTime: 0, totalDuration: 600 })
  vi.stubGlobal("fetch", vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
  act(() => { useTimelineStore.setState({ audioTracks: tracks, audioCues: cues }) })
  const ctl: Ctl = { play(): void {}, pause(): void {}, seek(): void {} }
  function H(): null {
    const p = useAudioPlayback()
    ctl.play = p.play
    ctl.pause = p.pause
    ctl.seek = p.seek
    return null
  }
  render(h(H))
  // flush the decode chain twice (fetch → decode → buffer set → effect re-run no-op)
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  return ctl
}

describe("the E2.5 audible matrix fires", () => {
  it("mute wins over solo on the same track; the other track's cue starts", async () => {
    const ctl = await bootWithAudio(
      [track("a", { muted: true, solo: true }), track("b", { solo: true })],
      [cue("ca", "a"), cue("cb", "b")],
    )
    await act(async () => { ctl.play() })
    // exactly ONE source — cb on the soloed track b. Track a ALSO
    // solos, but its mute wins: a muted+soloed track is silent (the
    // render_service law).
    expect(RecCtx.sources.length).toBe(1)
  })

  it("solo on one track mutes all others", async () => {
    const ctl = await bootWithAudio(
      [track("a", { solo: true }), track("b"), track("c")],
      [cue("ca", "a"), cue("cb", "b"), cue("cc", "c")],
    )
    await act(async () => { ctl.play() })
    // the soloed track's cue started; the other two never mint sources
    expect(RecCtx.sources.length).toBe(1)
  })

  it("an unmapped track passes when nothing solos; a solo elsewhere silences it", async () => {
    // no solo: the ghost-track cue rides (pass unless something is soloed)
    const ctl = await bootWithAudio([track("a")], [cue("ca", "a"), cue("cg", "ghost")])
    await act(async () => { ctl.play() })
    expect(RecCtx.sources.length).toBe(2)
    // solo on a: the ghost goes silent
    RecCtx.sources = []
    const ctl2 = await bootWithAudio([track("a", { solo: true })], [cue("ca", "a"), cue("cg", "ghost")])
    await act(async () => { ctl2.play() })
    expect(RecCtx.sources.length).toBe(1)
  })
})

describe("the start law at the playhead (mid-cue offset, skip-past-end)", () => {
  it("a cue the playhead sits inside starts at its offset; a past cue never starts", async () => {
    const ctl = await bootWithAudio(
      [track("a")],
      [cue("early", "a", 0, 10), cue("now", "a", 20, 10), cue("later", "a", 40, 10)],
    )
    act(() => { useTimelineStore.getState().setPlayback({ currentTime: 25 }) })
    await act(async () => { ctl.play() })
    // early (0-10s) is past → no source; later (40-50s) is future but
    // its offset would be negative-then-skipped only if started — the
    // hook starts it at offset 0 later? No: offset = max(0, 25-40) = 0,
    // 0 < 10 so it STARTS at 0. Only the PAST cue is skipped.
    expect(RecCtx.sources.length).toBe(2)
    const nowSrc = RecCtx.sources[0]!
    expect(nowSrc.startArgs[0]![1]).toBe(5, "the playhead sits 5s into the 'now' cue — source starts at offset 5")
  })
})

describe("the end-of-timeline reset fires", () => {
  it("the tick that crosses totalDuration resets to 0, sets isPlaying false, stops every source", async () => {
    const ctl = await bootWithAudio([track("a")], [cue("ca", "a", 0, 100)])
    await act(async () => { ctl.play() })
    expect(useTimelineStore.getState().playback.isPlaying).toBe(true)
    const clock = FakeCtx.instances[0]!
    const created = RecCtx.sources.slice()
    expect(created.length).toBeGreaterThan(0)
    // cross the 600s totalDuration in one tick
    clock.currentTime += 601
    await act(async () => { stepFrame() })
    const pb = useTimelineStore.getState().playback
    expect(pb.isPlaying).toBe(false)
    expect(pb.currentTime).toBe(0)
    for (const s of created) expect(s.stopped, "every source stops at the end reset").toBe(true)
  })
})

// ── scheduleFadeAutomation (the exported-for-testing unit, finally
// imported): four regions + the offset translation + the dur/2 clamp.
class RecParam {
  calls: Array<[string, number, number?]> = []
  setValueAtTime(v: number, t?: number): void { this.calls.push(["set", v, t]) }
  linearRampToValueAtTime(v: number, t: number): void { this.calls.push(["ramp", v, t]) }
  sets(): Array<[number, number?]> { return this.calls.filter((c) => c[0] === "set").map((c) => [c[1]!, c[2]]) }
  ramps(): Array<[number, number]> { return this.calls.filter((c) => c[0] === "ramp").map((c) => [c[1]!, c[2]!]) }
}

describe("scheduleFadeAutomation's regions fire", () => {
  it("no fades: the param is pinned at volume, nothing else is scheduled", () => {
    const p = new RecParam()
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 0, 0, 0, 100)
    expect(p.calls.length).toBe(1)
    expect(p.sets()[0]).toEqual([0.8, 100])
  })

  it("the dur/2 clamp: a fade longer than half the cue ramps within half", () => {
    const p = new RecParam()
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 8, 8, 0, 100)
    // fade-in clamped to 5: ramp completes at now+5; fade-out clamped
    // to 5: pinned at now+5, ramped to 0 by now+10
    expect(p.ramps()).toEqual([[0.8, 105], [0, 110]])
  })

  it("starting mid-fade-in interpolates the gain now and ramps the rest", () => {
    const p = new RecParam()
    // offset 2 into a 4s fade-in of a 10s cue at volume 0.8: gain now
    // = (2/4)*0.8 = 0.4, ramp completes at now + (4-2)
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 4, 0, 2, 100)
    expect(p.sets()).toContainEqual([0.4, 100])
    expect(p.ramps()).toEqual([[0.8, 102]])
  })

  it("starting inside the fade-out scales the remaining gain to zero by cue end", () => {
    const p = new RecParam()
    // cue 10s, fadeOut 4 → region [6,10]; offset 8: remaining 2,
    // gain now = (2/4)*0.8 = 0.4, ramp to 0 by now+2
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 0, 4, 8, 100)
    expect(p.sets()).toContainEqual([0.4, 100])
    expect(p.ramps()).toEqual([[0, 102]])
  })

  it("a future fade-out pins volume at the window and ramps to zero by cue end", () => {
    const p = new RecParam()
    // cue 10s, fadeOut 4 → region starts 6; offset 0: pin at now+6,
    // ramp to 0 by now+10
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 0, 4, 0, 100)
    expect(p.sets()).toContainEqual([0.8, 106])
    expect(p.ramps()).toEqual([[0, 110]])
  })

  it("an offset past the fade-in skips it (no ramp for the missed region)", () => {
    const p = new RecParam()
    // fadeIn 4, offset 5 (already past): no fade-in arm; no fadeOut →
    // only the steady pin
    scheduleFadeAutomation(p as unknown as AudioParam, 0.8, 10, 4, 0, 5, 100)
    expect(p.calls.length).toBe(1)
    expect(p.sets()[0]).toEqual([0.8, 100])
  })
})
