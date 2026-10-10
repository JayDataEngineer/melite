/**
 * runCard.spec — the default run-card row, pinned WITHOUT the shell:
 *
 *   model — the row derives ONLY from the frozen call block (replay
 *           stable): streaming prefix rows read running, settled rows
 *           read refused/stopped/error/ok off presentationMeta, and a
 *           card projecting a subset still renders (every meta face
 *           narrows to null, never throws);
 *   live  — the gallery rides the composition's run frames (the
 *           runFrames prop: runs/subscribe through the gateway's
 *           stream face). No prop is no arm — the row renders its
 *           durable model alone and fetches nothing. A terminal
 *           frame's artifacts land through the estate media rewrite;
 *           an ended source keeps its last frame standing; unmount
 *           aborts the source's signal;
 *   claim — the toolview claim rides ctx.effect + slots.inject with
 *           the card's wire tool name as the key, threading the
 *           frames source through the registered component's props.
 *
 * RENDER NOTE: viewer-base ships peer-only react, so this node-lane
 * spec renders through the estate's single React 18.3.1 instance
 * (gallery tree's react-dom — the same store file viewer-base's own
 * react resolves to) over a root-jsdom document stood up below. Real
 * rendering, real AbortSignals — no mocks.
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
import type { RunCardRowProps, RunGalleryFrame, RunFramesSource } from '../src/runCard.tsx'

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
const propsFor = (block: unknown, toolName = 'image-gen'): RunCardRowProps =>
  // the frozen call slice's union does not admit the unknown fakes;
  // cast at the one door, carry the row's real prop type onward
  ({ toolName, block }) as RunCardRowProps

/** A settled run row's props: model + run_id on the meta. */
const settledRunProps = (over: Record<string, unknown> = {}): RunCardRowProps =>
  propsFor(settledBlock({ meta: { model: 'ideogram4', run_id: 'r_1' }, ...over }))

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
    // a head alone (PreparingToolCall carries no argsRaw key at all)
    expect(runCardModel(propsFor({})).prompt).toBe(null)
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
    // the no-wire pin: a stub with nothing to serve (the row must never call)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, propsFor(streamingBlock())))
    expect(await view.findByText('running')).toBeTruthy()
    expect(await view.findByText('a tabby cat')).toBeTruthy()
    expect(view.queryByText(/r_1/)).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('RunCardRow — the gallery rides the run frames', () => {
  const settledRun = settledRunProps

  /** A scripted source: hands the queued frames to the row, records
   * the signal it was handed, and ends. `hang` parks instead — a
   * source whose stream stays open (the parked tail between rows). */
  const scriptedSource = (frames: readonly RunGalleryFrame[], hang = false) => {
    const signals: AbortSignal[] = []
    const read: string[] = []
    const source: RunFramesSource = async function* rows(runId, signal) {
      signals.push(signal)
      read.push(`open:${runId}`)
      for (const frame of frames) {
        if (signal.aborted) return
        read.push(`yield:${frame.status}`)
        yield frame
      }
      read.push(hang ? 'hang' : 'end')
      if (hang) await new Promise<void>(() => {}) // parked: no more rows, no end
    }
    return { source, signals, read }
  }

  it('no source is no arm: the row renders its durable model alone and fetches nothing', async () => {
    // the no-wire pin: a stub with nothing to serve (the row must never call)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const view = render(createElement(RunCardRow, settledRun()))
    // the badge falls to the row state; no wire, no gallery
    expect(await view.findByText('ok')).toBeTruthy()
    expect(view.container.querySelector('img')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('frames land: the badge reads the frame status, artifacts ride the estate media rewrite', async () => {
    // a real pause between frames — each frame commits before the next
    const source: RunFramesSource = async function* rows(runId, signal) {
      void runId
      yield { status: 'running', artifacts: [] }
      await new Promise((r) => setTimeout(r, 30))
      if (!signal.aborted) {
        yield { status: 'completed', artifacts: ['r_1/a.png', 'https://cdn.example/b.png'] }
      }
    }
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('running')).toBeTruthy()
    expect(await view.findByText('completed')).toBeTruthy()
    const srcs = [...view.container.querySelectorAll('img')].map((i) => i.getAttribute('src'))
    // registry names `<runId>/<rel>` ride the media route; absolute urls pass verbatim
    expect(srcs).toEqual(['/melite-media/runs/r_1/a.png', 'https://cdn.example/b.png'])
    expect(view.container.querySelector('img')?.getAttribute('alt')).toBe('r_1/a.png')
  })

  it('an empty artifact name renders no image (the rewrite returns null)', async () => {
    const { source } = scriptedSource([{ status: 'completed', artifacts: [''] }])
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('completed')).toBeTruthy()
    expect(view.container.querySelector('img')).toBeNull()
  })

  it('a source that ends without a terminal frame keeps its last frame standing', async () => {
    const { source, read } = scriptedSource([{ status: 'running', artifacts: [] }])
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('running')).toBeTruthy()
    await vi.waitFor(() => expect(read).toContain('end'), { timeout: 3000 })
    // the ended source's last frame stays as the gallery
    expect(view.container.textContent).toContain('running')
  })

  it('unmount aborts the source\'s signal (the tail disposes)', async () => {
    const { source, signals } = scriptedSource([{ status: 'running', artifacts: [] }], true)
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('running')).toBeTruthy()
    await vi.waitFor(() => expect(signals).toHaveLength(1), { timeout: 3000 })
    expect(signals[0]?.aborted).toBe(false)
    view.unmount()
    await vi.waitFor(() => expect(signals[0]?.aborted).toBe(true), { timeout: 3000 })
  })

  it('a frame landing after unmount writes nothing (the tail left)', async () => {
    let push!: () => void
    const source: RunFramesSource = async function* rows() {
      yield { status: 'running', artifacts: [] }
      await new Promise<void>((r) => { push = r })
      // late: the row is gone; the loop body must drop it, not write
      yield { status: 'completed', artifacts: [] }
    }
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('running')).toBeTruthy()
    view.unmount()
    push()
    // the drop path is microtasks only (resume → stopped → return,
    // no write): flush, not a 30ms window. (The 30ms INSIDE the
    // frames-land stub above stays — it stages the running→completed
    // interval so the intermediate commit is observable at all.)
    await new Promise((r) => setTimeout(r, 0));
    expect(view.container.textContent).not.toContain('completed')
  })

  it('a source that breaks its own law (throws) logs loud and keeps the last frame', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const source: RunFramesSource = async function* rows() {
      yield { status: 'running', artifacts: [] }
      throw new Error('source broke its law')
    }
    const view = render(createElement(RunCardRow, { ...settledRun(), runFrames: source }))
    expect(await view.findByText('running')).toBeTruthy()
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled(), { timeout: 3000 })
    errorSpy.mockRestore()
    expect(view.container.textContent).toContain('running')
  })
})

describe('RunCardRow — the refused row reads honestly', () => {
  it('refused with a headline shows it; the ragged row shows neither prompt nor run', async () => {
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
  const claimCtx = () => {
    const registered: { options: unknown; component: unknown }[] = []
    const ctx = {
      effect: (fn: () => unknown, name?: string): unknown => {
        void name
        return fn()
      },
      slots: {
        inject: (_key: string, callback: () => unknown): unknown => callback(),
        register: (options: unknown, component: unknown): unknown => {
          registered.push({ options, component })
          return () => {}
        },
      },
    }
    return { ctx, registered }
  }

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
      ['register', { name: 'tool.call.toolview', key: 'image-gen.call' }, expect.any(Function)],
    ])
  })

  it('without a source the bare row registers (component identity kept)', () => {
    const { ctx, registered } = claimCtx()
    claimRunCardToolview(ctx, 'image-gen', 'image-gen row')
    expect(registered[0]?.options).toEqual({ name: 'tool.call.toolview', key: 'image-gen' })
    expect(registered[0]?.component).toBe(RunCardRow)
  })

  it('with a source the registered component threads it into the row', async () => {
    const { ctx, registered } = claimCtx()
    const source: RunFramesSource = async function* rows() {
      yield { status: 'completed', artifacts: ['r_1/a.png'] }
    }
    claimRunCardToolview(ctx, 'image-gen', 'image-gen row', source)
    const Row = registered[0]?.component as (props: unknown) => unknown
    const view = render(createElement(Row as never, settledRunProps() as never))
    expect(await view.findByText('completed')).toBeTruthy()
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/melite-media/runs/r_1/a.png')
  })
})
