import type { CardStage } from "@melite/contracts";
import type { DocCall, DocKeyframe, LayerA } from "./docModel.js";
import type { LinkArtifact } from "./refUtils.js";
import type { TimelineSelection } from "./useViewSelection.js";
import type { useFilmAudio } from "./useFilmAudio.js";
type FilmMap = ReturnType<typeof useFilmAudio>["filmMap"];
type FilmFromDoc = ReturnType<typeof useFilmAudio>["filmFromDoc"];
/** Upstream vocabulary, filmstrip, bar-space memos (tenant §10).
 *  Verbatim lines 2474–2628. */
export declare function useDerivedView(args: {
    upstreams?: CardStage[];
    stage: CardStage;
    calls: DocCall[];
    layerA: LayerA;
    keyframes: DocKeyframe[];
    filmMap: FilmMap;
    filmFromDoc: FilmFromDoc;
    selected: TimelineSelection | null;
    fps: number;
    totalFrames: number;
}): {
    sourceOptions: {
        title: string;
        name: string;
    }[];
    linkGroups: LinkArtifact[];
    filmstrip: {
        windows: {
            name: string;
            url: string;
        }[];
        final: string | null;
    };
    prompts: import("@melite-plugin/timeline/ui/timeline").TimelinePrompt[];
    lanes: import("@melite-plugin/timeline/ui/timeline").TimelineKeyframe[];
    filmDurSec: number;
    setFilmDurSec: import("react").Dispatch<import("react").SetStateAction<number>>;
    barTotal: number;
    barPrompts: import("@melite-plugin/timeline/ui/timeline").TimelinePrompt[];
    barLanes: import("@melite-plugin/timeline/ui/timeline").TimelineKeyframe[];
    barAudioClips: {
        id: string;
        name: string;
        start_frame: number;
        dur_frames: number;
        gain: number | undefined;
        class: "dialogue" | "sfx" | "music" | undefined;
        text: string | undefined;
    }[];
    callPreviews: {
        [k: string]: string;
    };
    selectedBarId: string | null;
    voicePinnedCalls: Set<number>;
    refAudiosPresent: boolean;
    audioClipsPresent: boolean;
};
export {};
//# sourceMappingURL=useDerivedView.d.ts.map
