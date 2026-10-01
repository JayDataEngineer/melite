import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ComfyManagerPanel } from '../../src/client/assets-tab'

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

const STATUS: Canned = {
  action: 'status',
  ok: true,
  detail: 'server up',
  data: {
    state: 'up',
    next_action: 'status',
    endpoint: {
      reachable: true,
      url: 'http://127.0.0.1:18466',
      comfyui_version: '0.34.0',
      devices: [
        { name: 'RTX 4090', vram_total: 25367674880, vram_free: 5473726464 },
      ],
    },
    manager: {
      reachable: true,
      version: { version: '3.41.0' },
      queue: { is_processing: true, in_progress_count: 1, total_count: 3, done_count: 2 },
      security: 'security_level=normal- +git_url [user/__manager/config.ini]',
      unit: 'melite-comfyui.service',
      operations: [{ operation_id: 'op-status', state: 'restart_required' }],
    },
    active_runs: ['run-a', 'run-b'],
    routing: { mode: 'managed' },
    resources: [{
      ref: { kind: 'model', owner: 'family', id: 'wan', variant: 'preview', quant: 'fp8' },
      state: 'restart_required',
      operation_id: 'op-resource',
      items: [{
        key: 'model:family:wan:preview:fp8',
        state: 'restart_required',
        integrity: 'operator-unverified',
        path: 'models/wan/preview/fp8/model.safetensors',
        sha256: 'abcdef0123456789',
        detail: 'declared file landed',
      }],
    }],
  },
}

const PACKS = [
  { name: 'comfyui-kjnodes', version: 'e8e88f7c88e3f6205b122f5de87e69a09fbce5ac' },
  { name: 'comfyui-moge', version: '8276bab55f293a5bf000fef6a0dbedd3110efb29' },
  { name: 'comfyui-h3-motion-context', version: '429e952ae5c09b54f44cb6e3bef7331d998f0656' },
]

const MODEL_HITS = [
  { name: 'TAEF1 Decoder', type: 'TAESD', base: 'FLUX.1', filename: 'taef1_decoder.pth', installed: 'False' },
  { name: 'WanVideo VACE LoRA', type: 'lora', base: 'WanVideo', filename: 'wanvace_lora.safetensors', installed: 'True' },
]

function wireResponse(init: RequestInit | undefined, envelope: Canned): Response {
  const frame = JSON.parse(String(init?.body)) as { rpcId?: string }
  return new Response(JSON.stringify({
    type: 'server-response',
    rpcId: frame.rpcId,
    result: { ok: true, value: envelope },
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

function stubManageWire(routes: Record<string, Canned>): { calls: Array<Record<string, unknown>> } {
  const calls: Array<Record<string, unknown>> = []
  vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
    const frame = JSON.parse(String(init?.body)) as {
      type?: string
      rpcId?: string
      method?: string
      payload?: { args?: { doc?: Record<string, unknown> } }
    }
    if (frame.type !== 'client-request' || frame.method !== 'manage/act') throw new Error('stub: invalid manage frame')
    const doc = frame.payload?.args?.doc ?? {}
    calls.push(doc)
    return wireResponse(init, routes[String(doc.action)] ?? {
      action: String(doc.action),
      ok: false,
      code: 'manage/refused',
      status: 500,
      detail: 'unstubbed action ' + String(doc.action),
    })
  }))
  return { calls }
}

function actionsOf(calls: Array<Record<string, unknown>>): string[] {
  return calls.map((call) => String(call.action))
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('renders the real nested status payload and declared resource rows', async () => {
  stubManageWire({ status: STATUS })
  render(<ComfyManagerPanel />)

  expect((await screen.findByTestId('health-state')).textContent).toBe('Engine + manager reachable')
  expect(screen.getByText('http://127.0.0.1:18466')).toBeTruthy()
  expect(screen.getByText('0.34.0')).toBeTruthy()
  expect(screen.getByText('3.41.0')).toBeTruthy()
  expect(screen.getByText('working · 1 active · 2/3 complete')).toBeTruthy()
  expect(screen.getByText(/security_level=normal-/)).toBeTruthy()
  expect(screen.getByText('melite-comfyui.service')).toBeTruthy()
  expect(screen.getByText('2 active · run-a, run-b')).toBeTruthy()
  expect(screen.getByText('{"mode":"managed"}')).toBeTruthy()

  const resources = screen.getByTestId('resource-status')
  expect(within(resources).getByText('model family/wan:preview:fp8')).toBeTruthy()
  expect(within(resources).getByText('operation_id: op-resource')).toBeTruthy()
  expect(within(resources).getByText('operator-unverified')).toBeTruthy()
  expect(within(resources).getByText('abcdef0123456789')).toBeTruthy()
  expect(screen.getByText(/Updated .*fresh/)).toBeTruthy()
})

test('status refresh never creates or replaces a result', async () => {
  const { calls } = stubManageWire({ status: STATUS })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  expect(actionsOf(calls)).toEqual(['status'])
  expect(screen.queryByTestId('manage-result')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() => { expect(actionsOf(calls)).toEqual(['status', 'status']) })
  expect(screen.queryByTestId('manage-result')).toBeNull()
})

test('list output and later mutations have separate ownership', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    list_extensions: { action: 'list_extensions', ok: true, detail: '3 installed pack(s)', data: PACKS },
    snapshot_list: { action: 'snapshot_list', ok: true, detail: '1 snapshot(s)', data: ['snap.json'] },
    snapshot_save: { action: 'snapshot_save', ok: true, detail: 'snapshot saved', data: { state: 'saved' } },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  const list = await screen.findByTestId('ext-list')
  expect(within(list).getByText(/comfyui-kjnodes — e8e88f7/)).toBeTruthy()
  expect(within(list).getByText(/comfyui-h3-motion-context — 429e952/)).toBeTruthy()
  expect(within(list).queryByText(/\[object Object\]/)).toBeNull()
  expect(within(screen.getByTestId('read-result')).getByText('list_extensions')).toBeTruthy()

  await user.type(screen.getByPlaceholderText('kj, moge…'), 'moge')
  expect(within(list).queryByText(/comfyui-kjnodes/)).toBeNull()
  expect(within(list).getByText(/comfyui-moge — 8276bab/)).toBeTruthy()

  await user.click(screen.getByRole('button', { name: 'Save snapshot' }))
  const mutation = await screen.findByTestId('mutation-result')
  expect(within(mutation).getByText('snapshot_save')).toBeTruthy()
  expect(within(mutation).getByText('State:')).toBeTruthy()
  expect(screen.queryByTestId('read-result')).toBeNull()
  await waitFor(() => { expect(actionsOf(calls).filter((action) => action === 'snapshot_list').length).toBe(1) })
  expect(within(mutation).getByText('snapshot_save')).toBeTruthy()

  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  expect(within(await screen.findByTestId('read-result')).getByText('list_extensions')).toBeTruthy()
  expect(within(screen.getByTestId('mutation-result')).getByText('snapshot_save')).toBeTruthy()
})

test('search and log output is immediately visible and clearable', async () => {
  stubManageWire({
    status: STATUS,
    search_models: { action: 'search_models', ok: true, detail: '2 hit(s)', data: MODEL_HITS },
    logs: { action: 'logs', ok: true, detail: '2 log line(s)', data: ['engine boot complete', 'queue idle'] },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  let result = await screen.findByTestId('manage-result')
  let output = within(result).getByTestId('result-data')
  let pre = output.querySelector('pre') as HTMLPreElement
  expect(pre.hidden).toBe(false)
  expect(pre.textContent).toContain('TAEF1 Decoder (TAESD, FLUX.1) — taef1_decoder.pth')
  expect(pre.textContent).toContain('WanVideo VACE LoRA (lora, WanVideo) — wanvace_lora.safetensors')
  expect(pre.textContent).not.toContain('[object Object]')
  expect(result.querySelector('details')).toBeNull()
  const received = within(result).getByText('Received:').parentElement as HTMLElement
  expect(received.textContent).toMatch(/Received:.*fresh/)

  await user.click(screen.getByRole('button', { name: 'View logs' }))
  result = await screen.findByTestId('manage-result')
  output = within(result).getByTestId('result-data')
  pre = output.querySelector('pre') as HTMLPreElement
  expect(pre.hidden).toBe(false)
  expect(pre.textContent).toContain('engine boot complete\nqueue idle')
  expect(result.querySelector('details')).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Clear result' }))
  expect(screen.queryByTestId('manage-result')).toBeNull()
})

test('endpoint_set owns its result and refreshes status afterward', async () => {
  const { calls } = stubManageWire({
    status: STATUS,
    endpoint_set: {
      action: 'endpoint_set',
      ok: true,
      detail: 'endpoint set',
      state: 'completed',
      next_action: 'status',
      data: { url: 'http://127.0.0.1:8188', comfyui_version: '0.35.0' },
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')
  await user.click(screen.getByText('Endpoint settings'))

  const field = screen.getByPlaceholderText('http://127.0.0.1:8188') as HTMLInputElement
  expect(field.value).toBe('http://127.0.0.1:18466')
  await user.clear(field)
  await user.type(field, 'http://127.0.0.1:8188')
  await user.click(screen.getByRole('button', { name: 'Set' }))
  await waitFor(() => { expect(actionsOf(calls).slice(-2)).toEqual(['endpoint_set', 'status']) })
  expect(calls.find((call) => call.action === 'endpoint_set')?.url).toBe('http://127.0.0.1:8188')
  const result = await screen.findByTestId('mutation-result')
  expect(within(result).getByText('endpoint_set')).toBeTruthy()
  expect(within(result).getByText('State:')).toBeTruthy()
  expect(field.value).toBe('http://127.0.0.1:8188')
})

test('partial and restart-required results show operation, flags, errors, and next action', async () => {
  stubManageWire({
    status: STATUS,
    install_extension: {
      action: 'install_extension',
      ok: false,
      code: 'manage/refused',
      status: 500,
      detail: 'partial (1/2 extension succeeded)',
      state: 'partial',
      next_action: 'install_extension',
      operation_id: 'op-partial',
      partial: true,
      restart_required: false,
      data: {
        state: 'partial',
        operation_id: 'op-partial',
        partial: true,
        restart_required: false,
        next_action: 'install_extension',
        requested: ['a', 'b'],
        succeeded: ['a'],
        missed: ['b'],
        items: [
          { key: 'extension:a', state: 'active' },
          { key: 'extension:b', state: 'failed', errorCode: 'manager/install-failed', detail: 'manager refused pack b' },
        ],
        errors: [{ file: 'extension:b', error: 'manager refused pack b' }],
      },
    },
    install_extension_url: {
      action: 'install_extension_url',
      ok: true,
      detail: 'installed; restart required',
      state: 'restart_required',
      next_action: 'restart',
      operation_id: 'op-restart',
      restart_required: true,
      data: { state: 'restart_required', operation_id: 'op-restart', restart_required: true, items: [{ key: 'extension:url', state: 'restart_required' }] },
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('http://127.0.0.1:18466')

  await user.type(screen.getByPlaceholderText('ComfyUI-KJNodes, ComfyUI-VideoHelperSuite'), 'a, b')
  await user.click(screen.getByRole('button', { name: 'Install' }))
  let result = await screen.findByTestId('mutation-result')
  expect(within(result).getByText('PARTIAL')).toBeTruthy()
  expect(within(result).getByText('op-partial')).toBeTruthy()
  expect(within(result).getByText('Partial: yes')).toBeTruthy()
  expect(within(result).getByText('Restart required: no')).toBeTruthy()
  expect(within(result).getByText('Requested: a, b')).toBeTruthy()
  expect(within(result).getByText('Succeeded: a')).toBeTruthy()
  expect(within(result).getByText('Missed: b')).toBeTruthy()
  expect(within(result).getByText(/manage\/refused · HTTP 500/)).toBeTruthy()
  expect(within(result).getByText('manager/install-failed')).toBeTruthy()
  expect(within(result).getByText(/Next: Install declared packs/)).toBeTruthy()
  const received = within(result).getByText('Received:').parentElement as HTMLElement
  expect(received.textContent).toMatch(/Received:.*fresh/)

  await user.click(screen.getByText(/Install extension from URL/))
  await user.type(screen.getByPlaceholderText('https://github.com/…'), 'https://example.com/pack.zip')
  await user.click(screen.getByRole('button', { name: 'Install from URL' }))
  await waitFor(() => { expect(within(screen.getByTestId('mutation-result')).getByText('RESTART REQUIRED')).toBeTruthy() })
  result = screen.getByTestId('mutation-result')
  expect(within(result).getByText('op-restart')).toBeTruthy()
  expect(within(result).getByText('Restart required: yes')).toBeTruthy()
  expect(within(result).getByText(/Next: Restart ComfyUI/)).toBeTruthy()
})
