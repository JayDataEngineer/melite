// engine/comfyui.ts — the public face of the ComfyUI engine-IO
// client (the godfile split moved every symbol to its seam file;
// this module re-exports them, and the transport laws live where
// the code lives).
//
// SCOPE (P4: the engine-IO half): queue a prompt (POST /prompt),
// poll the run to terminal (GET /history with the 250ms cadence +
// deadline/interrupt semantics), interrupt a live prompt (POST
// /queue delete + POST /interrupt), harvest artifacts (GET /view +
// the full outputs shape matrix), and map history entries to run
// status. Two entry points:
//   - executeSingle — per-stage; deadline = the stage's own
//     timeout_s, default 2400; "the graph" refusal texts,
//     "ComfyUI run exceeded" deadline text.
//   - executeFlow — the merged single-graph run; deadline =
//     max(sum(stage timeout_s), 2400); "the merged graph" /
//     "merged run exceeded" texts; per-stage harvest into
//     per-stage sub-dirs with prefix-stripped output keys.
// runsRegistry drives executeFlow (the pure-comfyui path is the
// merged one — _try_merged law).
//
// The transport laws (owned by the seam files below):
//   - endpoint: COMFYUI_URL env (non-empty wins, trailing slashes
//     stripped) > the endpoint config (COMFYUI_ENDPOINT_CONFIG env
//     path, else the repo's untracked state home
//     <repoRoot>/data/comfyui_endpoint.json — the F1 overlay, the
//     write target — else the shipped package seed
//     data/comfyui_endpoint.json; the INFERENCE_TEST_SANDBOX gate
//     with no env path resolves to {}).
//     Absent url = the LOUD ComfyError. NO default, NO hardcoded
//     host/port (QUEUE LANE LAW). [comfyui-config.ts]
//   - POST /prompt {prompt, prompt_id, client_id}; non-200 refuses
//     with status + body; non-empty node_errors refuses with the
//     graph errors (merged graph: "…the merged graph…").
//     [comfyui-transport.ts]
//   - poll: 250ms cadence; history GET timeout 30s; entry-absent +
//     past-deadline -> interrupt + "exceeded"; status_str error ->
//     execution_error message detail else whole-status detail,
//     "ComfyUI run failed"; not-completed + past-deadline ->
//     interrupt + "exceeded"; stop flag -> interrupt + "stopped
//     (interrupt delivered)". Merged texts per the mergegraph laws
//     (incl. the "merged run exceeded %.0fs" deadline =
//     max(budget, 2400)); deadline texts render with
//     String(Math.round()). [comfyui-transport.ts]
//   - interrupt = POST /queue {delete:[prompt_id]} then POST
//     /interrupt {}, best-effort swallow. [comfyui-transport.ts]
//   - harvest: the images/gifs/audio/video/3d/three_model/result/
//     files matrix incl. the flat tuple-row "result" arm, dict rows
//     + list/tuple rows, basename + "<node>_<name>"-iff-subfolder
//     naming, GET /view (180s), JSON artifacts re-serialized
//     indent=2 (raw UTF-8). [comfyui-transport.ts]
//   - upload walk: absolute or cwd-relative estate paths whose
//     lowercase suffix hits the artifact upload-ext table ride POST
//     /upload/image multipart; VHS_LoadVideoPath/VHS_LoadVideo
//     `video` inputs are server-path readers and keep the mount
//     path; missing files ride through untouched.
//     [comfyui-upload.ts]
//   - channel publish: first unmatched artifact per FILE-kind
//     channel, declaration order; mesh/image/video/audio ext
//     tables. [comfyui-transport.ts]
//   - ACTIVE registry (run_dir -> {promptId, clientId, server}) for
//     the stop door; stopForRunDir and unloadModels (POST /free)
//     against it. [comfyui-transport.ts]
//
// DOCUMENTED DIVERGENCES (preview scope, not drift):
//   - NO websocket tap. A tap is progress-only; /history stays the
//     terminal authority (a dropped tap never kills the run).
//     Mid-run progress/activity frames are therefore absent; the
//     terminal status mapping is identical.
//   - Transport errors surface as Error("<node:http message>")
//     (e.g. ECONNREFUSED text). The run-failure SHAPE (failed +
//     error) is the contract; the errno prose is the platform's
//     own — the wall asserts shape there, bytes everywhere the
//     stub controls the text.
//   - non-200 bodies stringify with JSON quotes.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
// ── split-seam re-exports (2026-09-18: godfile split, pure move) ──
// PUBLIC API NEVER MOVES: every symbol formerly defined in this module
// now lives in its seam file below and is re-exported here, so every
// existing import path (tests, walls, entries, catalog, index) keeps
// working byte-identically. Only ACTIVE stays module-private to its
// seam (it was never exported).
export { ComfyError, activeCount } from "./comfyui-types.js";
export { NO_ENDPOINT_MESSAGE, endpointConfigPath, endpointSeedPath, loadEndpointConfig, packageRoot, packageRootFrom, resolveEngineBaseUrl, resolveRepoRoot, } from "./comfyui-config.js";
export { invalidateObjectInfo, liveObjectInfo, sdkClient } from "./comfyui-transport.js";
export { DATA_URL_IMAGE_EXT, UPLOAD_EXTS, spliceWorkflow, uploadReferenced, } from "./comfyui-upload.js";
export { interrupt, stopForRunDir, unloadModels } from "./comfyui-control.js";
export { fetchOutputs, mapHistoryEntry, publishOutputChannels, viewTimeoutMs, } from "./comfyui-outputs.js";
export { executeSingle } from "./comfyui-execute.js";
export { executeFlow, planMerge } from "./comfyui-merge.js";
export { assertWiringAgainst, comfyuiWiringProvider, ComfyUIWiringService, deriveWiringDoc, } from "./wiringWall.js";
export { comfyuiHostProvider, ComfyUIHostService, Config, needComfyUI, parseComfyUIHostConfig, } from "./comfyui-host.js";
//# sourceMappingURL=comfyui.js.map
