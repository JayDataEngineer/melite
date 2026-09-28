// runsValidateShared.ts — shared kernel split from runsValidate.ts (pure move,
// zero logic changes): closed vocabularies, flow-domain types, FlowError,
// and the card-registry face.
import { WIRE_STAGE_KEYS } from "@melite/contracts/benchStage";
import type { CardDefinition } from "@melite/comfyui-cordis";

/** The door's answer (status folds away at the remote seam; the
 *  payload rides verbatim). */
export interface FlowsValidateAnswer {
  status: number;
  payload: Record<string, unknown>;
}

/** The card-registry face the pure half touches, STRUCTURAL (the
 *  producing service is the cardRegistry stroke's; null = the
 *  loud-refusal paths above — never a silent degrade). */
export interface CardRegistryLike {
  defsSync(): Map<string, CardDefinition>;
  objectInfo(): Record<string, unknown> | null;
}

// ENGINE_TABLE: engine_type -> {plugin_id, default_output kind}.
// MONO-ENGINE LAW (operator order, 2026-09-08: "we are building an
// api caller for comfyui, not having engines anymore"): ComfyUI is
// the only engine. The old engine tiers (cpp/audio-cpp,
// cpp/skintokens, cpp/autoremesher, node/anycreature, sim —
// estate-owned subprocess compute, every card decl-only and never
// composable) are QUARANTINED to vendor/retired-engines/ pending
// rebirth as vendored ComfyUI custom nodes. Probed live from
// scan_engines(); re-derived per run.
export const ENGINE_TABLE: Record<string, { plugin: string; def: string }> = {
  comfyui: { plugin: "comfyui", def: "image" },
  // Stroke 55 (the engine-generics seam): the craft loop engine +
  // the MCP grammar arm — any mcp:<server> id matching the seat's
  // grammar admits (membership stays the runs door's registry arm).
  craft: { plugin: "craft", def: "image" },
  // Stroke 60 (plan §5): the agent engine — the spawner loop. Its
  // stage is validated like any engine stage (params carry the four
  // pinned fields); outputs are arbitrary (artifacts land in the
  // run dir).
  agent: { plugin: "agent", def: "text" },
};

// ── closed vocabularies (Kind / SkipWhen order) ──────
export const KIND_VOCAB: readonly string[] = [
  "text",
  "image",
  "video",
  "audio",
  "mesh",
  "num",
  "lora",
  "seg",
  "data",
];
export const SKIP_VOCAB: readonly string[] = ["present", "absent"];

// _INLINE_TOP_KEYS sorted (dead/allowed messages).
export const INLINE_TOP_SORTED: readonly string[] = ["description", "id", "stages"];
// sorted(WIRE_STAGE_KEYS) — DERIVED, not retyped (the identity law,
// 2026-09-28). This was a hand-sorted copy of the contract's list:
// equal today, and a silent start-vs-validate disagreement the moment
// either side moved (the B-M9 class — a vocabulary declared once and
// enumerated twice will disagree with itself the first time it
// grows). The sort is the only transformation; the members are the
// contract's.
export const STAGE_KEYS_SORTED: readonly string[] = [...WIRE_STAGE_KEYS].sort();

// ── strict-body vocab ───────────────────
// Owned by the admission gate (src/core/params.ts — the SSOT shared
// with the start door); the envelope lift the modelArm used to own
// here moved to CardRegistryService.overlayCardParams (doors/
// the SAME lift the start door runs, so
// validate+start compose identical params). The id REs below stay here (flow-construction semantics,
// not envelope admission).

export const FLOW_ID_RE: RegExp = /^[a-z_][a-z0-9_-]*$/;

/** needCardRegistry (start-door-verbatim): the LOUD
 *  miswire when the card registry is absent — a card= stage
 *  refuses until the cardRegistry stroke slots the defs in. */
export function needCardRegistry(
  cards: CardRegistryLike | null | undefined,
  where: string,
): CardRegistryLike {
  if (cards === null || cards === undefined) {
    throw new Error(
      "[card_registry] no CardRegistryService for " + where +
        " — the registry rides the cards stroke (REBUILD ledger)",
    );
  }
  return cards;
}

// ── flow errors (FlowError — the door's 400 language) ─
export class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowError";
  }
}

export type Edge = { kind: "initial"; key: string } | { kind: "stage"; stage: string; output: string };

export interface StageSkip {
  initial: string;
  when: string;
}

// ── stage rows ──────────────────────────────────────────────────
export interface FlowStageRow {
  id: string;
  engine: string;
  description: string;
  params: Record<string, unknown>;
  inputs: Array<{ name: string; edge: Edge }>;
  outputs: Array<{ name: string; kind: string }>;
  expected: Array<{ name: string; kind: string }>;
  card: string;
  cardIo: Array<{ name: string; kind: string }>;
  skipWhen: StageSkip | null;
}

export interface Flow {
  id: string;
  description: string;
  stages: FlowStageRow[];
}

// ── to_graph door view (— card-less subset) ─────────
export interface GraphNode {
  id: string;
  engine: string;
  description: string;
  inputFrom: string[];
  inputNames: string[];
  outputs: Array<{ name: string; kind: string }>;
  params: unknown;
}
