import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { ComfyManagerPanel, seatManageNamespace } from '../../src/client/assets-tab'
// the css module itself (audit M1): the fold-cap wall binds the
// RENDERED list to the module's own exported class — a JSX rename
// with a dead rule fails the binding, and the cap value is read
// from the file scoped by that same exported name.
import cssModule from '../../src/client/assets.module.css'
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from '@melite/estate-manage/types'
// The manage seat's refusal code (the envelope rides the details —
// same declaration as the wire spec; type-only so this spec builds
// without the seat's graph; the shape must match the other deck
// specs' declaration — interface merging demands one type).
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

// THE ASSETS-TAB LIVE PROGRESS WALL (audit download-stack-audit-
// 2026-10-20 F10 + the operator's burns, 2026-11): the Declared
// resources section froze every family at its last settled state —
// a mid-flight acquire showed NOTHING until it finished, the scan
// re-hashed the estate on every press and never finished, and the
// section itself sprawled the whole sidebar open by default. The
// law, on the face:
//   LIVE VOICE — a mid-flight row renders its live ledger snapshot
//   (bytes, total, phase) as a progress line + meter, through the
//   shared byte/percent vocabulary (4.8/6.8 GB (71%)), never a
//   second spelling; a resumed flight never lies 0%.
//   THE RE-POLL — while any row is live the panel re-polls status
//   every ~2.5s and STOPS when all rows settle; a row that settles
//   between polls lands its verdict (no stuck-live ghost); a live
//   row whose bytes freeze across polls with no phase moving is
//   named stalled, while frozen bytes with a live phase stay flight.
//   THE FOLDED SECTION — the section rides the same DisclosureRow
//   law as every sibling: DEFAULT CLOSED with the one-line story
//   visible in its collapsed content, the row list capped with an
//   internal scroll when open; a payload-less row is not a fold.
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
    state: 'up',
    next_action: 'status',
    endpoint: { reachable: true, url: 'http://127.0.0.1:18466', comfyui_version: '0.34.0', devices: [] },
    manager: { reachable: true, queue: { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }, unit: 'melite-comfyui.service', operations: [] },
    active_runs: [],
    routing: { mode: 'managed' },
    resources: [],
  },
}

/** The mid-flight family: 4.8/6.8 GB (71%), still streaming. */
const LIVE_WAN = {
  ref: { kind: 'model', owner: 'family', id: 'wan', variant: 'preview', quant: 'fp8' },
  state: 'acquiring',
  operation_id: 'op-live',
  bytes: 5_196_173_399,
  total: 7_343_591_088,
  phase: 'stream',
  items: [],
}

function asRow(canned: Canned): ManageEnvelopeRow {
  return {
    action: canned.action ?? '',
    ok: canned.ok ?? false,
    detail: canned.detail ?? '',
    ...(canned.data !== undefined ? { data: canned.data as ManageJsonValue } : {}),
  }
}

/** Seat ONE fake manage lane whose status answers land in sequence —
 *  the n-th status call gets statuses[n], the last one repeats (the
 *  clamp is what a settled estate looks like: every later poll sees
 *  the same settled rows). */
function stubStatusSequence(statuses: Array<Record<string, unknown>>, extra: Record<string, Canned> = {}): { calls: Array<Record<string, unknown>> } {
  const calls: Array<Record<string, unknown>> = []
  let statusCalls = 0
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      calls.push({ ...doc })
      if (doc.action === 'status') {
        const data = statuses[Math.min(statusCalls, statuses.length - 1)]
        statusCalls += 1
        return { ok: true, value: asRow({ action: 'status', ok: true, detail: 'server up', data }) }
      }
      const canned = extra[doc.action]
      if (canned === undefined) {
        return {
          ok: false,
          error: new RemoteError('manage/refused', `unstubbed action ${doc.action}`, {
            action: doc.action, status: 500, code: 'manage/refused',
          }),
        }
      }
      return { ok: true, value: asRow(canned) }
    },
  })
  return { calls }
}

function statusWith(resources: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(STATUS.data as Record<string, unknown>), resources, ...extra }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  seatManageNamespace(undefined)
})

/** Advance the panel's timers inside act, then assert synchronously. */
async function advance(ms: number): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

/** Flush the mount fetch's microtasks — findBy's real-timer polling
 *  deadlocks under fake timers, so every arm asserts synchronously
 *  after this flush instead. */
async function flushMount(): Promise<void> {
  await act(async () => { await Promise.resolve() })
  await act(async () => { await Promise.resolve() })
}

/** Open the Declared resources section (the section fold rides the
 *  same DisclosureRow law as every sibling — default CLOSED; the
 *  story line in its title is the click target). */
function openResourcesSection(): void {
  fireEvent.click(screen.getByTestId('resources-fold-story'))
}

// ---------------------------------------------------------------------------
// THE LIVE VOICE
// ---------------------------------------------------------------------------

test('a mid-flight family renders its live ledger snapshot: the shared progress line and the meter', async () => {
  stubStatusSequence([statusWith([LIVE_WAN])])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()

  const row = screen.getAllByTestId('resource-fold')[0]!
  // the shared vocabulary: the exact operator example's shape (each
  // side carries its unit — the card-view walls pin the same line)
  const line = within(row).getByTestId('resource-progress')
  expect(line.textContent).toBe('4.8 GB/6.8 GB (71%) · stream')
  // the meter carries the same percent
  const fill = within(row).getByTestId('resource-meter-fill')
  expect(fill.style.width).toBe('71%')
  // a live row is not a dead row: no retry/discard doors on it
  expect(within(row).queryByTestId('resource-doors')).toBeNull()
})

test('a resumed flight never lies 0%: the offset lands on the face', async () => {
  // range-resume: 1 234 567 bytes were already aboard before this
  // operation began; the ledger's first snapshot carries the offset
  stubStatusSequence([statusWith([{
    ...LIVE_WAN,
    bytes: 1_234_567 + 3,
    total: 2_000_000,
    phase: 'stream',
  }])])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()

  const line = screen.getByTestId('resource-progress')
  expect(line.textContent).not.toContain('(0%)')
  expect(line.textContent).not.toContain('0 B /')
  // the resumed bytes answer — the offset is the journey's truth
  expect(line.textContent).toBe('1.2 MB/1.9 MB (62%) · stream')
})

// ---------------------------------------------------------------------------
// THE RE-POLL
// ---------------------------------------------------------------------------

test('the panel re-polls while a row is live and stops when all rows settle', async () => {
  const settled = { ...LIVE_WAN, state: 'active', items: [{ key: 'model:family:wan:preview:fp8', state: 'active' }] }
  const { calls } = stubStatusSequence([
    statusWith([LIVE_WAN]),
    statusWith([{ ...LIVE_WAN, bytes: LIVE_WAN.bytes + 100_000_000, phase: 'verify' }]),
    statusWith([settled]),
  ])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  const statusCalls = () => calls.filter((call) => call.action === 'status').length
  expect(statusCalls()).toBe(1)

  // live → live: the poll repeats
  await advance(2_500)
  expect(statusCalls()).toBe(2)
  // live → settled: the poll lands the verdict…
  await advance(2_500)
  expect(statusCalls()).toBe(3)
  // …and STOPS: no row is live, the timer stands down
  await advance(7_500)
  expect(statusCalls()).toBe(3)
  // the settled row lost the live voice — no stuck-live ghost
  openResourcesSection()
  expect(screen.queryByTestId('resource-progress')).toBeNull()
  expect(screen.queryByTestId('resource-meter-fill')).toBeNull()
})

test('a row that settles between polls lands its verdict in the same roster', async () => {
  stubStatusSequence([
    statusWith([LIVE_WAN]),
    statusWith([{
      ...LIVE_WAN,
      state: 'active',
      items: [{ key: 'model:family:wan:preview:fp8', state: 'active', path: 'models/wan/preview/fp8/model.safetensors' }],
    }]),
  ])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()
  expect(screen.getByTestId('resource-progress')).toBeTruthy()

  await advance(2_500)
  // the verdict replaced the live voice — same row, settled state
  expect(screen.queryByTestId('resource-progress')).toBeNull()
  const row = screen.getAllByTestId('resource-fold')[0]!
  fireEvent.click(within(row).getByText('model family/wan:preview:fp8'))
  expect(within(row).getByText('models/wan/preview/fp8/model.safetensors')).toBeTruthy()
})

test('a live row whose bytes freeze across polls with no phase moving is named stalled — frozen bytes with a live phase stay flight', async () => {
  // ARM 1 — frozen bytes AND no phase across two polls: stalled
  const frozen = { ...LIVE_WAN, phase: undefined }
  stubStatusSequence([statusWith([frozen]), statusWith([frozen])])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()
  expect(screen.queryByTestId('resource-stalled')).toBeNull()

  await advance(2_500)
  const note = screen.getByTestId('resource-stalled')
  expect(note.textContent).toContain('stalled')
  cleanup()
  seatManageNamespace(undefined)

  // ARM 2 — the same frozen bytes but the phase moved: flight, never
  // stalled (the F2 law: verify after stream reads bytes-flat)
  const verifying = { ...LIVE_WAN, phase: 'verify' }
  stubStatusSequence([statusWith([verifying]), statusWith([verifying])])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()
  await advance(2_500)
  expect(screen.queryByTestId('resource-stalled')).toBeNull()
  expect(screen.getByTestId('resource-progress')).toBeTruthy()
})

// ---------------------------------------------------------------------------
// THE FOLDED SECTION (the sidebar-height burn)
// ---------------------------------------------------------------------------

test('the Declared resources section rides the fold law: default CLOSED with the one-line story visible, the list capped with an internal scroll when open', async () => {
  stubStatusSequence([statusWith([LIVE_WAN, {
    ref: { kind: 'model', owner: 'family', id: 'zimage' },
    state: 'present',
    items: [{ key: 'model:family:zimage', state: 'present' }],
  }], { resources_detail: 'the status budget closed before the scan could finish' })])
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()

  // DEFAULT CLOSED: the row list mounts NO DOM…
  expect(screen.queryByTestId('resource-status')).toBeNull()
  // …but the section's story stays visible in the collapsed content:
  // the roll-up line the census wall pins, inside the section fold
  const story = screen.getByTestId('resources-fold-story')
  expect(story.textContent).toContain('2 declared')
  expect(story.textContent).toContain('1 acquiring')
  expect(story.textContent).toContain('1 present')
  // the scan note renders OUTSIDE the fold, above it
  const section = document.getElementById('manage-resources')!
  const fold = screen.getByTestId('resources-fold')
  expect(section.contains(fold)).toBe(true)
  const scanNote = screen.getByTestId('resources-scan-note')
  expect(scanNote.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  // OPEN: the row list mounts, capped with an internal scroll — the
  // cap is BOUND (audit M1): the rendered list carries the css
  // module's own exported class, and the 320px cap + scroll ride
  // THAT class in the module file. A JSX class rename (dead rule)
  // fails the binding; a css-side rename (dead JSX) fails the
  // file read; a value drift fails the pin.
  openResourcesSection()
  const list = screen.getByTestId('resource-status')
  expect(within(list).getAllByTestId('resource-fold').length).toBe(2)
  expect(list.className.split(/\s+/)).toContain(cssModule.resourceList)
  let dir = process.cwd()
  for (;;) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'packages/web/melite-card-deck/src/client/assets.module.css'))) break
    const parent = dirname(dir)
    if (parent === dir) throw new Error('assets.module.css not reachable from cwd ' + process.cwd())
    dir = parent
  }
  const css = readFileSync(join(dir, 'packages/web/melite-card-deck/src/client/assets.module.css'), 'utf8')
  // the scoped class the pipeline served carries its source local
  // name — the cap rule is read from the file under THAT name, so
  // the rendered list, the module export, and the file rule are one
  // class end to end
  const capScoped = cssModule.resourceList
  const sourceNames = [...css.matchAll(/\.([A-Za-z][\w-]*)\s*[,{]/g)].map((match) => match[1]!)
  const capSource = [...new Set(sourceNames)].find((name) => capScoped.includes(name))
  expect(capSource !== undefined, `the roster cap class ${capScoped} exists in the module file`).toBe(true)
  const listRules = css.match(new RegExp(String.raw`\.${capSource}\s*\{[^}]*\}`, 'g')) ?? []
  const capRule = listRules.find((rule) => rule.includes('max-height'))
  expect(capRule !== undefined, `the .${capSource} roster cap rule exists`).toBe(true)
  expect(capRule).toMatch(/max-height:\s*320px/)
  expect(capRule).toMatch(/overflow-y:\s*auto/)

  // the section fold rides the shared openFolds law: it STAYS open
  // across a re-poll (the state is keyed, not component-local)
  await advance(2_500)
  expect(screen.getByTestId('resource-status')).toBeTruthy()
  // and a sibling fold still opens beside it (the section fold did
  // not eat the row folds' own state)
  const row = screen.getAllByTestId('resource-fold')[0]!
  fireEvent.click(within(row).getByText('model family/wan:preview:fp8'))
  expect(within(row).getByTestId('resource-progress')).toBeTruthy()
})

test('a payload-less row is not a fold — a payload row folds with its doors reachable', async () => {
  stubStatusSequence([statusWith([
    {
      // payload-less: unknown, no items, no detail, no operation_id
      ref: { kind: 'model', owner: 'family', id: 'moss' },
      state: 'unknown',
      items: [],
    },
    {
      // payload: failed with an operation_id — the doors row
      ref: { kind: 'model', owner: 'family', id: 'wan', variant: 'preview', quant: 'fp8' },
      state: 'failed',
      operation_id: 'op-dead-fetch',
      detail: 'the fetch stalled: no bytes landed in 10000ms',
      items: [],
    },
  ])], {
    acquire_retry: { action: 'acquire_retry', ok: true, detail: 'retrying', data: { operation_id: 'op-fresh' } },
  })
  render(<ComfyManagerPanel />)
  await flushMount()
  expect(screen.getByTestId('health-state')).toBeTruthy()
  openResourcesSection()
  const folds = screen.getAllByTestId('resource-fold')

  // the payload-less row: NOT expandable, no doors behind it
  expect(folds[0].querySelector('[data-expandable]')).toBeNull()
  fireEvent.click(within(folds[0]).getByText('model family/moss'))
  expect(within(folds[0]).queryByTestId('resource-doors')).toBeNull()

  // the payload row: expandable, doors reachable inside
  expect(folds[1].querySelector('[data-expandable]')).not.toBeNull()
  fireEvent.click(within(folds[1]).getByText('model family/wan:preview:fp8'))
  const doors = within(folds[1]).getByTestId('resource-doors')
  expect(within(doors).getByRole('button', { name: 'Retry fetch' })).toBeTruthy()
})
