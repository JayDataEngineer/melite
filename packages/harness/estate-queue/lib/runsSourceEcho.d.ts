/** The serving prefixes the estate owns (comfyui-upload's
 *  MEDIA/ASSET_ROUTE_PREFIX twins — detection is case-insensitive
 *  like the engine's; the sliced tail keeps its case). */
export declare const MEDIA_RUNS_PREFIX: string;
export declare const ASSET_RUNS_PREFIX: string;
export type SourceFace = "run" | "abs";
/** A collected pointer: the VERBATIM string (history stamps what
 *  the params held — the engine trims for staging, the record
 *  keeps the author's spelling) plus its parsed face. */
export interface ParsedSource {
    readonly url: string;
    readonly face: SourceFace;
    readonly runId: string;
    readonly rel: string;
    readonly abs: string;
}
/** Collect every source pointer in a params tree (deep walk over
 *  objects/arrays — card params nest refs inside calls, clips,
 *  stanzas). Verbatim strings, order of discovery, deduped.
 *  Detection runs on the trimmed string (the engine trims); the
 *  stamped URL keeps the author's spelling. */
export declare function collectSourceRefs(value: unknown): string[];
/** Backward face (the first law's name): the media-prefix sweep.
 *  New code prefers collectSourceRefs. */
export declare function collectMediaRefs(value: unknown): string[];
/** Parse a collected pointer. Throws naming the violation when the
 *  shape or a segment breaks confinement — an unservable pointer
 *  refuses here, loud. */
export declare function parseSourceRef(ref: string): ParsedSource;
/** Backward face: parse a media-prefix URL. */
export declare function parseMediaRef(ref: string): {
    runId: string;
    rel: string;
};
export interface SourceEchoRef {
    readonly url: string;
    readonly file: string;
}
/** Resolve every pointer the way the engine stages it — run faces
 *  walk the manifest trees (first root holding the RUN DIR wins,
 *  the file rides under it — the server's and the stager's shared
 *  walk), tails fall through to cwd (the stager's own order),
 *  absolute paths stage verbatim. A pointer at selfRunId (the run
 *  being registered — the compose writes its OWN future output
 *  path, `${runId}/gen`, into the graph) is a forward reference,
 *  not a source: it passes unstamped, never refused. Returns the
 *  resolved rows in collection order. Throws ONE error naming EVERY
 *  unresolvable source plus the roots searched — the run refuses
 *  before it registers, never mid-render. */
export declare function resolveSourceRefs(refs: readonly string[], roots: readonly string[], cwd?: string, selfRunId?: string): SourceEchoRef[];
/** Backward face (roots-only walk — the first law's signature).
 *  New code prefers resolveSourceRefs. */
export declare function resolveMediaRefs(refs: readonly string[], roots: readonly string[]): SourceEchoRef[];
//# sourceMappingURL=runsSourceEcho.d.ts.map