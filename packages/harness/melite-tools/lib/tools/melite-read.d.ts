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
 *  media list arm's shape: depth-bounded, mtime-newest first, capped). */
export declare function listRunText(runDir: string): Promise<TextRow[]>;
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
