import { type Dispatch, type SetStateAction } from "react";
import type { LayerA, SetLayerAKey } from "./docModel.js";
import type { CardStage } from "@melite/contracts";
/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export declare function RunRecipeEngine({ stage, layerA, setLayerAKey, setLayerA, refArtifacts, }: {
    stage: CardStage;
    layerA: LayerA;
    setLayerAKey: SetLayerAKey;
    /** The whole-doc setter (the ATOMIC PICK LAW's verb): a pick is
     * ONE contract — the axis key AND its chain's defaults land in
     * ONE state write, never key-by-key (the half-switch the drill's
     * law killed at the bench wire; the same law at the studio rail). */
    setLayerA: Dispatch<SetStateAction<LayerA>>;
    /** The pickers' artifact index (own run ∪ upstreams — the studio's
     * one candidate source, the same rows the call-card ref buckets
     * serve). Threaded to the form wire so the input rail's From-flow /
     * From-media verbs live HERE too (the 2026-09-21 break: the studio
     * mounted CardForm with NO wire — every rail row's From media
     * opened onto the honest-empty list; the bench drill always wired
     * this, the studio silently didn't). */
    refArtifacts: Array<{
        name: string;
        url: string;
    }>;
}): import("react").JSX.Element;
//# sourceMappingURL=RunRecipeEngine.d.ts.map
