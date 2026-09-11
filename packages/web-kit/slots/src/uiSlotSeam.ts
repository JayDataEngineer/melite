/**
 * uiSlotSeam — THE UI slot kernel face (2026-08-19, the overrides doctrine;
 * 2026-09-08 S1b: the backing is now the vendored SlotCore — one kernel,
 * not two).
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
 *
 * BACKING (S1b — the row-10 correction): each UiSlot is a `chain` seat
 * on this module's SlotCore (`ui.<name>`). A claim is a chain entry
 * whose selector IS the claim's resolve-or-decline (election = the
 * walk: highest precedence first, first non-null wins); precedence maps
 * to shadowing priority NEGATED (the core sorts ascending, lowest
 * renders — so the loudest claim carries the lowest priority); the
 * claim id rides `registrant` (dup + tier checks read the ledger, and
 * `registered()` projects it back as `precedence:id`). The ledger —
 * order, election, disposal authority — is the core's; the claim
 * PAYLOADS never enter it (the core stores components; walks return the
 * election's `matched` value, which IS the claim's resolve return).
 * Seat identity is the slot name (declaration-merging semantics:
 * re-creating a name re-opens the same seat). The STORE organs
 * (version + listeners) stay adapter-owned and SYNCHRONOUS — the core
 * batches subscriber notifications per microtask, and the face pins
 * sync delivery (the gate asserts listener counts immediately after
 * register/dispose).
 */
import { useSyncExternalStore } from "react"
import { SlotCore, type ChildrenDecl } from "./vendored/core.ts"

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

/** The ui lane registry: ONE SlotCore, module-scoped. Seats are
 * `ui.<slot-name>` chain seats, declared lazily by root declarers
 * (the a-priori root accepts distinct-priority occupants; each declarer
 * owns one seat and is never disposed). */
const uiCore = new SlotCore()

/** A component value is required by register(); ui claims carry DATA
 * (payloads ride the election's `matched`, not the component) — the
 * holder is render-inert by construction. */
/* v8 ignore next -- ClaimHolder is never invoked: it is a ledger placeholder
 * the renderer never mounts (dom territory; payloads ride `matched`) (2026-09-12) */
function ClaimHolder(): null {
  return null
}

let rootPriority = 1

/** The chain seat for a slot name, declared on first touch. */
function seatFor(name: string): string {
  const seat = `ui.${name}`
  if (!uiCore.isDeclared(seat)) {
    uiCore.register(
      {
        name: "root",
        priority: rootPriority++,
        registrant: `uiSlotSeam:${name}`,
        children: { [seat]: { kind: "chain" } } as ChildrenDecl,
      },
      ClaimHolder,
    )
  }
  return seat
}

/** Shadowing priority for a claim: the core sorts ascending with the
 * lowest rendering, so the loudest (highest-precedence) claim carries
 * the lowest priority. */
function priorityFor(precedence: number): number {
  return -precedence
}

/** Create a slot. C = the claim payload a provider hands the host;
 *  I = the input the host offers on every walk. */
export function createUiSlot<C, I>(name: string): UiSlot<C, I> {
  const seat = seatFor(name)
  const seatName = seat as Parameters<SlotCore["register"]>[0]["name"]
  let version = 0
  const listeners = new Set<() => void>()

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
    const priority = priorityFor(claim.precedence)
    const ledger = uiCore.entriesOfSlot(seatName)
    const dup = ledger.find((v) => v.registrant === claim.id)
    if (dup) {
      throw new Error(
        `ui slot "${name}": provider "${claim.id}" is already registered`,
      )
    }
    const tier = ledger.find((v) => v.priority === priority)
    if (tier) {
      throw new Error(
        `ui slot "${name}": precedence ${claim.precedence} is taken by "${tier.registrant}" — ` +
          `register at a different precedence to shadow it`,
      )
    }
    const disposeCore = uiCore.register(
      {
        name: seatName,
        priority,
        registrant: claim.id,
        select: (owner) => claim.resolve((owner as { input: I }).input),
      },
      ClaimHolder,
    )
    notify()
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      disposeCore()
      notify()
    }
  }

  const resolve = (input: I): C | null => {
    const election = uiCore.resolveChain(seatName, { input } as Record<string, unknown>)
    if (!election) return null
    return election.matched as C
  }

  /* v8 ignore next -- useVersion is React-tree live propagation (needs a
   * renderer for useSyncExternalStore): dom-project territory like the 3d
   * studios; register/dispose/resolve/subscribe carry the node surface (2026-09-12) */
  const useVersion = (): number => useSyncExternalStore(subscribe, () => version)

  return {
    name,
    register,
    resolve,
    registered: () =>
      uiCore.entriesOfSlot(seatName).map((v) => `${-v.priority}:${v.registrant}`),
    getVersion: () => version,
    subscribe,
    useVersion,
  }
}
