import type { CardDefinition } from "@melite/comfyui-cordis";
import type { CardRegistryLike, Flow, FlowStageRow } from "./runsValidateShared.ts";
export type { FlowStageRow };
export declare function strictBody(body: Record<string, unknown>): void;
export declare function buildStageRow(i: number, st: unknown): FlowStageRow;
export declare function wiresResolve(flowId: string, stages: FlowStageRow[]): void;
export declare function cardGate(flowId: string, st: FlowStageRow, cards?: CardRegistryLike | null): void;
/** THE SNAPSHOT-COERCION LAW (roadmap 2026-09-26 — BRIEF14 finding
 *  #2, the stringified persisted snapshot): the wire-corruption
 *  family's compose/lattice seats restore the numbers the GRAPH
 *  sees, but the card snapshot rode `door.requestBody` VERBATIM —
 *  the raw dsh-encoded body, every declared numeric a string
 *  (`"dur_frames": "110"`). Type integrity was unprovable from the
 *  request sidecar alone. The stamp now runs the SAME family
 *  (shape unwrap → array fill → numeric fill, schema-derived
 *  through the card's own carrier — never a stringly guess) so the
 *  persisted snapshot carries the numbers the card actually
 *  received. Envelope keys the schema doesn't declare ride
 *  untouched, and an unknown card rides verbatim (nothing to
 *  derive from). */
export declare function coerceSnapshotBody(def: CardDefinition | undefined, body: Record<string, unknown>): Record<string, unknown>;
export declare function kindsOk(flowId: string, stages: FlowStageRow[], engineDefaults: Record<string, string | null>, cards?: CardRegistryLike | null): void;
export declare function validateEngines(flow: Flow, cards?: CardRegistryLike | null): Flow;
export declare function flowFromBody(body: unknown, cards?: CardRegistryLike | null): Flow;
//# sourceMappingURL=runsValidateStages.d.ts.map
