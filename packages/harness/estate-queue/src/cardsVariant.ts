// cardsVariant.ts — R1 variant/quant selection + the route-lens
// overlay + params lift. Extracted from cardsRegistry: the pure
// coordinate math of {model:} resolution.
import type { CardDeclRow, ModelFactsRow, VariantCellRow, ResolvedVariantRow } from "./cardsFacts.ts";
import { samplerEnvelopeCure } from "@melite/contracts/laneRelations";
import { EnvelopeRefusal, phaseRefusal } from "./cardsArmError.ts";
import { judgeSamplerEnvelope, unknownQuantVoice, unknownVariantVoice } from "@melite/contracts/laneRelations";
import { CARD_ENVELOPE_KEYS } from "./cardsRegistry.ts";
import { cardAdmits } from "./cardsFacts.ts";
import { theService, owningAtom } from "@melite/comfyui-cordis";

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
  const variants: ResolvedVariantRow[] = famRow.variants ?? [];
  const offered: ResolvedVariantRow[] = variants.filter((v) => v.hide_from_dropdown !== true);
  const hiddenRoute = variants.find((v) => v.hide_from_dropdown === true && (
    v.route === mid || v.id === mid || (v.cells ?? []).some((c) => c.route === mid)
  ));
  const hiddenCellRoute = variants.some((v) => (v.cells ?? []).some((c) =>
    c.hide_from_dropdown === true && c.route === mid
  ));
  if (hiddenRoute !== undefined || hiddenCellRoute) {
    throw phaseRefusal(
      phase,
      "model " + JSON.stringify(mid) +
        " is not offered (the variant route is hidden from the dropdown)",
    );
  }
  const configured: ResolvedVariantRow[] = offered.filter((v) => v.group !== "Recipe");
  const pool: ResolvedVariantRow[] = configured.length > 0 ? configured : offered;
  if (pool.length === 0 && variants.length > 0) {
    throw phaseRefusal(phase, "model " + JSON.stringify(mid) + " has no offered variants");
  }
  const rawVariant: unknown = body["variant"];
  const rawQuant: unknown = body["quant"];
  let variant: ResolvedVariantRow | undefined;
  if (rawVariant === undefined || rawVariant === null) {
    variant = pool[0];
  } else {
    if (typeof rawVariant !== "string") {
      throw phaseRefusal(
        phase,
        "variant must be a string (got " +
          (Array.isArray(rawVariant) ? "list" : typeof rawVariant) + ")",
      );
    }
    const requested = variants.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (requested?.hide_from_dropdown === true) {
      throw phaseRefusal(
        phase,
        "variant " + JSON.stringify(rawVariant) +
          " is not offered for model " + JSON.stringify(mid),
      );
    }
    variant = offered.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (variant === undefined) {
      throw phaseRefusal(phase, unknownVariantVoice(rawVariant, mid, knownVariantIds(famRow)));
    }
  }
  let quant = "";
  if (rawQuant !== undefined && rawQuant !== null) {
    if (typeof rawQuant !== "string") {
      throw phaseRefusal(
        phase,
        "quant must be a string (got " +
          (Array.isArray(rawQuant) ? "list" : typeof rawQuant) + ")",
      );
    }
    const cells: VariantCellRow[] = variant !== undefined
      ? (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true)
      : [];
    const hit: VariantCellRow | undefined = cells.find((c) => c.quant === rawQuant);
    if (hit === undefined) {
      throw phaseRefusal(
        phase,
        unknownQuantVoice(rawQuant, mid, variant !== undefined ? variant.id : "", cells.map((c) => c.quant)),
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
function envelopeRefusal(
  body: Record<string, unknown>,
  sel: VariantSelection,
  phase: string,
): void {
  // THE ONE JUDGE (the voice audit, 2026-10-11): the body composes
  // in @melite/contracts beside the lane judges; the door adds what
  // its seat knows — the phase-consistent frame, the marriage
  // clause, the lane-read tail.
  const off = judgeSamplerEnvelope(body, sel.samplerEnvelope, {
    id: sel.variantId,
    route: sel.variantRoute,
  });
  if (off === null) return;
  const married = sel.resolverDefaults[off.knob] ?? "";
  throw new EnvelopeRefusal(
    400,
    "card_compose phase " + phase + ": " + off.voice +
      (married !== "" ? " and the lane is married to " + off.knob + " " + String(married) : "") +
      ". " + samplerEnvelopeCure() +
      " (Read the family lane: melite_skill_read model:<family>.)",
    "card_compose",
  );
}

export function stampCardOverlay(
  body: Record<string, unknown>,
  famRow: ModelFactsRow,
  decl: CardDeclRow,
  sel: VariantSelection,
  phase: string,
  fam: string,
): Record<string, unknown> {
  envelopeRefusal(body, sel, phase);
  const stamps: Record<string, unknown> = { ...(famRow.defaults ?? {}) };
  for (const [k, v] of Object.entries(sel.resolverDefaults)) stamps[k] = v;
  // THE SHARED SURFACE (audit Y-S2, the third admission seat): the
  // stamp gate judged knobs+admits by hand and omitted the absorbed
  // mod fields — a mod-surfaced default failed to stamp (fail-closed,
  // no live key) while both other seats admitted it. One predicate,
  // three seats; the atom rides in (owningAtom(fam), the same fold
  // admissionRefusal judges).
  const modNames = new Set<string>();
  try {
    // THE ROUTE→ATOM FOLD (same fold admissionRefusal judges): the
    // owning atom scopes the absorbed surface; a not-booted models
    // service degrades the whole fold to knobs+admits.
    const envelopeAtom: string = owningAtom(fam);
    for (const a of theService().cardModFields(famRow.card)) {
      if (!a.families.includes(envelopeAtom)) continue;
      for (const n of Object.keys(a.fields.dict ?? {})) modNames.add(n);
    }
  } catch (modFoldError) {
    // modFoldError: card defs not booted in this fiber — the stamp
    // gate degrades to knobs+admits, the pre-Y-S2 surface.
  }
  const onSurface = (k: string): boolean => cardAdmits(decl, modNames, k);
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
        // ABSENT-KEYS-ONLY LAW (audit 2026-10-22): an explicit
        // undefined reads as absent, matching what JSON persistence
        // would hand the row.
        if (!(ik in params) && iv !== undefined) params[ik] = iv;
      }
      continue;
    }
    if (v === undefined) continue;
    params[k] = v;
  }
  return params;
}
