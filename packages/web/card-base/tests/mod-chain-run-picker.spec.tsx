// @vitest-environment happy-dom
// mod-chain-run-picker.spec.tsx — THE CHAIN-RUN SEAT'S FACE WALL
// (2026-11-01, the operator's burn: the Add Upscale mod form's
// "Chain run" field was FREE-TEXT demanding the engine-side
// h3_chains store name, explained by a wall of tooltip prose).
//
// The invariant: the field the h3-timeline card DECLARES is a real
// picker over the LIVE chain-store runs — the declaration says
// 'chain-run' (arm 1), the leaf renders the labeled rows the estate
// served (arm 2: run id + lane + scene count, the plain film never
// listed), the free-text affordance survives ONLY as the explicit
// advanced fallback, and a host without the runs lane degrades to
// the plain text input (arm 3 — the faces' own degrade law). The
// kinds here are the composition root's REAL card registry rows
// (loadCardDefs) — toggling the declaration out reds arm 1 and arm 2
// verbatim, never a hand-built kind.
import '../../../../tests/helpers/boot-models.ts'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import assert from 'node:assert/strict'
import { afterEach, expect, test, vi } from 'vitest'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { fetchChainRunCandidates } from '../src/runs-policy.ts'
import { ModifiersSection } from '../src/mods.tsx'
import type { ModifierKind } from '../src/spec.ts'

afterEach(cleanup)

/** The estate rows the picker reads (the RunRow gate's own schema;
 *  the two chain runs carry stamps, the film proves nothing). */
function bindChainRuns(): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error('unused namespace in this wall: ' + method) }
  const rows = [
    {
      run_id: 'run-plain-film-1', name: 'the film', flow: 'h3-timeline', status: 'completed',
      created_at: 500, prompt: '', seed: 0, thumbnail: '', artifacts: [], params: {}, draft_id: '',
    },
    {
      run_id: 'run-5d9e144a4667', name: 'the chain', flow: 'h3-timeline', status: 'completed',
      created_at: 900, prompt: '', seed: 0, thumbnail: '', artifacts: [], params: {}, draft_id: '',
    },
    {
      run_id: 'run-2aa2bb2cc333', name: 'the swap', flow: 'h3-timeline', status: 'completed',
      created_at: 700, prompt: '', seed: 0, thumbnail: '', artifacts: [], params: {}, draft_id: '',
    },
  ]
  const docs: Record<string, Record<string, unknown>> = {
    'run-plain-film-1': {
      run_id: 'run-plain-film-1', status: 'completed', variant: 'film', flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { url: '/melite-media/runs/run-plain-film-1/out.mp4' } }],
    },
    'run-5d9e144a4667': {
      run_id: 'run-5d9e144a4667', status: 'completed', variant: 'repair', flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { chain_store: { run_name: 'swap_1111', scenes: 4, end_clip: 4 } } }],
    },
    'run-2aa2bb2cc333': {
      run_id: 'run-2aa2bb2cc333', status: 'completed', variant: 'swap', flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { chain_store: { run_name: 'swap_2222', scenes: 2, end_clip: 2 } } }],
    },
  }
  bindEstateRemote({
    bench: { get: dead('bench/get'), 'add-stage': dead('bench/add-stage'), 'remove-stage': dead('bench/remove-stage') },
    drafts: { get: dead('drafts/get'), patch: dead('drafts/patch') },
    runs: {
      list: async () => ({ ok: true, value: { count: rows.length, runs: rows } }),
      status: async (runId: string) => {
        const doc = docs[runId]
        if (doc === undefined) return { ok: false, error: { message: 'unknown run_id "' + runId + '"', code: 'runs/unknown-run' } }
        return { ok: true, value: doc }
      },
      start: dead('runs/start'), stop: dead('runs/stop'), validate: dead('runs/validate'),
    },
    media: { list: dead('media/list') },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

/** The card's OWN declaration — the composition root's registry row
 *  (never a hand-built kind: the toggle must red through the served
 *  truth). */
async function upscaleKind(): Promise<ModifierKind> {
  const def = (await loadCardDefs()).get('h3-timeline')
  assert.ok(def, 'the composition root serves the h3-timeline card')
  // RE-PIN (the collapse's slice 4): the five bag names left
  // DECLARED_MOD_KINDS - the chain-run seat rides the ONE edit
  // kind's chain_run dial (the upscale POSTURE, never a peer kind).
  const k = (def.mods ?? []).find((m) => m.kind === 'edit')
  assert.ok(k, 'the h3-timeline card declares the edit mod kind')
  return k as unknown as ModifierKind
}

function openLeaf(props: Partial<Parameters<typeof ModifiersSection>[0]> = {}) {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  render(h(ModifiersSection, { kinds: [], values: {}, onEdit, onPatch, ...props }))
  return { onEdit, onPatch }
}

test('ARM 1 — THE DECLARATION: the card declares a chain-run picker seat with one short line', async () => {
  const k = await upscaleKind()
  const field = (k.fields ?? []).find((f) => f.name === 'chain_run')
  assert.ok(field, 'the edit kind declares the chain_run field')
  // THE PICKER LAW: the field's type NAMES the live seat. The bare
  // text spelling is the toggle's own red — this assertion is the
  // wall's firing edge.
  assert.equal(field.type, 'chain-run')
  // THE ONE-LINE LAW: the tooltip is product voice — a short line,
  // never the prose wall that explained a free-text store name.
  assert.ok(typeof field.tooltip === 'string' && field.tooltip.length <= 160, 'the tooltip is one short line')
  assert.ok(!String(field.tooltip).includes('h3_chains'), 'the tooltip no longer narrates the store plane')
})

test('ARM 2 — THE FACE: the leaf serves the LIVE labeled rows and binds the picked run id', async () => {
  bindChainRuns()
  const k = await upscaleKind()
  const { onEdit } = openLeaf({ kinds: [k], values: {}, loadChainRuns: fetchChainRunCandidates })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Video edit' }))
  // The load lands before the menu opens (the seat renders its state;
  // the wall awaits the fact, never a sleep).
  await waitFor(() => {
    expect(document.querySelector('[data-chain-run-picker="chain_run"]')?.getAttribute('data-chain-runs-loaded')).toBe('true')
  })
  // THE HUMAN-LABELED ROWS: run id + lane + what it resumes (the
  // scene count the stamp itself reports) — served rows, never a
  // fabricated list. The plain film is NOT a row.
  fireEvent.click(screen.getByRole('button', { name: 'Prior chain run' }))
  expect(screen.getByRole('menuitem', { name: 'run-5d9e144a4667 — repair, 4 scenes' })).not.toBeNull()
  expect(screen.getByRole('menuitem', { name: 'run-2aa2bb2cc333 — swap, 2 scenes' })).not.toBeNull()
  expect(screen.queryByRole('menuitem', { name: /run-plain-film-1/ })).toBeNull()
  fireEvent.click(screen.getByRole('menuitem', { name: 'run-5d9e144a4667 — repair, 4 scenes' }))
  // THE ADVANCED FALLBACK: free text survives ONLY as the explicit
  // advanced affordance beneath the menu.
  const advanced = screen.getByLabelText('Advanced — paste a run id') as HTMLInputElement
  expect(advanced).not.toBeNull()
  fireEvent.change(advanced, { target: { value: 'run-5d9e144a4667' } })
  // THE BIND: Add commits the entry with the ESTATE RUN ID — the
  // door's id-grammar resolves it to the store; never a hand-spelled
  // store name demanded of the operator.
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalled()
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag[0]?.['chain_run']).toBe('run-5d9e144a4667')
})

test('ARM 3 — THE DEGRADE: no runs lane (or a failed load) renders the plain text input', async () => {
  const k = await upscaleKind()
  // THE ABSENT LANE: the host threaded no loadChainRuns — the faces'
  // own degrade law (absent host = the plain inputs hold).
  const absent = openLeaf({ kinds: [k], values: {} })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Video edit' }))
  const input = screen.getByLabelText('Prior chain run') as HTMLInputElement
  assert.equal(input.tagName, 'INPUT')
  expect(screen.queryByLabelText('Advanced — paste a run id')).toBeNull()
  fireEvent.change(input, { target: { value: 'swap_1111' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  const [key, bag] = absent.onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag[0]?.['chain_run']).toBe('swap_1111')
  cleanup()

  // THE FAILED LOAD: a dead lane must not blank the seat either —
  // the same plain input holds, the truth stays honest.
  const failed = async (): Promise<never> => { throw new Error('connection reset') }
  const broken = openLeaf({ kinds: [k], values: {}, loadChainRuns: failed })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Video edit' }))
  await waitFor(() => {
    expect(document.querySelector('[data-chain-run-picker="chain_run"]')?.getAttribute('data-chain-runs-loaded')).toBe('failed')
  })
  const fallback = screen.getByLabelText('Prior chain run') as HTMLInputElement
  assert.equal(fallback.tagName, 'INPUT')
  fireEvent.change(fallback, { target: { value: 'swap_2222' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  const [bkey, bbag] = broken.onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(bkey).toBe('edit')
  expect(bbag[0]?.['chain_run']).toBe('swap_2222')
})

test('ARM 4 — THE SUPERSEDED FLIGHT: an aborted load is cleanup, never an error face (use-form-spec\'s own law)', async () => {
  bindChainRuns()
  const k = await upscaleKind()
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  // flight 1 stays in the air until the arm releases it — the remount
  // aborts it first, so the release must land as cleanup, not as a face
  let reject1: ((e: Error) => void) | null = null
  const late = (): Promise<never> => new Promise((_resolve, reject) => { reject1 = reject })
  const first = render(h(ModifiersSection, { kinds: [k], values: {}, onEdit, onPatch, loadChainRuns: late }))
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Video edit' }))
  const seat = () => document.querySelector('[data-chain-run-picker="chain_run"]')
  expect(seat()?.getAttribute('data-chain-runs-loaded')).toBe('false')
  // the host re-serves the lane (a new loader identity) — flight 1 aborts by design
  first.rerender(h(ModifiersSection, { kinds: [k], values: {}, onEdit, onPatch, loadChainRuns: fetchChainRunCandidates }))
  await act(async () => { reject1!(new Error('superseded')) })
  // the LIVE seat rides flight 2 to the served rows — a face that let
  // the aborted flight speak would read 'failed' here
  await waitFor(() => {
    expect(seat()?.getAttribute('data-chain-runs-loaded')).toBe('true')
  })
  expect(onEdit).not.toHaveBeenCalled()
})
