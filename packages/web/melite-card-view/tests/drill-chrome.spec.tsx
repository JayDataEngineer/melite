// @vitest-environment happy-dom
/**
 * drill-chrome.spec.tsx — THE RUN GESTURE + THE PROGRESS FACES
 * (2026-09-13, operator: "improve the drill down cards… instead of
 * 'Run' it should have a run button. It doesn't need remove stage
 * button… forward the comfyui progress webhooks like before"). Three
 * pins:
 *
 *   1. the drill's run gesture is a LABELED button at the params
 *      rail's sticky footer — play glyph + 'Run' at rest (aria 'Run
 *      stage', testid drill-run), stop glyph + 'Stop' mid-run (aria
 *      'Stop run', drill-stop); the operator retired the 28px
 *      icon-only ghost circle as too small. The 'Remove stage' row
 *      stays retired (removal rides the tile trash).
 *   2. the tile carries the live percent beside its spinner while
 *      the row runs (the tap fold, observer carry).
 *   3. the drill carries the activity line + percent while running.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

// the running row's result carries the tap fold — the observer
// patches {run_id, progress, activity} onto it while the run lives
const RUNNING_BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-chrome',
  rev: 4,
  stages: [
    {
      id: 's_0',
      card: 'image-gen',
      title: 'hero frame',
      engine: 'comfyui',
      status: 'running',
      runStatus: 'running',
      params: { prompt: 'a red cube' },
      result: { run_id: 'run-9', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' },
    },
    {
      id: 's_1',
      card: 'image-gen',
      title: 'the edit',
      engine: 'comfyui',
      status: 'idle',
      params: { prompt: 'make it grayscale' },
    },
  ],
  log: [],
}

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        fields: [{ name: 'prompt', label: 'Prompt', type: 'textarea' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') {
      value = {
        draft_id: 'bench-chrome', rev: 4,
        stages: RUNNING_BENCH.stages.map((s) => ({ ...s })),
        log: [],
      }
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
}

function tileButtons(): HTMLElement[] {
  return [...document.querySelectorAll('button[class*="tileInner"]')] as HTMLElement[]
}

const mount = (): ReturnType<typeof render> =>
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live', value: RUNNING_BENCH }),
  } as never))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('the drill runs on the labeled gesture; the remove row is retired', async () => {
  stubWire()
  const user = userEvent.setup()
  mount()
  // open the IDLE stage's drill (tile 1)
  await user.click(tileButtons()[1] as HTMLElement)
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const drill = document.querySelector('div[class*="zoomDetail"]') as HTMLElement
  expect(drill).toBeTruthy()
  // the labeled gesture: aria-named play button carrying the word 'Run'
  const run = within(drill).getByRole('button', { name: 'Run stage' })
  expect(run.getAttribute('data-testid')).toBe('drill-run')
  expect(run.textContent).toContain('Run')
  // the RETIRED remove row: no button anywhere in the drill
  expect(within(drill).queryByRole('button', { name: 'Remove stage' })).toBeNull()
})

test('the running drill shows stop + the tap fold; the tile shows the percent', async () => {
  stubWire()
  const user = userEvent.setup()
  mount()
  // THE TILE HALF: the percent rides beside the spinner
  await waitFor(() => {
    expect(screen.getByTestId('tile-progress').textContent).toBe('35%')
  })
  // THE DRILL HALF: open the RUNNING stage (tile 0)
  await user.click(tileButtons()[0] as HTMLElement)
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const drill = document.querySelector('div[class*="zoomDetail"]') as HTMLElement
  // stop glyph replaces play while running
  const stop = within(drill).getByRole('button', { name: 'Stop run' })
  expect(stop.getAttribute('data-testid')).toBe('drill-stop')
  expect(within(drill).queryByRole('button', { name: 'Run stage' })).toBeNull()
  // the activity line + percent, one glance
  const prog = within(drill).getByTestId('drill-progress')
  expect(prog.textContent).toContain('sampling 7/20')
  expect(prog.textContent).toContain('35%')
})
