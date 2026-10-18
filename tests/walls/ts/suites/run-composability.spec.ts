// run-composability.spec.ts — THE RUN-SIDE COMPOSABILITY WALL + THE
// COMPOSE-EQUIVALENCE CORPUS (runs-bench-lane wave-2, §CURES-OWED 1+2).
//
// The lesion: the swap-composability cure (94aaa9b74) walled the
// STUDIO mirror only — its wall rides composeCandidateDoc +
// composeValidate (the client judge). The RUN side fed no residue
// body through prepareCardParams, and the door's UNSTATED base
// (famRow.defaults ∪ the variant's resolver_defaults) was
// envelope-judged nowhere. This wall is the run half:
//
//   1. STATED RESIDUE, refuse-loud-or-inside: per envelope family,
//      every sibling variant's landed stamps ride the REAL run seat
//      (prepareCardParams — one spelling with the run); the door
//      either refuses LOUD naming the knob (EnvelopeRefusal) or
//      composes params whose envelope-named numerics sit INSIDE the
//      arrival envelope. A silent ride (residue in, nothing judged)
//      is the red.
//
//   2. THE UNSTATED BASE: family defaults ∪ each variant's
//      resolver_defaults — the keys the door stamps when the body
//      stays silent — judged inside EVERY variant's declared
//      envelope. The roster derives off the booted facts; a
//      violation names family/variant/knob.
//
//   3. THE COMPOSE-EQUIVALENCE CORPUS: the same input judged by BOTH
//      faces — the client mirror (the pick chain's axisPickPatch
//      clamping held numerics into the arrival envelope, judged by
//      composeValidate — the real card-base laws, node-safe here
//      because spec.ts's React dep is type-only) and the door
//      (prepareCardParams) — must AGREE on identical inputs: the
//      mirror-admitted body composes clean at the door; a body the
//      mirror refuses refuses at the door; and when the door
//      composes, the composed params ride the arrival variant's
//      envelope exactly as the mirror's clamped doc carries them.
//      The mirror's two-base drift (stage.params vs stage.resolved
//      vs the door's facts base) dies as a class the hour the two
//      faces judge the same bytes and disagree on none.
//
// Run: npx vitest run tests/walls/ts/suites/run-composability.spec.ts
import { describe, expect, it, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CardRegistryService, CardArmError, type PreparedCard } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { EnvelopeRefusal } from "../../../../packages/harness/estate-queue/src/cardsArmError.ts";
import { judgeSamplerEnvelope } from "@melite/contracts/laneRelations";
import { loadCardDefs } from "@melite/comfyui-cordis";
import {
  axisPickPatch,
  composeCandidateDoc,
  composeValidate,
  type FormSpecDoc,
  type FormVariantRow,
  type SpecValues,
} from "../../../../packages/web/card-base/src/spec.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";

let svc: CardRegistryService;
let facts: Record<string, ModelFactsRow>;

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "run-composability-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  await loadCardDefs();
  facts = svc.modelFacts() as Record<string, ModelFactsRow>;
}, 90_000);

/** The envelope families: >=2 offered Variant-group rows that declare
 *  a sampler envelope. Derived off the booted facts — never a hand
 *  list. */
function envelopeFamilies(): { fam: string; row: ModelFactsRow }[] {
  const out: { fam: string; row: ModelFactsRow }[] = [];
  for (const [fam, row] of Object.entries(facts)) {
    const variants = (row.variants ?? []).filter((v) =>
      v.group === "Variant" && v.hide_from_dropdown !== true
      && v.sampler_envelope !== undefined && v.sampler_envelope !== null);
    if (variants.length >= 2) out.push({ fam, row });
  }
  return out;
}

function variantRows(row: ModelFactsRow) {
  return (row.variants ?? []).filter((v) =>
    v.group === "Variant" && v.hide_from_dropdown !== true
    && v.sampler_envelope !== undefined && v.sampler_envelope !== null);
}

/** The variant's numeric stamps (the residue a landed pick leaves in
 *  the doc) — the switching-sweep's numericStamps idiom, estate-side. */
function numericStamps(values: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** The mirror's spec, derived from the SAME facts rows the door
 *  reads: the variants carry their stamps (family defaults under
 *  resolver defaults) and their declared envelopes. This is the
 *  FormSpecDoc shape the client judges (composeValidate,
 *  offeredVariantOf) and the pick chain (axisPickPatch) walk. */
function mirrorSpec(row: ModelFactsRow): FormSpecDoc {
  const variants = (row.variants ?? []).map((v): FormVariantRow => ({
    id: v.id,
    group: v.group,
    route: v.route,
    defaults: { ...row.defaults, ...v.resolver_defaults },
    ...(v.sampler_envelope !== undefined && v.sampler_envelope !== null
      ? { sampler_envelope: v.sampler_envelope as FormVariantRow["sampler_envelope"] }
      : {}),
  }));
  return { variants } as unknown as FormSpecDoc;
}

/** The mirror's Variant row for an id — the shape the real pick seat
 *  receives (the served row carries its declared defaults; the raw
 *  facts row does not, and handing the pick chain one of those is a
 *  harness lie, not a client face). */
function mirrorVariantRow(spec: FormSpecDoc, id: string): FormVariantRow {
  const row = (spec.variants ?? []).find((r) => r.id === id && r.group === "Variant");
  if (row === undefined) throw new Error(`no Variant row for ${id}`);
  return row;
}

describe("THE RUN-SIDE COMPOSABILITY WALL (the cure's own lane)", () => {
  it("stated residue rides the REAL run seat: refuse loud naming the knob, or compose inside the arrival envelope", () => {
    const failures: string[] = [];
    let cells = 0;
    for (const { fam, row } of envelopeFamilies()) {
      const variants = variantRows(row);
      for (const from of variants) {
        const residue = numericStamps({ ...row.defaults, ...from.resolver_defaults });
        for (const to of variants) {
          if (to.id === from.id) continue;
          cells += 1;
          const body: Record<string, unknown> = { model: fam, variant: to.id, ...residue };
          let composed: Record<string, unknown> | null = null;
          let refused: string | null = null;
          try {
            composed = prepareCardParams(svc, body, fam, "wall-residue").params as Record<string, unknown>;
          } catch (err) {
            if (err instanceof EnvelopeRefusal) refused = err.message;
            else if (err instanceof CardArmError) refused = err.message;
            else throw err;
          }
          if (refused !== null) {
            // refuse LOUD: the voice names the door's own law
            if (!/envelope|outside|within/i.test(refused)) {
              failures.push(`${fam} ${from.id}->${to.id}: refused in the wrong voice: ${refused}`);
            }
            continue;
          }
          // composed: every envelope-named numeric sits INSIDE
          const env = to.sampler_envelope as Record<string, unknown> | null;
          if (env === null || env === undefined) continue;
          for (const [knob, range] of Object.entries(env)) {
            if (!Array.isArray(range) || range.length !== 2) continue;
            const [lo, hi] = range as [unknown, unknown];
            if (typeof lo !== "number" || typeof hi !== "number") continue;
            const v = composed![knob];
            if (typeof v !== "number") continue;
            if (v < lo || v > hi) {
              failures.push(`${fam} ${from.id}->${to.id}: residue rode SILENT — ${knob}=${v} composed outside the declared envelope [${lo}, ${hi}]`);
            }
          }
        }
      }
    }
    expect(cells, "no envelope pair cells — the wall went vacuous").toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it("THE UNSTATED BASE: family defaults ∪ resolver_defaults sit inside EVERY variant's declared envelope", () => {
    const failures: string[] = [];
    let judged = 0;
    for (const { fam, row } of envelopeFamilies()) {
      for (const v of variantRows(row)) {
        const stamps = { ...row.defaults, ...v.resolver_defaults };
        const off = judgeSamplerEnvelope(stamps, v.sampler_envelope, { id: v.id, route: v.route });
        judged += 1;
        if (off !== null) {
          failures.push(`${fam} variant ${v.id}: the UNSTATED base rides ${off.knob}=${String((stamps as Record<string, unknown>)[off.knob])} outside its own declared envelope — the door stamps it unjudged (silent)`);
        }
      }
    }
    expect(judged, "no variant envelope judged — the wall went vacuous").toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});

describe("THE COMPOSE-EQUIVALENCE CORPUS (the mirror and the door agree on identical inputs)", () => {
  it("per envelope family, every sibling pick: the mirror's verdict == the door's verdict on the same landed doc", () => {
    const disagreements: string[] = [];
    let cells = 0;
    for (const { fam, row } of envelopeFamilies()) {
      const spec = mirrorSpec(row);
      const variants = variantRows(row);
      for (const from of variants) {
        const base: SpecValues = { variant: from.id, ...numericStamps({ ...row.defaults, ...from.resolver_defaults }) } as SpecValues;
        for (const to of variants) {
          if (to.id === from.id) continue;
          cells += 1;
          // THE STUDIO FACE: the pick patches with the SHOWN doc as
          // held (the pickHeld law), lands, and the mirror judges
          // the composed doc.
          const patch = axisPickPatch(spec, mirrorVariantRow(spec, to.id), { ...base });
          const doc = composeCandidateDoc(base, {}, patch as Record<string, unknown>);
          const violations = composeValidate(spec, doc);
          // THE DOOR FACE: the same landed state rides the run seat.
          const body: Record<string, unknown> = { model: fam, variant: to.id };
          for (const [k, v] of Object.entries(doc)) {
            if (k === "variant" || k === "model") continue;
            if (v === null || v === undefined) continue;
            body[k] = v;
          }
          let doorRefused: string | null = null;
          try {
            prepareCardParams(svc, body, fam, "wall-corpus");
          } catch (err) {
            if (err instanceof EnvelopeRefusal || err instanceof CardArmError) doorRefused = err.message;
            else throw err;
          }
          if (violations.length > 0 && doorRefused === null) {
            disagreements.push(`${fam} ${from.id}->${to.id}: the mirror refuses (${violations[0]!.message}) but the door composed — the run would take what the studio showed refused`);
          }
          if (violations.length === 0 && doorRefused !== null) {
            disagreements.push(`${fam} ${from.id}->${to.id}: the mirror admits the doc but the door refuses: ${doorRefused}`);
          }
        }
      }
    }
    expect(cells, "no corpus cells — the wall went vacuous").toBeGreaterThan(0);
    expect(disagreements).toEqual([]);
  });
});

describe("THE SWITCH-SEED LAW (follow-up (1), 2026-11-07: a switch seeds the TARGET's declared steps/cfg)", () => {
  it("per envelope family, every sibling pick: the landed doc and the run's composed params carry the target variant's declared face, never the departed variant's ride", () => {
    // The burn (operator, follow-up (1)): a stage switched from a
    // turbo lane kept the turbo-era steps/cfg — the base variant
    // rendered at the distill's depth. The cure is the pick chain's
    // declared-stamps overlay (spec.ts axisPickPatch) over the
    // required-defaults DECL faces (64b619f23); this arm binds BOTH
    // planes to the target face: the client's landed doc (the mirror)
    // and the run's composed params (the door, prepareCardParams).
    // The law binds only DECLARED knobs — a variant that declares no
    // steps owes no seed.
    const failures: string[] = [];
    let cells = 0;
    for (const { fam, row } of envelopeFamilies()) {
      const spec = mirrorSpec(row);
      const variants = variantRows(row);
      for (const from of variants) {
        const base: SpecValues = { variant: from.id, ...numericStamps({ ...row.defaults, ...from.resolver_defaults }) } as SpecValues;
        for (const to of variants) {
          if (to.id === from.id) continue;
          const toFace = numericStamps({ ...row.defaults, ...to.resolver_defaults });
          // THE MIRROR FACE: the pick patches with the SHOWN doc as
          // held (the pickHeld law) — the same call the drill's
          // Variant select makes, on the served row's shape.
          const patch = axisPickPatch(spec, mirrorVariantRow(spec, to.id), { ...base });
          const doc = composeCandidateDoc(base, {}, patch as Record<string, unknown>);
          // THE DOOR FACE: the landed state rides the real run seat.
          const body: Record<string, unknown> = { model: fam, variant: to.id };
          for (const [k, v] of Object.entries(doc)) {
            if (k === "variant" || k === "model") continue;
            if (v === null || v === undefined) continue;
            body[k] = v;
          }
          let prepared: PreparedCard | null = null;
          try {
            prepared = prepareCardParams(svc, body, fam, "wall-switch-seed");
          } catch (err) {
            if (!(err instanceof EnvelopeRefusal || err instanceof CardArmError)) throw err;
            // the door's refusal is its own honest voice (the corpus
            // judges the agreement); the seed law binds the mirror here
          }
          for (const key of ["steps", "cfg"] as const) {
            if (typeof toFace[key] !== "number") continue;
            cells += 1;
            if (doc[key] !== toFace[key]) {
              failures.push(`${fam} ${from.id}->${to.id}: the landed doc carries ${key}=${JSON.stringify(doc[key])}, the target declares ${String(toFace[key])} — the pick rides the departed face instead of seeding`);
            }
            if (prepared !== null && prepared.params[key] !== toFace[key]) {
              failures.push(`${fam} ${from.id}->${to.id}: the run's composed params carry ${key}=${JSON.stringify(prepared.params[key])}, the target declares ${String(toFace[key])} — the door rides instead of seeding`);
            }
          }
        }
      }
    }
    expect(cells, "no switch cells — the wall went vacuous").toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
