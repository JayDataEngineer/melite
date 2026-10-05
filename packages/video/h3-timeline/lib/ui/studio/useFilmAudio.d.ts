import type { Dispatch, SetStateAction } from "react";
import type { CardStage } from "@melite/contracts";
import type { LayerA, SetLayerAKey } from "./docModel.js";
/** Davinci map, artifact index, positioned audio clips + the mixer
 *  (tenant §5). Verbatim lines 1731–1946. */
export declare function useFilmAudio(args: {
    stage: CardStage;
    upstreams?: CardStage[];
    layerA: LayerA;
    setLayerA: Dispatch<SetStateAction<LayerA>>;
    setLayerAKey: SetLayerAKey;
    fps: number;
    frameIdx: number;
    filmPlaying: boolean;
    filmFpsRef: {
        current: number | null;
    };
}): {
    filmMap: {
        fps?: number;
        totalFrames?: number;
        windows?: Array<{
            start: number;
            len: number;
            trim: number;
            docStart: number;
            docSpan: number;
        }>;
    } | null;
    filmFromDoc: (f: number) => number;
    docFromFilm: (g: number) => number;
    artifactIndex: {
        byName: Map<string, string>;
        byUrl: Map<string, string>;
    };
    refArtifacts: {
        name: string;
        url: string;
    }[];
    audioSrcUrl: (src: string) => string | null;
    addAudioClip: (name: string, src: string, startFrame: number, cls?: "dialogue" | "sfx" | "music") => string;
    moveAudioClip: (clipId: string, docFrame: number) => void;
    deleteAudioClip: (clipId: string) => void;
    updateAudioClip: (clipId: string, patch: {
        class?: "dialogue" | "sfx" | "music";
        text?: string;
    }) => void;
    takeAudioFile: (file: File, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void;
    clipElsRef: import("react").RefObject<Map<string, HTMLAudioElement>>;
};
//# sourceMappingURL=useFilmAudio.d.ts.map
