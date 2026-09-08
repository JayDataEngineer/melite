// ════════════════════════════════════════════════════════════════════════
// editorClient — the thin fetch binding of EditorApi (Phase 1).
//
// NO wire logic lives here. Generation/poll/URL-collection delegate to
// lib/FlowProtocol.ts (the ONE implementation of the run protocol);
// discovery/chain/LLM methods are typed wrappers over the same REST routes
// the rest of the app uses. One typed surface, one implementation — the
// old ad-hoc callers (mcp.ts invokeService) were deleted in 1b
// (2026-08-06); every consumer speaks this surface directly (rule 4).
//
// The instance facades (openFlow/listFlows/studios) are wired over
// the EXISTING zustand stores (flowStore, directorStore) — the
// stores own all state, the stubs are capability boundaries + typed facades
// over them. Holding a stub IS the capability.
// No backend call happens in a facade.
//
// Fetch discipline (mirrors mcp.ts): calls that START GPU work
// (runGeneration, startChain) use RAW fetch — a 504 retry would start a
// SECOND GPU run. Idempotent GETs (discovery, status poll) and dry-runs
// (validate, export-comfyui, compose) go through apiFetch (retry + dedup +
// liveness).
// ════════════════════════════════════════════════════════════════════════
import { apiFetch, assertNoParamDrops, collectNamedArtifacts, collectStageUrls, describeErrorBody, ensureDraftId, pollFlowRun, runCompiledGeneration } from "@melite/catalog"
import type { FetchUrl } from "@melite/catalog/api"
import type { ArtifactSource, FlowRunStatus } from "@melite/catalog"
import { getLastChatImage } from "@/surfaces/flow/chatImageAttach"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import type {
  FlowStage,
  FlowStatus,
  InlineFlowBody,
  StudioTarget,
} from "@melite/contracts"
import type { ChainStartOpts, EditorApi, GenerationRequest, KindEntry, FlowStub, ShellEntry, RightPaneEntry, StudioStub } from "./editorApi"
import type { UiSlotEntry, PluginRow, ThemeEntry } from "@melite/contracts"
/** Re-exported wire helpers — artifact collectors (single source:
 *  lib/FlowProtocol.ts). Consumers import them here, not from two modules. */
export { collectStageUrls, collectNamedArtifacts }
export type { ArtifactSource }

/** THE typed surface. One instance for the whole UI session. */
export const editorClient: EditorApi = {
  // ── Discovery (idempotent GETs → apiFetch) ─────────────────────────
  async getModelCatalog() {
    const res = await apiFetch("/v1/model-catalog")
    return (await res.json()) as Record<string, unknown>
  },
  async getFormSpec(model) {
    const res = await apiFetch(`/v1/form-spec?model=${encodeURIComponent(model)}`)
    // NO SILENT DROPS (api.ts header): a non-2xx response must NEVER
    // masquerade as a spec. 2026-08-11: the z-image endpoint 500'd
    // (families-import NameError) and the error body was parsed as the
    // "spec" — no features.modifiers → the controlnet dropdown vanished
    // with zero signal. Throw so every caller surfaces it.
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as {
        error?: string
      } | null
      throw new Error(
        `form-spec ${model} failed (${res.status}): ${body?.error ?? res.statusText}`,
      )
    }
    return (await res.json()) as unknown
  },
  async listForms(tag) {
    const res = await apiFetch(tag ? `/v1/forms?tag=${encodeURIComponent(tag)}` : "/v1/forms")
    return (await res.json()) as Record<string, unknown>
  },
  async listServices() {
    const res = await apiFetch("/v1/services")
    return (await res.json()) as Array<{ name: string; label?: string }>
  },
  async listModels() {
    const res = await apiFetch("/v1/models")
    return (await res.json()) as Array<{ name: string }>
  },
  // ─ Plugin inventory (HTTP register surface ─ idempotent GET + a POST
  //    that flips a manifest flag; neither starts GPU work) ───
  async listPlugins() {
    const res = await apiFetch("/v1/plugins")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error(`plugins inventory failed (${res.status}): ${body?.error ?? res.statusText}`)
    }
    const body = (await res.json()) as { plugins?: PluginRow[] }
    return body.plugins ?? []
  },
  async listShell() {
    const res = await apiFetch("/v1/shell")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error("shell entries failed (" + res.status + "): " + (body?.error ?? res.statusText))
    }
    const body = (await res.json()) as { entries?: ShellEntry[] }
    return body.entries ?? []
  },
  async listRightPanes() {
    const res = await apiFetch("/v1/right-panes")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error("right panes failed (" + res.status + "): " + (body?.error ?? res.statusText))
    }
    const body = (await res.json()) as { panes?: RightPaneEntry[] }
    return body.panes ?? []
  },
  async listKinds() {
    const res = await apiFetch("/v1/kinds")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error("card kinds failed (" + res.status + "): " + (body?.error ?? res.statusText))
    }
    const body = (await res.json()) as { kinds?: KindEntry[] }
    return body.kinds ?? []
  },
  async listUiSlots() {
    const res = await apiFetch("/v1/ui-slots")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error("ui slots failed (" + res.status + "): " + (body?.error ?? res.statusText))
    }
    const body = (await res.json()) as { uiSlots?: UiSlotEntry[] }
    return body.uiSlots ?? []
  },
  async listThemes() {
    const res = await apiFetch("/v1/themes")
    if (!res.ok) {
      const body = (await res.json().catch((): null => null)) as { error?: string } | null
      throw new Error("themes failed (" + res.status + "): " + (body?.error ?? res.statusText))
    }
    const body = (await res.json()) as { themes?: ThemeEntry[] }
    return body.themes ?? []
  },

  // ── Generation (start = raw fetch; poll = flowProtocol) ────────
  async runGeneration(
    req: GenerationRequest,
    opts?: {
      signal?: AbortSignal
      intervalMs?: number
      onTick?: (status: FlowRunStatus) => void
      onStart?: (runId: string) => void
    },
  ) {
    return runCompiledGeneration({ ...req }, opts?.signal, {
      intervalMs: opts?.intervalMs,
      onTick: opts?.onTick,
      onStart: opts?.onStart,
    })
  },

  async getFlowStatus(runId, opts) {
    return pollFlowRun(runId, opts?.signal, {
      maxWaitMs: opts?.maxWaitMs,
      intervalMs: opts?.intervalMs,
    })
  },

  // ── Named flows ({flow: name} door) ───────────────────────────────
  async startChain(flowName: string, opts?: ChainStartOpts) {
    // GPU-starting POST — raw fetch, no retry (a retry would start a SECOND run).
    // The param is the flow NAME from the library; the start door takes
    // {flow: name} (the {yaml:} shape retired with the 2026-09-04 rework —
    // docs/queue/flows.md). ONLY gateway-honored keys ride the body
    // (start_from/stop_after/reuse_run_id/overrides were C-era runner
    // knobs the py gateway never reads — sending an ignored key is the
    // silent-drop class; partial runs return as a deliberate gateway
    // feature with a wall, never a tossed body key).
    const body: Record<string, unknown> = { flow: flowName }
    if (opts?.name) body.name = opts.name  // the flow rename (2026-08-09)
    // CARD BIRTH LAW (operator order 2026-09-06): the start door
    // 4xxes a start without a doc-backed draft_id — the named flow
    // is born as a card FIRST (compose door mints the doc), then the
    // run links to it. An envelope-tolerant mint: the SAME body the
    // run posts, preserved as the card extras.
    body.draft_id = await ensureDraftId(body, opts?.signal)
    assertNoParamDrops(body)
    const res = await fetch("/v1/flows/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts?.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`startChain failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}`)
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(
        `startChain failed: /v1/flows/start returned non-JSON body: ${text.slice(0, 2000)}`,
      )
    }
    const runId = data.run_id
    if (typeof runId !== "string") {
      throw new Error(
        `startChain failed: /v1/flows/start returned no run_id: ${describeErrorBody(text)}`,
      )
    }
    // Queue pass-through (2026-08-14): if the run was QUEUED (not active),
    // the caller must show "Queued…" instead of optimistic "running".
    return {
      runId,
      queued: data.status === "queued",
      queuePosition: typeof data.queue_position === "number" ? data.queue_position : undefined,
    }
  },
  /** POST /v1/flows/start — start an AGENT-COMPOSED typed flow as ONE
   *  run ({flow_inline}). The body is the draft's compiled `flow`
   *  member (what validated at /v1/flows/validate), with the cards'
   *  current params overlaid per stage (syncInlineFlow). Raw fetch, no
   *  retry — a retry would start a SECOND GPU run.
   *
   *  NO start_from / stop_after / reuse_run_id / overrides: the py
   *  gateway honors none of them on the flow doors (they ride the
   *  request as inert passengers — the silent-drop class). A typed
   *  flow runs WHOLE; partial-run knobs are a deliberate gateway
   *  feature, never a body key the server ignores. */
  async startInlineFlow(
    body: InlineFlowBody,
    opts?: { name?: string; draftId?: string; signal?: AbortSignal },
  ): Promise<{ runId: string; queued: boolean; queuePosition?: number }> {
    const req: Record<string, unknown> = { flow_inline: body }
    if (opts?.name) req.name = opts.name
    // CARD BIRTH LAW (operator order 2026-09-06): the start door
    // 4xxes a start without a doc-backed draft_id. The agent-flow
    // caller passes the flow's own draft id (one draft = one flow);
    // any other caller gets its card minted here, never cardless.
    req.draft_id = opts?.draftId ?? await ensureDraftId(req, opts?.signal)
    assertNoParamDrops(req)
    const res = await fetch("/v1/flows/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: opts?.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`startInlineFlow failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}`)
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(
        `startInlineFlow failed: /v1/flows/start returned non-JSON body: ${text.slice(0, 2000)}`,
      )
    }
    const runId = data.run_id
    if (typeof runId !== "string") {
      throw new Error(
        `startInlineFlow failed: /v1/flows/start returned no run_id: ${describeErrorBody(text)}`,
      )
    }
    return {
      runId,
      queued: data.status === "queued",
      queuePosition: typeof data.queue_position === "number" ? data.queue_position : undefined,
    }
  },
  // ── Run protocol reads + run control (idempotent → apiFetch) ───────
  async listRuns() {
    const res = await apiFetch("/v1/flows/runs")
    const data = (await res.json()) as { runs?: Array<Record<string, unknown>> }
    return data.runs ?? []
  },
  /** Single status fetch — the flow viewer's own poll loop calls this;
   *  getFlowStatus (poll-until-terminal) is the completion-oriented
   *  counterpart. includeLog enriches log_tail for the console pane. */
  async fetchRunStatus(runId, opts) {
    const url = opts?.includeLog
      ? `/v1/flows/status/${runId}?include_log=true`
      : `/v1/flows/status/${runId}`
    const res = await apiFetch(url as FetchUrl)
    if (!res.ok) throw new Error(`status ${res.status}`)
    return (await res.json()) as FlowRunStatus
  },
  /** Stop a run — 200 result | 404 {error} passed through as {error}
   *  (the viewer's stop button tolerates a dead run). UI-only. */
  async stopRun(runId) {
    const res = await apiFetch(`/v1/flows/stop/${runId}`, { method: "POST" })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) return { error: String(data.error ?? `HTTP ${res.status}`) }
    return data
  },
  /** Delete a run + its artifacts — 200 {status: deleted} | 400/404
   *  {error, code} passed through as {error, code}. UI-only. The `code`
   *  field (still-running | not-found) is preserved so callers can branch
   *  on it (e.g. treat not-found as an idempotent success). */
  async deleteRun(runId) {
    const res = await apiFetch(`/v1/flows/runs/${runId}`, { method: "DELETE" })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) return { error: String(data.error ?? `HTTP ${res.status}`), code: data.code ?? "error" }
    return data
  },
  // ── Instance facades (1b — wired over the zustand stores) ─────────
  // The stores are the single source of truth; the stubs are capability
  // boundaries + typed facades over them. No backend call happens here.
  async openFlow() {
    // The store holds ONE live flow (the UI's single surface); the id
    // parameter exists on the contract for future multi-flow support.
    return flowStub()
  },
  async listFlows() {
    return useAgentFlowStore.getState().flow ? [flowStub()] : []
  },
  async openStudio(target, context) {
    return studioStub(target, context)
  },
}

// ── Stub factories ────────────────────────────────────────────────────────

/** One flow document — a live typed view over flowStore. */
function flowStub(): FlowStub {
  const store = () => useAgentFlowStore.getState()
  return {
    get id() {
      return store().flow?.id ?? ""
    },
    get intent() {
      // The flow rename (2026-08-09): the authored name wins; intent is
      // the fallback (and stays populated by loadFlowSpec).
      return store().flow?.name ?? store().flow?.intent ?? ""
    },
    async updateStage(stageId, patch) {
      // Mirrors update_card: merge params (and optional service), mark
      // stale. Missing stage = no-op (the store's contract). A title in the
      // patch routes through the declarative mutation gate (cardMutations) —
      // rejected mutations THROW (no caller sends invalid titles today).
      const stage = store().flow?.stages.find((s) => s.id === stageId)
      if (!stage) return
      if (patch.title !== undefined) {
        const res = store().applyStageMutation(stageId, { kind: "rename", value: patch.title })
        if ("error" in res) throw new Error(res.error)
      }
      await store().updateStageParams(stageId, patch.params ?? {}, patch.service)
    },
    async attachChatImage(stageId) {
      // Browser-side twin of the attach_chat_image tool. The TOOL is the
      // primary path (it has the agent context); this is for UI consumers
      // that hold the stub — it reads the image the tool cached via
      // rememberChatImage (chatImageAttach.ts). No image cached = no-op
      // (the contract has no error channel here).
      const dataUrl = getLastChatImage()
      if (!dataUrl) return
      await store().updateStageParams(stageId, { input_image: dataUrl })
    },
    async stages(): Promise<FlowStage[]> {
      return store().flow?.stages ?? []
    },
    async status(): Promise<FlowStatus> {
      return store().flow?.status ?? "draft"
    },
    async runStage(stageId) {
      await store().executeStage(stageId)
      const stage = store().flow?.stages.find((s) => s.id === stageId)
      const meta = stage?.result?.metadata ?? {}
      const runId = String(
        stage?.runId ??
          stage?.flowRunId ??
          meta.runId ??
          meta.flowRunId ??
          "",
      )
      return { runId }
    },
    async runAll() {
      await store().runAll()
    },
    async close() {
      store().clear()
    },
  }
}

/**
 * One studio session. Discriminant `target` selects per-studio ops — the
 * per-studio method groups mirror their existing zustand stores. The
 * Director Studio was ARCHIVED 2026-08-11 (web/editor/archived/) — the
 * director method group is now a fail-loud stub (the interface is still
 * part of the EditorApi contract); the body (setIdentityModel /
 * editCharacter) group stays UNIMPLEMENTED.
 */
function studioStub(
  target: StudioTarget,
  _context?: Record<string, unknown>,
): StudioStub {
  return {
    target,
    async close() {
      // Studios are app-level surfaces persisted in their stores; closing
      // a stub drops the capability without tearing store state down.
    },
    // ── director (ARCHIVED — the Director Studio no longer ships) ────
    async addSegment() {
      throw new Error("Director Studio is archived (web/editor/archived/)")
    },
    async updateSegment() {
      throw new Error("Director Studio is archived (web/editor/archived/)")
    },
    async deleteSegment() {
      throw new Error("Director Studio is archived (web/editor/archived/)")
    },
    async setSegmentResult() {
      throw new Error("Director Studio is archived (web/editor/archived/)")
    },
    async setAnchorImage() {
      throw new Error("Director Studio is archived (web/editor/archived/)")
    },
  }
}

// The instance-facade methods return the stub interfaces; the contract
// types them, and 1b replaced the throwers with the real store facades above.
export type { FlowStub, StudioStub } from "./editorApi"

// Re-export the protocol helpers so consumers of the typed surface never
// need a second import for the run protocol vocabulary.
export { pollFlowRun, runCompiledGeneration, assertNoParamDrops } from "@melite/catalog"
