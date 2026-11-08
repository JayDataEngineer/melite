import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
/** The door's answer (status folds away at the remote seam; the
 *  payload rides verbatim). */
export interface FlowsValidateAnswer {
    status: number;
    payload: Record<string, unknown>;
}
/** The card-registry face the pure half touches, STRUCTURAL (the
 *  producing service is the cardRegistry stroke's; null = the
 *  loud-refusal paths above — never a silent degrade). */
export interface CardRegistryLike {
    defsSync(): Map<string, CardDefinition>;
    objectInfo(): Record<string, unknown> | null;
}
export declare const ENGINE_TABLE: Record<string, {
    plugin: string;
}>;
/** THE ENGINE MEMBERSHIP READ (the one-table cure, 2026-11-01):
 *  the lattice's and the start door's shared existence check —
 *  table rows plus the mcp-client grammar leg (read here, never
 *  retyped at either door). It answers existence ONLY: what a
 *  stage produces comes from the stage's own tables (outputs,
 *  card_io, the card's declared kinds), never from this registry.
 *  Unknown ids refuse at the caller's door, in the door's voice. */
export declare function engineKnown(engine: string): boolean;
export declare const KIND_VOCAB: readonly string[];
export declare const SKIP_VOCAB: readonly string[];
export declare const INLINE_TOP_SORTED: readonly string[];
export declare const STAGE_KEYS_SORTED: readonly string[];
export { FLOW_ID_RE } from "./runsGates.ts";
/** needCardRegistry (start-door-verbatim): the LOUD
 *  miswire when the card registry is absent — a card= stage
 *  refuses until the cardRegistry stroke slots the defs in. */
export declare function needCardRegistry(cards: CardRegistryLike | null | undefined, where: string): CardRegistryLike;
export declare class FlowError extends Error {
    constructor(message: string);
}
export type Edge = {
    kind: "initial";
    key: string;
} | {
    kind: "stage";
    stage: string;
    output: string;
};
export interface StageSkip {
    initial: string;
    when: string;
}
export interface FlowStageRow {
    id: string;
    engine: string;
    description: string;
    params: Record<string, unknown>;
    inputs: Array<{
        name: string;
        edge: Edge;
    }>;
    outputs: Array<{
        name: string;
        kind: string;
    }>;
    expected: Array<{
        name: string;
        kind: string;
    }>;
    card: string;
    cardIo: Array<{
        name: string;
        kind: string;
    }>;
    skipWhen: StageSkip | null;
}
export interface Flow {
    id: string;
    description: string;
    stages: FlowStageRow[];
}
export interface GraphNode {
    id: string;
    engine: string;
    description: string;
    inputFrom: string[];
    inputNames: string[];
    outputs: Array<{
        name: string;
        kind: string;
    }>;
    params: unknown;
}
//# sourceMappingURL=runsValidateShared.d.ts.map