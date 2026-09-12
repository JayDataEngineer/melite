// @vitest-environment happy-dom
/**
 * The h3 timeline studio (the advanced-views port, 2026-09-12) — pins
 * the 1:1 translation of the old editor's tenant #4 onto the new
 * host's currency: the bar IS the calls document (end_frame EXCLUSIVE,
 * spans proportional to frames, guide lanes under the calls), the
 * mode-switching rail (global ⇄ the selected call's editor), the
 * starter seeding, the extend verb, and the patch-then-run law.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { H3TimelineStudio, h3TimelineStudio } from '../src/client/h3-timeline-studio.tsx'

const SPEC = {
  form: 'h3-timeline',
  layout: 'studio',
  size: 'huge',
  fields: [
    { name: 'seed', label: 'Seed', type: 'seed', group: 'recipe' },
    { name: 'width', label: 'Width', type: 'number', default: 1280, group: 'recipe' },
    { name: 'height', label: 'Height', type: 'number', default: 720, group: 'recipe' },
    // the timeline-subsumed legacy keys must NOT render (the calls own them)
    { name: 'prompt', label: 'Prompt', type: 'text', group: 'recipe' },
    { name: 'image', label: 'Image', type: 'image', group: 'recipe' },
    { name: 'length', label: 'Length', type: 'number', group: 'recipe' },
  ],
}

function owner(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stageId: 's_h',
    cardName: 'h3-timeline',
    row: { id: 's_h', params: {} },
    runStatus: '',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: vi.fn(),
    onSurface: () => {},
    upstream: [],
    runId: null,
    ...overrides,
  }
}

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      return new Response(JSON.stringify(SPEC), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200 })
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

test('the registration is keyed under h3-timeline (the ui-tool law)', () => {
  const registered: Array<{ name: string; key?: string }> = []
  const ctx = {
    slots: {
      inject: (_name: string, run: () => unknown) => { run() },
      register: (spec: { name: string; key?: string }) => { registered.push(spec); return () => {} },
    },
  }
  h3TimelineStudio.apply(ctx as never)
  expect(registered).toEqual([{ name: 'cards.stage.view', key: 'h3-timeline' }])
})

test('no calls in params seeds the starter document (168 frames = 7s)', async () => {
  stubWire()
  render(createElement(H3TimelineStudio, owner() as never))
  expect(await screen.findByTestId('h3-doc-readout', {}, { timeout: 4000 }).then((el) => el.textContent))
    .toBe('1 call · 7s · 0 guides')
  // the single bar clip renders from the starter span
  const bar = screen.getByTestId('h3-calls-bar')
  expect(bar.children.length).toBe(1)
})

test('the bar IS the calls document: two calls, proportional spans, end EXCLUSIVE', async () => {
  stubWire()
  const calls = [
    { text: 'first shot', start_frame: 0, end_frame: 168 },
    { text: 'second shot, chained', start_frame: 168, end_frame: 336, transition: 'extend', knobs: { sampling_steps: 8 } },
  ]
  render(createElement(H3TimelineStudio, owner({
    row: { id: 's_h', params: { calls, keyframes: [{ frame: 24, kind: 'image', source: 'up_1.png' }] } },
  }) as never))
  expect(await screen.findByTestId('h3-doc-readout', {}, { timeout: 4000 }).then((el) => el.textContent))
    .toBe('2 calls · 14s · 1 guide · 1 with knobs')
  const bar = screen.getByTestId('h3-calls-bar')
  expect(bar.children.length).toBe(2)
  // span 0..168 of total 336 = left 0% width 50%; end EXCLUSIVE (168 owns half)
  expect((bar.children[0] as HTMLElement).style.left).toBe('0%')
  expect((bar.children[0] as HTMLElement).style.width).toBe('calc(50% - 2px)')
  // the guide pin lands on the image lane at frame 24 of 336 = 7.14..%
  const pin = screen.getByTestId('h3-lane-image').children[1] as HTMLElement
  expect(pin.style.left).toBe('7.142857142857142%')
})

test('the mode-switching rail: click a clip → its editor; back → global', async () => {
  stubWire()
  const user = userEvent.setup()
  const calls = [{ text: 'the shot text', start_frame: 0, end_frame: 168 }]
  render(createElement(H3TimelineStudio, owner({ row: { id: 's_h', params: { calls } } }) as never))
  await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 })
  // global mode first: the call list row renders the text (the bar clip
  // carries it too — the mode signal is the editor hint's presence)
  expect(screen.getAllByText(/the shot text/).length).toBeGreaterThanOrEqual(1)
  expect(screen.queryByText(/one continuous shot, no cuts/)).toBeNull()
  // click the BAR clip → the editor swaps in
  await user.click(screen.getByTestId('h3-calls-bar').children[0] as HTMLElement)
  expect(await screen.findByText(/one continuous shot, no cuts/)).toBeTruthy()
  const ta = screen.getByDisplayValue('the shot text') as HTMLTextAreaElement
  expect(ta.tagName).toBe('TEXTAREA')
  // back to global
  await user.click(screen.getByText('← All calls'))
  expect(screen.queryByText(/one continuous shot, no cuts/)).toBeNull()
  expect(screen.getAllByText(/the shot text/).length).toBeGreaterThanOrEqual(1)
})

test('Extend +7s appends a call at the tail; Run patches the domain FIRST', async () => {
  stubWire()
  const user = userEvent.setup()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const calls = [{ text: 'one', start_frame: 0, end_frame: 168 }]
  render(createElement(H3TimelineStudio, owner({
    row: { id: 's_h', params: { calls, seed: 42 } }, onPatch, onRun,
  }) as never))
  await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 })
  await user.click(screen.getByText('Extend +7s'))
  expect(screen.getByTestId('h3-calls-bar').children.length).toBe(2)
  // the empty-prompt warning: the new call has no text
  expect(screen.getByText(/1 call needs a prompt/)).toBeTruthy()
  await user.click(screen.getByText('Run film'))
  expect(onPatch).toHaveBeenCalledTimes(1)
  expect(onRun).toHaveBeenCalledTimes(1)
  expect(onPatch.mock.invocationCallOrder[0]).toBeLessThan(onRun.mock.invocationCallOrder[0])
  const patch = onPatch.mock.calls[0][0] as Record<string, unknown>
  const patched = patch['calls'] as Array<{ start_frame: number; end_frame: number; text: string }>
  expect(patched.length).toBe(2)
  expect(patched[1]).toMatchObject({ start_frame: 168, end_frame: 336, text: '' })
  // the frozen row params ride through the patch
  expect(patch['seed']).toBe(42)
})

test('empty-prompt refusal warning only counts textless calls', async () => {
  stubWire()
  render(createElement(H3TimelineStudio, owner({
    row: { id: 's_h', params: { calls: [{ text: 'described', start_frame: 0, end_frame: 168 }] } },
  }) as never))
  await screen.findByTestId('h3-doc-readout', {}, { timeout: 4000 })
  expect(screen.queryByText(/needs a prompt/)).toBeNull()
})

test('the timeline-subsumed legacy spec keys do not render in the rail', async () => {
  stubWire()
  render(createElement(H3TimelineStudio, owner() as never))
  await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 })
  expect(screen.queryByText('Prompt')).toBeNull()
  expect(screen.queryByText('Image')).toBeNull()
  expect(screen.queryByText('Length')).toBeNull()
})

test('the output half: a row result url renders the film element directly', async () => {
  stubWire()
  render(createElement(H3TimelineStudio, owner({
    row: { id: 's_h', params: {}, result: { run_id: 'r_9', url: '/artifacts/film.mp4' } },
    runStatus: 'done',
  }) as never))
  const video = await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 }).then(() =>
    document.querySelector('video') as HTMLVideoElement | null)
  expect(video).not.toBeNull()
  expect(video?.getAttribute('src')).toBe('/artifacts/film.mp4')
})

test('the envelope lift reports huge (the old wide tenant)', async () => {
  stubWire()
  const reported: string[] = []
  const onSurface = (s: string): void => { reported.push(s) }
  render(createElement(H3TimelineStudio, owner({ onSurface }) as never))
  await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 })
  await waitFor(() => { expect(reported).toEqual(['huge']) })
})

// fireEvent kept for span edits (number inputs) — the doc law: frames edit
test('span edits patch the call in place (end EXCLUSIVE law)', async () => {
  stubWire()
  const onPatch = vi.fn()
  const calls = [{ text: 'x', start_frame: 0, end_frame: 168 }]
  render(createElement(H3TimelineStudio, owner({ row: { id: 's_h', params: { calls } }, onPatch }) as never))
  await screen.findByTestId('h3-calls-bar', {}, { timeout: 4000 })
  fireEvent.click(screen.getByTestId('h3-calls-bar').children[0] as HTMLElement)
  expect(await screen.findByText(/one continuous shot, no cuts/)).toBeTruthy()
  const inputs = screen.getAllByRole('spinbutton')
  fireEvent.change(inputs[0], { target: { value: '24' } })
  fireEvent.click(screen.getByText('Run film'))
  const patched = onPatch.mock.calls[0][0] as { calls: Array<{ start_frame: number; end_frame: number }> }
  expect(patched.calls[0]).toMatchObject({ start_frame: 24, end_frame: 168 })
})
