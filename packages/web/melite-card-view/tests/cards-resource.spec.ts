// cards-resource.spec.ts — THE PROVIDER STREAM's own laws (2026-09-12,
// live co-presence: "fix the [REDACTED 2026-11-05] gaps"). The bench resource is an
// AsyncIterable: the initial snapshot frame, then a fresh frame ONLY
// when the shared doc's rev moves (an out-of-band write — the agent's
// construct verbs, a bench-mode pass — lands in every OPEN consumer
// with no view-level watchers). The run resource streams its status
// until terminal (pollRunFrames' law, already pinned in the run-wire
// package; here the bench tail gets its own pins).
import { describe, expect, test, vi, afterEach } from 'vitest'
import { benchAddressOf, benchSessionOfAddress, observeRunOutcome, openCardsResource, readBench } from '../src/client/cards-resource.ts'

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
    vi.useFakeTimers()
    stubApi({
      'bench/get': [new Error('typert: no such bench: s_new'), benchDoc(1, ['first card'])],
    })
    const controller = new AbortController()
    const frames: unknown[] = []
    const stream = openCardsResource('dsh-resource://cards/bench/s_new', { signal: controller.signal })
    const done = (async (): Promise<void> => {
      for await (const frame of stream) {
        frames.push(frame)
        if (frames.length === 2) controller.abort()
      }
    })()
    await vi.advanceTimersByTimeAsync(2600)
    await done
    const first = frames[0] as { ok: boolean; value: { rev: number; stages: unknown[] } }
    expect(first.ok).toBe(true) // NOT a failure frame — the honest empty bench
    expect(first.value.rev).toBe(0)
    expect(first.value.stages).toEqual([])
    const second = frames[1] as { value: { rev: number } }
    expect(second.value.rev).toBe(1) // the birth is a fresh frame
  })

  test('other refusions are still failures — only the missing bench is the zero state', async () => {
    stubApi({ 'bench/get': [new Error('gateway exploded')] })
    const frames: unknown[] = []
    for await (const frame of openCardsResource('dsh-resource://cards/bench/s_x', { signal: AbortSignal.timeout(50) })) {
      frames.push(frame)
      break
    }
    expect((frames[0] as { ok: boolean }).ok).toBe(false)
  })

  test('the watcher baselines a missing bench at rev 0 — the FIRST agent card in a new conversation reveals', async () => {
    vi.useFakeTimers()
    stubApi({
      'bench/get': [new Error('typert: no such bench: s_new'), agentDoc(1, ['first agent card'])],
    })
    const landed: string[] = []
    const stop = watchBenchLands(() => 's_new', (key) => { landed.push(key) })
    await vi.advanceTimersByTimeAsync(2200)
    expect(landed).toEqual(['s_new'])
    stop()
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
  const patches: Array<Record<string, unknown>> = []
  const stubRunWire = (doc: Record<string, unknown>): void => {
    vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url)
      const rpcId = (JSON.parse(String(init?.body)) as { rpcId: string }).rpcId
      if (path.includes('/api/runs/status')) {
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: doc } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/api/drafts/patch')) {
        patches.push((JSON.parse(String(init?.body)) as { payload: { args: Record<string, unknown> } }).payload.args)
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: { delivered: true } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/api/drafts/get')) {
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: { draft_id: 'bench-main', stages: [], bench: { rev: 3, log: [] } } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: {} } }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
  }

  test('a failed run patches the row with the stage error (the ComfyUI refusal verbatim)', async () => {
    vi.useFakeTimers()
    stubRunWire(statusDoc(undefined))
    const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
    expect(verdict).toBe('failed')
    const terminal = patches.at(-1)
    expect(terminal?.['patch']).toMatchObject({
      runStatus: 'failed',
      result: {
        run_id: 'run-1',
        error: "clip_name 'qwen_2.5_vl_7b_fp8_scaled.safetensors' not in [14 clips]",
      },
    })
  })

  test('a stage without its own text falls back to the run-level error', async () => {
    vi.useFakeTimers()
    const doc = statusDoc('ComfyError: POST /prompt 400 (run-level)')
    delete (doc.stages as Array<Record<string, unknown>>)[0]!['error']
    stubRunWire(doc)
    const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
    expect(verdict).toBe('failed')
    const terminal = patches.at(-1)
    expect((terminal?.['patch'] as { result: { error?: string } }).result.error).toBe('ComfyError: POST /prompt 400 (run-level)')
  })

  test('a completed run never carries an error (absent ≡ clean)', async () => {
    vi.useFakeTimers()
    stubRunWire({
      run_id: 'run-1', status: 'completed', draft_id: 'bench-main',
      stages: [{ id: 's_0', status: 'done', url: 'out/flat.png', error: '' }],
    })
    const verdict = await observeRunOutcome('bench-main', 's_0', 'run-1')
    expect(verdict).toBe('done')
    const terminal = patches.at(-1)
    expect((terminal?.['patch'] as { result: Record<string, unknown> }).result).not.toHaveProperty('error')
  })
})

describe('observeRunOutcome — the progress carry', () => {
  const patches: Array<Record<string, unknown>> = []
  const stubProgressWire = (docs: Array<Record<string, unknown>>): void => {
    let i = 0
    vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url)
      const rpcId = (JSON.parse(String(init?.body)) as { rpcId: string }).rpcId
      if (path.includes('/api/runs/status')) {
        const doc = docs[Math.min(i, docs.length - 1)]
        i += 1
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: doc } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/api/drafts/patch')) {
        patches.push((JSON.parse(String(init?.body)) as { payload: { args: Record<string, unknown> } }).payload.args)
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: { delivered: true } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/api/drafts/get')) {
        return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: { draft_id: 'bench-main', stages: [], bench: { rev: 3, log: [] } } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ type: 'server-response', rpcId, result: { ok: true, value: {} } }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
  }

  test('a moved percent patches the row; a still percent never re-patches (the CAS churn law)', async () => {
    vi.useFakeTimers()
    stubProgressWire([
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
    const verdict = observeRunOutcome('bench-main', 's_0', 'run-1')
    // the loop's 1500ms sleeps: advance the fake clock until the
    // observer settles (each tick fires one poll)
    for (let i = 0; i < 8; i++) await vi.advanceTimersByTimeAsync(1600)
    expect(await verdict).toBe('done')
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

describe('the bench spotlight (the one-flow reveal)', () => {
  test('an agent-authored land fires the reveal — hydration history never does', async () => {
    vi.useFakeTimers()
    // the wire: hydration (rev 12 — its log may carry OLD agent rows;
    // history never yanks), then the agent's write (rev 13)
    stubApi({
      'bench/get': [agentDoc(12, ['hero frame']), agentDoc(13, ['hero frame', 'agent row'])],
    })
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) })
    await vi.advanceTimersByTimeAsync(100)
    expect(lands.length).toBe(0) // hydration: the first read is baseline
    await vi.advanceTimersByTimeAsync(2100)
    expect(lands.length).toBe(1) // the agent's row: the surface comes forward
    stop()
    await vi.advanceTimersByTimeAsync(2100)
    expect(lands.length).toBe(1) // stopped: never fires again
  })

  test('a user-authored bump NEVER reveals — the human was the author', async () => {
    vi.useFakeTimers()
    stubApi({
      'bench/get': [userDoc(12, ['hero frame']), userDoc(13, ['hero frame', 'user edit'])],
    })
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) })
    await vi.advanceTimersByTimeAsync(4200)
    expect(lands.length).toBe(0)
    stop()
  })

  test('a dead wire keeps trying — the agent land after recovery still fires', async () => {
    vi.useFakeTimers()
    stubApi({
      'bench/get': [userDoc(12, ['hero frame']), new Error('lane restarted'), agentDoc(14, ['agent row'])],
    })
    const lands: number[] = []
    const stop = watchBenchLands(() => 'main', () => { lands.push(1) })
    await vi.advanceTimersByTimeAsync(6300)
    expect(lands.length).toBe(1) // poll 1 baseline, poll 2 dead, poll 3 landed
    stop()
  })

  test('stroke 44 — switching sessions re-baselines: the new conversation\'s history never reveals, its fresh agent lands fire with the key', async () => {
    vi.useFakeTimers()
    let current = 's_old'
    // s_old's bench: rev 12 hydration with OLD agent rows (history);
    // s_new's bench: rev 40 hydration (fresh conversation baseline),
    // then rev 41 — the new conversation's agent composing.
    stubApi({
      'bench/get': [
        agentDoc(12, ['old conversation row']),
        agentDoc(40, []),
        agentDoc(41, ['new conversation row']),
      ],
    })
    const landed: string[] = []
    const stop = watchBenchLands(() => current, (key) => { landed.push(key) })
    await vi.advanceTimersByTimeAsync(100)
    expect(landed.length).toBe(0) // s_old hydration — baseline
    current = 's_new' // the operator starts a new conversation
    await vi.advanceTimersByTimeAsync(2100)
    expect(landed.length).toBe(0) // s_new FIRST sight: hydration, never a reveal
    await vi.advanceTimersByTimeAsync(2100)
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
