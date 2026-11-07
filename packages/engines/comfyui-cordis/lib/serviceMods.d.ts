import type { ModFields, LoraRowDecl, VerbRegistration } from '@melite/comfyui-card-kit/service-faces';
/** The field gates (dsl._validate_field), on the
 *  Schemastery meta — loud at registration, never a silent drop. */
export declare function validateFields(where: string, fields: ModFields): void;
/** The verb plane law (dsl._validate_verbs): every engine row
 *  carries EXACTLY one arm. */
export declare function validateVerb(v: VerbRegistration): void;
/** A union-of-consts node's option list (declared order = serve
 *  order; null when the node is not a closed vocabulary). The
 *  alternatives live at .list, each const carrying .value; a null
 *  const is the nullable marker, never an enum option. */
/** One normalized ControlNet row (the lane's resolved shape — the
 *  kit's fireControlNets consumes this, never the raw bag). The
 *  three stamped fields (002 H3/H5) carry the catalog ROW's own
 *  law downstream: the schedule capability, the strength ceiling,
 *  and the video/mask channels resolved exactly like the still
 *  channel. */
export interface ResolvedControlNet {
    readonly type: string;
    readonly model: string;
    readonly preprocessor: string;
    readonly image_b64: string;
    readonly artifact: string;
    /** The staged conditioning source — artifact won when set (the
     *  retired brick precedence), else image_b64. Empty when the
     *  entry's conditioning rides the clip or mask channel instead
     *  (002 H2/H4). */
    readonly image: string;
    /** The staged VIDEO conditioning source (002 H2) — the clip
     *  artifact name, '' when absent. */
    readonly clip: string;
    /** The staged MASK conditioning source (002 H4) — the mask
     *  artifact name, '' when absent. */
    readonly mask: string;
    readonly strength: number;
    readonly start_percent: number;
    readonly end_percent: number;
    readonly enabled: boolean;
    /** The row's declared schedule capability, stamped (002 H3). */
    readonly schedule: 'full' | 'ranged';
    /** The row's declared strength ceiling, stamped (002 H5). */
    readonly strength_max: number;
}
/**
 * Normalize one ControlNet bag row to the lane's resolved shape
 * (the compose-side half of the type/model split — the kit fires,
 * the service resolves, the LoRA law verbatim). Every malformed
 * row refuses LOUD with its entry named: unknown catalog types,
 * a model naming a different file than the catalog row, a
 * preprocessor disagreeing with the row's upstream-map note, an
 * off-bounds strength, a malformed step range, a map-less entry.
 * The step EXECUTABILITY refuses in the kit's schedule law (one
 * spelling — assertControlNetSchedule, shared); the range SHAPE
 * refuses here.
 */
export declare function resolveControlNetEntry(raw: unknown, rows: readonly LoraRowDecl[], cardId: string, modelId: string): ResolvedControlNet;
//# sourceMappingURL=serviceMods.d.ts.map
