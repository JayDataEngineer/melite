import { type EstateCall } from "./estateCall.js";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
/** One recorded gateway call, as the seam logs it. */
export interface RecordedCall {
    method: string;
    path: string;
    body: Record<string, unknown>;
}
/** The mutable reply bodies the seam answers from (the spec arms
 *  reassign between rows — the recording seam's controls; both doors
 *  always reply 200, refusal rows speak through an error key).
 * @param draftsBody the drafts door's reply body
 * @param startBody the start door's reply body */
export interface SeamControls {
    draftsBody: Record<string, unknown>;
    startBody: Record<string, unknown>;
}
/** The seam machinery: recording call, controls, exec stub, and the
 *  card's tool under construction. */
export interface ExecutorHarness {
    seam: EstateCall;
    calls: Array<RecordedCall>;
    controls: SeamControls;
    exec: Parameters<ToolDefinition["execute"]>[1];
    tool: () => ToolDefinition;
    goodArgs: Record<string, unknown>;
    defaultModel: string;
}
/** Build the recording seam and the exec stub around a card tool
 *  builder. The seam answers /v1/flows/drafts from the drafts
 *  controls and every other path from startBody — always 200 (the
 *  refusal law rides error keys in the body; the status-throw law
 *  is the GatewayError fallback rows' own).
 * @param makeTool the card's builder (buildMusicTool &c)
 * @param goodArgs the card's minimal valid arguments
 * @param defaultModel the boarded default the unstated model resolves to
 * @returns the harness: seam, calls ledger, controls, exec, tool */
export declare function executorHarness(makeTool: (call: EstateCall) => ToolDefinition, goodArgs: Record<string, unknown>, defaultModel: string): ExecutorHarness;
/** The battery's per-card configuration.
 * @param makeTool the card's tool builder
 * @param goodArgs the card's minimal valid arguments
 * @param defaultModel the boarded default (the unstated resolution)
 * @param explicitModel a second, explicit model address the enum offers
 * @param draftIntent the intent the drafts door must carry
 * @param flow the flow id (envelope value + tile default)
 * @param renderLabel the render prose's card label when it is not the
 *  flow id (the tool-plane names: image_gen, image_edit, h3_timeline)
 * @param drivingField the presentCall prose pin for the card's driving field
 * @param defaultAnchor the default-model prose anchor (h3 pins "(\\s|$)")
 * @param explicitAnchor the explicit-model prose anchor (gen/edit/h3
 *  pin a trailing word boundary "\\s"; the rest match unanchored) */
export interface BatteryConfig {
    makeTool: (call: EstateCall) => ToolDefinition;
    goodArgs: Record<string, unknown>;
    /** the boarded default (the unstated resolution — the envelope's spelling) */
    defaultModel: string;
    /** the wire spelling the unstated default crosses as (semantic cards
     *  fold the style value to its route; defaults to defaultModel) */
    defaultModelRoute?: string;
    explicitModel: string;
    /** the wire spelling of explicitModel (defaults to explicitModel) */
    explicitModelRoute?: string;
    draftIntent: string;
    flow: string;
    renderLabel?: string;
    drivingField: RegExp;
    defaultAnchor?: string;
    explicitAnchor?: string;
}
/** Register the five shared describes (envelope, render, tile,
 *  presenter, presentCall) around a card tool. Returns the harness
 *  for the card's own extra rows.
 * @param cfg the per-card configuration
 * @returns the executor harness (seam, calls, controls, exec, tool) */
export declare function registerExecutorBattery(cfg: BatteryConfig): ExecutorHarness;
//# sourceMappingURL=executorHarness.d.ts.map
