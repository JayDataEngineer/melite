import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The repair renderer: validates the bound entry, then composes the
 * masked second-pass chain. Like the swap, the film path never
 * reaches here (the card branches on a non-empty repair bag, refuses
 * a bag under an armed reshoot or replace — one door per doc), and
 * the emission ends in MiniMaxH3ChainAssemble.
 * @param entry the repair mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this repair renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it)
 * @returns nothing; the chain's nodes are emitted onto `g` */
export declare function renderH3Repair(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
/** THE TILED REPAIR BAG — the windows arc (the honesty row's owed
 *  design, `windows: [...]` on the bag + the film-with-splice
 *  emission, landed in the GAPS-19 shape the refine bag proved): N ≥ 2
 *  hand-tiled windows, EACH its own masked-edit chain on the one
 *  spine (the seat's file-join posture — no in-chain assemble), each
 *  saved `<runId>/repair_w<k>`, joined into ONE `<runId>/repair` film
 *  by the film tail's own join primitives (chainSaveBoundaries orders
 *  every save; concatSavedFilms stitches). Outside the tracked mask
 *  the pixels ARE the source's own, so a window cut at its boundary
 *  is not the refine arm's pop-risk seam — the file splice is the
 *  honest join for this face. A ONE-entry bag never reaches here (the
 *  card keeps the single-window emission byte-identical); the carrier
 *  refuses it by name so the lib face cannot silently reroute.
 * @param bag the repair bag's entries, film order (the card's alias
 * door passes the armed bag verbatim)
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the joined film's prefix rides it)
 * @returns nothing; the window chains, the boundary chain, and the
 * joined film are emitted onto `g` */
export declare function renderH3RepairBag(bag: readonly unknown[], p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=repair.d.ts.map
