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
 *  load writes the ACTIVE session's bench, never a stranger's).
 *  THE ONE SPELLING (the li-ay stroke): the sanitize decision used
 *  to be this file's own function over the imported grammar; the
 *  decision now lives beside its grammar on the contract floor and
 *  every seat (this client, the cards tab, the agent tool) imports
 *  the same function. */
/** The bench tab's address for one session (cross-plugin contract,
 * the estate-artifact pattern: client bundles cannot import across
 * plugins, so the form is restated with its definition site named —
 * cards-resource.ts's benchAddressOf). */
export declare function cardsBenchAddress(sessionId: string | undefined): string;
/** The run tab's address (same contract; live runs open in the cards
 *  tab's run view — the wand restores through the bench address
 *  instead, so this twin stays for address-compat, pinned by the
 *  wall + the codec test). */
export declare function cardsRunAddress(runId: string): string;
export interface BenchLoadDeps {
    /** The tab action every tab body receives (useTabInfo().tab.actions). */
    openResource(address: string): void;
    /** Honest inline error surface (the panel's setError). */
    onError(message: string): void;
    /** The conversation the gallery serves (the session-scoped slot's
     *  standard sessionId prop); unattributed seats load 'main'. */
    sessionId?: string;
}
/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export declare function loadDraftOntoBench(draftId: string, deps: BenchLoadDeps): Promise<void>;
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
export declare function loadRunOntoBench(runId: string, deps: BenchLoadDeps): Promise<void>;
//# sourceMappingURL=bench-load.d.ts.map
