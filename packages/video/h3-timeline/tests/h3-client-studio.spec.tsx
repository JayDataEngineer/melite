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
    // the contract's required seat: no upstreams on this bench —
    // the projection tolerates nothing, so the helper seats [] (never
    // an omitted cast — the crash it hid broke six arms at once)
    upstream: [],
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
    // (2026-11-05, the list is dead) the REAL door: the bar's clip —
    // data-prompt-clip="call-N" (the operator's law: click the bar)
    const card = await waitFor(() => {
      const el = document.querySelector('[data-prompt-clip="call-0"]') as HTMLElement | null
      if (el === null) throw new Error('no bar clip yet')
      return el
    })
    // a settled pointer pair = the select gesture (the drag law: an
    // unmoved prompt pointerup selects — MotionTimelineBarDrag:158)
    fireEvent.pointerDown(card, { button: 0, clientX: 40 })
    fireEvent.pointerUp(document.body, { clientX: 40 })
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

  // THE SEAM TOGGLE WALL (operator 2026-09-23: "I changed the seam
  // from cut to carried" — the run composed 'cut' and the bench
  // STILL said 'cut'; the flash-then-drop). The toggle must leave
  // the studio as a calls patch carrying the new transition —
  // anything less is a silent refusal hiding a broken write.
  it('THE SEAM TOGGLE RIDES THE WRITE CHANNEL: cut → extend leaves onSave as calls with the new transition', async () => {
    const p = owner({
      row: {
        id: 's_4', card: 'h3-timeline', title: 'H3 Timeline',
        params: {
          calls: [
            { text: 'shot one', start_frame: 0, end_frame: 160 },
            { text: 'shot two', start_frame: 160, end_frame: 247, transition: 'cut' },
          ],
          keyframes: [], fps: 24, seed: 7,
        },
      },
    })
    render(h(H3TimelineStudio, p))
    // (re-pin 2026-11-09, the collapse's cuts) the rail's seam select
    // retired — the STRIP CHIP at the boundary is the one door. The
    // chip paints from the doc (cut) and its click writes the toggle.
    const chip = await waitFor(() => {
      const el = document.querySelector('[data-seam-toggle="call-1"]') as HTMLButtonElement | null
      if (el === null) throw new Error('no seam chip yet')
      return el
    })
    expect(chip.getAttribute('data-seam-state')).toBe('cut')
    // the wrapper carries the data seat; the catalog Button inside
    // owns the click (chrome canon — no hand-rolled seats)
    fireEvent.click(chip.querySelector('button') ?? chip)
    const patch = await waitFor(() => {
      const hit = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((x) => Array.isArray(x['calls']))
        .at(-1)
      if (hit === undefined) throw new Error('no calls patch fired')
      return hit
    })
    const calls = patch['calls'] as Array<{ transition?: string }>
    expect(calls[1]!.transition).toBe('extend')
  })

  // THE SPLIT SEAT WALL (§0.5, 2026-11-09 — the audit's finding: the
  // split was hidden in a double-click no clip ever passes through,
  // and the splice it performed stripped the call's identity and
  // stated no seam). The seat must be VISIBLE on the clip, and its
  // write must land on the write channel as the §0.5 split: BOTH
  // halves keep the text, the new seam states cut, the spans ride
  // the grid (the right half authors its content + the 22f cut price).
  it('THE SPLIT SEAT WRITES THE §0.5 SPLIT: identity carries, the new seam states cut', async () => {
    const p = owner({
      row: {
        id: 's_4', card: 'h3-timeline', title: 'H3 Timeline',
        params: {
          // 141 = 22+7·17, on-grid: the split finds frame 73 (the
          // nearest legal to the midpoint 71); the right half ends
          // at 141+22 = 163
          calls: [{ text: 'shot one', start_frame: 0, end_frame: 141 }],
          keyframes: [], fps: 24, seed: 7,
        },
      },
    })
    render(h(H3TimelineStudio, p))
    const seat = await waitFor(() => {
      const el = document.querySelector('[data-split-toggle="call-0"]') as HTMLElement | null
      if (el === null) throw new Error('no split seat on the clip yet')
      return el
    })
    fireEvent.click(seat.querySelector('button') ?? seat)
    const patch = await waitFor(() => {
      const hit = (p.onPatch as ReturnType<typeof vi.fn>).mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((x) => Array.isArray(x['calls']))
        .at(-1)
      if (hit === undefined) throw new Error('no calls patch fired')
      return hit
    })
    const calls = patch['calls'] as Array<{
      text?: string, start_frame: number, end_frame: number, transition?: string
    }>
    expect(calls.length).toBe(2)
    expect(calls[0]).toMatchObject({ text: 'shot one', start_frame: 0, end_frame: 73 })
    expect(calls[1]).toMatchObject({ text: 'shot one', start_frame: 73, end_frame: 163, transition: 'cut' })
  })
})

// ── STROKE 35 RETIRED (the generic-seam law): the advanced rail's
//    SpecPanel + ModLane mount rendered every SLA leaf, every post
//    leaf, and the loras section TWICE (CardForm already owns all of
//    it). The mount is gone, the component and its spec deleted with
//    it — the envelope-grammar pins live on card-base's own walls.
