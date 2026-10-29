export * from "./toastStore.ts";
/** Mount anywhere the system needs a renderer — the studio shell,
 *  the cards console, any seat. The claim law guarantees exactly one
 *  live renderer per document: the first-mounted viewport renders,
 *  others render nothing until the owner unmounts. Renders the live
 *  entries through the DSH Toast atom (body-portaled banner, owner
 *  unmounts onDone).
 *
 *  THE TOAST DISMISS (audit 017 C4): every banner carries a dismiss
 *  control — the DSH Toast's own inline action seat (the press
 *  unmounts the toast, the primitive's documented owner shape), so a
 *  failure the operator has read retires NOW, ahead of the 15s error
 *  hold. The auto-retire clock stays (the census entry states both:
 *  the control dismisses, the clock retires). */
export declare function ToastViewport(): import("react").JSX.Element | null;
//# sourceMappingURL=toast.d.ts.map