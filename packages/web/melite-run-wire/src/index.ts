/**
 * melite-run-wire — THE runs wire SSOT (2026-09-12).
 *
 * The operator's DRY law, verbatim: "it must be done through a dry
 * package, so it can be reused across components." The estate's run
 * verbs — start (both doors), status, stage-url, terminal, adoption,
 * stop, and the artifact poll — live HERE, once; the cards tab, the
 * studios, and every future component (media bar, flow bench, chat
 * cards) import them instead of copying the frame.
 *
 * THE SUBSTRATE: same-origin POST /api/<method> carrying the
 * client-request frame (api-gateway.md — the sanctioned caller for
 * plugins outside the DSH web kernel). Arg names are CAMELCASE on
 * this wire (runs/list's rawLimit — snake_case is refused with
 * "args fields do not match the descriptor").
 *
 * THE START-DOOR LAW (why startCardRun exists): the runs gateway
 * serves three doors, and only one of them composes cards —
 *
 *   {model:}      THE card door (startCardRun). phase1Card/phase2Card
 *                 compose the card's arms into the graph and stamp it
 *                 into the stage as params.workflow at registration
 *                 (runsRegistry). `model` may be the FAMILY id
 *                 ('trellis2-native') or the CARD id ('img-to-mesh')
 *                 — resolveCardFamily resolves the alias estate-side,
 *                 the same resolution /v1/form-spec serves, so the
 *                 client keeps ONE truth (the card id it already
 *                 holds) and never mirrors the family table.
 *   {flow_inline:} pre-composed stages ONLY (startFlowInlineRun):
 *                 "card= stages are unported on this gateway"
 *                 (runsStart refuses them loud) and every stage's
 *                 params must already carry `workflow` — the executor
 *                 splices params.workflow and throws "node carries no
 *                 inline workflow" when absent. Single-stage only.
 *   {flow:}       the named-flow shim (registry flows) — no client
 *                 verb here yet; the door is the estate's.
 *
 * THE ARTIFACT CHANNEL: the run is the SSOT. Stage urls arrive
 * run-RELATIVE from runs/status (the /v1/assets prefix died with the
 * gateway app); readRunStatus rewrites bare names onto the estate's
 * media route (/melite-media/runs/<runId>/<rel>) — the ONE rewrite;
 * urls that already carry a scheme or lead with / pass verbatim
 * (never double-encoded).
 *
 * THE POLL LAW (pollRunStageUrl): the old pollFlowRun cadence —
 * check immediately, then every intervalMs (default 1500ms, the run
 * pump's own observation granularity, not user latency perception)
 * until the stage reports its url (onUrl fires once, then resolve) or
 * the run turns terminal without one (resolve silent — the caller's
 * empty state is the honest face). Transport errors are swallowed:
 * the next poll may recover; only abort ends the loop early.
 * File-era arm: runs/status disavows completed runs (unknown run_id
 * — a WireRefusedError), which proves nothing is executing for the
 * id; the poll then settles from the runs/list row (its artifact
 * url, or silent) after ONE consult.
 */
export { }

// ── the frame ─────────────────────────────────────────────────────

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard; the hand-rolled arm covers non-secure
 *  contexts where the standard is absent). */
export function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** Transport-error voices: the estate's refusal text rides VERBATIM
 *  (the door's own law — the client never paraphrases a refusal);
 *  only the transport failures (HTTP / malformed frames) carry the
 *  caller's label so diagnostics name their door. */
export interface WireOpts {
  signal?: AbortSignal
  /** The transport-error prefix (default 'wire'). */
  voice?: string
}

/** The estate's domain refusal (result.ok !== true): the message
 *  rides verbatim (the door's own law — the client never
 *  paraphrases); the class separates DOMAIN verdicts from transport
 *  failures, which carry the caller's voice prefix instead. */
export class WireRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WireRefusedError'
  }
}

/** One client-request round trip: POST /api/<method> with the frame,
 *  narrow the server-response envelope. Non-ok results throw the
 *  estate's message; channel surprises throw honestly. */
export async function wireCall(
  method: string,
  args: Record<string, unknown>,
  opts?: WireOpts,
): Promise<Record<string, unknown>> {
  const voice = opts?.voice ?? 'wire'
  const rpcId = nextRpcId()
  const res = await fetch('/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method,
      payload: { args },
    }),
    ...(opts?.signal === undefined ? {} : { signal: opts.signal }),
  })
  if (!res.ok) throw new Error(voice + ': HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error(voice + ': malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) {
    throw new Error(voice + ': malformed result')
  }
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : voice + ': refused'
    // THE REFUSAL MARKER: the estate answered — this is a DOMAIN
    // verdict (unknown run_id, bad body…), never a transport
    // failure. The file-era arms key on it: a refused runs/status
    // proves the run is NOT in the live map (nothing executing),
    // while a transport error only means "ask again".
    throw new WireRefusedError(message)
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(voice + ': not a JSON object')
  }
  return value as Record<string, unknown>
}

// ── the run status law ────────────────────────────────────────────

/** One run stage as the status door serves it (url already rewritten
 *  by readRunStatus — consumers never see the bare name). */
export interface RunStageStatus {
  id: string
  status: string
  url?: string
  /** Completed stages carry the full artifact name list ({name}
   * rows — the queue stamps stage["gallery"] alongside url; the
   * harvest carry reads it to feed studio adapters real data). */
  gallery?: { name: string }[]
}

/** The runs/status row, normalized once. */
export interface RunStatusRow {
  runId: string
  status: string
  draftId: string | null
  stages: RunStageStatus[]
}

/** The terminal statuses — the runs seat's own vocabulary (the settle
 *  path stamps 'completed' or 'failed'; runs/stop stamps 'stopped'). */
export function isTerminalRun(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'stopped'
}

/** The ONE media-url rewrite (readRunStatus + the file-era list
 *  fallback share it): bare run-relative names ride the estate's
 *  media route (/melite-media/runs/<runId>/<rel>); urls that already
 *  carry a scheme or lead with / pass verbatim (never double-encoded). */
export function toRunMediaUrl(runId: string, url: string): string {
  if (url === '') return ''
  if (!/^(https?:\/\/|\/)/.test(url)) {
    return '/melite-media/runs/' + encodeURIComponent(runId) + '/'
      + url.split('/').map((seg) => encodeURIComponent(seg)).join('/')
  }
  return url
}

/** Normalize a runs/status doc: stage rows distilled, bare run-
 *  relative urls rewritten onto the estate's media route (absolute
 *  and leading-/ urls pass verbatim — the one rewrite, never two). */
export function readRunStatus(runId: string, doc: Record<string, unknown>): RunStatusRow {
  const stages: RunStageStatus[] = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is RunStageStatus =>
        typeof s === 'object' && s !== null && typeof (s as RunStageStatus)['id'] === 'string')
    : []
  for (const stage of stages) {
    if (typeof stage.url === 'string' && stage.url !== '') {
      stage.url = toRunMediaUrl(runId, stage.url)
    }
  }
  return {
    runId,
    status: typeof doc['status'] === 'string' ? (doc['status'] as string) : 'unknown',
    draftId: typeof doc['draft_id'] === 'string' && (doc['draft_id'] as string) !== ''
      ? (doc['draft_id'] as string)
      : null,
    stages,
  }
}

/** One runs/status read. */
export async function fetchRunStatus(runId: string, signal?: AbortSignal): Promise<RunStatusRow> {
  return readRunStatus(runId, await wireCall('runs/status', { runId }, { signal }))
}

/** THE SINGLE-STAGE FALLBACK: a one-stage run's only stage IS the
 *  asked stage — the {model:} door names its stage by the card's
 *  declared skeleton ('img-to-mesh'), not the bench row id ('s_1')
 *  the caller holds; matching ids first keeps multi-stage runs
 *  exact while single-stage card runs answer under any label.
 *  File-era arm: a REFUSED status (the run is not in the live map)
 *  falls back to the runs/list row's first artifact — completed
 *  runs answer here, not at the status door. Transport errors
 *  rethrow (the caller decides retry); a live answer with no url
 *  yet is null (the poll loop keeps going). */
export async function fetchRunStageUrl(
  runId: string,
  stageId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  let value: RunStatusRow
  try {
    value = await fetchRunStatus(runId, signal)
  } catch (e: unknown) {
    if (e instanceof WireRefusedError) {
      const listed = await fetchListRow(runId, signal).catch((): null => null)
      return listed !== null ? listRowMediaUrl(listed) : null
    }
    throw e
  }
  const row = value.stages.find((s) => s.id === stageId)
    ?? (value.stages.length === 1 ? value.stages[0] : undefined)
  return row !== undefined && typeof row.url === 'string' && row.url !== '' ? row.url : null
}

/** A run's terminal read (stops poll loops). */
export async function fetchRunTerminal(runId: string, signal?: AbortSignal): Promise<boolean> {
  return isTerminalRun((await fetchRunStatus(runId, signal)).status)
}

/** The runs/list rows as loose records (the restore port's own
 *  shape — run_id, draft_id, created_at, status, artifacts). */
async function listRunRows(signal?: AbortSignal): Promise<Record<string, unknown>[]> {
  const row = await wireCall('runs/list', { rawLimit: '500' }, { signal })
  const runs = Array.isArray(row['runs']) ? (row['runs'] as unknown[]) : []
  return runs.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
}

/** One runs/list row by run_id (the file-era face — runs/status only
 *  knows live runs; the list is the completed runs' SSOT). */
export async function fetchListRow(
  runId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  for (const r of await listRunRows(signal)) {
    const rid = r['run_id'] ?? r['id']
    if (typeof rid === 'string' && rid !== '' && rid === runId) return r
  }
  return null
}

/** The list row's served artifact url onto the media route. The
 *  list's currency DIFFERS from the status door's: runArtifacts
 *  serves urls already prefixed with the run dir
 *  (`<runId>/<rel>` — `url: runBase + "/" + cand.rel`), while live
 *  stage urls are bare rels (runRel strips the dir). So the list
 *  url rides under the route root directly — prepending the run id
 *  again would double it. Absolute and rooted urls pass verbatim. */
export function listArtifactMediaUrl(url: string): string | null {
  if (url === '') return null
  if (/^(https?:\/\/|\/)/.test(url)) return url
  return '/melite-media/runs/'
    + url.split('/').map((seg) => encodeURIComponent(seg)).join('/')
}

/** The list row's first media artifact url, rewritten onto the media
 *  route (the row's own currency is run-prefixed, like the
 *  thumbnail). Truncated markers carry no url and are skipped. */
export function listRowMediaUrl(
  row: Record<string, unknown>,
): string | null {
  const arts = Array.isArray(row['artifacts']) ? row['artifacts'] : []
  for (const a of arts) {
    if (typeof a !== 'object' || a === null) continue
    const url = (a as Record<string, unknown>)['url']
    if (typeof url === 'string') {
      const media = listArtifactMediaUrl(url)
      if (media !== null) return media
    }
  }
  return null
}

/** The draft's newest run (runs/list adoption — the reload-proof
 *  bridge: the estate is the SSOT, never the client's memory).
 *  NOTE the list's C-parity ordering: media-bearing runs first, then
 *  newest-first — scan the wide tail, newest by created_at. (An older
 *  note blamed the hasDraft filter for dropping bench-draft runs;
 *  the actual nulling gate was the row gate refusing "model"
 *  artifact rows — fixed estate-side, pinned by runs-list.spec.ts.) */
export async function fetchLatestRunForDraft(
  draftId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  let newest: { rid: string; created: number } | null = null
  for (const r of await listRunRows(signal)) {
    const rid = r['run_id'] ?? r['id']
    const did = r['draft_id']
    if (typeof rid !== 'string' || rid === '' || did !== draftId) continue
    const created = r['created_at']
    const at = typeof created === 'number' ? created : 0
    if (newest === null || at > newest.created) newest = { rid, created: at }
  }
  return newest !== null ? newest.rid : null
}

/** runs/stop — the cancel door (the registry seat's flag + interrupt).
 *  Refusals throw the estate's text. */
export async function stopRun(runId: string, signal?: AbortSignal): Promise<void> {
  await wireCall('runs/stop', { runId }, { signal, voice: 'runs/stop' })
}

// ── the start doors ───────────────────────────────────────────────

/** Every start verb's outcome: the minted run, or the refusal text
 *  (the estate's own voice — never thrown past the gesture). */
export type StartOutcome = { runId: string } | { refused: string }

/** THE CARD DOOR — the one that composes. `model` is the FAMILY id
 *  ('trellis2-native' — the runs door resolves neither card ids nor
 *  aliases, unlike form-spec's card-id arm; fetchCardFamilies carries
 *  the card→families currency). `params` are the card's declared
 *  knobs, sent TOP-LEVEL beside the envelope keys — the door's own
 *  convention (CARD_ENVELOPE_KEYS strip; a nested `params` stanza is
 *  the CLI compat arm and merges UNDER the stamped siblings, so
 *  stanza values lose to the family defaults). */
export interface StartCardRunInput {
  model: string
  params: Record<string, unknown>
  draftId: string
  /** Default false — a real run. */
  test?: boolean
}

/** THE FLOW DOOR — pre-composed stages only: each stage's params must
 *  already carry `workflow` (card= stages are refused unported by the
 *  gateway; the compose door is startCardRun's). */
export interface StartFlowInlineInput {
  flowId: string
  stages: Array<Record<string, unknown>>
  draftId: string
  /** Default false — a real run. */
  test?: boolean
}

/** The shared start core — ONE envelope walk for both doors (the
 *  registry demands draft_id + an explicit test boolean; the flow
 *  body needs its id — the bench runs under its own draft_id). */
async function startRun(
  doc: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<StartOutcome> {
  try {
    const row = await wireCall('runs/start', { doc }, { signal, voice: 'run refused' })
    const runId = row['run_id']
    if (typeof runId === 'string' && runId !== '') return { runId }
    return { refused: 'run refused: no run_id in the answer' }
  } catch (e) {
    return { refused: e instanceof Error ? e.message : 'run request failed' }
  }
}

/** Start ONE card through the composing door (the bench drill's Run,
 *  a studio's Run — every single-card gesture rides this). */
export async function startCardRun(
  input: StartCardRunInput,
  signal?: AbortSignal,
): Promise<StartOutcome> {
  return await startRun({
    // knobs ride TOP-LEVEL (the door's convention — see the interface
    // law above); none of them collides with the envelope keys.
    ...input.params,
    model: input.model,
    draft_id: input.draftId,
    test: input.test ?? false,
  }, signal)
}

/** Start pre-composed stages through the flow door (whole-bench Run —
 *  honest refusal when the stages carry no workflow or the bench is
 *  multi-stage: the single-stage policy is the estate's). */
export async function startFlowInlineRun(
  input: StartFlowInlineInput,
  signal?: AbortSignal,
): Promise<StartOutcome> {
  return await startRun({
    flow_inline: { id: input.flowId, stages: input.stages },
    draft_id: input.draftId,
    test: input.test ?? false,
  }, signal)
}

// ── the family currency (the {model:} door's model ids) ───────────

/** The catalog's cards section (GET /v1/model-catalog — the
 *  discovery door, same-origin, bearer-free from the page): card id
 *  → its boarded families, first = the DEFAULT family (form-spec's
 *  card-id alias law parity: boarded[0]). The runs door resolves
 *  NEITHER card ids nor aliases — callers hand startCardRun the
 *  family from HERE. Cached per session (the catalog is static per
 *  boot; one door round trip, every consumer shares it). */
export async function fetchCardFamilies(signal?: AbortSignal): Promise<Record<string, string[]>> {
  if (cardFamiliesCache !== null) return cardFamiliesCache
  const res = await fetch('/v1/model-catalog', { ...(signal === undefined ? {} : { signal }) })
  const body: unknown = await res.json().catch(() => null)
  const cards = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)['cards'] : undefined
  const out: Record<string, string[]> = {}
  if (typeof cards === 'object' && cards !== null) {
    for (const [id, row] of Object.entries(cards as Record<string, unknown>)) {
      if (typeof row !== 'object' || row === null) continue
      const fams = (row as Record<string, unknown>)['families']
      out[id] = Array.isArray(fams) ? fams.filter((x): x is string => typeof x === 'string') : [id]
    }
  }
  cardFamiliesCache = out
  return out
}

let cardFamiliesCache: Record<string, string[]> | null = null

/** Drop the family cache (tests isolate; a long-lived surface could
 *  refresh after a models re-scan). */
export function resetCardFamiliesCache(): void {
  cardFamiliesCache = null
}

/** Resolve a card's DEFAULT family (boarded[0]); the card id itself
 *  when the catalog names none (mask-studio-style self-services). */
export async function defaultFamilyForCard(cardId: string, signal?: AbortSignal): Promise<string> {
  const families = await fetchCardFamilies(signal)
  return families[cardId]?.[0] ?? cardId
}

// ── the poll loop ─────────────────────────────────────────────────

/** pollRunStageUrl's knobs. */
export interface PollStageOpts {
  /** Fires exactly once when the stage's artifact url lands. */
  onUrl(url: string): void
  /** Default 1500ms (the run pump's own observation granularity). */
  intervalMs?: number
}

/** THE ARTIFACT POLL (the old pollFlowRun law): the run is the SSOT —
 *  check the stage's url immediately, then on the cadence until it
 *  lands (onUrl once, resolve), the run settles without one (resolve
 *  silent — the caller's empty state is honest), or signal aborts.
 *
 *  THE TWO ERROR CLASSES settle differently:
 *  - TRANSPORT failures (HTTP / malformed frames — the caller's
 *    voice prefix) are swallowed: the next poll may recover.
 *  - REFUSALS (WireRefusedError — the estate answered) on
 *    runs/status prove the run is NOT in the live map: nothing is
 *    executing for it (the registry writes the map at enqueue and
 *    keeps it for the process life; a disavowed id is a restart
 *    survivor or never existed). The file-era arm then consults the
 *    runs/list row ONCE and settles from it — its artifact url when
 *    it carries one, silent otherwise (file-era rows never update,
 *    so waiting would be the lie); no row at all settles silent the
 *    same way. This holds for "failed" rows too: a live run answers
 *    200 at the status door, so a refused status + failed list row
 *    is a dead run, not a blip. A transport-failed list read keeps
 *    the poll alive (the answer may land next cadence). */
export async function pollRunStageUrl(
  runId: string,
  stageId: string,
  opts: PollStageOpts,
  signal?: AbortSignal,
): Promise<void> {
  const interval = opts.intervalMs ?? 1500
  const sleep = (ms: number): Promise<'slept' | 'abort'> =>
    new Promise((resolve) => {
      const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve('slept') }, ms)
      const onAbort = (): void => { clearTimeout(t); resolve('abort') }
      if (signal?.aborted === true) { onAbort(); return }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  while (signal?.aborted !== true) {
    let row: RunStatusRow
    try {
      row = await fetchRunStatus(runId, signal)
    } catch (e: unknown) {
      if (e instanceof WireRefusedError) {
        try {
          const listed = await fetchListRow(runId, signal)
          const url = listed !== null ? listRowMediaUrl(listed) : null
          if (url !== null) opts.onUrl(url)
          return // settled — the url fired, or silence is the honest face
        } catch (listErr) {
          if (listErr instanceof WireRefusedError) return // the list refuses: no such row — silent
          // the list read died on TRANSPORT: the answer may land
          // next cadence, so the poll stays alive (fall through)
        }
      }
      row = { runId, status: 'unknown', draftId: null, stages: [] } // next poll may recover
    }
    const stage = row.stages.find((s) => s.id === stageId)
      ?? (row.stages.length === 1 ? row.stages[0] : undefined)
    if (stage !== undefined && typeof stage.url === 'string' && stage.url !== '') {
      opts.onUrl(stage.url)
      return
    }
    if (isTerminalRun(row.status)) return
    const woke = await sleep(interval)
    if (woke === 'abort') return
  }
}
