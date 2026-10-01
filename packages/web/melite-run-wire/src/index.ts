import { RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage"

/**
 * melite-run-wire — the run-status PURE laws + the catalog door
 * (stroke 81, the one-lane restructure).
 *
 * HISTORY: this package was the estate's browser transport (the
 * runs wire SSOT, 2026-09-12) and carried a DOCUMENTED DEVIATION —
 * it minted its own rpcIds and hand-wrote client-request envelopes,
 * which the api-gateway law reserves to the Connection. The H1
 * program (docs/CONFORMANCE_LEDGER.md) is now CLOSED: every
 * transport verb rides the mounted Typert namespaces in
 * melite-card-view (estate-remote.ts binds them; runs-policy.ts
 * carries the run verbs; the media/list verb lives in
 * cards-resource.ts). What remains HERE is transport-free:
 *
 *   - the status-row grammar (RunStageStatus / RunStatusRow) and
 *     its ONE normalize (readRunStatus);
 *   - the ONE media-url rewrite (toRunMediaUrl) and the list-row
 *     url laws (listArtifactMediaUrl / listRowMediaUrl);
 *   - the terminal vocabulary (isTerminalRun);
 *   - the catalog door (fetchCardFamilies / defaultFamilyForCard —
 *     GET /v1/model-catalog, a plain same-origin door, not an
 *     estate remote).
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

/** The runs/status row, normalized once. */
export interface RunStatusRow {
  runId: string
  status: string
  draftId: string | null
  stages: RunStageStatus[]
  /** The run-level failure text (the same channel the stages carry;
   *  the observer's fallback when no single stage owns the reason). */
  error?: string
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
  return {
    runId,
    status,
    draftId: typeof doc['draft_id'] === 'string' && (doc['draft_id'] as string) !== ''
      ? (doc['draft_id'] as string)
      : null,
    stages,
    ...(typeof doc['error'] === 'string' && doc['error'] !== '' ? { error: doc['error'] as string } : {}),
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

// ── the family currency (the {model:} door's model ids) ───────────

/** The catalog's cards section (GET /v1/model-catalog — the
 *  discovery door, same-origin, bearer-free from the page): card id
 *  → its boarded families, first = the DEFAULT family (form-spec's
 *  card-id alias law: boarded[0]). The runs door resolves
 *  NEITHER card ids nor aliases — callers hand the start verb the
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
