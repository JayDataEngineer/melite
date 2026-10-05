import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The fit-seat facts door: the seat reads NOTHING off a lane
 *  (analytic bone-scale fitting — no weights load), so the door is
 *  the weightless vacuous parse, present to keep the action
 *  contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export declare function parseFitFacts(_raw: LaneInputsFacts): Record<string, never>;
/** The seat verb's request: the two files the caller names. */
type SeatParams = {
    readonly body: string;
    readonly prop: string;
    readonly bone: string;
};
/** THE FIT ROW — the FitRow node's own declared defaults, verbatim
 *  (vendor/comfyui_extensions/melite-poser-nodes/fit_nodes.py:105-116),
 *  with ONE exception below.
 *
 *  THE BONE IS NOT A DEFAULT, BECAUSE THE ENGINE HAS NONE: the
 *  vendor's row gate refuses an empty Bone before it chooses a mode
 *  (fit_surgery.py:66-68 — "fit row needs Bone (which bone carries
 *  it)"; socket mode is chosen AFTER that check, not instead of it).
 *  A named bone belongs to the body being fitted, so it is the
 *  CALLER's value: the door's initial vocabulary carries a `text`
 *  kind for a bare name, and the flow declares the bone REQUIRED, so
 *  a request without one is refused at the door rather than here. */
export declare const FIT_ROW: {
    readonly model_name: "prop";
    readonly align: "socket";
    readonly position: "0,0,0";
    readonly rotation: "0,0,0";
    readonly fit_ratio: 0;
    readonly fit_ref_bone: "";
    readonly fit_ref_bone2: "";
    readonly seat_ratio: 0.22;
    readonly finger_bone: "";
    readonly thumb_bone: "";
    readonly target_width: 0;
};
/** The seat action (the flow 'fit-seat' the meld chips drive):
 *  FitRow (the analytic fit row) → FitProp (body ∪ prop under the
 *  row) → the 4-view proof sheet. */
export declare const seat: ComfyActionSpec<SeatParams, Record<string, never>>;
export {};
//# sourceMappingURL=actions.d.ts.map
