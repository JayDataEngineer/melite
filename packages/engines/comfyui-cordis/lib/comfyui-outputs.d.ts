import type { Client } from "@stable-canvas/comfyui-client";
import type { EngineJson } from "./comfyui-types.js";
/** The /view artifact-fetch budget (stroke 83): the run's own
 *  timeout when it EXCEEDS the 180s floor, else the
 *  floor. The harvest rides the run's budget — a long run may
 *  serve large artifacts without the fetch fuse firing first —
 *  while short runs keep the 180s floor (never a raw
 *  timeoutS*1000 shrink). Exported for the formula wall. */
export declare function viewTimeoutMs(timeoutS: EngineJson | undefined): number;
/** history.outputs -> downloaded artifacts under runDir/.
 *  The full shape matrix: images/gifs/audio/video/3d/three_model/
 *  result/files, the flat tuple-row "result" arm, dict rows and
 *  list/tuple rows.
 *
 *  timeoutS threads the run's own params timeout through (the
 *  callers pass the same value the deadline used) — the /view
 *  fetch honors it via viewTimeoutMs. Absent = the formula's own
 *  default (normalize undefined -> 2400 -> the budget arm). */
export interface FetchedOutputArtifact {
    nodeId: string;
    path: string;
    kind: string;
}
export declare function fetchOutputArtifacts(client: Client, runDir: string, entry: Record<string, EngineJson>, timeoutS?: EngineJson): Promise<FetchedOutputArtifact[]>;
export declare function fetchOutputs(client: Client, runDir: string, entry: Record<string, EngineJson>, timeoutS?: EngineJson): Promise<string[]>;
/** FILE-kind -> artifact extensions. */
export declare const CHANNEL_EXTS: Record<string, readonly string[]>;
/** THE QVOICE CHANNEL (roadmap OWED 2026-09-24 — the export FULL
 *  PATH, transcript-026 #4): the vendored AudiocoreVoiceStudio
 *  export node returns its minted .qvoice ABSOLUTE path in the
 *  history ui dict (`outputs[<node>].qvoice_path = [path]`) — the
 *  file lives engine-side in the voices root, never the ComfyUI
 *  output dir, so /view cannot fetch it. Collect the FIRST
 *  non-empty string (one design lane per run — the single-stage
 *  gateway law) so the stage's result_outputs carry the exact
 *  collision-numbered path; the harness never hardcodes the
 *  voices root (the path rides verbatim from the engine). Pure:
 *  shared by the single and merge harvests. */
export declare function qvoicePathsOf(outputs: EngineJson | undefined): string;
export declare function loudnessOf(outputs: EngineJson | undefined): {
    loudness_lufs: number;
    peak_db: number;
} | null;
export declare function qvoiceFreshnessOf(outputs: EngineJson | undefined): {
    reused_existing: boolean;
    voice_file: string;
} | null;
/** Harvested paths -> {channel: path} for the FILE-kind channels
 *  the stage DECLARED. First unmatched artifact wins per channel,
 *  declaration order. */
export declare function publishOutputChannels(outputs: Record<string, EngineJson>, artifacts: string[], bindings?: Record<string, string>, records?: readonly FetchedOutputArtifact[]): Record<string, EngineJson>;
export declare function assertPublishedOutputChannels(outputs: Record<string, EngineJson>, published: Record<string, EngineJson>, bindings: Record<string, string>): void;
export type HistoryVerdict = {
    kind: "pending";
} | {
    kind: "failed";
    detail: string;
} | {
    kind: "completed";
};
/** Map one history entry to its verdict — the read half of the
 *  poll loop (native 394-408 / mergegraph 350-363, minus the WS
 *  execution_error arm which has no tap here). */
export declare function mapHistoryEntry(entry: Record<string, EngineJson> | null | undefined): HistoryVerdict;
/** Normalize a stage timeout_s to a finite positive budget (seconds).
 *  Garbage (0, negatives, NaN, Infinity, non-numeric strings) rides
 *  the 2400 default — the single path's old `Number(...) || 2400`
 *  kept truthy Infinity/negatives, and the flow path's isFinite-only
 *  guard kept negatives (audit finding, stroke 82). One spelling for
 *  both paths now. */
export declare function normalizeTimeoutS(v: EngineJson | undefined): number;
//# sourceMappingURL=comfyui-outputs.d.ts.map
