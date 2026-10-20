export * from "./toastStore.js";
/** Mount anywhere the system needs a renderer — the studio shell,
 *  the cards console, any seat. The claim law guarantees exactly one
 *  live renderer per document: the first-mounted viewport renders,
 *  others render nothing until the owner unmounts. Renders the live
 *  entries through the DSH Toast atom (body-portaled banner, owner
 *  unmounts onDone). */
export declare function ToastViewport(): import("react").JSX.Element | null;
//# sourceMappingURL=toast.d.ts.map