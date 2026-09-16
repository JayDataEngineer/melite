// @vitest-environment happy-dom
/**
 * anny Shape — the Character Maker. Pure helpers pin directly
 * (seed/scrub/serialize/draft/echo-guard); the bridge pins through
 * a harness over the real body-studio store; Apply pins through the
 * viewport with a stubbed queue door (one try, no retry — the stub
 * counts calls).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'
import { useBodyStudio } from '@melite/cards/3d/body/ui/studio/bodyStudio'

import {
  AnnyCharacterViewport, AnnyShapeBand, AnnyShapeDrawer,
  draftFromParams, sculptNeedsWrite, scrubLegacyBag, seedFromEstimate, serializeDraft,
  useAnnyShapeBridge,
} from '../src/ui/studio/shape.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useBodyStudio.getState().resetEditing()
})

const SPACE = {
  defaults: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  localChangesLabels: ['mouthOpen', 'browRaise', 'hipWidth', 'browRaise', 42 as never, 'noseBridge', 'spineBend'],
}

const DRAFT = {
  dialect: 'authored',
  phenotype: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5],
  local_changes: { hipWidth: 0.9, junk: 'x' },
}

function mkStage(params: Record<string, unknown> = {}): CardStage {
  return {
    id: 's1', title: 'Anny', kind: 'txt2img', service: 'anny',
    params, inputs: [], inputIndices: [], result: null,
  } as unknown as CardStage
}

describe('seedFromEstimate', () => {
  test('the happy path keeps order, drops ignored/dups/non-strings', () => {
    const out = seedFromEstimate({ phenotype: [1, 2, 3, 4, 5, 6], scale: [0.1, 0.2, 0.3] }, SPACE)
    expect(out.coeffs).toEqual([1, 2, 3, 4, 5, 6, 0.5, 0.5, 0.5, 0.5, 0.5])
    // mouth*/nose* ignored, mouthOpen deduped, 42 skipped
    expect(out.localChanges).toEqual({ browRaise: 0.1, hipWidth: 0.2, spineBend: 0.3 })
  })

  test('drift refuses loud — phenotype, defaults, scale', () => {
    const good = { phenotype: [1, 2, 3, 4, 5, 6], scale: [0.1, 0.2, 0.3] }
    expect(() => seedFromEstimate({ phenotype: 'x', scale: [] }, SPACE)).toThrow(/phenotype wants 6/)
    expect(() => seedFromEstimate({ phenotype: [1, 2, 3], scale: [] }, SPACE)).toThrow(/phenotype wants 6/)
    expect(() => seedFromEstimate({ phenotype: [1, 2, 3, 4, 5, Number.NaN], scale: [] }, SPACE)).toThrow(/phenotype wants 6/)
    expect(() => seedFromEstimate(good, { defaults: [0.5], localChangesLabels: [] })).toThrow(/defaults want 11/)
    expect(() => seedFromEstimate(good, SPACE)).not.toThrow()
    expect(() => seedFromEstimate({ ...good, scale: [0.1] }, SPACE)).toThrow(/for 3 kept morphs/)
    expect(() => seedFromEstimate({ ...good, scale: 'x' }, SPACE)).toThrow(/non-array/)
    expect(() => seedFromEstimate({ ...good, scale: [0.1, 0.2, Number.POSITIVE_INFINITY] }, SPACE)).toThrow(/kept morphs/)
  })
})

describe('scrubLegacyBag', () => {
  test('clean rows ride null; dirty rows shed the bag only', () => {
    expect(scrubLegacyBag({ seed: 1 })).toBeNull()
    const dirty = { seed: 1, identityModel: 'soma', coeffs: [1], localChanges: {}, customTargets: null }
    const out = scrubLegacyBag(dirty)!
    expect(out).toEqual({ seed: 1 })
    expect(dirty).toHaveProperty('identityModel')
  })
})

describe('serializeDraft', () => {
  test('the untouched scratchpad serializes null', () => {
    expect(serializeDraft({ coeffs: null, localChanges: null })).toBeNull()
    expect(serializeDraft({ coeffs: [0.5], localChanges: null })).toBeNull()
    expect(serializeDraft({ coeffs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, Number.NaN], localChanges: null })).toBeNull()
  })

  test('live levers serialize; junk morphs drop', () => {
    const out = serializeDraft({
      coeffs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      localChanges: { a: 0.1, b: 'x', c: Number.NaN },
    })!
    expect(out).toEqual({ dialect: 'authored', phenotype: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], local_changes: { a: 0.1 } })
    // a missing bag still drafts (the levers are the draft)
    expect(serializeDraft({ coeffs: out.phenotype, localChanges: null })!.local_changes).toEqual({})
    expect(serializeDraft({ coeffs: out.phenotype, localChanges: 7 })!.local_changes).toEqual({})
  })
})

describe('draftFromParams', () => {
  test('missing/non-object/dialect-drifted drafts restore null', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(draftFromParams({})).toBeNull()
    expect(draftFromParams({ sculpt: 7 })).toBeNull()
    expect(draftFromParams({ sculpt: { dialect: 'ray' } })).toBeNull()
    expect(draftFromParams({ sculpt: { dialect: 'authored', phenotype: [1], local_changes: {} } })).toBeNull()
    expect(draftFromParams({ sculpt: { dialect: 'authored', phenotype: DRAFT.phenotype, local_changes: [] } })).toBeNull()
    expect(errors).toHaveBeenCalled()
    errors.mockRestore()
  })

  test('a valid draft restores with junk morphs dropped', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const out = draftFromParams({ sculpt: DRAFT })!
    expect(out.coeffs).toEqual(DRAFT.phenotype)
    expect(out.localChanges).toEqual({ hipWidth: 0.9 })
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})

describe('sculptNeedsWrite', () => {
  test('equality is canonical both sides', () => {
    expect(sculptNeedsWrite({ dialect: 'authored', phenotype: [1], local_changes: {} }, { dialect: 'authored', phenotype: [1], local_changes: {} })).toBe(false)
    expect(sculptNeedsWrite({ dialect: 'authored', phenotype: [1], local_changes: {} }, undefined)).toBe(true)
    expect(sculptNeedsWrite({ dialect: 'authored', phenotype: [2], local_changes: {} }, { dialect: 'authored', phenotype: [1], local_changes: {} })).toBe(true)
  })
})

/* ── the bridge ──────────────────────────────────────────────── */

function BridgeHarness({ stage, onSave }: { stage: CardStage; onSave: (p: Record<string, unknown>) => void }) {
  useAnnyShapeBridge(stage, onSave)
  return null
}

describe('useAnnyShapeBridge', () => {
  test('the persisted draft hydrates the levers; clean stages save nothing', () => {
    const onSave = vi.fn()
    render(h(BridgeHarness, { stage: mkStage({ sculpt: DRAFT }), onSave }))
    const editing = useBodyStudio.getState().editing
    expect(editing.coeffs).toEqual(DRAFT.phenotype)
    expect(editing.localChanges).toEqual({ hipWidth: 0.9 })
    expect(onSave).not.toHaveBeenCalled()
  })

  test('a fresh stage hydrates neutral and saves nothing', () => {
    const onSave = vi.fn()
    render(h(BridgeHarness, { stage: mkStage({ seed: 1 }), onSave }))
    expect(useBodyStudio.getState().editing.coeffs).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('the legacy bag lifts once', () => {
    const onSave = vi.fn()
    render(h(BridgeHarness, {
      stage: mkStage({ seed: 1, identityModel: 'soma', coeffs: [1], localChanges: {}, customTargets: null }),
      onSave,
    }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({ seed: 1 })
  })

  test('lever changes autosave debounced', async () => {
    const onSave = vi.fn()
    render(h(BridgeHarness, { stage: mkStage({}), onSave }))
    const coeffs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
    act(() => {
      useBodyStudio.getState().setEditing({ identityModel: 'anny', coeffs, localChanges: {}, customTargets: null })
    })
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
    expect(onSave).toHaveBeenCalledWith({ sculpt: { dialect: 'authored', phenotype: coeffs, local_changes: {} } })
  })

  test('the echo writes nothing; a reschedule flushes then saves', async () => {
    const sculpt = { dialect: 'authored', phenotype: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], local_changes: {} }
    const onSave = vi.fn()
    render(h(BridgeHarness, { stage: mkStage({ sculpt }), onSave }))
    // hydrated == persisted: the timer never arms
    await new Promise((r) => setTimeout(r, 600))
    expect(onSave).not.toHaveBeenCalled()
    // two back-to-back edits: the reschedule cleanup flushes A, T2 saves B
    const a = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
    const b = [0.9, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
    act(() => {
      useBodyStudio.getState().setEditing({ identityModel: 'anny', coeffs: a, localChanges: {}, customTargets: null })
    })
    // the reschedule's cleanup flushes A, then T2 saves B
    act(() => {
      useBodyStudio.getState().setEditing({ identityModel: 'anny', coeffs: b, localChanges: {}, customTargets: null })
    })
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2)
    })
    expect(onSave).toHaveBeenNthCalledWith(1, { sculpt: { dialect: 'authored', phenotype: a, local_changes: {} } })
    expect(onSave).toHaveBeenNthCalledWith(2, { sculpt: { dialect: 'authored', phenotype: b, local_changes: {} } })
  })

  test('unmount flushes the pending draft', () => {
    const onSave = vi.fn()
    const { unmount } = render(h(BridgeHarness, { stage: mkStage({}), onSave }))
    const coeffs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
    act(() => {
      useBodyStudio.getState().setEditing({ identityModel: 'anny', coeffs, localChanges: {}, customTargets: null })
    })
    unmount()
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

/* ── Apply ───────────────────────────────────────────────────── */

const DONE = {
  run_id: 'r1', status: 'completed',
  stages: [{ id: 's', name: 'mesh', index: 0, status: 'done', url: 'https://host/body.glb' }],
}

function stubFlow(opts: {
  drafts?: unknown; draftsStatus?: number; draftsText?: string;
  start?: unknown; startStatus?: number; startText?: string;
  statuses?: unknown[];
  throws?: unknown;
} = {}): void {
  let polls = 0
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (opts.throws !== undefined) throw opts.throws
    const u = String(url)
    if (u.includes('/v1/flows/drafts')) {
      if (opts.draftsText !== undefined) return new Response(opts.draftsText, { status: opts.draftsStatus ?? 200 })
      return new Response(JSON.stringify(opts.drafts ?? { draftId: 'd1' }), { status: opts.draftsStatus ?? 200 })
    }
    if (u.includes('/v1/flows/start')) {
      if (opts.startText !== undefined) return new Response(opts.startText, { status: opts.startStatus ?? 200 })
      return new Response(JSON.stringify(opts.start ?? { run_id: 'r1', status: 'queued' }), { status: opts.startStatus ?? 200 })
    }
    if (u.includes('/v1/flows/status/')) {
      const seq = opts.statuses ?? [DONE]
      const body = seq[Math.min(polls++, seq.length - 1)]
      return new Response(JSON.stringify(body), { status: 200 })
    }
    // anything else (the poser bind-mesh door) refuses — the canvas
    // holds its empty state exactly as with the door down
    return new Response('nope', { status: 500 })
  })
}

function applyNow(): void {
  fireEvent.click(screen.getByText('Apply to Body'))
}

describe('AnnyCharacterViewport Apply', () => {
  test('the happy path bakes and hydrates the Body slot', async () => {
    stubFlow()
    const onSave = vi.fn()
    render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave }))
    applyNow()
    // starting locks the chip mid-flight
    expect(screen.getByText('Baking…')).not.toBeNull()
    await screen.findByText('Character baked — the shaped body now fills the Body slot.')
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/body.glb' })
    expect(screen.getByText('Apply to Body')).not.toBeNull()
  })

  test('a running start ticks through the poll to done', async () => {
    stubFlow({
      start: { run_id: 'r1', status: 'running' },
      statuses: [
        { run_id: 'r1', status: 'running', stages: [] },
        DONE,
      ],
    })
    const onSave = vi.fn()
    render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave }))
    applyNow()
    await screen.findByText('Character baked — the shaped body now fills the Body slot.', {}, { timeout: 8000 })
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/body.glb' })
  }, 10000)

  test('the neutral row bakes when nothing persisted and levers rest', async () => {
    stubFlow()
    const onSave = vi.fn()
    render(h(AnnyCharacterViewport, { stage: mkStage({}), onSave }))
    applyNow()
    await screen.findByText('Character baked — the shaped body now fills the Body slot.')
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/body.glb' })
  })

  test('the live levers seed the payload when nothing persisted', async () => {
    stubFlow()
    const onSave = vi.fn()
    const coeffs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
    act(() => {
      useBodyStudio.getState().setEditing({ identityModel: 'anny', coeffs, localChanges: { a: 1 }, customTargets: null })
    })
    render(h(AnnyCharacterViewport, { stage: mkStage({}), onSave }))
    applyNow()
    await screen.findByText('Character baked — the shaped body now fills the Body slot.')
    expect(onSave).toHaveBeenCalled()
  })

  test('a queue refusal / empty refusal / non-JSON / missing run_id fail loud', async () => {
    stubFlow({ startStatus: 500, startText: 'nope' })
    const { unmount } = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    applyNow()
    await screen.findByText(/queue refused: HTTP 500: nope/)
    expect(screen.getByRole('alert')).not.toBeNull()
    unmount()

    stubFlow({ startStatus: 500, startText: '' })
    const second = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(second.getByText('Apply to Body'))
    await second.findByText(/queue refused: HTTP 500$/)
    second.unmount()

    stubFlow({ startText: 'garbage{' })
    const third = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(third.getByText('Apply to Body'))
    await third.findByText(/non-JSON body/)
    third.unmount()

    stubFlow({ start: {} })
    const fourth = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(fourth.getByText('Apply to Body'))
    await fourth.findByText(/no run_id/)
    fourth.unmount()
  })

  test('a GLB-less bake and a stillborn compose fail loud; a string rejection voices verbatim', async () => {
    stubFlow({ statuses: [{ run_id: 'r1', status: 'completed', stages: [{ id: 's', name: 'img', index: 0, status: 'done', url: 'https://host/x.png' }] }] })
    const { unmount } = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    applyNow()
    await screen.findByText(/completed with no body GLB/)
    unmount()

    stubFlow({ draftsStatus: 500, draftsText: 'birth refused' })
    const second = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(second.getByText('Apply to Body'))
    await second.findByText(/card compose refused: HTTP 500/)
    second.unmount()

    stubFlow({ draftsText: 'garbage{' })
    const third = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(third.getByText('Apply to Body'))
    await third.findByText(/card compose returned a non-JSON body/)
    third.unmount()

    stubFlow({ throws: 'boom-string' })
    const fourth = render(h(AnnyCharacterViewport, { stage: mkStage({ sculpt: DRAFT }), onSave: vi.fn() }))
    fireEvent.click(fourth.getByText('Apply to Body'))
    await fourth.findByText('boom-string')
    fourth.unmount()
  })

  test('the estimated-body chip warns of the replacement', () => {
    stubFlow()
    render(h(AnnyCharacterViewport, { stage: mkStage({}), onSave: vi.fn(), replacesEstimate: true }))
    expect(screen.getByText('Replace estimated body')).not.toBeNull()
    expect(screen.getByTitle(/replaced, not tweaked/)).not.toBeNull()
  })
})

describe('AnnyShapeBand + AnnyShapeDrawer', () => {
  test('expand/collapse ride the callbacks; the rail stands alone', () => {
    const onExpand = vi.fn()
    const { unmount } = render(h(AnnyShapeBand, { onExpand }))
    fireEvent.click(screen.getByText('Expand'))
    expect(onExpand).toHaveBeenCalledTimes(1)
    unmount()
    render(h(AnnyShapeBand, {}))
    expect(screen.queryByText('Expand')).toBeNull()
    cleanup()
    const onCollapse = vi.fn()
    render(h(AnnyShapeDrawer, { onCollapse }))
    fireEvent.click(screen.getByText('Collapse'))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })
})
