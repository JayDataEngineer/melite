import type { EngineJson } from "./comfyui-types.ts";
/** No-endpoint refusal — the exact string the queue lane throws. */
export declare const NO_ENDPOINT_MESSAGE: string;
/** Repo root: MELITE_REPO_ROOT override (the wall seam — default
 *  resolution is the source-file-relative root). Serves ESTATE-root
 *  reads (runtime trees, stores); package-owned data uses
 *  {@link packageRoot} — design/repo-root-anchor-2026-10-18.md. */
export declare function resolveRepoRoot(): string;
/** Walk up from {@link startDir} to the nearest ancestor whose
 *  package.json names THIS package — the pure core of the package
 *  anchor (test seats pass a shaped start dir; the live seat is
 *  packageRoot). A fixed hop count cannot serve both planes
 *  (src/ in the checkout sits one segment shallower than lib/src/
 *  in an install, since lib mirrors src), but the package root
 *  carries its package.json on every plane. */
export declare function packageRootFrom(startDir: string): string;
/** This package's root — the anchor for the data/ the published
 *  files set ships (`data/**`). No env pin needed: an install
 *  finds its own shipped data by construction. */
export declare function packageRoot(): string;
/** The endpoint config dict — the single spelling of the law:
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the repo's untracked
 *  state home (overlay — wins over the seed), else the plugin's
 *  shipped data/comfyui_endpoint.json seed; INFERENCE_TEST_SANDBOX
 *  without the env path resolves to {} (the test-sandbox leak gate);
 *  a present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's WRITE target and overlay read head: the
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the repo's untracked
 *  state home `<repoRoot>/data/comfyui_endpoint.json` (F1, nativity
 *  audit 2026-11-05: the runtime endpoint statement is machine
 *  state — the repo-root `data/` tree is wholesale gitignored
 *  "never commit state", the same idiom as the data/inference.local
 *  overlay — so the endpoint_set manage door's write no longer
 *  dirties the tracked package tree). The tracked package seed
 *  (`packageRoot` data) is the shipped DEFAULT below this overlay:
 *  reads fall to it only when the state home is absent
 *  ({@link loadEndpointConfig}), and NO door writes it. The same
 *  resolution loadEndpointConfig reads first — one spelling for the
 *  write and the overlay read (the endpoint_set manage action
 *  rewrites only `url`). */
export declare function endpointConfigPath(): string;
/** The shipped endpoint SEED — the package-tracked default the
 *  published files set carries (a fresh clone or install resolves
 *  its url from here). Read-only by law: the F1 cure moved every
 *  write to the state home above; this file never carries a live
 *  machine statement again. */
export declare function endpointSeedPath(): string;
export declare function loadEndpointConfig(): Record<string, EngineJson>;
/** The engine base URL — env seam for the hermetic walls (live env
 *  read, no caching; this function is the only spelling). */
export declare function resolveEngineBaseUrl(): string;
//# sourceMappingURL=comfyui-config.d.ts.map