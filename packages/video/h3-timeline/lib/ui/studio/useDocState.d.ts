import type { CardStage } from "@melite/contracts";
import type { DocCall, DocKeyframe, LayerA } from "./docModel.js";
/** Document state (tenant §1). Verbatim lines 1536–1560. */
export declare function useDocState(stage: CardStage): {
    calls: DocCall[];
    setCalls: import("react").Dispatch<import("react").SetStateAction<DocCall[]>>;
    keyframes: DocKeyframe[];
    setKeyframes: import("react").Dispatch<import("react").SetStateAction<DocKeyframe[]>>;
    layerA: LayerA;
    setLayerA: import("react").Dispatch<import("react").SetStateAction<LayerA>>;
    lastCallsRef: import("react").RefObject<string>;
    lastKeyframesRef: import("react").RefObject<string>;
    lastLayerARef: import("react").RefObject<string>;
};
//# sourceMappingURL=useDocState.d.ts.map
