// engine/comfyui.ts — the ComfyUI engine-IO client (TS port of the
// py execute-lane transport: packages/engines/comfyui/compose/native.py
// + the merged submit/poll/harvest half of
// packages/engines/comfyui/compose/mergegraph.py).
//
// SCOPE (P4: the engine-IO half): queue a prompt (POST /prompt), poll
// the run to terminal (GET /history with the py-identical 250ms
// cadence + deadline/interrupt semantics), interrupt a live prompt
// (POST /queue delete + POST /interrupt), harvest artifacts (GET
// /view + the full outputs shape matrix), and map history entries to
// run status. Two entry points mirror the two py submitters:
//   - executeSingle — native.execute (per-stage; deadline = the
//     stage's own timeout_s, default 2400; "the graph" refusal
//     texts, "ComfyUI run exceeded" deadline text).
//   - executeFlow — mergegraph.execute_flow (merged single-graph;
//     deadline = max(sum(stage timeout_s), 2400); "the merged graph"
//     / "merged run exceeded" texts; per-stage harvest into per-stage
//     sub-dirs with prefix-stripped output keys).
// doors/flowsRun.ts drives executeFlow (the gateway's pure-comfyui
// path is the merged one — python/gateway.py _try_merged, 1631-1634).
//
// FAITHFUL MIRRORS (line-cited against native.py unless noted):
//   - endpoint: COMFYUI_URL env (non-empty wins, trailing slashes
//     stripped) > the endpoint config (COMFYUI_ENDPOINT_CONFIG env
//     path, else the plugin's data/comfyui_endpoint.json; the
//     INFERENCE_TEST_SANDBOX gate with no env path resolves to {}
//     — _config.py). Absent url = the LOUD ComfyError (native
//     82-84). NO default, NO hardcoded host/port (QUEUE LANE LAW).
//   - POST /prompt {prompt, prompt_id, client_id} (native 355-358);
//     non-200 -> "POST /prompt %s: %s" (360); node_errors non-empty
//     -> "ComfyUI validation refused the graph: %s" (361-364) /
//     "…the merged graph…" (mergegraph 306-310).
//   - poll: 250ms cadence (native 378); history GET timeout 30s
//     (383-385); entry-absent + past-deadline -> interrupt +
//     "exceeded" (387-393); status_str error -> execution_error
//     message detail else whole-status detail, "ComfyUI run failed"
//     (394-401); not-completed + past-deadline -> interrupt +
//     "exceeded" (402-408); stop flag -> interrupt + "stopped
//     (interrupt delivered)" (380-382). Merged texts per mergegraph
//     333-363 (incl. the "merged run exceeded %.0fs" deadline =
//     max(budget, 2400), 318-327).
//   - %.0f parity: Python rounds half-to-even (2.5 -> "2"); the
//     formatter below does the same (formatTimeout0f).
//   - interrupt = POST /queue {delete:[prompt_id]} then POST
//     /interrupt {} (native 525-534), best-effort swallow.
//   - harvest = _fetch_outputs (native 459-522): the images/gifs/
//     audio/video/3d/three_model/result/files matrix incl. the flat
//     tuple-row "result" arm, dict rows + list/tuple rows,
//     basename + "<node>_<name>"-iff-subfolder naming, GET /view
//     (180s), JSON artifacts re-serialized indent=2 (ensure_ascii =
//     False, i.e. raw UTF-8 here).
//   - upload walk = _upload_referenced (native 274-327): absolute or
//     cwd-relative estate paths whose lowercase suffix hits the
//     artifact upload-ext table ride POST /upload/image multipart
//     (native 109-126); VHS_LoadVideoPath/VHS_LoadVideo `video`
//     inputs are server-path readers and keep the mount path;
//     missing files ride through untouched.
//   - channel publish = publish_output_channels (native 438-458):
//     first unmatched artifact per FILE-kind channel, declaration
//     order; mesh/image/video/audio ext tables (430-435).
//   - ACTIVE registry (run_dir -> {promptId, clientId, server}) for
//     the stop door (native 332-333, 366-367, 417-419); stopForRunDir
//     mirrors native.stop (537-565); unloadModels mirrors
//     native.unload (545-565, POST /free).
//
// DOCUMENTED DIVERGENCES (preview scope, not drift):
//   - NO websocket tap (_ws_tap, native 131-201). The tap is
//     progress-only; /history stays the terminal authority
//     (native.py:28-29 says a dropped tap never kills the run).
//     Mid-run progress/activity frames are therefore absent; the
//     terminal status mapping is identical.
//   - Transport errors surface as Error("<node:http message>")
//     (e.g. ECONNREFUSED text) where py surfaces
//     URLError("<urlopen …>"). The run-failure SHAPE (failed +
//     error) agrees; the errno prose does not — the wall asserts
//     shape there, bytes everywhere the stub controls the text.
//   - Python str(out) for non-200 bodies uses single-quote reprs;
//     pyStr() below reproduces them for the JSON scalar/container
//     shapes the stub serves.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

// ── split-seam re-exports (2026-09-18: godfile split, pure move) ──
// PUBLIC API NEVER MOVES: every symbol formerly defined in this module
// now lives in its seam file below and is re-exported here, so every
// existing import path (tests, walls, entries, catalog, index) keeps
// working byte-identically. Only ACTIVE stays module-private to its
// seam (it was never exported).

export { ComfyError, activeCount } from "./comfyui-types.ts";
export type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
export {
  NO_ENDPOINT_MESSAGE,
  endpointConfigPath,
  loadEndpointConfig,
  resolveEngineBaseUrl,
  resolveRepoRoot,
} from "./comfyui-config.ts";
export { httpCall } from "./comfyui-transport.ts";
export type { HttpResult } from "./comfyui-transport.ts";
export {
  formatTimeout0f,
  pyDumps400,
  pyReprStr,
  pyReprStrList,
  pyStr,
} from "./comfyui-format.ts";
export {
  DATA_URL_IMAGE_EXT,
  UPLOAD_EXTS,
  spliceWorkflow,
  uploadReferenced,
} from "./comfyui-upload.ts";
export { interrupt, stopForRunDir, unloadModels } from "./comfyui-control.ts";
export {
  fetchOutputs,
  mapHistoryEntry,
  publishOutputChannels,
  viewTimeoutMs,
} from "./comfyui-outputs.ts";
export type { HistoryVerdict } from "./comfyui-outputs.ts";
export { drainRelevant, executeSingle, openProgressTap } from "./comfyui-execute.ts";
export type {
  ComfyWsEvent,
  ExecuteOpts,
  ExecuteResult,
  TapHandle,
} from "./comfyui-execute.ts";
export { executeFlow, planMerge } from "./comfyui-merge.ts";
export type { FlowResult, MergeRow, MergeStageResult } from "./comfyui-merge.ts";
export {
  comfyuiHostProvider,
  ComfyUIHostService,
  Config,
  needComfyUI,
  parseComfyUIHostConfig,
} from "./comfyui-host.ts";
export type { ComfyUIHostConfig } from "./comfyui-host.ts";
