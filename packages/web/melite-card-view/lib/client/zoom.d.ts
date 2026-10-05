/**
 * zoom.tsx — the zoom overlay, CSS-law port (2026-09-12).
 *
 * THE CONTRACT (the old tree's interaction, framer removed — DSH law:
 * DSH ships no framer; its own surfaces animate in CSS):
 * • the resting tile opens a FIXED inset-0 overlay (portal to body —
 *   the old file's own DSH placement rule; the embed frame is
 *   auto-height, absolute would cover only part of the view).
 * • The card enters compositor-only: a CSS scale+fade keyframe
 *   (zoomIn — transform/opacity, zero reflow, NO modal pop).
 * • While the settle holds the box shows a pure SKELETON; the real
 *   detail swaps in after ZOOM_SKELETON_MS.
 * • Close vectors: the Collapse (X) button and a backdrop click
 *   (target === currentTarget) call onClose directly; Escape belongs
 *   to DSH's useModalLayer, which also owns the focus lifetime and
 *   the layer stack (the dialog contract on the root is what it keys
 *   on).
 * • The overlay is the scroll container; the inner flex centers a
 *   card shorter than the area and scrolls one that is taller.
 */
import { createElement as h, type ReactPortal } from 'react';
import { BenchStageView, CardsBenchValue } from './cards-resource.js';
import type { StageViewOwnerProps } from './types.js';
/** The card's width law, pure (the envelope lift's decision): the
 *  estate's surface.size='huge' grows the card for studio room. The
 *  viewport cap measures WIDTH (94vw, room for the pane's own edge) —
 *  a vh cap on width was a category error that clipped the right
 *  half of the params column on short viewports (2026-09-12). */
export declare function zoomWidthFor(surfaceSize: string | null): string;
/** THE FULL-PAGE LAW (2026-09-13, the operator's hour-7: "the modal
 *  is not taking up the full page like before"). A studio surface
 *  ('huge') IS the old system's full-page card: width AND height take
 *  the page (94vw/94vh — the pane keeps its edge, the shell breathes).
 *  Ordinary cards keep the bounded ≈square law verbatim. */
export declare function zoomSizeFor(surfaceSize: string | null): Record<string, string>;
/** The zoomed card's DETAIL content — supplied by the bench tab (the
 * spec-form params + Run row + outputs), rendered only once the
 * settle has passed. */
export interface ZoomDetailProps {
    stage: BenchStageView;
    bench: CardsBenchValue;
    /** THE START-ERROR SEAM (stroke 25): a run-start rejection (wire
     *  down, refused compose, stale bench) renders in the webhook bar
     *  — the press seat must never die silently behind the overlay. */
    startError?: string | null;
    running: boolean;
    onRun: () => void;
    /** THE STOP DOOR (2026-09-13): the run gesture flips to stop
     *  mid-run (the tile's affordance, carried into the drill). */
    onStop: () => void;
    onClose: () => void;
    onRemoved: () => void;
    /** THE RESYNC SEAT (2026-09-15, the stuck cure): a detail write
     *  that refused after its rebase asks the view to re-read the
     *  bench so the next gesture composes against fresh truth. */
    onResync?: () => void;
    /** params patch verb (the surface slot's onPatch currency). */
    onPatchParams: (patch: Record<string, unknown>) => void;
    /** the envelope lift channel: the DETAIL reports surface.size; the
      * mount owns the growth (self-owned verb — nothing threads from
      * above). Kept in the props type so the detail's face is stable. */
    onSurface?: (size: string) => void;
    /** the draft's last started run (the studio polls it for artifacts). */
    runId?: string | null;
    /** THE ✦ GESTURE REGISTRATION (stroke 23, the operator's law:
     *  "agent enhance goes inside the top bar seam next to run"): the
     *  detail binds its enhance verb; the bar renders the capsule
     *  beside Run. The verb's promise owns the busy face; absence of
     *  a binding renders no capsule (non-prompt cards). */
    bindEnhance?: (verb: () => Promise<void> | void) => void;
    /** THE GESTURE REGISTRATION (hour-26, the 1:1 law): the frame's
     * top-bar Run pill owns the BUTTON, the detail owns the LAW (the
     * drill flushes the user layer to the estate BEFORE the start;
     * studios patch their domain first). The detail registers its run
     * verb through this channel; the pill falls back to onRun when no
     * detail-bound verb exists (never a silent param drop). */
    bindRun?: (run: () => void) => void;
    /** the cards.stage.view consult (unclaimed → the generic card). */
    renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
    /** the cards.stage.preview consult (hour-9 seam; the primary-output
     *  dispatch's seat). The zoom's detail renders the preview column —
     *  the seam was declared but never threaded through the overlay
     *  (the zoom drill showed only the hint text); forwarded since
     *  2026-09-13 with the primary-output law. */
    renderPreview?: (owner: {
        kind: 'video' | 'image' | 'audio' | 'mesh';
        artifacts: Array<{
            name: string;
            url: string;
        }>;
        runStatus: string;
        stageId: string;
    }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
}
/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
 * tree's own DSH rule), keyed per stage. */
export declare function CardZoomOverlay(props: ZoomDetailProps & {
    detail: (p: ZoomDetailProps) => ReturnType<typeof h>;
}): ReactPortal | ReturnType<typeof h>;
//# sourceMappingURL=zoom.d.ts.map
