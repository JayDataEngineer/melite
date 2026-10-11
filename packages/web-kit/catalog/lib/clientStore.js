"use client";
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
import { useMemo, useRef, useSyncExternalStore } from "react";
import { createSnapshotStore } from "@deepseek-ai/dsh-client-store";
export function createClientStore(init) {
    // The creator form needs `set`/`get` before its record exists, so the engine
    // starts on an empty record and both forms land their record through `set`.
    const engine = createSnapshotStore(undefined);
    const stops = new Set();
    let initialState;
    const getState = () => engine.getSnapshot();
    const setState = (partial, replace) => {
        const patch = typeof partial === "function" ? partial(getState()) : partial;
        if (replace === true) {
            engine.set(patch);
            return;
        }
        engine.update((draft) => {
            Object.assign(draft, patch);
        });
    };
    const subscribe = (listener) => {
        let previous = getState();
        const stop = engine.subscribe(() => {
            const next = getState();
            const before = previous;
            previous = next;
            listener(next, before);
        });
        stops.add(stop);
        return () => {
            stops.delete(stop);
            stop();
        };
    };
    const api = {
        setState,
        getState,
        getInitialState: () => initialState,
        subscribe,
        destroy: () => {
            for (const stop of stops)
                stop();
            stops.clear();
        },
    };
    const initial = typeof init === "function" ? init(setState, getState, api) : init;
    engine.set(initial);
    initialState = initial;
    function useStore(selector, equalityFn = Object.is) {
        const selectorRef = useRef(selector);
        selectorRef.current = selector;
        const equalityRef = useRef(equalityFn);
        equalityRef.current = equalityFn;
        // Per-slice snapshot memo: a component selecting `s.audioCues` re-renders
        // only when that slice changes by the equality fn, so the notification
        // granularity is the selected slice, not the whole record.
        const getSnapshot = useMemo(() => {
            let prev;
            let hasPrev = false;
            return () => {
                const sel = selectorRef.current;
                const next = sel ? sel(getState()) : getState();
                if (hasPrev && equalityRef.current(prev, next)) {
                    return prev;
                }
                hasPrev = true;
                prev = next;
                return next;
            };
        }, []);
        return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    }
    /* v8 ignore stop */
    return Object.assign(useStore, api);
}
//# sourceMappingURL=clientStore.js.map