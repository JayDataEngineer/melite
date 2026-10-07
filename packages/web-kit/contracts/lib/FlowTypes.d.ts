import type { CompoundMode, CompoundBlock } from "./card.js";
import type { Provenance } from "./vocab.js";
/** How a stage executes + what card it renders as.
 *
 * ``input`` — the doc-driven media-import family (the input model
 * package, packages/models/input). Runs via POST /v1/flows/start with
 * a 1-step inline
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
 *   • ``flow`` — a named-flow atomic run (replaces ``kind: "chain"`` +
 *     ``flowName``: one /v1/flows/start {flow:name} call for the whole
 *     group; children are the flow's stages).
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
 * runner untouched). Mode-specific extras ride along (``flowName`` for
 * flow mode, ``paramKey`` for modifiers mode). */
/** The compound block AS THE FLOW BUILDER EMITS IT — mirror of CompoundBlock
 * with the wire's snake-free field set (the estate-queue flow builder).
 * ``childIds`` already resolved. The store adopts this as-is on
 * hydration; no client-side resolution exists anymore (2026-08-13:
 * build_flow moved to the estate — the browser is a dumb renderer). */
export interface BackendCompoundBlock {
    mode: CompoundMode;
    childIds: string[];
    flowName?: string;
    paramKey?: string;
}
/** One draft stage as POST /v1/flows/drafts returns it in the full
 * draft (GET /v1/flows/drafts/{draftId}). The backend already did
 * capability resolution, slot-vocabulary fold, null-seeding, and
 * inputIndices→inputs resolution — the store fills ONLY render state
 * (result/status/error/cacheKey) on hydration. */
export interface BackendStage {
    id: string;
    title: string;
    subtitle?: string | null;
    kind: string;
    service: string;
    params: Record<string, unknown>;
    inputs: string[];
    /** Parallel to inputs: which NAMED output to consume from the upstream
     * (null = primary). Persisted by the 2026-08-22 wire PATCH so named
     * output wires survive rehydrate. */
    inputOutputs?: (string | null)[];
    flowName?: string;
    studio?: "body";
    studioContext?: Record<string, unknown>;
    compound?: BackendCompoundBlock;
    provenance?: "agent";
    /** Persisted render state — present when a run completed and the
     * frontend PATCHed the result to the draft. hydrateDraft adopts it
     * so generated images survive history restore. */
    result?: StageResult | null;
    runStatus?: string;
}
/** The full draft document — the hydration source for hydrateDraft.
 * ``draft_id`` becomes the flow's id (one draft = one flow). */
export interface BackendDraft {
    draft_id: string;
    intent: string;
    stages: BackendStage[];
    status: string;
    createdAt: number;
    completedAt: number | null;
    /**
     * The COMPILED FLOW BODY (multi-step compose, 2026-09-05): present
     * iff the draft was composed by build_flow's multi mode. This is the
     * exact JSON that validated at POST /v1/flows/validate — the draft
     * doc is its ONE carrier (the tool result carries only the slim
     * projection). The card surface's Run posts it to /v1/flows/start as
     * ``{flow_inline}`` — ONE typed run; ``FlowDoc.inlineFlow`` adopts
     * it on hydration and per-stage params overlay onto it at start.
     */
    flow?: InlineFlowBody;
}
/** One typed edge row of an inline flow (the runs-registry inline-flow
 * contract): an initial-pool key, or an upstream stage output. */
export type InlineFlowEdge = {
    initial: string;
} | {
    stage: string;
    output: string;
};
/** One stage row of an inline flow body. ``inputs``/``expected`` carry
 * the folded typed edges; ``outputs`` declares what the stage
 * produces (kind per name). */
export interface InlineFlowStage {
    id: string;
    engine: string;
    description?: string;
    params?: Record<string, unknown>;
    inputs?: Record<string, InlineFlowEdge>;
    expected?: Record<string, string>;
    outputs?: Record<string, string>;
}
/** The agent-compiled multi-step pipeline as the estate accepts it
 * (``{flow_inline: ...}`` at /v1/flows/start and /v1/flows/validate —
 * the runs-registry validation path, runsValidate.ts). */
export interface InlineFlowBody {
    id: string;
    description?: string;
    stages: InlineFlowStage[];
}
/** Stage kinds that own a catalog model route and therefore have a
 * /v1/form-spec. The other kinds (body, studio-link, input, preview,
 * compound) render FIXED UIs with no fetch — their `service` field is a
 * display label (e.g. "body"), not a catalog model. Calling
 * loadFormSpec("body") used to 500 (now 404) on every drill-down of a body
 * card (2026-08-10). ``compound`` is container-only — it has no model of
 * its own (its children do). */
/** Which studio a studio-link card opens. */
export type StudioTarget = "pose" | "director" | "body";
/** Flow-wide status. */
export type FlowStatus = "draft" | "ready" | "running" | "queued" | "done" | "failed" | "stale";
/** Per-stage status. "cached" = result available from cache (no re-run needed). */
export type FlowStageStatus = "pending" | "running" | "queued" | "done" | "error" | "stale" | "cached";
/** The result of executing a stage. */
export interface StageResult {
    /** Assets produced by this stage (added to the asset store). The FLAT
    * list — [0] is the primary output; the legacy wire-by-position path
    * (collectUpstreamResults) injects this. */
    assetUrls: string[];
    /** Named artifacts → wireable URLs (Phase 5, named outputs). When a
    * multi-output brick (input_prep → media + mask) feeds a downstream
    * card, the slot picker offers each named output so the user can wire
    * mask → lanpaint_mask (not just the primary via assetUrls[0]). Empty
    * for single-output bricks + legacy runs (named_urls absent). */
    artifacts: Record<string, string>;
    /** Metadata returned by the backend (timing, model info, etc.). */
    metadata: Record<string, unknown>;
    /** When the stage completed (epoch ms). */
    completedAt: number;
    /** Execution duration in seconds. */
    durationSec: number;
}
/** A single stage in a flow document. */
export interface FlowStage {
    id: string;
    /** Display title — what the user sees on the card. */
    title: string;
    /** Subtitle / description shown under the title. */
    subtitle?: string;
    /** How this stage executes + renders — open seam vocabulary (cardSeam). */
    kind: string;
    /** The model key or service name (e.g. "krea2", "trellis", "kimodo"). */
    service: string;
    /** Generation parameters passed to the backend. */
    params: Record<string, unknown>;
    /** Ordered per-slot upstream stage ids: inputs[i] ↔ the i-th input slot
    * the params declare (stageSlots — INPUT_SLOTS ∩ params). "" = unwired
    * slot. Agent-written/loaded docs may be shorter or longer (reads are
    * index-safe); the slot UI maintains length === slot count. */
    inputs: string[];
    /** Per-slot output NAME: inputOutputs[i] names which output to consume
    * from inputs[i]. null/absent = the primary (assetUrls[0]). Set when a
    * multi-output upstream (input_prep → media + mask) feeds a slot that
    * needs a non-primary output. Parallel to ``inputs`` by index; the
    * slot UI maintains length parity. */
    inputOutputs?: (string | null)[];
    /** Result after execution. null = not yet run. */
    result: StageResult | null;
    /** Current status. */
    status: FlowStageStatus;
    /** Error message if status === "error". */
    error: string | null;
    /** Content hash of (service + params + upstream results). For caching. */
    cacheKey: string | null;
    /** Live KSampler step progress (set while status === "running"). Surfaced
    * from ComfyUI's WebSocket by the backend's step-progress sink; drives
    * the per-card progress bar built into the cards (2026-08-08). null when
    * the stage isn't actively sampling. */
    progress?: {
        value: number;
        max: number;
        node?: string;
    } | null;
    /** Live WS activity line (2026-08-10): one line per consumed ComfyUI
    * frame — model loads (phase "loading" + node_class), sampling steps,
    * output, errors — mapped from the backend's protocol sink envelope.
    * null when the stage isn't running. Drives the per-card activity line. */
    activity?: {
        phase: string;
        node?: string;
        node_class?: string;
        message?: string;
        [k: string]: unknown;
    } | null;
    /** WHO created the stage — the agent-generated marker (2026-08-09).
    * Set at the creation site: ``agent`` (the estate's flow builder,
    * 2026-08-13), ``user`` (addStage), ``imported`` (hydrateRunStages /
    * hydrateSpecSteps). Optional so legacy code paths keep working during
    * rollout; the card badge renders only when set. The closed vocabulary
    * lives at vocab.ts :: Provenance — the single owner. */
    provenance?: Provenance;
    /** Whether this stage's output appears in the left sidebar asset library
    * (2026-08-12). undefined / true = saved to sidebar (default). false = the
    * artifact persists on disk + renders on the card, but the sidebar filters
    * it out — intermediate generations don't clog the library. Set by the
    * store's setSaveToAssets action; consulted at completion time. */
    saveToAssets?: boolean;
    /** The run ID (from /v1/flows/start), for status polling. */
    runId?: string;
    /** YAML flow filename (for flows stages). */
    flowName?: string;
    /** The YAML run ID (from /v1/flows/start, YAML-spec shape). */
    flowRunId?: string;
    /** Which studio to open when double-clicked. */
    studio?: StudioTarget;
    /** Context payload loaded into the studio store on open. */
    studioContext?: Record<string, unknown>;
    /** Present iff ``kind === "compound"``. Declares this stage as a container
    * for other stages (the children live in the same flat ``stages[]``,
    * referenced by id). NULL for all other kinds. See ``CompoundBlock``. */
    compound?: CompoundBlock;
}
/** A flow instance — built from descriptors or hydrated from a run/spec. */
export interface FlowDoc {
    id: string;
    /** The user's original intent ("make a waifu"). */
    intent: string;
    /**
    * Authored display name (the flow rename, 2026-08-09). Optional —
    * undefined means "not authored" (falls back to intent everywhere).
    * In-memory + wire: runs keep it via the sidecar; a reload reverts.
    * Enforced through the DOC_MUTATIONS gate (lib/cardMutations).
    */
    name?: string;
    /** Ordered list of stages. */
    stages: FlowStage[];
    /** Flow-wide status. */
    status: FlowStatus;
    /** When the flow was created (epoch ms). */
    createdAt: number;
    /** When the flow last completed (epoch ms). */
    completedAt: number | null;
    /**
    * Chain-backed flow (loaded from a YAML spec, 2026-08-07): the spec
    * filename. When set, the flow's stages are the SPEC's steps — a
    * collection of actions — and execution goes through the YAML runner
    * (startChain with start_from/reuse_run_id), NOT the compile path.
    */
    flowName?: string;
    /** Last YAML run id — lets a card re-run reuse its upstream bricks. */
    flowRunId?: string | null;
    /**
     * Graph-backed flow (agent-composed, 2026-09-05): the COMPILED typed
     * body the draft carried (``BackendDraft.flow``). When set, the
     * doc's stages are the flow's stages (one card per stage, ids
     * SHARED) and Run means ONE ``{flow_inline}`` POST — the whole graph
     * as one run, server-side wiring, never per-stage card runs. User
     * edits to a card's params overlay onto the matching body stage at
     * start time (``syncInlineFlow``) so the typed run never silently
     * drops an edit.
     */
    inlineFlow?: InlineFlowBody;
    /**
     * Per-stage-index params snapshot taken when the spec was loaded —
     * the authored baseline, a hydration record of loadFlowSpec. It no
     * longer feeds start overrides (the C-era overrides sends were
     * silent drops, retired 2026-09-05); it dies with the spec-library
     * retirement stroke.
     */
    specBaseline?: Record<number, Record<string, unknown>>;
}
/** The authoring-time compound block — what the agent / UI declares. Uses
 * ``childIndices`` (0-based, into the descriptor array) because the author
 * doesn't know stage ids until materialization. The store resolves these
 * to ``childIds`` on ``FlowStage.compound`` (the runtime shape). */
export interface CompoundDescriptor {
    mode: CompoundMode;
    /** 0-based indices into the descriptor array — the member stages. The
     * store resolves them to childIds at materialization time. */
    childIndices: number[];
    /** ``mode === "flow"`` — the YAML flow filename. */
    flowName?: string;
    /** ``mode === "modifiers"`` — the params[paramKey] holding the entries. */
    paramKey?: string;
}
/** A stage descriptor — what build_flow materializes. */
export interface StageDescriptor {
    title: string;
    subtitle?: string;
    kind: string;
    service: string;
    params: Record<string, unknown>;
    /** Indices of upstream stages (0-based, into the descriptor array). */
    inputIndices?: number[];
    /** For "chain" stages: the YAML flow filename. */
    flowName?: string;
    /** For "studio-link" stages: which studio to open. */
    studio?: StudioTarget;
    /** For "studio-link" stages: context payload for the studio. */
    studioContext?: Record<string, unknown>;
    /** For "compound" stages: the subgraph block (mode + childIndices). */
    compound?: CompoundDescriptor;
}
//# sourceMappingURL=FlowTypes.d.ts.map
