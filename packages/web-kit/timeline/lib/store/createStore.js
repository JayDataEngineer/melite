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
import { createClientStore } from "@melite/catalog/clientStore";
export function create(initializer) {
    return createClientStore(initializer);
}
//# sourceMappingURL=createStore.js.map
