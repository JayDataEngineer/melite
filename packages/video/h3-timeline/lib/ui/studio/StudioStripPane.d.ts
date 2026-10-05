import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
import type { DocCall, DocKeyframe, LayerA, SetLayerAKey } from "./docModel.js";
export declare function StudioStripPane({ calls, totalFrames, fps, seconds, barPrompts, barLanes, barAudioClips, barTotal, frameIdx, callPreviews, selectedBarId, filmMap, handleBarFrame, handleScrubStart, handleScrubEnd, handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete, handleExtend, addCallAt, handleTimelineSelect, layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip, updateAudioClip, setLayerAKey, artifactIndex, docFromFilm, keyframes, }: {
    calls: DocCall[];
    totalFrames: number;
    fps: number;
    seconds: string;
    barPrompts: TimelinePrompt[];
    barLanes: TimelineKeyframe[];
    barAudioClips: Array<{
        id: string;
        name: string;
        start_frame: number;
        dur_frames: number;
        gain?: number;
        class?: "dialogue" | "sfx" | "music";
        text?: string;
    }>;
    barTotal: number;
    frameIdx: number;
    callPreviews: Record<string, string>;
    selectedBarId: string | null;
    filmMap: {
        fps?: number;
    } | null;
    handleBarFrame: (frame: number) => void;
    handleScrubStart: () => void;
    handleScrubEnd: () => void;
    handleKeyframeAdd: (trackId: string, frame: number) => string;
    handleKeyframeMove: (id: string, frame: number) => void;
    handleKeyframeDelete: (id: string) => void;
    handlePromptUpdate: (id: string, text: string) => void;
    handlePromptMove: (id: string, s: number, e: number) => void;
    handlePromptResize: (id: string, s: number, e: number) => void;
    handlePromptDelete: (id: string) => void;
    handleExtend: (newTotal: number) => void;
    addCallAt: (frame: number) => void;
    handleTimelineSelect: (id: string | null) => void;
    layerA: LayerA;
    /** THE BLOCKER (2026-09-22): reference audio wired on any call —
     * the D-M-E lanes LOCK (no adds on any lane) until it is cleared. */
    refAudiosBlocked: boolean;
    addAudioClip: (name: string, src: string, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void;
    takeAudioFile: (file: File, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void;
    moveAudioClip: (clipId: string, docFrame: number) => void;
    deleteAudioClip: (clipId: string) => void;
    updateAudioClip: (clipId: string, patch: {
        class?: "dialogue" | "sfx" | "music";
        text?: string;
    }) => void;
    setLayerAKey: SetLayerAKey;
    artifactIndex: {
        byUrl: Map<string, string>;
    };
    docFromFilm: (g: number) => number;
    keyframes: DocKeyframe[];
}): import("react").JSX.Element;
//# sourceMappingURL=StudioStripPane.d.ts.map
