// ════════════════════════════════════════════════════════════════════════
// editorApi — THE typed contract between UI, agent, and backend (Phase 1).
//
// ONE interface (EditorApi), two narrowed views (AgentApi / McpApi) derived
// by Omit — never hand-maintained. The agent CANNOT run things because
// runGeneration/startChain/runStage/runAll are missing methods on its view;
// tsc enforces it at compile time, the PTC allowlist (agent/graph_factory.py
// _PTC_ALLOWLIST) enforces the same boundary at runtime. "Agent builds,
// user owns Run" is structural, not a comment.
//
// Principles (PRO-PATTERN):
// • Import existing types, never redefine. Generation shapes come from
// lib/FlowProtocol.ts (the wire single source), flow shapes from
// FlowTypes.ts.
// • Every method maps 1:1 to a verified server/app.py route (route map
// below). No method without a route; no route without a method here
// once a consumer needs it.
// • The run protocol is the only wire: POST /v1/flows/start (four
// shapes — doc / flat / YAML-spec / auto-routed; /v1/run + generate are
// one-release aliases) → run_id → GET /v1/flows/status/{run_id} →
// artifact URLs. No b64.
//
// Route map (audited 2026-08-06 against server/app.py):
// getModelCatalog → GET /v1/model-catalog
// getFormSpec → GET /v1/form-spec?model=
// listForms → GET /v1/forms[?tag=]
// listServices → GET /v1/services
// listModels → GET /v1/models
// runGeneration → POST /v1/flows/start (flat shape) + poll (see below)
// getFlowStatus→ GET /v1/flows/status/{run_id} (polls)
// fetchRunStatus → GET /v1/flows/status/{run_id} (single shot)
// listRuns → GET /v1/flows/runs
// stopRun → POST /v1/flows/stop/{run_id} (UI-only)
// startChain → POST /v1/flows/start ({flow: name})
// (the /v1/flows/yaml/* client family retired 2026-09-05 — the yaml
// format died with the parser; NO LEGACY)
// (openFlow/listFlows/openStudio are facades over the existing
// zustand stores — no backend call.)
// ════════════════════════════════════════════════════════════════════════
import type { CompiledGenerationResult, FlowRunStatus } from "@melite/catalog"
import type { KindRunner } from "@melite/slots"
import type { PluginRow, UiSlotEntry, ThemeEntry } from "@melite/contracts"

// Re-export the wire vocabulary so consumers import EVERYTHING from the
// contract — one surface, not contract + protocol modules.
export type {
 CompiledGenerationResult,
 FlowRunStatus,
} from "@melite/catalog"
import type {
  StageDescriptor,
  FlowStage,
  FlowStatus,
  InlineFlowBody,
  StudioTarget,
} from "@melite/contracts"

// ── Request bodies (wire shapes, one each) ──────────────────────────────
/** Body of POST /v1/flows/start (flat shape): {model?, service?, ...params}.
 * The server resolves service-only payloads via _resolve_model_from_service
 * (D3 — every catalog form compiles through compile.py _FORM_CONFIGS). */
export interface GenerationRequest {
 model?: string
 service?: string
 [k: string]: unknown
}

/** Options for a named-flow start ({flow: name}). Only gateway-honored
 * keys: the run name and the abort signal. The C-era partial-run knobs
 * (start_from/reuse_run_id/stop_after/overrides) are GONE — the py
 * gateway never read them; sending an ignored key is the silent-drop
 * class. Partial runs return as a deliberate gateway feature with a
 * wall, never a tossed body key. */
export interface ChainStartOpts {
 /** The flow rename (2026-08-09): carried into the run sidecar +
 * list_runs. In-memory + wire — refresh reverts to the authored name. */
 name?: string
 signal?: AbortSignal
}

// (the /v1/flows/render_glb + /v1/flows/render_textured client family
// retired 2026-09-07 — C-retirement orphans the py gateway never
// ported; last caller deleted in the same stroke, NO LEGACY)

// ═══════════════════════════════════════════════════════════════════════
// 1. EDITOR API — service-level operations (one instance)
// ═══════════════════════════════════════════════════════════════════════
/** One mounted plugin row — GET /v1/plugins (the honest inventory:
 * disabled plugins list with enabled:false). */


/** One shell-lane entry — GET /v1/shell (§8.2 third lane). A declarative
 * center tab (iframe surface) + its rail button; the file stem is the id. */
export interface ShellEntry {
 id: string
 label: string
 /** Lucide icon NAME (validated server-side against a closed set). */
 icon: string
 order: number
 /** The iframe src: http(s) URL or root-relative /path. */
 url: string
 rail: "primary" | "drawer" | "studio"
 /** The owning plugin id. */
 plugin: string
}

/** One right-pane lane entry — GET /v1/right-panes (H-RIGHT, §16.7). A
 * declarative right-sidebar pane (iframe surface) with mode coupling;
 * the file stem is the id. */
export interface RightPaneEntry {
 id: string
 label: string
 /** Lucide icon NAME (validated server-side against a closed set). */
 icon: string
 order: number
 /** The iframe src: http(s) URL or root-relative /path. */
 url: string
 /** The center-tab ids this pane appears alongside (mode coupling). */
 modes: string[]
 /** The pane's rail width in px (the host sizes itself from it). */
 px: number
 /** The owning plugin id. */
 plugin: string
}

/** One card-kind declaration → GET /v1/kinds (the kinds lane, the
 * fourth lane). The wire shape of cardSeam's CardKindDef minus the
 * component: icon is a lucide NAME resolved client-side from the
 * closed map (the same set the shell lane pins). */
export interface KindEntry {
 kind: string
 runnable: boolean
 executable: boolean
 formSpec: boolean
 compound: boolean
 opensStudio: boolean
 badgeTone: "brand" | "default"
 /** Lucide icon NAME (optional; validated server-side). */
 icon?: string
 /** Runner family (the dispatcher's SSOT). Closed vocab: "" (default
  *  rule — flowName → chain, executable card → generation) or "input".
  *  Absent on the wire === "". The dispatcher (resolveStageRunner) reads
  *  this instead of branching on kind names (2026-09-05 declarative
  *  runner resolution). */
 runner?: KindRunner
}
/** One UI-slot claim from GET /v1/ui-slots (the fifth lane): a plugin's
 *  OVERRIDE of a render cell at a precedence tier. The slot union lives
 *  in the frontend (shell/uiSlotSeam consumers); the first-party
 *  defaults ride this wire too, at precedence 10 — served from the
 *  plugin ui.yaml declarations (python/editor_runs.py ui_slots), the same
 *  lane any override rides. */


export interface EditorApi {
 // ── Discovery (read-only) ──────────────────────────────────────────
 getModelCatalog(): Promise<Record<string, unknown>>
 getFormSpec(model: string): Promise<unknown>
 listForms(tag?: string): Promise<Record<string, unknown>>
 listServices(): Promise<Array<{ name: string; label?: string; [k: string]: unknown }>>
 listModels(): Promise<Array<{ name: string; [k: string]: unknown }>>
 // ─ Plugin inventory (the HTTP register surface, §6 item 4)
 /** GET /v1/plugins — every mounted plugin, disabled included. */
 listPlugins(): Promise<PluginRow[]>
 /** GET /v1/shell — the shell lane's entries (§8.2), enabled plugins only. */
 listShell(): Promise<ShellEntry[]>
 /** GET /v1/right-panes — the right-pane lane (H-RIGHT, §16.7). */
 listRightPanes(): Promise<RightPaneEntry[]>
 /** The kinds lane wire → every card kind from ENABLED plugins
  * (melite-core the zeroth provider). */
 listKinds(): Promise<KindEntry[]>
 listUiSlots(): Promise<UiSlotEntry[]>
 /** GET /v1/themes — the themes lane (§16, data-only): palette
  * overrides from ENABLED plugins. Selection is client-side. */
 listThemes(): Promise<ThemeEntry[]>

 // ── Generation ─ UI-only (NOT on AgentApi) ─────────────────────────
 /** Start + poll a compiled generation to completion. Returns the
 * flow-protocol result (see lib/FlowProtocol.ts): started (runId +
 * status + artifact urls). */
 runGeneration(
 req: GenerationRequest,
 opts?: {
 signal?: AbortSignal
 intervalMs?: number
 onTick?: (status: FlowRunStatus) => void
 onStart?: (runId: string) => void
 },
 ): Promise<CompiledGenerationResult>
 /** Poll a run until terminal (delegates to pollFlowRun). */
 getFlowStatus(
 runId: string,
 opts?: { signal?: AbortSignal; maxWaitMs?: number; intervalMs?: number },
 ): Promise<FlowRunStatus>
 /** ONE status fetch — no polling. The flow viewer runs its own
 * poll loop (overlap guard + change-skip) over this; includeLog=true
 * enriches log_tail for the console pane. */
 fetchRunStatus(
 runId: string,
 opts?: { includeLog?: boolean },
 ): Promise<FlowRunStatus>
 /** List recent runs for the picker (GET /v1/flows/runs → {runs}). */
 listRuns(): Promise<Array<Record<string, unknown>>>
 // ── Named flows ({flow: name}) — run UI-only ─
 startChain(
 flowName: string,
 opts?: ChainStartOpts,
 ): Promise<{ runId: string; queued?: boolean; queuePosition?: number }>
 /** POST /v1/flows/start — start an AGENT-COMPOSED typed flow as ONE
  * run ({flow_inline}). The body is the draft's compiled flow member
  * with the cards' current params overlaid (syncInlineFlow). Sends
  *  ONLY keys the py gateway honors — no partial-run knobs. */
 startInlineFlow(
 body: InlineFlowBody,
 opts?: { name?: string; draftId?: string; signal?: AbortSignal },
 ): Promise<{ runId: string; queued: boolean; queuePosition?: number }>
 /** Stop a run (POST /v1/flows/stop/{run_id} → 200 result | 404 {error}).
 * UI-only — NOT on AgentApi. */
 stopRun(runId: string): Promise<Record<string, unknown>>
 /** Delete a finished run + its artifacts (DELETE /v1/flows/runs/
 * {run_id} → 200 {status: deleted} | 400/404 {error}). UI-only —
 * NOT on AgentApi (the agent must never destroy user output). */
 deleteRun(runId: string): Promise<Record<string, unknown>>

 // ── Flow instances (agent composes; USER runs) ─────────────────
 openFlow(id?: string): Promise<FlowStub>
 listFlows(): Promise<FlowStub[]>

 // ── Studio instances ───────────────────────────────────────────────
 openStudio(
 target: StudioTarget,
 context?: Record<string, unknown>,
 ): Promise<StudioStub>
}

export interface FlowStub {
 readonly id: string
 readonly intent: string
 // NOTE: build_flow moved to the backend (2026-08-13) — the stub has
 // NO compose. The store hydrates from the backend draft (hydrateDraft).
 updateStage(stageId: string, patch: Partial<StageDescriptor>): Promise<void> // old update_card
 attachChatImage(stageId: string): Promise<void> // old attach_chat_image
 stages(): Promise<FlowStage[]>
 status(): Promise<FlowStatus>
 // Run methods — UI only. The agent receives AgentFlowStub (below),
 // which Omits these.
 runStage(stageId: string): Promise<{ runId: string }>
 runAll(): Promise<void>
 close(): Promise<void> // dispose → drops capability
}

/** One studio session. Discriminant `target` selects per-studio ops.
 * Per-studio method groups mirror their existing zustand stores —
 * directorStore.ts, bodyStudio.ts, the Pose surface — NOT invented. */
export interface StudioStub {
 readonly target: StudioTarget
 close(): Promise<void>
 // ── director (mirrors directorStore: addSegment/updateSegment/…) ──
 addSegment(opts?: Record<string, unknown>): Promise<string>
 updateSegment(id: string, patch: Record<string, unknown>): Promise<void>
 deleteSegment(id: string): Promise<void>
 setSegmentResult(
 id: string,
 videoUrl: string,
 thumbnailUrl: string,
 seed: number,
 ): Promise<void>
 setAnchorImage(url: string | null): Promise<void>
 // ── body (mirrors bodyStudio: Character/IdentityModel ops) ────────
 setIdentityModel?(m: "soma" | "mhr" | "anny"): Promise<void>
 editCharacter?(patch: Record<string, unknown>): Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════
// 3. NARROWED VIEWS — the ACL, derived not hand-written
// ═══════════════════════════════════════════════════════════════════════
/** What the `agent` agent gets. Run tools structurally absent — run
 * control (start/stop) is user-owned; reads
 * (listRuns/fetchRunStatus/getFlowStatus) stay. */
export interface AgentApi extends Omit<EditorApi,
 | "runGeneration" // ← the agent CANNOT run things; user owns Run
 | "startChain"
 | "startInlineFlow"
 | "stopRun"
 | "deleteRun" // ← nor destroy them
> {}

/** The flow facade the agent receives (run methods stripped). */
export interface AgentFlowStub extends Omit<FlowStub,
 | "runStage"
 | "runAll"
> {}

/** External MCP clients — narrower still: discovery + validate only.
 * Replaces server/mcp_inference.py (deleted 2026-08-06 — 1b). */
export interface McpApi extends Omit<AgentApi,
 | "openFlow"
 | "listFlows"
 | "openStudio"
> {}
