// Flow types — the ONE flow document data model (built from stage
// descriptors or hydrated from a run/spec).
import type { CompoundMode, CompoundBlock } from "./card"
import type { Provenance } from "./vocab"
//
// ARCHITECTURE:
// User intent ("make a waifu") or capability tile
// → build_flow tool / addStage
// → flowStore materializes a FlowDoc with stages
// → Stages execute via EXISTING backends (generate_media, yaml/start —
// both now the ONE /v1/flows/start door, flat vs YAML-spec shapes)
// → Results land in the existing asset store
// → Cards render from the flow store state
//
// This is NOT a new compute engine. It's an orchestration + presentation
// layer that sits on top of the existing media. Each stage knows which
// backend to call and how to present its result as a card.
//
// STAGE KINDS:
// "generation" — calls generate_media (single ComfyUI run). Simple tasks:
// image gen, edit, upscale, detail. One card.
// "chain" — calls /v1/flows/start YAML-spec shape (multi-step YAML run).
// Complex tasks: 3D character creator. Renders as sequential
// sub-cards (one per YAML step).
// "studio-link" — doesn't execute immediately. Double-click opens a studio
// (Pose, Director, Body) with context loaded. The studio's
// output becomes the stage's result.
// "body" — a sculptable character body (the Body Studio surface,
// shrunk to a card). Owns phenotype coeffs + detail morphs
// in params; its drill-down is the mesh + slider panel. It
// is a SOURCE of identity, not a GPU stage — like
// studio-link, it never executes and never blocks runAll.
//
// CACHING:
// Each stage computes a cacheKey = hash(service + params + upstream cacheKeys).
// On re-run, if cacheKey matches → return cached result instantly (no server
// call). If params change → only that stage + downstream re-execute. This
// mirrors ComfyUI's server-side prompt-hash caching, but at the flow
// level, client-side.

/** How a stage executes + what card it renders as.
 *
 * ``input`` — the doc-driven media-import family (media/comfyui/families/
 * input_prep.py). Runs via POST /v1/flows/start with a 1-step inline
 * doc (no catalog entry, no form spec) — the card editor renders a FIXED
 * field set (source / crop / scale / trim / volume). The output artifact
 * feeds downstream generation bricks via the normal consumes topology.
 *
 * ``compound`` (2026-08-12 formalization) — a card that HOLDS other cards.
 * The ONE first-class "subgraph" concept: the parent carries a
 * ``CompoundBlock`` (``mode`` + ordered ``childIds``); children stay in the
 * flat ``stages[]`` array so wiring, cache-key, and the runner are
 * untouched. Three modes collapse what used to be three separate hacks:
 *   • ``fanout`` — view-grouped siblings (replaces multi-edit condensation:
 *     N consecutive same-family edits rendered as one block). Identity is
 *     FIRST-CLASS now — the group survives reorder (the old pure-view
 *     projection dissolved the moment a member moved).
 *   • ``flow`` — a YAML-backed atomic run (replaces ``kind: "chain"`` +
 *     ``yamlFlow``: one /v1/flows/start yaml call for the whole
 *     group; children are the spec's steps).
 *   • ``modifiers`` — param-bag deps (replaces the subcard grid container:
 *     LoRA/CN/generic modifier entries folded into the host's params).
 * ``kind: "chain"`` remains as a legacy alias for ``compound.mode="flow"``
 * during the migration; new code emits ``compound``.
 *
 * OPEN VOCABULARY (2026-08-19, the cardSeam cut): the closed StageKind
 * union is DEAD — `kind` is a plain string, behavior flags live in the
 * card-kind registry (./cardSeam; the served wire /v1/kinds is the
 * one source), and the gate test pins the set. */

/** The three shapes of "a card holds other cards" — ONE concept, three
 * specializations. See ``StageKind`` docs for the full rationale. */

/** The first-class subgraph block — present on a stage iff ``kind ===
 * "compound"``. ``childIds`` is the ONE source of truth for "what does this
 * card hold"; children live in the same flat ``stages[]`` (wiring/cache-key/
 * runner untouched). Mode-specific extras ride along (``yamlFlow`` for
 * flow mode, ``paramKey`` for modifiers mode). */

/** The compound block AS THE BACKEND WROTE IT — mirror of CompoundBlock
 * with the wire's snake-free field set (drafts.py). ``childIds`` already
 * resolved. The store adopts this as-is on hydration; no client-side
 * resolution exists anymore (2026-08-13: build_flow moved to the
 * backend — the browser is a dumb renderer). */
export interface BackendCompoundBlock {
  mode: CompoundMode
  childIds: string[]
  yamlFlow?: string
  paramKey?: string
}

/** One draft stage as POST /v1/flows/drafts returns it in the full
 * draft (GET /v1/flows/drafts/{draftId}). The backend already did
 * capability resolution, slot-vocabulary fold, null-seeding, and
 * inputIndices→inputs resolution — the store fills ONLY render state
 * (result/status/error/cacheKey) on hydration. */
export interface BackendStage {
  id: string
  title: string
  subtitle?: string | null
  kind: string
  service: string
  params: Record<string, unknown>
  inputs: string[]
  /** Parallel to inputs: which NAMED output to consume from the upstream
   * (null = primary). Persisted by the 2026-08-22 wire PATCH so named
   * output wires survive rehydrate. */
  inputOutputs?: (string | null)[]
  yamlFlow?: string
  studio?: "body"
  studioContext?: Record<string, unknown>
  compound?: BackendCompoundBlock
  provenance?: "agent"
  /** Persisted render state — present when a run completed and the
   * frontend PATCHed the result to the draft. hydrateDraft adopts it
   * so generated images survive history restore. */
  result?: StageResult | null
  runStatus?: string
}

/** The full draft document — the hydration source for hydrateDraft.
 * ``draft_id`` becomes the flow's id (one draft = one flow). */
export interface BackendDraft {
  draft_id: string
  intent: string
  stages: BackendStage[]
  status: string
  createdAt: number
  completedAt: number | null
}

/** Stage kinds that own a catalog model route and therefore have a
 * /v1/form-spec. The other kinds (body, studio-link, input, preview,
 * compound) render FIXED UIs with no fetch — their `service` field is a
 * display label (e.g. "body"), not a catalog model. Calling
 * loadFormSpec("body") used to 500 (now 404) on every drill-down of a body
 * card (2026-08-10). ``compound`` is container-only — it has no model of
 * its own (its children do). */
/** Which studio a studio-link card opens. */
export type StudioTarget = "pose" | "director" | "body"

/** Flow-wide status. */
export type FlowStatus =
 | "draft" // stages being composed by the agent
 | "ready" // all stages have params, awaiting run
 | "running" // one or more stages executing
 | "queued" // run enqueued — another run is active on the GPU (ONE-GPU queue)
 | "done" // all stages completed
 | "failed" // one or more stages failed
 | "stale" // params changed since last run, needs re-run

/** Per-stage status. "cached" = result available from cache (no re-run needed). */
export type FlowStageStatus =
 | "pending"
 | "running"
 | "queued" // backend run door enqueued this run (ONE-GPU queue)
 | "done"
 | "error"
 | "stale" // upstream changed or params edited — needs re-run
 | "cached" // cache hit — result available without execution

/** The result of executing a stage. */
export interface StageResult {
 /** Assets produced by this stage (added to the asset store). The FLAT
 * list — [0] is the primary output; the legacy wire-by-position path
 * (collectUpstreamResults) injects this. */
 assetUrls: string[]
 /** Named artifacts → wireable URLs (Phase 5, named outputs). When a
 * multi-output brick (input_prep → media + mask) feeds a downstream
 * card, the slot picker offers each named output so the user can wire
 * mask → lanpaint_mask (not just the primary via assetUrls[0]). Empty
 * for single-output bricks + legacy runs (named_urls absent). */
 artifacts: Record<string, string>
 /** Metadata returned by the backend (timing, model info, etc.). */
 metadata: Record<string, unknown>
 /** When the stage completed (epoch ms). */
 completedAt: number
 /** Execution duration in seconds. */
 durationSec: number
}

/** A single stage in a flow document. */
export interface FlowStage {
 id: string
 /** Display title — what the user sees on the card. */
 title: string
 /** Subtitle / description shown under the title. */
 subtitle?: string
 /** How this stage executes + renders — open seam vocabulary (cardSeam). */
 kind: string
 /** The model key or service name (e.g. "krea2", "trellis", "kimodo"). */
 service: string
 /** Generation parameters passed to the backend. */
 params: Record<string, unknown>
 /** Ordered per-slot upstream stage ids: inputs[i] ↔ the i-th input slot
 * the params declare (stageSlots — INPUT_SLOTS ∩ params). "" = unwired
 * slot. Agent-written/loaded docs may be shorter or longer (reads are
 * index-safe); the slot UI maintains length === slot count. */
 inputs: string[]
 /** Per-slot output NAME: inputOutputs[i] names which output to consume
 * from inputs[i]. null/absent = the primary (assetUrls[0]). Set when a
 * multi-output upstream (input_prep → media + mask) feeds a slot that
 * needs a non-primary output (mask → lanpaint_mask). Parallel to
 * ``inputs`` by index; padInputs pads this too. */
 inputOutputs?: (string | null)[]
 /** Result after execution. null = not yet run. */
 result: StageResult | null
 /** Current status. */
 status: FlowStageStatus
 /** Error message if status === "error". */
 error: string | null
 /** Content hash of (service + params + upstream results). For caching. */
 cacheKey: string | null
 /** Live KSampler step progress (set while status === "running"). Surfaced
 * from ComfyUI's WebSocket by the backend's step-progress sink; drives
 * the per-card progress bar built into the cards (2026-08-08). null when
 * the stage isn't actively sampling. */
 progress?: { value: number; max: number; node?: string } | null
 /** Live WS activity line (2026-08-10): one line per consumed ComfyUI
 * frame — model loads (phase "loading" + node_class), sampling steps,
 * output, errors — mapped from the backend's protocol sink envelope.
 * null when the stage isn't running. Drives the per-card activity line. */
 activity?: {
 phase: string
 node?: string
 node_class?: string
 message?: string
 [k: string]: unknown
 } | null
 /** WHO created the stage — the agent-generated marker (2026-08-09).
 * Set at the creation site: ``agent`` (backend build_flow / drafts.py,
 * 2026-08-13), ``user`` (addStage), ``imported`` (hydrateRunStages /
 * hydrateSpecSteps). Optional so legacy code paths keep working during
 * rollout; the card badge renders only when set. Mirrors the pydantic enum
 * in backend/core/ui/list_filter_schema.py. */
 provenance?: Provenance

 /** Whether this stage's output appears in the left sidebar asset library
 * (2026-08-12). undefined / true = saved to sidebar (default). false = the
 * artifact persists on disk + renders on the card, but the sidebar filters
 * it out — intermediate generations don't clog the library. Set by the
 * store's setSaveToAssets action; consulted at completion time. */
 saveToAssets?: boolean

 // ── For "generation" stages ──
 /** The run ID (from /v1/flows/start), for status polling. */
 runId?: string

 // ── For "chain" stages ──
 /** YAML flow filename (for flows stages). */
 yamlFlow?: string
 /** The YAML run ID (from /v1/flows/start, YAML-spec shape). */
 yamlRunId?: string

 // ── For "studio-link" stages ──
 /** Which studio to open when double-clicked. */
 studio?: StudioTarget
 /** Context payload loaded into the studio store on open. */
 studioContext?: Record<string, unknown>

 // ── For "compound" stages (the ONE subgraph concept, 2026-08-12) ──
 /** Present iff ``kind === "compound"``. Declares this stage as a container
 * for other stages (the children live in the same flat ``stages[]``,
 * referenced by id). NULL for all other kinds. See ``CompoundBlock``. */
 compound?: CompoundBlock
}

/** A flow instance — built from descriptors or hydrated from a run/spec. */
export interface FlowDoc {
 id: string
 /** The user's original intent ("make a waifu"). */
 intent: string
 /**
 * Authored display name (the flow rename, 2026-08-09). Optional —
 * undefined means "not authored" (falls back to intent everywhere).
 * In-memory + wire: runs keep it via the sidecar; a reload reverts.
 * Enforced through the DOC_MUTATIONS gate (lib/cardMutations).
 */
 name?: string
 /** Ordered list of stages. */
 stages: FlowStage[]
 /** Flow-wide status. */
 status: FlowStatus
 /** When the flow was created (epoch ms). */
 createdAt: number
 /** When the flow last completed (epoch ms). */
 completedAt: number | null
 /**
 * Chain-backed flow (loaded from a YAML spec, 2026-08-07): the spec
 * filename. When set, the flow's stages are the SPEC's steps — a
 * collection of actions — and execution goes through the YAML runner
 * (startChain with start_from/reuse_run_id), NOT the compile path.
 */
 yamlFlow?: string
 /** Last YAML run id — lets a card re-run reuse its upstream bricks. */
 yamlRunId?: string | null
 /**
 * Per-stage-index params snapshot taken when the spec was loaded. The
 * diff between a card's params and this baseline becomes the startChain
 * overrides — the YAML stays the SSOT, edits ride along as overrides.
 */
 specBaseline?: Record<number, Record<string, unknown>>
}

/** The authoring-time compound block — what the agent / UI declares. Uses
 * ``childIndices`` (0-based, into the descriptor array) because the author
 * doesn't know stage ids until materialization. The store resolves these
 * to ``childIds`` on ``FlowStage.compound`` (the runtime shape). */
export interface CompoundDescriptor {
  mode: CompoundMode
  /** 0-based indices into the descriptor array — the member stages. The
   * store resolves them to childIds at materialization time. */
  childIndices: number[]
  /** ``mode === "flow"`` — the YAML flow filename. */
  yamlFlow?: string
  /** ``mode === "modifiers"`` — the params[paramKey] holding the entries. */
  paramKey?: string
}

/** A stage descriptor — what build_flow materializes. */
export interface StageDescriptor {
 title: string
 subtitle?: string
 kind: string
 service: string
 params: Record<string, unknown>
 /** Indices of upstream stages (0-based, into the descriptor array). */
 inputIndices?: number[]
 /** For "chain" stages: the YAML flow filename. */
 yamlFlow?: string
 /** For "studio-link" stages: which studio to open. */
 studio?: StudioTarget
 /** For "studio-link" stages: context payload for the studio. */
 studioContext?: Record<string, unknown>
 /** For "compound" stages: the subgraph block (mode + childIndices). */
 compound?: CompoundDescriptor
}
