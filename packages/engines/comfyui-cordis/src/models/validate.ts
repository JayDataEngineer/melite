// models/validate.ts — VALIDATE AGAINST CARDS, the killer feature,
// ported from melite_models/grammar.py @ git 034e1f97 (validate_
// against_cards, lines 1323-1375). Model defaults must live inside
// the OWNING card's field domains: a default naming neither a card
// field nor engine truth, an enum miss, or an out-of-range number
// REFUSES (loud, never a silent 400 at run time).
//
// SEAM (no cross-package dep): this module is the PURE core — it
// takes the card domain table as data. The card plane (comfyui-
// cordis loadCardDefs) supplies the table at the wall/boot seam;
// schemastery's schema.dict is the source ({name → field schema},
// meta.min/meta.max, union-of-consts = options).

import { ModelError, type ModelDecl } from "./families/contract.ts";

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
export const ENGINE_TRUTH: readonly string[] = ["mode", "variant", "model"];

/** Schemastery field schema (structural — no package dep). The
 *  union's alternatives live at .list (NODE level, not
 *  .meta.list) and each const carries .value. */
interface FieldSchema {
  readonly type: string;
  readonly meta?: { readonly min?: number; readonly max?: number };
  readonly list?: readonly { readonly value?: unknown }[];
}

/** Extract one card's domains from a schemastery object's .dict. */
export function fieldDomains(
  dict: Record<string, FieldSchema>,
): Map<string, FieldDomain> {
  const out = new Map<string, FieldDomain>();
  for (const [name, field] of Object.entries(dict)) {
    const domain: {
      min?: number;
      max?: number;
      options?: readonly string[];
    } = {};
    if (field.meta?.min !== undefined) domain.min = field.meta.min;
    if (field.meta?.max !== undefined) domain.max = field.meta.max;
    if (field.type === "union" && Array.isArray(field.list)) {
      const opts: string[] = [];
      for (const sub of field.list) {
        if (sub?.value !== undefined && sub.value !== null) opts.push(String(sub.value));
      }
      if (opts.length > 0) domain.options = opts;
    }
    out.set(name, domain);
  }
  return out;
}

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
export function validateRegistryAgainstCards(
  decls: readonly ModelDecl[],
  cards: CardDomains,
  engineTruth: readonly string[] = [],
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
  cardAdmits?: ReadonlyMap<string, readonly string[]>,
): Array<[string, string]> {
  const truth = new Set(engineTruth);
  const checked: Array<[string, string]> = [];
  const byId = new Map(decls.map((d): [string, ModelDecl] => [d.id, d]));
  if (routeViews !== undefined) {
    for (const [route, view] of routeViews) {
      if (!byId.has(route)) byId.set(route, view);
    }
  }
  // THE CARD SELECTS THE ATOMS — iterate the callers' boarded
  // lists; a caller naming no registered atom REFUSES (its
  // selection names real atoms or it is drift).
  if (boardings !== undefined) {
    for (const [cardId, boarded] of boardings) {
      for (const mid of boarded) {
        const known = byId.has(mid) || (servedIds !== undefined && servedIds.has(mid));
        if (!known) {
          throw new ModelError(
            `card '${cardId}' boards '${mid}' — no such model registered (the card selects atoms; a selection naming nothing is drift, not a skip)`,
          );
        }
      }
    }
  }
  if (boardings === undefined) return checked;
  for (const [cardId, boarded] of boardings) {
    const domains = cards.get(cardId);
    if (domains === undefined) continue;
    for (const mid of boarded) {
      const decl = byId.get(mid);
      // LAW 0: only comfyui families validate against the live
      // card plane — retired-engine rows are frozen data
      // (engine-marked), their boardings name the cards their OWN
      // engine served (deleted with the engine, not drift).
      if (decl === undefined) continue;
      if (decl.engine !== undefined && decl.engine !== "" && decl.engine !== "comfyui") continue;
      checked.push([mid, cardId]);
      const admitted = cardAdmits?.get(cardId);
      // AXIS PARAMS skip the card-domain gate (the estate contract
      // laws, 2026-10-10): a decl's variant_groups own durable
      // draft seats — axisKey law: the group id lowercased
      // ('Variant' → 'variant') — qwen3-tts's defaults.variant is
      // the documented VARIANT STAMP, contract vocabulary, not a
      // ghost field.
      const axisKeys = new Set((decl.variant_groups ?? []).map((g) => g.id.toLowerCase()));
      for (const [key, val] of Object.entries(decl.defaults ?? {})) {
        if (truth.has(key)) continue;
        if (admitted !== undefined && admitted.includes(key)) continue;
        if (axisKeys.has(key)) continue;
        const domain: FieldDomain | undefined = domains.get(key);
        if (domain === undefined) {
          throw new ModelError(
          `model ${mid}: default '${key}' names no field on card ${cardId}`,
        );
      }
      if (typeof val === "number" && !Number.isNaN(val)) {
        const lo = domain.min;
        const hi = domain.max;
        if ((lo !== undefined && val < lo) || (hi !== undefined && val > hi)) {
          throw new ModelError(
            `model ${mid}: default ${key}=${val} outside card ${cardId} ` +
              `field bounds [${lo}, ${hi}]`,
          );
        }
      }
      const opts = domain.options;
      if (opts !== undefined && typeof val === "string" && !opts.includes(val)) {
        throw new ModelError(
          `model ${mid}: default ${key}='${val}' not in card ${cardId} options`,
        );
      }
      }
    }
  }
  return checked;
}

/** Reserved row coordinates — the write-plane keys that name ROW
 *  state, never action params: the route re-point (`model`), the
 *  variant pick (`variant`), the tts form selector (`voice`, the
 *  qvoice law), and the run mode (`mode`). Per-family resolution
 *  stays with the family's own surface: yue2's `mode` IS a param
 *  because yue2 declares it; a family that declares one of these
 *  names as a param row owns it and the row's own judge runs. */
export const RESERVED_ROW_COORDS: readonly string[] = [...ENGINE_TRUTH, "voice"];

/** Mod-plane keys — the mod marriage's own stamps (the realism
 *  rows' lora stacks), judged by the mod interlock, not by any
 *  action's param surface: a wire stamp of `loras` is the pack
 *  marriage the interlock owns (discovery serves it verbatim as
 *  the row's macro payload). */
export const MOD_PLANE_KEYS: readonly string[] = ["loras"];

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
export function validateWriteRowsAgainstActions(
  declId: string,
  rows: readonly WriteRow[],
  actions: readonly DeclaredSurface[],
): string[] {
  const surface = new Map<string, DeclaredSurface["params"][number]>();
  for (const a of actions) {
    for (const p of a.params) {
      if (!surface.has(p.name)) surface.set(p.name, p);
    }
  }
  const checked: string[] = [];
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.values)) {
      if (RESERVED_ROW_COORDS.includes(key)) continue;
      if (MOD_PLANE_KEYS.includes(key)) continue;
      // NULL is the unset stamp (the voicedesign meld law): it
      // writes nothing, so there is no value to judge.
      if (value === null) continue;
      const spec = surface.get(key);
      if (spec === undefined) {
        throw new ModelError(
          `${declId} ${row.where}: '${key}' is refused — no declared action offers it ` +
            `(the declared-plane door: the write plane is the actions' own surface; ` +
            `add the param row or fix the row)`,
        );
      }
      if (spec.type === "number") {
        if (typeof value !== "number") {
          throw new ModelError(
            `${declId} ${row.where}: '${key}' declares number but carries ${typeof value}`,
          );
        }
        if (spec.bounds && (value < spec.bounds[0] || value > spec.bounds[1])) {
          throw new ModelError(
            `${declId} ${row.where}: '${key}' carries ${String(value)}, outside the declared bounds [${String(spec.bounds[0])}, ${String(spec.bounds[1])}]`,
          );
        }
      } else if (spec.type === "enum") {
        if (typeof value !== "string" || !(spec.options ?? []).includes(value)) {
          throw new ModelError(
            `${declId} ${row.where}: '${key}' carries '${String(value)}', off the declared options`,
          );
        }
      } else if (spec.type === "string" || spec.type === "image_list") {
        if (spec.type === "image_list" ? !Array.isArray(value) : typeof value !== "string") {
          throw new ModelError(
            `${declId} ${row.where}: '${key}' declares ${spec.type} but carries ${typeof value}`,
          );
        }
      } else if (typeof value !== "boolean") {
        throw new ModelError(
          `${declId} ${row.where}: '${key}' declares boolean but carries ${typeof value}`,
        );
      }
      checked.push(`${row.where}:${key}`);
    }
  }
  return checked;
}
