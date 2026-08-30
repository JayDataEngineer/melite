/**
 * Local structural types for the DSH tool registry seam.
 *
 * `@deepseek-ai/dsh-tools` is not a resolvable dependency of this workspace
 * (the melite/dsh workspace installs only cordis + tsdown + typescript), so the
 * plugin hands the registry plain `ToolDefinition` object literals instead of
 * calling `defineTool()`. The runtime contract these types mirror (verified
 * against @deepseek-ai/dsh-tools 0.1.0-rc.7 lib/index.js):
 *
 * - `ToolRuntime.register(definition)` requires `output { schema, render }`,
 *   asserts `output.schema` against its supported JSON-Schema subset, and
 *   rejects the reserved name `run_code`.
 * - `parameters` is projected verbatim as the model-facing JSON Schema —
 *   an object root with `properties` / `required`.
 * - A thrown `execute` is materialized by the registry as an error result
 *   whose content is the error message — that is how gateway 4xx bodies
 *   reach the model verbatim.
 *
 * Supported schema keywords (dsh-tools json-schema subset): type, oneOf,
 * properties, required, additionalProperties, items, enum, const plus the
 * annotations description/title/default/examples. Type arrays are NOT
 * supported; nullable fields stay undeclared and ride
 * `additionalProperties: true`.
 */

/** One model-facing content block (the only kind this plugin renders). */
export interface TextBlock {
  type: 'text'
  text: string
}

/** Execution identity handed to a tool body (subset the tools use). */
export interface ToolExec {
  readonly signal: AbortSignal
}

/** Registry-ready tool definition — the structural subset we register. */
export interface ToolDefinition {
  name: string
  description: string
  /** Raw JSON Schema object root (implicit open object of parameters). */
  parameters: Record<string, unknown>
  output: {
    /** Raw JSON Schema enforced against every successful canonical value. */
    schema: Record<string, unknown>
    render(args: unknown, value: unknown): TextBlock[]
  }
  execute(args: unknown, exec: ToolExec): Promise<unknown>
}
