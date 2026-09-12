/**
 * store/createStore — the native React replacement for the old external
 * store factory (DSH-pure UI law: no external store dep in this package).
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
import { useMemo, useRef, useSyncExternalStore } from "react"

export type SetState<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>),
  replace?: boolean,
) => void

export type GetState<T> = () => T

export type Subscribe<T> = (
  listener: (state: T, prevState: T) => void,
) => () => void

export interface StoreApi<T> {
  setState: SetState<T>
  getState: GetState<T>
  getInitialState: GetState<T>
  subscribe: Subscribe<T>
  destroy: () => void
}

export type StateCreator<T> = (
  setState: SetState<T>,
  getState: GetState<T>,
  api: StoreApi<T>,
) => T

export interface UseBoundStore<T> extends StoreApi<T> {
  (): T
  <U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U
}

export function create<T>(initializer: StateCreator<T>): UseBoundStore<T> {
  let state: T
  const listeners = new Set<(state: T, prevState: T) => void>()

  const setState: SetState<T> = (partial, replace) => {
    const next =
      typeof partial === "function"
        ? (partial as (s: T) => Partial<T>)(state)
        : partial
    // Parity with the old factory: replace swaps the reference, otherwise merge
    // into a fresh object; an identical reference notifies nobody.
    const nextState = (replace
      ? (next as T)
      : typeof next !== "object" || next === null
        ? (next as T)
        : Object.assign({}, state, next)) as T
    if (Object.is(nextState, state)) return
    const prevState = state
    state = nextState
    for (const listener of listeners) listener(state, prevState)
  }

  const getState: GetState<T> = () => state

  const subscribe: Subscribe<T> = (listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const destroy = () => {
    listeners.clear()
  }

  const api: StoreApi<T> = { setState, getState, getInitialState: () => initialState, subscribe, destroy }
  state = initializer(setState, getState, api)
  const initialState = state

  function useStore(): T
  function useStore<U>(selector: (s: T) => U, equalityFn?: (a: U, b: U) => boolean): U
  function useStore<U>(selector?: (s: T) => U, equalityFn: (a: U, b: U) => boolean = Object.is): T | U {
    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const equalityRef = useRef(equalityFn)
    equalityRef.current = equalityFn
    // Per-slice snapshot memo: re-render only when the SELECTED slice
    // changes by the equality fn (the subscribe granularity the old store gave).
    const getSnapshot = useMemo(() => {
      let prev: T | U | undefined
      let hasPrev = false
      return (): T | U => {
        const sel = selectorRef.current
        const next = sel ? sel(api.getState()) : api.getState()
        if (hasPrev && (equalityRef.current as (a: unknown, b: unknown) => boolean)(prev, next)) {
          return prev as T | U
        }
        hasPrev = true
        prev = next
        return next
      }
    }, [])
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  }

  return Object.assign(useStore, api) as UseBoundStore<T>
}
