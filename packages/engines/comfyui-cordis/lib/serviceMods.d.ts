/** A mod's field contract: a Schemastery OBJECT schema (the
 *  dual-declaration pattern — the same z.object({...}) style the
 *  cards declare; UI meta rides .extra('extra', bag({group, zone,
 *  order, visible_when})) exactly like card fields). ONE meta path
 *  walks both card and mod surfaces; same-pack flavor merging is
 *  Schema.intersect semantics (constraints merge per key). */
export type ModFields = {
    (v: unknown): Record<string, unknown>;
    dict?: Record<string, Record<string, unknown>>;
};
/** A lora catalog row (grammar.LoraRow — no link, no row).
 *  The shape is the shared catalog-row shape for row-bearing packs
 *  (loras today, controlnet: its rows carry the served tooltip and
 *  the upstream-map preprocessor note — catalog facts, never
 *  execution: no preprocessor runs in this plane). */
export interface LoraRowDecl {
    readonly id: string;
    readonly filename: string;
    /** The upstream fetch source — REQUIRED on executable rows
     *  (the CN/LoRA law: no link, no row). A vocabulary-only row
     *  (ip_adapter's refused-fate catalog) carries NONE: no source
     *  exists, so none is claimed — nothing fetches, nothing lies. */
    readonly source_url?: string;
    readonly label?: string;
    readonly category?: string;
    readonly default_strength?: number;
    /** The scalar default under a pack whose dial is 'weight'
     *  (ip_adapter's retired wire) — discovery stamps it into the
     *  option defaults under the pack's scalar_key. */
    readonly default_weight?: number;
    /** Steps applied (2026-09-18): a DISTILL adapter's married step
     *  count — one lora for four steps, another for eight. Served into
     *  the option defaults so boarding stamps it onto the entry; the
     *  compose honors it when the caller pins no steps of their own.
     *  RANGE FACTS (the 4-to-8 correction): `steps_min`/`steps_max`
     *  declare the adapter's valid domain when it is not a fixed
     *  point (Turbo 4-to-8: min 4, max 8; the married default stays
     *  `steps`). A bare `steps` implies the fixed point. */
    readonly steps?: number;
    readonly steps_min?: number;
    readonly steps_max?: number;
    readonly tooltip?: string;
    readonly preprocessor?: string;
}
/** A pack contract — the CATEGORY (the Mod parent: LorasMod,
 *  ControlNetMod, LanPaintMod, MaskMod, the qvoice pack). Fields
 *  are the pack's knob block, inherited by every boarding family. */
export interface PackContract {
    readonly pack: string;
    readonly fields: ModFields;
}
/** A flavor registration — ONE family's boarding of a pack (the
 *  Model.mods tuple entry): bare (fields-only boarding), row-bearing
 *  (the family's catalog rows), or the runtime-catalog door. The
 *  file lives in the family's own mods/ dir — the scope below IS
 *  the owning declaration, gated ≡ the model's DECL.mods at boot. */
export interface FlavorRegistration {
    readonly pack: string;
    readonly families: readonly string[];
    readonly rows?: readonly LoraRowDecl[];
    /** The RUNTIME CATALOG door (estate qwen loras catalog): no own rows
     *  the union of every family's declared rows serves; family rows
     *  always win over the union. */
    readonly runtimeCatalog?: boolean;
}
/** A verb engine row (dsl.VerbEngine — exactly one arm). */
export interface VerbEngineRow {
    readonly id: string;
    readonly flow?: string;
    readonly local?: string;
    readonly refusal?: string;
}
/** A verb registration (SubActionMod: knobs NEVER join the card
 *  surface; they ride the engine invocation). */
export interface VerbRegistration {
    readonly id: string;
    readonly label: string;
    readonly families: readonly string[];
    readonly engines: readonly VerbEngineRow[];
    readonly writes: readonly string[];
    readonly requires: readonly string[];
    readonly fields: ModFields;
}
/** A mod's absorbed contract (the family scope attached — the
 *  emission filter). */
export interface AbsorbedMod {
    readonly pack: string;
    readonly fields: ModFields;
    readonly families: readonly string[];
}
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
 *  kit's fireControlNets consumes this, never the raw bag). */
export interface ResolvedControlNet {
    readonly type: string;
    readonly model: string;
    readonly preprocessor: string;
    readonly image_b64: string;
    readonly artifact: string;
    /** The staged conditioning source — artifact won when set (the
     *  retired brick precedence), else image_b64. */
    readonly image: string;
    readonly strength: number;
    readonly start_percent: number;
    readonly end_percent: number;
    readonly enabled: boolean;
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
