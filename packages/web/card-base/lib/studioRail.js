import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/**
 * StudioRail — the shell-provided TOOLS slot in the studio's left rail
 * (spec dev_docs/design/card-studio-pattern.md §5 + §7.10).
 *
 * WHY A PORTAL: vertical space is the scarce axis (§7.9 — human figures),
 * so a tenant's tool buttons (Skeleton / Refine pose / Export / …) must
 * live in the RAIL, but their state lives INSIDE the tenant component
 * (showSkeleton, editMode, bgImage…). Splitting the tenant into two
 * registered components would force that state up through the shell —
 * breaking E1 (the tenant receives exactly {stage, running, onSave}).
 * Instead the tenant stays ONE component and PROJECTS its tools into the
 * shell's slot; the shell stays genre-blind (it renders an empty div and
 * knows nothing about motion).
 *
 * THE CONTRACT IS UNCHANGED: portaled tools write through the same
 * onSave channel — nothing about the write path moves. Without the shell
 * (a tenant mounted inline, e.g. the form view) the tools render in place
 * — the exact layout the tenant had before the slot existed.
 *
 * Mount order (no flash): CardStudio renders the slot div and the tenant
 * in the same commit; the div's ref lands before the tenant's effects
 * run, so the portal binds on the first effect pass. The one render
 * before that is inside the skeleton-masked mount anyway.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
/** The rail's tools-slot element, published by CardStudio. Null when the
 *  tenant is mounted outside a studio shell (inline fallback). */
export const StudioRailCtx = createContext(null);
/** TENANT side: renders children into the studio rail when one exists,
 *  inline otherwise. Wrap the tenant's toolbar in this — nothing else. */
export function StudioRail({ children }) {
    const slot = useContext(StudioRailCtx);
    const [el, setEl] = useState(null);
    useEffect(() => {
        // Bind (and re-bind if the shell re-renders a new slot node). Standalone
        // tenants never enter: slot stays null, children render in place.
        if (slot && slot !== el)
            setEl(slot);
    }, [slot]);
    if (el)
        return createPortal(children, el);
    if (slot)
        return null; // inside a studio, slot not captured yet — one frame
    return _jsx(_Fragment, { children: children }); // standalone tenant: inline, as before the slot
}
//# sourceMappingURL=studioRail.js.map
