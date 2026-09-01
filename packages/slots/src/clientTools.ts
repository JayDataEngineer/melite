// clientTools — M3/M5 browser-tool federation, THE SEAM (moved from
// src/surfaces/shared 2026-08-21 with the body-card exodus: plugins
// contribute agent-facing capabilities without importing app code).
//
// Replaces CopilotKit's useFrontendTool round-trip. Each of the 14 editor
// tools (update_card, body_*, navigate_to_tab, select_model, asset
// routing…) executes HERE in the browser against live zustand store state
// the server can never reach. Tools register a handler while their surface
// is mounted (useClientTool) and deregister on unmount — the SAME
// conditional exposure CopilotKit had — so the active registry IS the
// model-visible surface.
//
// Protocol (paired with server-js/src/agent/middleware/clientTools.ts):
//   1. send() attaches activeClientToolNames() to the run input as
//      input.client_tools → the server exposes those named tools to the
//      LLM and routes their executions through interrupt().

//   2. The run PAUSES; the final values frame carries tasks[].interrupts[]
//      — each with { id, value: { client_tool, args } }.

//   3. The hook (useNativeAgent) resolves each interrupt through this
//      registry and POSTs a resume run keyed by interrupt id; langgraph
//      returns the result to the tool executor and the conversation
//      continues. Loop until no interrupts remain.
import { useEffect } from "react"

export interface ClientToolRecord {
  id?: string
  value: unknown
}

export type ClientToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown> | unknown

/** Registered handlers keyed by tool name — the live surface. */
const registry = new Map<string, ClientToolHandler>()

export function getClientToolHandler(name: string): ClientToolHandler | undefined {
  return registry.get(name)
}

export function hasClientTool(name: string): boolean {
  return registry.has(name)
}

/** Register a handler while the owning surface is mounted. The most recent
 * mount wins (surfaces are mutually exclusive tabs, so this stays correct);
 * the handler is removed on unmount. The deps array lets surfaces swap a
 * closure that captures fresher store binding when needed. */

/** Register a SESSION-scoped handler (plugin capabilities lane): plugins/
 * <id>/capabilities/client.ts registers at shell boot — the plugin is
 * installed for the whole session, so its tools are live regardless of
 * which surface is mounted (library/persistence ops, not live-surface
 * ops). Returns its remover for tests. */
export function registerClientTool(
  name: string,
  handler: ClientToolHandler,
): () => void {
  registry.set(name, handler)
  return () => {
    if (registry.get(name) === handler) registry.delete(name)
  }
}
export function useClientTool(
  name: string,
  handler: ClientToolHandler,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    registry.set(name, handler)
    return () => {
      if (registry.get(name) === handler) registry.delete(name)
    }
  }, [name, handler, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** The registered names — attached to the run as input.client_tools so the
 * server only exposes tools whose surface is actually mounted. */
export function activeClientToolNames(): string[] {
  return [...registry.keys()]
}

/** Extract interrupt records {id, value} from a langgraph values payload. */
export function interruptRecordsFromValues(values: unknown): ClientToolRecord[] {
  if (!values || typeof values !== "object") return []
  const tasks = (values as { tasks?: unknown }).tasks
  if (!Array.isArray(tasks)) return []
  const out: ClientToolRecord[] = []
  for (const t of tasks) {
    const intr = (t as { interrupts?: unknown }).interrupts
    if (!Array.isArray(intr)) continue
    for (const x of intr) {
      const rec = x as { id?: unknown; value?: unknown }
      out.push({ id: typeof rec.id === "string" ? rec.id : undefined, value: rec.value })
    }
  }
  return out
}
