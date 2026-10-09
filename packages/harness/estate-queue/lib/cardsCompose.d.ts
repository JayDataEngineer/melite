import type { FactsReads } from "@melite/comfyui-cordis";
import type { PreparedCard } from "./cardsRegistry.ts";
import { type CardDeclRow, type ModelFactsRow } from "./cardsFacts.ts";
export interface ComposeSeat {
    cardDecls(facts?: Record<string, ModelFactsRow>): Record<string, CardDeclRow>;
    modelFacts(): Record<string, import("./cardsFacts.ts").ModelFactsRow>;
    modelMids(): Set<string>;
    objectInfo(): Record<string, unknown> | null;
    primeObjectInfo(): Promise<boolean>;
    readsSync(): FactsReads;
    resolveCardFamily(mid: string, facts?: Record<string, import("./cardsFacts.ts").ModelFactsRow>): string;
    /** The §23 cross-roots manifest (the queue seat's stateRoots —
     *  the dangling sweep's trees; J12: config-named, never env). */
    stateRoots(): readonly string[];
}
/** In-process compose (the core: steps 7-9) — per-call throwaway
 *  Context + ComfyUIService (owned by the call, never shared). */
/** THE NESTED STANZA UNWRAP (cli.ts:82-91, one function two seats):
 *  a `params` dict key in the incoming params IS the stanza;
 *  siblings merge over it. Exported so the phase-1 admission seat
 *  gates the LIFTED body, never the raw stanza shell. */
export declare function liftStanza(params: Record<string, unknown>): Record<string, unknown>;
export declare function composeOnce(deps: ComposeSeat, card: string, fam: string, params: Record<string, unknown>, runId: string, phase: string): Promise<Record<string, unknown>>;
/** THE ADMISSION CONTRACT GATE (one function, two seats — the
 *  phase-1 pre-compose seat and composeOnce's own re-run). Every
 *  param key must be a declared knob or ride the admits row; the
 *  absorbed mod surface counts (the interlock, 2026-09-08). */
export declare function admissionRefusal(deps: ComposeSeat, card: string, fam: string, lifted: Record<string, unknown>, phase: string): void;
/** Resolve + sweep + select + overlay + lift (steps 2-6):
   *  everything before compose. Throws CardArmError (the door maps
   *  it to the refusal envelope). `phase` stamps the phase-N voice
   *  on R1 selection refusals ("1" for validate/phase-1). Order
   *  mirrors resolve_card_model + the validate modelArm: artifact
   *  sweep FIRST (fail fast — a sloppy compose never runs), then
   *  legality, existence, the non-cordis arm check, selection,
   *  overlay, lift.
   *
   * @param factsArg a caller-resolved facts table. The validate
   *  door passes its degraded read (it answers from the catalog
   *  alone when the facts file is absent); omitted by every other
   *  seat, which takes the strict read here (`deps.modelFacts()`).
   */
export declare function prepareCardParams(deps: ComposeSeat, body: Record<string, unknown>, mid: string, phase: string, factsArg?: Record<string, ModelFactsRow>): PreparedCard;
//# sourceMappingURL=cardsCompose.d.ts.map
