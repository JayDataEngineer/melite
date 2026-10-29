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
    /** The engine's own entry floor for a COMFY_AUTOGROW_V3 input
     *  (`template.min`): 0 means a fully ABSENT input is legal at the
     *  engine (the zero-entry autogrow — TextEncodeQwenImage21.images
     *  on the 2026-11-09 build); 1+ keeps absence a refusal. */
    readonly autogrowMin?: number;
}
/** The engine's declared-node census, derived from /object_info:
 *  node names and, per node, its DECLARED inputs (required ∪
 *  optional — the doc's own truth, value facts attached). */
export interface WiringDoc {
    readonly nodes: ReadonlySet<string>;
    readonly inputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | undefined;
}
/** One `/object_info` input tuple → its value facts. The tuple's
 *  first element is the combo enum (an array) or the type name (a
 *  string); an object second element carries `min`/`max` for
 *  numerics. ComfyUI ≥ 0.38 also spells combos as a string head
 *  with the enum in the detail object — `["COMBO", {options}]` and
 *  `["COMFY_DYNAMICCOMBO_V3", {options: [{key}, …]}]` — which the
 *  video sweep (2026-10-13, F1) proved the string-head arm alone
 *  stood down on: a shape the declaration does not say contributes
 *  the required flag alone — the wall judges only what the
 *  declaration actually says.
 *
 *  Exported for the wall tier: the vocab-rails drift contract reads
 *  the live cache through THIS parse (both combo spellings, one
 *  derivation) instead of assuming `spec[0]` is the enum array —
 *  the assumption a modern-shaped combo silently breaks.
 *  @param spec the raw input tuple from /object_info
 *  @param required whether the tuple sat in the required group
 *  @returns the parsed value facts (enum present only when the
 *           tuple carries one in either spelling) */
export declare function parseInputSpec(spec: unknown, required: boolean): WiringInputSpec;
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
/** The widget-serialization keys ComfyUI accepts on the wire but
 *  never lists in `/object_info` — each with the node that proves it
 *  (a landed run in data/runs/output carries the pair):
 *   - `upload` — LoadImage (image lanes: the upload walk stages the
 *     value; the server ignores the key)
 *   - `model_options` — CLIPLoader (audio lanes; restates the default)
 *   - `lora_ui` — LTX_lora_loader (the h3 refine arm; stripped on
 *     some arms and shipped on others)
 *  A name that is not here and not declared is still refused.
 *  Exported so the key judge (the liveness wall's card/action sweep)
 *  honors the SAME receipt — one allowlist, every key-depth judge. */
export declare const WIDGET_SERIALIZATION_KEYS: ReadonlySet<string>;
//# sourceMappingURL=wiringWall.d.ts.map