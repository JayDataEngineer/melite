export type ToastType = "error" | "success" | "info";
export interface ToastAction {
    label: string;
    onClick: () => void;
}
export interface ToastEntry {
    id: number;
    type: ToastType;
    message: string;
}
export interface ToastStore {
    toasts: ToastEntry[];
    addToast: (type: ToastType, message: string, action?: ToastAction) => void;
    removeToast: (id: number) => void;
}
export declare function subscribe(listener: () => void): () => void;
export declare function getSnapshot(): ToastEntry[];
/** How long a toast of a severity holds before it dismisses, in ms.
 *  THE ONE OWNER of that number: the store arms its dismissal timer
 *  from it (the lifetime holds without a viewport mounted) and the
 *  renderer face passes it to the DSH Toast as `holdMs`, so a
 *  duration is spelled once. Errors persist long enough for the
 *  operator to read what broke; success and info clear quickly. */
export declare function toastHoldMs(type: ToastType): number;
export declare function removeToast(id: number): void;
declare function getStore(): ToastStore;
declare function setStoreState(patch: Partial<ToastStore>): void;
/** The hook half — inside React: `useToastStore((s) => s.addToast)`.
 *  The static half (getState/subscribe/setState) hangs off the same
 *  function, the zustand-classic shape — module-level pushers and
 *  tests use those without calling the hook. */
export declare const useToastStore: (<T>(selector: (s: ToastStore) => T) => T) & {
    getState: typeof getStore;
    setState: typeof setStoreState;
    subscribe: typeof subscribe;
};
/** Mint the stable id for a viewport mount (one per mounted
 *  component; the owner is the smallest live id).
 *  @returns the minted id. */
export declare function mintViewportId(): number;
/** Claim rendering rights for a viewport id (mount arm).
 *  @param id - the minted viewport id. */
export declare function acquireViewport(id: number): void;
/** Release a viewport id's claim (unmount arm). An id that was
 *  never acquired is a no-op (the removeToast law): an unguarded
 *  splice would read indexOf's -1 and drop the LAST live claim.
 *  @param id - the minted viewport id. */
export declare function releaseViewport(id: number): void;
/** The hook a viewport reads the live id set through — every
 *  acquire/release re-renders every mounted viewport. */
export declare function useViewportIds(): readonly number[];
export {};
//# sourceMappingURL=toastStore.d.ts.map