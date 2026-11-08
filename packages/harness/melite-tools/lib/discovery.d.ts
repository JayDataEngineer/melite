import type { ComfyUIService } from '@melite/comfyui-cordis';
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
import type { DeclaredModifierKind } from '@melite/comfyui-card-kit/params-emit';
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
import type { FormSpecDoc, FormVariantRow } from '@melite/contracts/formSpec';
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
     *  keys (?model=tts serves the default family's envelope).
     *  UNDEFINED for a card that boards no models (the minted-model
     *  kill, 2026-10-12): resolving model-less cards to their own id
     *  minted `model: 'mask'`, the client sent the phantom seat, and
     *  the run door refused the card's own id against an empty board
     *  — a model-less card serves NO model seat, it never names one. */
    model: string | undefined;
}
export declare function resolveSpecKey(key: string, defs: Map<string, CardDefinition>, boarded: Map<string, string>): SpecResolution | null;
/** The TOOL arm's resolution (melite_flow's card question): the
 *  card census with the family fallback, SILENT on an unbooted
 *  models table. The tool's own census is the CARD table
 *  (loadCardDefs — always booted by the time it asks), and the
 *  live estate boots the models seat before tools serve, so an
 *  unbooted table here is a cold test process's state: the tool
 *  keeps its own refusal voice, never the table's. Only the
 *  form-spec family arm (resolveSpecKey itself) may speak the
 *  table's voice.
 *
 * @param key the tool's card or family id.
 * @param defs the booted card definitions.
 * @param boarded family id → owning card id.
 * @returns the resolution, or null when neither census answers. */
export declare function resolveSpecKeyForTool(key: string, defs: Map<string, CardDefinition>, boarded: Map<string, string>): SpecResolution | null;
/** THE LANE CONTRACT SERVE (2026-10-10, the fix shape 2+4): the
 *  family's declared surface + relation words, verbatim, for the
 *  form plane — the client resolves (family base ∪ variant
 *  additions) with laneSurfaceOf and judges with
 *  judgeLaneRelations, the same calls the bench-write door uses.
 *  Served ONLY when the family declares a base surface (the
 *  spread at the call site gates it). */
/** The key family's variants + its offered quant cells — THE SERVED
 *  PROJECTION OF THE ONE WALK (facts.ts deriveVariants). A cell
 *  serves the envelope iff its route is addressable at the key: a
 *  ROUTE key scopes to its own lane (cells addressed at the key or
 *  the owning family); a served FAMILY key (key === service) serves
 *  its OWN DECL's cells ALWAYS — the boarded[0] gate may scope only
 *  foreign lanes, never starve (the anima burn cure, 2026-11-06: the
 *  old `primary` form dropped EVERY cell of a non-first-boarded
 *  family — image-gen boards krea-2 first, so the served anima spec
 *  carried zero Quant rows while the DECL declared two, and the
 *  mirror refused with a voice that blamed the DECL). A routeless
 *  cell follows its row — the route is the run's ROUTING stamp
 *  (cardsCompose's resolved address), never a serve filter (the g2
 *  lane-parity cure, 2026-10-20). Variant rows serve whole
 *  (every key, always) regardless of route. A key naming a
 *  hidden route serves an empty axis (the hidden-lane mirror).
 *  Exported as the one
 *  serializer the walls ride (the switching sweep; the sync wall's
 *  P2 face is formSpecArm, this door's own body). */
export declare function specVariants(decl: ModelDecl, key: string): FormVariantRow[];
/** The modifier-pack table (the subcard packs). controlnet waits
 *  unboarded (the phantom-capability gate). kind/label/cardinality
 *  are UI strings with no other live source — one row per pack,
 *  stated once.
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
    /** THE ENTRY SHAPE (friction-report #4, 2026-10-28): the doc line
     *  `entries: {...}` names the ENTRY shape, never the pack's field
     *  names — the old `entries: {loras}` read as an entry shaped
     *  `{loras: ...}` and burned three refusals. A pack whose entries
     *  are catalog picks states the pick shape here. */
    entry_shape?: string;
    /** THE FLAT LAW (the qvoice_save burn, 2026-10-22): true = the
     *  pack's fields are the card's own knobs — commits ride the
     *  root, no bag forms (modCommitWrite, @melite/contracts). */
    flat?: true;
}>;
/** THE ENGINE LISTING READER (the lora-from-url cure, operator order
 *  2026-11-09): the engine's own LoRA combo — the SAME reader + memo
 *  the manage plane's lora_list rides (`liveObjectInfo`, cached per
 *  engine for the process life, dropped by the lora_fetch landing) —
 *  so the picker's candidates and the lora doors can never disagree
 *  about what the engine will load. Absent (undefined) when the
 *  engine is unreachable or undeclared: the picker serves its DECL
 *  rows alone — an engine that proves nothing never invents
 *  candidates (the honest-empty law). @param boundMs the live read's
 *  deadline bound (the manage doors' own railMs posture, tighter
 *  here: a form-spec serve must not hang on a dead engine).
 *  @returns the combo names ('<family>/<file>'), or undefined. */
export declare function engineLorasListing(boundMs?: number): Promise<readonly string[] | undefined>;
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
export declare function specBody(svc: ComfyUIService, defs: Map<string, CardDefinition>, res: SpecResolution, engineLoras?: readonly string[]): FormSpecDoc;
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
/** /v1/boot-facts — the boot caches' staleness signal (HMR audit
 *  009 F2, 2026-10-24): the card-defs and model-facts caches are
 *  boot snapshots with no re-read — an edit on a live host served
 *  stale with ZERO signal, and the operator could not tell "edit
 *  not served" from "edit wrong". This door is the signal: both
 *  caches' prime times against their on-disk truths, with a stale
 *  verdict each. The registry half carries the caller's
 *  ctx.cardRegistry; a fiber without it (the provider unmounted)
 *  reports that fact by name — the door's own law is visibility,
 *  never a silent empty and never a crash.
 *  @param registry the host fiber's card registry, if mounted. */
export declare function bootFactsArm(registry: {
    factsStaleness(): {
        primed_at: string | null;
        source: string;
        source_mtime: string;
        stale: boolean;
    };
} | null | undefined): Record<string, unknown>;
/** /v1/model-catalog — the live catalog section (the OPTED-IN MCP
 * servers fold LIVE — the door passes the engines-seat opt-in census
 * (error j2: ambient tools presence is not intent), the same read
 * formsArm rides; an un-opted lane folds nothing). */
export declare function modelCatalogArm(mcpServers?: readonly string[]): Promise<Record<string, unknown>>;
/** /v1/forms — the forms table (card rows + the GENERIC MCP row:
 *  ONE engine-served row, id 'mcp' — the subagent-spawn card; the
 *  surface the cards tab lists; the census is the caller's OPT-IN
 *  fold (error j2), never static and never ambient). */
export declare function formsWithEngines(cardRows: Record<string, unknown>, mcpServers: readonly string[]): Record<string, unknown>;
/** /v1/forms — the forms table. */
export declare function formsArm(mcpServers?: readonly string[]): Promise<Record<string, unknown>>;
/** /v1/kinds — the kinds arm. */
export declare function kindsDoorArm(): Promise<Record<string, unknown>>;
/** /v1/form-spec?model=<key> — the envelope, or null when the key
 *  does not resolve (the door 404s, same body as ever). A model
 *  FAMILY name against an unbooted table THROWS the table's own
 *  refusal (never a 404 — the census-arm split, 2026-10-13). */
export declare function formSpecArm(model: string, engineDocs?: ReadonlyMap<string, () => Record<string, unknown>>, engineLoras?: readonly string[] | Promise<readonly string[] | undefined>): Promise<FormSpecDoc | null>;
//# sourceMappingURL=discovery.d.ts.map