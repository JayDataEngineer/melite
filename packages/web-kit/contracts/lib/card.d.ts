/** card.ts — the CardStage unified view-model + its vocabulary.
 * The CONTRACT every card surface (app + plugin studios) shares.
 * Types only — runtime helpers stay app-side. */
export type CardGenre = "image" | "video" | "audio" | "3d" | "motion" | "other" | "text";
/** Card TAGS — orthogonal to genre. A tag describes HOW a thing was made
 * or what it carries, never WHAT KIND of media it is. 'ai_generated' is
 * the badge former-genre that was demoted (2026-09-04): provenance is a
 * tag, not a media category. */
export type CardTag = "ai_generated";
export type CompoundMode = "fanout" | "flow" | "modifiers";
export interface CompoundBlock {
    mode: CompoundMode;
    /** Ordered child stage ids — the members of this subgraph. Drag-reorder
     * of the parent moves the whole block; the children's relative order is
     * preserved. */
    childIds: string[];
    /** ``mode === "flow"`` — the YAML flow filename (the atomic run).
     * Mirrors the top-level ``stage.flowName`` (the named flow this
     * compound runs through the {flow:name} door). */
    flowName?: string;
    /** ``mode === "modifiers"`` — which ``params[paramKey]`` array holds the
     * modifier entries (loras / controlnets / kind.param_key). The host
     * stage's params are the storage; the compound block只是 names the slot. */
    paramKey?: string;
}
import type { Provenance } from "./vocab.ts";
/** One status vocabulary for every run source (agent, YAML bricks, assets).
 * `stopped` is the deliberate-or-outside-force terminal: a stopped,
 * interrupted, or unknown-outcome run folds there — terminal, but not a
 * success and not the run's own failure. */
export type CardStatus = "pending" | "running" | "queued" | "done" | "error" | "stopped" | "stale" | "cached" | "skipped" | "reused";
/** Live KSampler step progress for the per-card progress bar
* (2026-08-08). Streamed from ComfyUI's WebSocket by the backend's
* step-progress sink, surfaced via the status poll's onTick. ``value`` /
* ``max`` are the sampler's current step + total steps (e.g. 5/20);
* ``node`` is the ComfyUI node id doing the sampling (purely diagnostic). */
export interface CardProgress {
    value: number;
    max: number;
    node?: string;
}
/** A stage's result, normalized from any backend shape. */
export interface CardResult {
    assetUrls: string[];
    /** Named artifacts → wireable URLs (Phase 5, named outputs) — the
    * slot picker's per-output rows. Mirrors StageResult.artifacts; {} for
    * single-output bricks + legacy runs. */
    artifacts: Record<string, string>;
    metadata: Record<string, unknown>;
    durationSec?: number;
    /** Multi-output click-through (render_glb_views → 8 views). */
    gallery?: {
        name: string;
        url: string;
    }[];
    /** Auto-baked motion previews (kimodo_motion etc.). */
    motionPreviews?: {
        label: string;
        url: string | null;
        artifact: string;
    }[];
}
export interface CardInputBinding {
    slot: string;
    source: {
        stage: string;
        output?: string;
    } | {
        initial: true;
    };
}
/**
 * A flow stage as the card renders it — the superset of the agent
 * stage, the YAML brick stage, and a plain asset entry. Surfaces map their
 * own model into this; the card never reads a surface store.
 */
export interface CardStage {
    id: string;
    title: string;
    subtitle?: string;
    kind: string;
    /** Model key / brick family / asset name — shown on the service badge. */
    service: string;
    model?: string;
    /** Catalog-declared media genre — ONE vocabulary
     *  (image|video|audio|3d|motion|other|text), resolved
     *  by the surface adapter from the model route. Drives the badge icon +
     *  video gating. undefined = non-catalog service (generic badge). */
    genre?: CardGenre;
    /** Provenance/descriptor tags — orthogonal to genre. 'ai_generated'
     *  lives here, never in genre. */
    tags?: CardTag[];
    params: Record<string, unknown>;
    inputSlots?: string[];
    inputBindings?: CardInputBinding[];
    /** Upstream stage ids (dependency wiring). */
    inputs: string[];
    /** Per-slot NAMED output selection (input_prep → mask): inputOutputs[i]
    * names which output to consume from inputs[i]. null/absent = primary
    * (assetUrls[0]). Mirrors FlowStage.inputOutputs by index. */
    inputOutputs?: (string | null)[];
    /** Resolved 0-based indices of upstream stages in the surface's own
    * stage list — what the "← from 01" badge renders. Precomputed by the
    * adapter so the card stays store-free. */
    inputIndices: number[];
    result: CardResult | null;
    history?: unknown[];
    status: CardStatus;
    error?: string | null;
    /** Run-level log tail (YAML surfaces). Rendered in the detail console. */
    console?: string;
    /** Composed comfy graph for this step (Phase C). Rendered under params. */
    comfyGraph?: unknown;
    /** Live KSampler step progress — present while status === "running" and a
    * sampler node is actively stepping. Drives the per-card progress bar
    * (the loading bar built into the card, 2026-08-08). null otherwise. */
    progress?: CardProgress | null;
    /** Live WS activity line (2026-08-10) — ONE line per consumed ComfyUI
    * frame, streamed through the backend's protocol sink: model loads
    * (phase "loading" + node_class), sampling steps, output, waiting,
    * errors. Rendered between the status text and the progress bar. */
    activity?: {
        phase: string;
        node?: string;
        node_class?: string;
        message?: string;
        [k: string]: unknown;
    } | null;
    /** The ACTIVE run's id (2026-08-15) — stamped by the store's onTick
    * handlers the moment a run starts, so mid-run surfaces (the studio's
    * Stop button) can interrupt WITHOUT waiting for completion. Falls back
    * to result.metadata.runId (post-completion) — the pre-2026-08-15
    * derivation that left Stop unrenderable mid-run. */
    runId?: string | null;
    /** WHO authored the card — the agent-generated marker (2026-08-09).
    * ``agent`` — the agent built this stage (build_flow tool).
    * ``user`` — the user hand-authored it (ServicePicker + addStage).
    * ``imported`` — hydrated from a past run (flowStore.loadRun).
   *
   * Optional for graceful rollout — existing call sites that don't set it
   * render unchanged (no badge). The closed vocabulary lives at
   * vocab.ts :: Provenance — the single owner. */
    provenance?: Provenance;
    /** Whether this card's output appears in the left sidebar asset library
    * (2026-08-12). undefined / true = saved to sidebar (default). false =
    * artifact persists on disk + renders on the card but the sidebar filters
    * it out — intermediate generations don't clog the library. */
    saveToAssets?: boolean;
    /** Surface-specific extras (raw stage, size, artifacts…). */
    meta?: Record<string, unknown>;
    /** For ``kind === "compound"`` — the ONE first-class subgraph block
    * (2026-08-12 formalization): mode + ordered childIds. Present iff this
    * card is a container that holds other cards. The projection
    * (subgraph.projectSubgraphs) collapses the children into this card's
    * segment; the renderer shows a ChainCardTile face + a ChainZoomOverlay
    * drill-down. See FlowTypes.ts CompoundBlock for the full rationale. */
    compound?: CompoundBlock;
}
//# sourceMappingURL=card.d.ts.map