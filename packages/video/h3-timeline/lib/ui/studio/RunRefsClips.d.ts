import type { LayerA } from "./docModel.js";
/** Layer A rail: the audio-clips upload door (3189–3315, refs cut) +
 * THE LANE INSPECTOR (2026-09-22): every clip's lane and words/event
 * text — the authored half of the D-M-E law (the text is what tells
 * the model WHAT the audio is; the pin is the other half). */
export declare function RunRefsClips({ layerA, updateAudioClip, deleteAudioClip, }: {
    layerA: LayerA;
    updateAudioClip: (clipId: string, patch: {
        class?: "dialogue" | "sfx" | "music";
        text?: string;
    }) => void;
    deleteAudioClip: (clipId: string) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=RunRefsClips.d.ts.map
