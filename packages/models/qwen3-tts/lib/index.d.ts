import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
export declare const DECL: ModelDecl;
export declare const family: Plugin;
/**
 * A VARIANT'S OWN ROUTE ADDRESS (2026-10-10, the card audit's M5):
 * a card that boards a route used to retype the address string, so
 * a rename here left the card boarding an address that resolves to
 * nothing — and the failure is at RUN, not at compile. The DECL owns
 * its routes; this reads them. Returns '' when the variant declares
 * no route (a recipe row, say), so a caller can filter honestly
 * rather than board an empty address.
 */
export declare function variantRoute(decl: {
    variants?: ReadonlyArray<{
        id: string;
        route?: string;
    }>;
}, variantId: string): string;
/**
 * A SIZE CELL'S OWN ROUTE ADDRESS (the size-at-quant reshape): a card
 * that boards a route must read it from the DECL, never retype it.
 * Returns '' when the variant/cell declares no route.
 */
export declare function cellRoute(decl: {
    variants?: ReadonlyArray<{
        id: string;
        cells?: ReadonlyArray<{
            quant: string;
            route?: string;
        }>;
    }>;
}, variantId: string, quant: string): string;
export { speak, exportAction, parseTtsFacts, laneTopologyOf, LANE_TOPOLOGY, PRESET_SPEAKERS, type TtsFacts, type TtsParams, type TtsLaneTopology } from "./actions.js";
//# sourceMappingURL=index.d.ts.map
