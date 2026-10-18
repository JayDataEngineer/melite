// runsValidateShared.ts — shared kernel split from runsValidate.ts (pure move,
// zero logic changes): closed vocabularies, flow-domain types, FlowError,
// and the card-registry face.
import { WIRE_STAGE_KEYS } from "@melite/contracts/benchStage";
import { engineIdOk } from "@melite/engine-contract";
import { INLINE_TOP_KEYS } from "./runsGates.js";
// ENGINE_TABLE: engine_type -> {plugin_id, default_output kind}.
// MONO-ENGINE LAW (operator order, 2026-09-08: "we are building an
// api caller for comfyui, not having engines anymore"): ComfyUI is
// the only engine. The old engine tiers (cpp/audio-cpp,
// cpp/skintokens, cpp/autoremesher, node/anycreature, sim —
// estate-owned subprocess compute, every card decl-only and never
// composable) are QUARANTINED to vendor/retired-engines/ pending
// rebirth as vendored ComfyUI custom nodes. Probed live from
// scan_engines(); re-derived per run.
export const ENGINE_TABLE = {
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
/** THE ENGINE TABLE'S DEFAULT READ (P7 latent): the lattice's own
 *  rule, owned once — mcp:<server> grammar ids read the mcp-client
 *  row ("image"), table rows read their def, anything else reads
 *  undefined (unknown: no fill — the caller's door refuses, never
 *  guesses). Both doors derive from this one read (validate's
 *  lattice below, start's empty-outputs fill): a future grammar id
 *  absent from the table makes BOTH refuse instead of splitting
 *  validate-refuses/start-accepts. */
export function engineDefaultOutput(engine) {
    if (engine.startsWith("mcp:") && engineIdOk(engine))
        return "image";
    return ENGINE_TABLE[engine]?.def;
}
// ── closed vocabularies (Kind / SkipWhen order) ──────
export const KIND_VOCAB = [
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
export const SKIP_VOCAB = ["present", "absent"];
// _INLINE_TOP_KEYS sorted (dead/allowed messages) — DERIVED, not
// retyped (the identity law, 2026-10-11; the B1 finding). This was a
// hand-typed copy of runsGates' INLINE_TOP_KEYS: equal today, and a
// SILENT start-vs-validate disagreement the moment either side grew —
// proven, not predicted. Adding a top-level key to the start door's
// list alone left the start verdict `ok`, the validate door refusing
// `unknown keys ["labels"]`, and 115 tests green. The very next line
// below already DERIVED its sibling from the contract; this one was
// the copy the same audit had to be shown twice. The members are
// runsGates'; only the sort is ours.
export const INLINE_TOP_SORTED = [...INLINE_TOP_KEYS].sort();
// sorted(WIRE_STAGE_KEYS) — DERIVED, not retyped (the identity law,
// 2026-09-28). This was a hand-sorted copy of the contract's list:
// equal today, and a silent start-vs-validate disagreement the moment
// either side moved (the B-M9 class — a vocabulary declared once and
// enumerated twice will disagree with itself the first time it
// grows). The sort is the only transformation; the members are the
// contract's.
export const STAGE_KEYS_SORTED = [...WIRE_STAGE_KEYS].sort();
// ── strict-body vocab ───────────────────
// Owned by the admission gate (runsGates — the SSOT shared with the
// start door); the envelope lift is prepareCardParams' own (the
// compose seat, one owner for both doors — validate + start
// compose identical params). The id REs stay here
// (flow-construction semantics, not envelope admission).
// THE STAGE/FLOW ID SHAPE IS runsGates.FLOW_ID_RE — the admission
// law the flow arms test before asking the registry, re-exported
// here so this module's importers keep one address. One declaration
// in the tree: a second copy is a second answer to "is this a legal
// id", which closure-gate RULE 4d fails.
export { FLOW_ID_RE } from "./runsGates.js";
/** needCardRegistry (start-door-verbatim): the LOUD
 *  miswire when the card registry is absent — a card= stage
 *  refuses until the cardRegistry stroke slots the defs in. */
export function needCardRegistry(cards, where) {
    if (cards === null || cards === undefined) {
        throw new Error("[card_registry] no CardRegistryService for " + where +
            " — the registry rides the cards stroke (REBUILD ledger)");
    }
    return cards;
}
// ── flow errors (FlowError — the door's 400 language) ─
export class FlowError extends Error {
    constructor(message) {
        super(message);
        this.name = "FlowError";
    }
}
//# sourceMappingURL=runsValidateShared.js.map