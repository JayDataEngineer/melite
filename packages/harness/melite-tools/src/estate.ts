import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage'
import { deadline, TimeoutReason } from '@deepseek-ai/dsh-timeout'
/**
 * estate.ts — the tools' ONE transport: the ctx seats, in-process.
 *
 * NO HTTP, NO URL, NO PORT (the remotes migration, R2b). The KV/runs
 * lanes ride the estate row's Typert seats (draftsRemote/
 * benchRemote/runsRemote — plain method calls on ctx). The lane
 * fallback died with the gateway (2026-09-10): any lane without a
 * seat throws LOUD — no silent absorb, QUEUE LANE LAW.
 *
 * Seat reads are OPTIONAL-dependency probes — ctx.get(name), the
 * tutorial's documented pattern (cordis-tutorial/03-services.md:
 * "skip inject and probe at the use site"; property reads demand
 * inject and the tools plane must activate in EVERY composition).
 *
 * Remote failures arrive as the protocol's RemoteError (code +
 * details) — discriminate with remoteErrorOf, never instanceof.
 */

// Type-only: pulls the `draft/*` + `bench/*` RemoteErrorDetailsMap
// merges from the producing package into every tools compilation
// (erased at runtime; the DSH-generated client assembly replaces
// this reference when the generation pipeline lands host-side).
import type {} from '@melite/estate-drafts'
// Type-only: the `runs/*` codes (the queue owns them; melite-flow's
// unknown-run arm discriminates on them) — same merge idiom.
import type {} from '@melite/estate-queue'
import type { EstateCall } from '@melite/estate-call'

/**
 * DYING SHIM (HTTP-era refusal carrier). The seats never throw it;
 * only lanes still awaiting their remotes keep instanceof arms for
 * it, and it is deleted with the last of those. Bench/drafts lanes
 * are already migrated (RemoteError codes).
 */


export type EstateMethod = 'GET' | 'POST' | 'PATCH'
export type EstateRequest = (
  method: EstateMethod,
  path: string,
  body: unknown,
  execSignal: AbortSignal,
  // optional since li-aq.5's cure: a caller MAY pass a wall-clock
  // bound (the seats race it); a boundless call keeps the old
  // contract — no invented timeout.
  timeoutMs?: number,
) => Promise<unknown>

/** Narrow the seat-bound request to the canonical EstateCall the card
 * tool builders receive: the seats demand a caller signal (trySeats'
 * throwIfAborted), so a signalless call fails HERE with a named error
 * instead of deep inside the lane as a TypeError (2026-09-12). */
export function asEstateCall(request: EstateRequest): EstateCall {
  return (method, path, body, signal, timeoutMs) => {
    if (signal === undefined) {
      throw new Error(`estate call ${method} ${path} arrived without a caller signal (the seats require cancellation)`)
    }
    return request(method, path, body, signal, timeoutMs)
  }
}

/** The estate row's Context-merged seats, stated structurally
 *  (the compiled remote types stay out of this source-run package). */
interface Seats {
  draftsRemote?: {
    list(signal?: AbortSignal): Promise<{ count: number; drafts: unknown[] }>
    get(draftId: string, signal?: AbortSignal): Promise<unknown>
    patch(draftId: string, stageId: string, patch: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  }
  benchRemote?: {
    get(session: string, signal?: AbortSignal): Promise<unknown>
    ensure(doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    patch(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    addStage(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    removeStage(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    // THE CLEAR ALL (2026-10-10, the operator's demanded door) — the
    // drafts bench's clear verb, beside removeStage.
    clear(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    rewire(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    undo(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  }

  /** The live-run REGISTRY seat (REBUILD-6) — the seat is named
   *  'runs' (RunsRuntimeService: the business arms validate/start/
   *  status/stop/list as plain methods). NOT runsRemote (the Typert
   *  transport service whose wire methods are remoteExport*) — the
   *  lanes call the registry in-process. */
  runs?: {
    start(doc: unknown, signal: AbortSignal): Promise<unknown>
    status(runId: string, signal: AbortSignal, includeLog?: boolean): Promise<unknown>
    stop(runId: string, signal: AbortSignal): Promise<unknown>
    list(rawLimit: string, signal: AbortSignal): Promise<unknown>
    validate(doc: unknown, signal: AbortSignal): Promise<unknown>
  }

  /** The disclosure seat (REBUILD-14): discover over both planes,
   *  derived live (the flows registry + the card registry). */
  disclose?: {
    discover(lookup: string, q: string, tags: string): unknown
    /** GET /v1/flows — the machine-readable flow contracts (the app
     *  door: what a named flow takes, before starting one). */
    contracts(): unknown
  }

  /** The management seat (REBUILD-15): the ComfyUI-Manager plane —
   *  act() answers the envelope or throws manage/refused carrying
   *  it (the tool surfaces WHY as the value). */
  manage?: {
    act(doc: unknown, signal: AbortSignal): Promise<unknown>
  }

  /** The skills seat (REBUILD-16): the index + the doc read. */
  skills?: {
    index(): unknown
    read(id: string, signal: AbortSignal): unknown
  }

  /** The load seat (REBUILD-17): Melite load opens ONE card or
   *  flow — the bundle (agents md + signature + tier-1 lines). */
  load?: {
    load(inferenceType: string, name: string): unknown
  }

  /** The queue seat (REBUILD-19): the serial run queue — the
   *  journal tail rides its own seat's arm. */
  queue?: {
    ledger(rawLimit: string, rawEvent: string): unknown
  }
}

/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(
  ctx: unknown,
  method: EstateMethod,
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<unknown | undefined> {
  // OPTIONAL-dependency probes: ctx.get returns undefined when no
  // provider is loaded (the tutorial's pattern) — a seatless lane
  // then falls to the LOUD no-remote throw below.
  const probe = ctx as { get(name: string): unknown }
  const seats: Seats = {
    get draftsRemote() { return probe.get('draftsRemote') as Seats['draftsRemote'] },
    get benchRemote() { return probe.get('benchRemote') as Seats['benchRemote'] },
    get runs() { return probe.get('runs') as Seats['runs'] },
    get disclose() { return probe.get('disclose') as Seats['disclose'] },
    get manage() { return probe.get('manage') as Seats['manage'] },
    get skills() { return probe.get('meliteSkills') as Seats['skills'] },
    get load() { return probe.get('load') as Seats['load'] },
    get queue() { return probe.get('queue') as Seats['queue'] },
  }
  signal.throwIfAborted()

  if (method === 'GET' && path === '/v1/flows/drafts') {
    if (seats.draftsRemote === undefined) return undefined
    return seats.draftsRemote.list(signal)
  }
  let m = /^\/v1\/flows\/drafts\/([^/?]+)$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.draftsRemote === undefined) return undefined
    return seats.draftsRemote.get(decodeURIComponent(m[1]!), signal)
  }
  // ── THE 1:1 FLOW PORT LANES (2026-09-11: the old editor's card
  // system rides the DSH plugin; these arms are its HTTP face) ──
  // The card COMPOSE (cardBirth.ts): the start body verbatim → a
  // bench-backed draft (the CARD BIRTH LAW: the start rides a
  // doc-backed draft_id). CAS law = the queue lane's own: read the
  // bench first, expect_rev rides, a fresh bench births.
  if (method === 'POST' && path === '/v1/flows/drafts') {
    if (seats.benchRemote === undefined) return undefined
    if (body === undefined || typeof body !== 'object' || body === null) {
      throw new Error('card compose needs a JSON body')
    }
    const bag = body as Record<string, unknown>
    const intentSrc = typeof bag['prompt'] === 'string' && bag['prompt'] !== ''
      ? bag['prompt'] as string
      : typeof bag['intent'] === 'string' ? bag['intent'] as string : 'card'
    // NOTE (2026-09-25, the fabrication finding): intent stays the
    // IDENTITY key verbatim (the studio consult keys cardName off
    // it — never the prompt, never a label); the tool-mint
    // provenance rides bench_snapshot.bench_head instead (the
    // bench's own log head, stamped by runsStart).
    const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + '…' : intentSrc
    const params: Record<string, unknown> = { ...(bag['params'] as Record<string, unknown> ?? {}) }
    if (typeof bag['prompt'] === 'string' && bag['prompt'] !== '') params['prompt'] = bag['prompt']
    const ensure: Record<string, unknown> = {
      session: 'default',
      intent,
      stages: [{ id: 's_0', engine: CARD_PLANE_ENGINE, params }],
      // THE TOOL-BENCH OWNERSHIP LAW (2026-09-22, the maker jam):
      // this lane is the SOLE writer of the 'default' scope — the
      // wholesale replace of our own prior one-shot mint IS the
      // owner-confirming overwrite the bench law (2026-09-15) wants
      // said out loud. Omitting it wedged every render tool behind
      // a bench/overwrite-required refusal no tool schema could
      // utter (the end-to-end agent test, live receipt seq 4-7).
      overwrite: true,
    }
    const cur = await seats.benchRemote.get('default', signal) as { rev?: unknown } | undefined
    if (cur !== undefined && typeof cur['rev'] === 'number') ensure['expect_rev'] = cur['rev']
    // CAS RETRY (one): a concurrent tool mint moved the rev between
    // our read and our ensure — re-read, retry once. The replace is
    // idempotent under ownership; any other refusal propagates loud.
    const conflict = (e: unknown): boolean =>
      typeof (e as { code?: unknown })?.code === 'string' &&
      (e as { code: string }).code === 'bench/cas-conflict'
    let row: { draft_id?: unknown }
    try {
      row = await seats.benchRemote.ensure(ensure, signal) as { draft_id?: unknown }
    } catch (first: unknown) {
      if (!conflict(first)) throw first
      const fresh = await seats.benchRemote.get('default', signal) as { rev?: unknown } | undefined
      if (fresh !== undefined && typeof fresh['rev'] === 'number') ensure['expect_rev'] = fresh['rev']
      row = await seats.benchRemote.ensure(ensure, signal) as { draft_id?: unknown }
    }
    if (row === undefined || typeof row['draft_id'] !== 'string') {
      throw new Error('card compose returned no draft_id — refusing to start cardless')
    }
    return { draftId: row['draft_id'] }
  }
  // The STAGE wire PATCH (params edits + result persistence — the
  // 2022-08-22 wire PATCH + resultOutbox's result rows).
  m = /^\/v1\/flows\/drafts\/([^/?]+)\/stages\/([^/?]+)(?:\/result)?$/.exec(path)
  if (method === 'PATCH' && m !== null) {
    if (seats.draftsRemote === undefined) return undefined
    if (body === undefined || typeof body !== 'object' || body === null) {
      throw new Error('draft stage patch needs a JSON body')
    }
    return seats.draftsRemote.patch(
      decodeURIComponent(m[1]!),
      decodeURIComponent(m[2]!),
      body as Record<string, unknown>,
      signal,
    )
  }
  if (method === 'POST' && path === '/v1/bench/ensure') {
    if (seats.benchRemote === undefined) return undefined
    if (body === undefined || typeof body !== 'object' || body === null) {
      throw new Error('bench ensure needs a JSON body')
    }
    return seats.benchRemote.ensure(body as Record<string, unknown>, signal)
  }
  m = /^\/v1\/bench\/([^/?]+)$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.benchRemote === undefined) return undefined
    return seats.benchRemote.get(decodeURIComponent(m[1]!), signal)
  }
  // The bench's mutation arms (REBUILD-4): /v1/bench/:session/<verb>
  // routes to the matching seat method (the door's URL grammar is
  // the tools' lane grammar — the remote methods are 1:1 beneath).
  if (method === 'POST') {
    // "clear" (2026-10-10, the operator's demanded clear-all) — the
    // nuclear arm: every stage out, one log entry, undoable whole.
    const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|remove_stage|clear|rewire|undo)$/.exec(path)
    if (arm !== null) {
      if (seats.benchRemote === undefined) return undefined
      if (body === undefined || typeof body !== 'object' || body === null) {
        throw new Error(`bench ${arm[2]!} needs a JSON body`)
      }
      const session = decodeURIComponent(arm[1]!)
      const doc = body as Record<string, unknown>
      switch (arm[2]) {
        case 'patch': return seats.benchRemote.patch(session, doc, signal)
        case 'add_stage': return seats.benchRemote.addStage(session, doc, signal)
        case 'remove_stage': return seats.benchRemote.removeStage(session, doc, signal)
        case 'clear': return seats.benchRemote.clear(session, doc, signal)
        case 'rewire': return seats.benchRemote.rewire(session, doc, signal)
        case 'undo': return seats.benchRemote.undo(session, doc, signal)
      }
    }
  }
  // THE FLOW CONTRACTS (2026-10-04): GET /v1/flows answers every
  // registry flow with its declared stages/inputs/outputs/tool — the
  // machine-readable door a programmatic caller reads to learn what a
  // named flow takes. Placed BEFORE the runs lanes: every arm below
  // matches a trailing segment, so the exact path is free, and the
  // contract read precedes any submit (discover, then run).
  if (method === 'GET' && path === '/v1/flows') {
    if (seats.disclose === undefined) return undefined
    return seats.disclose.contracts()
  }
  // The validate lane (REBUILD-8): the pure compile over the runs
  // seat — the door's arm order lives in the registry.
  if (method === 'POST' && path === '/v1/flows/validate') {
    if (seats.runs === undefined) return undefined
    return seats.runs.validate(body, signal)
  }
  // The runs plane's lanes (REBUILD-6): the flowsRun door arms over
  // the registry seat — submit, live status (with the log tail on
  // ?include_log), stop receipt.
  if (method === 'POST' && path === '/v1/flows/start') {
    if (seats.runs === undefined) return undefined
    return seats.runs.start(body, signal)
  }
  m = /^\/v1\/flows\/status\/([^/?]+)(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.runs === undefined) return undefined
    // String.split always yields a [0] (even ''.split('&') is ['']),
    // so no ?? is needed — the null arm below is the no-query case only.
    const first = m[2] === undefined ? null : m[2].split('&')[0] as string
    const flagValue = first === null ? '' : first.split('=')[1] ?? ''
    const includeLog = ['1', 'true', 'yes'].includes(
      decodeURIComponent(flagValue).toLowerCase(),
    )
    return seats.runs.status(decodeURIComponent(m[1]!), signal, includeLog)
  }
  m = /^\/v1\/flows\/stop\/([^/?]+)$/.exec(path)
  if (method === 'POST' && m !== null) {
    if (seats.runs === undefined) return undefined
    return seats.runs.stop(decodeURIComponent(m[1]!), signal)
  }
  m = /^\/v1\/flows\/runs(?:\/|$|\?)/.exec(path)
  if (method === 'GET' && m !== null && path !== '/v1/flows/runs/') {
    if (seats.runs === undefined) return undefined
    // The RAW limit string rides (int() semantics: underscores
    // parse, junk refuses LOUD — the door's text, never NaN).
    const lim = /(?:^|[?&])limit=([^&]*)/.exec(path)
    return seats.runs.list(
      lim !== null ? decodeURIComponent(lim[1]!) : '200',
      signal,
    )
  }
  // The disclose lane (REBUILD-14): Melite discover over both
  // planes — the seat derives rows LIVE (the flows registry + the
  // primed card registry). The query string rides the door's own
  // params (lookup / q / tags).
  m = /^\/v1\/discover(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.disclose === undefined) return undefined
    const qs = new URLSearchParams(m[1] ?? '')
    return seats.disclose.discover(
      qs.get('lookup') ?? 'all',
      qs.get('q') ?? '',
      qs.get('tags') ?? '',
    )
  }
  // The manage lane (REBUILD-15): the management plane over the
  // seat — the body IS the door's {action, ...} doc; a refused
  // envelope throws manage/refused carrying it.
  if (method === 'POST' && path === '/v1/manage') {
    if (seats.manage === undefined) return undefined
    return seats.manage.act(body, signal)
  }
  // The skills lanes (REBUILD-16): the index + the doc read over
  // the skills seat.
  if (method === 'GET' && path === '/v1/skills') {
    if (seats.skills === undefined) return undefined
    return seats.skills.index()
  }
  m = /^\/v1\/skills\/([^/?]+)$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.skills === undefined) return undefined
    return seats.skills.read(decodeURIComponent(m[1]!), signal)
  }
  // The load lane (REBUILD-17): Melite load over the load seat —
  // the query string rides the door's own params (inference_type /
  // name).
  m = /^\/v1\/load(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.load === undefined) return undefined
    const qs = new URLSearchParams(m[1] ?? '')
    return seats.load.load(qs.get('inference_type') ?? '', qs.get('name') ?? '')
  }
  // The ledger lane (REBUILD-19): the journal tail over the queue
  // seat — the door's parameter law rides (garbage limit -> 50,
  // never a 400). A SEATLESS queue reads as an EMPTY tail (the
  // journal is optional infra for web profiles; the gateway lane
  // fallback died 2026-09-10 and a hard refusal here surfaced as a
  // crash-toast over every seatless profile's card bench while the
  // mesh viewport itself kept rendering). A MOUNTED seat that
  // throws still propagates — only absence degrades.
  m = /^\/v1\/ledger(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.queue === undefined) return []
    const qs = new URLSearchParams(m[1] ?? '')
    return seats.queue.ledger(qs.get('limit') ?? '50', qs.get('event') ?? '')
  }
  return undefined
}

/** Which seat FAMILY a path needs (agent-debt F-8, 2026-09-22 —
 * coarse by design: the matcher above is the truth; this only names
 * the family for the seatless refusal so the error says what to look
 * at instead of developer archaeology). probeNames are the ONLY
 * names the refusal may ctx.get — exactly the ones the matcher
 * itself would have probed for this path: an EAGER sweep of all
 * seat names INSTANTIATES defined-but-unloaded services on a cordis
 * context (constructors with side effects — the hang, live proof
 * 2026-09-22: the manage-seat wall took 51.8s dialing). */
export function seatFamilyForPath(path: string): { family: string; probeNames: string[] } {
  if (path.startsWith('/v1/flows/drafts') || path.startsWith('/v1/bench/')) {
    return { family: 'bench plane (draftsRemote/benchRemote seats)', probeNames: ['draftsRemote', 'benchRemote'] }
  }
  if (path.startsWith('/v1/flows/')) return { family: 'live-run registry (the runs seat)', probeNames: ['runs'] }
  if (path.startsWith('/v1/discover')) return { family: 'disclose', probeNames: ['disclose'] }
  if (path.startsWith('/v1/manage')) return { family: 'manage', probeNames: ['manage'] }
  if (path.startsWith('/v1/skills')) return { family: 'meliteSkills', probeNames: ['meliteSkills'] }
  if (path.startsWith('/v1/load')) return { family: 'load', probeNames: ['load'] }
  if (path.startsWith('/v1/ledger')) return { family: 'queue', probeNames: ['queue'] }
  return { family: 'unknown', probeNames: [] }
}

/** Build the tools' request: seats only, in-process. A lane with no
 *  seat for the path is a hard error — but the error must be an
 *  AGENT-USABLE refusal (F-8): name the family the path needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. The old voice ("the gateway lane fallback died
 *  2026-09-10 — migrate to a named Typert remote") read as a broken
 *  registry and sent an agent hunting doors for an hour. */
export function makeEstateRequest(ctx: unknown): EstateRequest {
  // (the ledger's seam drift, cured 2026-10-10: the TYPE promised a
  // timeoutMs the implementation silently dropped — callers passed
  // 120_000 and the seat path could hang forever where the engine
  // path (its own AbortSignal.timeout) never would. The bound is now
  // RACED, not dropped: a seat call that outlives it rejects with a
  // named error, the same law the direct fetch lives under. Since
  // the dry-sweep's J8 the race rides dsh-timeout's deadline() (the
  // owned primitive) — timer-only: the caller's signal stays with
  // the seat work, which owns its own cancellation. The fused form
  // lost the doors wall (a caller that goes away must settle from
  // the WORK, never a fabricated refusal) and was rolled back.)
  return (method, path, body, execSignal, timeoutMs) => {
    const work = performEstateRequest(ctx, method, path, body, execSignal)
    if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return work
    const bound = deadline(undefined, timeoutMs, 'ESTATE_TIMEOUT')
    const refused = new Promise<never>((_, reject) => {
      // deadline()'s signal aborts with a TimeoutReason at the bound;
      // the translation keeps the pinned voice verbatim (J8: the race
      // rides the owned primitive, the semantics stay RACED). The
      // caller's signal is deliberately NOT fused — the seat work owns
      // its own cancellation (doors.spec pins the caller-gone arm: the
      // response settles from the WORK, never a fabricated refusal),
      // so the race's only business is the bound.
      bound.signal.addEventListener(
        'abort',
        () => {
          const reason: unknown = bound.signal.reason
          if (reason instanceof TimeoutReason) {
            reject(new Error(`estate request ${method} ${path} outlived its ${String(timeoutMs)}ms bound`))
            return
          }
          reject(reason instanceof Error ? reason : new Error('estate request cancelled'))
        },
        { once: true },
      )
    })
    return Promise.race([work, refused]).finally(() => { bound[Symbol.dispose]() })
  }
}

async function performEstateRequest(
  ctx: unknown,
  method: EstateMethod,
  path: string,
  body: unknown,
  execSignal: AbortSignal,
): Promise<unknown> {
  {
    const viaSeats = await trySeats(ctx, method, path, body, execSignal)
    if (viaSeats !== undefined) return viaSeats
    const { family, probeNames } = seatFamilyForPath(path)
    const probe = ctx as { get(name: string): unknown }
    const live: string[] = []
    for (const n of probeNames) {
      try {
        if (probe.get(n) !== undefined) live.push(n)
      } catch {
        /* a throwing probe reads as absent — absence is the only story */
      }
    }
    const liveVoice: string = live.length > 0
      ? `Live seats here: ${live.join(', ')}.`
      : `No seat of that family is mounted on this lane (ABSENCE, not a broken registry; nothing crashed).`
    throw new Error(
      `no seat on this lane serves ${method} ${path} — the ${family} is not mounted. `
        + `${liveVoice} `
        + `The queue-plane seats mount when the estate state root is pinned (the profile config's stateRoot / repoRoot fields). `
        + `On a chat lane, compose via melite_construct onto the shared bench instead of the raw flow doors.`,
    )
  }
}
