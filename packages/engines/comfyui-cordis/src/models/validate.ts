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
 * Model defaults against the owning card's field domains — the
 * python semantics verbatim (grammar 1323-1375):
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
      for (const [key, val] of Object.entries(decl.defaults ?? {})) {
        if (truth.has(key)) continue;
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
