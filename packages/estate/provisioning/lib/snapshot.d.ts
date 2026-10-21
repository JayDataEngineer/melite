/** THE SNAPSHOT CHANNEL (the snapshot_provisions cure, 2026-10-21):
 *  the operator's burn — a Download button that answers "declares no
 *  downloadable provisions" over a family whose DECL pins two HF
 *  snapshot trees. The pure halves of the fetch live here so the
 *  service arms and the walls share one spelling (the script-era
 *  twins in comfyui-cordis/scripts/provision-models.ts own the
 *  CLI face; this module owns the seat's face). */
/** The snapshot dest derivation (folder/name under the models root).
 *  @param folder the DECL row's parent dir under the store root
 *  @param name the tree basename the lane loads
 *  @returns the store-relative dest dir */
export declare function snapshotDest(folder: string, name: string): string;
/** The files a snapshot row fetches (deterministic: sorted, deduped).
 *  An allow pattern is either an exact repo path (config.json) or a
 *  `dir/*` prefix for a whole subtree (speech_tokenizer/*).
 *  @param siblings the repo file list (HF API rfilenames)
 *  @param allowPatterns the row's allow_patterns
 *  @returns the matched files */
export declare function snapshotFilesForPatterns(siblings: readonly string[], allowPatterns: readonly string[]): string[];
export interface SnapshotFetchResponse {
    readonly status: number;
    readonly body: AsyncIterable<Uint8Array> | Iterable<Uint8Array> | ReadableStream<Uint8Array> | null;
}
/** One GET through the seat's own byte fetcher — the same wire every
 *  direct model download rides (one fetcher, one stall clock).
 *  @param url the absolute url
 *  @param signal the operation's abort signal
 *  @returns the response's status and byte body */
export type SnapshotFetch = (url: string, signal?: AbortSignal) => Promise<SnapshotFetchResponse>;
/** The repo file list behind a snapshot row.
 *  @param repoId the upstream repo (owner/name)
 *  @param fetchFn the seat's fetcher
 *  @param signal the operation's abort signal
 *  @returns the sibling rfilenames */
export declare function hfRepoFiles(repoId: string, fetchFn: SnapshotFetch, signal?: AbortSignal): Promise<string[]>;
/** The resolve url for one snapshot file at the pinned revision.
 *  @param repoId the upstream repo (owner/name)
 *  @param revision the immutable pin
 *  @param file the repo-relative path
 *  @returns the fetch url */
export declare function snapshotFileUrl(repoId: string, revision: string, file: string): string;
/** THE SNAPSHOT PRESENCE PROBE — a tree counts present when every
 *  EXACT-named file of its declared allow set exists on disk and at
 *  least one of them is a weights anchor (model.safetensors OR a
 *  shard — sharded repos carry model.safetensors.index.json +
 *  model-0000X-of-0000Y.safetensors, never a single weights file:
 *  the joycaption law, 2026-10-21 — a hardcoded model.safetensors
 *  anchor called a complete 16GB sharded tree absent and would have
 *  re-fetched it). Glob rows (dir/*) cannot be probed exhaustively
 *  without a listing; the exact-named core carries the verdict.
 *  @param fileExists the store's file-presence predicate
 *  @param destDir the store-absolute tree dir
 *  @param exactFiles the row's allow patterns that name files
 *  @returns the presence verdict + the missing exact files (the
 *  refusal's own voice) */
export declare function snapshotTreePresent(fileExists: (path: string) => boolean, destDir: string, exactFiles: readonly string[]): {
    present: boolean;
    missing: readonly string[];
};
/** The exact-named patterns of an allow set (the presence probe's
 *  file list — globs probe nothing without a listing).
 *  @param allowPatterns the row's allow_patterns
 *  @returns the patterns that name one repo file each */
export declare function exactPatternFiles(allowPatterns: readonly string[]): string[];
//# sourceMappingURL=snapshot.d.ts.map
