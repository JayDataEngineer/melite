/**
 * The `cards` resource protocol — the cards tab's live values.
 *
 * Addresses (the bench rework's client plane, docs/plans/
 * bench-rework-2026-09-10.md §5):
 *
 *   dsh-resource://cards/bench        THE working flow (the shared bench)
 *   dsh-resource://cards/run/<runId>  one run, live
 *
 * The provider wraps the estate's own wires, same-origin (the deck host
 * half proxies /v1 and tunnels the events WS): the bench hydrates from
 * GET /v1/bench/main — a snapshot today, no revision channel exists on
 * the wire, so the stream ends after the first frame and consumers
 * reload after their own edits; the run hydrates from
 * GET /v1/flows/status/<runId> then rides the /v1/flows/events/<runId>
 * WS for stage/terminal frames until the run settles or the last
 * holder releases.
 *
 * Frame law (dsh-client-resources contract): the first frame is the
 * current content; failures are frames, never throws — a thrown stream
 * is a programming error. The generator ends when `signal` aborts.
 */
import type { ResourceProtocolMap } from '@deepseek-ai/dsh-client-ui-slots'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { FlowEventFrame } from './draft.ts'

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
 *  on the unclassified-Host code; the address prefixes the diagnostic). */
function failure(address: string, message: string): RemoteResult<never> {
  return { ok: false, error: new RemoteError('gateway/internal', address + ': ' + message, {}) }
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
  return {
    kind: 'run',
    runId,
    status: typeof doc['status'] === 'string' ? (doc['status'] as string) : 'unknown',
    stages,
    lastFrame: undefined,
  }
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(path, { headers: { accept: 'application/json' } })
  const text = await res.text()
  let doc: unknown
  try {
    doc = text === '' ? {} : JSON.parse(text)
  } catch {
    throw new Error('malformed JSON (HTTP ' + res.status + ')')
  }
  if (!res.ok) {
    const err = (doc as Record<string, unknown> | null)?.['error']
    throw new Error(typeof err === 'string' && err !== '' ? err : 'HTTP ' + res.status)
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new Error('not a JSON object')
  }
  return doc as Record<string, unknown>
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
 *  'cards', open })`. Same-origin wires (the deck host half's /v1 proxy
 *  + events tunnel); abort ends the stream per the contract. */
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
        value = readBench(await getJson('/v1/bench/main'))
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
    // run view: hydrate, then ride the events WS until terminal or abort.
    let value: CardsRunValue
    try {
      value = readRun(runId, await getJson('/v1/flows/status/' + encodeURIComponent(runId)))
    } catch (e) {
      yield failure(address, e instanceof Error ? e.message : String(e))
      return
    }
    yield { ok: true, value }
    if (ctx.signal.aborted) return
    yield* runFrames(address, runId, value, ctx.signal)
  })()
}

/** The live tail: WS frames → values, ended on terminal status, socket
 *  close, or abort. A dead socket is not a failure frame — the hydrated
 *  value stays (the kit keeps the last ok frame's value). */
async function* runFrames(
  address: string,
  runId: string,
  hydrated: CardsRunValue,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsRunValue>> {
  const loc = typeof location === 'object' && location !== null ? location : undefined
  if (loc === undefined) return
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = proto + '//' + loc.host + '/v1/flows/events/' + encodeURIComponent(runId)
  let ws: WebSocket
  try {
    ws = new WebSocket(url)
  } catch {
    return
  }
  const aborted = (): void => {
    try {
      ws.close()
    } catch {
      // already closed
    }
  }
  signal.addEventListener('abort', aborted, { once: true })
  try {
    let value = hydrated
    for (;;) {
      const message = await new Promise<MessageEvent | 'closed' | 'abort'>((resolve) => {
        const onMessage = (ev: MessageEvent): void => { cleanup(); resolve(ev) }
        const onClose = (): void => { cleanup(); resolve('closed') }
        const onAbort = (): void => { cleanup(); resolve('abort') }
        const cleanup = (): void => {
          ws.removeEventListener('message', onMessage)
          ws.removeEventListener('close', onClose)
          signal.removeEventListener('abort', onAbort)
        }
        if (ws.readyState === WebSocket.CLOSED) {
          resolve('closed')
          return
        }
        ws.addEventListener('message', onMessage)
        ws.addEventListener('close', onClose)
        signal.addEventListener('abort', onAbort)
      })
      if (message === 'abort' || message === 'closed') return
      let frame: unknown
      try {
        frame = JSON.parse(String(message.data))
      } catch {
        continue
      }
      if (typeof frame !== 'object' || frame === null) continue
      value = mergeRunFrame(value, frame as FlowEventFrame)
      yield { ok: true, value }
      const type = (frame as Record<string, unknown>)['type']
      const status = (frame as Record<string, unknown>)['status']
      if (type === 'run' && typeof status === 'string' &&
          (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'error')) {
        return
      }
    }
  } finally {
    signal.removeEventListener('abort', aborted)
    try {
      ws.close()
    } catch {
      // already closed
    }
  }
  void address
}
