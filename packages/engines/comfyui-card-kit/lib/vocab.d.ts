import z from "@deepseek-ai/schemastery";
/** The t2i/t2v sampler vocabulary — 45 members, SORTED serve order
 *  (generated: scripts/regen-vocab.ts off the live engine). */
export declare const SAMPLER_OPTIONS: readonly string[];
/** The scheduler vocabulary — 9 members, SORTED serve order
 *  (generated: scripts/regen-vocab.ts off the live engine). */
export declare const SCHEDULER_OPTIONS: readonly string[];
/** The closed TYPE: one union row = the dropdown AND the refusal.
 *  (Schemastery union-of-consts: alternatives live at .list, each
 *  const carrying .value — the emitters and the cross-validation
 *  domains read the same row.) */
export declare const SAMPLERS: z<string>;
export declare const SCHEDULERS: z<string>;
/** Declare a card-local closed vocabulary (the same one-row law for
 *  sets that are not engine vocabularies): options in serve order. */
export declare function vocabulary(options: readonly string[]): z<string>;
//# sourceMappingURL=vocab.d.ts.map
