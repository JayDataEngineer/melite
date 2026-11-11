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
import { type ReactNode } from "react";
/** The rail's tools-slot element, published by CardStudio. Null when the
 *  tenant is mounted outside a studio shell (inline fallback). */
export declare const StudioRailCtx: import("react").Context<HTMLDivElement | null>;
/** TENANT side: renders children into the studio rail when one exists,
 *  inline otherwise. Wrap the tenant's toolbar in this — nothing else. */
export declare function StudioRail({ children }: {
    children: ReactNode;
}): import("react").JSX.Element | null;
//# sourceMappingURL=studioRail.d.ts.map