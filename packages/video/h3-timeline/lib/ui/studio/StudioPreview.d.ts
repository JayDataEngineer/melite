/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { RefObject } from "react";
import type { CardStage } from "@melite/contracts";
import type { FilmPlayerHandle } from "@melite-plugin/timeline/ui/timeline";
/** Preview pane: final cut + window tiles + run history (lines 3928–4061).
 * Chrome rides the shared kit (2026-09-07): preview PaneHeader +
 * EmptyState (the aspirational TimelinePreview twin is deleted; this
 * pane is the one preview).
 *
 *  Behavior-neutral wiring (the ONLY edit in the whole split): the inline
 *  `onDuration={(sec) => setFilmDurSec(sec)}` is now the `onDuration` prop —
 *  the tenant passes the identical closure. The `running` prop is threaded
 *  explicitly (unlike the aspirational TimelinePreview sibling, which
 *  derives it from stage.status — that derivation can transiently disagree
 *  with the shell's live run flag, so this pane keeps the prop). */
export declare function StudioPreview({ stage, running, filmstrip, filmRef, filmMap, frameIdx, barTotal, fps, handleFilmTime, handlePlayingChange, onDuration, }: {
    stage: CardStage;
    running: boolean;
    filmstrip: {
        final: string | null;
        windows: Array<{
            name: string;
            url: string;
        }>;
    };
    filmRef: RefObject<FilmPlayerHandle | null>;
    filmMap: {
        fps?: number;
    } | null;
    frameIdx: number;
    barTotal: number;
    fps: number;
    handleFilmTime: (sec: number) => void;
    handlePlayingChange: (playing: boolean) => void;
    onDuration: (sec: number) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=StudioPreview.d.ts.map
