export const laneVoice = {
    /** THE HASH WORD (audit download-stack-audit-2026-10-20 F10, the
     *  run-gate row): mid-verify the byte fraction sits frozen while
     *  the hash runs, so the voice names the hash phase — the word is
     *  the only movement there is. */
    hashingWord: "hashing",
    /** The live fraction's composition: the fraction itself, joined
     *  with the live phase word when one is named — never a bare
     *  frozen percent mid-hash. */
    inFlightFraction: (p) => p.phaseWord === undefined ? p.fraction : p.fraction + " · " + p.phaseWord,
};
/** The row's hash-phase word, undefined when the row is not hashing:
 *  the live phase names the hash ('verify', or a present file's
 *  'recheck'), and — on rows seeded before the phase law — the state
 *  word 'verifying' says it alone. */
export function hashPhaseWordOf(progress) {
    const hashing = progress.phase === "verify"
        || progress.phase === "recheck"
        || progress.state === "verifying";
    return hashing ? laneVoice.hashingWord : undefined;
}
//# sourceMappingURL=cardsLanesCopy.js.map