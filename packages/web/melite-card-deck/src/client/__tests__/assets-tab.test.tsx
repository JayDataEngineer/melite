/**
 * ComfyManagerPanel component tests (jsdom) — the stroke-2 behavior
 * the parity wall cannot see (it scans vocabulary, not rendering):
 *
 *   chip        — the active-runs chip names runs (the double-count
 *                 bug stays dead)
 *   silent      — status refresh never lands in the result pane
 *   browse      — installed packs render as rows + filter client-side
 *                 (the rail's REAL shape: {name, version: commit-sha}
 *                 objects — the [object Object] regression stays dead)
 *   endpoint    — the server-url field seeds from status and Set
 *                 dispatches endpoint_set with the url
 *   snapshots   — list/save/restore dispatch with the right bodies
 *   ownership   — an explicit dispatch DOES land in the result pane
 *
 * fetch is stubbed per action — the stub answers the CLIENT-REQUEST
 * wire frame (the manage remote's door, /api/manage/act) with the
 * canned server-response envelope. The server half is pinned by the
 * manage-remote wall; the real tab in the real shell by
 * e2e/comfy-manager.spec.ts.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ComfyManagerPanel } from '../assets-tab'

interface Canned {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
}

const STATUS: Canned = {
  action: 'status',
  ok: true,
  detail: 'server up',
  data: {
    endpoint: {
      reachable: true,
      url: 'http://127.0.0.1:18466',
      comfyui_version: '0.34.0',
      devices: [
        { name: 'RTX 4090', vram_total: 25367674880, vram_free: 5473726464 },
      ],
    },
    server_info: { running: true },
    manager_security: 'medium',
    active_runs: ['run-a', 'run-b'],
    routing: { mode: 'managed' },
  },
}

/** The rail's REAL list_extensions shape (live-probed 2026-09-11:
 *  {name, version: 40-hex commit sha} — objects, never the dead
 *  cm_cli-era "name@version" strings). */
const PACKS = [
  { name: 'comfyui-kjnodes', version: 'e8e88f7c88e3f6205b122f5de87e69a09fbce5ac' },
  { name: 'comfyui-moge', version: '8276bab55f293a5bf000fef6a0dbedd3110efb29' },
  { name: 'comfyui-h3-motion-context', version: '429e952ae5c09b54f44cb6e3bef7331d998f0656' },
]

const SNAPS = ['2026-09-06_10-17-22_snapshot.json']

/** action → canned envelope; records every dispatched doc. The stub
 *  IS the wire: fetch is replaced whole, the client-request frame is
 *  parsed, args.doc rides out to `calls`, and the canned envelope
 *  answers inside the server-response frame postManage expects. */
function stubManageWire(routes: Record<string, Canned>): {
  calls: Array<Record<string, unknown>>
} {
  const calls: Array<Record<string, unknown>> = []
  const fetchImpl = async (_input: unknown, init?: RequestInit): Promise<Response> => {
    const frame = JSON.parse(String(init?.body)) as {
      type?: string
      rpcId?: string
      method?: string
      payload?: { args?: { doc?: Record<string, unknown> } }
    }
    if (frame.type !== 'client-request' || frame.method !== 'manage/act') {
      throw new Error('stub: not a manage wire frame')
    }
    const doc = frame.payload?.args?.doc ?? {}
    calls.push(doc)
    const envelope = routes[doc.action as string] ?? {
      action: doc.action,
      ok: false,
      detail: 'unstubbed action ' + String(doc.action),
    }
    const body = JSON.stringify({
      type: 'server-response',
      rpcId: frame.rpcId,
      result: { ok: true, value: envelope },
    })
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
  }
  vi.stubGlobal('fetch', vi.fn(fetchImpl))
  return { calls }
}

function actionsOf(calls: Array<Record<string, unknown>>): string[] {
  return calls.map((c) => String(c.action))
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

// RTL's auto-cleanup keys off framework globals vitest does not
// provide — unmount explicitly so one test's tree never leaks into
// the next test's queries.
afterEach(() => {
  cleanup()
})

test('mount shows the status section with the run-name chip', async () => {
  const { calls } = stubManageWire({ status: STATUS })
  render(<ComfyManagerPanel />)

  // the endpoint line proves the status reply rendered…
  await screen.findByText('http://127.0.0.1:18466')
  await screen.findByText('0.34.0')
  // …and the chip names runs (the double-count bug: length twice).
  const chip = screen.getByText('active runs: 2 (run-a, run-b)', {
    selector: 'span',
  })
  expect(chip.textContent).toBe('active runs: 2 (run-a, run-b)')
  expect(calls.length).toBeGreaterThan(0)
})

test('status refresh never lands in the result pane', async () => {
  const { calls } = stubManageWire({ status: STATUS })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  // one silent status on mount, no result pane anywhere.
  expect(actionsOf(calls)).toEqual(['status'])
  expect(screen.queryByText('REFUSED')).toBeNull()
  expect(screen.queryByText('OK')).toBeNull()

  // Refresh dispatches status again — the pane stays absent.
  await user.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(['status', 'status'])
  })
  expect(screen.queryByText('REFUSED')).toBeNull()
  expect(screen.queryByText('OK')).toBeNull()
})

test('installed packs render as rows and filter client-side', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    list_extensions: {
      action: 'list_extensions',
      ok: true,
      detail: '3 installed pack(s)',
      data: PACKS,
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  const list = await screen.findByTestId('ext-list')
  // "name — version", never [object Object].
  expect(within(list).getByText(/comfyui-kjnodes — e8e88f7/)).toBeTruthy()
  expect(within(list).getByText(/comfyui-h3-motion-context — 429e952/)).toBeTruthy()
  expect(within(list).queryByText(/\[object Object\]/)).toBeNull()

  // the explicit dispatch owns the result pane…
  expect(screen.getByText('list_extensions')).toBeTruthy()
  expect(screen.getByText('3 installed pack(s)')).toBeTruthy()

  // …and the filter narrows rows without a round-trip.
  await user.type(
    screen.getByPlaceholderText('kj, moge…'),
    'moge',
  )
  expect(
    within(list).queryByText(/comfyui-kjnodes/),
  ).toBeNull()
  expect(
    within(list).getByText(/comfyui-moge — 8276bab/),
  ).toBeTruthy()
})

test('snapshot list/save/restore dispatch with the right bodies', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    snapshot_list: {
      action: 'snapshot_list',
      ok: true,
      detail: '1 snapshot(s)',
      data: SNAPS,
    },
    snapshot_save: {
      action: 'snapshot_save',
      ok: true,
      detail: 'snapshot saved: s.json',
      data: { snapshot: 's.json' },
    },
    snapshot_restore: {
      action: 'snapshot_restore',
      ok: true,
      detail: 'restore issued',
      data: { restart_required: true },
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  // list → rows with a per-row Restore.
  await user.click(screen.getByRole('button', { name: 'List snapshots' }))
  const list = await screen.findByTestId('snap-list')
  expect(
    within(list).getByText('2026-09-06_10-17-22_snapshot.json'),
  ).toBeTruthy()

  // save → dispatches, then reloads the list.
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('snapshot_save')
  })
  await waitFor(() => {
    expect(
      actionsOf(calls).filter((a) => a === 'snapshot_list').length,
    ).toBeGreaterThanOrEqual(2)
  })

  // restore → the row's snapshot name rides the body (confirm is stubbed).
  await user.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('snapshot_restore')
  })
  const restore = calls.find((c) => c.action === 'snapshot_restore')
  expect(restore?.snapshot).toBe('2026-09-06_10-17-22_snapshot.json')
})

test('the server-url field seeds from status and Set dispatches endpoint_set', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    endpoint_set: {
      action: 'endpoint_set',
      ok: true,
      detail: 'endpoint set to http://127.0.0.1:18466 (ComfyUI 0.34.0 answered)',
      data: { url: 'http://127.0.0.1:18466', comfyui_version: '0.34.0' },
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  // the field seeds from the live status url…
  const field = screen.getByPlaceholderText('http://127.0.0.1:8188') as HTMLInputElement
  expect(field.value).toBe('http://127.0.0.1:18466')

  // …an edit + Set dispatches endpoint_set with the url (the field
  // keeps the operator's edit — status refreshes never clobber it).
  await user.clear(field)
  await user.type(field, 'http://127.0.0.1:8188')
  await user.click(screen.getByRole('button', { name: 'Set' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('endpoint_set')
  })
  const set = calls.find((c) => c.action === 'endpoint_set')
  expect(set?.url).toBe('http://127.0.0.1:8188')
  expect(field.value).toBe('http://127.0.0.1:8188')
})

/** The rail's REAL search_models shape (live-probed 2026-09-11:
 *  model objects {name, type, base, filename, …} — the operator saw
 *  "[object Object]" rows; DataBody's String(line) cast is dead). */
const MODEL_HITS = [
  { name: 'TAEF1 Decoder', type: 'TAESD', base: 'FLUX.1', filename: 'taef1_decoder.pth', installed: 'False' },
  { name: 'WanVideo VACE LoRA', type: 'lora', base: 'WanVideo', filename: 'wanvace_lora.safetensors', installed: 'True' },
]

test('search_models hits render as readable rows, never [object Object]', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    search_models: {
      action: 'search_models',
      ok: true,
      detail: '2 hit(s) for \'wan\'',
      data: MODEL_HITS,
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  // type the query, dispatch — the explicit action lands in the pane.
  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('search_models')
  })
  const pane = await screen.findByTestId('manage-result')
  expect(within(pane).getByText(/TAEF1 Decoder \(TAESD, FLUX\.1\) — taef1_decoder\.pth/)).toBeTruthy()
  expect(within(pane).getByText(/WanVideo VACE LoRA \(lora, WanVideo\) — wanvace_lora\.safetensors/)).toBeTruthy()
  // the regression stays dead — the pane never shows a bare cast.
  expect(within(pane).queryByText(/\[object Object\]/)).toBeNull()
})
