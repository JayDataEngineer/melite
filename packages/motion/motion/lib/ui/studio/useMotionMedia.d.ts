import type * as React from "react";
import type { CardStage } from "@melite/contracts";
import { type MotionNpz, type SomaSkin } from "@melite/formats";
import type { ThreeCtx } from "./MotionExportDialog.js";
import type { ToastFn } from "./useMotionStage.js";
export interface MotionMediaArgs {
    stage: CardStage;
    upstreams: CardStage[];
    onSave: (params: Record<string, unknown>) => void;
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    runCompiledGeneration: typeof import("@melite/catalog").runCompiledGeneration;
    toast: ToastFn;
    bodyGlb: string | null;
    setBodyGlbState: React.Dispatch<React.SetStateAction<string | null>>;
    setBodyNotice: React.Dispatch<React.SetStateAction<string | null>>;
    skin: SomaSkin | null;
    setSkin: React.Dispatch<React.SetStateAction<SomaSkin | null>>;
    npz: MotionNpz | null;
    setNpz: React.Dispatch<React.SetStateAction<MotionNpz | null>>;
    allVertsM: Float32Array | null;
    setAllVertsM: React.Dispatch<React.SetStateAction<Float32Array | null>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setFrameIdx: React.Dispatch<React.SetStateAction<number>>;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    setKeptEdit: React.Dispatch<React.SetStateAction<{
        joints: Float32Array;
        frame: number;
    } | null>>;
    setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>;
    threeCtxRef: React.MutableRefObject<ThreeCtx | null>;
    npzUrl: string | null;
    bgImage: string | null;
    setBgImage: React.Dispatch<React.SetStateAction<string | null>>;
    setBgDragOver: React.Dispatch<React.SetStateAction<boolean>>;
}
export declare function useMotionMedia({ stage, upstreams, onSave, onWireSlot, runCompiledGeneration, toast, bodyGlb, setBodyGlbState, setBodyNotice, skin, setSkin, npz, setNpz, allVertsM, setAllVertsM, setError, setLoading, setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64, threeCtxRef, npzUrl, bgImage, setBgImage, setBgDragOver, }: MotionMediaArgs): {
    setBodyGlb: (url: string | null) => void;
    bodySlotIdx: number;
    bodyWiredId: string;
    bodyWiredUpstream: CardStage | undefined;
    bodyWired: boolean;
    bodyWiredUrl: string | null;
    bodySrc: string;
    attachBody: (url: string | null) => void;
    handleBodyFile: (file: File) => void;
    priorStages: CardStage[];
    setBg: (url: string | null) => void;
    handleBgFile: (file: File | null) => void;
    handleStageDrop: (e: React.DragEvent) => void;
};
//# sourceMappingURL=useMotionMedia.d.ts.map
