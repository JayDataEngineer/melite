/** GATE S (the seed-sentinel contract, estate law): -1 is RANDOM —
 *  the dice mints HERE at render so every node sharing the seed
 *  shares the MINTED value (below -1 or a non-int refuses loud).
 *  Every seed-consuming lane mints through this one function — the
 *  MiniMax music lane died live on a raw -1 (ComfyUI 400, seed min
 *  0), and every KSampler-family node validates the same floor. */
export function mintSeed(p) {
    const seed = p.seed;
    if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < -1) {
        throw new Error(`seed = ${String(p.seed)}: -1 (random) or a non-negative int is required`);
    }
    if (seed === -1)
        return Math.floor(Math.random() * 2147483647);
    return seed;
}
/** GATE S-LOCK (the voice-lock seed, operator catch f 2026-09-22): a
 * saved persona must render THE SAME VOICE on every reuse — minting
 * a fresh random seed per run drifts timbre and prosody line to line
 * (the "voice does not appear to lock" report). When a .qvoice rides
 * and the doc seed is -1/unstated, the seed is DERIVED from the
 * artifact's path (FNV-1a, stable for the life of the voice): same
 * voice → same seed → the render locks. A stated seed still wins —
 * explicit user intent is never overridden. */
export function voiceLockSeed(p, artifactPath) {
    if (typeof p.seed === 'number' && Number.isInteger(p.seed) && p.seed >= 0)
        return p.seed;
    let h = 2166136261;
    for (let i = 0; i < artifactPath.length; i++) {
        h ^= artifactPath.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h % 2147483647;
}
//# sourceMappingURL=graph-helpers.js.map