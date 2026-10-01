"use client"

/**
 * clientStore — THE client store seat: a bound, zustand-shaped store over the
 * DSH platform snapshot store (`@deepseek-ai/dsh-client-store`, the
 * zustand/immer engine the web shell shares through its frozen module table —
 * see packages/web/shared/web-platform.ts).
 *
 * The engine owns observation, synchronous publication, and Immer-backed
 * updates. This module owns the binding every browser store in the repository
 * shares: the module-level lifetime (the document survives remounts and is
 * shared across tenants), the `getState`/`setState`/`subscribe`/
 * `getInitialState`/`destroy` statics module-level callers use, and the
 * selector hook.
 *
 * `setState` shallow-merges a patch into the record and replaces the record
 * whole when `replace` is true. A patch that leaves the record unchanged keeps
 * the current snapshot and notifies nobody.
 */

import { useMemo, useRef, useSyncExternalStore } from "react"
import { createSnapshotStore, type SnapshotStore } from "@deepseek-ai/dsh-client-store"

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

/** Build the initial record with the same set/get the callers will use. The
 *  record it returns is the store's `getInitialState()`.
 *  @param setState - shallow-merge or whole-record write.
 *  @param getState - current record.
 *  @param api - the full store surface, for slices that need `subscribe`.
 *  @returns the initial record.
 */
export type StateCreator<T> = (
  setState: SetState<T>,
  getState: GetState<T>,
  api: StoreApi<T>,
) => T

export interface BoundStore<T> extends StoreApi<T> {
  (): T
  <U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U
}

/**
 * Create a module-level client store.
 * @param init - the initial record.
 * @returns the bound store (hook + zustand-classic statics).
 */
export function createClientStore<T>(init: T): BoundStore<T>
/**
 * Create a module-level client store whose initial record is built through the
 * same set/get the store exposes.
 * @param initializer - receives set/get/api and returns the initial record.
 * @returns the bound store (hook + zustand-classic statics).
 */
export function createClientStore<T>(initializer: StateCreator<T>): BoundStore<T>
export function createClientStore<T>(init: T | StateCreator<T>): BoundStore<T> {
  // The creator form needs `set`/`get` before its record exists, so the engine
  // starts on an empty record and both forms land their record through `set`.
  const engine: SnapshotStore<T> = createSnapshotStore<T>(undefined as T)
  const stops = new Set<() => void>()
  let initialState: T

  const getState: GetState<T> = () => engine.getSnapshot()

  const setState: SetState<T> = (partial, replace) => {
    const patch = typeof partial === "function" ? partial(getState()) : partial
    if (replace === true) {
      engine.set(patch as T)
      return
    }
    engine.update((draft) => {
      Object.assign(draft as object, patch)
    })
  }

  const subscribe: Subscribe<T> = (listener) => {
    let previous = getState()
    const stop = engine.subscribe(() => {
      const next = getState()
      const before = previous
      previous = next
      listener(next, before)
    })
    stops.add(stop)
    return () => {
      stops.delete(stop)
      stop()
    }
  }

  const api: StoreApi<T> = {
    setState,
    getState,
    getInitialState: () => initialState,
    subscribe,
    destroy: () => {
      for (const stop of stops) stop()
      stops.clear()
    },
  }

  const initial =
    typeof init === "function" ? (init as StateCreator<T>)(setState, getState, api) : (init as T)
  engine.set(initial)
  initialState = initial

  /* v8 ignore start -- React-tree wiring: the hook needs a renderer for
   * useSyncExternalStore (dom-project territory). Its selector contract is
   * pinned node-side through getState/subscribe in the store specs. */
  function useStore(): T
  function useStore<U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U
  function useStore<U>(
    selector?: (state: T) => U,
    equalityFn: (a: U, b: U) => boolean = Object.is,
  ): T | U {
    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const equalityRef = useRef(equalityFn)
    equalityRef.current = equalityFn
    // Per-slice snapshot memo: a component selecting `s.audioCues` re-renders
    // only when that slice changes by the equality fn, so the notification
    // granularity is the selected slice, not the whole record.
    const getSnapshot = useMemo(() => {
      let prev: T | U | undefined
      let hasPrev = false
      return (): T | U => {
        const sel = selectorRef.current
        const next = sel ? sel(getState()) : getState()
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
  /* v8 ignore stop */

  return Object.assign(useStore, api) as BoundStore<T>
}
