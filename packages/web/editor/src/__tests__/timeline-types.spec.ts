import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SEGMENT_PARAMS,
  FLF_MODES,
  TRACK_COLORS,
  SEGMENT_STATUSES,
  normalizeSegmentStatus,
} from "@melite/contracts"

describe('Timeline Types — constants', () => {
  it('TRACK_COLORS has at least 3 colors for auto-assignment', () => {
    expect(TRACK_COLORS.length).toBeGreaterThanOrEqual(3)
    for (const c of TRACK_COLORS) {
      expect(c.startsWith('#')).toBe(true)
    }
  })

  it('FLF_MODES lists off + on', () => {
    const ids = FLF_MODES.map(m => m.id)
    expect(ids).toEqual(['off', 'on'])
  })

  it('DEFAULT_SEGMENT_PARAMS ships Phase 16 progressive-resolution defaults', () => {
    expect(DEFAULT_SEGMENT_PARAMS.progressiveEnabled).toBe(false)
    expect(DEFAULT_SEGMENT_PARAMS.progressiveLevels).toBeGreaterThanOrEqual(1)
    expect(DEFAULT_SEGMENT_PARAMS.progressiveDelta).toBeGreaterThan(0)
    expect(DEFAULT_SEGMENT_PARAMS.progressiveDelta).toBeLessThan(1)
    expect(['dct', 'dct_rewind']).toContain(DEFAULT_SEGMENT_PARAMS.progressiveMode)
  })

  it('DEFAULT_SEGMENT_PARAMS targets the catalog VACE director route (Base speed tier) at 640×480, 33 frames, 16fps', () => {
    expect(DEFAULT_SEGMENT_PARAMS.seed).toBeTypeOf('number')
    expect(DEFAULT_SEGMENT_PARAMS.width).toBe(640)
    expect(DEFAULT_SEGMENT_PARAMS.height).toBe(480)
    expect(DEFAULT_SEGMENT_PARAMS.fps).toBe(16)
    expect(DEFAULT_SEGMENT_PARAMS.frames).toBe(33)
    expect(DEFAULT_SEGMENT_PARAMS.model).toBe('wan-vace')
    expect(DEFAULT_SEGMENT_PARAMS.profile).toBe('fast')
    expect(DEFAULT_SEGMENT_PARAMS.samplingSteps).toBe(10)
    expect(DEFAULT_SEGMENT_PARAMS.guideScale).toBeGreaterThan(0)
    expect(DEFAULT_SEGMENT_PARAMS.motionAmplitude).toBe(1.0)
    expect(DEFAULT_SEGMENT_PARAMS.flfMode).toBe(false)
    expect(DEFAULT_SEGMENT_PARAMS.resizeMethod).toMatch(/^(stretch|fit|crop|pad|pad-green)$/)
    // Phase 8 — TeaCache defaults
    expect(DEFAULT_SEGMENT_PARAMS.teacacheEnabled).toBe(false)
    expect(DEFAULT_SEGMENT_PARAMS.teacacheThreshold).toBeCloseTo(0.01)
  })

  // ─── G18: scale_by (latent spatial upscaling) ──────────────────────────

  it('G18: DEFAULT_SEGMENT_PARAMS.scaleBy defaults to 1.0 (no upscale)', () => {
    expect(DEFAULT_SEGMENT_PARAMS.scaleBy).toBe(1.0)
    expect(DEFAULT_SEGMENT_PARAMS.scaleBy).toBeTypeOf('number')
  })

  // ─── G19: tiled VAE encode ─────────────────────────────────────────────

  it('G19: DEFAULT_SEGMENT_PARAMS ships tiled-encode defaults', () => {
    expect(DEFAULT_SEGMENT_PARAMS.useTiledEncode).toBe(false)
    expect(DEFAULT_SEGMENT_PARAMS.tileSize).toBe(256)
    expect(DEFAULT_SEGMENT_PARAMS.tileOverlap).toBe(64)
  })

  // ─── G20: image_attention_strength ─────────────────────────────────────

  it('G20: DEFAULT_SEGMENT_PARAMS.imageAttentionStrength defaults to 1.0', () => {
    expect(DEFAULT_SEGMENT_PARAMS.imageAttentionStrength).toBe(1.0)
    expect(DEFAULT_SEGMENT_PARAMS.imageAttentionStrength).toBeTypeOf('number')
  })
})

// ─── normalizeSegmentStatus: persisted/imported status coercion ─────────

describe('Timeline Types — normalizeSegmentStatus', () => {
  it("SEGMENT_STATUSES lists the 5 canonical statuses in flow order", () => {
    expect(SEGMENT_STATUSES).toEqual(['empty', 'pending', 'generating', 'ready', 'failed'])
  })

  it("returns the input unchanged when it is a valid SegmentStatus", () => {
    for (const s of SEGMENT_STATUSES) {
      expect(normalizeSegmentStatus(s)).toBe(s)
    }
  })

  it("returns 'empty' for a pre-refactor persisted status (e.g. 'error')", () => {
    // 'error' was the pre-refactor name for a failed segment; it must map to
    // the safe default rather than crash the timeline render.
    expect(normalizeSegmentStatus('error')).toBe('empty')
  })

  it("returns 'empty' for an arbitrary unknown string", () => {
    expect(normalizeSegmentStatus('explosive')).toBe('empty')
    expect(normalizeSegmentStatus('')).toBe('empty')
  })

  it("returns 'empty' for non-string inputs (null, undefined, number, object)", () => {
    expect(normalizeSegmentStatus(null)).toBe('empty')
    expect(normalizeSegmentStatus(undefined)).toBe('empty')
    expect(normalizeSegmentStatus(42)).toBe('empty')
    expect(normalizeSegmentStatus({ status: 'ready' })).toBe('empty')
    expect(normalizeSegmentStatus(['ready'])).toBe('empty')
  })

  it("is case-sensitive ('Ready' ≠ 'ready')", () => {
    expect(normalizeSegmentStatus('Ready')).toBe('empty')
    expect(normalizeSegmentStatus('READY')).toBe('empty')
    expect(normalizeSegmentStatus('ready')).toBe('ready')
  })
})
