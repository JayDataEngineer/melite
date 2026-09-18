/** GATE S (the seed-sentinel contract, estate law): -1 is RANDOM —
 *  the dice mints HERE at render so every node sharing the seed
 *  shares the MINTED value (below -1 or a non-int refuses loud).
 *  Every seed-consuming lane mints through this one function — the
 *  MiniMax music lane died live on a raw -1 (ComfyUI 400, seed min
 *  0), and every KSampler-family node validates the same floor. */
export function mintSeed(p: Record<string, unknown>): number {
  const seed = p.seed
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < -1) {
    throw new Error(`seed = ${String(p.seed)}: -1 (random) or a non-negative int is required`)
  }
  if (seed === -1) return Math.floor(Math.random() * 2147483647)
  return seed
}
