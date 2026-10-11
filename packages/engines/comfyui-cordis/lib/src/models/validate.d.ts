import { type ModelDecl } from "./families/contract.js";
/** One card field's domain — the projection the pure core sees. */
export interface FieldDomain {
    readonly min?: number;
    readonly max?: number;
    readonly options?: readonly string[];
}
/** card id → (field name → domain). */
export type CardDomains = ReadonlyMap<string, ReadonlyMap<string, FieldDomain>>;
/** ENGINE_TRUTH (the one SSOT, models-against-cards audit finding 5,
 * 2026-09-28): the compose's own declaration keys — never card
 * fields. "model" is the ROUTE RE-POINT token (resolver_defaults
 * .model, the krea-2-raw precedent): a card boarding a route
 * address (qvoice across ALL qwen3-tts, operator 2026-09-23) walks
 * that view's defaults, and the token must skip like "variant"
 * does. The boot call (service.ts) and the walls read THIS export —
 * the triple was hand-spelled in three places (the suite ghost-cited
 * a retired python file); a fourth spelling is the drift this
 * export kills. */
export declare const ENGINE_TRUTH: readonly string[];
/** Schemastery field schema (structural — no package dep). The
 *  union's alternatives live at .list (NODE level, not
 *  .meta.list) and each const carries .value. */
interface FieldSchema {
    readonly type: string;
    readonly meta?: {
        readonly min?: number;
        readonly max?: number;
    };
    readonly list?: readonly {
        readonly value?: unknown;
    }[];
}
/** Extract one card's domains from a schemastery object's .dict. */
export declare function fieldDomains(dict: Record<string, FieldSchema>): Map<string, FieldDomain>;
/**
 * Model defaults against the owning card's field domains:
 *
 * - a model whose `card` names NO known card REFUSES ("the
 *   migration amnesty is over; a dead card ref is drift, not a
 *   skip");
 * - card = "" skips (the card surface is still migrating);
 * - a default key in engineTruth skips (the ENGINE's compose
 *   consumes it as run truth — engine knowledge stays
 *   engine-owned, PLUGIN ARCHITECTURE LAW);
 * - a default naming no card field REFUSES;
 * - a numeric default outside [min, max] REFUSES;
 * - a string default missing the options enum REFUSES.
 *
 * Returns the checked (model, card) pairs for the caller's log.
 */
export declare function validateRegistryAgainstCards(decls: readonly ModelDecl[], cards: CardDomains, engineTruth?: readonly string[], 
/** THE CALLER OWNS THE EDGE: card id → the atoms it boards
 *  (CardDefinition.boarded — the only place the relation
 *  lives; the model declares NOTHING about its callers). */
boardings?: ReadonlyMap<string, readonly string[]>, 
/** The served address set (registry models + derived routes —
 *  a caller may board a route; the atom it resolves to is the
 *  check's subject). */
servedIds?: ReadonlySet<string>, 
/** Route id → its cascade-derived view (getModel over the served
 *  plane) — a boarded route validates against its resolved
 *  view; registry decls always win on id collision. */
routeViews?: ReadonlyMap<string, ModelDecl>, 
/** THE ADMISSION LAW (2026-09-22, the tagger weights rail): card
 *  id → the keys its def ADMITS (CardDefinition.admits —
 *  route-stamped by the variant rail, never rendered as form
 *  fields). A family default naming an admitted key is legal
 *  truth: the rail stamps it into the body, the compose door
 *  overlays it, the field need not exist on the surface. Without
 *  this the wd14 default 'checkpoint' refuses the boot against a
 *  card whose whole weights law is "no second picker". */
cardAdmits?: ReadonlyMap<string, readonly string[]>): Array<[string, string]>;
/** Reserved row coordinates — the write-plane keys that name ROW
 *  state, never action params: the route re-point (`model`), the
 *  variant pick (`variant`), the tts form selector (`voice`, the
 *  qvoice law), and the run mode (`mode`). Per-family resolution
 *  stays with the family's own surface: yue2's `mode` IS a param
 *  because yue2 declares it; a family that declares one of these
 *  names as a param row owns it and the row's own judge runs. */
export declare const RESERVED_ROW_COORDS: readonly string[];
/** Mod-plane keys — the mod marriage's own stamps (the realism
 *  rows' lora stacks), judged by the mod interlock, not by any
 *  action's param surface: a wire stamp of `loras` is the pack
 *  marriage the interlock owns (discovery serves it verbatim as
 *  the row's macro payload). */
export declare const MOD_PLANE_KEYS: readonly string[];
/** The minimum a declared action contributes to the door: its id
 *  and its ParamSpec rows (DeclaredAction erasure owns the full
 *  shape; this is the judge's own read). */
export interface DeclaredSurface {
    readonly id: string;
    readonly params: ReadonlyArray<{
        readonly name: string;
        readonly type: "number" | "string" | "boolean" | "enum" | "image_list";
        readonly bounds?: readonly [number, number];
        readonly options?: readonly string[];
    }>;
}
/** One write-plane row the door judges (where names the DECL site
 *  for the refusal text). */
export interface WriteRow {
    readonly where: string;
    readonly values: Record<string, unknown>;
}
/**
 * THE DECLARED-PLANE DOOR (the atom vocabulary's family door, the
 * stroke the write-plane sweep opened): every default, variant
 * preset, and resolver cell is judged against the union of the
 * family's declared action ParamSpec rows — the surface the
 * actions themselves declare, never the card's z-schema.
 *
 * - a reserved row coordinate skips (row state, not a param);
 * - a key no declared action offers REFUSES;
 * - a number outside declared bounds REFUSES;
 * - a string off a declared enum REFUSES;
 * - a value of the wrong declared type REFUSES.
 *
 * @param declId the family id, for the refusal texts
 * @param rows the write-plane rows (defaults, variants, cells)
 * @param actions the family's declared actions
 * @returns the checked (where, key) pairs for the caller's log
 */
export declare function validateWriteRowsAgainstActions(declId: string, rows: readonly WriteRow[], actions: readonly DeclaredSurface[]): string[];
export {};
