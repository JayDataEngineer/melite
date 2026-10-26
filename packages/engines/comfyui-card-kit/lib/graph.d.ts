/** A wire endpoint: the output slot of an already-added node. */
export declare class OutputHandle {
    readonly nodeId: string;
    readonly slotIndex: number;
    constructor(nodeId: string, slotIndex: number);
}
/** The WRITER plane's JSON tree (mutable objects/arrays — the graph
 *  builders compose values into it). The wire/reader plane (estate
 *  runs' rows, drafts' remote docs) spells the same value with
 *  readonly members; both spellings are deliberate per plane (DRY
 *  sweep J13 decision, 2026-10-18 — variance recorded, not merged). */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [k: string]: JsonValue;
};
export type NodeInputs = Record<string, JsonValue | OutputHandle>;
/** The node() sink: the /prompt wire is untyped JSON (validation
 *  lives in the admission gate + object_info autofill, never in TS
 *  assignability — the serializer already coerces per value). */
export type NodeInputsLoose = Record<string, unknown>;
/** The serialized /prompt graph — plain JSON, nothing more. */
export type PromptGraph = Record<string, {
    class_type: string;
    inputs: Record<string, JsonValue>;
}>;
/** Accessor returned by node(): call .out(slot) for a wire handle. */
export interface NodeRef {
    readonly id: string;
    out(slot?: number): OutputHandle;
}
export type StripTable = Record<string, readonly string[]>;
export declare function stripAutofill(graph: PromptGraph, table: StripTable): PromptGraph;
export declare function stripEmptyAutofill(graph: PromptGraph, table: StripTable): PromptGraph;
/** An object_info entry's input sections, structurally: the engine's
 *  schema dialect names each pin's spec tail by position ([type,
 *  {default: ...}]) — the tail object's members vary per type, so the
 *  tail is JsonValue and the default is read by the 'default' key
 *  probe below (validated by shape, never cast). */
export type ObjectInfoInput = {
    required?: Record<string, unknown>;
    optional?: Record<string, unknown>;
};
/** Derive the pin autofill map from a live object_info
 *  snapshot: {class: {input: default}} for entries that carry a
 *  default (required + optional both consulted). */
export declare function deriveDefaults(objectInfo: Record<string, {
    input?: ObjectInfoInput;
}>): Record<string, Record<string, JsonValue>>;
export declare class GraphBuilder {
    /** Per-class instance counters — the /prompt key scheme is
     *  `<ClassName>.<index>`. */
    private readonly counters;
    private readonly nodes;
    /** The active id prefix (empty at top level; scoped() sets it). */
    private prefix;
    /** THE FILM SCOPE (2026-09-17, the merged-graph builder): N windows of
     *  one film ride ONE prompt, each under a `window${k}_` namespace,
     *  so seam edges between windows are REAL wires (the executor
     *  orders windows off the graph, never a filesystem convention).
     *  Counters stay global per class — ids never collide across
     *  scopes; the prefix only namespaces. */
    scoped<T>(prefix: string, fn: (b: GraphBuilder) => T): T;
    /** Pin defaults (class → input → default value) from the live
     *  live node set. When present, unspecified inputs autofill
     *  from the pin defaults — cards whose renderer strips
     *  autofill ALSO strip in TS (the strip set is
     *  ported per card), so both planes converge byte-equal. */
    readonly defaults: Record<string, Record<string, JsonValue>>;
    constructor(defaults?: Record<string, Record<string, JsonValue>>);
    /** Add a ComfyUI node; returns its output-slot accessor. */
    node(classType: string, inputs?: NodeInputsLoose): NodeRef;
    private autofill;
    /** Serialize to the exact shape ComfyUI's /prompt expects. */
    toJSON(): PromptGraph;
}
//# sourceMappingURL=graph.d.ts.map