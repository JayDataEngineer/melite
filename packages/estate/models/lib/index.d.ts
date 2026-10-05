import type { Context } from "@deepseek-ai/cordis";
import type { ProvisioningServiceDefinition } from "@melite/estate-provisioning";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";
export declare const name = "estate-models";
/** The route this plugin claims (one prefix, disjoint by law —
 *  nothing else serves /v1/models/* since the gateway died). */
export declare const MODELS_PREFIX = "/v1/models";
/** The store-root override (test seam + lane override). UNSET in
 *  prod — the endpoint + root configs are the SSOT (the provision
 *  law: storage is configured, never guessed). */
export declare const STORE_ROOT_ENV = "MELITE_MODELS_STORE_ROOT";
/** A mapped failure — status + code + message ride the response. */
export declare class ModelsDoorError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string);
}
/** Parse /<family>/provisions/<name> after the prefix; null when the
 *  shape or a segment violates the confinement grammar. */
export declare function parseTarget(sub: string): {
    family: string;
    name: string;
} | null;
/** Ascend from startDir to the checkout root (the dir carrying
 *  inference.config.json). Throws LOUD when the walk escapes
 *  without finding it — storage is configured, never guessed. */
export declare function findRepoRoot(startDir: string): string;
/** Resolve the weights store root from one checkout dir (the
 *  provision script's boundModelFolders law, verbatim): endpoint
 *  model_download_path (when set) else endpoint model_base_path
 *  (when set) else <root models.download_root>/<engines.comfyui.
 *  base>. The root config is the machine-local overlay
 *  (data/inference.local.json) when present, else the tracked
 *  inference.config.json — the SAME overlay law as provision-config
 *  loadRoot (machine-local absolutes live in the untracked overlay
 *  ONLY; the tracked tree ships portable repo-relative defaults, so
 *  a fresh clone never inherits another machine's /mnt). A relative
 *  store anchors to the repo dir (the CLI's anchorDir law). A
 *  present-but-empty endpoint key refuses LOUD (unset the key to
 *  inherit — never guessed); an unset read_root refuses LOUD (the
 *  provision law's own die). */
export declare function loadStoreRoot(repoDir: string): string;
/** Resolve the weights store root: the env override wins (test seam
 *  + lane override); else the checkout configs (repoDir overridable
 *  for tests — prod always passes the repo root). */
export declare function resolveStoreRoot(repoDir?: string): string;
/** The DECL provisions for one family (the booted table — OUR
 *  packages, never a remote). Unknown family refuses LOUD. */
export declare function provisionsForFamily(family: string): Promise<ProvisionRow[]>;
/** sha256 hex of one file (the DECL sha gates every serve).
 *  CHUNKED, never whole-file: a single Buffer refuses >2GiB files
 *  (Node's fs cap — the 2.81GB int8 VAE hit it 2026-09-20 and
 *  killed the provision run mid-verify); the digest is identical,
 *  the memory is bounded at 8MB whatever the artifact. */
export declare function sha256OfFile(path: string): string;
/** Resolve the DECL place: <store>/<folder>/<name>. A folder
 *  segment violating the confinement grammar is a corrupt tree —
 *  refuse LOUD, never escape the mount. */
export declare function resolveDest(store: string, folder: string, name: string): string;
/** True when dest exists, is a file, and matches the verified
 *  identity — else false (and the stale cache row drops). */
export declare function isVerified(dest: string): boolean;
/** Test seam: drop the verified cache (fresh process per wall —
 *  belt-and-braces for in-process reuse). */
export declare function resetVerifiedForTests(): void;
/** A narrowed fetch face (status + web body) — the door's ONLY
 *  network face, and it materializes DECL-pinned package bytes from
 *  the DECL's own distribution, never client traffic. */
export type FetchFn = (url: string) => Promise<{
    status: number;
    body: ReadableStream<Uint8Array> | null;
}>;
/** Plain TS streaming fetch (the provision script's law — no
 *  external binaries, no MCP), narrowed to the door's FetchFn face.
 *  The default seam for liveAcquire (specs inject fakes). */
export declare function liveFetchDirect(url: string): Promise<{
    status: number;
    body: ReadableStream<Uint8Array> | null;
}>;
/** Test seam: drop the stampede map (fresh process per wall). */
export declare function resetInflightForTests(): void;
export declare function acquireRow(row: ProvisionRow, dest: string, fetchFn: FetchFn): Promise<void>;
/** The door's seams (injected in specs, live in apply). */
export interface DoorDeps {
    storeRoot: () => string;
    provisions: (family: string) => Promise<ProvisionRow[]>;
    fetchFn?: FetchFn;
    provisioning?: ProvisioningServiceDefinition;
}
export interface DoorRequest {
    method?: string;
    url?: string;
}
export interface DoorResponse {
    headersSent: boolean;
    writeHead(status: number, headers: Record<string, string>): void;
    end(body?: unknown): void;
    destroy(): void;
}
/** Serve one parsed target. The mount first; a miss materializes
 *  the DECL row from its own pinned distribution (direct fetch →
 *  temp → sha gate → rename — never a forward, never a fallback),
 *  then the DECL sha gates the serve either way. Mapped failures
 *  throw ModelsDoorError (status rides); anything else propagates
 *  to the last-ditch 500 (never a hung socket). */
export declare function serveTarget(target: {
    family: string;
    name: string;
}, res: DoorResponse, deps: DoorDeps, isHead: boolean): Promise<void>;
/** Build the webServer handler from explicit seams (specs inject
 *  fakes; apply wires the live plane). */
export declare function createHandler(deps: DoorDeps): (req: DoorRequest, res: DoorResponse) => Promise<void>;
/** The live store root (the checkout configs — the env override
 *  rides inside resolveStoreRoot). A named seam so the specs pin
 *  the apply wiring without touching the mount. */
export declare function liveStoreRoot(): string;
/** The queue seat's read face is NOT needed here — the models
 *  plane boots itself (bootModels' singleton, the same boot the
 *  card registry rides). The webServer seat is an OPTIONAL PROBE
 *  at apply time (the media door's law): absent (a headless mount)
 *  the route simply does not mount, with a log line saying so. */
export declare function apply(ctx: Context): void;
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map
