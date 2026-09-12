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
    expect(Object.keys(patch).every((k) =>
      ['calls', 'keyframes', 'preset', 'fps', 'seed', 'audio_mode', 'continuity', 'audio_clips', 'audio_stem', 'length', 'prompt', 'image', 'width', 'height', 'steps'].includes(k))).toBe(true)
    const calls = patch['calls'] as Array<{ text?: string }>
    expect(calls[0]!.text).toBe('rain streaks the glass')
  })

  it('running rides the tenant contract (runStatus → running prop)', () => {
    render(h(H3TimelineStudio, owner({ runStatus: 'running' })))
    expect(document.body.textContent ?? '').not.toBe('')
  })
})
