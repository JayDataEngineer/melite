import type { EngineJson } from "./comfyui-types.js";
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
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the plugin's
 *  data/comfyui_endpoint.json; INFERENCE_TEST_SANDBOX without the
 *  env path resolves to {} (the test-sandbox leak gate); a
 *  present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's write target: the first EXISTING candidate,
 *  else the plugin's own data path (a fresh write). The same
 *  resolution loadEndpointConfig reads — one spelling for read and
 *  write (the endpoint_set manage action rewrites only `url`). */
export declare function endpointConfigPath(): string;
export declare function loadEndpointConfig(): Record<string, EngineJson>;
/** The engine base URL — env seam for the hermetic walls (live env
 *  read, no caching; this function is the only spelling). */
export declare function resolveEngineBaseUrl(): string;
//# sourceMappingURL=comfyui-config.d.ts.map
