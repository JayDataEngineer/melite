/**
 * Registry type surface — the SDK's own types (the vendored
 * src-copy retired 2026-09-09).
 *
 * The hand-rolled mirror died 2026-09-08; the src-copy vendoring
 * died 2026-09-09: @deepseek-ai/dsh-tools 0.1.1-rc.2 now ships the
 * whole tool-registry surface this plugin mirrors (ToolDefinition,
 * ToolOutputDefinition, ToolResult, the presentation views, the
 * JSON-schema types) — import the package, mirror
 * nothing. (JsonValue moved out of the dsh-tools export surface
 * in 0.1.5-alpha.2 — it rides @deepseek-ai/dsh-util-values now,
 * the same source the SDK imports it from.)
 *
 * TWO estate-owned faces stay (declared adaptations, cause kept):
 *
 * - `ToolExec` = { signal }: the full upstream ToolRunContext chain
 *   (ToolExecution → Agent, UserMessage, tokens) is host-plane
 *   machinery this plugin never touches — every body below uses only
 *   `exec.signal`. Contravariant-safe: a body accepting { signal }
 *   accepts any ToolRunContext at runtime.
 * - `TextBlock` re-exported from @deepseek-ai/dsh-llm (the SDK
 *   imports it from there; same shape the src-copy carried).
 */
export type { GenericCallView, GenericResultView, JsonSchemaNode, JsonSchemaScalar, JsonSchemaType, ToolCallKind, ToolDefinition, ToolOutputDefinition, ToolResult, } from '@deepseek-ai/dsh-tools';
export type { JsonValue } from '@deepseek-ai/dsh-util-values';
export type { TextBlock, ToolSchema } from '@deepseek-ai/dsh-llm';
/** The estate's execute-share: what every tool body below accepts
 *  (see the adaptation ledger above). */
export interface ToolExec {
    signal: AbortSignal;
}
//# sourceMappingURL=types.d.ts.map