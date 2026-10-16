/**
 * hermetic-engine.ts — THE HERMETIC ENGINE (the gate-37 flake
 * cure, 2026-11-07: four specs red with "bundle never settled" /
 * hook timeouts under full-gate load — estate-composition,
 * tool-output, lane-runs-state-repro, cards-registry-corners).
 *
 * ROOT (read, not guessed): every estate boot primes the card
 * registry, and prime() fetches the engine's live /object_info —
 * ~3.1MB, UNBOUNDED (no signal, no boundMs: oiFuse returns work()
 * bare), once per test FILE (vitest isolates module graphs per
 * file, so the transport's in-flight join never spans the herd).
 * Quiet it lands in 0.2s; under a saturated gate the herd + the
 * contended engine stretch it past the 15s settle polls and the
 * 30s hooks. The flakes were never composition breaks — they were
 * a live socket on the unit tier's boot path.
 *
 * CONTRACT: importing this module (as the importing spec's FIRST
 * import — the boot-models first-import law: the mock must
 * register before the barrel's first evaluation) hermeticizes the
 * engine for the file: liveObjectInfo answers the tracked boot
 * double (../walls/fixtures/object_info.boot.json — a hand-kept
 * TEST DOUBLE of twelve node classes, authored once from the live
 * doc, NOT an inventory snapshot; the min fixture owns inventory
 * truth). Every other barrel export rides spread-actual. The
 * double feeds the REAL deriveWiringDoc/setObjectInfo path — only
 * the BYTES are canned (the acquire-weight fixture-socket
 * precedent, without the per-file server).
 *
 * INTEGRITY (no decorative mocks): hermeticFetches counts the
 * fetches that rode the mock — zero after a prime means the seam
 * missed and the live socket answered. assertHermeticPrime judges
 * the primed doc deep-equal to the double. Break the mock and the
 * arm reds; that is the firing proof.
 *
 * THREE MOCK LAWS (each paid for in reds, 2026-11-07 — violate
 * none of them):
 * 1. A helper-registered mock serves TRANSITIVE importers (the
 *    spec → cardsRegistry → barrel path). A spec's OWN direct
 *    static barrel import misses it — the static graph links
 *    before the helper body runs. Import barrel members from
 *    source-relative paths instead (the estate-composition
 *    cardDefs precedent).
 * 2. NEVER dynamically re-import the barrel inside a test — the
 *    dynamic import resolves a second, UNMOCKED instance (its own
 *    singleton: spies on its theService miss the primed one).
 * 3. Sequence through PLAIN DATA, never mock-fn identity: arms
 *    write data directives into vi.hoisted state and the mock
 *    impl interprets them (the decl-corners bounds pattern). A
 *    factory-side write of a mock fn into hoisted state does NOT
 *    propagate back to the test (data crosses, identity does
 *    not). Files needing one-shot census events carry their own
 *    file-level mock (cards-registry.spec, decl-corners) — a
 *    second barrel registration would fight this helper's.
 */
import { readFileSync } from 'node:fs'
import { deepEqual, ok } from 'node:assert/strict'
import { vi } from 'vitest'

const DOC_URL = new URL('../walls/fixtures/object_info.boot.json', import.meta.url)

const seat = vi.hoisted(() => ({ fetches: 0, doc: null as Record<string, unknown> | null }))

function loadBootDoc(): Record<string, unknown> {
  // STABLE identity per file (the transport's own cache contract:
  // same server answers the same doc identity — the singleton's
  // unchanged-doc skip rides identity, and a fresh parse per call
  // would re-arm every prime and lie about the law).
  if (seat.doc === null) {
    seat.doc = JSON.parse(readFileSync(DOC_URL, 'utf8')) as Record<string, unknown>
  }
  return seat.doc
}

vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const real = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...real,
    // a vi.fn (not a bare closure): arms sequence one-shot doc
    // events with mockResolvedValueOnce/mockRejectedOnce — the
    // queue drains back to the double after.
    liveObjectInfo: vi.fn(async () => {
      seat.fetches += 1
      return loadBootDoc()
    }),
  }
})

/** Fetches that rode the mock (zero after a prime = the seam missed). */
export function hermeticFetches(): number {
  return seat.fetches
}

/** The double itself (arms compare the primed doc against it). */
export function bootDoc(): Record<string, unknown> {
  return loadBootDoc()
}

/** The primed doc IS the double, fetched through the mock — the
 *  arm that proves this file never dialed the live engine. */
export function assertHermeticPrime(oi: unknown): void {
  assertHermeticRode()
  deepEqual(oi, loadBootDoc(), 'hermetic engine: primed doc is not the boot double — the seam leaks')
}

/** At least one prime rode the mock — the seat-free arm for
 *  bundle/provider boots (no registry handle needed). */
export function assertHermeticRode(): void {
  ok(seat.fetches > 0, 'hermetic engine: no prime rode the mock — the live socket answered (flake class unsealed)')
}
