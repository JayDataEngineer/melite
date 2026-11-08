import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
export { solveWindowComposition, type WindowComposition } from './timelineContract.js';
/** The tail-frame picker's index: the boot census's OWN max for
 * ImageFromBatch.batch_index (16384 today — the wall derives it from
 * tests/walls/fixtures/object_info.boot.json, never a frozen literal).
 * A positive out-of-band index rides the engine's upper clamp
 * (min(shape−1, index)) onto the clip's FINAL row under every build;
 * the negative spelling slices empty on the live estate (the
 * 2026-11-19 burn — clause 1 above) and is banned family-wide. */
export declare const LAST_FRAME_BATCH_INDEX = 16384;
/** The extend renderer: validates the bound entry, then composes the
 * fresh-continuation chain plus the join. Like the swap and repair,
 * the film path never reaches here (the card branches on a non-empty
 * extend bag and refuses a bag under an armed reshoot, replace, or
 * repair — one door per doc), and the emission ends in the
 * joined-film SaveVideo.
 * @param entry the extend mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this extension renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the join prefixes ride it) */
export declare function renderH3Extend(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=extend.d.ts.map