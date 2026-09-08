/** Pure (non-component) helpers extracted from assets-form-helpers.tsx
 * so the component module exports ONLY components (React Fast Refresh).
 * See vite-plugin-no-full-reload.ts. */
/** A service tool descriptor from the gateway schema (the former MCP-era
 *  wire shape, renamed 2026-08-21 - the MCP bridge is long dead). */
export interface ServiceTool {
  name: string
  description?: string
  inputSchema: {
    type?: string
    properties?: Record<string, {
      type?: string
      default?: unknown
      description?: string
      enum?: string[]
      anyOf?: { type?: string; default?: unknown; additionalProperties?: boolean }[]
      additionalProperties?: boolean
    }>
    required?: string[]
    additionalProperties?: boolean
  }
  outputSchema?: Record<string, unknown>
  _meta?: Record<string, unknown>
}



function ttsEngineNames(tool: ServiceTool | undefined): string[] {
  const engineProp = tool?.inputSchema?.properties?.["engine"]
  return (engineProp?.enum as string[]) ?? []
}

export function fieldDefault(tool: ServiceTool | undefined, name: string, fallback: string): string {
  const prop = tool?.inputSchema?.properties?.[name]
  if (prop && prop.default !== undefined) return String(prop.default)
  return fallback
}

// PRIMITIVE: the first engine id is sourced exclusively from the MCP tool's
// `engine` enum. No hardcoded fallback — criterion (b/c): no hardcodes, no
// silent fallbacks.
//
// Two distinct states:
//   - `tool === undefined`: the MCP tools/list call hasn't resolved yet.
//     Returns "" so render-time callers can hide their section. Not an error
//     — transient load state.
//   - `tool !== undefined` but enum empty/missing: a contract violation.
//     Returns "" and logs loudly. We deliberately do NOT throw: this helper
//     is called from React render paths (TtsSpeakForm, GenerateFormBody),
//     where a throw unmounts the entire workspace via the error boundary.
//     A console.error surfaces the bug to the developer without taking down
//     the user's UI for what may be a transient tools/list race.
export function firstEngineOrDefault(tool: ServiceTool | undefined): string {
  if (!tool) return ""  // tools/list still loading — render-time callers hide
  const engines = ttsEngineNames(tool)
  if (engines.length > 0) return engines[0]
  console.error(
    "[firstEngineOrDefault] MCP tool schema has no `engine` enum entries — " +
    "form-spec contract may be violated. Check the tool's inputSchema.properties.engine.enum."
  )
  return ""
}

// Compact numeric input — right-aligned tabular numerics sized to its cell.
export const NUM_INPUT_CLS =
  "h-8 w-full rounded-md border border-input bg-input/35 px-2 text-sm tn-num text-right tabular-nums " +
  "transition-colors placeholder:text-muted-foreground/50 focus-visible:bg-input/55 " +
  "focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/30 outline-none " +
  "[&::-webkit-inner-spin-button]:opacity-0 [&::-webkit-inner-spin-button]:h-4 " +
  "[&::-webkit-outer-spin-button]:opacity-0 [-moz-appearance:textfield]"
