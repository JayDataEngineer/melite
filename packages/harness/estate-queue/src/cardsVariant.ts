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
  /** THE RESOLVED CELL (the size-at-quant reshape, operator
   *  2026-10-26): the (variant × quant) cell the selection landed
   *  on — its ROUTE wins the compose address (the engine's own
   *  resolve() reads cell-before-variant; the estate's compose
   *  composes through the same cell), and its PARAMS add to the
   *  lane surface at the bench door. "" / undefined when the
   *  row's matrix carries no cells. */
  readonly cellRoute: string;
  readonly cellParams?: readonly string[];
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
    // THE ADDRESS CLAIMS THE VARIANT (operator 2026-10-12, the
    // offered-cells wall's first firing): a doc pinned to a route
    // that names a VARIANT-level lane ('krea-2-raw',
    // 'z-image-base-int8') must compose THAT lane, never pool[0]'s
    // silent neighbor. The address's cell claim below only searches
    // the chosen variant's cells — without this claim a
    // route-addressed draft landed pool[0] + cells[0] and composed
    // the wrong weights while every surface stayed green (variant
    // switching "not working" under an all-green suite).
    variant = pool.find((v) =>
      v.route === mid
      || (v.cells ?? []).some((c) => c.hide_from_dropdown !== true && c.route !== "" && c.route === mid)
    ) ?? pool[0];
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
  let cell: VariantCellRow | undefined;
  // THE LEGACY COORDINATE (the size-at-quant fold, operator
  // 2026-10-26): the dead single-size atoms shipped one cell named
  // 'native' — an old draft carries that coordinate against a
  // family whose cells now name SIZES. 'native' meant "the only
  // size this family ships", which the ADDRESS already says, so it
  // resolves as UNSTATED (the mid's cell claim picks the size —
  // never a silent neighbor cell, never a refusal on a draft the
  // fold promised to keep landing).
  const legacyNative: boolean = rawQuant === "native";
  if (rawQuant !== undefined && rawQuant !== null && !legacyNative) {
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
    cell = hit;
    quant = hit.quant;
  } else if (variant !== undefined) {
    const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
    // Unstated quant: the ADDRESS'S OWN CELL CLAIM wins (the
    // fold's coverage law — a draft pinned to 'qwen3-tts-base'
    // means the 0.6B clone; one pinned to 'qwen3-tts-voicedesign'
    // means the 1.7B persona), else the FIRST cell (Model.resolve's
    // family default — the large rung leads every ladder).
    cell = cells.find((c) => c.route !== "" && c.route === mid) ?? cells[0];
    if (cell !== undefined) quant = String(cell.quant ?? "");
  }
  return {
    variantId: variant !== undefined ? variant.id : "",
    variantRoute: variant !== undefined ? String(variant.route ?? "") : "",
    quant,
    cellRoute: cell !== undefined ? String(cell.route ?? "") : "",
    cellParams: cell?.params,
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

/** THE ONE-SWITCH LAW, BAG HALF — the variant voice for a carried
 *  mod row the arrival family does not serve. One shape with
 *  unknownQuantVoice (the shared lane voices): the stated row, the
 *  lane it landed on, the rows the lane serves; the tail names the
 *  law, not a silent fix. The client half of this law nulls the bag
 *  at the gesture (card-base spec.ts modelSwitchPatch's cross-model
 *  arm); this voice is the door's half for re-points no gesture
 *  covers. */
function unknownBagRowVoice(
  pack: string,
  id: string,
  fam: string,
  sel: VariantSelection,
  known: readonly string[],
): string {
  return "unknown " + pack + " row " + JSON.stringify(id) +
    " for model " + JSON.stringify(fam) +
    " variant " + JSON.stringify(sel.variantId) +
    (known.length > 0
      ? " (known: " + known.join(", ") + ")"
      : " (the family serves no rows)") +
    " — mods are per model: the bag was picked for another model's weights and refuses here rather than ride to the engine" +
    " (Read the family lane: melite_skill_read model:" + fam + ".)";
}

/** THE CROSS-MODEL CARRY JUDGE, BAG HALF (journey-closure §D3 — the
 *  axis-unification audit's estate-lane residue, 071f8c7a1's
 *  recorded finding): a doc whose model key was re-pointed without a
 *  gesture (the card's semantic-model knob, a tool face patch, an
 *  agent write, a stage copy) arrives here with bag values still
 *  stamped under the departed family. Every absorbed pack's array
 *  field the body carries is mod currency picked for SOME model's
 *  weights; each option-mode entry ({id,…}) must name a row of the
 *  arrival atom's OWN catalog, else it refuses loud — foreign values
 *  never reach the engine. Reads the arrival family's DIRECT catalog
 *  (modCatalog on the route→atom fold, the same fold the stamp
 *  surface scopes) — never the compose walk's boarded-family
 *  fallback (service.ts modCatalogForCompose), whose fallback serves
 *  another boarded family's rows when the arrival family serves
 *  none: exactly the cross-model absorption this judge refuses.
 *  Filename entries ({name,…}) ride untouched — the card-authoring
 *  lane, the service door's own boundary. @param bags the absorbed
 *  packs' array-typed field names, collected in the fold below;
 *  empty when the fold degraded (card defs not booted in this
 *  fiber) — the judge degrades with it, the pre-judge shape. */
function bagRefusal(
  body: Record<string, unknown>,
  bags: ReadonlyArray<{ readonly pack: string; readonly key: string }>,
  atom: string,
  sel: VariantSelection,
  phase: string,
  fam: string,
): void {
  for (const bag of bags) {
    const carried: unknown = body[bag.key];
    if (!Array.isArray(carried)) continue;
    const known: readonly string[] =
      theService().modCatalog(bag.pack, atom).rows.map((r) => r.id);
    for (const entry of carried) {
      if (entry === null || typeof entry !== "object") continue;
      const row = entry as { name?: unknown; id?: unknown };
      if (typeof row.name === "string" && row.name !== "") continue;
      if (typeof row.id !== "string" || row.id === "") continue;
      if (known.includes(row.id)) continue;
      throw phaseRefusal(phase, unknownBagRowVoice(bag.pack, row.id, fam, sel, known));
    }
  }
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
  // THE BAG FIELDS (the carry judge's walk, one fold two products):
  // each absorbed pack's array-typed field is mod currency (the bag
  // law) — collected beside the knob names so the judge reads the
  // SAME route→atom fold the stamp surface scopes.
  const bagFields: Array<{ readonly pack: string; readonly key: string }> = [];
  let envelopeAtom = "";
  try {
    // THE ROUTE→ATOM FOLD (same fold admissionRefusal judges): the
    // owning atom scopes the absorbed surface; a not-booted models
    // service degrades the whole fold to knobs+admits.
    envelopeAtom = owningAtom(fam);
    for (const a of theService().cardModFields(famRow.card)) {
      if (!a.families.includes(envelopeAtom)) continue;
      for (const [n, node] of Object.entries(a.fields.dict ?? {})) {
        modNames.add(n);
        if ((node as { type?: unknown } | undefined)?.type === "array") {
          bagFields.push({ pack: a.pack, key: n });
        }
      }
    }
  } catch (modFoldError) {
    // modFoldError: card defs not booted in this fiber — the stamp
    // gate degrades to knobs+admits, the pre-Y-S2 surface (and the
    // carry judge degrades with it: bagFields stays empty).
  }
  // THE CARRY JUDGE, BAG HALF — before the stamps walk and the
  // compose walk: the departure-blind door judges the carry against
  // the arrival family's own catalog (bagRefusal's contract).
  bagRefusal(body, bagFields, envelopeAtom, sel, phase, fam);
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
