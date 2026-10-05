/**
 * Structural wire types shared by the melite-card-view client modules.
 *
 * Deliberately LOCAL spellings: the shipped ui packages own the canonical
 * types (@deepseek-ai/dsh-client-ui-tool's ToolCallOwnerProps, the runtime's
 * RunningToolCall/ToolResultNode), and this package must not value-import
 * them (client bundle purity gate). Every field below mirrors the installed
 * rc shapes read-only; unknown extra fields ride through untouched.
 */
/** One frozen tool call block: running call or settled result (runtime union). */
export interface ToolCallBlockView {
    /** Stable call identity (both forms). */
    callId: string;
    /** Wire tool name (running form). */
    name?: string;
    /** Verbatim JSON arguments text (running form). */
    argsRaw?: string;
    /** 'tool-result' on the settled form; absent while running. */
    kind?: 'tool-result';
    /** Paired call head on the settled form (null when window-truncated). */
    call?: {
        name: string;
        argsRaw: string;
    } | null;
    /** Result content blocks (settled form). */
    content?: readonly unknown[];
    /** Settled failure marker. */
    isError?: boolean;
    /** The tool's persisted presentationMeta (settled form; mirrors the
     *  shipped ToolResultNode.meta) — the native channel client renderers
     *  narrow. Absent when the tool declared no projector or the session
     *  log predates the projector. */
    meta?: unknown;
}
/** Owner share the keyed `tool.call.toolview` seat passes every entry. */
export interface ToolCallOwnerProps {
    callId: string;
    toolName: string;
    block: ToolCallBlockView;
    cwd?: string | undefined;
    openFile: (path: string) => void;
    inspect?: (() => void) | undefined;
}
/** One stage row of the gateway status payload (runner.ts RunStage, read-only slice). */
export interface StageView {
    id?: string;
    name?: string;
    family_id?: string;
    status?: string;
    url?: string | null;
    /** name -> servable gateway-relative URL (/v1/assets/runs/...). */
    named_urls?: Record<string, string>;
}
/** The status-poll return shape (runner.ts RunStatusPayload, read-only slice). */
export interface StatusPayload {
    run_id?: string;
    status?: string;
    completed?: number;
    total?: number;
    elapsed?: number;
    error?: string | null;
    stages?: StageView[];
}
export type { StageViewOwnerProps } from '@melite/contracts';
//# sourceMappingURL=types.d.ts.map
