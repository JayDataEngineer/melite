// @contract infra-acquire-manager-liveness
// assets-tab-row-doors.spec.tsx — THE ROSTER ROW DOORS (the 2026-10-22
// downloads-stream audit; the operator's wave item (m): "no retry/
// delete, stuck-percent-then-run — re-seat the download honesty cure
// with the current download plane").
//
// THE BURN: the declared-resources roster is where an operator meets
// a missing weight or a missing extension, and the row offered NO
// door on an absent row — the verbs existed door-side only
// (acquire_weight / install_extension), the provision fold wanted
// typed ids, and the run-refusal popup only fires from a refused
// run. The audit's own live lane carried the shape: rgthree-comfy
// sat absent with no verb, and a family the operator wanted
// downloaded through a text field two folds away.
//
// THE LAW: the row surfaces the door its state names — an absent (or
// failed/blocked) MODEL family row gets Download (acquire_weight,
// family id only — the links-in-code law: the DECL owns the URL);
// an absent EXTENSION row gets Install (install_extension, the
// row's own pack id); a failed/blocked row with an operation row
// keeps Retry/Delete; an ACTIVE row gets nothing (never a door that
// re-fetches landed bytes — the no-re-mint law is the door-side
// judge, the face simply does not offer it).
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ComfyManagerPanel, seatManageNamespace } from '../../src/client/assets-tab'
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from '@melite/estate-manage/types'
import { RemoteError, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

interface Canned {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
}

function asRow(canned: Canned): ManageEnvelopeRow {
  return {
    action: canned.action ?? '',
    ok: canned.ok ?? false,
    detail: canned.detail ?? '',
    ...(canned.data !== undefined ? { data: canned.data as ManageJsonValue } : {}),
  }
}

function asRefusal(canned: Canned): RemoteResult<ManageEnvelopeRow> {
  return {
    ok: false,
    error: new RemoteError('manage/refused', canned.detail ?? 'refused', {
      action: canned.action ?? '',
      status: 500,
      code: 'manage/refused',
    }),
  }
}

function stubManageSeat(routes: Record<string, Canned>): { calls: Array<Record<string, unknown>> } {
  const calls: Array<Record<string, unknown>> = []
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      calls.push({ ...doc })
      const canned = routes[doc.action]
      if (canned === undefined) return asRefusal({ action: doc.action, detail: 'unstubbed action ' + doc.action })
      return canned.ok === false ? asRefusal(canned) : { ok: true, value: asRow(canned) }
    },
  })
  return { calls }
}

const ABSENT_ROWS: Canned = {
  action: 'status',
  ok: true,
  detail: 'server up',
  data: {
    state: 'up',
    next_action: 'status',
    endpoint: { reachable: true, url: 'http://127.0.0.1:18466', comfyui_version: '0.42.0' },
    manager: { reachable: true, version: { version: '3.41' }, queue: { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 } },
    active_runs: [],
    resources: [
      {
        ref: { kind: 'model', owner: 'family', id: 'moss-image' },
        state: 'absent',
        items: [{ key: 'model:family:moss-image', state: 'absent' }],
      },
      {
        ref: { kind: 'extension', id: 'rgthree-comfy' },
        state: 'absent',
        items: [{ key: 'extension:rgthree-comfy', state: 'absent', detail: 'extension has no declared node types' }],
      },
      {
        ref: { kind: 'model', owner: 'family', id: 'flux-klein' },
        state: 'failed',
        operation_id: 'op-dead',
        items: [{ key: 'model:family:flux-klein', state: 'failed' }],
      },
      {
        ref: { kind: 'model', owner: 'family', id: 'anny' },
        state: 'active',
        items: [{ key: 'model:family:anny', state: 'active' }],
      },
      {
        // THE HAND-ONLY FAMILY (the weight-offer parity cure, operator
        // 2026-10-22): the census row carries fetchable:false — the
        // family's DECL declares no fetchable row at all (every tree
        // is an operator merge). The door MUST NOT offer Download: an
        // acquire here can only die on item-not-found.
        ref: { kind: 'model', owner: 'family', id: 'qwen3-tts-hand' },
        state: 'absent',
        fetchable: false,
        items: [{ key: 'model:family:qwen3-tts-hand', state: 'absent' }],
      },
    ],
  },
}

async function openRow(label: string): Promise<HTMLElement> {
  // the roster section fold is idempotent here: the story span rides
  // collapsedContent and unmounts once the section is open, so a
  // second row in the same test must not wait for it again.
  const user = userEvent.setup()
  if (screen.queryByTestId('resource-status') === null) {
    await user.click(await screen.findByTestId('resources-fold-story'))
  }
  const row = await within(await screen.findByTestId('resource-status')).findByText(label)
  await user.click(row)
  return row.closest('[data-testid="resource-fold"]') as HTMLElement
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  seatManageNamespace(undefined)
})

test('an absent model family row offers Download; the press fires acquire_weight with the family id only', async () => {
  const { calls } = stubManageSeat({ status: ABSENT_ROWS })
  render(<ComfyManagerPanel />)
  const row = await openRow('model family/moss-image')
  const door = within(row).getByTestId('resource-download')
  const user = userEvent.setup()
  await user.click(door)
  const fired = calls.find((call) => call.action === 'acquire_weight')
  expect(fired, 'the Download door fires the acquire_weight start arm').toBeTruthy()
  expect(fired?.['model']).toBe('moss-image')
  // THE NAMES-ONLY LAW: no url, no path, no filename — the DECL owns
  // the fetch source; the row passes the family id alone.
  expect(fired?.['url']).toBeUndefined()
  expect(fired?.['filename']).toBeUndefined()
})

test('an absent extension row offers Install; the press fires install_extension with the row pack id', async () => {
  const { calls } = stubManageSeat({ status: ABSENT_ROWS })
  render(<ComfyManagerPanel />)
  const row = await openRow('extension rgthree-comfy')
  const door = within(row).getByTestId('resource-install')
  const user = userEvent.setup()
  await user.click(door)
  const fired = calls.find((call) => call.action === 'install_extension')
  expect(fired, 'the Install door fires the declared install arm').toBeTruthy()
  expect(fired?.['nodes']).toEqual(['rgthree-comfy'])
})

test('a failed row with an operation row keeps Retry/Delete beside the state doors; an active row offers none', async () => {
  stubManageSeat({ status: ABSENT_ROWS })
  render(<ComfyManagerPanel />)
  const failedRow = await openRow('model family/flux-klein')
  expect(within(failedRow).getByTestId('resource-download')).toBeTruthy()
  expect(within(failedRow).getByText('Retry fetch')).toBeTruthy()
  // the active row: no door at all — landed bytes never re-fetch
  const activeRow = await openRow('model family/anny')
  expect(within(activeRow).queryByTestId('resource-download')).toBeNull()
  expect(within(activeRow).queryByTestId('resource-install')).toBeNull()
})

test('THE WEIGHT-OFFER PARITY (operator 2026-10-22): a hand-only family row offers NO Download and names the placement', async () => {
  stubManageSeat({ status: ABSENT_ROWS })
  render(<ComfyManagerPanel />)
  const row = await openRow('model family/qwen3-tts-hand')
  // the press must not exist: the family's DECL declares no fetchable
  // row — an acquire_weight here can only die on item-not-found (the
  // burn: the operator was offered a fetch no repo serves).
  expect(within(row).queryByTestId('resource-download')).toBeNull()
  // the placement truth renders in the row's own words.
  expect(within(row).getByText(/hand-placed|place the file/i)).toBeTruthy()
})
