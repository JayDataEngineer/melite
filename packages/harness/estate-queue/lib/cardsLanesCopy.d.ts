import type { WeightAcquireProgress } from "@melite/estate-provisioning";
export declare const laneVoice: {
    /** THE HASH WORD (audit download-stack-audit-2026-10-20 F10, the
     *  run-gate row): mid-verify the byte fraction sits frozen while
     *  the hash runs, so the voice names the hash phase — the word is
     *  the only movement there is. */
    hashingWord: string;
    /** The live fraction's composition: the fraction itself, joined
     *  with the live phase word when one is named — never a bare
     *  frozen percent mid-hash. */
    inFlightFraction: (p: {
        fraction: string;
        phaseWord?: string;
    }) => string;
};
/** The row's hash-phase word, undefined when the row is not hashing:
 *  the live phase names the hash ('verify', or a present file's
 *  'recheck'), and — on rows seeded before the phase law — the state
 *  word 'verifying' says it alone. */
export declare function hashPhaseWordOf(progress: WeightAcquireProgress): string | undefined;
//# sourceMappingURL=cardsLanesCopy.d.ts.map