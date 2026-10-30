import type { CardStage } from "@melite/contracts";
export interface WirePickerModalProps {
    /** Slot key being wired (display only — "Wire {slot} from …"). */
    slot: string;
    /** Prior stages by ARRAY INDEX (the caller already filtered forward of the
     * current stage — F4: wires only point backwards). */
    priorStages: CardStage[];
    /** Currently-wired upstream id (undefined = nothing wired). */
    currentId?: string;
    /** Currently-selected named output (null = primary assetUrls[0]). */
    currentOutput?: string | null;
    /** Pick an upstream (+ optional named output). The caller writes the wire
     * AND clears the slot param (mutual-exclusion). */
    onPick: (upstreamId: string, outputName?: string | null) => void;
    /** Unwire — the slot returns to manual-attach / empty. */
    onUnwire: () => void;
    onClose: () => void;
}
/** The wire picker — prior stages by ARRAY INDEX, including ones that
 * haven't run yet ("not run yet" — wire BEFORE the upstream runs).
 *
 * Named outputs: when an upstream stage produced >1 named artifact
 * (input_prep → media + mask), it expands into ONE ROW PER output so the
 * user can wire mask → input_mask specifically. Upstreams with 0–1
 * named artifacts render as a single row (legacy — primary via
 * assetUrls[0]). The output name rides onPick → setSlotInput →
 * inputOutputs → collectUpstreamResults. */
export declare function WirePickerModal({ slot, priorStages, currentId, currentOutput, onPick, onUnwire, onClose, }: WirePickerModalProps): import("react").JSX.Element;
//# sourceMappingURL=wirePicker.d.ts.map