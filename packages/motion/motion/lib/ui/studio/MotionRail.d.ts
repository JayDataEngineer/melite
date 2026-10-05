/** MotionRail — the studio rail (StudioShell `params`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * The view/pose/output tool groups: skeleton + in-place toggles, refine/
 * stamp/repose/reset, the shared SpecPanel form, export + background +
 * preview-body input subcard.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react";
import { SpecPanel } from "@melite/card-base/client";
import type { CardStage } from "@melite/contracts";
import type { MotionNpz } from "@melite/formats";
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline";
import type { ToastFn } from "./useMotionStage.js";
export interface MotionRailProps {
    effectiveNpz: MotionNpz | null;
    showSkeleton: boolean;
    setShowSkeleton: React.Dispatch<React.SetStateAction<boolean>>;
    inPlace: boolean;
    setInPlace: React.Dispatch<React.SetStateAction<boolean>>;
    editMode: boolean;
    toggleEdit: () => void;
    fullbodyKfAtFrame: TimelineKeyframe | null;
    frameIdx: number;
    stampConstraintAtFrame: () => void;
    editableJoints: Float32Array | null;
    handleRepose: () => void;
    reposing: boolean;
    keptEdit: {
        joints: Float32Array;
        frame: number;
    } | null;
    discardKeptEdit: () => void;
    kimodoSpec: React.ComponentProps<typeof SpecPanel>["spec"];
    kimodoError: React.ComponentProps<typeof SpecPanel>["error"];
    paramValues: React.ComponentProps<typeof SpecPanel>["values"];
    onParamEdit: React.ComponentProps<typeof SpecPanel>["onEdit"];
    exportOpen: boolean;
    setExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
    bgImage: string | null;
    bgInputRef: React.RefObject<HTMLInputElement | null>;
    handleBgFile: (file: File | null) => void;
    setBg: (url: string | null) => void;
    bodySrc: string;
    bodyWired: boolean;
    bodyWiredUpstream: CardStage | undefined;
    bodyWiredUrl: string | null;
    handleBodyFile: (file: File) => void;
    toast: ToastFn;
    attachBody: (url: string | null) => void;
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    bodySlotIdx: number;
    onSave: (params: Record<string, unknown>) => void;
    stage: CardStage;
    setBodyWireOpen: React.Dispatch<React.SetStateAction<boolean>>;
    bodyNotice: string | null;
}
export declare function MotionRail({ effectiveNpz, showSkeleton, setShowSkeleton, inPlace, setInPlace, editMode, toggleEdit, fullbodyKfAtFrame, frameIdx, stampConstraintAtFrame, editableJoints, handleRepose, reposing, keptEdit, discardKeptEdit, kimodoSpec, kimodoError, paramValues, onParamEdit, exportOpen, setExportOpen, bgImage, bgInputRef, handleBgFile, setBg, bodySrc, bodyWired, bodyWiredUpstream, bodyWiredUrl, handleBodyFile, toast, attachBody, onWireSlot, bodySlotIdx, onSave, stage, setBodyWireOpen, bodyNotice, }: MotionRailProps): React.JSX.Element;
//# sourceMappingURL=MotionRail.d.ts.map
