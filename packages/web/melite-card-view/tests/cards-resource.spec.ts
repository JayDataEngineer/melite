// cards-resource.spec.ts — THE PROVIDER STREAM's own laws (2026-09-12,
// live co-presence: "fix the [REDACTED 2026-11-05] gaps"). The bench resource is an
// AsyncIterable: the initial snapshot frame, then a fresh frame ONLY
// when the shared doc's rev moves (an out-of-band write — the agent's
// construct verbs, a bench-mode pass — lands in every OPEN consumer
// with no view-level watchers). The run resource streams its status
// until terminal (pollRunFrames' law, already pinned in the run-wire
// package; here the bench tail gets its own pins).
import { describe, expect, test, vi, afterEach } from 'vitest'
import { openCardsResource, readBench } from '../src/client/cards-resource.ts'

/** A /api wire frame answer for one method. */
function stubApi(methods: Record<string, Array<Record<string, unknown> | Error>>): void {
  const impl = async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    for (const [method, queue] of Object.entries(methods)) {
      if (!path.includes('/api/' + method)) continue
      const next = queue.length > 1 ? queue.shift() : queue[0]!
      if (next instanceof Error) throw next
      // the wire's frame law: the answer echoes the request's rpcId
      const rpcId = (JSON.parse(String(init?.body)) as { rpcId: string }).rpcId
      return new Response(JSON.stringify({
        type: 'server-response', rpcId, result: { ok: true, value: next },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      type: 'server-response', rpcId: 'r', result: { ok: true, value: {} },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  vi.stubGlobal('fetch', impl)
}

const benchDoc = (rev: number, titles: string[]): Record<string, unknown> => ({
  draft_id: 'bench-main', rev,
  stages: titles.map((t, i) => ({ id: `s_${i}`, card: 'image-gen', title: t, engine: 'comfyui', params: {} })),
  log: [],
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('readBench — the card-birth re-attach (the hour-6 form regression)', () => {
  test('a single-stage cardless bench with intent stamps the card on the row (the zoom consult keys on it)', () => {
    const value = readBench({
      draft_id: 'bench-default', rev: 5, intent: 'h3-timeline',
      stages: [{ id: 's_0', engine: 'comfyui', params: {} }],
    })
    expect(value.stages[0]!.card).toBe('h3-timeline')
  })

  test('a multi-stage bench never takes the arm (user benches carry card per row)', () => {
    const value = readBench({
      draft_id: 'bench-main', rev: 194, intent: 'anime girl beach image generation',
      stages: [
        { id: 's_1', card: 'img-to-mesh', engine: 'comfyui', params: {} },
        { id: 's_2', card: 'image-gen', engine: 'comfyui', params: {} },
      ],
    })
    expect(value.stages.map((s) => s.card)).toEqual(['img-to-mesh', 'image-gen'])
  })

  test('a stage that already carries its card passes verbatim', () => {
    const value = readBench({
      draft_id: 'bench-seed', rev: 1, intent: 'ignored-when-card-present',
      stages: [{ id: 's_0', card: 'h3-timeline', engine: 'comfyui', params: {} }],
    })
    expect(value.stages[0]!.card).toBe('h3-timeline')
  })
})

describe('the bench resource stream (live co-presence)', () => {
  test('a foreign rev bump yields a fresh frame to every open consumer', async () => {
    vi.useFakeTimers()
    // the wire: the snapshot (rev 7, one row), then the AGENT's write
    // (rev 8, the agent row) — the tab never touched the wire between
    stubApi({
      'bench/get': [benchDoc(7, ['hero frame']), benchDoc(8, ['hero frame', 'agent row'])],
    })
    const controller = new AbortController()
    const frames: unknown[] = []
    const stream = openCardsResource('dsh-resource://cards/bench', { signal: controller.signal })
    const done = (async (): Promise<void> => {
      for await (const frame of stream) {
        frames.push(frame)
        if (frames.length === 2) controller.abort()
      }
    })()
    await vi.advanceTimersByTimeAsync(2600)
    await done
    // frame 1: the mounted snapshot. frame 2: the agent's row landed —
    // NO user gesture, NO view watcher: the provider's own tail.
    expect(frames.length).toBe(2)
    const second = frames[1] as { ok: boolean; value: { rev: number; stages: Array<{ title: string }> } }
    expect(second.ok).toBe(true)
    expect(second.value.rev).toBe(8)
    expect(second.value.stages.map((s) => s.title)).toEqual(['hero frame', 'agent row'])
  })

  test('no rev drift, no frame: the tail is quiet on a still bench', async () => {
    vi.useFakeTimers()
    stubApi({ 'bench/get': [benchDoc(7, ['hero frame'])] })
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: controller.signal })) {
        frames.push(frame)
      }
    })()
    await vi.advanceTimersByTimeAsync(8000)
    controller.abort()
    await done
    expect(frames.length).toBe(1)
  })

  test('a transport error mid-tail is not a failure frame — the last ok value stays', async () => {
    vi.useFakeTimers()
    stubApi({
      'bench/get': [benchDoc(7, ['hero frame']), new Error('transport hiccup'), benchDoc(9, ['agent row'])],
    })
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: controller.signal })) {
        frames.push(frame)
        if (frames.length === 2) controller.abort()
      }
    })()
    await vi.advanceTimersByTimeAsync(5200)
    await done
    expect(frames.length).toBe(2)
    const second = frames[1] as { ok: boolean; value: { rev: number } }
    expect(second.ok).toBe(true)
    expect(second.value.rev).toBe(9)
  })
})
