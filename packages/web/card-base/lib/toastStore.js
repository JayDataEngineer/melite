/**
 * THE ONE TOAST STORE (node-safe half of the one toast system,
 * stroke 37): the module state and the dual API (hook selector for
 * React, zustand-classic statics for module-level pushers and
 * tests) over the DSH platform engine `createSnapshotStore`
 * (`@deepseek-ai/dsh-client-store` — zustand vanilla + immer,
 * React-free by design; see its README Summary: "React-free
 * observable and snapshot-store primitives"). The engine owns
 * observation and publication; this module owns the record and
 * the toast lifetime. The renderer half lives in ./toast.tsx
 * (ToastViewport); the store is the system, the viewport is its
 * face.
 *
 * One store for the whole system: pusher modules call the
 * `getState()`/`subscribe()`/`setState()` statics from module
 * context, React seats use the hook selector. The last two private
 * stores (in web-kit/catalog and mask-studio) are gone; their
 * pushers now ride the `contractToast` seam in @melite/catalog,
 * wired by each browser entry to this store.
 *
 * The mount-claim registry lives here too (the viewport ids and
 * their epoch store): toast.tsx is a pure renderer that calls
 * hooks, per the client component law — no subscription machinery
 * in business components.
 */
import { useSyncExternalStore } from "react";
import { createSnapshotStore } from "@deepseek-ai/dsh-client-store";
const engine = createSnapshotStore([]);
let nextId = 1;
export function subscribe(listener) {
    return engine.subscribe(() => listener());
}
export function getSnapshot() {
    return engine.getSnapshot();
}
/** How long a toast of a severity holds before it dismisses, in ms.
 *  THE ONE OWNER of that number: the store arms its dismissal timer
 *  from it (the lifetime holds without a viewport mounted) and the
 *  renderer face passes it to the DSH Toast as `holdMs`, so a
 *  duration is spelled once. Errors persist long enough for the
 *  operator to read what broke; success and info clear quickly. */
export function toastHoldMs(type) {
    return type === "error" ? 15_000 : 5_000;
}
function addToast(type, message, _action) {
    void _action; // accepted, not renderable — see the header law
    const id = nextId++;
    engine.update((draft) => {
        draft.push({ id, type, message });
    });
    if (type === "error")
        console.error("[toast]", message);
    else
        console.info("[toast]", message);
    // The lifetime is the store's alone: a pushed toast dismisses on
    // this clock whether or not a viewport is mounted to fade it. The
    // Toast's own hold+FADE timer lands later and calls the same
    // idempotent removeToast, so it never shortens this one.
    setTimeout(() => {
        removeToast(id);
    }, toastHoldMs(type));
}
export function removeToast(id) {
    const index = engine.getSnapshot().findIndex((t) => t.id === id);
    if (index < 0)
        return;
    engine.update((draft) => {
        draft.splice(index, 1);
    });
}
// the patchable api field — the zustand-classic setState contract
// lets tests swap addToast (the retry spec stubs it mid-suite)
let liveAddToast = addToast;
function getStore() {
    return { toasts: engine.getSnapshot(), addToast: liveAddToast, removeToast };
}
function setStoreState(patch) {
    if (patch.addToast !== undefined)
        liveAddToast = patch.addToast;
    // Publish a fresh array reference even when only addToast moved:
    // the statics' contract is that every setState notifies (an
    // empty patch emits), and the engine skips identical references.
    engine.set(patch.toasts !== undefined ? [...patch.toasts] : [...engine.getSnapshot()]);
}
/** The hook half — inside React: `useToastStore((s) => s.addToast)`.
 *  The static half (getState/subscribe/setState) hangs off the same
 *  function, the zustand-classic shape — module-level pushers and
 *  tests use those without calling the hook. */
export const useToastStore = Object.assign(function useToastStore(selector) {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return selector({ addToast: liveAddToast, removeToast, toasts });
}, {
    getState: getStore,
    setState: setStoreState,
    subscribe,
});
/* ── The mount-claim registry ──────────────────────────────────
 * Live viewport ids; the smallest id renders. Every mount/unmount
 * publishes a new id array through the engine so all mounted
 * viewports re-read ownership (the epoch mechanism — one notify
 * per change, no hand-rolled listener Set). The record stays a
 * plain array: immer drafts those without the MapSet plugin this
 * module graph never enables. */
const viewportEngine = createSnapshotStore([]);
let nextViewportId = 1;
/** Mint the stable id for a viewport mount (one per mounted
 *  component; the owner is the smallest live id).
 *  @returns the minted id. */
export function mintViewportId() {
    return nextViewportId++;
}
/** Claim rendering rights for a viewport id (mount arm).
 *  @param id - the minted viewport id. */
export function acquireViewport(id) {
    viewportEngine.update((draft) => {
        draft.push(id);
    });
}
/** Release a viewport id's claim (unmount arm). An id that was
 *  never acquired is a no-op (the removeToast law): an unguarded
 *  splice would read indexOf's -1 and drop the LAST live claim.
 *  @param id - the minted viewport id. */
export function releaseViewport(id) {
    const index = viewportEngine.getSnapshot().indexOf(id);
    if (index < 0)
        return;
    viewportEngine.update((draft) => {
        draft.splice(index, 1);
    });
}
/** The hook a viewport reads the live id set through — every
 *  acquire/release re-renders every mounted viewport. */
export function useViewportIds() {
    return useSyncExternalStore(viewportEngine.subscribe, viewportEngine.getSnapshot, viewportEngine.getSnapshot);
}
//# sourceMappingURL=toastStore.js.map
