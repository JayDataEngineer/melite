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
  callId: string
  /** Wire tool name (running form). */
  name?: string
  /** Verbatim JSON arguments text (running form). */
  argsRaw?: string
  /** 'tool-result' on the settled form; absent while running. */
  kind?: 'tool-result'
  /** Paired call head on the settled form (null when window-truncated). */
  call?: { name: string; argsRaw: string } | null
  /** Result content blocks (settled form). */
  content?: readonly unknown[]
  /** Settled failure marker. */
  isError?: boolean
  /** The tool's persisted presentationMeta (settled form; mirrors the
   *  shipped ToolResultNode.meta) — the native channel client renderers
   *  narrow. Absent when the tool declared no projector or the session
   *  log predates the projector. */
  meta?: unknown
}

/** Owner share the keyed `tool.call.toolview` seat passes every entry. */
export interface ToolCallOwnerProps {
  callId: string
  toolName: string
  block: ToolCallBlockView
  cwd?: string | undefined
  openFile: (path: string) => void
  inspect?: (() => void) | undefined
}

/** One stage row of the gateway status payload (runner.ts RunStage, read-only slice). */
export interface StageView {
  id?: string
  name?: string
  family_id?: string
  status?: string
  url?: string | null
  /** name -> servable gateway-relative URL (/v1/assets/runs/...). */
  named_urls?: Record<string, string>
}

/** The status-poll return shape (runner.ts RunStatusPayload, read-only slice). */
export interface StatusPayload {
  run_id?: string
  status?: string
  completed?: number
  total?: number
  elapsed?: number
  error?: string | null
  stages?: StageView[]
}

/** Standard owner currency for the keyed stage-surface slot
 *  ('cards.stage.view') — the ui-tool law verbatim: the view is a pure
 *  function of what the bench already knows, plus the host callbacks
 *  the drill owns. Keyed by CARD name; an unclaimed key falls back to
 *  the generic form-spec card. */
export interface StageViewOwnerProps {
  /** Bench stage identity (stable across param edits). */
  stageId: string
  /** Wire card name — the keyed dispatch value. */
  cardName: string
  /** Frozen bench row (params/inputs/outputs as the SSOT holds them). */
  row: Record<string, unknown>
  /** The estate's own runStatus field ('' when never run). */
  runStatus: string
  /** Patch stage params through drafts/patch (the slot's own door). */
  onPatch: (patch: Record<string, unknown>) => void
  /** Start the run for THIS stage (the single-stage gateway). */
  onRun: () => void
  /** Cancel a live run (runs/stop). */
  onStop: () => void
  /** Remove the stage from the bench. */
  onRemove: () => void
  /** Host verb: report the envelope's size class (the zoom card
   *  frame listens — 'huge' grows the card; '' = the default). */
  onSurface: (size: string) => void
}
