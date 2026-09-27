// cardsVariant.ts — R1 variant/quant selection + the route-lens
// overlay + params lift. Extracted from cardsRegistry: the pure
// coordinate math of {model:} resolution.
import type { CardDeclRow, ModelFactsRow, VariantCellRow, VariantRow } from "./cardsFacts.ts";
import { CardArmError } from "./cardsArmError.ts";
import { CARD_ENVELOPE_KEYS } from "./cardsRegistry.ts";

// ── R1 variant/quant selection + route-lens stamp overlay ──────────

/** One closed [min, max] bound on a stated sampler knob. */
export type EnvelopeBound = readonly [number, number];

export interface VariantSelection {
  readonly variantId: string;
  readonly variantRoute: string;
  readonly quant: string;
  readonly resolverDefaults: Record<string, unknown>;
  /** THE ROUTE ENVELOPE (the 25-steps-into-turbo cure): when the
   *  selected variant declares one, a caller-STATED steps/cfg
   *  outside its closed bounds refuses at the stamp gate — the
   *  distilled lane's marriage is not agency territory. */
  readonly samplerEnvelope: Readonly<Record<"steps" | "cfg", EnvelopeBound | undefined>> | null;
}

/** Normalize a facts variant's sampler_envelope declaration (the
 *  DECL authors it as {steps?: [min,max], cfg?: [min,max]}); junk
 *  shapes contribute nothing (never a crash). */
function normalizeEnvelope(
  raw: unknown,
): VariantSelection["samplerEnvelope"] {
  if (raw === null || typeof raw !== "object") return null;
  const r = raw as { steps?: unknown; cfg?: unknown };
  const bound = (v: unknown): EnvelopeBound | undefined => {
    if (!Array.isArray(v) || v.length !== 2) return undefined;
    const [a, b] = v as unknown[];
    return typeof a === "number" && typeof b === "number" && b >= a ? [a, b] : undefined;
  };
  const steps = bound(r.steps);
  const cfg = bound(r.cfg);
  return steps === undefined && cfg === undefined ? null : { steps, cfg };
}

function knownVariantIds(row: ModelFactsRow): string[] {
  return (row.variants ?? []).map((v) => v.id);
}

/** Select the matrix cell (R1 wire contract): explicit body
 *  variant/quant keys win when stated (matched against facts
 *  variant id/route + cell quant); unstated coordinates fall to
 *  the FIRST non-Recipe variant / first cell (Model.resolve —
 *  the family default). Unknown coordinates refuse LOUD (never a
 *  silent neighbor cell). */
export function selectCardVariant(
  mid: string,
  famRow: ModelFactsRow,
  body: Record<string, unknown>,
  phase: string,
): VariantSelection {
  const variants: VariantRow[] = famRow.variants ?? [];
  const offered: VariantRow[] = variants.filter((v) => v.hide_from_dropdown !== true);
  const hiddenRoute = variants.find((v) => v.hide_from_dropdown === true && (
    v.route === mid || v.id === mid || (v.cells ?? []).some((c) => c.route === mid)
  ));
  const hiddenCellRoute = variants.some((v) => (v.cells ?? []).some((c) =>
    c.hide_from_dropdown === true && c.route === mid
  ));
  if (hiddenRoute !== undefined || hiddenCellRoute) {
    throw new CardArmError(
      400,
      "card_compose phase " + phase + ": model " + JSON.stringify(mid) +
        " is not offered (the variant route is hidden from the dropdown)",
      "card_compose",
    );
  }
  const configured: VariantRow[] = offered.filter((v) => v.group !== "Recipe");
  const pool: VariantRow[] = configured.length > 0 ? configured : offered;
  if (pool.length === 0 && variants.length > 0) {
    throw new CardArmError(
      400,
      "card_compose phase " + phase + ": model " + JSON.stringify(mid) +
        " has no offered variants",
      "card_compose",
    );
  }
  const rawVariant: unknown = body["variant"];
  const rawQuant: unknown = body["quant"];
  let variant: VariantRow | undefined;
  if (rawVariant === undefined || rawVariant === null) {
    variant = pool[0];
  } else {
    if (typeof rawVariant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": variant must be a string (got " +
          (Array.isArray(rawVariant) ? "list" : typeof rawVariant) + ")",
        "card_compose",
      );
    }
    const requested = variants.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (requested?.hide_from_dropdown === true) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": variant " + JSON.stringify(rawVariant) +
          " is not offered for model " + JSON.stringify(mid),
        "card_compose",
      );
    }
    variant = offered.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (variant === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown variant " + JSON.stringify(rawVariant) +
          " for model " + JSON.stringify(mid) + " (known: " + knownVariantIds(famRow).join(", ") + ")",
        "card_compose",
      );
    }
  }
  let quant = "";
  if (rawQuant !== undefined && rawQuant !== null) {
    if (typeof rawQuant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": quant must be a string (got " +
          (Array.isArray(rawQuant) ? "list" : typeof rawQuant) + ")",
        "card_compose",
      );
    }
    const cells: VariantCellRow[] = variant !== undefined
      ? (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true)
      : [];
    const hit: VariantCellRow | undefined = cells.find((c) => c.quant === rawQuant);
    if (hit === undefined) {
      const known: string = cells.map((c) => c.quant).join(", ");
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown quant " + JSON.stringify(rawQuant) +
          " for model " + JSON.stringify(mid) + " variant " +
          JSON.stringify(variant !== undefined ? variant.id : "") +
          (known !== "" ? " (known: " + known + ")" : " (the variant declares no cells)"),
        "card_compose",
      );
    }
    quant = hit.quant;
  } else if (variant !== undefined) {
    const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
    if (cells.length > 0) quant = String(cells[0]?.quant ?? "");
  }
  return {
    variantId: variant !== undefined ? variant.id : "",
    variantRoute: variant !== undefined ? String(variant.route ?? "") : "",
    quant,
    resolverDefaults: variant !== undefined ? { ...(variant.resolver_defaults ?? {}) } : {},
    samplerEnvelope: variant !== undefined
      ? normalizeEnvelope((variant as { sampler_envelope?: unknown }).sampler_envelope)
      : null,
  };
}

/** The route-lens stamp overlay (_route_stamp_overlay 705-751):
 *  family defaults + the selected variant's resolver_defaults,
 *  injected ONLY for absent keys, filtered to the owning card's
 *  field surface (schema keys + admits, exact or trailing-*
 *  prefix). None/"" stamps never ride (UNSET markers — riding
 *  them would refuse the str fields the row leaves open).
 *  variant/quant contract keys are CONSUMED (never ride compose —
 *  no card declares them). Returns the STAMPED body (a copy). */
/** THE ROUTE ENVELOPE gate (the skill-system rework wave 2,
 *  2026-09-21): a caller-STATED steps/cfg outside the selected
 *  variant's closed envelope refuses LOUD at the stamp gate — the
 *  distilled-lane marriage (turbo's 8-step/cfg-1) is declared, not
 *  negotiated. Inside the envelope is caller agency; an unstated
 *  knob never refuses (the rail's stamps own it); a variant with no
 *  envelope declares nothing (opt-in per route). */
export function envelopeRefusal(
  body: Record<string, unknown>,
  _decl: CardDeclRow,
  sel: VariantSelection,
): void {
  if (sel.samplerEnvelope === null) return;
  for (const knob of ["steps", "cfg"] as const) {
    const bound = sel.samplerEnvelope[knob];
    if (bound === undefined) continue;
    const stated = body[knob];
    if (typeof stated !== "number" || !Number.isFinite(stated)) continue;
    const [lo, hi] = bound;
    if (stated >= lo && stated <= hi) continue;
    const married = sel.resolverDefaults[knob] ?? "";
    throw new CardArmError(
      400,
      "card_compose: stated " + knob + " " + String(stated) +
        " is OUTSIDE the route envelope for variant \"" + sel.variantId + "\"" +
        (sel.variantRoute !== "" ? " (route " + sel.variantRoute + ")" : "") +
        " — the declared envelope is [" + String(lo) + ", " + String(hi) + "]" +
        (married !== "" ? " and the lane is married to " + knob + " " + String(married) : "") +
        ". The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route." +
        " (Read the family lane: melite_skill_read model:<family>.)",
      "card_compose",
    );
  }
}

export function stampCardOverlay(
  body: Record<string, unknown>,
  famRow: ModelFactsRow,
  decl: CardDeclRow,
  sel: VariantSelection,
): Record<string, unknown> {
  envelopeRefusal(body, decl, sel);
  const stamps: Record<string, unknown> = { ...(famRow.defaults ?? {}) };
  for (const [k, v] of Object.entries(sel.resolverDefaults)) stamps[k] = v;
  const names: Set<string> = new Set(decl.schemaNames);
  const admits: readonly string[] = decl.admits;
  const onSurface = (k: string): boolean => {
    if (names.has(k)) return true;
    return admits.some((a) => a === k || (a.endsWith("*") && k.startsWith(a.slice(0, -1))));
  };
  const out: Record<string, unknown> = { ...body };
  for (const [k, v] of Object.entries(stamps)) {
    if (v === null || v === undefined || v === "") continue;
    if (!onSurface(k)) continue;
    if (k in out) continue;
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export function liftCardParams(body: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    if (k === "variant" || k === "quant") continue;
    // THE STAZZA UNWRAP, ONE SPELLING (2026-10-10, the audit's
    // BROKEN-B follow-on): the run body's `params` dict IS the stanza
    // (liftStanza merges it over its siblings at compose), so the
    // lane's view must unwrap it the same way — it did not, and a
    // `{model, params:{…}}` body reached the undeclared-key gate
    // still carrying a `params` key. Two lifts of one shape is how
    // the bench and the compose disagreed about what a card sees.
    if (k === "params" && typeof v === "object" && v !== null && !Array.isArray(v)) {
      // SIBLINGS WIN — the stanza fills what they leave out
      // (2026-10-10, the work audit's R3: this unwrap wrote the stanza
      // LAST, so `{text: "sibling", params: {text: "inner"}}` resolved
      // by key ORDER — the inner text won on one lift and the sibling
      // on the other. liftStanza is explicit that siblings override the
      // stanza; the "ONE SPELLING" claim is only true once this
      // matches it.)
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (!(ik in params)) params[ik] = iv;
      }
      continue;
    }
    params[k] = v;
  }
  return params;
}
