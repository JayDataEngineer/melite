import type { CardDefinition, ComfyUIService, DeclaredModifierKind } from '@melite/comfyui-cordis';
import type { FormSpecDoc } from '@melite/contracts/formSpec';
/** The boarded map (family -> the card that boards it, first-seen).
 *  Exported for the flow tool's bench pass (the card-id alias
 *  resolution rides the SAME table form-spec serves — one truth). */
export declare function boardedMap(defs: Map<string, CardDefinition>): Map<string, string>;
/** One form-spec key's resolution: the rendering card + the boarded
 *  service family. Self-boarded first, else the boarded family whose
 *  declaration routes to the key (krea-2-raw rides krea-2), else
 *  null (unknown / unoffered / retired / fragment — the door 404s,
 *  same body as ever). */
export interface SpecResolution {
    card: string;
    service: string;
    /** The envelope's model id: the key itself, except card-id alias
     *  keys (?model=tts serves the default family's envelope). */
    model: string;
}
export declare function resolveSpecKey(key: string, defs: Map<string, CardDefinition>, boarded: Map<string, string>): SpecResolution | null;
/** The modifier-pack table (the subcard packs). controlnet waits
 *  unboarded (the phantom-capability gate). kind/label/cardinality
 *  are UI strings with no other live source — one row per pack,
 *  stated once.
 *  LANPAINT'S ROW (stroke 32 — the operator's missing-seat report:
 *  image-edit's required image1 never rendered): the port moved the
 *  anchor out of the schema into the lanpaint mod, so the old
 *  "rides inline" exemption became a dropped seat — the family
 *  boards lanpaint, mod_schemas serves it, compose requires it, but
 *  no modifiers entry ever offered the brick. The rail seats the
 *  anchor (the client half); this row offers the knobs.
 *  EXPORTED (022's self-critique #3, 2026-09-24): the load bundle's
 *  mods line serves the SAME grammar for DECL-boarded packs (the
 *  qvoice seats) — one table, two consumers, never a copy. */
export declare const MODIFIER_PACKS: Record<string, {
    kind: string;
    label: string;
    cardinality: string;
    max_stack?: number;
    param_key?: string;
    /** THE ENTRY MODE (pack vocabulary, same status as kind/label:
     *  option = the entry is { id, strength } against the served
     *  catalog; hybrid = the entry is the bag element object with
     *  its option_key field bound to the catalog; field = the entry
     *  IS the contract object, no catalog. The leaf switches on the
     *  SERVED value, never the kind name). */
    entry?: string;
    option_key?: string;
    /** THE SCALAR DIAL (the bag element's weight field): strength
     *  for lora/controlnet, weight for ip_adapter — served so the
     *  leaf never guesses off the kind name. */
    scalar_key?: string;
}>;
export type { DeclaredModifierKind };
export declare function stampOptionsFrom(schema: unknown, svc: {
    modCatalog(pack: string, family: string): {
        rows: ReadonlyArray<{
            id: string;
        }>;
    };
}, family: string, boardedPacks: ReadonlySet<string>): void;
/** THE UNKNOWN-CARD VOICE, SPOKEN ONCE (one voice per refusal):
 *  the defs guard and the formSchemas miss are the same condition, so
 *  both build the same sentence from this function. Two literals is
 *  how they drifted apart in the first place. */
export declare const unknownCardVoice: (card: string) => string;
export declare function specBody(svc: ComfyUIService, defs: Map<string, CardDefinition>, res: SpecResolution): FormSpecDoc;
/** The forms table (the /v1/forms body — card meta only, no fields).
 *  Sorted by (sidebar order, card id) — deterministic. */
export declare function formsTable(defs: Map<string, CardDefinition>): Record<string, unknown>;
/** The kinds arm (the /v1/kinds body — CARD_KINDS in its own
 *  alphabetical order, projected to the served seven keys). */
export declare function kindsArm(): Record<string, unknown>;
/** The live card sections (the catalog arm's cards + capabilities —
 *  alphabetical by card id). families/default ride boarding
 *  (boarded[0] ?? the card itself); principles ride the identity
 *  rung. */
export declare function cardSections(defs: Map<string, CardDefinition>): {
    cards: Record<string, unknown>;
    capabilities: Record<string, unknown>;
};
/** /v1/card-tools — the 1:1 flow port's picker manifests: one row
 * per card package, the manifest shape the old ServicePicker renders
 * (name/model/stage_title/description/params_schema with declared
 * defaults). Projected from the live card defs via emitParamsSchema
 * — the same SSOT the form-spec door rides, never a re-derivation. */
export declare function cardToolsArm(): Promise<unknown[]>;
/** The full live catalog section (models/families ride the registry
 *  emission; cards/capabilities ride the cards; the vocabulary rides
 *  the slot SSOT). The GENERIC MCP card row folds into CARDS with
 * the same live census /v1/forms rides (the picker reads this
 * section — ONE surface; a row only here is invisible, a row only
 * there was). */
export declare function catalogSection(defs: Map<string, CardDefinition>, mcpServers?: readonly string[]): Record<string, unknown>;
/** /v1/model-catalog — the live catalog section (the seated MCP
 * servers fold LIVE — the door passes the tools-seat census, the
 * same read formsArm rides; empty seats fold nothing). */
export declare function modelCatalogArm(mcpServers?: readonly string[]): Promise<Record<string, unknown>>;
/** /v1/forms — the forms table (card rows + the GENERIC MCP row:
 *  ONE engine-served row, id 'mcp' — the subagent-spawn card; the
 *  surface the cards tab lists; the census is the caller's LIVE
 *  fold, never static). */
export declare function formsWithEngines(cardRows: Record<string, unknown>, mcpServers: readonly string[]): Record<string, unknown>;
/** /v1/forms — the forms table. */
export declare function formsArm(mcpServers?: readonly string[]): Promise<Record<string, unknown>>;
/** /v1/kinds — the kinds arm. */
export declare function kindsDoorArm(): Promise<Record<string, unknown>>;
/** /v1/form-spec?model=<key> — the envelope, or null when the key
 *  does not resolve (the door 404s, same body as ever). */
export declare function formSpecArm(model: string, engineDocs?: ReadonlyMap<string, () => Record<string, unknown>>): Promise<FormSpecDoc | null>;
//# sourceMappingURL=discovery.d.ts.map
