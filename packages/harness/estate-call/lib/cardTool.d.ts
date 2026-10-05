import type { InferValue, ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools';
import { type EstateCall } from './estateCall.js';
/** The flow envelope every card tool returns, stated once: flow +
 *  model + the run ids/status/error arms. defineTool infers
 *  execute's return from it, and the cards' annotations name the
 *  same inference — so multi-arm returns check arm-by-arm instead of
 *  collapsing into a union whose `?: undefined` fillers poison the
 *  schema's `& Record<string, JsonValue>` tail (gate-found,
 *  2026-09-12). */
export declare const CARD_TOOL_OUTPUT: {
    readonly type: "object";
    readonly additionalProperties: true;
    readonly properties: {
        readonly flow: {
            readonly type: "string";
            readonly required: true;
        };
        readonly model: {
            readonly type: "string";
            readonly required: true;
        };
        readonly run_id: {
            readonly type: "string";
            readonly description: "The queue run id — poll with run_status.";
        };
        readonly draft_id: {
            readonly type: "string";
            readonly description: "The minted card draft id.";
        };
        readonly status: {
            readonly type: "string";
            readonly description: "Registration status (queued/running).";
        };
        readonly error: {
            readonly type: "string";
            readonly description: "Named refusal reason, when the estate refused.";
        };
    };
};
export type CardToolEnvelope = InferValue<typeof CARD_TOOL_OUTPUT>;
/** The seams each card owns. `parameters` is the ALREADY-EMITTED
 *  params spec (emitParamsSpec(schema, BOARDED) + any extra knobs —
 *  h3's `calls` rides here); `previewField` is the required knob the
 *  presentCall preview reads ('prompt' or 'text') — or `previewValue`
 *  overrides the field part whole (h3 previews a shot COUNT, not a
 *  slice). The model= prefix stays the builder's either way.
 *  `jsonArrayParams` names JSON-typed parameters whose value is an
 *  array. The builder unwraps JSON strings before both doors; malformed
 *  strings and JSON non-arrays ride untouched for the card gate to
 *  refuse. `prepare` owns any remaining card-specific transform. */
export interface CardToolSpec {
    name: string;
    flow: string;
    label: string;
    description: string;
    parameters: ParameterSchemaSpec;
    defaultModel: string;
    jsonArrayParams?: readonly string[];
    previewField?: string;
    previewValue?: (a: Record<string, unknown>) => string;
    prepare?: (params: Record<string, unknown>) => void;
    timeoutMs?: number;
}
export declare function normalizeJsonArrayParams(params: Record<string, unknown>, keys: readonly string[] | undefined): Record<string, unknown>;
/** Build a card's tool face over the shared skeleton. Behavior is
 *  the six faces' verbatim common core — their tool.spec.ts walls
 *  pin it and must stay green unchanged. `timeoutMs` is left
 *  unstated by every current card (the six faces' TIMEOUT_MS
 *  constants were declared and never passed — a dead class this
 *  builder refuses to resurrect; jsonLane's 60s default governs). */
export declare function defineCardTool(call: EstateCall, spec: CardToolSpec): ToolDefinition;
//# sourceMappingURL=cardTool.d.ts.map
