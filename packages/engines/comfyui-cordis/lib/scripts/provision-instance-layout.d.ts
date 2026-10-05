import type { EndpointConfig } from "./provision-config.js";
export declare function probe(url: string, path: string, timeoutMs?: number): {
    status: number;
    text: string;
};
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
