import type { EngineJson } from "./comfyui-types.js";
/** No-endpoint refusal — byte-identical to native refusal. */
export declare const NO_ENDPOINT_MESSAGE: string;
/** Repo root: MELITE_REPO_ROOT override (the wall seam — default
 *  resolution is the source-file-relative root, the same relation
 *  REPO = Path(__file__).parent.parent holds for native.py). */
export declare function resolveRepoRoot(): string;
/** The endpoint config dict — mirrors _config.load_global_config:
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
/** The engine base URL — mirrors native._server_url (env seam for
 *  the hermetic walls; live env read, no caching). */
export declare function resolveEngineBaseUrl(): string;
//# sourceMappingURL=comfyui-config.d.ts.map
