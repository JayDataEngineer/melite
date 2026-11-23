import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
import type { GraphBuilder, PromptGraph } from '@melite/comfyui-card-kit/graph';
import type { EditMaskDial, EditReferenceDial } from '@melite/models-h3';
import type { H3Facts } from '@melite/models-h3/actions';
import type { H3LoraRow } from '@melite/models-h3/mods/loras';
import type { paramSchema as familyParamSchema, schema as familySchema, coerceWireBoolean as familyCoerceWireBoolean } from '@melite/models-h3/schema';
/** One family's runtime seat: its DECL plus every export face the
 *  card reads — the schema carrier + normalizer + wire law, the
 *  loras catalog, the compose renderers, and the constants the
 *  card's limits and prose interpolate. */
export type H3FamilySeat = {
    decl: ModelDecl;
    /** The loras flavor's catalog rows (mods/loras — the served
     *  select options and the render-side marriage). */
    loraRows: readonly H3LoraRow[];
    /** The absent-bag ghost chip (actions.ts's resolved default). */
    defaultLoraEntry: () => {
        id: string;
        strength: number;
        steps: number;
    };
    /** The finalize pass (the t4-family autofill strip). */
    finalize: (graph: PromptGraph) => PromptGraph;
    /** The masked-edit matrix renderer (the edit bag's emission). */
    renderEdit: (entry: Record<string, unknown>, mask: EditMaskDial, reference: EditReferenceDial, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string) => void;
    /** THE TILED REPAIR BAG (the windows arc): N ≥ 2 hand-tiled
     *  windows, each its own masked-edit chain on the one spine, joined
     *  into ONE film by the film tail's join primitives. */
    renderRepairBag: (bag: readonly unknown[], p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string) => void;
    reshootArmed: (p: Record<string, unknown>) => boolean;
    /** The overlay-gate assert (the single-call lift's judge). */
    assertOverlayGated: (doc: Record<string, unknown>, where: string) => void;
    /** The lane-inputs facts parser. */
    parseFacts: (raw: unknown) => H3Facts;
    /** THE PARAM CARRIER (schema.ts's paramSchema — the strict
     *  resolve's walk AND the registered schemaCarrier). */
    paramSchema: typeof familyParamSchema;
    /** The full normalizer (the registered schema — truly-explicit
     *  keys walk it at the compose door). */
    schema: typeof familySchema;
    /** The wire law (schema.ts's coerceWireBoolean — the same
     *  definition schema() uses). */
    coerceWireBoolean: typeof familyCoerceWireBoolean;
    /** The card's JSON-typed params (schema.ts's JSON_ARRAY_PARAMS). */
    jsonArrayParams: readonly string[];
    /** THE SEAM LAW constant (timelineContract's SEAM_OVERLAP_FRAMES,
     *  re-exported on the main face) — the tool face's calls prose. */
    seamOverlapFrames: number;
    /** THE FILM ADMISSION NOTICES (timelineContract's
     *  filmAdmissionNotices, re-exported on the main face — the M-T
     *  cures' warn arm: the promoted silent tail, the span snaps, the
     *  speech map). ADVISORY: an absent family degrades to the card's
     *  own prompt warns, never a refusal. */
    filmAdmissionNotices: (doc: Record<string, unknown>) => readonly string[];
    /** The legacy refine arm's declared design default window
     *  (refine.ts's REFINE_DEFAULT_CLIP_SECONDS) — read only when a
     *  legacy doc omits clip_seconds; a SAFETY-ADJACENT limit, so an
     *  absent family never defaults it (requireSeat refuses). */
    refineDefaultClipSeconds: number;
};
/** Prime every family seat (idempotent; an absent package degrades
 *  to its own absence — the card never dies for a family). A
 *  package whose faces fail to load (absent from the install) or
 *  whose faces load malformed leaves NO seat: the doors that need a
 *  face refuse loud naming the package. */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent or its
 *  faces did not seat (the doors' own loud refusals name it). */
export declare const seatOf: (id: string) => H3FamilySeat | undefined;
/** The family seat, LOUD: every door that cannot serve without a
 *  family face refuses here, by name — the compose dispatch, the
 *  carrier walk, the tool face's param surface. The message shape
 *  is composeFamilyAction's (the image-gen exemplar): the family id
 *  on the card, the reason, and the by-name refusal clause. */
export declare const requireSeat: (cardId: string, face: string) => H3FamilySeat;
//# sourceMappingURL=family-seats.d.ts.map
