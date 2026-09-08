// slot renderer glue — THE one module that binds the slot core to React
// (the DSH discipline: ui-renderer owns React mounting; everything below
// the renderer is framework-free). Vendored-core contract: see
// ./ATTRIBUTION.md and ../README.md.
//
// S1 (2026-09-08): this binding adopts the upstream renderer installation
// contract — StaleAuthorizationError / SlotOwnershipError, the
// stale-authorization probe (isLive), chain election with owner fallback,
// keyed dispatch — minus the pieces that need the DSH host (session
// scopes, locale faces, store-instance axis: hostFace() reads the
// sessions/workspaces services, which the standalone editor does not
// mount; cause recorded in ATTRIBUTION.md). The full ui-renderer stays
// unvendored for that reason — this file is the contract-shaped outlet
// the editor shell renders through.
import { Fragment, createElement, useSyncExternalStore } from "react"
import type { ComponentType, ReactNode } from "react"
import type { SlotCore, SlotEntryView } from "./core"

/** Thrown when a retained view is rendered after its entry left the
 * ledger (upstream ui-slots StaleAuthorizationError — same name, same
 * seat). Outlets read live entries per render, so this fires only on
 * explicit retained-view renders via renderSlotView. */
export class StaleAuthorizationError extends Error {}

/** Thrown when a keyed dispatch names a key outside the seat's occupied
 * cells with no fallback to render (upstream ui-slots SlotOwnershipError
 * family — fail-loud dispatch, never a silent blank). */
export class SlotOwnershipError extends Error {}

/** Live entries of a seat, resubscribing on registry mutations. */
export function useSlotEntries(core: SlotCore, name: string): readonly SlotEntryView[] {
  useSyncExternalStore(
    (onStoreChange) => core.subscribe(name, onStoreChange),
    () => core.versionOf(name),
  )
  return core.entriesOfSlot(name)
}

/** Staleness probe for retained views: true while the view's entry is
 * still registered and live (not disposed, not abdicated). */
export function isSlotViewLive(core: SlotCore, view: SlotEntryView): boolean {
  return core.isLive(view)
}

/** Render one retained view (a view held past its render pass — a
 * drill-down, a drag ghost). Stale views throw StaleAuthorizationError
 * instead of rendering a dead contribution. */
export function renderSlotView(
  core: SlotCore,
  view: SlotEntryView,
  ctx?: object,
): ReactNode {
  if (!core.isLive(view)) {
    throw new StaleAuthorizationError(
      "slot view is stale (its entry left the ledger) — re-read entriesOfSlot instead of retaining views",
    )
  }
  return createElement(view.component as ComponentType<Record<string, unknown>>, { ...ctx })
}

/** Render a seat's live occupancy.
 *
 * - single: the winning (lowest-priority) entry's component, or nothing.
 * - list: every entry's component, in ledger order (priority, then order),
 *   each receiving the owner share plus a stable React key from its id.
 * - keyed: the `entryKey` cell's winner; without `entryKey`, every
 *   occupied cell's winner in ledger order (the composition default).
 *   A named but unoccupied key with no fallback throws
 *   SlotOwnershipError — dispatch fails loud, never blank.
 * - chain: election over `ctx` (the owner share the selectors route on);
 *   the winner renders with `{ ...ctx, matched }`; all-decline renders
 *   `fallback` (or nothing).
 *
 * The `ctx` prop is the owner share — the props the outlet's call site
 * supplies to every entry (ActivityBar passes { active, onSelect }). Empty
 * or collapsed seats render nothing. */
export function SlotOutlet({
  core,
  name,
  ctx,
  entryKey,
  fallback,
}: {
  core: SlotCore
  name: string
  ctx?: object
  /** Keyed-seat cell to render (absent = every occupied cell's winner). */
  entryKey?: string
  /** Chain-seat (and named-but-empty keyed) fallback when nothing elects. */
  fallback?: ReactNode
}): ReactNode {
  useSyncExternalStore(
    (onStoreChange) => core.subscribe(name, onStoreChange),
    () => core.versionOf(name),
  )
  const kind = core.kindOf(name)
  const entries = core.entriesOfSlot(name)
  if (kind === undefined || entries.length === 0) {
    if (kind === "chain" || (kind === "keyed" && entryKey !== undefined)) {
      return fallback ?? null
    }
    return null
  }
  if (kind === "chain") {
    const election = core.resolveChain(name, (ctx ?? {}) as Record<string, unknown>)
    if (!election) return fallback ?? null
    return createElement(
      election.view.component as ComponentType<Record<string, unknown>>,
      { ...ctx, matched: election.matched },
    )
  }
  if (kind === "keyed") {
    if (entryKey !== undefined) {
      const winner = entries.find((e) => e.key === entryKey)
      if (!winner) {
        if (fallback !== undefined) return fallback
        throw new SlotOwnershipError(
          `keyed slot "${name}" has no live entry for key "${entryKey}" — register the key or pass a fallback`,
        )
      }
      return createElement(winner.component as ComponentType<Record<string, unknown>>, { ...ctx })
    }
    return createElement(
      Fragment,
      null,
      ...entries.map((e, i) =>
        createElement(e.component as ComponentType<Record<string, unknown>>, {
          key: e.key ?? e.id ?? i,
          ...ctx,
        }),
      ),
    )
  }
  if (kind === "single") {
    const winner = entries[0]
    if (!winner) return null
    return createElement(winner.component as ComponentType<Record<string, unknown>>, { ...ctx })
  }
  return createElement(
    Fragment,
    null,
    ...entries.map((e, i) =>
      createElement(e.component as ComponentType<Record<string, unknown>>, {
        key: e.id ?? i,
        ...ctx,
      }),
    ),
  )
}
