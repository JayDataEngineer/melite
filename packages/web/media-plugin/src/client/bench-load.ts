/**
 * bench-load — the draft-row gesture of the media planes (MediaPanel's
 * Flows face + the Flows tab), 2026-09-10 (the bench rework's hunk 4:
 * the DECK_OPEN_WITH_DRAFT window seam retired with the deck takeover).
 *
 * The gesture realizes "one shared state": a draft row click LOADS that
 * draft's stages onto THE BENCH (POST /v1/bench/ensure — the same load
 * wire melite_flow's bench verb rides; stages replace, the append-only
 * log records a load entry, undo restores) and then opens the cards
 * tab. The user refines on the bench — the same state the agent edits.
 *
 * All wires are same-origin doors the host already serves; failures
 * surface as honest caller-side errors, never thrown past React.
 */

/** The bench session the cards tab serves (melite-tools' DEFAULT_BENCH). */
const BENCH_SESSION = 'main'

/** The bench tab's address (cross-plugin contract, the estate-artifact
 *  pattern: client bundles cannot import across plugins, so the prefix
 *  is restated with its definition site named — cards-resource.ts). */
export const CARDS_BENCH_ADDRESS = 'dsh-resource://cards/bench'

/** The run tab's address (same contract; the wand's target). */
export function cardsRunAddress(runId: string): string {
  return 'dsh-resource://cards/run/' + encodeURIComponent(runId)
}

export interface BenchLoadDeps {
  /** The tab action every tab body receives (useTabInfo().tab.actions). */
  openResource(address: string): void
  /** Honest inline error surface (the panel's setError). */
  onError(message: string): void
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadDraftOntoBench(draftId: string, deps: BenchLoadDeps): Promise<void> {
  try {
    const docRes = await fetch('/v1/flows/drafts/' + encodeURIComponent(draftId), {
      headers: { accept: 'application/json' },
    })
    const doc: unknown = await docRes.json().catch(() => null)
    if (!docRes.ok || typeof doc !== 'object' || doc === null) {
      const err = (doc as Record<string, unknown> | null)?.['error']
      deps.onError('could not read that card (' + (typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(docRes.status)) + ')')
      return
    }
    const stages = (doc as Record<string, unknown>)['stages']
    const intent = (doc as Record<string, unknown>)['intent']
    const ensureRes = await fetch('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: BENCH_SESSION,
        author: 'user',
        stages: Array.isArray(stages) ? stages : [],
        ...(typeof intent === 'string' ? { intent } : {}),
      }),
    })
    const answer: unknown = await ensureRes.json().catch(() => null)
    if (!ensureRes.ok) {
      const err = (answer as Record<string, unknown> | null)?.['error']
      deps.onError('the bench refused the load (' + (typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(ensureRes.status)) + ')')
      return
    }
    deps.openResource(CARDS_BENCH_ADDRESS)
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}
