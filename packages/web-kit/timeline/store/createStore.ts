/**
 * store/createStore — the timeline's binding of THE client store seat
 * (@melite/catalog/clientStore, itself bound to the DSH platform snapshot
 * store).
 *
 * Same API the timeline store relies on: `create<T>()(init)` returns a
 * hook callable with an optional per-slice selector (+ optional equality
 * fn) plus `getState` / `setState` / `getInitialState` / `subscribe` /
 * `destroy`. Still a module-level external store (the document survives
 * remounts and is shared across tenants exactly as before); reads go
 * through useSyncExternalStore with per-slice memoization, so a
 * component selecting `s.audioCues` re-renders only when that slice
 * changes by the equality fn (default Object.is) — the same per-slice
 * subscribe granularity the old factory gave, no deps.
 */
import { createClientStore } from "@melite/catalog/clientStore"
import type { StateCreator } from "@melite/catalog/clientStore"

export type {
  GetState,
  SetState,
  StateCreator,
  StoreApi,
  Subscribe,
} from "@melite/catalog/clientStore"
export type { BoundStore } from "@melite/catalog/clientStore"

/** The bound store shape `create` returns: the selector hook plus the
 *  zustand-classic statics. */
export interface UseBoundStore<T> {
  (): T
  <U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U
  setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void
  getState: () => T
  getInitialState: () => T
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
  destroy: () => void
}

export function create<T>(initializer: StateCreator<T>): UseBoundStore<T> {
  return createClientStore<T>(initializer)
}
