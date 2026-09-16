// cards-resource.spec.ts — THE PROVIDER STREAM's own laws (2026-09-12,
// live co-presence: "fix the [REDACTED 2026-11-05] gaps"). The bench resource is an
// AsyncIterable: the initial snapshot frame, then a fresh frame ONLY
// when the shared doc's rev moves (an out-of-band write — the agent's
// construct verbs, a bench-mode pass — lands in every OPEN consumer
// with no view-level watchers). The run resource streams its status
// until terminal (pollRunFrames' law, already pinned in the run-wire
// package; here the bench tail gets its own pins).
import { describe, expect, test, vi, afterEach } from 'vitest'
import { unbindEstateRemote } from '@melite/card-base/estate-remote'
import { mountEstateFakes } from './estate-harness.ts'
import { benchAddressOf, benchSessionOfAddress, observeRunOutcome, openCardsResource, readBench } from '../src/client/cards-resource.ts'
// The gateway's client face resolves to the tests/fixtures stand-in
// (the real artifact is module-loader format — see the fixture's
// header); RemoteStreamCarrierError here is the classification token
// the fake supervisor below matches against, exactly like the
// gateway's RemoteStream matches its own class.
import { RemoteStreamCarrierError } from '@deepseek-ai/dsh-api-gateway/client'
import type { ClientRemote, RemoteStreamItem } from '@deepseek-ai/dsh-api-gateway/client'

/** A bench/get doc served through the mounted namespaces (the
 *  unmounted face's one HTTP snapshot rides the live lane now —
 *  mountEstateFakes, never a fetch stub). */
function stubBenchGet(doc: Record<string, unknown>): ReturnType<typeof mountEstateFakes> {
  return mountEstateFakes({ benchDoc: doc })
}

function stubBenchThrow(error: Error): ReturnType<typeof mountEstateFakes> {
  return mountEstateFakes({ throws: [{ method: 'bench/get', message: error.message }] })
}

const benchDoc = (rev: number, titles: string[]): Record<string, unknown> => ({
  draft_id: 'bench-main', rev,
  stages: titles.map((t, i) => ({ id: `s_${i}`, card: 'image-gen', title: t, engine: 'comfyui', params: {} })),
  log: [],
})

/** The zero state the generated subscribe generator serves for a
 *  not-yet-born bench (the birth watch — pinned in the drafts package
 *  where the generator lives; modeled here for the consumer laws). */
const zeroDoc = (key: string): Record<string, unknown> => ({
  draft_id: `bench-${key}`, rev: 0, intent: '', stages: [], log: [],
})

// ── THE FAKE REMOTE (the mux swap's test face, 2026-09-15) ────────
// A minimal supervisor with the SAME classification laws as the
// gateway's RemoteStream (read from dsh-api-gateway's stream-client):
// an open()/iteration rejection that is NOT a carrier error is
// TERMINAL (the iterator throws it); an iterable end calls
// ended(accepted) and a returned carrier error fires carrierFailed
// then retries. Items are RemoteStreamItem-shaped so the consumer's
// accept() contract is exercised for real.
//
// THE CHANNEL MODEL: bench/subscribe is a LIVE channel per session
// key — writes arrive out-of-band (`push`), a mux drop ends every
// open channel (`drop`), and the next open can be poisoned
// (`failOpen` — the supervisor's terminal arm). Nothing advances on
// its own, so every test phase is explicit.

/** One live bench/subscribe generation. */
interface Channel {
  key: string
  open: boolean
  queue: Array<Record<string, unknown>>
  wake: (() => void) | undefined
}

/** The fake remote plus its out-of-band write controls. */
interface FakeBench {
  remote: ClientRemote
  /** One estate write landing on the bench (delivered to the open
   *  channel, or stashed for the next open). */
  push: (key: string, doc: Record<string, unknown>) => void
  /** The mux dropped: every open channel ends (carrier, retry). */
  drop: () => void
  /** The next open for this key rejects (terminal). */
  failOpen: (key: string, error: Error) => void
  /** Whether a live channel is open for the key. */
  isOpen: (key: string) => boolean
}

function fakeRemote(): FakeBench {
  const channels: Channel[] = []
  const pending = new Map<string, Array<Record<string, unknown>>>()
  const rejections = new Map<string, Error>()
  const isOpen = (key: string): boolean => channels.some((c) => c.key === key && c.open)
  const openChannel = (key: string): AsyncIterable<Record<string, unknown>> => {
    const reject = rejections.get(key)
    if (reject !== undefined) {
      rejections.delete(key)
      return {
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.reject(reject),
        }),
      }
    }
    const channel: Channel = { key, open: true, queue: [...(pending.get(key) ?? [])], wake: undefined }
    pending.delete(key)
    channels.push(channel)
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<Record<string, unknown>>> =>
          new Promise((resolve) => {
            const step = (): void => {
              channel.wake = undefined
              if (!channel.open) return resolve({ done: true, value: undefined as never })
              const head = channel.queue.shift()
              if (head === undefined) {
                channel.wake = step
                return
              }
              resolve({ done: false, value: head })
            }
            step()
          }),
      }),
    }
  }
  const $stream = <T,>(options: {
    name: string
    open: (signal: AbortSignal) => AsyncIterable<T> | Promise<AsyncIterable<T>>
    ended: (accepted: boolean) => Error
    carrierFailed?: (error: RemoteStreamCarrierError) => void
  }): { [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<T>>; dispose(): Promise<void> } => {
    const lifetime = new AbortController()
    const queue: Array<RemoteStreamItem<T>> = []
    const parked: Array<{
      resolve: (result: IteratorResult<RemoteStreamItem<T>>) => void
      reject: (error: Error) => void
    }> = []
    let failed: Error | undefined
    let channel: Channel | undefined
    const closeChannel = (): void => {
      if (channel !== undefined && channel.open) {
        channel.open = false
        channel.wake?.()
      }
    }
    const deliver = (): void => {
      while (parked.length > 0 && queue.length > 0) {
        const head = queue.shift()!
        parked.shift()!.resolve({ done: false, value: head })
      }
    }
    lifetime.signal.addEventListener('abort', () => {
      closeChannel()
      for (const waiter of parked.splice(0)) waiter.resolve({ done: true, value: undefined as never })
    })
    const run = async (): Promise<void> => {
      while (!lifetime.signal.aborted && failed === undefined) {
        try {
          const iterable = await options.open(lifetime.signal)
          channel = channels.at(-1)
          let accepted = false
          for await (const value of iterable) {
            if (lifetime.signal.aborted || failed !== undefined) return
            queue.push({ generation: 0, value, signal: lifetime.signal, accept: () => { accepted = true } })
            deliver()
          }
          if (lifetime.signal.aborted) return
          throw options.ended(accepted)
        } catch (error) {
          if (lifetime.signal.aborted || failed !== undefined) return
          if (error instanceof RemoteStreamCarrierError) {
            options.carrierFailed?.(error)
            await Promise.resolve() // the supervisor's retry beat, microtask-scaled
            continue
          }
          // TERMINAL (the RemoteStream law): the iterator throws it
          failed = error instanceof Error ? error : new Error(String(error))
          for (const waiter of parked.splice(0)) waiter.reject(failed)
          return
        }
      }
    }
    void run()
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<RemoteStreamItem<T>>> =>
          new Promise((resolve, reject) => {
            // abort may have fired while the consumer sat at a yield —
            // resolve done immediately instead of parking forever
            if (lifetime.signal.aborted) return resolve({ done: true, value: undefined as never })
            const head = queue.shift()
            if (head !== undefined) return resolve({ done: false, value: head })
            if (failed !== undefined) return reject(failed)
            parked.push({ resolve, reject })
          }),
      }),
      dispose: async (): Promise<void> => { lifetime.abort() },
    }
  }
  const bench = {
    subscribe: (key: string, _signal?: AbortSignal): AsyncIterable<Record<string, unknown>> =>
      openChannel(key),
  }
  const push = (key: string, doc: Record<string, unknown>): void => {
    const live = channels.filter((c) => c.key === key && c.open).at(-1)
    if (live === undefined) {
      pending.set(key, [...(pending.get(key) ?? []), doc])
      return
    }
    live.queue.push(doc)
    live.wake?.()
  }
  return {
    remote: { bench, $stream } as unknown as ClientRemote,
    push,
    drop: () => { for (const c of channels) { c.open = false; c.wake?.() } },
    failOpen: (key, error) => { rejections.set(key, error) },
    isOpen,
  }
}

/** Flush the microtask chain (channel delivery rides microtasks). */
const tick = async (n = 2): Promise<void> => {
  for (let i = 0; i < n; i++) await new Promise((resolve) => { setTimeout(resolve, 0) })
}

/** Await an explicit test phase (nothing advances without a push). */
const until = async (probe: () => boolean, turns = 200): Promise<void> => {
  for (let i = 0; i < turns && !probe(); i++) await new Promise((resolve) => { setTimeout(resolve, 0) })
  expect(probe()).toBe(true)
}

afterEach(() => {
  unbindEstateRemote()
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

describe('the bench address law (stroke 44 — the key rides the address tail, the file protocol pattern)', () => {
  test('benchAddressOf ∘ benchSessionOfAddress round-trips every legal session key', () => {
    for (const key of ['main', 's_chat7', 'a-b_c9', 'x']) {
      expect(benchSessionOfAddress(benchAddressOf(key))).toBe(key)
    }
  })

  test('the legacy bare address and foreign addresses resolve to main — old records keep serving', () => {
    expect(benchSessionOfAddress('dsh-resource://cards/bench')).toBe('main')
    expect(benchSessionOfAddress('dsh-resource://cards/bench/')).toBe('main')
    expect(benchSessionOfAddress('dsh-resource://cards/run/r1')).toBe('main')
    expect(benchSessionOfAddress('sidebar://guide')).toBe('main')
  })

  test('a tail the estate would refuse sanitizes to main, never a 400', () => {
    expect(benchSessionOfAddress('dsh-resource://cards/bench/not a key')).toBe('main')
    expect(benchAddressOf('also junk!!')).toBe('dsh-resource://cards/bench/main')
  })

  test('two conversations get two addresses — one record each, never a shared stream', () => {
    expect(benchAddressOf('s_a')).not.toBe(benchAddressOf('s_b'))
  })
})

describe('stroke 44 — a fresh conversation\'s bench (missing = empty, never failure)', () => {
  test('the stream opens with the empty bench and the birth lands as a fresh frame', async () => {
    // the channel: the zero doc (the birth watch), then the estate's
    // first write — push, no cadence
    const bench = fakeRemote()
    bench.push('s_new', zeroDoc('s_new'))
    bench.push('s_new', benchDoc(1, ['first card']))
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench/s_new', { signal: controller.signal }, bench.remote, bench.remote.bench)) {
        frames.push(frame)
        if (frames.length === 2) controller.abort()
      }
    })()
    await done
    const first = frames[0] as { ok: boolean; value: { rev: number; stages: unknown[] } }
    expect(first.ok).toBe(true) // NOT a failure frame — the honest empty bench
    expect(first.value.rev).toBe(0)
    expect(first.value.stages).toEqual([])
    const second = frames[1] as { value: { rev: number } }
    expect(second.value.rev).toBe(1) // the birth is a fresh frame
  })

  test('the unmounted face degrades honestly: ONE HTTP snapshot, ONE failure frame, no poll', async () => {
    const fakes = stubBenchGet(benchDoc(7, ['hero frame']))
    try {
      const frames: unknown[] = []
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: AbortSignal.timeout(50) })) {
        frames.push(frame)
      }
      expect(frames.length).toBe(2) // then the tail ENDS — a broken mount never fakes a watch
      expect((frames[0] as { ok: boolean; value: { rev: number } }).ok).toBe(true)
      expect((frames[0] as { value: { rev: number } }).value.rev).toBe(7)
      const second = frames[1] as { ok: boolean; error: { message: string } }
      expect(second.ok).toBe(false)
      expect(second.error.message).toContain('bench stream unavailable')
    } finally {
      fakes.unmount()
    }
  })

  test('other refusions are still failures — only the missing bench is the zero state', async () => {
    const fakes = stubBenchThrow(new Error('gateway exploded'))
    try {
      const frames: unknown[] = []
      for await (const frame of openCardsResource('dsh-resource://cards/bench/s_x', { signal: AbortSignal.timeout(50) })) {
        frames.push(frame)
        break
      }
      expect((frames[0] as { ok: boolean }).ok).toBe(false)
    } finally {
      fakes.unmount()
    }
  })

  test('the watcher baselines a missing bench at rev 0 — the FIRST agent card in a new conversation reveals', async () => {
    const bench = fakeRemote()
    const landed: string[] = []
    const stop = watchBenchLands(() => 's_new', (key) => { landed.push(key) }, undefined, bench.remote, bench.remote.bench)
    await until(() => bench.isOpen('s_new'))
    bench.push('s_new', zeroDoc('s_new'))
    bench.push('s_new', agentDoc(1, ['first agent card']))
    await until(() => landed.length === 1)
    expect(landed).toEqual(['s_new'])
    stop()
  })
})

describe('the bench resource stream (live co-presence, the mux tail)', () => {
  test('a foreign rev bump yields a fresh frame to every open consumer', async () => {
    // the channel: the snapshot (rev 7, one row), then the AGENT's
    // write (rev 8, the agent row) — the tab never touched the wire
    const bench = fakeRemote()
    bench.push('main', benchDoc(7, ['hero frame']))
    bench.push('main', benchDoc(8, ['hero frame', 'agent row']))
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: controller.signal }, bench.remote, bench.remote.bench)) {
        frames.push(frame)
        if (frames.length === 2) controller.abort()
      }
    })()
    await done
    // frame 1: the mounted snapshot. frame 2: the agent's row landed —
    // NO user gesture, NO view watcher: the provider's own tail.
    expect(frames.length).toBe(2)
    const second = frames[1] as { ok: boolean; value: { rev: number; stages: Array<{ title: string }> } }
    expect(second.ok).toBe(true)
    expect(second.value.rev).toBe(8)
    expect(second.value.stages.map((s) => s.title)).toEqual(['hero frame', 'agent row'])
  })

  test('no rev drift, no frame: the tail is quiet on a still bench (a reconnect re-serves the same doc)', async () => {
    // rev 7 arrives TWICE on the SAME live channel (the estate
    // re-served the doc; no drift); same rev, no frame — the loss
    // voice below proves the channel was still alive to serve it
    const bench = fakeRemote()
    bench.push('main', benchDoc(7, ['hero frame']))
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: controller.signal }, bench.remote, bench.remote.bench)) {
        frames.push(frame)
      }
    })()
    await until(() => frames.length === 1)
    bench.push('main', benchDoc(7, ['hero frame'])) // same doc again
    await tick(3)
    expect(frames.length).toBe(1) // still exactly the first frame
    bench.drop() // liveness proof: the same channel CAN voice a change
    await until(() => frames.length === 2)
    const loss = frames[1] as { ok: boolean }
    expect(loss.ok).toBe(false) // the drop voiced — so the quiet above was real quiet
    controller.abort()
    await done
  })

  test('a carrier drop mid-tail voices ONE loss frame, then the reconnect serves the fresh doc', async () => {
    // the channel serves rev 7, then the mux drops mid-watch; the
    // supervisor reconnects and the agent's rev-9 write lands — the
    // visibility law: the loss is a frame, never a freeze
    const bench = fakeRemote()
    bench.push('main', benchDoc(7, ['hero frame']))
    const controller = new AbortController()
    const frames: unknown[] = []
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: controller.signal }, bench.remote, bench.remote.bench)) {
        frames.push(frame)
        if (frames.length === 3) controller.abort()
      }
    })()
    await until(() => frames.length === 1)
    bench.drop()
    await until(() => frames.length === 2) // the loss voice lands at the drop
    await until(() => bench.isOpen('main')) // the reconnect
    bench.push('main', benchDoc(9, ['agent row']))
    await done
    expect(frames.length).toBe(3)
    const loss = frames[1] as { ok: boolean; error: { message: string } }
    expect(loss.ok).toBe(false)
    expect(loss.error.message).toContain('bench live stream lost')
    const third = frames[2] as { ok: boolean; value: { rev: number } }
    expect(third.ok).toBe(true)
    expect(third.value.rev).toBe(9)
  })

  test('a terminal stream failure is ONE final failure frame, then the tail ends', async () => {
    // open() rejected with a non-carrier error — the supervisor gave
    // up; the tail voices it once and ends (the holder can reopen)
    const bench = fakeRemote()
    bench.failOpen('main', new Error('the supervisor gave up'))
    const frames: unknown[] = []
    for await (const frame of openCardsResource('dsh-resource://cards/bench', { signal: AbortSignal.timeout(500) }, bench.remote, bench.remote.bench)) {
      frames.push(frame)
    }
    expect(frames.length).toBe(1)
    const first = frames[0] as { ok: boolean; error: { message: string } }
    expect(first.ok).toBe(false)
    expect(first.error.message).toContain('bench stream failed')
    expect(first.error.message).toContain('the supervisor gave up')
  })
})

// ── THE FAILURE CARRY (2026-09-13, the silent-failure cure) ────────
// A failed run's reason must ride the bench row verbatim — the
// stage's error first, the run-level text as the fallback. Without
// the carry, "run image edit, no response at all": the tile flips
// back with no artifact and no word, and the operator cannot tell
// a missing weight from a dead wire.
describe('observeRunOutcome — the failure carry', () => {
  const statusDoc = (error: string | undefined): Record<string, unknown> => ({
    run_id: 'run-1', status: 'failed', draft_id: 'bench-main',
    ...(error !== undefined ? { error } : {}),
    stages: [{ id: 's_0', status: 'error', url: '', error: "clip_name 'qwen_2.5_vl_7b_fp8_scaled.safetensors' not in [14 clips]" }],
  })
  const patchesOf = (fakes: ReturnType<typeof mountEstateFakes>): Array<Record<string, unknown>> =>
    fakes.calls.filter((c) => c.method === 'drafts/patch').map((c) => c.args)
  // THE ONE-LANE LAW (stroke 81): the status doc rides runDocs (the
  // single doc lingers — the start read and the poll both see the
  // terminal); outcome writes land in fakes.calls as drafts/patch.
  const stubRunWire = (doc: Record<string, unknown>): ReturnType<typeof mountEstateFakes> =>
    mountEstateFakes({ runDocs: [doc] })

  test('a failed run patches the row with the stage error (the ComfyUI refusal verbatim)', async () => {
    vi.useFakeTimers()
    const fakes = stubRunWire(statusDoc(undefined))
    try {
      const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
      expect(verdict).toBe('failed')
      const terminal = patchesOf(fakes).at(-1)
      expect(terminal?.['patch']).toMatchObject({
        runStatus: 'failed',
        result: {
          run_id: 'run-1',
          error: "clip_name 'qwen_2.5_vl_7b_fp8_scaled.safetensors' not in [14 clips]",
        },
      })
    } finally {
      fakes.unmount()
    }
  })

  test('a stage without its own text falls back to the run-level error', async () => {
    vi.useFakeTimers()
    const doc = statusDoc('ComfyError: POST /prompt 400 (run-level)')
    delete (doc.stages as Array<Record<string, unknown>>)[0]!['error']
    const fakes = stubRunWire(doc)
    try {
      const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
      expect(verdict).toBe('failed')
      const terminal = patchesOf(fakes).at(-1)
      expect((terminal?.['patch'] as { result: { error?: string } }).result.error).toBe('ComfyError: POST /prompt 400 (run-level)')
    } finally {
      fakes.unmount()
    }
  })

  test('a completed run never carries an error (absent ≡ clean)', async () => {
    vi.useFakeTimers()
    const fakes = stubRunWire({
      run_id: 'run-1', status: 'completed', draft_id: 'bench-main',
      stages: [{ id: 's_0', status: 'done', url: 'out/flat.png', error: '' }],
    })
    try {
      const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
      expect(verdict).toBe('done')
      const terminal = patchesOf(fakes).at(-1)
      expect((terminal?.['patch'] as { result: Record<string, unknown> }).result).not.toHaveProperty('error')
    } finally {
      fakes.unmount()
    }
  })
})

describe('observeRunOutcome — the progress carry', () => {
  const patchesOf = (fakes: ReturnType<typeof mountEstateFakes>): Array<Record<string, unknown>> =>
    fakes.calls.filter((c) => c.method === 'drafts/patch').map((c) => c.args)
  // THE ONE-LANE LAW (stroke 81): the poll script rides runDocs
  // (served in order, the last lingering).
  const stubProgressWire = (docs: Array<Record<string, unknown>>): ReturnType<typeof mountEstateFakes> =>
    mountEstateFakes({ runDocs: docs })

  test('a moved percent patches the row; a still percent never re-patches (the CAS churn law)', async () => {
    vi.useFakeTimers()
    const fakes = stubProgressWire([
      // first poll: 7/20 = 35%
      { run_id: 'run-1', status: 'running', draft_id: 'bench-main',
        stages: [{ id: 's_0', status: 'running', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' }] },
      // second poll: SAME percent (8/20 still floors to 40? no — 8/20=40) —
      // use the same floor: value 7 again (a node flip moved nothing)
      { run_id: 'run-1', status: 'running', draft_id: 'bench-main',
        stages: [{ id: 's_0', status: 'running', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' }] },
      // third poll: 10/20 = 50%
      { run_id: 'run-1', status: 'running', draft_id: 'bench-main',
        stages: [{ id: 's_0', status: 'running', progress: { value: 10, max: 20 }, activity: 'sampling 10/20' }] },
      // terminal
      { run_id: 'run-1', status: 'completed', draft_id: 'bench-main',
        stages: [{ id: 's_0', status: 'done', url: 'out/flat.png' }] },
    ])
    try {
      const verdict = observeRunOutcome('bench-main', 's_0', 'run-1')
      // the loop's 1500ms sleeps: advance the fake clock until the
      // observer settles (each tick fires one poll)
      for (let i = 0; i < 8; i++) await vi.advanceTimersByTimeAsync(1600)
      expect(await verdict).toBe('done')
      const patches = patchesOf(fakes)
      const live = patches.find((p) => (p['patch'] as { runStatus?: string }).runStatus === 'running'
        && (p['patch'] as { result?: { progress?: unknown } }).result?.progress !== undefined)
      expect(live?.['patch']).toMatchObject({
        runStatus: 'running',
        result: {
          run_id: 'run-1',
          progress: { value: 7, max: 20 },
          activity: 'sampling 7/20',
        },
      })
      // the CHURN LAW: the 35% fold patched ONCE — the still-percent
      // poll never re-patched (the next live carry is the 50% one)
      const livePatches = patches.filter((p) => {
        const r = (p['patch'] as { result?: { progress?: { value?: unknown } } }).result
        return r?.progress !== undefined
      })
      expect(livePatches.length).toBe(2)
      const last = livePatches.at(-1)
      expect((last?.['patch'] as { result: { progress: { value: number } } }).result.progress.value).toBe(10)
      // the terminal patch REPLACES the fold — no stale percent
      const terminal = patches.at(-1)
      expect((terminal?.['patch'] as { result: Record<string, unknown> }).result).not.toHaveProperty('progress')
    } finally {
      fakes.unmount()
    }
  })
})

// ── THE BENCH SPOTLIGHT (stroke 42, the one-flow law: "AI
// conversation and human share 1 FLOW") — the watcher that brings the
// Cards surface forward when the OTHER author of the shared bench
// writes. The discriminator is the served log's author field
// ("agent"|"user"), never guesswork about who moved the rev.
import { markCardsSurface, shouldSpotlight, watchBenchLands } from '../src/client/cards-resource.ts'

const agentDoc = (rev: number, titles: string[]): Record<string, unknown> => ({
  draft_id: 'bench-main', rev,
  stages: titles.map((t, i) => ({ id: `s_${i}`, card: 'image-gen', title: t, engine: 'comfyui', params: {} })),
  log: [{ rev, at: 1, author: 'agent', kind: 'add_stage' }],
})
const userDoc = (rev: number, titles: string[]): Record<string, unknown> => ({
  draft_id: 'bench-main', rev,
  stages: titles.map((t, i) => ({ id: `s_${i}`, card: 'image-gen', title: t, engine: 'comfyui', params: {} })),
  log: [{ rev, at: 1, author: 'user', kind: 'patch' }],
})

describe('the bench spotlight (the one-flow reveal, stream edition)', () => {
  test('an agent-authored land fires the reveal — hydration history never does', async () => {
    // the channel: hydration (rev 12 — its log may carry OLD agent
    // rows; history never yanks), then the agent's write (rev 13)
    const bench = fakeRemote()
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) }, undefined, bench.remote, bench.remote.bench)
    await until(() => bench.isOpen('main'))
    bench.push('main', agentDoc(12, ['hero frame']))
    await tick()
    expect(lands.length).toBe(0) // hydration: the first doc is baseline
    bench.push('main', agentDoc(13, ['hero frame', 'agent row']))
    await until(() => lands.length === 1)
    stop()
    await tick(2)
    expect(lands.length).toBe(1) // stopped: never fires again
  })

  test('a user-authored bump NEVER reveals — the human was the author', async () => {
    const bench = fakeRemote()
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) }, undefined, bench.remote, bench.remote.bench)
    await until(() => bench.isOpen('main'))
    bench.push('main', userDoc(12, ['hero frame']))
    bench.push('main', userDoc(13, ['hero frame', 'user edit']))
    await tick(2)
    expect(lands.length).toBe(0)
    stop()
  })

  test('a dead wire keeps watching — the agent land after the reconnect still fires', async () => {
    // the baseline generation ends with the mux drop; the supervisor
    // reconnects — the agent's rev-14 write on the NEW generation fires
    const bench = fakeRemote()
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) }, undefined, bench.remote, bench.remote.bench)
    await until(() => bench.isOpen('main'))
    bench.push('main', userDoc(12, ['hero frame']))
    await tick()
    bench.drop() // the wire dies
    await until(() => bench.isOpen('main')) // and recovers
    bench.push('main', agentDoc(14, ['agent row']))
    await until(() => lands.length === 1)
    stop()
  })

  test('stroke 44 — switching sessions re-baselines: the new conversation\'s history never reveals, its fresh agent lands fire with the key', async () => {
    let current = 's_old'
    // s_old's bench: rev 12 hydration with OLD agent rows (history);
    // s_new's bench: rev 40 hydration (fresh conversation baseline),
    // then rev 41 — the new conversation's agent composing.
    const bench = fakeRemote()
    let sessionChanged: (() => void) | undefined
    const landed: string[] = []
    const stop = watchBenchLands(
      () => current,
      (key) => { landed.push(key) },
      undefined,
      bench.remote,
      bench.remote.bench,
      (fn: () => void) => { sessionChanged = fn; return () => {} },
    )
    await until(() => bench.isOpen('s_old'))
    bench.push('s_old', agentDoc(12, ['old conversation row']))
    await tick()
    expect(landed.length).toBe(0) // s_old hydration — baseline
    current = 's_new' // the operator starts a new conversation
    sessionChanged!() // the session observable pushes the switch
    await until(() => bench.isOpen('s_new'))
    bench.push('s_new', agentDoc(40, []))
    await tick()
    expect(landed.length).toBe(0) // s_new FIRST sight: hydration, never a reveal
    bench.push('s_new', agentDoc(41, ['new conversation row']))
    await until(() => landed.length === 1)
    expect(landed).toEqual(['s_new']) // the new conversation's agent: fires with ITS key
    stop()
  })

  test('the seat law: reveal only when the cards surface is not the visible seat', () => {
    markCardsSurface(false)
    expect(shouldSpotlight(true)).toBe(true) // another tab owns the pane
    expect(shouldSpotlight(false)).toBe(true) // column collapsed to rail
    markCardsSurface(true)
    expect(shouldSpotlight(true)).toBe(false) // the user is reading the flow
    expect(shouldSpotlight(false)).toBe(true) // mounted but collapsed: rail shows no flow
    markCardsSurface(false) // leave the module state clean for the next test
  })
})
