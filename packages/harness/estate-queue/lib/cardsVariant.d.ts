import type { CardDeclRow, ModelFactsRow } from "./cardsFacts.js";
/** One closed [min, max] bound on a stated sampler knob. */
export type EnvelopeBound = readonly [number, number];
export interface VariantSelection {
    readonly variantId: string;
    readonly variantRoute: string;
    readonly quant: string;
    /** THE RESOLVED CELL (the size-at-quant reshape, operator
     *  2026-10-26): the (variant × quant) cell the selection landed
     *  on — its ROUTE wins the compose address (the engine's own
     *  resolve() reads cell-before-variant; the estate's compose
     *  composes through the same cell), and its PARAMS add to the
     *  lane surface at the bench door. "" / undefined when the
     *  row's matrix carries no cells. */
    readonly cellRoute: string;
    readonly cellParams?: readonly string[];
    readonly resolverDefaults: Record<string, unknown>;
    /** THE ROUTE ENVELOPE (the 25-steps-into-turbo cure): when the
     *  selected variant declares one, a caller-STATED steps/cfg
     *  outside its closed bounds refuses at the stamp gate — the
     *  distilled lane's marriage is not agency territory. */
    readonly samplerEnvelope: Readonly<Record<"steps" | "cfg", EnvelopeBound | undefined>> | null;
}
/** Select the matrix cell (the ONE RESOLVER's wire seat — D6
 *  2026-10-17: the coordinate law is `resolveVariantRow` +
 *  `resolveCellRow` in @melite/contracts, shared with the client
 *  mirror; this seat keeps only its own decoration — the phase
 *  frame, the hidden-address refusals, the type guards, the legacy
 *  'native' fold, and the selection's facts-row extraction):
 *  explicit body variant/quant keys win when stated (matched against
 *  facts variant id/route + cell quant); unstated coordinates fall
 *  to the address claim, else the first non-Recipe variant / first
 *  cell (Model.resolve — the family default). Unknown coordinates
 *  refuse LOUD (never a silent neighbor cell). */
export declare function selectCardVariant(mid: string, famRow: ModelFactsRow, body: Record<string, unknown>, phase: string): VariantSelection;
export declare function stampCardOverlay(body: Record<string, unknown>, famRow: ModelFactsRow, decl: CardDeclRow, sel: VariantSelection, phase: string, fam: string): Record<string, unknown>;
/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export declare function liftCardParams(body: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=cardsVariant.d.ts.map