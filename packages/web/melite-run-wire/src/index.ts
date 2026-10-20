import { RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage"

/**
 * melite-run-wire — the run-status PURE laws + the catalog door
 * (stroke 81, the one-lane restructure).
 *
 * HISTORY: this package was the estate's browser transport (the
 * runs wire SSOT, 2026-09-12) and carried a DOCUMENTED DEVIATION —
 * it minted its own rpcIds and hand-wrote client-request envelopes,
 * which the api-gateway law reserves to the Connection. The H1
 * program is now CLOSED: every transport verb rides the mounted
 * Typert namespaces in
 * melite-card-view (estate-remote.ts binds them; runs-policy.ts
 * carries the run verbs; the media/list verb lives in
 * cards-resource.ts). What remains HERE is transport-free:
 *
 *   - the status-row grammar (RunStageStatus / RunStatusRow) and
 *     its ONE normalize (readRunStatus);
 *   - the ONE media-url rewrite (toRunMediaUrl) and the list-row
 *     url laws (listArtifactMediaUrl / listRowMediaUrl);
 *   - the terminal vocabulary (isTerminalRun);
 *   - the catalog door (fetchCardCatalogRows — the ONE /v1/model-catalog
 *     reader + cache, D6 2026-11-05; fetchCardFamilies and card-base's
 *     fetchCardCatalog are its projections — a plain same-origin door,
 *     not an estate remote).
 *
 * Consumers import these laws; nothing in this package fetches an
 * /api envelope.
 */
export { }

// ── the run status law ────────────────────────────────────────────

/** One run stage as the status door serves it (url already rewritten
 *  by readRunStatus — consumers never see the bare name). */
export interface RunStageStatus {
  id: string
  status: string
  engine?: string
  url?: string
  /** The stage's failure text, served verbatim by the status door
   *  (the ComfyUI validation refusal, the asset miss). A failed run
   *  with no visible reason reads as "no response at all"; the
   *  observer carries THIS onto the bench row so the tile can
   *  render it (2026-09-13, the silent-failure cure). */
  error?: string
  /** Completed stages carry the full artifact name list ({name}
   *  rows — the queue stamps stage["gallery"] alongside url; the
   *  harvest carry reads it to feed studio adapters real data). */
  gallery?: { name: string }[]
  /** LIVE progress while the stage runs (2026-09-13, the operator's
   *  "forward the comfyui progress webhooks like before"): the
   *  engine's /ws tap folds {value,max} per KSampler step onto the
   *  run row; the status door serves stages VERBATIM. Absent on
   *  terminal rows (the finisher deletes it). */
  progress?: { value: number; max: number }
  /** The live activity line ("sampling 7/20", "node 12") — the tap's
   *  activity fold, same channel as progress. */
  activity?: string
  result_outputs?: Record<string, unknown>
}

/** One stage's queue-time doc→graph evidence (the served-graph
 *  receipt's per-stage row, the silent UI-drop purge's P1): which of
 *  the stage's doc scalars the composed graph carries, which it
 *  dropped. Verdict 'complete' carries dropped []. */
export interface GraphReceiptStageRow {
  stage: string
  nodes: number
  populated: string[]
  carried: string[]
  dropped: string[]
  verdict: 'complete' | 'partial'
  /** The refmod bake's record (present iff the graph bakes/loads a mod). */
  bake?: GraphReceiptBake
}

/** The refmod bake's receipt (study §7 item 2 — the bake is priced,
 *  never silent): the graph-stated dials verbatim, the baked media
 *  count, the film's window count, and the run-voice price string. */
export interface GraphReceiptBake {
  source: 'baked' | 'stems'
  mode?: string
  pool?: number
  refinement_steps?: number
  save?: boolean
  visual_refs?: number
  stems?: number
  windows: number
  price: string
}

/** The run-level graph receipt (the sidecar's `graph_receipt`,
 *  served on the live status row beside it): the per-stage rows
 *  folded, the folder's own verdict over them. `prompt_id` is the
 *  execute stamp (the engine-minted id, folded at the outcome —
 *  absent on rows read before the run executed). */
export interface GraphReceipt {
  nodes: number
  populated: string[]
  carried: string[]
  dropped: string[]
  verdict: 'complete' | 'partial'
  stages: GraphReceiptStageRow[]
  prompt_id?: string
  /** The first stage's bake record (the card run's single stage). */
  bake?: GraphReceiptBake
}

/** The runs/status row, normalized once. */
export interface RunStatusRow {
  runId: string
  status: string
  draftId: string | null
  stages: RunStageStatus[]
  /** The run-level failure text (the same channel the stages carry;
   *  the observer's fallback when no single stage owns the reason). */
  error?: string
  /** The queue-time doc→graph evidence (the silent UI-drop purge's
   *  P1) — carried verbatim after the defensive fold below. Absent
   *  on runs that composed nothing (inline envelopes stamp none)
   *  and on rows whose receipt is malformed (a broken receipt is no
   *  receipt — the status word keeps the row's only refusal). */
  graph_receipt?: GraphReceipt
}

// THE TERMINAL VOCABULARY IS THE CONTRACT'S (2026-10-13, the card-UI
// duplication audit): five seats spelled "is this run finished?" with
// their own sets, and they disagreed — one treated `unknown` as
// terminal and `error` as live, another the reverse, so a run in
// either word never stopped a poller on one plane. `@melite/contracts`
// stageView is the one owner (the estate's own RunStatus plus the two
// wire-only words: `error` is the run record's failure stamp, `unknown`
// is a schema value). These names stay so existing importers ride the
// same truth.
export { isTerminalStatus as isTerminalRun, TERMINAL_RUN_STATUSES, RUN_STATUS_WORDS } from '@melite/contracts/stageView'
import { RUN_STATUS_WORDS } from '@melite/contracts/stageView'

/** The ONE media-url rewrite (readRunStatus + the file-era list
 *  fallback share it): bare run-relative names ride the estate's
 *  media route (/melite-media/runs/<runId>/<rel>); urls that already
 *  carry a scheme or lead with / pass verbatim (never double-encoded). */
export function toRunMediaUrl(runId: string, url: string): string {
  if (url === '') return ''
  if (!/^(https?:\/\/|\/)/.test(url)) {
    return RUN_MEDIA_PREFIX + '/' + encodeURIComponent(runId) + '/'
      + url.split('/').map((seg) => encodeURIComponent(seg)).join('/')
  }
  return url
}

/** Fold the served `graph_receipt` face (the silent UI-drop
 *  purge's P1): the queue-time doc→graph evidence rides the live
 *  row beside the sidecar, same spelling. DEFENSIVE: a malformed
 *  receipt is ABSENT (never a throw — the status word keeps the
 *  row's only refusal; the receipt is evidence, and a broken
 *  receipt is no receipt). Every list must be all strings, every
 *  stage row well-formed, the verdict inside the vocabulary —
 *  anything else folds to undefined. */
export function readGraphReceipt(value: unknown): GraphReceipt | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const doc = value as Record<string, unknown>
  const verdict = doc['verdict']
  if (verdict !== 'complete' && verdict !== 'partial') return undefined
  if (typeof doc['nodes'] !== 'number') return undefined
  const lists: Record<string, string[]> = {}
  for (const key of ['populated', 'carried', 'dropped']) {
    const raw: unknown = doc[key]
    if (!Array.isArray(raw) || !raw.every((entry): entry is string => typeof entry === 'string')) return undefined
    lists[key] = [...raw]
  }
  const rawStages: unknown = doc['stages']
  if (!Array.isArray(rawStages)) return undefined
  const stages: GraphReceiptStageRow[] = []
  for (const raw of rawStages) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
    const row = raw as Record<string, unknown>
    if (typeof row['stage'] !== 'string' || typeof row['nodes'] !== 'number') return undefined
    if (row['verdict'] !== 'complete' && row['verdict'] !== 'partial') return undefined
    const rowLists: Record<string, string[]> = {}
    for (const key of ['populated', 'carried', 'dropped']) {
      const rawList: unknown = row[key]
      if (!Array.isArray(rawList) || !rawList.every((entry): entry is string => typeof entry === 'string')) return undefined
      rowLists[key] = [...rawList]
    }
    stages.push({
      stage: row['stage'] as string,
      nodes: row['nodes'] as number,
      populated: rowLists['populated'] as string[],
      carried: rowLists['carried'] as string[],
      dropped: rowLists['dropped'] as string[],
      verdict: row['verdict'] as 'complete' | 'partial',
    })
  }
  const stamped: unknown = doc['prompt_id']
  if (stamped !== undefined && typeof stamped !== 'string') return undefined
  return {
    nodes: doc['nodes'] as number,
    populated: lists['populated'] as string[],
    carried: lists['carried'] as string[],
    dropped: lists['dropped'] as string[],
    verdict,
    stages,
    ...(typeof stamped === 'string' && stamped !== '' ? { prompt_id: stamped } : {}),
  }
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
    if (typeof stage.error !== 'string' || stage.error === '') {
      delete stage.error
    }
    // progress normalize (the tap fold): keep only well-formed
    // {value,max} pairs; anything else drops (terminal rows carry
    // none — the finisher deletes).
    const p = stage.progress
    if (
      p === undefined ||
      typeof p !== 'object' ||
      typeof p.value !== 'number' ||
      typeof p.max !== 'number'
    ) {
      delete stage.progress
    }
    if (typeof stage.activity !== 'string' || stage.activity === '') {
      delete stage.activity
    }
  }
  // THE READ DOOR THROWS (schema-strictness fix 3, 2026-10-01): a
  // status word outside the fold's domain (RUN_STATUS_WORDS,
  // @melite/contracts/stageView) is corruption, not a state — the old
  // ':unknown' default handed garbage to the fold, which buried it as
  // a terminal. melite-card-view's run view wraps this and fails the
  // card visibly; card-base's fetchRunStatus lets it propagate as a
  // failed read.
  const status = doc['status']
  if (typeof status !== 'string' || !RUN_STATUS_WORDS.has(status.toLowerCase())) {
    throw new Error(
      `runs/status ${runId}: run-level status ${JSON.stringify(status)} is outside the vocabulary`,
    )
  }
  // THE GRAPH RECEIPT (the silent UI-drop purge's P1): folded
  // defensively — a malformed receipt rides absent, never a throw.
  const receipt = readGraphReceipt(doc['graph_receipt'])
  return {
    runId,
    status,
    draftId: typeof doc['draft_id'] === 'string' && (doc['draft_id'] as string) !== ''
      ? (doc['draft_id'] as string)
      : null,
    stages,
    ...(typeof doc['error'] === 'string' && doc['error'] !== '' ? { error: doc['error'] as string } : {}),
    ...(receipt !== undefined ? { graph_receipt: receipt } : {}),
  }
}

// ── the list-row url laws ─────────────────────────────────────────

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
  return RUN_MEDIA_PREFIX + '/'
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

// ── the catalog door (the ONE /v1/model-catalog reader + cache) ───

/** The wire dial (audit X-E1, the card-base wire's law): every fetch
 *  rides a socket with a bound — a caller signal ANDed with the dial,
 *  never a bare socket. Reads are small same-origin JSON. */
const READ_DIAL_MS = 20_000

/** The caller's signal ANDed with the dial — either side lifting the
 *  fetch aborts it (the provisioning seam's own shape). */
function dialed(signal: AbortSignal | undefined, dialMs: number): AbortSignal {
  const dial = AbortSignal.timeout(dialMs)
  return signal === undefined ? dial : AbortSignal.any([signal, dial])
}

/** Read the same-origin /v1/model-catalog door. Non-200 → named throw
 *  (the door's own error text when present); a 200 whose body does
 *  not parse to an object is a served-plane misconfiguration and
 *  refuses loud too (never a silent empty table). */
async function catalogGet(signal?: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetch('/v1/model-catalog', { signal: dialed(signal, READ_DIAL_MS) })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined
    throw new Error(typeof err === 'string' ? err : '/v1/model-catalog: HTTP ' + String(res.status))
  }
  if (typeof body !== 'object' || body === null) throw new Error('/v1/model-catalog: unreadable body')
  return body as Record<string, unknown>
}

let cardCatalogRowsCache: Record<string, Record<string, unknown>> | null = null
let cardCatalogRowsInflight: { gen: number, read: Promise<Record<string, Record<string, unknown>>> } | null = null
let cardCatalogRowsGen = 0

/** The catalog's cards section, read ONCE per session (the ONE door +
 *  cache law, nativity audit 2026-11-05 D6 — card-base's
 *  fetchCardCatalog projection rides THIS reader; there is no second
 *  GET of the door anywhere). Each row is the served JSON verbatim;
 *  projections narrow their own fields. Cached per session (the
 *  catalog is static per boot; one door round trip, every consumer
 *  shares it; concurrent cold starts share the one in-flight read).
 *  A reset (re-scan) INVALIDATES in-flight reads too: a stale
 *  resolve never refills the dropped cache (the generation guard —
 *  the late answer lands nowhere, the next read fetches fresh).
 * @param signal - caller cancellation, ANDed with the read dial.
 * @returns the cards section: card id → its served row. */
export async function fetchCardCatalogRows(signal?: AbortSignal): Promise<Record<string, Record<string, unknown>>> {
  if (cardCatalogRowsCache !== null) return cardCatalogRowsCache
  cardCatalogRowsInflight ??= {
    gen: cardCatalogRowsGen,
    read: (async (): Promise<Record<string, Record<string, unknown>>> => {
      const body = await catalogGet(signal)
      const raw: unknown = body['cards']
      const out: Record<string, Record<string, unknown>> = {}
      if (typeof raw === 'object' && raw !== null) {
        for (const [id, row] of Object.entries(raw as Record<string, unknown>)) {
          if (typeof row !== 'object' || row === null) continue
          out[id] = row as Record<string, unknown>
        }
      }
      return out
    })(),
  }
  const seat = cardCatalogRowsInflight
  try {
    const rows = await seat.read
    if (seat.gen === cardCatalogRowsGen) cardCatalogRowsCache = rows
    return rows
  } finally {
    if (cardCatalogRowsInflight === seat) cardCatalogRowsInflight = null
  }
}

/** Drop the catalog cache (tests isolate; a long-lived surface could
 *  refresh after a models re-scan). The generation turns too, so a
 *  read that started BEFORE the reset never refills the cache when
 *  it lands late — the next read fetches fresh. */
export function resetCardFamiliesCache(): void {
  cardCatalogRowsCache = null
  cardCatalogRowsInflight = null
  cardCatalogRowsGen += 1
}

/** The family currency (the {model:} door's model ids — the cards
 *  section's projection): card id → its boarded families, first = the
 *  DEFAULT family (form-spec's card-id alias law: boarded[0]). A row
 *  with no families array carries NO family ([]) — the client half
 *  of the minted-model kill (2026-10-12 server, this seat
 *  2026-11-08): the old `: [id]` minted the card's own id as a
 *  family, the same lie the server cut from cardSections. The runs
 *  door resolves NEITHER card ids nor aliases — callers hand the
 *  start verb the family from HERE, or the explicit card-unit alias
 *  when the table carries none. Rides the one reader + cache
 *  above. */
export async function fetchCardFamilies(signal?: AbortSignal): Promise<Record<string, string[]>> {
  const rows = await fetchCardCatalogRows(signal)
  const out: Record<string, string[]> = {}
  for (const [id, row] of Object.entries(rows)) {
    const fams: unknown = row['families']
    out[id] = Array.isArray(fams) ? fams.filter((x): x is string => typeof x === 'string') : []
  }
  return out
}

/** Resolve a card's DEFAULT family (boarded[0]) — null when the
 *  catalog carries the card with NO family (lawful family-less; the
 *  RUN seat maps null to the card-unit address explicitly against
 *  admitStageModel's card-unit arm). THROWS when the catalog does
 *  not carry the card at all — the writer's old `?? cardId` minted
 *  the card id as its own family (operator 2026-11-08: a fallback
 *  is a hidden error), the exact pattern the minted-model kill
 *  executed server-side. An absent row is an error, never a silent
 *  self-default. */
export async function defaultFamilyForCard(cardId: string, signal?: AbortSignal): Promise<string | null> {
  const families = await fetchCardFamilies(signal)
  if (!Object.prototype.hasOwnProperty.call(families, cardId)) {
    throw new Error(`card '${cardId}' is not carried by the catalog (no /v1/model-catalog row — the run seat cannot default its family)`)
  }
  return families[cardId]?.[0] ?? null
}
