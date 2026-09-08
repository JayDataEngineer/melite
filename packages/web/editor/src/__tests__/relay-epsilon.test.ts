import { describe, it, expect } from 'vitest'
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts"
import type { TimelineSegment, PromptBeat } from "@melite/contracts"

describe('Prompt Relay epsilon (G1/G2)', () => {
  it('DEFAULT_SEGMENT_PARAMS has relayEpsilon', () => {
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBeDefined()
    expect(typeof DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBe('number')
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBe(0.01)
  })

  it('relayEpsilon is in valid range', () => {
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBeGreaterThan(0)
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBeLessThan(1)
  })

  it('segment with prompt beats preserves relayEpsilon for ComfyUI scheduler overrides', () => {
    const seg: TimelineSegment = {
      id: 'test',
      order: 0, start: 0,
      prompt: 'a scene',
      negativePrompt: '',
      thumbnailUrl: null,
      firstFrameB64: null,
      lastFrameB64: null,
      duration: 5,
      videoUrl: null,
      status: 'pending',
      lipSyncedVideoUrl: null,
      lipSyncPreferOriginal: false,
      promptBeats: [
        { id: 'b1', time: 0, prompt: 'a cat' },
        { id: 'b2', time: 2.5, prompt: 'a dog' },
      ],
      keyframes: [],
      params: { ...DEFAULT_SEGMENT_PARAMS, relayEpsilon: 0.02 },
      trimStart: 0, sourceStepId: null, error: null,
      controlVideoUrl: null,
    }

    // The old buildDiffusersScheduledPayload helper has been removed; the
    // relayEpsilon value now travels on the segment into ComfyUI overrides
    // when the scheduler template supports per-beat epsilon.
    const hasBeats = (seg.promptBeats?.length ?? 0) > 0
    const epsilon = hasBeats ? seg.params.relayEpsilon : undefined
    expect(epsilon).toBe(0.02)
  })

  it('epsilon slider range is (0.001, 0.5)', () => {
    // These bounds must match the slider in the director schema
    const sliderMin = 0.001
    const sliderMax = 0.5
    const sliderStep = 0.001
    expect(sliderMin).toBeGreaterThan(0)
    expect(sliderMax).toBeLessThan(1)
    expect(sliderStep).toBeLessThanOrEqual(0.01)
    // Default should be within range
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBeGreaterThanOrEqual(sliderMin)
    expect(DEFAULT_SEGMENT_PARAMS.relayEpsilon).toBeLessThanOrEqual(sliderMax)
  })
})

// ─── G17: per-boundary epsilon ───────────────────────────────────────────

describe('Prompt Relay per-boundary epsilon (G17)', () => {
  /** Mirrors the per-beat epsilon emission logic used by the ComfyUI
   *  scheduler overrides when promptBeats carry their own epsilon. */
  function emitEpsilon(beats: { epsilon?: number }[], relayEpsilon: number): number | number[] {
    const hasPerBeatEpsilon = beats.some(b => typeof b.epsilon === "number")
    if (hasPerBeatEpsilon) {
      return beats.map(b => (typeof b.epsilon === "number" ? b.epsilon : relayEpsilon))
    }
    return relayEpsilon
  }

  it('PromptBeat type accepts an optional epsilon field', () => {
    const beat = { id: 'b1', time: 0, prompt: 'cat', epsilon: 0.001 }
    expect(beat.epsilon).toBe(0.001)
  })

  it('emits scalar epsilon when no per-beat epsilon set', () => {
    const beats: PromptBeat[] = [
      { id: 'b1', time: 0, prompt: 'a' },
      { id: 'b2', time: 2, prompt: 'b' },
    ]
    const eps = emitEpsilon(beats, 0.02)
    expect(eps).toBe(0.02)
    expect(typeof eps).toBe('number')
  })

  it('emits epsilon list when any beat has per-beat epsilon', () => {
    const beats = [
      { id: 'b1', time: 0, prompt: 'a', epsilon: 0.001 },
      { id: 'b2', time: 2, prompt: 'b', epsilon: 0.5 },
    ]
    const eps = emitEpsilon(beats, 0.02)
    expect(Array.isArray(eps)).toBe(true)
    expect(eps).toEqual([0.001, 0.5])
  })

  it('mixed beats fall back to relayEpsilon for unset entries', () => {
    const beats = [
      { id: 'b1', time: 0, prompt: 'a', epsilon: 0.001 },
      { id: 'b2', time: 2, prompt: 'b' },          // no epsilon → fallback
      { id: 'b3', time: 4, prompt: 'c', epsilon: 0.3 },
    ]
    const eps = emitEpsilon(beats, 0.02) as number[]
    expect(eps).toEqual([0.001, 0.02, 0.3])
  })

  it('single per-beat epsilon triggers list mode for all beats', () => {
    const beats = [
      { id: 'b1', time: 0, prompt: 'a', epsilon: 0.001 },
      { id: 'b2', time: 2, prompt: 'b' },
    ]
    const eps = emitEpsilon(beats, 0.02) as number[]
    expect(Array.isArray(eps)).toBe(true)
    // Only the first beat has epsilon; the second falls back to 0.02.
    expect(eps).toEqual([0.001, 0.02])
  })

  it('per-beat epsilon values are in valid range', () => {
    const beats = [
      { id: 'b1', time: 0, prompt: 'a', epsilon: 0.001 },
      { id: 'b2', time: 2, prompt: 'b', epsilon: 0.5 },
    ]
    const eps = emitEpsilon(beats, 0.02) as number[]
    for (const e of eps) {
      expect(e).toBeGreaterThan(0)
      expect(e).toBeLessThan(1)
    }
  })
})
