import { type DraftId } from "@melite/contracts/benchStage";
/** Leading-int read (sidecar tails): optional space, optional
 *  sign, then digits; 0 when no digits lead. */
export declare function parseLeadingInt(s: string): number;
/** sidecar_num: first `"key":`, strtol the tail, default when the key is absent. */
export declare function sidecarNum(text: string, key: string, dflt: number): number;
/** sidecar_bool: first `"key":`, skip spaces/tabs, expect the
 *  `true`/`false` literal — default when the key is absent or
 *  non-boolean (never guessed; a torn write reads the default). */
export declare function sidecarBool(text: string, key: string, dflt: boolean): boolean;
/** sidecar_str: BYTE-wise exact — first `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \" \\ (any other escape lands literally — \u stays "u"), stop at cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
export declare function sidecarStr(raw: Uint8Array, key: string, cap: number): string;
/** _sidecar_str_impl found-ness: only the runs-list status site reads it — a present-but-empty "status" serves "" (the gate then skips the row), while an absent/non-string key serves "unknown". */
export declare function sidecarStrFound(raw: Uint8Array, key: string, cap: number): [boolean, string];
export declare function artifactType(name: string): string;
interface MediaCand {
    readonly rel: string;
    readonly full: string;
}
/** _media_candidates: top-level files (non-underscore) then ONE level down (underscore + deeper dirs skipped), each tier byte-sorted. */
export declare function mediaCandidates(runDir: string): MediaCand[];
/** run_artifacts: image/video/audio/model rows (image capped at _MAX_IMGS — counted but unlisted past it), everything else skipped; the {truncated,listed,total} marker when entries went unlisted. */
/** path keeps the "./output/<run>/" literal. */
export declare function runArtifacts(runDir: string, outDirLiteral: string): Record<string, unknown>[];
/** _archived_artifacts (the mass-archive law, operator ruling
 *  2026-11-14, item (a)): the tucked-away face — files resting under
 *  `<run>/_archived/`, served as a SEPARATE array (the live `arts`
 *  grammar is untouched: artifactRowOk still demands exactly its six
 *  keys, so archived rows ride no 7-key exception). Same row shape
 *  (name/path/bytes/url/type/size), same type law, same two-tier
 *  depth as the live walk (top files + one subdir level — the tuck
 *  preserves the relative tail, so deeper nestings do not occur);
 *  NO image cap (tucked rows flood no grid — the panel hides them
 *  unless the operator toggles them visible, and the tuck is an
 *  operator gesture, never an engine frame-dump). Absent dir reads
 *  as the empty face, never a throw. */
export declare function runArchivedArtifacts(runDir: string, outDirLiteral: string): Record<string, unknown>[];
/** _run_thumbnail: cached poster wins; else — THE WITNESS LAW (F32 cure,
 *  2026-11-13) — the run's VIDEO leads, then the first still.
 *
 *  Why the order flipped: a reshoot run writes WITNESS stills beside its
 *  film (`SaveImage.0_reshoot_warp_*` — the raw warp plate the guide
 *  pins, magenta disocclusions and all, plus `SaveImage.1_reshoot_orbit_*`),
 *  and the old first-image rule painted the tile with a witness (the
 *  operator's 8.8 % magenta preview) while the film itself measured
 *  0.00 %. The artifact names carry their save node's class, so the class
 *  is the role: a video-carrying run's face is its video (the film-named
 *  one first — the in-graph assembly's product, `engineFilmName` — then
 *  the first video candidate); a still is the face only where no video
 *  exists, which is every image-only run's case, unchanged. */
export declare function runThumbnail(runDir: string, runId: string): string;
/** _run_dir_has_media: the media-FIRST sort key — top-level names, then one level down. */
/** NOTE the absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner isdir check (a nested DIR named x.mp4 counts) — probed live, mirrored exactly. */
/** Gallery sets only (svg/bmp classify but do not list — the media-kinds.json contract). */
export declare function runDirHasMedia(runDir: string): boolean;
/** The RunRow gate — the row dict, or null when the gate refuses it (the caller logs LOUD and skips). */
/** Key order is the RunRow field order. */
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
    /** THE BENCH INCARNATION (W-3 / F3-11, 2026-11-05): the draft
     *  doc's `epoch` at press, read from the identity prefix — the
     *  bench read's join requires equality alongside draft_id, so a
     *  post-clear read binds only post-clear runs. Optional —
     *  pre-cure sidecars predate the key and stamp nothing. */
    bench_epoch?: string;
    /** THE CAPPED FACE (previews 2b, 2026-11-12): the artifact list's
     *  trailing marker lifted onto the row — the panel's capped
     *  counter reads THIS, so a partial listing never reads as
     *  complete. Optional — full listings stamp nothing. */
    truncated?: {
        listed: number;
        total: number;
    };
    /** THE ARCHIVED FACE (mass-archive law, operator ruling
     *  2026-11-14, item (a)): the tucked-away rows ride ALONGSIDE
     *  the live list — the live grammar untouched. Optional —
     *  runs with nothing archived stamp nothing. */
    archived?: Record<string, unknown>[];
    /** THE TEST STAMP (visible-bench law, operator ruling
     *  2026-11-14, item (b)): the seat the run rode —
     *  test-output/ rows stamp true. The live face stamps the
     *  same key (runsRegistry's TEST FLAG), so both faces agree.
     *  Optional — pre-cure sidecars predate the key and read as
     *  production. */
    test?: boolean;
}): Record<string, unknown> | null;
/** Strict int parse: surrounding whitespace stripped, one optional
 *  sign, ASCII digits with single internal underscores ("1_0" ->
 *  10). null = not an int (the 400 arm). */
export declare function parseIntOrNull(s: string): number | null;
/** parse_qs (drops blank values): first non-blank
 *  value wins; the shared ctx parseQuery keeps blanks, so the
 *  filter lives here (parse_qs default). */
export declare function firstQuery(qs: Record<string, string[]>, name: string, dflt: string): string;
/** THE RUNS-PER-DRAFT DOOR's filter (the stale-two-run chat audit's
 *  cure 3, 2026-11-15): the archive query for "all takes of this
 *  draft". Both keys OPTIONAL — an absent key filters nothing. A
 *  FILTER on the existing list, never a second roster: the same
 *  scan, sort, and row law; only the served rows are narrowed. */
export interface RunsListFilter {
    /** Exact match against the SERVED row's `draft_id` — the row's
     *  own claim is the truth (the orphan overlay's cleared link
     *  matches nothing, per applyDraftOverlay's law). */
    draftId?: string;
    /** Membership in the row's `stage_ids` digest — the CSV sidecar
     *  seat spells the bench address FIRST (queueSidecar.ts stage_ids:
     *  bench_stage_id before the skeleton id), so a bench stage's
     *  takes are the rows that name it. */
    benchStageId?: string;
}
/** THE MUTATION NOTICE (the gallery-rename staleness cure,
 *  2026-10-28): rowCache keys a built row on the RUN DIR mtime +
 *  the sidecar mtime — but a gallery rename/delete inside a SUBDIR
 *  (every real artifact lives one level down: openjutsu/,
 *  h3-film/, generate/) bumps the SUBDIR's mtime, never the run
 *  dir's, and no sidecar rewrites — so the cached row keeps the
 *  pre-mutation artifact names and the gallery keeps listing the
 *  old name after a 200 rename (the operator's "rename fails":
 *  door renamed, feed lied). The mutating doors call this with the
 *  mutated FILE's full path after a successful mutation; the next
 *  list rebuilds that one row. Matched on the RUN-ID SEGMENT found
 *  inside the path (`run-<id>`), not on a computed dir: the caller
 *  must not guess which tree won — the basename (`run-<id>`) is
 *  the identity across roots. The scan cache (the media sort bit)
 *  rides along: a delete-to-empty must flip it too.
 * @param mutatedPath - any path inside the run (the file, its dir —
 *  the run-id segment is what matters).
 */
export declare function noteRunTreeChanged(mutatedPath: string): void;
/** The runs-list envelope (the restore port): the BOTH-SEATS scan per root (visible-bench law), media-first + newest sort, the limit sliced off the merged order, the limit parsed (raw STRING — the lane/remote pass the raw text; underscores parse, non-ints refuse), refused cards SKIPPED but counted. */
/** url/thumbnail are run-RELATIVE (the /v1/assets prefix died with the app — the header's law). */
export declare function listRuns(stateRoot: string, limit: number, hasDraft: (draftId: DraftId) => Promise<boolean>, filter?: RunsListFilter): Promise<{
    count: number;
    runs: Record<string, unknown>[];
}>;
/** §23 CROSS-ROOTS (2026-09-23): the union list across the
 *  manifest — every root scanned (BOTH out seats per root since
 *  the visible-bench flip), one media-first + newest sort,
 *  the limit sliced off the merged order, the scan total counted
 *  (refused cards SKIPPED but counted, per root). Every served row
 *  names its root (served_from) and its seat (`test`, `path`);
 *  same-run-id collisions serve the FIRST manifest root's row
 *  (own writes win — the sort is stable, own root scanned first).
 *  The optional runs-per-draft filter (RunsListFilter — the
 *  stale-two-run audit's cure 3) narrows the SERVED rows only:
 *  count stays the scan total, and the limit slices the FILTERED
 *  order, never the scan's. */
export declare function listRunsAcross(roots: string[], limit: number, hasDraft: (draftId: DraftId) => Promise<boolean>, filter?: RunsListFilter): Promise<{
    count: number;
    runs: Record<string, unknown>[];
}>;
export {};
//# sourceMappingURL=runsList.d.ts.map