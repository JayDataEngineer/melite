/** Leading-int read (sidecar tails): optional space, optional
 *  sign, then digits; 0 when no digits lead. */
export declare function parseLeadingInt(s: string): number;
/** sidecar_num (editor_runs.297-303): first `"key":`, strtol the
 *  tail, default when the key is absent. */
export declare function sidecarNum(text: string, key: string, dflt: number): number;
/** sidecar_str (editor_runs.271-295): BYTE-wise exact — first
 *  `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \"
 *  \\ (any other escape lands literally — \u stays "u"), stop at
 *  cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
export declare function sidecarStr(raw: Uint8Array, key: string, cap: number): string;
/** _sidecar_str_impl found-ness (editor_runs.271-295 core): only
 *  the runs-list status site reads it (editor_runs.py) — a
 *  present-but-empty "status" serves "" (the gate then skips the
 *  row), while an absent/non-string key serves "unknown". */
export declare function sidecarStrFound(raw: Uint8Array, key: string, cap: number): [boolean, string];
export declare function artifactType(name: string): string;
interface MediaCand {
    readonly rel: string;
    readonly full: string;
}
/** _media_candidates (editor_runs.373-402): top-level files
 *  (non-underscore) then ONE level down (underscore + deeper dirs
 *  skipped), each tier byte-sorted. */
export declare function mediaCandidates(runDir: string): MediaCand[];
/** run_artifacts (editor_runs.404-430): image/video/audio/model
 *  rows (image capped at _MAX_IMGS — counted but unlisted past it),
 *  everything else skipped; the {truncated,listed,total} marker when
 *  entries went unlisted. path keeps the "./output/<run>/" literal. */
export declare function runArtifacts(runDir: string, outDirLiteral: string): Record<string, unknown>[];
/** _run_thumbnail (editor_runs.433-444): cached poster wins, else
 *  the first image candidate (same one-level rule, so nested-only
 *  runs still get a poster). */
export declare function runThumbnail(runDir: string, runId: string): string;
/** _run_dir_has_media (editor_runs.307-333): the media-FIRST
 *  sort key — top-level names, then one level down. NOTE the
 *  absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner
 *  isdir check (a nested DIR named x.mp4 counts) — probed live,
 *  mirrored exactly. Gallery sets only (svg/bmp classify but do
 *  not list — the media-kinds.json contract). */
export declare function runDirHasMedia(runDir: string): boolean;
/** The RunRow gate — the row dict, or null when run_wire would
 *  refuse it (the caller logs LOUD and skips). Key order is the
 *  RunRow field order. */
export declare function runRowOrNull(row: {
    run_id: string;
    name: string;
    flow: string;
    status: string;
    created_at: number;
    prompt: string;
    seed: number;
    thumbnail: string;
    artifacts: Record<string, unknown>[];
    params: Record<string, unknown>;
    draft_id: string;
    /** THE STAGE-ID DIGEST (commission 015, §6 finding 6): the ids
     *  of the stages the run composed. Optional — older sidecars
     *  predate the digest, and such runs cannot name their stages. */
    stage_ids?: string[];
    /** THE EXPORT NAME (023's self-critique #4/#6): optional —
     *  older sidecars predate it, and only export lanes stamp it. */
    export_name?: string;
    /** THE EXPORT PATH (the export FULL PATH): optional — the
     *  engine-reported minted .qvoice absolute path; older sidecars
     *  predate it, load lanes stamp nothing. */
    export_path?: string;
}): Record<string, unknown> | null;
/** Strict int parse: surrounding whitespace stripped, one optional
 *  sign, ASCII digits with single internal underscores ("1_0" ->
 *  10). null = not an int (the 400 arm). */
export declare function parseIntOrNull(s: string): number | null;
/** parse_qs (drops blank values): first non-blank
 *  value wins; the shared ctx parseQuery keeps blanks, so the
 *  filter lives here (parse_qs default). */
export declare function firstQuery(qs: Record<string, string[]>, name: string, dflt: string): string;
/** The runs-list envelope (editor_runs.runs 483-653, the restore
 *  port): the output-root scan, media-first + newest sort, the
 *  limit parse (raw STRING — the lane/remote pass the raw
 *  text; underscores parse, non-ints refuse), refused cards
 *  SKIPPED but counted. url/thumbnail are run-RELATIVE (the
 *  /v1/assets prefix died with the app — the header's law). */
export declare function listRuns(stateRoot: string, limit: number, hasDraft: (draftId: string) => Promise<boolean>): Promise<{
    count: number;
    runs: Record<string, unknown>[];
}>;
/** §23 CROSS-ROOTS (2026-09-23): the union list across the
 *  manifest — every root scanned, one media-first + newest sort,
 *  the limit sliced off the merged order, the scan total counted
 *  (refused cards SKIPPED but counted, per root). Every served row
 *  names its root (served_from); same-run-id collisions serve the
 *  FIRST manifest root's row (own writes win — the sort is stable,
 *  own root scanned first). */
export declare function listRunsAcross(roots: string[], limit: number, hasDraft: (draftId: string) => Promise<boolean>): Promise<{
    count: number;
    runs: Record<string, unknown>[];
}>;
export {};
//# sourceMappingURL=runsList.d.ts.map
