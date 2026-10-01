/** card.ts — the CardStage unified view-model + its vocabulary.
 * The CONTRACT every card surface (app + plugin studios) shares.
 * Types only — runtime helpers stay app-side. */
export type CardGenre = "image" | "video" | "audio" | "3d" | "motion" | "other" | "text"

/** Card TAGS — orthogonal to genre. A tag describes HOW a thing was made
 * or what it carries, never WHAT KIND of media it is. 'ai_generated' is
 * the badge former-genre that was demoted (2026-09-04): provenance is a
 * tag, not a media category. */
export type CardTag = "ai_generated"

export type CompoundMode = "fanout" | "flow" | "modifiers"

export interface CompoundBlock {
  mode: CompoundMode
  /** Ordered child stage ids — the members of this subgraph. Drag-reorder
   * of the parent moves the whole block; the children's relative order is
   * preserved. */
  childIds: string[]
  /** ``mode === "flow"`` — the YAML flow filename (the atomic run).
   * Mirrors the top-level ``stage.flowName`` (the named flow this
   * compound runs through the {flow:name} door). */
  flowName?: string
  /** ``mode === "modifiers"`` — which ``params[paramKey]`` array holds the
   * modifier entries (loras / controlnets / kind.param_key). The host
   * stage's params are the storage; the compound block只是 names the slot. */
  paramKey?: string
}

// flowCardTypes — the CardStage unified view-model, shared by every
// card-surface module. Moved VERBATIM from FlowCard.tsx (Cut 2, C2):
// one status vocabulary, one card-shape vocabulary, the runnability rule,
// and the tile play-affordance decision live here as the dependency root —
// everything else in the kit imports from this module, never from the
// aggregator shim.
import type { Provenance } from "./vocab"

// ── The unified view-model ────────────────────────────────────────────────

/** One status vocabulary for every run source (agent, YAML bricks, assets).
 * `stopped` is the deliberate-or-outside-force terminal: a stopped,
 * interrupted, or unknown-outcome run folds there — terminal, but not a
 * success and not the run's own failure. */
export type CardStatus =
  | "pending" | "running" | "queued" | "done" | "error" | "stopped"
  | "stale" | "cached" | "skipped" | "reused"
  
// CARD KINDS ARE OPEN SEAM VOCABULARY (2026-08-19, the cardSeam cut):
// the closed CardKind union is DEAD — `kind` is a plain string, the
// registry (./cardSeam) is the authority for behavior flags, first-party
// kinds ride the wire (GET /v1/kinds; melite-core is the zeroth
// provider), and the gate test
// (src/__tests__/card-seam.gate.test.tsx) pins the set. A plugin adds a
// kind by registering; nobody edits this file for chrome.

/** Live KSampler step progress for the per-card progress bar
* (2026-08-08). Streamed from ComfyUI's WebSocket by the backend's
* step-progress sink, surfaced via the status poll's onTick. ``value`` /
* ``max`` are the sampler's current step + total steps (e.g. 5/20);
* ``node`` is the ComfyUI node id doing the sampling (purely diagnostic). */
export interface CardProgress {
  value: number
  max: number
    node?: string
}

/** A stage's result, normalized from any backend shape. */
export interface CardResult {
  assetUrls: string[]
  /** Named artifacts → wireable URLs (Phase 5, named outputs) — the
  * slot picker's per-output rows. Mirrors StageResult.artifacts; {} for
  * single-output bricks + legacy runs. */
  artifacts: Record<string, string>
  metadata: Record<string, unknown>
  durationSec?: number
  /** Multi-output click-through (render_glb_views → 8 views). */
  gallery?: { name: string; url: string }[]
  /** Auto-baked motion previews (kimodo_motion etc.). */
  motionPreviews?: { label: string; url: string | null; artifact: string }[]
}

export interface CardInputBinding {
  slot: string
  source: { stage: string; output?: string } | { initial: true }
}

/**
 * A flow stage as the card renders it — the superset of the agent
 * stage, the YAML brick stage, and a plain asset entry. Surfaces map their
 * own model into this; the card never reads a surface store.
 */
export interface CardStage {
  id: string
  title: string
  subtitle?: string
  kind: string
  /** Model key / brick family / asset name — shown on the service badge. */
  service: string
  model?: string
  /** Catalog-declared media genre — ONE vocabulary
   *  (image|video|audio|3d|motion|other|text), resolved
   *  by the surface adapter from the model route. Drives the badge icon +
   *  video gating. undefined = non-catalog service (generic badge). */
  genre?: CardGenre
  /** Provenance/descriptor tags — orthogonal to genre. 'ai_generated'
   *  lives here, never in genre. */
  tags?: CardTag[]
  params: Record<string, unknown>
  inputSlots?: string[]
  inputBindings?: CardInputBinding[]
  /** Upstream stage ids (dependency wiring). */
  inputs: string[]
  /** Per-slot NAMED output selection (input_prep → mask): inputOutputs[i]
  * names which output to consume from inputs[i]. null/absent = primary
  * (assetUrls[0]). Mirrors FlowStage.inputOutputs by index. */
  inputOutputs?: (string | null)[]
  /** Resolved 0-based indices of upstream stages in the surface's own
  * stage list — what the "← from 01" badge renders. Precomputed by the
  * adapter so the card stays store-free. */
  inputIndices: number[]
  result: CardResult | null
  history?: unknown[]
  status: CardStatus
  error?: string | null
  /** Run-level log tail (YAML surfaces). Rendered in the detail console. */
  console?: string
  /** Composed comfy graph for this step (Phase C). Rendered under params. */
  comfyGraph?: unknown
  /** Live KSampler step progress — present while status === "running" and a
  * sampler node is actively stepping. Drives the per-card progress bar
  * (the loading bar built into the card, 2026-08-08). null otherwise. */
  progress?: CardProgress | null
  /** Live WS activity line (2026-08-10) — ONE line per consumed ComfyUI
  * frame, streamed through the backend's protocol sink: model loads
  * (phase "loading" + node_class), sampling steps, output, waiting,
  * errors. Rendered between the status text and the progress bar. */
  activity?: {
    phase: string
    node?: string
    node_class?: string
    message?: string
    [k: string]: unknown
  } | null
  /** The ACTIVE run's id (2026-08-15) — stamped by the store's onTick
  * handlers the moment a run starts, so mid-run surfaces (the studio's
  * Stop button) can interrupt WITHOUT waiting for completion. Falls back
  * to result.metadata.runId (post-completion) — the pre-2026-08-15
  * derivation that left Stop unrenderable mid-run. */
  runId?: string | null
  /** WHO authored the card — the agent-generated marker (2026-08-09).
  * ``agent`` — the agent built this stage (build_flow tool).
  * ``user`` — the user hand-authored it (ServicePicker + addStage).
  * ``imported`` — hydrated from a past run (flowStore.loadRun).
 *
 * Optional for graceful rollout — existing call sites that don't set it
 * render unchanged (no badge). The closed vocabulary mirrors the
 * pydantic enum in backend/core/ui/list_filter_schema.py :: Provenance;
 * drift between the two fails CI. */
  provenance?: Provenance
  /** Whether this card's output appears in the left sidebar asset library
  * (2026-08-12). undefined / true = saved to sidebar (default). false =
  * artifact persists on disk + renders on the card but the sidebar filters
  * it out — intermediate generations don't clog the library. */
  saveToAssets?: boolean
  /** Surface-specific extras (raw stage, size, artifacts…). */
  meta?: Record<string, unknown>
  /** For ``kind === "compound"`` — the ONE first-class subgraph block
  * (2026-08-12 formalization): mode + ordered childIds. Present iff this
  * card is a container that holds other cards. The projection
  * (subgraph.projectSubgraphs) collapses the children into this card's
  * segment; the renderer shows a ChainCardTile face + a ChainZoomOverlay
  * drill-down. See FlowTypes.ts CompoundBlock for the full rationale. */
  compound?: CompoundBlock
}

/** What the action buttons do. `onEdit` (open a surface-level editor, e.g.
* the YAML config modal) wins over in-place editing via `onEditSave`. */
export interface CardActions {
  onRun?: (stageId: string) => void
  /** Cancel the in-flight run (the tile's play→stop affordance, 2026-08-13).
   *  The store's cancelRun is the whole-run action — only one stage runs at
   *  a time inline, and a chain run is all-stages, so cancelling the run IS
   *  "stop this card". Wired to the tile's stop (Square) button which shows
   *  in place of play while a card is running. */
  onCancel?: (stageId: string) => void
  onEdit?: (stageId: string) => void
  onEditSave?: (stageId: string, params: Record<string, unknown>, service?: string, opts?: { userEdit?: boolean }) => void
  /** Rename a card's title. Schema-enforced through the store's mutation
  * gate (lib/cardMutations); drilldown-only — the tile title is inert
  * (ONE card form: the drilldown is the editing surface). */
  onRename?: (stageId: string, title: string) => void
  onOpenInStudio?: (stageId: string) => void
  /** Wire/unwire an input slot to an upstream stage (store's setSlotInput).
  * SlotGrid calls this alongside onEditSave's params clear — a slot is
  * wired OR manually attached, never both. outputName selects a NAMED
  * output from the upstream (mask, …); null/omitted = primary. */
  onWireSlot?: (stageId: string, slotKey: string, upstreamId: string | null, outputName?: string | null) => void
 /** Toggle whether the card's output appears in the left sidebar (2026-08-12).
 * * false = the artifact persists on disk + renders on the card, but the
 * * sidebar filters it out. The store immediately hides/unhides the current
 * * run; future runs respect the new flag. */
 onToggleSaveToAssets?: (stageId: string, value: boolean) => void
 /** Group N selected stages into a compound parent (2026-08-12). The parent
 * * is inserted at the first member's position; members stay in place (the
 * * projection skips them inside the parent's segment). Returns the new
 * * parent's id, or null when fewer than 2 valid ids were supplied. */
 onGroupStages?: (childIds: string[], mode?: CompoundMode, title?: string) => string | null
 /** Dissolve a compound parent (2026-08-12). Children stay in the array at
 * * their current positions; only the container is removed. No-op (returns
 * * false) for ids that aren't compound parents. */
 onUngroupStages?: (parentId: string) => boolean
 /** Phase C dry-fire (2026-08-14): run EVERY gate a real Run runs, mint
 * * nothing. RESOLVES with the plan; REJECTS with the exact error a real
 * * Run would surface — including the familyParamContract copy ("unknown
 * * parameter 'x' — not in the family signature"). Presence-gated: the
 * * adapter omits it for chain-backed flows (their Run is a
 * * whole-spec start). */
}

/** Anything with a status + stages — FlowDoc and RunStatus both fit. */
export interface CardFlowLike {
  status: string
  stages: { kind?: string; status: string }[]
}

/**
 * The tile-level play affordance (2026-08-07: "cards need to have a small
 * play button on them, even when they are collapsed"). Returns null when no
 * affordance should render, or the {verb, icon} describing what the button
 * does in the current state:
 * • pending → start (Play)
 * • error → retry (RotateCw)
 * • done/stale/cached/reused + seed=-1 → reroll (RotateCw) — random mode
 * only; a fixed seed reproduces the same output, so a play button would
 * be a deceptive no-op ("only if the seed is set to -1 for rerolls").
 * • running / skipped → null (already going / nothing to run)
 * Exported for the unit tests so the rule is pinned independently of DOM.
 */
export type TilePlayAffordance = { verb: string; icon: "play" | "reroll" }
