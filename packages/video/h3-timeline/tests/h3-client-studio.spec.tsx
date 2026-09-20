/**
 * h3-timeline-studio — the adapter mounting the CARD-PACKAGE tenant on
 * the bench's stage-view slot.
 *
 * THE LAWS THIS SPEC PINS:
 *  - THE MOUNT: the tenant is the card package's own VideoTimelineStudio
 *    (never a paraphrase) — its three layers render through the adapter.
 *  - THE WRITE CHANNEL (E1/E4): every studio gesture rides onSave →
 *    onPatch; observed keys ⊆ the family's declared writes.
 *  - THE DOC: params IS the document (hydrate from the bench row).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { H3TimelineStudio } from '../src/client/index.ts'
import type { StageViewOwnerProps } from '@melite/contracts'

/** A bench-owner shape: two text calls tiling 0..247 @24fps (10.3s). */
function owner(over: Partial<StageViewOwnerProps> = {}): StageViewOwnerProps {
  return {
    stageId: 's_4',
    cardName: 'h3-timeline',
    row: {
      id: 's_4',
      card: 'h3-timeline',
      title: 'H3 Timeline',
      params: {
        calls: [
          { text: 'shot one', start_frame: 0, end_frame: 160 },
          { text: '', start_frame: 160, end_frame: 247 },
        ],
        keyframes: [],
        fps: 24,
        seed: 7,
      },
    },
    runStatus: 'ready',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    ...over,
  } as StageViewOwnerProps
}

// ── STROKE 41: THE STICKY STARTER (operator, 2026-09-14: "h3
//    timeline is broken: card_compose phase 1 … no calls to
//    compose") — a fresh stage carries NO calls; the studio's
//    hydrate fallback must PERSIST, not just render. ─────────────

describe('THE STICKY STARTER (stroke 41: a calls-less stage persists the starter doc on mount)', () => {
  beforeEach(() => cleanup())

  it('a FRESH stage (params carry no calls) writes the starter calls on mount — Run can never meet "no calls to compose"', async () => {
    const p = owner({ row: { id: 's_9', card: 'h3-timeline', title: 'H3', params: { fps: 24, seed: 7 } } })
    render(h(H3TimelineStudio, p))
    await waitFor(() => {
      const calls = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((patch) => Array.isArray(patch['calls']))
      expect(calls.length).toBeGreaterThanOrEqual(1)
    })
    const patch = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((x) => Array.isArray(x['calls']))
      .at(-1)!
    const calls = patch['calls'] as Array<{ start_frame?: number; end_frame?: number; text?: string }>
    // the starter is a REAL shot list: ≥1 call, int spans, non-reversed
    expect(calls.length).toBeGreaterThanOrEqual(1)
    for (const c of calls) {
      expect(Number.isInteger(c.start_frame)).toBe(true)
      expect(Number.isInteger(c.end_frame)).toBe(true)
      expect((c.end_frame as number) - (c.start_frame as number)).toBeGreaterThan(0)
    }
  })

  it('a stage WITH calls still no-ops on mount (the old guard behavior is untouched)', async () => {
    const p = owner()
    render(h(H3TimelineStudio, p))
    await waitFor(() => { expect(document.body.textContent ?? '').toMatch(/2 calls/) })
    // settle: no calls-writing patch may fire for the hydrated doc
    await new Promise((r) => { setTimeout(r, 30) })
    const callsPatches = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((x) => Array.isArray(x['calls']))
    expect(callsPatches.length).toBe(0)
  })
})

describe('H3TimelineStudio (the card-package tenant, mounted)', () => {
  beforeEach(() => cleanup())

  it('mounts the tenant: the document readout renders from the bench row doc', async () => {
    const p = owner()
    render(h(H3TimelineStudio, p))
    await waitFor(() => {
      const root = document.body.textContent ?? ''
      expect(root).toMatch(/2 calls/)
    })
    expect(document.body.textContent ?? '').toMatch(/10(\.\d+)?s|247/)
  })

  it('the write channel: a prompt edit rides onSave with the calls doc (never a foreign key)', async () => {
    const p = owner()
    render(h(H3TimelineStudio, p))
    const card = await screen.findByText('shot one')
    fireEvent.click(card)
    const ta = await waitFor(() => {
      const el = document.querySelector('textarea') as HTMLTextAreaElement | null
      if (el === null) throw new Error('no prompt editor yet')
      return el
    })
    fireEvent.change(ta, { target: { value: 'rain streaks the glass' } })
    await waitFor(() => {
      expect(p.onPatch).toHaveBeenCalled()
    })
    const patch = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as Record<string, unknown>
    // the write channel's vocabulary: the doc clock + the WIRE knobs
    // (the py-era audio_mode/continuity fictions died with the rework)
    expect(Object.keys(patch).every((k) =>
      ['calls', 'keyframes', 'fps', 'seed', 'audio_clips', 'audio_stem', 'length', 'prompt', 'image', 'width', 'height', 'steps', 'denoise', 'sampler_name', 'sched_name', 'shift_video', 'shift_audio', 'loras'].includes(k)
      || k.startsWith('sla_') || k.startsWith('sharpen_') || k.startsWith('interp_') || k.startsWith('sr_') || k.startsWith('refine_'))).toBe(true)
    const calls = patch['calls'] as Array<{ text?: string }>
    expect(calls[0]!.text).toBe('rain streaks the glass')
  })

  it('running rides the tenant contract (runStatus → running prop)', () => {
    render(h(H3TimelineStudio, owner({ runStatus: 'running' })))
    expect(document.body.textContent ?? '').not.toBe('')
  })
})

// ── STROKE 35 RETIRED (the generic-seam law): the advanced rail's
//    SpecPanel + ModLane mount rendered every SLA leaf, every post
//    leaf, and the loras section TWICE (CardForm already owns all of
//    it). The mount is gone, the component and its spec deleted with
//    it — the envelope-grammar pins live on card-base's own walls.
