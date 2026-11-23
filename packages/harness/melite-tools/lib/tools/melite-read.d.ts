import type { JsonValue, ToolDefinition } from '../types.js';
/** The text vocabulary this door answers. A run's own sidecars are
 *  json/jsonl/md/txt/yaml/log; anything else is media (melite_view),
 *  a checkpoint (never read into a context window), or a refusal. */
export declare const TEXT_EXTENSIONS: ReadonlySet<string>;
/** The byte cap: a sidecar is a receipt, not a dataset. 256 KB is far
 *  past any run sidecar and far below a context window. */
export declare const TEXT_BYTE_CAP: number;
export interface TextRow {
    /** path relative to the run dir, POSIX-ish (`stage/_request.json`) */
    readonly path: string;
    readonly bytes: number;
}
export interface QueueSeatSeam {
    stateRoot: string;
}
/** The run-id gate, exported for the door pins. */
export declare function assertRunId(runId: string): void;
/** Is this name a text row by extension? */
export declare function isTextName(name: string): boolean;
/** Walk one run directory for its text rows (pure over the tree, the
 *  media list arm's shape: depth-bounded, byte-order sorted, capped —
 *  the sort pins the row order platform-independently, so every voice
 *  built from the rows (miss, ambiguous-refusal) names them in ONE
 *  order on every lane). */
export declare function listRunText(runDir: string): Promise<TextRow[]>;
/** The counted walk: the rows the door lists (≤ ROW_CAP) plus the
 *  EXACT count of text rows past the cap (names walked past it, bytes
 *  not read). The listing line's honest "+N more" rides this — the
 *  walk stopping silently at the cap titles an oversized run complete
 *  (tool-context audit F3, 2026-11-22; the byte cap's loud refusal at
 *  readRunText is the template, and silence is the disease it names). */
export declare function listRunTextCounted(runDir: string): Promise<{
    rows: TextRow[];
    overflow: number;
}>;
type ReadResult = {
    runId: string;
    path?: string;
    bytes?: number;
    text?: string;
    truncated?: boolean;
    files?: string;
    error?: string;
} & Record<string, JsonValue>;
/** Read one text artifact of one run. With no `path`, LIST the run's
 *  text rows (the door's discovery arm — a maker needs to know what it
 *  can read before naming one). */
export declare function readRunText(seat: QueueSeatSeam, runId: string, path: string): Promise<ReadResult>;
export declare function meliteRead(ctx: {
    get(name: string): unknown;
}): ToolDefinition;
export {};
//# sourceMappingURL=melite-read.d.ts.map
