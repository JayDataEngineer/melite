// slot renderer glue — THE one module that binds the slot core to React
// (the DSH discipline: packages/client/ui-renderer owns React mounting;
// everything below the renderer is framework-free). Vendored-core contract:
// see ./ATTRIBUTION.md and ../README.md.
import { Fragment, createElement, useSyncExternalStore } from "react"
import type { ComponentType, ReactNode } from "react"
import type { SlotCore, SlotEntryView } from "./core"

/** Live entries of a seat, resubscribing on registry mutations. */
export function useSlotEntries(core: SlotCore, name: string): readonly SlotEntryView[] {
  useSyncExternalStore(
    (onStoreChange) => core.subscribe(name, onStoreChange),
    () => core.versionOf(name),
  )
  return core.entriesOfSlot(name)
}

/** Render a seat's live occupancy.
 *
 * - list: every entry's component, in ledger order (priority, then order),
 *   each receiving the owner share plus a stable React key from its id.
 * - single: the winning (lowest-priority) entry's component, or nothing.
 *
 * The `ctx` prop is the owner share — the props the outlet's call site
 * supplies to every entry (ActivityBar passes { active, onSelect }). Empty
 * or collapsed seats render nothing. */
export function SlotOutlet({
  core,
  name,
  ctx,
}: {
  core: SlotCore
  name: string
  ctx?: object
}): ReactNode {
  useSyncExternalStore(
    (onStoreChange) => core.subscribe(name, onStoreChange),
    () => core.versionOf(name),
  )
  const kind = core.kindOf(name)
  const entries = core.entriesOfSlot(name)
  if (kind === undefined || entries.length === 0) return null
  if (kind === "single") {
    const winner = entries[0]
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
