/** stage-drill.tsx — THE SHARED DRILLDOWN: the spec-formatted stage
 * editor, the zoom face, the preview seam consult (extracted from
 * CardsTab.tsx hour 15 — the biggest seam). */
import { createElement as h, type ReactNode } from 'react';
import type { StageViewOwnerProps } from './types.js';
import type { CardsBenchValue, BenchStageView } from './cards-resource.js';
/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
 *  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
 *  groups, defaults); the drill renders THAT, never a raw key/value
 *  dump. Params left, Run right; the patch carries only CHANGED keys
 *  (coerced once, at patch time — the editPatch law); then the run
 *  gesture (patch lands in the domain BEFORE the run reads it). */
/**
 * THE SCROLL LOCK (2026-09-21, the operator's law: 'whenever
 * progress updates, it jerks the view up' — every per-tick layout
 * change moved the scroller WITHOUT the user: img swaps, textarea
 * autogrow, seat churn, collapse-clamps). The scroller's position
 * is USER-OWNED: wheel/touch/keys record it; a layout effect after
 * EVERY update restores it when anything else moved it. The law
 * kills the whole mechanism class at the container, not per child.
 */
export declare function ScrollLockedDetail(props: {
    children?: ReactNode;
    testid?: string;
}): ReturnType<typeof h>;
export declare function StageDrill({ stage, bench, running, onRun, onStop, onClose, onRemoved, onResync, onPatchParams, renderStageView, renderPreview, onSurface, runId, canRemove, bindRun, bindEnhance }: {
    stage: BenchStageView;
    bench: CardsBenchValue;
    running: boolean;
    onRun: () => void;
    /** THE ✦ GESTURE (stroke 23): the drill binds its enhance verb —
     *  the zoom bar renders the capsule beside Run (the rail's own
     *  button is retired; the note stays as inline feedback). */
    bindEnhance?: (verb: () => Promise<void> | void) => void;
    /** THE STOP DOOR (2026-09-13): the run button flips to a stop
     *  glyph while running (the tile's own affordance, carried into
     *  the drill — one gesture language, both faces). */
    onStop: () => void;
    onClose: () => void;
    onRemoved: () => void;
    /** THE RESYNC SEAT (2026-09-15, the stuck cure): a write that
     *  refused after its rebase leaves this drill composing against a
     *  bench it can no longer see whole — the view re-reads and this
     *  drill re-seeds from the fresh truth, so the NEXT gesture works.
     *  A named error without a resync is how a tab bricks. */
    onResync?: () => void;
    onPatchParams: (patch: Record<string, unknown>) => void;
    renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
    /** the preview seam consult (hour-9): the shared video/image preview
     *  rides the drill's RIGHT column — supplied by the host (it owns
     *  the slot site); the shared card-base previews are the defaults. */
    renderPreview?: (owner: {
        kind: 'video' | 'image' | 'audio' | 'mesh';
        artifacts: Array<{
            name: string;
            url: string;
        }>;
        runStatus: string;
        stageId: string;
        history?: Array<Array<{
            name: string;
            url: string;
        }>>;
    }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
    onSurface?: (size: string) => void;
    runId?: string | null;
    /** Retired seat (2026-09-13, the operator's "it doesn't need
     *  remove stage button"): the drill no longer renders the remove
     *  row — removal rides the tile's trash. The prop stays for the
     *  call-site seam (nothing reads it; the row is gone). */
    canRemove?: boolean;
    /** THE GESTURE REGISTRATION (hour-26): the frame's top-bar pill
     *  calls the drill's OWN run (flush-then-start), never a bare
     *  start that would drop un-flushed form edits (the 1:1 law). */
    bindRun?: (run: () => void) => void;
}): ReturnType<typeof h>;
//# sourceMappingURL=stage-drill.d.ts.map
