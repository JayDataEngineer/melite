import type { CardDeclRow, ModelFactsRow } from "./cardsFacts.js";
/** One closed [min, max] bound on a stated sampler knob. */
export type EnvelopeBound = readonly [number, number];
export interface VariantSelection {
    readonly variantId: string;
    readonly variantRoute: string;
    readonly quant: string;
    readonly resolverDefaults: Record<string, unknown>;
    /** THE ROUTE ENVELOPE (the 25-steps-into-turbo cure): when the
     *  selected variant declares one, a caller-STATED steps/cfg
     *  outside its closed bounds refuses at the stamp gate — the
     *  distilled lane's marriage is not agency territory. */
    readonly samplerEnvelope: Readonly<Record<"steps" | "cfg", EnvelopeBound | undefined>> | null;
}
/** Select the matrix cell (R1 wire contract): explicit body
 *  variant/quant keys win when stated (matched against facts
 *  variant id/route + cell quant); unstated coordinates fall to
 *  the FIRST non-Recipe variant / first cell (Model.resolve —
 *  the family default). Unknown coordinates refuse LOUD (never a
 *  silent neighbor cell). */
export declare function selectCardVariant(mid: string, famRow: ModelFactsRow, body: Record<string, unknown>, phase: string): VariantSelection;
export declare function stampCardOverlay(body: Record<string, unknown>, famRow: ModelFactsRow, decl: CardDeclRow, sel: VariantSelection, phase: string): Record<string, unknown>;
/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export declare function liftCardParams(body: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=cardsVariant.d.ts.map
