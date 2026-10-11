import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
import type { ProvisioningServiceDefinition } from "@melite/estate-provisioning";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";
export declare const name = "estate-models";
/** The route this plugin claims (one prefix, disjoint by law —
 *  nothing else serves /v1/models/* since the gateway died). */
export declare const MODELS_PREFIX = "/v1/models";
/** The store-root override (test seam + lane override). UNSET in
 *  prod — the endpoint + root configs are the SSOT (the provision
 *  law: storage is configured, never guessed). */
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
/** Resolve the weights store DOWNLOAD root from one checkout dir.
 *  This is the provision law's DOWNLOAD arm — ONE value of the
 *  three boundModelFolders derives — never the whole law:
 *  endpoint model_download_path (when set) else endpoint
 *  model_base_path (when set) else <root
 *  models.download_root>/<engines.comfyui.base>. The READ arm
 *  (models.read_root-derived base_path) and the 22-entry folder
 *  remap map are NOT derived here: this door serves provision
 *  DESTINATIONS (where downloads land), and read_root only moves
 *  the engine's read tree — on a read_root != download_root
 *  machine this door and the provisioner's read arm disagree BY
 *  DESIGN. Anchoring also differs by role: boundModelFolders
 *  anchors each arm against the REPO constant before joining;
 *  this door anchors the RESULT against its repoDir parameter
 *  (tests pass other checkouts; production passes the repo root).
 *  The root config is the machine-local overlay
 *  (data/inference.local.json) when present, else the tracked
 *  inference.config.json — the SAME overlay law as provision-config
 *  loadRoot (machine-local absolutes live in the untracked overlay
 *  ONLY; the tracked tree ships portable repo-relative defaults,
 *  so a fresh clone never inherits another machine's /mnt). A
 *  relative store anchors to the repo dir (the CLI's anchorDir
 *  law). A present-but-empty endpoint key refuses LOUD (unset the
 *  key to inherit — never guessed); an unset read_root refuses
 *  LOUD (the provision law's own die). */
export declare function loadStoreRoot(repoDir: string): string;
/** The DECL provisions for one family (the booted table — OUR
 *  packages, never a remote). Unknown family refuses LOUD. */
export declare function provisionsForFamily(family: string): Promise<ProvisionRow[]>;
/** Derive a provision row's name from its artifact url — the
 *  basename with the FIRST query/fragment marker cut (audit U-E6:
 *  cutting at Math.max(indexOf("?"), indexOf("#")) kept "?query"
 *  inside the name when both markers rode one url — a phantom row
 *  whose derived name never matched the bytes). */
export declare function artifactBasename(url: string): string;
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
/** The per-mount verification + stampede state (V2 cure,
 *  2026-10-18: these maps were module-scope — one cell shared by
 *  every mount and alive after unload; the provisioning service's
 *  instance Maps are the precedent). apply() creates one instance
 *  and releases it in its effect cleanup; test walls own theirs.
 *
 *  verified: dest → {sha, stat identity} (audit U-E1: the mark keys
 *  the DECL sha it verified, so a same-dest row with a different sha
 *  never rides another row's mark). A hit skips the re-hash (multi-GB
 *  provisions hash once per mtime, not per request); any stat drift
 *  re-verifies. inflight: concurrent requests for one missing
 *  dest+sha share ONE download (entries drop on settle, success AND
 *  failure — a failed flight stays retryable, never latched). */
export interface VerifyCache {
    /** True when dest exists, is a file, and its identity matches the
     *  identity recorded for THIS sha — else false (and the stale row
     *  drops). `identity` overrides the name stat when the caller
     *  already holds the open fd's fstat (the single-open law). */
    isVerified(dest: string, sha: string, identity?: string): boolean;
    /** Record dest's stat identity as verified for THIS sha. */
    markVerified(dest: string, sha: string, identity?: string): void;
    /** Materialize one DECL row (direct fetch → temp → sha gate →
     *  rename); concurrent calls for one dest+sha share the flight.
     *  THE HONEST SEAT (audit U-S): the door's production serve NEVER
     *  fetches — the heal delegates to the shared provisioning
     *  service; this face is the walls' provisioner engine and the
     *  provision script's seam. */
    acquireRow(row: ProvisionRow, dest: string, fetchFn: FetchFn): Promise<void>;
    /** Release all state (fiber unwind — apply's effect cleanup). */
    clear(): void;
}
/** Create a {@link VerifyCache} (one per mount or test wall). */
export declare function createVerifyCache(): VerifyCache;
/** A narrowed fetch face (status + web body) — the door's ONLY
 *  network face, and it materializes DECL-pinned package bytes from
 *  the DECL's own distribution, never client traffic. */
export type FetchFn = (url: string) => Promise<{
    status: number;
    body: ReadableStream<Uint8Array> | null;
}>;
/** Plain TS streaming fetch (the provision script's law — no
 *  external binaries, no MCP), narrowed to the door's FetchFn face.
 *  THE HONEST SEAT (audit U-S, round 13): production heals ride the
 *  shared provisioning service (apply wires NO fetchFn) — this face
 *  exists for the walls' provisioner fakes and local provision
 *  scripting, never as a serve-time forward. */
export declare function liveFetchDirect(url: string): Promise<{
    status: number;
    body: ReadableStream<Uint8Array> | null;
}>;
/** The door's seams (injected in specs, live in apply). */
export interface DoorDeps {
    /** The mount's verification + stampede state (V2 cure: per-mount,
     *  never module-scope — apply owns one, tests own theirs). */
    cache: VerifyCache;
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
    /** Stream one chunk; false when the consumer's buffer is full —
     *  await {@link DoorResponse.drain} before the next write. */
    write(chunk: Uint8Array): boolean;
    /** Resolves when the consumer's buffer drained after write()
     *  answered false (http.ServerResponse's drain event). */
    drain(): Promise<void>;
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
/** Plugin config — the store-root pin (V8 cure, 2026-10-18: the
 *  weights store root was resolved through an env-wins seam the
 *  profile could not see; it is now a validated config field, the
 *  file reads happening once here at apply — a bad resolve fails
 *  the mount loud, per cordis-tutorial/05-config.md fail-loud). */
export interface Config {
    /** The weights store root. Unset: derived from the checkout's
     *  tracked configs at apply (loadStoreRoot). */
    storeRoot?: string;
    /** The checkout dir anchoring the tracked config reads. */
    repoRoot?: string;
}
/** The validator twin of {@link Config}. */
export declare const Config: Schema<Config>;
/** The queue seat's read face is NOT needed here — the models
 *  plane boots itself (bootModels' singleton, the same boot the
 *  card registry rides). The webServer seat is an OPTIONAL PROBE
 *  at apply time (the media door's law): absent (a headless mount)
 *  the route simply does not mount, with a log line saying so. */
export declare function apply(ctx: Context, config?: Config): void;
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map
