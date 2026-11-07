/** GATE S (the seed-sentinel contract, estate law): -1 is RANDOM —
 *  the dice mints HERE at render so every node sharing the seed
 *  shares the MINTED value (below -1 or a non-int refuses loud).
 *  Every seed-consuming lane mints through this one function — the
 *  MiniMax music lane died live on a raw -1 (ComfyUI 400, seed min
 *  0), and every KSampler-family node validates the same floor. */
export declare function mintSeed(p: Record<string, unknown>): number;
/** GATE S-LOCK (the voice-lock seed, operator catch f 2026-09-22): a
 * saved persona must render THE SAME VOICE on every reuse — minting
 * a fresh random seed per run drifts timbre and prosody line to line
 * (the "voice does not appear to lock" report). When a .qvoice rides
 * and the doc seed is -1/unstated, the seed is DERIVED from the
 * artifact's path (FNV-1a, stable for the life of the voice): same
 * voice → same seed → the render locks. A stated seed still wins —
 * explicit user intent is never overridden. */
export declare function voiceLockSeed(p: Record<string, unknown>, artifactPath: string): number;
//# sourceMappingURL=graph-helpers.d.ts.map