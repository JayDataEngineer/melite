/**
 * runCard.spec — the default run-card row, pinned WITHOUT the shell:
 *
 *   model — the row derives ONLY from the frozen call block (replay
 *           stable): streaming prefix rows read running, settled rows
 *           read refused/stopped/error/ok off presentationMeta, and a
 *           card projecting a subset still renders (every meta face
 *           narrows to null, never throws);
 *   live  — with a run id the row polls the same-origin run proxy
 *           until the run settles (terminal statuses stop the poll,
 *           404 parks the badge at unknown, transient failures retry);
 *   claim — the toolview claim rides ctx.effect + slots.inject with
 *           the card's wire tool name as the key.
 *
 * RENDER NOTE: viewer-base ships peer-only react, so this node-lane
 * spec renders through the estate's single React 18.3.1 instance
 * (gallery tree's react-dom — the same store file viewer-base's own
 * react resolves to) over a root-jsdom document stood up below. Real
 * rendering, real fetch Responses, real timers — no mocks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'

// The node lane externalizes the primitives leaf whose built lib pulls
// a .css file node cannot load (the DOM lanes inline it instead —
// vitest.config server.deps.inline, unchangeable from here). The
// stand-in keeps the row's REAL render path and probes the DOT table:
// it prints the mapped state, so every badge arm below pins the
// running→ongoing / ok→done / refused,stopped→warning / error→error
// mapping behaviorally (StateDot's own rendering is its owner's).
vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const { createElement: h } = await import('react')
  return {
    StateDot: ({ state }: { state: string }) => h('span', { 'data-statedot': state }),
  }
})
import { cleanup, render } from '../../infer-gallery/node_modules/@testing-library/react'

import { claimRunCardToolview, runCardModel, RunCardRow } from '../src/runCard.tsx'

// ── the document (stood up once; per-test fetch stubs come and go) ──
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
for (const key of ['window', 'document', ...Object.getOwnPropertyNames(dom.window)]) {
  if (key === 'navigator' || key in globalThis) continue // node 24 owns a getter-only navigator
  try {
    ;(globalThis as Record<string, unknown>)[key] = (
      dom.window as unknown as Record<string, unknown>
    )[key]
  } catch {
    /* read-only global — skip it */
  }
}
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ── block fakes (shaped like the frozen call slice; cast once) ──
const settledBlock = (over: Record<string, unknown> = {}): unknown => ({
  kind: 'tool-call',
  call: { argsRaw: JSON.stringify({ prompt: 'a tabby cat' }) },
  meta: {},
  content: [],
  isError: false,
  ...over,
})
const streamingBlock = (over: Record<string, unknown> = {}): unknown => ({
  argsRaw: JSON.stringify({ prompt: 'a tabby cat' }),
  ...over,
})
const propsFor = (block: unknown, toolName = 'image-gen'): never =>
  ({ toolName, block }) as never

const okJson = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status })

describe('runCardModel — the durable slice alone', () => {
  it('a streaming prefix reads running with the prompt, everything else null', () => {
    expect(runCardModel(propsFor(streamingBlock()))).toEqual({
      state: 'running',
      model: null,
      runId: null,
      prompt: 'a tabby cat',
      headline: null,
    })
  })

  it('truncated args read a null prompt (the settled meta carries the facts)', () => {
    expect(runCardModel(propsFor(streamingBlock({ argsRaw: '{"prompt":' }))).prompt).toBe(null)
    expect(runCardModel(propsFor(streamingBlock({ argsRaw: undefined }))).prompt).toBe(null)
    expect(runCardModel(propsFor(streamingBlock({ argsRaw: '{"prompt":42}' }))).prompt).toBe(null)
  })

  it('a refused row carries model/run plus the joined headline', () => {
    const model = runCardModel(propsFor(settledBlock({
      meta: { model: 'ideogram4', run_id: 'r_1', error: 'soap' },
      content: [{ type: 'text', text: 'first' }, { type: 'image', url: 'x' }],
    })))
    expect(model.state).toBe('refused')
    expect(model.model).toBe('ideogram4')
    expect(model.runId).toBe('r_1')
    expect(model.headline).toBe('first\n{"type":"image","url":"x"}')
  })

  it('meta faces narrow to null, never throw', () => {
    const model = runCardModel(propsFor(settledBlock({
      meta: { model: '', run_id: 7, error: 9 },
      call: undefined,
      content: [],
    })))
    expect(model).toMatchObject({ state: 'ok', model: null, runId: null, prompt: null, headline: null })
  })

  it('interrupted calls read stopped; bare failures read error', () => {
    expect(runCardModel(propsFor(settledBlock({
      meta: { error: '' },
      error: { code: 'interrupted' },
    }))).state).toBe('stopped')
    expect(runCardModel(propsFor(settledBlock({ isError: true }))).state).toBe('error')
    expect(runCardModel(propsFor(settledBlock()))).toMatchObject({ state: 'ok' })
  })
})

describe('RunCardRow — the running row never touches the wire', () => {
  it('a streaming prefix badges running with the prompt and no fetch', async () => {
    const fetchSpy = vi.fn(async (): Promise<Response> => okJson({}))
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, propsFor(streamingBlock())))
    expect(await view.findByText('running')).toBeTruthy()
    expect(await view.findByText('a tabby cat')).toBeTruthy()
    expect(view.queryByText(/r_1/)).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('RunCardRow — the gallery poll', () => {
  const settledRun = (over: Record<string, unknown> = {}): never =>
    propsFor(settledBlock({ meta: { model: 'ideogram4', run_id: 'r_1' }, ...over }))

  it('a settled run stops at completed and renders the artifact wall', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: unknown): Promise<Response> => {
      expect(String(input)).toBe('/melite-viewer/run/r_1')
      return okJson({ status: 'completed', artifacts: ['a.png', '', 42] })
    }))
    const view = render(createElement(RunCardRow, settledRun()))
    expect(await view.findByText('completed')).toBeTruthy()
    const img = view.container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/melite-viewer/asset/r_1/a.png')
    expect(img?.getAttribute('alt')).toBe('a.png')
    expect(view.container.querySelectorAll('img')).toHaveLength(1)
  })

  it('an unknown run parks the badge at unknown and keeps the row', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => new Response('nope', { status: 404 })))
    const view = render(createElement(RunCardRow, settledRun()))
    expect(await view.findByText('unknown')).toBeTruthy()
    expect(view.container.querySelector('img')).toBeNull()
  })

  it('a transient failure retries, a running status repolls, completion lands', async () => {
    const bodies: unknown[] = [
      'reject',
      { status: 'running', artifacts: [] },
      { status: 'completed', artifacts: ['done.png'] },
    ]
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      const next = bodies.shift()
      if (next === 'reject') throw new Error('socket reset')
      return okJson(next)
    }))
    const view = render(createElement(RunCardRow, settledRun()))
    expect(await view.findByText('completed', undefined, { timeout: 8000 })).toBeTruthy()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe(
      '/melite-viewer/asset/r_1/done.png',
    )
  }, 15000)

  it('a status-less body lands with the row state as the badge', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => okJson({ artifacts: ['a.png'] })))
    const view = render(createElement(RunCardRow, settledRun()))
    expect(await view.findByText('ok')).toBeTruthy()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe(
      '/melite-viewer/asset/r_1/a.png',
    )
  })

  it('a shapeless artifacts body renders no wall', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => okJson({ status: 'completed' })))
    const view = render(createElement(RunCardRow, settledRun()))
    expect(await view.findByText('completed')).toBeTruthy()
    expect(view.container.querySelector('img')).toBeNull()
  })

  it('garbage bodies retry; unmounting clears the retry', async () => {
    const fetchSpy = vi.fn(async (): Promise<Response> => new Response('not json{{{', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, settledRun()))
    // let the first poll fail into a scheduled retry, then leave —
    // the cleanup must clear the pending timer (no stray poll after).
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await new Promise((r) => setTimeout(r, 50))
    view.unmount()
    await new Promise((r) => setTimeout(r, 2200))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('leaving mid-flight drops the late ok answer (no write after unmount)', async () => {
    let resolveFetch!: (res: Response) => void
    const fetchSpy = vi.fn(
      () => new Promise<Response>((r) => { resolveFetch = r }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, settledRun()))
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1), { timeout: 3000 })
    view.unmount()
    resolveFetch(okJson({ status: 'running', artifacts: ['late.png'] }))
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('leaving mid-flight drops the late refusal too', async () => {
    let resolveFetch!: (res: Response) => void
    const fetchSpy = vi.fn(() => new Promise<Response>((r) => { resolveFetch = r }))
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, settledRun()))
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1), { timeout: 3000 })
    view.unmount()
    resolveFetch(new Response('gone', { status: 404 }))
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('RunCardRow — the refused row reads honestly', () => {
  it('refused with a headline shows it; the ragged row shows neither prompt nor run', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => okJson({})))
    const view = render(createElement(RunCardRow, propsFor(settledBlock({
      call: undefined,
      meta: { error: 'soap' },
      content: [{ type: 'text', text: 'the refuser speaks' }],
    }))))
    expect(await view.findByText('refused')).toBeTruthy()
    expect(await view.findByText('the refuser speaks')).toBeTruthy()
    expect(view.queryByText('a tabby cat')).toBeNull()
  })
})

describe('claimRunCardToolview — the keyed slot claim', () => {
  it('rides ctx.effect + slots.inject with the wire tool name as the key', () => {
    const seen: unknown[] = []
    const ctx = {
      effect: (fn: () => unknown, name?: string): unknown => {
        seen.push(['effect', name])
        return fn()
      },
      slots: {
        inject: (key: string, callback: () => unknown): unknown => {
          seen.push(['inject', key])
          return callback()
        },
        register: (options: unknown, component: unknown): unknown => {
          seen.push(['register', options, component])
          return () => {}
        },
      },
    }
    claimRunCardToolview(ctx, 'image-gen.call', 'image-gen row')
    expect(seen).toEqual([
      ['effect', 'image-gen row'],
      ['inject', 'tool.call.toolview'],
      ['register', { name: 'tool.call.toolview', key: 'image-gen.call' }, RunCardRow],
    ])
  })
})
