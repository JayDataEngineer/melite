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

import { ModelError, MODEL_REGISTRY } from "./models.ts";

/** One card field's domain — the projection the pure core sees. */
export interface FieldDomain {
  readonly min?: number;
  readonly max?: number;
  readonly options?: readonly string[];
}

/** card id → (field name → domain). */
export type CardDomains = ReadonlyMap<string, ReadonlyMap<string, FieldDomain>>;

/** Schemastery field schema (structural — no package dep). */
interface FieldSchema {
  readonly type: string;
  readonly meta?: {
    readonly min?: number;
    readonly max?: number;
    readonly list?: readonly { readonly meta?: { readonly const?: unknown } }[];
  };
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
    if (field.type === "union" && Array.isArray(field.meta?.list)) {
      const opts: string[] = [];
      for (const sub of field.meta?.list ?? []) {
        if (sub.meta?.const !== undefined) opts.push(String(sub.meta.const));
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
  cards: CardDomains,
  engineTruth: readonly string[] = [],
): Array<[string, string]> {
  const truth = new Set(engineTruth);
  const checked: Array<[string, string]> = [];
  const ids = Object.keys(MODEL_REGISTRY).sort();
  for (const mid of ids) {
    const decl = MODEL_REGISTRY[mid];
    if (decl === undefined) continue;
    // LAW 0: only comfyui families validate against the live card
    // plane — retired-engine rows are frozen data (engine-marked),
    // their card refs name the cards their OWN engine served
    // (music-native/auto-rig — deleted with the engine, not drift).
    if (decl.engine !== undefined && decl.engine !== "" && decl.engine !== "comfyui") continue;
    const cardId: string = decl.card ?? "";
    if (cardId !== "" && !cards.has(cardId)) {
      throw new ModelError(
        `model ${mid}: card='${cardId}' names no known card — the ` +
          `migration amnesty is over; a dead card ref is drift, not a skip`,
      );
    }
    if (cardId === "") continue;
    const domains = cards.get(cardId);
    if (domains === undefined) continue;
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
    checked.push([mid, cardId]);
  }
  return checked;
}
