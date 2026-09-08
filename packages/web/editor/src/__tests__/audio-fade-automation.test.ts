/**
 * E2.4 — WebAudio gain automation scheduling tests.
 *
 * Verifies `scheduleFadeAutomation` produces the right setValueAtTime +
 * linearRampToValueAtTime calls on a (mocked) AudioParam so that live
 * preview matches the renderer's `afade=t=in|out` ffmpeg filter.
 */
import { describe, it, expect, vi } from 'vitest'
import { scheduleFadeAutomation } from "@melite-plugin/timeline/ui/playback"

/** Build a mock AudioParam that records every automation call. */
function mockParam() {
  const events: Array<{
    type: 'setValue' | 'linearRamp'
    value: number
    time: number
  }> = []
  const param = {
    value: 1,
    setValueAtTime(value: number, time: number) {
      events.push({ type: 'setValue', value, time })
      this.value = value
    },
    linearRampToValueAtTime(value: number, time: number) {
      events.push({ type: 'linearRamp', value, time })
      this.value = value
    },
    // Unused but defined for type compliance.
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
  }
  return { param: param as unknown as AudioParam, events }
}

describe('scheduleFadeAutomation', () => {
  it('no fades → just one setValueAtTime at volume', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.8, 4.0, 0, 0, 0, 100)
    expect(events).toEqual([
      { type: 'setValue', value: 0.8, time: 100 },
    ])
  })

  it('fade-in ramps 0 → volume over fadeIn seconds', () => {
    const { param, events } = mockParam()
    // 4s cue, 1s fade-in, starting at offset 0, ctx time 100.
    scheduleFadeAutomation(param, 0.8, 4.0, 1.0, 0, 0, 100)
    // The default setValue(volume, now) is always emitted first, then
    // the fade-in branch overrides the starting value at the same time
    // (WebAudio's queue is processed in order).
    expect(events).toContainEqual({ type: 'setValue', value: 0.8, time: 100 })
    expect(events).toContainEqual({ type: 'setValue', value: 0, time: 100 })
    // linearRamp to 0.8 at now + (fadeIn - offset) = 100 + 1 = 101
    expect(events).toContainEqual({ type: 'linearRamp', value: 0.8, time: 101 })
  })

  it('fade-out holds at volume then ramps to 0 at cue end', () => {
    const { param, events } = mockParam()
    // 4s cue, 1s fade-out, starting at offset 0.
    scheduleFadeAutomation(param, 0.8, 4.0, 0, 1.0, 0, 100)
    // Default setValue volume at 100.
    expect(events).toContainEqual({ type: 'setValue', value: 0.8, time: 100 })
    // Pin volume at fade-out start: 100 + (4 - 1 - 0) = 103
    expect(events).toContainEqual({ type: 'setValue', value: 0.8, time: 103 })
    // linearRamp to 0 at fade-out end: 100 + (4 - 0) = 104
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 104 })
  })

  it('fade-in + fade-out together', () => {
    const { param, events } = mockParam()
    // 4s cue, 1s fade-in, 1s fade-out.
    scheduleFadeAutomation(param, 1.0, 4.0, 1.0, 1.0, 0, 100)
    const sets = events.filter(e => e.type === 'setValue')
    const ramps = events.filter(e => e.type === 'linearRamp')
    // setValue: 0 @ 100 (fade-in start), 1.0 @ 100 (default), 1.0 @ 103 (fade-out start)
    expect(sets).toContainEqual({ type: 'setValue', value: 0, time: 100 })
    expect(sets).toContainEqual({ type: 'setValue', value: 1.0, time: 100 })
    expect(sets).toContainEqual({ type: 'setValue', value: 1.0, time: 103 })
    // ramps: to 1.0 @ 101 (fade-in end), to 0 @ 104 (fade-out end)
    expect(ramps).toContainEqual({ type: 'linearRamp', value: 1.0, time: 101 })
    expect(ramps).toContainEqual({ type: 'linearRamp', value: 0, time: 104 })
  })

  it('starting mid-fade-in continues the ramp from proportional gain', () => {
    const { param, events } = mockParam()
    // 4s cue, 2s fade-in. Starting at offset 0.5 (1/4 through fade-in).
    // Gain at offset 0.5 = (0.5 / 2) * 1.0 = 0.25
    // Ramp ends at now + (fadeIn - offset) = 100 + (2 - 0.5) = 101.5
    scheduleFadeAutomation(param, 1.0, 4.0, 2.0, 0, 0.5, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 0.25, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 1.0, time: 101.5 })
  })

  it('starting mid-fade-out continues the ramp to 0', () => {
    const { param, events } = mockParam()
    // 4s cue, 2s fade-out. Starting at offset 3 (1s before end, 1s into fade-out).
    // Gain at offset 3 = remaining/fadeOut * vol = (4-3)/2 * 1.0 = 0.5
    // Ramp to 0 at now + remaining = 100 + 1 = 101
    scheduleFadeAutomation(param, 1.0, 4.0, 0, 2.0, 3, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 0.5, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 101 })
  })

  it('starting past fade-in holds at volume', () => {
    const { param, events } = mockParam()
    // 4s cue, 1s fade-in. Starting at offset 2 (fade-in already done).
    scheduleFadeAutomation(param, 0.7, 4.0, 1.0, 0, 2, 100)
    // Only the default setValue; no fade-in ramp (offset >= fadeIn).
    expect(events.filter(e => e.type === 'linearRamp' && e.value === 0.7)).toEqual([])
    expect(events).toContainEqual({ type: 'setValue', value: 0.7, time: 100 })
  })

  it('clamps fadeIn to half cue duration', () => {
    const { param, events } = mockParam()
    // 4s cue, ask for 5s fade-in. Should clamp to 2s.
    // Gain at offset 0 = 0, ramps to volume at now + 2s.
    scheduleFadeAutomation(param, 1.0, 4.0, 5.0, 0, 0, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 0, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 1.0, time: 102 })
  })

  it('clamps fadeOut to half cue duration', () => {
    const { param, events } = mockParam()
    // 4s cue, ask for 5s fade-out. Should clamp to 2s.
    // Fade-out starts at 4 - 2 = 2s in source clock = now + 2 = 102
    // Ends at 4 - 0 = 4s in source clock = now + 4 = 104
    scheduleFadeAutomation(param, 1.0, 4.0, 0, 5.0, 0, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 1.0, time: 102 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 104 })
  })

  it('zero duration cue is a no-op beyond the default setValue', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.5, 0, 1.0, 1.0, 0, 100)
    expect(events).toEqual([
      { type: 'setValue', value: 0.5, time: 100 },
    ])
  })

  it('no fades when both fadeIn/fadeOut are zero even with duration', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.9, 5.0, 0, 0, 0, 100)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'setValue', value: 0.9, time: 100 })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // Additional edge cases — boundary conditions, degenerate inputs, clamps
  // ════════════════════════════════════════════════════════════════════════════

  it('volume = 0 sets value 0 at now (silent throughout)', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0, 4.0, 1.0, 1.0, 0, 100)
    // Default setValue at 0, plus fade-in ramp from 0→0.
    expect(events).toContainEqual({ type: 'setValue', value: 0, time: 100 })
    // linearRamp to 0 (volume) at end of fade-in.
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 101 })
  })

  it('volume = 1.0 (max) is handled the same as any other value', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 1.0, 4.0, 0, 0, 0, 100)
    expect(events).toEqual([{ type: 'setValue', value: 1.0, time: 100 }])
  })

  it('offset past cueDuration still emits the default setValue (no guard in scheduleFade)', () => {
    const { param, events } = mockParam()
    // offset 10 into a 4s cue — way past the end.
    scheduleFadeAutomation(param, 0.8, 4.0, 1.0, 1.0, 10, 100)
    // The function doesn't guard offset > duration — it still emits the default.
    expect(events).toContainEqual({ type: 'setValue', value: 0.8, time: 100 })
  })

  it('fadeIn exactly equal to cueDuration/2 is NOT clamped (boundary)', () => {
    const { param, events } = mockParam()
    // 4s cue, fadeIn=2 (=4/2, exactly the clamp ceiling). Not clamped.
    scheduleFadeAutomation(param, 1.0, 4.0, 2.0, 0, 0, 100)
    // Ramp from 0 to 1.0 over 2s → ends at now+2=102.
    expect(events).toContainEqual({ type: 'setValue', value: 0, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 1.0, time: 102 })
  })

  it('fadeOut exactly equal to cueDuration/2 is NOT clamped (boundary)', () => {
    const { param, events } = mockParam()
    // 4s cue, fadeOut=2 (=4/2). Fade-out starts at 4-2=2 → now+2=102.
    scheduleFadeAutomation(param, 1.0, 4.0, 0, 2.0, 0, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 1.0, time: 102 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 104 })
  })

  it('negative fadeIn is clamped to 0 (Math.max guard)', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.8, 4.0, -1.0, 0, 0, 100)
    // Negative → clamped to 0 → fadeIn <=0 → no ramp → just default setValue.
    expect(events).toEqual([{ type: 'setValue', value: 0.8, time: 100 }])
  })

  it('negative fadeOut is clamped to 0 (Math.max guard)', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.8, 4.0, 0, -2.0, 0, 100)
    expect(events).toEqual([{ type: 'setValue', value: 0.8, time: 100 }])
  })

  it('offset exactly at fadeIn boundary → no fade-in ramp (offset < fadeIn is false)', () => {
    const { param, events } = mockParam()
    // 4s cue, fadeIn=2. offset=2 → offset < fadeIn is false → no fade-in.
    scheduleFadeAutomation(param, 0.8, 4.0, 2.0, 0, 2, 100)
    const ramps = events.filter(e => e.type === 'linearRamp' && e.value === 0.8)
    expect(ramps).toEqual([])
  })

  it('offset exactly at fadeOutStart → inside fade-out branch (gain starts declining)', () => {
    const { param, events } = mockParam()
    // 4s cue, fadeOut=1. fadeOutStart = 4-1=3. offset=3 → inside fade-out.
    // remaining = 4-3=1. gainNow = (1/1)*1.0 = 1.0. Ramp to 0 at now+1=101.
    scheduleFadeAutomation(param, 1.0, 4.0, 0, 1.0, 3, 100)
    expect(events).toContainEqual({ type: 'setValue', value: 1.0, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 101 })
  })

  it('tiny cueDuration (0.001) still schedules if fades are proportionally tiny', () => {
    const { param, events } = mockParam()
    // 0.001s cue, 0.0005 fadeIn (clamped to 0.0005 = dur/2). offset 0.
    scheduleFadeAutomation(param, 0.5, 0.001, 0.0005, 0, 0, 100)
    // Should still produce fade-in events.
    const ramps = events.filter(e => e.type === 'linearRamp')
    expect(ramps.length).toBeGreaterThan(0)
  })

  it('negative cueDuration is treated as 0 (returns after default setValue)', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.5, -1.0, 1.0, 1.0, 0, 100)
    // cueDuration <= 0 → return immediately.
    expect(events).toEqual([{ type: 'setValue', value: 0.5, time: 100 }])
  })

  it('both fades active with offset between them → enters fade-out inside-branch (source-clock)', () => {
    const { param, events } = mockParam()
    // 10s cue, 2s fadeIn, 2s fadeOut. offset=5.
    // fade-in: offset(5) >= fadeIn(2) → no fade-in ramp.
    // fade-out: fadeOutStartSrc = cueDuration - fadeOut - offset = 10-2-5=3.
    //   offset(5) >= fadeOutStartSrc(3) → "inside" branch fires.
    //   remaining = 10-5=5. gainNow = (5/2)*0.7 = 1.75.
    scheduleFadeAutomation(param, 0.7, 10.0, 2.0, 2.0, 5, 100)
    // Default setValue at volume.
    expect(events).toContainEqual({ type: 'setValue', value: 0.7, time: 100 })
    // Override: gainNow = 1.75 at 100.
    expect(events).toContainEqual({ type: 'setValue', value: 1.75, time: 100 })
    // Ramp to 0 at now + remaining = 105.
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 105 })
  })

  it('fade-in with offset exactly 0 produces the full ramp from 0', () => {
    const { param, events } = mockParam()
    // offset=0 → gainNow = (0/fadeIn)*vol = 0.
    scheduleFadeAutomation(param, 0.9, 5.0, 2.0, 0, 0, 200)
    expect(events).toContainEqual({ type: 'setValue', value: 0, time: 200 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0.9, time: 202 })
  })

  it('fade-out with offset 0 schedules entirely in the future', () => {
    const { param, events } = mockParam()
    // 6s cue, 2s fadeOut, offset 0. fadeOutStart = 6-2=4.
    scheduleFadeAutomation(param, 0.6, 6.0, 0, 2.0, 0, 300)
    // Pin volume at now+4=304.
    expect(events).toContainEqual({ type: 'setValue', value: 0.6, time: 304 })
    // Ramp to 0 at now+6=306.
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 306 })
  })

  it('simultaneous fade-in + fade-out with offset inside both regions', () => {
    const { param, events } = mockParam()
    // 4s cue, 3s fadeIn, 3s fadeOut (both clamped to 2 = dur/2).
    // offset=1.
    // Fade-in: offset(1) < fadeIn(2) → inside. gainNow = (1/2)*1.0 = 0.5.
    //   Ramp to 1.0 at now+(2-1)=101.
    // Fade-out: fadeOutStartSrc = 4-2-1 = 1. offset(1) >= 1 → "inside" branch.
    //   remaining = 4-1 = 3. gainNow = (3/2)*1.0 = 1.5.
    //   Override setValue(1.5, 100). Ramp to 0 at now+3=103.
    scheduleFadeAutomation(param, 1.0, 4.0, 3.0, 3.0, 1, 100)
    // Fade-in events.
    expect(events).toContainEqual({ type: 'setValue', value: 0.5, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 1.0, time: 101 })
    // Fade-out override + ramp.
    expect(events).toContainEqual({ type: 'setValue', value: 1.5, time: 100 })
    expect(events).toContainEqual({ type: 'linearRamp', value: 0, time: 103 })
  })

  it('default setValueAtTime is always first regardless of fade config', () => {
    const { param, events } = mockParam()
    scheduleFadeAutomation(param, 0.5, 4.0, 1.0, 1.0, 0, 100)
    // The very first event is always the default setValue(volume, now).
    expect(events[0]).toEqual({ type: 'setValue', value: 0.5, time: 100 })
  })
})
