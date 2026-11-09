import { cardAdmits } from "./cardsFacts.js";
export { cardAdmits };
import type { FactsReads } from "@melite/comfyui-cordis";
import type { PreparedCard } from "./cardsRegistry.js";
import { type CardDeclRow, type ModelFactsRow } from "./cardsFacts.js";
export interface ComposeSeat {
    cardDecls(facts?: Record<string, ModelFactsRow>): Record<string, CardDeclRow>;
    modelFacts(): Record<string, import("./cardsFacts.js").ModelFactsRow>;
    modelMids(): Set<string>;
    objectInfo(): Record<string, unknown> | null;
    primeObjectInfo(): Promise<boolean>;
    readsSync(): FactsReads;
    resolveCardFamily(mid: string, facts?: Record<string, import("./cardsFacts.js").ModelFactsRow>): string;
    /** THE FAMILY DOOR AT THE COMPOSE SEAT (operator 2026-11-14, the
     *  t4r four-key burn: "the AI MADE A CARD WITH THAT ERROR, AND
     *  RENDERED ANYWAYS"): the card's own admitFamily clause, judged
     *  by prepareCardParams on the RAW lifted body (pre-stamp). An
     *  OPTIONAL seam: NO LIVE CARD declares a clause after the
     *  2026-11-15 lane-law retirement — the t4r arm mounts the post
     *  chain, so no finish key is lane-dead, and a non-empty DECL
     *  deadKeys is banned at boot. A seat without the face admits. */
    admitStageFamily?(card: string, params: Record<string, unknown>): {
        ok: true;
    } | {
        ok: false;
        error: string;
    };
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
 *  absorbed mod surface counts (the interlock, 2026-09-08).
 *
 * @param facts an optional caller-resolved facts table (round-22
 *  compose audit Q3b, ONE-FACTS-READ): the validate door judges the
 *  whole arm — prepare, admission, lane — with its one degraded-or-
 *  fresh read instead of letting this gate re-read strict. Omitted
 *  by every other seat, which takes the strict read here.
 */
export declare function admissionRefusal(deps: ComposeSeat, card: string, fam: string, lifted: Record<string, unknown>, phase: string, facts?: Record<string, ModelFactsRow>): void;
/** THE FAMILY-LESS HIJACK LAW (F56, 2026-11-14): a registered
 *  family-less card (boarded: [], requiresModel: false — trim,
 *  frames, track, the pure tools) composes by its OWN id; a stated
 *  params.model/service naming anything else would resolve THAT
 *  family and compose its card instead, judging this card's params
 *  by a stranger's admission. The refusal fires at the door, before
 *  any lane resolves. One law, two seats: prepareCardParams (the
 *  compose doors) and the validate walk's own phase1Card call (its
 *  body carries no `card` key — the card name is the walk's own
 *  variable).
 *  @param deps the compose seat (the decl projection).
 *  @param card the row's own card id ("" = the caller has none; the
 *  gate is a no-op then).
 *  @param seat the stated model/service value, whatever shape.
 *  @param facts the caller-resolved facts table (optional — the
 *  seat's own read when omitted). */
export declare function refuseFamilylessHijack(deps: ComposeSeat, card: string, seat: unknown, facts?: Record<string, ModelFactsRow>): void;
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