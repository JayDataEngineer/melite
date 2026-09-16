/**
 * ComfyManagerPanel — the untested sections (the existing battery pins
 * the status chip, silent refresh, pack browse/filter, snapshots, the
 * endpoint seed, and model search; this file pins everything else):
 *
 *   down       — a minimal/refused status renders the down face (no
 *                endpoint, no version, no devices, no chips, no note);
 *   transport  — an aborted channel surfaces 'request failed' through
 *                BOTH fetchStatus and run (never a throw past React);
 *   browse     — mixed pack rows narrow honestly + the false arms (a
 *                refused list leaves the rows absent; empty lists read
 *                empty); snapshot cancel never dispatches;
 *   result     — REFUSED badges, the row formatter's every arm
 *                (strings, name—version, trait rows, bare names,
 *                JSON), object bodies, and absent bodies;
 *   upkeep     — extensions install (both rails), models
 *                download/provision (full + minimal bodies), logs
 *                tails, and the full lifecycle row (launch/restart/
 *                stop/free/update/switch + force + target).
 *
 * fetch is stubbed per action — the same wire fake as the sibling
 * battery (client-request in, server-response out).
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

const DOWN: Canned = { action: 'status', ok: true }

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

function stubAbortedFetch(): void {
  vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
    const e = new Error('the channel dropped')
    e.name = 'AbortError'
    throw e
  }))
}

function actionsOf(calls: Array<Record<string, unknown>>): string[] {
  return calls.map((c) => String(c.action))
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
})

test('a minimal status renders the down face (no endpoint, no extras, no note)', async () => {
  stubManageWire({ status: DOWN })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  expect(screen.queryByText('version')).toBeNull()
  expect(screen.getByText('active runs: 0')).toBeTruthy()
  expect(screen.queryByText(/active run\(s\) — lifecycle/)).toBeNull()
  // the url field stays empty (nothing live to seed from) — Set is disabled.
  const set = screen.getByRole('button', { name: 'Set' })
  expect((set as HTMLButtonElement).disabled).toBe(true)
})

test('a refused status lands in the header detail, never the result pane', async () => {
  stubManageWire({ status: { action: 'status', ok: false, detail: 'engine down' } })
  render(<ComfyManagerPanel />)
  await screen.findByText('engine down')
  expect(screen.queryByText('REFUSED')).toBeNull()
  expect(screen.queryByText('OK')).toBeNull()
})

test('an aborted channel surfaces request-failed through the status section', async () => {
  stubAbortedFetch()
  render(<ComfyManagerPanel />)
  await screen.findByText(/request failed: /)
})

test('an aborted channel surfaces request-failed through an explicit dispatch', async () => {
  stubAbortedFetch()
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText(/request failed: /)
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  const pane = await screen.findByTestId('manage-result')
  expect(within(pane).getByText('REFUSED')).toBeTruthy()
  expect(within(pane).getByText(/request failed: /)).toBeTruthy()
})

test('mixed pack rows narrow honestly; a refused list leaves the rows absent', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    list_extensions: {
      action: 'list_extensions',
      ok: true,
      detail: '5 installed pack(s)',
      data: [
        'plain-string-pack',
        { name: 'a', version: '1' },
        { name: 'b', ver: '2' },
        { name: 'c' },
        { name: 'd', version: 5 },
        { version: '9' },
        7,
      ],
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  const list = await screen.findByTestId('ext-list')
  expect(within(list).getByText('plain-string-pack')).toBeTruthy()
  expect(within(list).getByText('a — 1')).toBeTruthy()
  expect(within(list).getByText('b — 2')).toBeTruthy()
  expect(within(list).getByText('c — ?')).toBeTruthy()
  expect(within(list).getByText('d — ?')).toBeTruthy()
  expect(within(list).getByText('? — 9')).toBeTruthy()
  expect(within(list).getByText('7')).toBeTruthy()
  expect(actionsOf(calls)).toContain('list_extensions')
})

test('a refused pack list renders no rows; an empty list reads empty', async () => {
  stubManageWire({
    status: DOWN,
    list_extensions: { action: 'list_extensions', ok: false, detail: 'rail down' },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  await screen.findByTestId('manage-result')
  expect(screen.queryByTestId('ext-list')).toBeNull()
  cleanup()

  stubManageWire({
    status: DOWN,
    list_extensions: { action: 'list_extensions', ok: true, detail: 'none', data: [] },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  const list = await screen.findByTestId('ext-list')
  expect(within(list).getByText('no packs installed')).toBeTruthy()
})

test('a refused snapshot list renders no rows; an empty list reads empty; cancel never dispatches', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    snapshot_list: { action: 'snapshot_list', ok: false, detail: 'rail down' },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'List snapshots' }))
  await screen.findByTestId('manage-result')
  expect(screen.queryByTestId('snap-list')).toBeNull()
  // cancel the save confirm — nothing dispatches.
  vi.stubGlobal('confirm', vi.fn(() => false))
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }))
  expect(actionsOf(calls)).not.toContain('snapshot_save')
  cleanup()

  stubManageWire({
    status: DOWN,
    snapshot_list: { action: 'snapshot_list', ok: true, detail: 'none', data: [] },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'List snapshots' }))
  const list = await screen.findByTestId('snap-list')
  expect(within(list).getByText('no snapshots — save one before switch/update')).toBeTruthy()
})

test('the result pane formats every row arm, object bodies, and absent bodies', async () => {
  stubManageWire({
    status: DOWN,
    search_models: {
      action: 'search_models',
      ok: true,
      detail: '6 hit(s)',
      data: [
        'a log line',
        { name: 'p', version: '1' },
        { name: 'm', type: 'lora', base: 'wan', filename: 'm.safetensors' },
        { name: 'bare' },
        { version: 'orphan' },
        42,
        null,
      ],
    },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  const pane = await screen.findByTestId('manage-result')
  expect(within(pane).getByText('OK')).toBeTruthy()
  // the rows share ONE pre (lines joined with \n) — assert the
  // rendered lines on its text, never String(obj)'s cast.
  const pre = pane.querySelector('pre')
  expect(pre?.textContent).toContain('a log line')
  expect(pre?.textContent).toContain('p — 1')
  expect(pre?.textContent).toContain('m (lora, wan) — m.safetensors')
  expect(pre?.textContent).toContain('bare')
  expect(pre?.textContent).toContain('{"version":"orphan"}')
  expect(pre?.textContent).toContain('42')
  expect(pre?.textContent).toContain('null')
  expect(pre?.textContent).not.toContain('[object Object]')
  cleanup()

  // a refused dispatch badges REFUSED and carries no data body.
  stubManageWire({
    status: DOWN,
    search_models: { action: 'search_models', ok: false, detail: 'index down' },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.type(screen.getByPlaceholderText('sdxl, wan…'), 'wan')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  const refused = await screen.findByTestId('manage-result')
  expect(within(refused).getByText('REFUSED')).toBeTruthy()
  expect(within(refused).queryByText('data')).toBeNull()
  cleanup()

  // an object body renders pretty JSON; a null body renders no data section.
  stubManageWire({
    status: DOWN,
    logs: { action: 'logs', ok: true, detail: '2 line(s)', data: { lines: ['a', 'b'] } },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'View logs' }))
  const logged = await screen.findByTestId('manage-result')
  expect(within(logged).getByText(/"lines"/)).toBeTruthy()
})

test('install rails dispatch with the exact bodies and reload the browse rows', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    list_extensions: { action: 'list_extensions', ok: true, detail: '1', data: [{ name: 'x', version: '1' }] },
    install_extension: { action: 'install_extension', ok: true, detail: 'installed', data: null },
    install_extension_url: { action: 'install_extension_url', ok: true, detail: 'installed', data: null },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')

  // both install buttons start disabled on empty inputs.
  const install = screen.getByRole('button', { name: 'Install' })
  expect((install as HTMLButtonElement).disabled).toBe(true)
  // load the browse rows first — the install's after-hook reloads them.
  await user.click(screen.getByRole('button', { name: 'Installed packs' }))
  await screen.findByTestId('ext-list')
  const listsBefore = actionsOf(calls).filter((a) => a === 'list_extensions').length
  await user.type(screen.getByPlaceholderText('ComfyUI-KJNodes, ComfyUI-VideoHelperSuite'), 'a, b')
  await user.click(screen.getByRole('button', { name: 'Install' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('install_extension')
  })
  expect(calls.find((c) => c.action === 'install_extension')?.nodes).toEqual(['a', 'b'])
  await waitFor(() => {
    expect(actionsOf(calls).filter((a) => a === 'list_extensions').length).toBeGreaterThan(listsBefore)
  })

  const fromUrl = screen.getByRole('button', { name: 'Install from URL' })
  expect((fromUrl as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByPlaceholderText('https://github.com/…'), 'https://example.com/pack.zip')
  await user.click(screen.getByRole('button', { name: 'Install from URL' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('install_extension_url')
  })
  expect(calls.find((c) => c.action === 'install_extension_url')?.url).toBe('https://example.com/pack.zip')
})

test('an install without preloaded rows skips the reload (the null-rows arm)', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    install_extension: { action: 'install_extension', ok: true, detail: 'installed', data: null },
    install_extension_url: { action: 'install_extension_url', ok: true, detail: 'installed', data: null },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.type(screen.getByPlaceholderText('ComfyUI-KJNodes, ComfyUI-VideoHelperSuite'), 'solo-pack')
  await user.click(screen.getByRole('button', { name: 'Install' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('install_extension')
  })
  // no browse was ever opened — no reload fires.
  expect(actionsOf(calls)).not.toContain('list_extensions')
  await user.type(screen.getByPlaceholderText('https://github.com/…'), 'https://example.com/solo.zip')
  await user.click(screen.getByRole('button', { name: 'Install from URL' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('install_extension_url')
  })
  expect(actionsOf(calls)).not.toContain('list_extensions')
})

test('a url-only download omits the optionals (the minimal-body arm)', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    download_model: { action: 'download_model', ok: true, detail: 'queued', data: null },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.type(screen.getByPlaceholderText('https://…/model.safetensors'), 'https://example.com/only.safetensors')
  await user.click(screen.getByRole('button', { name: 'Download' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('download_model')
  })
  expect(calls.find((c) => c.action === 'download_model')).toEqual({
    action: 'download_model',
    url: 'https://example.com/only.safetensors',
  })
})

test('models download/provision send full vs minimal bodies', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    download_model: { action: 'download_model', ok: true, detail: 'queued', data: null },
    provision_model: { action: 'provision_model', ok: true, detail: 'provisioned', data: null },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')

  const download = screen.getByRole('button', { name: 'Download' })
  expect((download as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByPlaceholderText('https://…/model.safetensors'), 'https://example.com/m.safetensors')
  await user.type(screen.getByPlaceholderText('models/checkpoints'), 'models/checkpoints')
  await user.type(screen.getByPlaceholderText('model.safetensors'), 'm.safetensors')
  await user.click(screen.getByRole('button', { name: 'Download' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('download_model')
  })
  expect(calls.find((c) => c.action === 'download_model')).toMatchObject({
    url: 'https://example.com/m.safetensors',
    relative_path: 'models/checkpoints',
    filename: 'm.safetensors',
  })

  const provision = screen.getByRole('button', { name: 'Provision' })
  expect((provision as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByPlaceholderText('z-image'), 'z-image')
  await user.click(screen.getByRole('button', { name: 'Provision' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('provision_model')
  })
  // minimal body: optionals omitted, never empty strings.
  expect(calls.find((c) => c.action === 'provision_model')).toEqual({
    action: 'provision_model',
    model: 'z-image',
  })
  // optionals filled ride along.
  await user.type(screen.getByLabelText('variant'), 'full')
  await user.type(screen.getByLabelText('quant'), 'fp8')
  await user.click(screen.getByRole('button', { name: 'Provision' }))
  await waitFor(() => {
    expect(actionsOf(calls).filter((a) => a === 'provision_model')).toHaveLength(2)
  })
  expect(calls.filter((c) => c.action === 'provision_model')[1]).toEqual({
    action: 'provision_model',
    model: 'z-image',
    variant: 'full',
    quant: 'fp8',
  })
})

test('logs clamp the tail (garbage → 200, huge → 2000)', async () => {
  const { calls } = stubManageWire({
    status: DOWN,
    logs: { action: 'logs', ok: true, detail: 'lines', data: ['a'] },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  const tail = screen.getByDisplayValue('200')
  await user.clear(tail)
  await user.type(tail, 'abc')
  await user.click(screen.getByRole('button', { name: 'View logs' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('logs')
  })
  expect(calls.find((c) => c.action === 'logs')?.tail).toBe(200)
  await user.clear(tail)
  await user.type(tail, '5000')
  await user.click(screen.getByRole('button', { name: 'View logs' }))
  await waitFor(() => {
    expect(actionsOf(calls).filter((a) => a === 'logs')).toHaveLength(2)
  })
  expect(calls.filter((c) => c.action === 'logs')[1]?.tail).toBe(2000)
})

test('the lifecycle row dispatches every action (force + target ride along)', async () => {
  const UP: Canned = {
    action: 'status',
    ok: true,
    detail: 'up',
    data: { endpoint: { reachable: false, url: 'http://127.0.0.1:8188', reason: 'connection refused' }, server_info: { running: true }, active_runs: ['r1'] },
  }
  const { calls } = stubManageWire({
    status: UP,
    launch: { action: 'launch', ok: true, detail: 'launched', data: null },
    restart: { action: 'restart', ok: true, detail: 'restarted', data: null },
    stop: { action: 'stop', ok: true, detail: 'stopped', data: null },
    free: { action: 'free', ok: true, detail: 'freed', data: null },
    update: { action: 'update', ok: true, detail: 'updated', data: null },
    switch_version: { action: 'switch_version', ok: true, detail: 'switched', data: null },
  })
  const user = userEvent.setup()
  render(<ComfyManagerPanel />)
  // the workspace-up/server-down face + the active-run warning.
  await screen.findByText('workspace up, server down')
  await screen.findByText(/connection refused/)
  await screen.findByText(/1 active run\(s\) — lifecycle actions will be refused unless force is set\./)

  await user.click(screen.getByRole('button', { name: 'Launch' }))
  await user.click(screen.getByRole('button', { name: 'Restart' }))
  await user.click(screen.getByRole('button', { name: 'Stop' }))
  await user.click(screen.getByRole('button', { name: 'Free VRAM' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('launch')
  })
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('free')
  })
  expect(calls.find((c) => c.action === 'restart')).toMatchObject({ force: false })

  // force on + target switch, then update + switch_version.
  await user.click(screen.getByRole('checkbox'))
  await user.selectOptions(screen.getByDisplayValue('comfy'), 'all')
  await user.click(screen.getByRole('button', { name: 'Update' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('update')
  })
  expect(calls.find((c) => c.action === 'update')).toMatchObject({ target: 'all', force: true })

  const sw = screen.getByRole('button', { name: 'Switch' })
  expect((sw as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByPlaceholderText('commit / tag'), 'abc123')
  await user.click(screen.getByRole('button', { name: 'Switch' }))
  await waitFor(() => {
    expect(actionsOf(calls)).toContain('switch_version')
  })
  expect(calls.find((c) => c.action === 'switch_version')).toMatchObject({ version: 'abc123', force: true })

  // restore carries the snapshot name + the force flag.
  cleanup()
  const second = stubManageWire({
    status: DOWN,
    snapshot_list: { action: 'snapshot_list', ok: true, detail: '1', data: ['s.json'] },
    snapshot_restore: { action: 'snapshot_restore', ok: true, detail: 'restored', data: null },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('not reachable')
  await user.click(screen.getByRole('button', { name: 'List snapshots' }))
  await screen.findByTestId('snap-list')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => {
    expect(actionsOf(second.calls)).toContain('snapshot_restore')
  })
  expect(second.calls.find((c) => c.action === 'snapshot_restore')).toMatchObject({ snapshot: 's.json', force: true })
})

test('devices with bare rows render the unknown-vram face', async () => {
  stubManageWire({
    status: {
      action: 'status',
      ok: true,
      detail: 'up',
      data: {
        endpoint: { reachable: true, url: 'http://127.0.0.1:8188', devices: [{}, { name: 'cpu' }] },
        manager_security: 'low',
        routing: { mode: 'direct' },
      },
    },
  })
  render(<ComfyManagerPanel />)
  await screen.findByText('reachable')
  expect(screen.getByText('manager security: low')).toBeTruthy()
  expect(screen.getByText('mode: direct')).toBeTruthy()
  expect(screen.getAllByText('? / ? GB free')).toHaveLength(2)
  expect(screen.getByText('gpu')).toBeTruthy()
})
