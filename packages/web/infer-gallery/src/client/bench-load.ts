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

/** The error message an !ok JSON response carries, else HTTP n. */
async function refusalOf(res: Response, answer: unknown): Promise<string> {
  const err = (answer as Record<string, unknown> | null)?.['error']
  return typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(res.status)
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadDraftOntoBench(draftId: string, deps: BenchLoadDeps): Promise<void> {
  const BENCH_SESSION = benchSessionOf(deps.sessionId)
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

    // 2. THE CAS READ — the shared bench's current rev (birth arm on
    //    any miss: ensure is the only arm that may create).
    let expectRev: number | undefined
    const getRes = await fetch('/v1/bench/' + encodeURIComponent(BENCH_SESSION), {
      headers: { accept: 'application/json' },
    })
    if (getRes.ok) {
      const cur: unknown = await getRes.json().catch(() => null)
      const rev = (cur as Record<string, unknown> | null)?.['rev']
      if (typeof rev === 'number') expectRev = rev
    }

    // 3. THE LOAD — stages replace; expect_rev carries the CAS.
    const ensureRes = await fetch('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: BENCH_SESSION,
        author: 'user',
        stages: Array.isArray(stages) ? stages : [],
        ...(typeof intent === 'string' ? { intent } : {}),
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
    const flowDraft = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['draft_id']
      : undefined
    const topDraft = (side as Record<string, unknown>)['draft_id']
    const draftId = typeof flowDraft === 'string' && flowDraft !== ''
      ? flowDraft
      : typeof topDraft === 'string' && topDraft !== '' ? topDraft : ''
    if (draftId === '') {
      deps.onError('this run names no draft — nothing to restore')
      return
    }
    await loadDraftOntoBench(draftId, deps)
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}
