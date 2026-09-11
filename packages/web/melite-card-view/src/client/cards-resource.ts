/**
 * The `cards` resource protocol — the cards tab's live values.
 *
 * Addresses (the bench rework's client plane, docs/plans/
 * bench-rework-2026-09-10.md §5):
 *
 *   dsh-resource://cards/bench        THE working flow (the shared bench)
 *   dsh-resource://cards/run/<runId>  one run, live
 *
 * The provider wraps the estate's Typert remotes over the wire frame
 * (same-origin POST /api/<ns>/<method> carrying the client-request
 * frame — api-gateway.md, the sanctioned caller for plugins outside
 * the DSH web kernel): the bench hydrates from `bench/get`
 * (session 'main') — a snapshot today, no revision channel exists on
 * the wire, so the stream ends after the first frame and consumers
 * reload after their own edits; the run hydrates from `runs/status`
 * then POLLS it for live stage/terminal movement until the run
 * settles or the last holder releases. (The gateway-era events WS
 * died with the gateway app; the collapse plan's stream remote —
 * @Remote({mode:'stream'}) over the mux — replaces polling when the
 * plane exists. Until then the poll is the honest degrade: no
 * invented sockets, no phantom channels.)
 *
 * Frame law (dsh-client-resources contract): the first frame is the
 * current content; failures are frames, never throws — a thrown stream
 * is a programming error. The generator ends when `signal` aborts.
 */
import type { ResourceProtocolMap } from '@deepseek-ai/dsh-client-ui-slots'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { FlowEventFrame } from './draft.ts'

/** The cards resource's Remote failure code, merged into the
 *  protocol's one vocabulary (cookbook §2: declaration merging, next
 *  to the throw — the gateway/internal bucket died with the app). */
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The door's wire is untyped at this seam — the address prefixes
     *  the diagnostic. */
    'cards/unclassified': Record<string, never>;
  }
}

/** One bench stage as the door serves it (presentation extras ride —
 *  this is the USER-facing view; the runner projection strips them). */
export interface BenchStageRow {
  id: string
  engine?: string
  card?: string
  title?: string
  params?: Record<string, unknown>
  inputs?: string[]
  outputs?: string[]
  provenance?: string
  runStatus?: string
  result?: unknown
  [key: string]: unknown
}

/** Append-only log head rows (the revision trail's public voice). */
export interface BenchLogHead {
  rev: number
  author?: string
  kind?: string
  [key: string]: unknown
}

/** `dsh-resource://cards/bench`. */
export interface CardsBenchValue {
  kind: 'bench'
  draftId: string
  rev: number
  stages: BenchStageRow[]
  log: BenchLogHead[]
}

/** One run stage as the status door serves it. */
export interface RunStageStatus {
  id: string
  status: string
  url?: string
}

/** `dsh-resource://cards/run/<runId>` — the hydrated status merged with
 *  every later events frame (last frame kept for the view). */
export interface CardsRunValue {
  kind: 'run'
  runId: string
  status: string
  stages: RunStageStatus[]
  lastFrame: FlowEventFrame | undefined
}

export type CardsValue = CardsBenchValue | CardsRunValue

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /** The Melite cards tab: the shared bench and live runs. */
    cards: CardsValue
  }
}

/** The bench key the tab serves (melite-tools' DEFAULT_BENCH — 'main'). */
export const CARDS_BENCH_ADDRESS = 'dsh-resource://cards/bench'

/** The run address (the wand's target, plan §5). */
export function cardsRunAddress(runId: string): string {
  return 'dsh-resource://cards/run/' + encodeURIComponent(runId)
}

/** Parse a cards address; null when the path is not one of ours. */
export function parseCardsAddress(address: string): { bench: true } | { run: string } | null {
  const prefix = 'dsh-resource://cards/'
  if (!address.startsWith(prefix)) return null
  const rest = address.slice(prefix.length)
  if (rest === 'bench') return { bench: true }
  if (rest.startsWith('run/')) {
    const runId = decodeURIComponent(rest.slice('run/'.length))
    if (runId !== '') return { run: runId }
  }
  return null
}

/** One failure frame (the contract's error branch — a real RemoteError
 *  on the unclassified cards code; the address prefixes the diagnostic). */
function failure(address: string, message: string): RemoteResult<never> {
  return { ok: false, error: new RemoteError('cards/unclassified', address + ': ' + message, {}) }
}

/** Defensive row readers — the door's wire is untyped at this seam. */
function readBench(doc: Record<string, unknown>): CardsBenchValue {
  const stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is BenchStageRow =>
        typeof s === 'object' && s !== null && typeof (s as BenchStageRow)['id'] === 'string')
    : []
  const log = Array.isArray(doc['log'])
    ? (doc['log'] as unknown[]).filter((s): s is BenchLogHead =>
        typeof s === 'object' && s !== null && typeof (s as BenchLogHead)['rev'] === 'number')
    : []
  return {
    kind: 'bench',
    draftId: typeof doc['draft_id'] === 'string' ? (doc['draft_id'] as string) : 'bench-main',
    rev: typeof doc['rev'] === 'number' ? (doc['rev'] as number) : 0,
    stages,
    log,
  }
}

function readRun(runId: string, doc: Record<string, unknown>): CardsRunValue {
  const stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is RunStageStatus =>
        typeof s === 'object' && s !== null && typeof (s as RunStageStatus)['id'] === 'string')
    : []
  // Stage urls arrive run-RELATIVE (the /v1/assets prefix died with
  // the gateway app); rewrite bare names onto the estate's media
  // route (draft.ts's mediaUrl twin — same law, same seam).
  for (const stage of stages) {
    if (typeof stage.url === 'string' && stage.url !== ''
        && !/^(https?:\/\/|\/)/.test(stage.url)) {
      stage.url = '/melite-media/runs/' + encodeURIComponent(runId) + '/'
        + stage.url.split('/').map((seg) => encodeURIComponent(seg)).join('/')
    }
  }
  return {
    kind: 'run',
    runId,
    status: typeof doc['status'] === 'string' ? (doc['status'] as string) : 'unknown',
    stages,
    lastFrame: undefined,
  }
}

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** Read a server-response envelope and narrow its result. A non-ok
 *  result throws the RemoteError branch's message (the caller frames
 *  the failure); a channel surprise throws honestly. */
async function wireCall(
  nsMethod: 'bench/get' | 'runs/status',
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/' + nsMethod, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: nsMethod,
      payload: { args },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok) throw new Error('wire: HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('wire: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) {
    throw new Error('wire: malformed result')
  }
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : 'wire: refused'
    throw new Error(message)
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('wire: not a JSON object')
  }
  return value as Record<string, unknown>
}

/** Merge one events frame into a run value (stage rows upserted by id;
 *  run-status frames replace the status; the frame is kept for the view). */
export function mergeRunFrame(value: CardsRunValue, frame: FlowEventFrame): CardsRunValue {
  const next: CardsRunValue = { ...value, lastFrame: frame }
  const type = (frame as Record<string, unknown>)['type']
  if (type === 'run' && typeof (frame as Record<string, unknown>)['status'] === 'string') {
    next.status = (frame as Record<string, unknown>)['status'] as string
  }
  if (type === 'stage') {
    const stageId = (frame as Record<string, unknown>)['stage']
    if (typeof stageId === 'string') {
      const known = next.stages.find((s) => s.id === stageId)
      if (known === undefined) {
        next.stages = [...next.stages, { id: stageId, status: 'running' }]
      } else {
        next.stages = next.stages.map((s) => (s.id === stageId ? { ...s, status: 'running' } : s))
      }
    }
  }
  return next
}

/** The provider registration body: `ctx.resources.register({ protocol:
 *  'cards', open })`. The estate remotes over the wire frame; abort
 *  ends the stream per the contract. */
export function openCardsResource(
  address: string,
  ctx: { signal: AbortSignal },
): AsyncIterable<RemoteResult<CardsValue>> {
  const target = parseCardsAddress(address)
  const bench = target !== null && 'bench' in target
  const runId = target !== null && 'run' in target ? target.run : ''
  return (async function* () {
    if (target === null) {
      yield failure(address, 'not a cards address')
      return
    }
    if (bench) {
      let value: CardsBenchValue
      try {
        value = readBench(await wireCall('bench/get', { sessionKey: 'main' }))
      } catch (e) {
        yield failure(address, e instanceof Error ? e.message : String(e))
        return
      }
      yield { ok: true, value }
      // No revision channel exists on the wire today: the bench log is
      // append-only but unpublished. The stream ends with the snapshot;
      // consumers reload after their own edits (the CAS law makes their
      // PATCH answers authoritative).
      return
    }
    // run view: hydrate, then poll the status remote until terminal or
    // abort (the events WS died with the gateway; the stream remote
    // replaces the poll when the plane exists).
    let value: CardsRunValue
    try {
      value = readRun(runId, await wireCall('runs/status', { runId }))
    } catch (e) {
      yield failure(address, e instanceof Error ? e.message : String(e))
      return
    }
    yield { ok: true, value }
    if (ctx.signal.aborted) return
    if (isTerminal(value.status)) return
    yield* pollRunFrames(runId, value, ctx.signal)
  })()
}

/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
 *  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
 *  'failed'. A settled run ends the stream; the hydrated/polled value
 *  stays as the last ok frame. */
function isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'stopped'
}

/** The live tail (the honest degrade): poll `runs/status` and yield a
 *  value ONLY when the row moved (no frame spam) until the run turns
 *  terminal or the holder aborts. A poll error mid-run is not a
 *  failure frame — the last ok value stays (the kit keeps it); the
 *  next poll may recover. The cadence (1500ms) rides the run pump's
 *  own observation granularity, not user perception of latency: stage
 *  transitions inside the estate tick on the pump's settle path. */
async function* pollRunFrames(
  runId: string,
  hydrated: CardsRunValue,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsRunValue>> {
  let value = hydrated
  const sleep = (ms: number): Promise<'slept' | 'abort'> =>
    new Promise((resolve) => {
      const t = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve('slept') }, ms)
      const onAbort = (): void => { clearTimeout(t); resolve('abort') }
      if (signal.aborted) { onAbort(); return }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  while (!signal.aborted && !isTerminal(value.status)) {
    const woke = await sleep(1500)
    if (woke === 'abort' || signal.aborted) return
    let row: Record<string, unknown>
    try {
      row = await wireCall('runs/status', { runId }, signal)
    } catch {
      continue // the last ok value stays; the next poll may recover
    }
    const next = readRun(runId, row)
    const moved = next.status !== value.status
      || JSON.stringify(next.stages) !== JSON.stringify(value.stages)
    if (!moved) continue
    value = next
    yield { ok: true, value }
  }
}

