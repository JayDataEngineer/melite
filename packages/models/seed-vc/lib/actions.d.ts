import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
/** The closed facts shape the convert segment reads. The upstream
 *  SeedVCRun node loads EVERY weight itself at first run (both DiT
 *  lanes, campplus, RMVPE, the two BigVGANs, whisper-small — from
 *  the engine's models/TTS tree the family's provisions land), so
 *  the graph carries no loader seats and the facts door is empty:
 *  the two lanes are a params stamp (f0_condition), never a
 *  weights swap the graph could misspell. */
type SeedVcFacts = Record<string, never>;
/** The gated params doc the convert segment reads (the card's
 *  schema walk validated types and bounds — a same-process typed
 *  boundary). */
type SeedVcParams = Record<string, unknown>;
/** The convert action: SeedVCRun — the source's content re-voiced
 *  into the reference's timbre, saved under <run>/vc. */
export declare const convert: ComfyActionSpec<SeedVcParams, SeedVcFacts>;
export {};
//# sourceMappingURL=actions.d.ts.map
