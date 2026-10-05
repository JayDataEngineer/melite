import type { CardStage } from "@melite/contracts";
import { FLOOR_LIFT_Y, MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM } from "./motionParams.js";
export { FLOOR_LIFT_Y, MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM };
interface MotionCardEditorProps {
    stage: CardStage;
    onSave: (params: Record<string, unknown>) => void;
    /** ALL stages of the enclosing run, in array order — the preview-body
     *  subcard's wire picker restricts to indices BEFORE this card. */
    upstreams?: CardStage[];
    /** Wire/unwire the preview_glb slot (the store's setSlotInput, stage-
     *  scoped by the studio shell). Omit to hide the wire affordance. */
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    runCompiledGeneration: typeof import("@melite/catalog").runCompiledGeneration;
}
export declare function MotionCardEditor({ stage, onSave, upstreams, onWireSlot, runCompiledGeneration, }: MotionCardEditorProps): import("react").JSX.Element;
export default MotionCardEditor;
/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the live skinned motion viewport is the mesh, kind
 *  "native"; the rail carries the view/pose/output tool groups;
 *  MotionTimelineBar in a PaneShell is the bottom). */
export declare const shellDeclaration: Readonly<import("@melite/card-base/client").ShellDeclaration>;
//# sourceMappingURL=component.d.ts.map
