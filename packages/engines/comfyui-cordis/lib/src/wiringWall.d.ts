import { Service, type Context, type Plugin } from '@deepseek-ai/cordis';
/** One input's declared facts off `/object_info` — the doc carries
 *  VALUES, not names alone (the strictness audit's T2): the
 *  required flag, the declared type name (`INT`, `FLOAT`,
 *  `STRING`, `BOOLEAN`, or a connection type), the combo enum when
 *  the input is a combo, and the numeric bounds when the
 *  declaration states them. A names-only consumer reads nothing
 *  but the key. */
export interface WiringInputSpec {
    readonly required: boolean;
    readonly type?: string;
    readonly enum?: ReadonlyArray<string | number | boolean>;
    readonly min?: number;
    readonly max?: number;
}
/** The engine's declared-node census, derived from /object_info:
 *  node names and, per node, its DECLARED inputs (required ∪
 *  optional — the doc's own truth, value facts attached). */
export interface WiringDoc {
    readonly nodes: ReadonlySet<string>;
    readonly inputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | undefined;
}
/** Derive the census from a raw /object_info body — ONE derivation
 *  shared by every doc-owner (the card-plane service and the
 *  estate registry's prime) so no seat judges a differently-shaped
 *  doc. A names-only snapshot keeps the node gate and skips the
 *  input gate — never a guessed refusal. */
export declare function deriveWiringDoc(objectInfo: Record<string, unknown>): {
    nodes: Set<string>;
    inputs: Map<string, Map<string, WiringInputSpec>>;
};
/**
 * THE WIRING DOC SERVICE (seat name `comfyuiWiring`).
 *
 * The context-scoped home of the census: armed by whoever lands
 * /object_info, read at walk time by the three seats. Provided by
 * `comfyuiWiringProvider`; absent in a composition, `ctx.get`
 * answers undefined and every wall stands down (documented,
 * loud in the provider's absence, never a guessed refusal).
 */
export declare class ComfyUIWiringService extends Service {
    private doc;
    constructor(ctx: Context);
    /** Arm the wall (a doc-owner, when /object_info lands). */
    arm(nodes: ReadonlySet<string>, inputs?: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | null): void;
    /** Disarm (a doc-owner whose fetch failed — unarmed, the wall
     *  stands down; the null doc never judges). */
    disarm(): void;
    /** Whether a doc is armed (census/tests — never a gate). */
    armed(): boolean;
    /** Walk a graph against the armed doc — THE SEATS' FENCE CALL.
     *  Unarmed, no doc, the wall stands down: the standing law. */
    assert(cardId: string, graph: unknown): void;
}
/** The provider: mounts the wiring service. Mount BEFORE the host
 *  and the engines adapter (the estate bundle's row order) so both
 *  `comfyui` classes and the run seat read it from first submit. */
export declare const comfyuiWiringProvider: Plugin;
export declare function assertWiringAgainst(nodes: ReadonlySet<string> | null, declaredInputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | null | undefined, cardId: string, graph: unknown): void;
