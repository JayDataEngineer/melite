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
export {};
/** One run stage as the status door serves it (url already rewritten
 *  by readRunStatus — consumers never see the bare name). */
export interface RunStageStatus {
    id: string;
    status: string;
    engine?: string;
    url?: string;
    /** The stage's failure text, served verbatim by the status door
     *  (the ComfyUI validation refusal, the asset miss). A failed run
     *  with no visible reason reads as "no response at all"; the
     *  observer carries THIS onto the bench row so the tile can
     *  render it (2026-09-13, the silent-failure cure). */
    error?: string;
    /** Completed stages carry the full artifact name list ({name}
     *  rows — the queue stamps stage["gallery"] alongside url; the
     *  harvest carry reads it to feed studio adapters real data). */
    gallery?: {
        name: string;
    }[];
    /** LIVE progress while the stage runs (2026-09-13, the operator's
     *  "forward the comfyui progress webhooks like before"): the
     *  engine's /ws tap folds {value,max} per KSampler step onto the
     *  run row; the status door serves stages VERBATIM. Absent on
     *  terminal rows (the finisher deletes it). */
    progress?: {
        value: number;
        max: number;
    };
    /** The live activity line ("sampling 7/20", "node 12") — the tap's
     *  activity fold, same channel as progress. */
    activity?: string;
    result_outputs?: Record<string, unknown>;
}
/** The runs/status row, normalized once. */
export interface RunStatusRow {
    runId: string;
    status: string;
    draftId: string | null;
    stages: RunStageStatus[];
    /** The run-level failure text (the same channel the stages carry;
     *  the observer's fallback when no single stage owns the reason). */
    error?: string;
}
export { isTerminalStatus as isTerminalRun, TERMINAL_RUN_STATUSES, RUN_STATUS_WORDS } from '@melite/contracts/stageView';
/** The ONE media-url rewrite (readRunStatus + the file-era list
 *  fallback share it): bare run-relative names ride the estate's
 *  media route (/melite-media/runs/<runId>/<rel>); urls that already
 *  carry a scheme or lead with / pass verbatim (never double-encoded). */
export declare function toRunMediaUrl(runId: string, url: string): string;
/** Normalize a runs/status doc: stage rows distilled, bare run-
 *  relative urls rewritten onto the estate's media route (absolute
 *  and leading-/ urls pass verbatim — the one rewrite, never two). */
export declare function readRunStatus(runId: string, doc: Record<string, unknown>): RunStatusRow;
/** The list row's served artifact url onto the media route. The
 *  list's currency DIFFERS from the status door's: runArtifacts
 *  serves urls already prefixed with the run dir
 *  (`<runId>/<rel>` — `url: runBase + "/" + cand.rel`), while live
 *  stage urls are bare rels (runRel strips the dir). So the list
 *  url rides under the route root directly — prepending the run id
 *  again would double it. Absolute and rooted urls pass verbatim. */
export declare function listArtifactMediaUrl(url: string): string | null;
/** The list row's first media artifact url, rewritten onto the media
 *  route (the row's own currency is run-prefixed, like the
 *  thumbnail). Truncated markers carry no url and are skipped. */
export declare function listRowMediaUrl(row: Record<string, unknown>): string | null;
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
export declare function fetchCardCatalogRows(signal?: AbortSignal): Promise<Record<string, Record<string, unknown>>>;
/** Drop the catalog cache (tests isolate; a long-lived surface could
 *  refresh after a models re-scan). The generation turns too, so a
 *  read that started BEFORE the reset never refills the cache when
 *  it lands late — the next read fetches fresh. */
export declare function resetCardFamiliesCache(): void;
/** The family currency (the {model:} door's model ids — the cards
 *  section's projection): card id → its boarded families, first = the
 *  DEFAULT family (form-spec's card-id alias law: boarded[0]). The
 *  runs door resolves NEITHER card ids nor aliases — callers hand the
 *  start verb the family from HERE. Rides the one reader + cache
 *  above. */
export declare function fetchCardFamilies(signal?: AbortSignal): Promise<Record<string, string[]>>;
/** Resolve a card's DEFAULT family (boarded[0]); the card id itself
 *  when the catalog names none (mask-studio-style self-services). */
export declare function defaultFamilyForCard(cardId: string, signal?: AbortSignal): Promise<string>;
//# sourceMappingURL=index.d.ts.map
