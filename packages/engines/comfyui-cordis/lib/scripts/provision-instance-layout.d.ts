import type { BoundLayout, EndpointConfig } from "./provision-config.js";
export declare function probe(url: string, path: string, timeoutMs?: number): {
    status: number;
    text: string;
};
/** The generated yaml's exact body — ONE owner shared by the writer
 *  (cmdPaths) and the wiring-roots wall, which recomputes it from
 *  the config and refuses a stale file (the wiring-roots audit,
 *  2026-10-13: nothing reconciled the generated roots with the
 *  config that should have produced them).
 *  @param bound the bound layout (base, download, folder map).
 *  @returns the full file body, trailing newline included. */
export declare function wiringYamlBody(bound: BoundLayout): string;
/**
 * Creates the model store the dead-root refusal names (fresh-clone
 * gate, 2026-10-17): `paths`/`sync` refuse a store that does not
 * exist — loud by law, catching typoed roots — but a fresh clone
 * has no store at all, and "create the store" was a hand-carried
 * mkdir with no door. This verb IS the named action: it lays the
 * two bound roots plus every category directory under the download
 * root, idempotently. It never runs inside `paths` (that would
 * create a typoed root silently — the exact bug the refusal
 * cures); a plain FILE in place of either root still refuses.
 *
 * @param cfg the endpoint config (storage overrides resolve like `paths`)
 */
export declare function cmdInitStore(cfg: EndpointConfig): void;
export declare function cmdPaths(cfg: EndpointConfig): void;
export declare function layDownloadPointers(downloadBase: string, folders: Record<string, string>, modelsDir?: string): void;
export declare const ENDPOINT_DERIVED: readonly string[];
/**
 * The writable form of a derived path for the TRACKED endpoint file:
 * repo-relative stays relative, an absolute path under the repository
 * is stored relative to the repo root, and a machine absolute outside
 * the repository returns null — that value belongs to the untracked
 * machine overlay (data/inference.local.json), never to a file a
 * fresh clone shares (ledger li-portability).
 *
 * @param value the derived machine-resolved path
 * @returns the tracked-file-safe form, or null when the overlay owns it
 */
export declare function endpointWritable(value: string, repo?: string): string | null;
export declare function syncEndpointFromRoot(cfg: EndpointConfig): void;
