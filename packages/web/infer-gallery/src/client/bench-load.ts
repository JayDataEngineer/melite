/**
 * bench-load — the restore gestures of the media plane (MediaPanel's
 * wand + its Flows face), 2026-09-10 (the bench rework's hunk 4: the
 * DECK_OPEN_WITH_DRAFT window seam retired with the deck takeover);
 * FULL PORT 2026-09-11 onto the gallery's routes + the CAS law.
 *
 * The gesture realizes "one shared state": a draft row click LOADS that
 * draft's stages onto THE BENCH (POST /v1/bench/ensure — the same load
 * wire melite_flow's bench verb rides; stages replace, the append-only
 * log records a load entry, undo restores) and then opens the cards
 * tab. The user refines on the bench — the same state the agent edits.
 *
 * THE CAS READ-MODIFY-WRITE (the door's own law, upgraded since the
 * original port): under persistent storage the shared bench SURVIVES
 * runs — a bare {stages} ensure on an existing bench refuses
 * bench/cas-conflict. Read the row first (GET /v1/bench/<session>); a
 * live bench's rev rides as expect_rev, a missing bench births (no
 * expect_rev — the only arm that may create).
 *
 * All wires are same-origin doors the host already serves; failures
 * surface as honest caller-side errors, never thrown past React.
 */

/** One bench session key — 'main' only for unattributed seats
 *  (stroke 44: the bench belongs to the conversation; the gallery's
 *  load writes the ACTIVE session's bench, never a stranger's). */
const BENCH_SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/

function benchSessionOf(id: string | undefined): string {
  return typeof id === 'string' && BENCH_SESSION_RE.test(id) ? id : 'main'
}

/** The bench tab's address for one session (cross-plugin contract,
 * the estate-artifact pattern: client bundles cannot import across
 * plugins, so the form is restated with its definition site named —
 * cards-resource.ts's benchAddressOf). */
export function cardsBenchAddress(sessionId: string | undefined): string {
  return 'dsh-resource://cards/bench/' + benchSessionOf(sessionId)
}

/** The run tab's address (same contract; live runs open in the cards
 *  tab's run view — the wand restores through the bench address
 *  instead, so this twin stays for address-compat, pinned by the
 *  wall + the codec test). */
export function cardsRunAddress(runId: string): string {
  return 'dsh-resource://cards/run/' + encodeURIComponent(runId)
}

export interface BenchLoadDeps {
  /** The tab action every tab body receives (useTabInfo().tab.actions). */
  openResource(address: string): void
  /** Honest inline error surface (the panel's setError). */
  onError(message: string): void
  /** The conversation the gallery serves (the session-scoped slot's
   *  standard sessionId prop); unattributed seats load 'main'. */
  sessionId?: string
}

/** The run's own preview, stamped onto the restored stage (stroke
 *  45b, the operator's catch: the flow loaded but the card showed no
 *  image — a ran stage's result {run_id, url} IS the preview the
 *  cards tile renders; the media-sidebar audit 2026-09-22: the stamp
 *  was image-only, so every restored TTS / video / 3D card landed
 *  with NO preview). _flow.json.artifacts are absolute paths; the
 *  URL is the GALLERY'S OWN same-origin artifact route carrying the
 *  run-relative tail (the mask-recovery break's second half, live
 *  proof: /melite-media/* 502s 'estate-media/no-queue-seat' on a
 *  host without the queue seat, while /infer-gallery/artifact
 *  serves the same file 200 — the preview is a BROWSER <img>/<video>
 *  src, so it must ride the route that serves in THIS host; the
 *  engine-side PATH params keep /melite-media — different consumer,
 *  the engine's own lane). THE KIND UNION is the preview seam's own
 *  vocabulary, restated (client bundles cannot import across
 *  plugins — the parity site is named: melite-card-view's
 *  preview-kinds.ts previewKindFor). */
function resultOfRun(
  flow: Record<string, unknown> | null,
  runId: string,
): Record<string, unknown> | undefined {
  const arts = flow?.['artifacts']
  if (!Array.isArray(arts)) return undefined
  const first = arts.find((a: unknown): a is string =>
    typeof a === 'string' && /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|m4v|mp3|wav|ogg|flac|m4a|aac|glb|gltf)$/i.test(a))
  if (first === undefined) return undefined
  const m = /\/(run-[A-Za-z0-9_-]+\/.+)$/.exec(first)
  if (m === null) return undefined
  return { run_id: runId, url: '/infer-gallery/artifact?path=' + encodeURIComponent(m[1]) }
}

/** The error message an !ok JSON response carries, else HTTP n. */
async function refusalOf(res: Response, answer: unknown): Promise<string> {
  const err = (answer as Record<string, unknown> | null)?.['error']
  return typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(res.status)
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
/** The shared load tail (stroke 45): stages onto THE conversation's
 *  bench (the CAS law — read rev, ensure with expect_rev, birth on
 *  miss) + open the cards tab on it. */
async function loadStagesOntoBench(
  stages: unknown[],
  intent: string,
  deps: BenchLoadDeps,
): Promise<void> {
  const BENCH_SESSION = benchSessionOf(deps.sessionId)
  try {
    // THE CAS READ — the shared bench's current rev (birth arm on
    // any miss: ensure is the only arm that may create).
    let expectRev: number | undefined
    const getRes = await fetch('/v1/bench/' + encodeURIComponent(BENCH_SESSION), {
      headers: { accept: 'application/json' },
    })
    if (getRes.ok) {
      const cur: unknown = await getRes.json().catch(() => null)
      const rev = (cur as Record<string, unknown> | null)?.['rev']
      if (typeof rev === 'number') expectRev = rev
    }
    // THE LOAD — stages replace; expect_rev carries the CAS, and
    // the click IS the confirmation (the overwrite law, 2026-09-15:
    // a user gesture declares what a composing agent must confirm).
    const ensureRes = await fetch('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: BENCH_SESSION,
        author: 'user',
        stages,
        intent,
        overwrite: true,
        ...(expectRev !== undefined ? { expect_rev: expectRev } : {}),
      }),
    })
    const answer: unknown = await ensureRes.json().catch(() => null)
    if (!ensureRes.ok) {
      deps.onError('the bench refused the load (' + await refusalOf(ensureRes, answer) + ')')
      return
    }
    deps.openResource(cardsBenchAddress(deps.sessionId))
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadDraftOntoBench(draftId: string, deps: BenchLoadDeps): Promise<void> {
  try {
    // 1. the draft doc (stages + intent).
    const docRes = await fetch('/v1/flows/drafts/' + encodeURIComponent(draftId), {
      headers: { accept: 'application/json' },
    })
    const doc: unknown = await docRes.json().catch(() => null)
    if (!docRes.ok || typeof doc !== 'object' || doc === null) {
      deps.onError('could not read that card (' + await refusalOf(docRes, doc) + ')')
      return
    }
    const stages = (doc as Record<string, unknown>)['stages']
    const intent = (doc as Record<string, unknown>)['intent']
    await loadStagesOntoBench(
      Array.isArray(stages) ? stages : [],
      typeof intent === 'string' && intent !== '' ? intent : 'restored draft',
      deps,
    )
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** Load one RUN's card onto the bench and open the cards tab.
 *  WHY THE SIDECAR (2026-09-11, the wand proof): the cards tab's run
 *  view hydrates from `runs/status`, which reads the registry's LIVE
 *  runs only — every settled run answers `runs/unknown-run`, so a
 *  wand that merely opens `cards/run/<id>` lands on a failure frame
 *  for the whole archive. The gallery host's sidecar route names the
 *  producing draft for settled runs too, so the wand resolves the
 *  draft itself and rides the same bench-load every other gesture
 *  uses — the workflow is back on the bench before the cards tab
 *  opens, for live and settled runs alike.
 *  @param runId the runs door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadRunOntoBench(runId: string, deps: BenchLoadDeps): Promise<void> {
  const BENCH_SESSION = benchSessionOf(deps.sessionId)
  try {
    const sideRes = await fetch('/infer-gallery/flow?run_id=' + encodeURIComponent(runId), {
      headers: { accept: 'application/json' },
    })
    const side: unknown = await sideRes.json().catch(() => null)
    if (!sideRes.ok || typeof side !== 'object' || side === null) {
      deps.onError('that run keeps no readable sidecar (' + await refusalOf(sideRes, side) + ')')
      return
    }
    const flow = (side as Record<string, unknown>)['flow']
    // THE RUN'S OWN RECORD WINS (stroke 45, the operator's law: "the
    // workflow that HAD that image"). draft_id names the MUTABLE
    // bench — re-reading it serves whatever the bench holds NOW, not
    // what ran. The card_snapshot (runs born after this law) is the
    // exact card + params; the verbatim request body (older runs) is
    // the honest floor. The living bench is NEVER the source.
    const snap = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['card_snapshot']
      : undefined
    // THE FULL WORKFLOW FIRST (stroke 45d): bench_snapshot is the
    // bench doc read at the Run press — every stage + intent as they
    // stood. The ran card (card_snapshot.card) carries the preview;
    // stale run state is stripped from every stage.
    const benchSnap = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['bench_snapshot']
      : undefined
    if (typeof benchSnap === 'object' && benchSnap !== null) {
      const bs = benchSnap as Record<string, unknown>
      const bsStages = Array.isArray(bs['stages'])
        ? (bs['stages'] as unknown[]).map((st) => ({ ...(st as Record<string, unknown>) }))
        : []
      if (bsStages.length > 1) {
        const ranCard = typeof snap === 'object' && snap !== null
          ? (snap as Record<string, unknown>)['card'] : undefined
        const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
        for (const st of bsStages as Record<string, unknown>[]) {
          delete st['result']; delete st['runStatus']; delete st['resolved']
          // THE SELF-NAMING MODEL STRIP (see the card arm's law below
          // — era stages ride the same strip before re-admission).
          const stParams = st['params']
          if (typeof st['card'] === 'string'
            && typeof stParams === 'object' && stParams !== null
            && (stParams as Record<string, unknown>)['model'] === st['card']) {
            delete (stParams as Record<string, unknown>)['model']
          }
          if (ranCard !== undefined && st['card'] === ranCard && result !== undefined) st['result'] = result
          st['provenance'] = 'restored'
        }
        const bsIntent = typeof bs['intent'] === 'string' && (bs['intent'] as string) !== '' ? bs['intent'] as string : 'restored run'
        await loadStagesOntoBench(bsStages, bsIntent.slice(0, 77), deps)
        return
      }
    }
    if (typeof snap === 'object' && snap !== null
      && typeof (snap as Record<string, unknown>)['card'] === 'string') {
      const card = (snap as Record<string, unknown>)['card'] as string
      const rawParams = (snap as Record<string, unknown>)['params']
      const params = typeof rawParams === 'object' && rawParams !== null
        ? { ...(rawParams as Record<string, unknown>) } : {}
      delete params['draft_id']; delete params['test']
      // THE SELF-NAMING MODEL STRIP (the mask-recovery break, live
      // proof run-ffbabb558cb8: the era's compose wire stamped
      // params.model = the card's own id — 40 archive runs carry it
      // (mask ×6, h3-timeline ×34) — and today's write-time admission
      // refuses a model the card does not board, so every restore of
      // them died 'model X is not offered by card X'. A model naming
      // the card itself is the family-less compose voice (stroke
      // 100's {model:} law), never a board request — and the run's
      // own bench_snapshot stage proves the ran stage carried no such
      // key. Strip it; a model naming a REAL family (image-gen's
      // z-image) rides untouched for admission to judge.
      if (params['model'] === card) delete params['model']
      const intentSrc = typeof params['prompt'] === 'string' ? params['prompt'] as string : 'restored run'
      const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
      const stages = [{ id: 's_0', engine: 'comfyui', card, params, provenance: 'restored', ...(result !== undefined ? { result } : {}) }]
      await loadStagesOntoBench(stages, intentSrc.slice(0, 77), deps)
      return
    }
    const request = (side as Record<string, unknown>)['request']
    if (typeof request === 'object' && request !== null && typeof (request as Record<string, unknown>)['model'] === 'string') {
      const params = { ...(request as Record<string, unknown>) }
      delete params['draft_id']; delete params['test']
      const intentSrc = typeof params['prompt'] === 'string' ? params['prompt'] as string : 'restored run'
      const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
      const stages = [{ id: 's_0', engine: 'comfyui', params, provenance: 'restored', ...(result !== undefined ? { result } : {}) }]
      await loadStagesOntoBench(stages, intentSrc.slice(0, 77), deps)
      return
    }
    const flowDraft = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['draft_id']
      : undefined
    const topDraft = (side as Record<string, unknown>)['draft_id']
    const draftId = typeof flowDraft === 'string' && flowDraft !== ''
      ? flowDraft
      : typeof topDraft === 'string' && topDraft !== '' ? topDraft : ''
    // THE MUTABLE-BENCH REFUSAL, run side (the media-sidebar audit
    // 2026-09-22): a bench-prefixed draft_id names the LIVING bench
    // — loading it serves whatever the bench holds NOW, never the
    // workflow that made this media (the panel's openCards refuses
    // the same ids on the row fast path). A snapshot-less bench-born
    // run is unrecoverable exactly; the honest error beats a wrong
    // workflow.
    if (draftId.startsWith('bench-')) {
      deps.onError('that run was born on a living bench and keeps no snapshot — nothing to restore exactly')
      return
    }
    if (draftId === '') {
      deps.onError('this run keeps no card record — nothing to restore')
      return
    }
    await loadDraftOntoBench(draftId, deps)
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}
