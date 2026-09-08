/**
 * uiSlotSeam — THE UI slot kernel (2026-08-19, the overrides doctrine).
 * Every render cell in this app is a SLOT: a card body, a card's preview
 * cell, its icon, its run affordance, the sidebar, the chat input. A slot
 * is a place a provider CLAIMS; whoever claims loudest (highest
 * precedence, first registration at that tier) renders. First-party UI
 * is not special — it is the low-precedence default claim (dogfood law,
 * BOTH directions: the shell hosts consult slots, and melite-core's own
 * surfaces ride them as claims).
 *
 * The laws (stolen from the DSH widget model, same as the card body
 * seam — now ONE kernel instead of N copies):
 *   • distinct providers occupy distinct precedence tiers — a tier
 *     collision is LOUD, with the shadowing hint ("register at a
 *     different precedence to shadow it")
 *   • duplicate provider ids are LOUD
 *   • the walk renders the FIRST claim; deferring = resolve → null
 *   • an empty (or fully-deferring) walk returns null — the HOST's
 *     fail-safe renders, never a blank
 *   • the slot is a STORE: every register/dispose bumps a version so
 *     React re-renders on a mid-session flip (live propagation)
 *
 * Kinds stay SEPARATE (cardSeam): they are the persisted document
 * vocabulary — data, one owner per kind, no shadowing. Everything that
 * RENDERS is a slot (chrome, many claimants, precedence decides).
 */
import { useSyncExternalStore } from "react"

/** One claim on a slot: a provider at a precedence tier. */
export interface UiSlotClaim<C, I> {
  /** Unique id within the slot. Namespaced by convention
   *  ("melite-core/schema-form", "my-plugin/compact-preview"). */
  id: string
  /** Higher precedence wins the walk. Distinct providers must NOT
   *  share a precedence — the collision throws with the hint. */
  precedence: number
  /** Claim the input, or null to defer down the walk. */
  resolve: (input: I) => C | null
}

/** A typed slot instance — the seam itself. */
export interface UiSlot<C, I> {
  /** The slot's wire name ("card-body", "sidebar", …) — error prose. */
  readonly name: string
  /** Register a claim; returns its disposer. Dup ids and shared tiers
   *  throw — one claim per tier, by design. */
  register(claim: UiSlotClaim<C, I>): () => void
  /** THE walk — first claim wins; null when nobody claims. */
  resolve(input: I): C | null
  /** Registered claim ids, highest precedence first (gates). */
  registered(): string[]
  /** Store organs — bump on register/dispose. */
  getVersion(): number
  subscribe(fn: () => void): () => void
  /** Live propagation: React subscribes to claim flips. */
  useVersion(): number
}

/** Create a slot. C = the claim payload a provider hands the host;
 *  I = the input the host offers on every walk. */
export function createUiSlot<C, I>(name: string): UiSlot<C, I> {
  const claims: UiSlotClaim<C, I>[] = []
  const listeners = new Set<() => void>()
  let version = 0

  const notify = (): void => {
    version++
    for (const l of listeners) l()
  }

  const subscribe = (fn: () => void): (() => void) => {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }

  const register = (claim: UiSlotClaim<C, I>): (() => void) => {
    const dup = claims.find((p) => p.id === claim.id)
    if (dup) {
      throw new Error(
        `ui slot "${name}": provider "${claim.id}" is already registered`,
      )
    }
    const tier = claims.find((p) => p.precedence === claim.precedence)
    if (tier) {
      throw new Error(
        `ui slot "${name}": precedence ${claim.precedence} is taken by "${tier.id}" — ` +
          `register at a different precedence to shadow it`,
      )
    }
    claims.push(claim)
    claims.sort((a, b) => b.precedence - a.precedence)
    notify()
    return () => {
      const i = claims.indexOf(claim)
      if (i !== -1) {
        claims.splice(i, 1)
        notify()
      }
    }
  }

  const resolve = (input: I): C | null => {
    for (const c of claims) {
      const claimed = c.resolve(input)
      if (claimed) return claimed
    }
    return null
  }

  return {
    name,
    register,
    resolve,
    registered: () => claims.map((c) => `${c.precedence}:${c.id}`),
    getVersion: () => version,
    subscribe,
    useVersion: () => useSyncExternalStore(subscribe, () => version),
  }
}
