/**
 * Wire types + route decoders for the gallery's same-origin feeds —
 * ONE validation site per feed (audit F2: both panels re-checked
 * shapes at render with Array.isArray sprinkles; now the hook's
 * decode does it once and malformed shapes fall back to empty HERE,
 * loudly typed).
 *
 * The runs feed rides the gallery's OWN host route
 * (GET /infer-gallery/runs — the host rewrites run-relative artifact
 * names to its same-origin artifact route, so no gateway origin ever
 * leaks); the drafts feed rides GET /infer-gallery/drafts.
 */
export interface RunArtifact {
    url?: string;
    type?: string;
    name?: string;
    size?: number;
}
export interface RunRow {
    run_id?: string;
    name?: string;
    flow?: string;
    status?: string;
    created_at?: number;
    prompt?: string;
    thumbnail?: string;
    artifacts?: RunArtifact[];
    source?: string;
    /** Card linkage served by the runs list (the action card this run
     * belongs to, for wand replay). */
    draft_id?: string;
    /** Composed params doc (yaml-era params.calls[0].text feeds tile labels). */
    params?: unknown;
    /** Served by the runs seat's trailing marker row when the run's
     * artifact list was truncated ({listed,total}) — surfaced in the
     * panel stats so a 3-of-40 listing never looks like data loss. */
    truncated?: {
        listed: number;
        total: number;
    };
}
export interface DraftRow {
    draft_id?: string;
    name?: string;
    model?: string;
    source?: string;
}
export interface GatewayError {
    gateway: string;
    message: string;
}
export interface RunsFeed {
    runs: RunRow[];
    errors: GatewayError[];
}
export declare function decodeRuns(json: unknown): RunsFeed;
export interface DraftsFeed {
    drafts: DraftRow[];
    errors: GatewayError[];
}
export declare function decodeDrafts(json: unknown): DraftsFeed;
//# sourceMappingURL=decode.d.ts.map
