import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ComfyManagerPanel, seatManageNamespace } from '../../src/client/assets-tab'
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from '@melite/estate-manage/types'
// The manage seat's refusal code (the envelope rides the details —
// same declaration as the wire spec; type-only so this spec builds
// without the seat's graph).
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'manage/refused': {
      readonly action?: string
      readonly status?: number
      readonly code?: string
      readonly state?: string
      readonly next_action?: string
      readonly operation_id?: string
      readonly partial?: boolean
      readonly restart_required?: boolean
      readonly data?: unknown
    }
  }
}
import { RemoteError, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

interface Canned {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
  code?: string
  status?: number
  state?: string
  next_action?: string
  operation_id?: string
  partial?: boolean
  restart_required?: boolean
}

const UP: Canned = {
  action: 'status',
  ok: true,
  detail: 'server up',
  data: {
    state: 'up',
    next_action: 'status',
    endpoint: { reachable: true, url: 'http://engine:8188', comfyui_version: '9.9', devices: [] },
    manager: {
      reachable: true,
      version: { version: '3.0' },
      queue: { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 },
      security: 'security_level=normal-',
      unit: 'melite-comfyui.service',
       operations: [],
     },
     active_runs: [],
     routing: { mode: 'managed' },
     resources: [],
     model_options: [{
       id: 'z-image',
       label: 'Z-Image',
       genre: 'image',
       variants: [
         { id: 'full', label: 'Full', quants: [{ id: 'fp8', label: 'FP8' }, { id: 'q4', label: 'Q4' }] },
         { id: 'preview', label: 'Preview', quants: [{ id: 'fp16', label: 'FP16' }] },
       ],
     }],
     comfyui_versions: [{ id: 'v0.9', label: 'v0.9 — stable', version: 'v0.9', tag: 'stable' }],
   },
 }

const MANAGER_DOWN: Canned = {
  action: 'status',
  ok: true,
  detail: 'server up',
  data: {
    state: 'up',
    next_action: 'status',
    endpoint: { reachable: true, url: 'http://engine:8188', comfyui_version: '9.9' },
    manager: { reachable: false, reason: 'manager version returned 500', security: 'normal-', unit: 'melite-comfyui.service' },
    active_runs: [],
    routing: { mode: 'managed' },
    resources: [],
  },
}

const ENGINE_DOWN: Canned = {
  action: 'status',
  ok: true,
  detail: 'server not reachable',
  data: {
    state: 'down',
    next_action: 'launch',
    endpoint: { reachable: false, url: 'http://engine:8188', reason: 'connection refused' },
    manager: { reachable: false, reason: 'endpoint not reachable', security: 'unpinned', unit: 'melite-comfyui.service' },
    active_runs: [],
    routing: { mode: 'managed' },
    resources: [],
  },
}

/** Fold a canned fixture into the seat's wire row. */
function asRow(canned: Canned): ManageEnvelopeRow {
  return {
    action: canned.action ?? '',
    ok: canned.ok ?? false,
    detail: canned.detail ?? '',
    ...(canned.data !== undefined ? { data: canned.data as ManageJsonValue } : {}),
    ...(canned.status !== undefined ? { status: canned.status } : {}),
    ...(canned.code !== undefined ? { code: canned.code } : {}),
    ...(canned.state !== undefined ? { state: canned.state } : {}),
    ...(canned.next_action !== undefined ? { next_action: canned.next_action } : {}),
    ...(canned.operation_id !== undefined ? { operation_id: canned.operation_id } : {}),
    ...(canned.partial !== undefined ? { partial: canned.partial } : {}),
    ...(canned.restart_required !== undefined ? { restart_required: canned.restart_required } : {}),
  }
}

/** Fold a canned refusal into the protocol's ONE failure face: the
 *  thrown RemoteError carrying the envelope in details (the seat
 *  contract — a refusal never rides an ok:false value). */
function asRefusal(canned: Canned): RemoteResult<ManageEnvelopeRow> {
  return {
    ok: false,
    error: new RemoteError('manage/refused', canned.detail ?? 'refused', {
      action: canned.action ?? '',
      status: canned.status ?? 500,
      code: canned.code ?? 'manage/refused',
      ...(canned.state !== undefined ? { state: canned.state } : {}),
      ...(canned.next_action !== undefined ? { next_action: canned.next_action } : {}),
      ...(canned.operation_id !== undefined ? { operation_id: canned.operation_id } : {}),
      ...(canned.partial !== undefined ? { partial: canned.partial } : {}),
      ...(canned.restart_required !== undefined ? { restart_required: canned.restart_required } : {}),
      ...(canned.data !== undefined ? { data: canned.data } : {}),
    }),
  }
}

/** Seat ONE fake manage lane routing canned fixtures by action (the
 *  apply seam — the deck's real apply seats ctx.remote.manage the
 *  same way; the transport is never under test here). */
function stubManageSeat(routes: Record<string, Canned>): { calls: Array<Record<string, unknown>> } {
  const calls: Array<Record<string, unknown>> = []
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      calls.push({ ...doc })
      const canned = routes[doc.action]
      if (canned === undefined) {
        return asRefusal({ action: doc.action, detail: `unstubbed action ${doc.action}` })
      }
      return canned.ok === false ? asRefusal(canned) : { ok: true, value: asRow(canned) }
    },
  })
  return { calls }
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolvePromise: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => { resolvePromise = resolve })
  return { promise, resolve: (value) => { resolvePromise?.(value) } }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  seatManageNamespace(undefined)
})

test('loading is distinct and exposes aria-busy until status resolves', async () => {
  const pending = deferred<RemoteResult<ManageEnvelopeRow>>()
  seatManageNamespace({ act: () => pending.promise })
  render(<ComfyManagerPanel />)

  expect(screen.getByTestId('health-state').textContent).toBe('Loading status')
  expect(screen.getByText('Checking engine and manager…')).toBeTruthy()
  expect(document.querySelector('[data-comfy-manager]')?.getAttribute('aria-busy')).toBe('true')

  await act(async () => { pending.resolve({ ok: true, value: asRow(UP) }) })
  expect((await screen.findByTestId('health-state')).textContent).toBe('Engine + manager reachable')
})

test('manager failure and engine failure remain distinct', async () => {
  stubManageSeat({ status: MANAGER_DOWN })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  expect((await screen.findByTestId('health-state')).textContent).toBe('Manager failure')
  expect(screen.getByText(/manager version returned 500/)).toBeTruthy()
  expect(screen.getByText(/Next: Refresh status/)).toBeTruthy()
  cleanup()

  stubManageSeat({ status: ENGINE_DOWN })
  render(<ComfyManagerPanel />)
  expect((await screen.findByTestId('health-state')).textContent).toBe('Engine failure')
  expect(screen.getByText(/connection refused/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Launch' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Restart' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Launch' }))
})

test('byo status suppresses estate lifecycle controls', async () => {
  stubManageSeat({ status: { ...UP, data: { ...(UP.data as Record<string, unknown>), routing: { mode: 'byo' } } } })
  render(<ComfyManagerPanel />)
  expect((await screen.findByTestId('health-state')).textContent).toBe('Engine + manager reachable')
  expect(screen.getByText(/BYO endpoint selected/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Restart' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Launch' })).toBeNull()
})

test('a failed refresh keeps the last status and marks it stale', async () => {
  let statusCalls = 0
  seatManageNamespace({ act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
    if (doc.action !== 'status') return asRefusal({ action: doc.action, detail: 'unexpected' })
    statusCalls++
    if (statusCalls === 1) return { ok: true, value: asRow(UP) }
    throw new Error('status socket reset')
  } })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  expect(screen.getByTestId('health-state').textContent).toBe('Engine + manager reachable')

  await user.click(screen.getByRole('button', { name: 'Refresh' }))
  expect((await screen.findByTestId('health-state')).textContent).toBe('Stale status')
  expect(screen.getByText(/Refresh failed: status socket reset/)).toBeTruthy()
  expect(screen.getByText(/showing the last confirmed status/)).toBeTruthy()
  expect(screen.getByText('http://engine:8188')).toBeTruthy()
})

test('healthy status ages from fresh to stale without a refresh error', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  stubManageSeat({ status: UP })
  render(<ComfyManagerPanel />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(screen.getByTestId('health-state').textContent).toBe('Engine + manager reachable')
  expect(screen.getByText(/· fresh$/)).toBeTruthy()

  await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
  expect(screen.getByTestId('health-state').textContent).toBe('Engine + manager reachable')
  expect(screen.getByText(/· 5s old$/)).toBeTruthy()

  await act(async () => { await vi.advanceTimersByTimeAsync(25_000) })
  expect(screen.getByTestId('health-state').textContent).toBe('Stale status')
  expect(screen.getByText(/· stale$/)).toBeTruthy()
})

test('a stale status response cannot overwrite a newer refresh or its mutation result', async () => {
  const stale = deferred<RemoteResult<ManageEnvelopeRow>>()
  let statusCalls = 0
  const calls: Array<Record<string, unknown>> = []
  seatManageNamespace({ act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
    calls.push({ ...doc })
    if (doc.action === 'status') {
      statusCalls++
      if (statusCalls === 1) return { ok: true, value: asRow(UP) }
      if (statusCalls === 2) return stale.promise
      return { ok: true, value: asRow({
        action: 'status',
        ok: true,
        data: {
          ...(UP.data as Record<string, unknown>),
          endpoint: { reachable: true, url: 'http://new-engine:8188', comfyui_version: '10.0' },
        },
      }) }
    }
    if (doc.action === 'snapshot_save') return { ok: true, value: asRow({ action: 'snapshot_save', ok: true, detail: 'saved', data: { state: 'saved' } }) }
    if (doc.action === 'snapshot_list') return { ok: true, value: asRow({ action: 'snapshot_list', ok: true, data: [] }) }
    return asRefusal({ action: doc.action, detail: 'unexpected' })
  } })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')

  await user.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() => { expect(statusCalls).toBe(2) })
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }))
  expect(await screen.findByText('http://new-engine:8188')).toBeTruthy()
  expect(within(screen.getByTestId('mutation-result')).getByText('snapshot_save')).toBeTruthy()

  await act(async () => { stale.resolve({ ok: true, value: asRow(UP) }) })
  expect(screen.queryByText('http://engine:8188')).toBeNull()
  expect(screen.getByText('http://new-engine:8188')).toBeTruthy()
  expect(within(screen.getByTestId('mutation-result')).getByText('snapshot_save')).toBeTruthy()
  expect(calls.filter((call) => call.action === 'status').length).toBe(3)
})

test('explicit actions serialize and conflicting controls disable', async () => {
  const pending = deferred<RemoteResult<ManageEnvelopeRow>>()
  const calls: Array<Record<string, unknown>> = []
  let listCalls = 0
  seatManageNamespace({ act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
    calls.push({ ...doc })
    if (doc.action === 'status') return { ok: true, value: asRow(UP) }
    listCalls++
    return pending.promise
  } })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  await waitFor(() => { expect(listCalls).toBe(1) })

  await user.type(screen.getByPlaceholderText('ComfyUI-KJNodes, ComfyUI-VideoHelperSuite'), 'pack')
  const install = screen.getByRole('button', { name: 'Install' })
  expect((install as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(install)
  expect(calls.filter((call) => call.action === 'install_extension')).toHaveLength(0)

  await act(async () => {
    pending.resolve({ ok: true, value: asRow({ action: 'list_extensions', ok: true, detail: 'done', data: [] }) })
  })
  await screen.findByTestId('ext-list')
  expect(listCalls).toBe(1)
})

test('read output formats every row arm and object bodies without a disclosure', async () => {
  stubManageSeat({
    status: UP,
    search_models: {
      action: 'search_models',
      ok: true,
      detail: '7 rows',
      data: ['a log line', { name: 'p', version: '1' }, { name: 'm', type: 'lora', base: 'wan', filename: 'm.safetensors' }, { name: 'bare' }, { version: 'orphan' }, 42, null],
    },
    logs: { action: 'logs', ok: true, detail: '2 lines', data: { lines: ['a', 'b'] } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  let result = await screen.findByTestId('read-result')
  let pre = result.querySelector('pre') as HTMLPreElement
  expect(pre.hidden).toBe(false)
  expect(pre.textContent).toContain('a log line')
  expect(pre.textContent).toContain('p — 1')
  expect(pre.textContent).toContain('m (lora, wan) — m.safetensors')
  expect(pre.textContent).toContain('bare')
  expect(pre.textContent).toContain('{"version":"orphan"}')
  expect(pre.textContent).toContain('42')
  expect(pre.textContent).toContain('null')
  expect(pre.textContent).not.toContain('[object Object]')
  expect(result.querySelector('details')).toBeNull()

  await user.click(screen.getByRole('button', { name: 'View logs' }))
  result = await screen.findByTestId('read-result')
  pre = result.querySelector('pre') as HTMLPreElement
  expect(pre.hidden).toBe(false)
  expect(pre.textContent).toContain('"lines"')
})

test('a refused read shows its code and detail in the result dock', async () => {
  stubManageSeat({
    status: UP,
    search_models: { action: 'search_models', ok: false, code: 'manage/refused', status: 409, detail: 'manager index is busy' },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  const result = await screen.findByTestId('read-result')
  expect(within(result).getByText('REFUSED')).toBeTruthy()
  expect(within(result).getByText(/manage\/refused · HTTP 409/)).toBeTruthy()
  expect(within(result).getByText(/manager index is busy/)).toBeTruthy()
  expect(result.querySelector('details')).toBeNull()
})

test('declared and operator-only URL install rails send exact bodies and preserve mutation ownership', async () => {
  const { calls } = stubManageSeat({
    status: UP,
    list_extensions: { action: 'list_extensions', ok: true, detail: '1', data: [{ name: 'x', version: '1' }] },
    install_extension: { action: 'install_extension', ok: true, detail: 'installed', data: { state: 'active', operation_id: 'op-a', items: [] } },
    install_extension_url: { action: 'install_extension_url', ok: true, detail: 'installed', data: { state: 'active', operation_id: 'op-b', items: [] } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  expect(screen.getAllByText('Operator only · raw URL')).toHaveLength(2)

  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  await screen.findByTestId('ext-list')
  const listsBefore = calls.filter((call) => call.action === 'list_extensions').length
  await user.type(screen.getByPlaceholderText('ComfyUI-KJNodes, ComfyUI-VideoHelperSuite'), 'a, b')
  await user.click(screen.getByRole('button', { name: 'Install' }))
  await waitFor(() => { expect(calls.filter((call) => call.action === 'list_extensions').length).toBeGreaterThan(listsBefore) })
  expect(calls.find((call) => call.action === 'install_extension')?.nodes).toEqual(['a', 'b'])
  expect(within(screen.getByTestId('mutation-result')).getByText('install_extension')).toBeTruthy()
  expect(screen.queryByTestId('read-result')).toBeNull()

  await user.click(screen.getByText(/Install extension from URL/))
  await user.type(screen.getByPlaceholderText('https://github.com/…'), 'https://example.com/pack.zip')
  await user.click(screen.getByRole('button', { name: 'Install from URL' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'install_extension_url')).toBe(true) })
  expect(calls.find((call) => call.action === 'install_extension_url')?.url).toBe('https://example.com/pack.zip')
  expect(within(screen.getByTestId('mutation-result')).getByText('install_extension_url')).toBeTruthy()
})

test('model provisioning and raw download send minimal and full bodies', async () => {
  const { calls } = stubManageSeat({
    status: UP,
    download_model: { action: 'download_model', ok: true, detail: 'queued', data: { state: 'active', operation_id: 'op-d', items: [] } },
    provision_model: { action: 'provision_model', ok: true, detail: 'provisioned', data: { state: 'active', operation_id: 'op-p', items: [] } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')

  await user.click(screen.getByText(/Download a model from URL/))
  const download = screen.getByRole('button', { name: 'Download' })
  expect((download as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByPlaceholderText('https://…/model.safetensors'), 'https://example.com/only.safetensors')
  await user.click(download)
  await waitFor(() => { expect(calls.some((call) => call.action === 'download_model')).toBe(true) })
  // the browser confirm rides the wire as the flag the door gates on
  expect(calls.find((call) => call.action === 'download_model')).toEqual({
    action: 'download_model',
    url: 'https://example.com/only.safetensors',
    operator_confirmed: true,
  })

   await user.click(screen.getByText('Provision a declared model'))
   const provision = screen.getByRole('button', { name: 'Provision' })
   await user.type(screen.getByPlaceholderText('Search declared models…'), 'z-image')
   await waitFor(() => { expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('full') })
   expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('fp8')
   await user.click(provision)
   await waitFor(() => { expect(calls.some((call) => call.action === 'provision_model')).toBe(true) })
   expect(calls.find((call) => call.action === 'provision_model')).toEqual({ action: 'provision_model', model: 'z-image', variant: 'full', quant: 'fp8' })

   await user.selectOptions(screen.getByLabelText('variant'), 'preview')
   expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('fp16')
   await user.click(provision)
   await waitFor(() => { expect(calls.filter((call) => call.action === 'provision_model')).toHaveLength(2) })
   expect(calls.filter((call) => call.action === 'provision_model')[1]).toEqual({
     action: 'provision_model',
     model: 'z-image',
     variant: 'preview',
     quant: 'fp16',
   })
})

test('model changes replace dependent coordinates and unknown ids cannot dispatch', async () => {
  const status: Canned = {
    ...UP,
    data: {
      ...(UP.data as Record<string, unknown>),
      model_options: [
        ...((UP.data as { model_options: unknown[] }).model_options),
        { id: 'wan', label: 'Wan', genre: 'video', variants: [{ id: 'turbo', label: 'Turbo', quants: [{ id: 'q4', label: 'Q4' }] }] },
      ],
    },
  }
  const { calls } = stubManageSeat({
    status,
    provision_model: { action: 'provision_model', ok: true, detail: 'provisioned', data: { state: 'active', items: [] } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.click(screen.getByText('Provision a declared model'))

  const model = screen.getByPlaceholderText('Search declared models…')
  const provision = screen.getByRole('button', { name: 'Provision' })
  await user.type(model, 'z-image')
  await waitFor(() => { expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('full') })
  await user.selectOptions(screen.getByLabelText('variant'), 'preview')
  expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('fp16')

  await user.clear(model)
  await user.type(model, 'wan')
  await waitFor(() => {
    expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('turbo')
    expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('q4')
  })
  await user.click(provision)
  await waitFor(() => { expect(calls.filter((call) => call.action === 'provision_model')).toHaveLength(1) })
  expect(calls.find((call) => call.action === 'provision_model')).toEqual({ action: 'provision_model', model: 'wan', variant: 'turbo', quant: 'q4' })

  await user.clear(model)
  await user.type(model, 'missing')
  expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('')
  expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('')
  expect((provision as HTMLButtonElement).disabled).toBe(true)
  expect(calls.filter((call) => call.action === 'provision_model')).toHaveLength(1)
})

test('catalog withdrawal clears stale coordinates and keeps manual fallback editable', async () => {
  const calls: Array<Record<string, unknown>> = []
  let statusCalls = 0
  const fallbackStatus: Canned = {
    ...UP,
    data: {
      ...(UP.data as Record<string, unknown>),
      model_options: [],
      model_options_detail: 'model catalog unavailable',
      comfyui_versions: [],
      comfyui_versions_detail: 'version catalog unavailable',
    },
  }
  seatManageNamespace({ act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
    calls.push({ ...doc })
    if (doc.action === 'status') {
      statusCalls++
      return { ok: true, value: asRow(statusCalls === 1 ? UP : fallbackStatus) }
    }
    return { ok: true, value: asRow({ action: doc.action, ok: true, detail: 'done', data: { state: 'active', items: [] } }) }
  } })

  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.click(screen.getByText('Provision a declared model'))
  await user.type(screen.getByPlaceholderText('Search declared models…'), 'z-image')
  await waitFor(() => { expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('full') })
  expect((screen.getByLabelText('quant') as HTMLSelectElement).value).toBe('fp8')

  await user.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(await screen.findByText('Model catalog: model catalog unavailable')).toBeTruthy()
  expect(screen.getByText('Version catalog: version catalog unavailable')).toBeTruthy()
  expect((screen.getByLabelText('variant') as HTMLInputElement).tagName).toBe('INPUT')
  expect((screen.getByLabelText('variant') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('quant') as HTMLInputElement).value).toBe('')

  await user.type(screen.getByLabelText('variant'), 'manual-variant')
  await user.type(screen.getByLabelText('quant'), 'manual-quant')
  await user.click(screen.getByRole('button', { name: 'Provision' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'provision_model')).toBe(true) })
  expect(calls.find((call) => call.action === 'provision_model')).toEqual({
    action: 'provision_model',
    model: 'z-image',
    variant: 'manual-variant',
    quant: 'manual-quant',
  })
})

test('malformed catalog rows normalize into safe controls', async () => {
  stubManageSeat({
    status: {
      ...UP,
      data: {
        ...(UP.data as Record<string, unknown>),
        model_options: [{ id: 'broken', label: 'Broken', variants: [{ id: 'variant', quants: null }] }, null],
        comfyui_versions: [null, { version: 'v1' }],
      },
    },
    provision_model: { action: 'provision_model', ok: true, detail: 'provisioned', data: { state: 'active', items: [] } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.click(screen.getByText('Provision a declared model'))
  await user.type(screen.getByPlaceholderText('Search declared models…'), 'broken')
  expect((screen.getByLabelText('variant') as HTMLSelectElement).value).toBe('variant')
  expect((screen.getByLabelText('quant') as HTMLSelectElement).disabled).toBe(true)

  await user.click(screen.getByText('Switch ComfyUI version'))
  await user.selectOptions(screen.getByLabelText('switch to version'), 'v1')
  expect((screen.getByLabelText('switch to version') as HTMLSelectElement).value).toBe('v1')
})

test('initial status refusals and malformed success remain unavailable', async () => {
  stubManageSeat({ status: { action: 'status', ok: false, detail: 'initial unavailable' } })
  render(<ComfyManagerPanel />)
  expect((await screen.findByTestId('health-state')).textContent).toBe('Status unavailable')
  expect(screen.getByText('Refresh failed: initial unavailable')).toBeTruthy()
  expect(screen.queryByText(/showing the last confirmed status/)).toBeNull()
  expect(screen.getByText('Lifecycle controls unlock after status loads.')).toBeTruthy()
  cleanup()

  stubManageSeat({ status: { action: 'status', ok: true, data: null } })
  render(<ComfyManagerPanel />)
  expect((await screen.findByTestId('health-state')).textContent).toBe('Status unavailable')
  expect(screen.getByText('Refresh failed: status reply carried no status data')).toBeTruthy()
  expect(screen.queryByText(/showing the last confirmed status/)).toBeNull()
})

test('logs clamp garbage and oversized tails', async () => {
  const { calls } = stubManageSeat({ status: UP, logs: { action: 'logs', ok: true, detail: 'lines', data: ['a'] } })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  const tail = screen.getByDisplayValue('200')
  await user.clear(tail)
  await user.type(tail, 'abc')
  await user.click(screen.getByRole('button', { name: 'View logs' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'logs')).toBe(true) })
  expect(calls.find((call) => call.action === 'logs')?.tail).toBe(200)
  await user.clear(tail)
  await user.type(tail, '5000')
  await user.click(screen.getByRole('button', { name: 'View logs' }))
  await waitFor(() => { expect(calls.filter((call) => call.action === 'logs')).toHaveLength(2) })
  expect(calls.filter((call) => call.action === 'logs')[1]?.tail).toBe(2_000)
})

test('lifecycle controls are contextual, one-shot force is confirmed and reset, and update is ComfyUI-only', async () => {
  const status: Canned = {
    action: 'status',
    ok: true,
    data: {
      ...(UP.data as Record<string, unknown>),
      active_runs: ['run-a'],
    },
  }
  const { calls } = stubManageSeat({
    status,
    restart: { action: 'restart', ok: true, detail: 'restarted', data: { next_action: 'status' } },
    stop: { action: 'stop', ok: true, detail: 'stopped', data: { next_action: 'launch' } },
    free: { action: 'free', ok: true, detail: 'freed', data: { next_action: 'status' } },
    update: { action: 'update', ok: true, detail: 'updated', data: { state: 'completed' } },
    switch_version: { action: 'switch_version', ok: true, detail: 'switched', data: { state: 'restart_required', restart_required: true } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  expect(screen.getByText(/1 active run\(s\)/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Launch' })).toBeNull()

  const force = screen.getByRole('checkbox', { name: 'Force the next guarded lifecycle action' }) as HTMLInputElement
  await user.click(force)
  await user.click(screen.getByRole('button', { name: 'Restart' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'restart')).toBe(true) })
  expect(calls.find((call) => call.action === 'restart')).toMatchObject({ force: true })
  expect(force.checked).toBe(false)
  expect(vi.mocked(window.confirm).mock.calls[0]?.[0]).toContain('Force override: ON.')

  await user.click(screen.getByRole('button', { name: 'Restart' }))
  await waitFor(() => { expect(calls.filter((call) => call.action === 'restart')).toHaveLength(2) })
  expect(calls.filter((call) => call.action === 'restart')[1]).toMatchObject({ force: false })
  expect(vi.mocked(window.confirm).mock.calls[1]?.[0]).toContain('Force override: OFF.')

  await user.click(force)
  await user.click(screen.getByRole('button', { name: 'Free VRAM' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'free')).toBe(true) })
  expect(calls.find((call) => call.action === 'free')).toMatchObject({ force: true })
  expect(force.checked).toBe(false)

  await user.click(screen.getByText('Advanced update'))
  await user.click(screen.getByRole('button', { name: 'Update ComfyUI' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'update')).toBe(true) })
   expect(calls.find((call) => call.action === 'update')).toMatchObject({ target: 'comfy', force: false })
   expect(screen.queryByText('cli')).toBeNull()
  expect(screen.queryByText('all')).toBeNull()

   await user.click(screen.getByText('Switch ComfyUI version'))
   const switchButton = screen.getByRole('button', { name: 'Switch' })
   await user.selectOptions(screen.getByLabelText('switch to version'), 'v0.9')
   await user.click(switchButton)
   await waitFor(() => { expect(calls.some((call) => call.action === 'switch_version')).toBe(true) })
   expect(calls.find((call) => call.action === 'switch_version')).toMatchObject({ version: 'v0.9', force: false })
})

test('snapshot force is scoped to restore and resets after use', async () => {
  const { calls } = stubManageSeat({
    status: UP,
    snapshot_list: { action: 'snapshot_list', ok: true, detail: '1', data: ['s.json'] },
    snapshot_restore: { action: 'snapshot_restore', ok: true, detail: 'restored', data: { restart_required: true, next_action: 'restart' } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  await user.click(screen.getByRole('button', { name: 'List snapshots' }))
  await screen.findByTestId('snap-list')
  const force = screen.getByRole('checkbox', { name: 'Force the next snapshot restore' }) as HTMLInputElement
  await user.click(force)
  await user.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => { expect(calls.some((call) => call.action === 'snapshot_restore')).toBe(true) })
  expect(calls.find((call) => call.action === 'snapshot_restore')).toMatchObject({ snapshot: 's.json', force: true })
  expect(force.checked).toBe(false)
  expect(vi.mocked(window.confirm).mock.calls[0]?.[0]).toContain('Force override: ON.')
})

test('bare device rows retain the unknown VRAM face', async () => {
  stubManageSeat({
    status: {
      action: 'status',
      ok: true,
      data: {
        state: 'up',
        next_action: 'status',
        endpoint: { reachable: true, url: 'http://engine:8188', devices: [{}, { name: 'cpu' }] },
        manager: { reachable: true, version: { version: '3.0' }, queue: { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }, security: 'low', unit: 'unit' },
        active_runs: [],
        routing: { mode: 'direct' },
        resources: [],
      },
    },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('http://engine:8188')
  expect(screen.getByText('low')).toBeTruthy()
  expect(screen.getByText('{"mode":"direct"}')).toBeTruthy()
  expect(screen.getAllByText('? / ? GB free')).toHaveLength(2)
  expect(screen.getByText('gpu')).toBeTruthy()
})
