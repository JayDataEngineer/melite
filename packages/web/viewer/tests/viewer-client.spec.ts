// viewer-client.spec — the client half claims the default run-card
// view for every composed card (one line per card), threading the
// live-run source when the estate's runs namespace is mounted: the
// image_gen wire tool name lands on tool.call.toolview through
// viewer-base's claimRunCardToolview with the runFrames source as
// its fourth argument; without the namespace (a composition that
// never mounted the estate) the claim rides bare. Fake client ctx
// (effect + slots + get + remote); no shell, no DOM.
//
// SEAM NOTE: the claim pins pin the composition's OWN behavior —
// which tool name, which label, through which claim, with or without
// the source — with the runCard leaf stubbed at its module seam.
// Importing the real leaf would drag the primitives leaf's .css
// into the node lane (unloadable here; the DOM lanes inline it via
// vitest.config server.deps.inline, unchangeable from here). The
// real claim (slot key, component identity, frames threading) is
// pinned in viewer-base's runCard.spec.ts; the real row renders
// there too.
//
// The source builder (viewerRunFrames) is the REAL unit here: a
// fake remote ($stream) + a fake runs namespace (subscribe) pin the
// run view's tail laws where the gallery has a face for them —
// frames on row change, silence on re-served rows, terminal ends,
// abort disposes, a failed stream ends (never throws) with its last
// frame standing.
import { expect, it, vi } from 'vitest'

vi.mock('@melite/viewer-base/runCard', async () => {
  const { vi: vitest } = await import('vitest')
  return { claimRunCardToolview: vitest.fn() }
})

import { apply, viewerRunFrames } from '../src/client/index.ts'
import { claimRunCardToolview } from '@melite/viewer-base/runCard'
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client'
import type { RunGalleryFrame } from '@melite/viewer-base/runCard'

const fakeCtx = (runs?: unknown): Record<string, unknown> => ({
  effect: (fn: () => unknown, _name?: string): unknown => fn(),
  slots: {
    inject: (_key: string, callback: () => unknown): unknown => callback(),
    register: (_options: unknown, _component: unknown): unknown => () => {},
  },
  get: (_name: string): unknown => runs,
  remote: { $stream: vi.fn() },
})

it('claims the image_gen run-card view with the viewer label', () => {
  const ctx = fakeCtx()
  apply(ctx as never)
  // the composition's line: ctx rides through, name + label pinned;
  // no namespace in this ctx → the claim rides bare (no source).
  // (The effect/inject seam the claim rides inside is captured live
  // and pinned in viewer-base's runCard.spec.ts.)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledTimes(1)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledWith(
    ctx,
    'image_gen',
    '@melite/viewer: image_gen run-card claim',
    undefined,
  )
})

it('with the runs namespace mounted, the claim carries the frames source', () => {
  const runs = { subscribe: vi.fn(), status: vi.fn() }
  const ctx = fakeCtx(runs)
  apply(ctx as never)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledWith(
    ctx,
    'image_gen',
    '@melite/viewer: image_gen run-card claim',
    expect.any(Function),
  )
})

// ── viewerRunFrames — the tail laws (fake stream, real builder) ──

interface StreamItem {
  generation: number
  value: Record<string, unknown>
  accept(): void
}

/** A fake RemoteStream supervisor: drives the SAME callbacks the real
 * $stream face drives — `open(signal)` once at construction (the
 * subscribe seat), `ended(accepted)` thrown as the generation end
 * when the queue dries (the carrier classification), items served
 * one per row with `accept()` on each. Reads park only when `hang`
 * is set (the parked tail between rows); dispose resolves a parked
 * read as done AND ends every later read (the real dispose
 * contract). */
const fakeStream = (
  rows: Record<string, unknown>[],
  opts: { failWith?: Error; hang?: boolean } = {},
) => {
  const state = { disposed: false, accepted: 0, reads: 0 }
  const queue = [...rows]
  let release: ((r: IteratorResult<StreamItem>) => void) | undefined
  let failWith = opts.failWith
  const settle = (r: IteratorResult<StreamItem>): void => {
    const done = release
    release = undefined
    done?.(r)
  }
  const next = async (): Promise<IteratorResult<StreamItem>> => {
    state.reads += 1
    const value = queue.shift()
    if (value !== undefined) {
      return { done: false, value: { generation: 0, value, accept: () => { state.accepted += 1 } } }
    }
    if (failWith !== undefined) {
      const error = failWith
      failWith = undefined
      throw error
    }
    if (opts.hang === true && !state.disposed) {
      return new Promise<IteratorResult<StreamItem>>((resolve) => { release = resolve })
    }
    return { done: true, value: undefined }
  }
  const stream = {
    [Symbol.asyncIterator]: () => ({ next }),
    dispose: async (): Promise<void> => {
      state.disposed = true
      failWith = undefined
      settle({ done: true, value: undefined })
    },
  }
  return { stream, state }
}

/** The remote face around a fake stream: $stream stores its options
 * (the tests drive open/ended directly — the same callbacks the real
 * supervisor drives) and returns the fake stream. */
const fakeRemote = (
  rows: Record<string, unknown>[],
  opts: Parameters<typeof fakeStream>[1] = {},
) => {
  const opens: { runId: unknown; signal: unknown }[] = []
  const runs = {
    subscribe: (runId: unknown, signal: unknown): unknown => {
      opens.push({ runId, signal })
      return {}
    },
  }
  const { stream, state } = fakeStream(rows, opts)
  let streamOpts: { open(signal: AbortSignal): unknown; ended(accepted: boolean): Error } | undefined
  const remote = {
    $stream: (o: NonNullable<typeof streamOpts>): unknown => {
      streamOpts = o
      o.open(new AbortController().signal)
      return stream
    },
  }
  return { remote, runs, state, opens, streamOpts: () => streamOpts }
}

const framesOf = async (
  rows: Record<string, unknown>[],
  opts?: Parameters<typeof fakeStream>[1],
): Promise<{ frames: RunGalleryFrame[]; state: ReturnType<typeof fakeStream>['state']; opens: { runId: unknown; signal: unknown }[] }> => {
  const { remote, runs, state, opens } = fakeRemote(rows, opts)
  const frames: RunGalleryFrame[] = []
  const controller = new AbortController()
  for await (const frame of viewerRunFrames(remote as unknown as ClientRemote, runs as never)('r_1', controller.signal)) {
    frames.push(frame)
  }
  return { frames, state, opens }
}

it('serves one frame per row that moved; the opening row is the accepted baseline', async () => {
  const { frames, state } = await framesOf([
    { status: 'running', artifacts: [] },
    { status: 'running', artifacts: [] },
    { status: 'completed', artifacts: ['r_1/a.png', '', 42] },
  ])
  // the re-served running row stays quiet (the row-change gate)
  expect(frames).toEqual([
    { status: 'running', artifacts: [] },
    { status: 'completed', artifacts: ['r_1/a.png'] },
  ])
  expect(state.accepted).toBe(1)
  expect(state.disposed).toBe(true)
})

it('a terminal row ends the source (the last frame stands, the stream disposes)', async () => {
  const { frames, state } = await framesOf([
    { status: 'running', artifacts: [] },
    { status: 'failed', artifacts: [] },
  ])
  expect(frames).toHaveLength(2)
  expect(frames[1]?.status).toBe('failed')
  expect(state.disposed).toBe(true)
})

it('a status-less row is skipped, not forged', async () => {
  const { frames } = await framesOf([
    { artifacts: ['r_1/a.png'] },
    { status: 'completed', artifacts: [] },
  ])
  expect(frames).toEqual([{ status: 'completed', artifacts: [] }])
})

it('a stream that fails ENDS: no throw, no frame, the console carries the error', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { frames } = await framesOf([{ status: 'running', artifacts: [] }], {
    failWith: new Error('gateway gone'),
  })
  expect(frames).toEqual([{ status: 'running', artifacts: [] }])
  expect(errorSpy).toHaveBeenCalled()
  errorSpy.mockRestore()
})

it('aborting the holder\'s signal disposes the stream and ends the parked source', async () => {
  const { remote, runs, state } = fakeRemote([{ status: 'running', artifacts: [] }], { hang: true })
  const controller = new AbortController()
  const first = viewerRunFrames(remote as unknown as ClientRemote, runs as never)('r_1', controller.signal)[Symbol.asyncIterator]()
  // the first frame parks nothing; abort mid-park must end the tail
  const opened = await first.next()
  expect(opened.done).toBe(false)
  controller.abort()
  const settled = await first.next()
  expect(settled.done).toBe(true)
  expect(state.disposed).toBe(true)
})

it('aborting BEFORE the first read never opens a parked tail (dispose at the door)', async () => {
  const { remote, runs, state } = fakeRemote([{ status: 'running', artifacts: [] }], { hang: true })
  const controller = new AbortController()
  controller.abort()
  const source = viewerRunFrames(remote as unknown as ClientRemote, runs as never)
  const settled = await source('r_1', controller.signal)[Symbol.asyncIterator]().next()
  expect(settled.done).toBe(true)
  expect(state.disposed).toBe(true)
})

it('the subscribe seat rides open with the run id and signal (the direct namespace call)', async () => {
  const { frames, opens } = await framesOf([{ status: 'completed', artifacts: [] }])
  expect(frames).toEqual([{ status: 'completed', artifacts: [] }])
  expect(opens).toHaveLength(1)
  expect(opens[0]?.runId).toBe('r_1')
  expect((opens[0]?.signal as AbortSignal).aborted).toBe(false)
})

it('the ended callback classifies carrier ends: after vs before the first frame', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { remote, runs, streamOpts } = fakeRemote([{ status: 'running', artifacts: [] }], { hang: true })
  const controller = new AbortController()
  const iterator = viewerRunFrames(remote as unknown as ClientRemote, runs as never)('r_1', controller.signal)[Symbol.asyncIterator]()
  // one frame through — $stream is live now, its options captured
  const opened = await iterator.next()
  expect(opened.done).toBe(false)
  const opts = streamOpts()
  expect(opts).toBeDefined()
  const after = opts?.ended(true)
  expect(after).toBeInstanceOf(Error)
  expect((after as Error).message).toContain('after its first frame')
  const before = opts?.ended(false)
  expect((before as Error).message).toContain('before its first frame')
  controller.abort()
  expect(await iterator.next()).toEqual({ done: true, value: undefined })
  expect(errorSpy).not.toHaveBeenCalled()
  errorSpy.mockRestore()
})

it('a row with no artifacts face reads an empty wall (nothing forged)', async () => {
  const { frames } = await framesOf([
    { status: 'queued' },
    { status: 'completed' },
  ])
  expect(frames).toEqual([
    { status: 'queued', artifacts: [] },
    { status: 'completed', artifacts: [] },
  ])
})

it('a namespace read that throws logs loud and claims the row bare (no gallery arm)', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const ctx = fakeCtx()
  ctx.get = (_name: string): unknown => {
    throw new Error('store read failed')
  }
  apply(ctx as never)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledWith(
    ctx,
    'image_gen',
    '@melite/viewer: image_gen run-card claim',
    undefined,
  )
  expect(errorSpy).toHaveBeenCalled()
  errorSpy.mockRestore()
})
