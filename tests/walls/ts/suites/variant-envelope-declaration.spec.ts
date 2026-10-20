// variant-envelope-declaration.spec.ts — THE ENVELOPE DECLARATION LAW
// (the E2-8 cure, operator 2026-11-08: "ANIMA GENEATIONS LOOK COMPELTLEY
// OFF, LIKE IT'S A BAD TEXT ENCODER, OR FUCKING SOMETHING" —
// dev_docs/ERRORS_2.md E2-8).
//
// The burn: anima renders came back washed and prompt-deaf. The text
// encoder chain was exonerated (the served TE/VAE/clip_type match the
// official template byte for byte, and the default lane renders good
// frames on the live engine). The crime was the sampler marriage: the
// operator's runs carried turbo-era numbers (8 steps at CFG 1) on the
// BASE checkpoint — a lane its own rows call 52 steps at CFG 4 — and
// nothing refused, because anima was the one split-numbers family that
// shipped no sampler envelopes (krea-2 declared them 2026-09-21, the
// 25-steps-into-turbo cure; flux-klein and moss followed; anima, z-image
// and the qwen image families never did).
//
// The law, stated once: a family whose Variant lanes carry DIFFERENT
// numeric marriages is a split-numbers family, and every one of its
// lanes DECLARES its sampler envelope — the domain its own resolver
// defaults live in — so a cross-lane hand-stamp refuses LOUD at compose
// instead of rendering garbage. Bounds are the lane's own truth: the
// family's resolver defaults, its Recipe stamps, and its upstream
// prescriptions sit INSIDE; the neighboring lane's numbers sit OUT.
//
// Depth: real booted facts (every registered family), real DECL rows on
// the door arms — never a hand-frozen fixture.
import { describe, expect, it, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import {
  selectCardVariant,
  stampCardOverlay,
} from "../../../../packages/harness/estate-queue/src/cardsVariant.ts";
import { EnvelopeRefusal } from "../../../../packages/harness/estate-queue/src/cardsArmError.ts";
import type { ModelFactsRow, CardDeclRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import { DECL as anima } from "../../../../packages/models/anima/src/index.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";

let svc: CardRegistryService;
let facts: Record<string, ModelFactsRow>;

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "envelope-declaration-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  await loadCardDefs();
  facts = svc.modelFacts() as Record<string, ModelFactsRow>;
}, 90_000);

/** The lane's numeric marriage off its own row (numbers only). */
function stamps(v: { resolver_defaults?: Record<string, unknown> }): { steps?: number; cfg?: number } {
  const out: { steps?: number; cfg?: number } = {};
  for (const k of ["steps", "cfg"] as const) {
    const v2 = v.resolver_defaults?.[k];
    if (typeof v2 === "number" && Number.isFinite(v2)) out[k] = v2;
  }
  return out;
}

/** The offered Variant lanes (the pick surface; hidden route rows and
 *  Recipe pills are not a sampler domain of their own). */
function offeredLanes(row: ModelFactsRow) {
  return (row.variants ?? []).filter((v) =>
    v.group === "Variant" && v.hide_from_dropdown !== true);
}

/** The OWED debts (CONTRACTS §4, entry 18): split-numbers families
 *  whose envelopes are a tracked debt, not an exemption. Each names its
 *  debt so draining it edits both seats together; a family not listed
 *  and not declaring REFUSES this wall. */
const OWED_ENVELOPE_DECLARATION: Record<string, string> = {
  "z-image": "envelope-decl-z-image",
  "qwen-img-21": "envelope-decl-qwen-img-21",
  "qwen-img-edit-21": "envelope-decl-qwen-img-edit-21",
  "qwen-img-edit-2511": "envelope-decl-qwen-img-edit-2511",
};

describe("THE ENVELOPE DECLARATION LAW (split-numbers lanes declare their sampler domain)", () => {
  it("every split-numbers family declares envelopes on ALL its offered lanes (derived census)", () => {
    const failures: string[] = [];
    for (const [fam, row] of Object.entries(facts)) {
      const lanes = offeredLanes(row).map((v) => ({ v, s: stamps(v) }));
      const numeric = lanes.filter((l) => l.s.steps !== undefined && l.s.cfg !== undefined);
      if (numeric.length < 2) continue; // not a split-numbers family
      const distinct = new Set(numeric.map((l) => `${l.s.steps}/${l.s.cfg}`));
      if (distinct.size < 2) continue; // one shared marriage — no cross-lane crime exists
      if (OWED_ENVELOPE_DECLARATION[fam] !== undefined) continue; // tracked §4 debt, not silent
      for (const l of numeric) {
        const env = (l.v as { sampler_envelope?: unknown }).sampler_envelope;
        if (env === undefined || env === null) {
          failures.push(`${fam} lane ${JSON.stringify(l.v.id)} stamps ${l.s.steps}/${l.s.cfg}` +
            ` beside a different sibling marriage and declares NO sampler_envelope —` +
            ` the E2-8 crime shape (turbo numbers on the base lane refused nothing)`);
          continue;
        }
        for (const k of ["steps", "cfg"] as const) {
          const bound = (env as Record<string, unknown>)[k];
          if (bound === undefined) continue;
          if (!Array.isArray(bound) || bound.length !== 2 ||
            typeof bound[0] !== "number" || typeof bound[1] !== "number" ||
            !(bound[0] <= bound[1])) {
            failures.push(`${fam} lane ${JSON.stringify(l.v.id)} envelope ${k} is not a [lo, hi] pair: ${JSON.stringify(bound)}`);
            continue;
          }
          const own = l.s[k];
          if (own !== undefined && (own < bound[0] || own > bound[1])) {
            failures.push(`${fam} lane ${JSON.stringify(l.v.id)} stamps ${k} ${own} OUTSIDE its own envelope [${bound[0]}, ${bound[1]}]`);
          }
        }
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("anima rides the law as an ENVELOPE family (the walk seat picks it up)", () => {
    const lanes = offeredLanes(facts["anima"]).filter((v) => stamps(v).steps !== undefined);
    expect(lanes.length).toBeGreaterThanOrEqual(3);
    for (const v of lanes) {
      expect((v as { sampler_envelope?: unknown }).sampler_envelope,
        `anima lane ${v.id} declares no envelope`).toBeDefined();
    }
  });
});

/** THE DOOR TWIN over the REAL anima rows: the refusal and the agency,
 *  judged at the same seat the queue composes through. The frame is
 *  harness-min (schemaNames cover the judged knobs) — the envelopes,
 *  the defaults and the marriage clause are the DECL's own. */
const animaRow: ModelFactsRow = {
  variants: anima.variants,
  defaults: { steps: 52, cfg: 4 },
} as unknown as ModelFactsRow;

const animaDecl: CardDeclRow = {
  schemaNames: ["steps", "cfg"],
  admits: [],
  spells: [],
} as unknown as CardDeclRow;

const animaBase = selectCardVariant("anima", animaRow, {}, "1");
const animaTurbo = selectCardVariant("anima", animaRow, { variant: "turbo" }, "1");

describe("THE ANIMA MARRIAGE DOOR (real rows, the burn shape)", () => {
  it("the burn's own numbers — 8 steps at CFG 1 on the BASE lane — REFUSE naming the cfg marriage", () => {
    let refused: string | null = null;
    try {
      stampCardOverlay({ steps: 8, cfg: 1 }, animaRow, animaDecl, animaBase, "1", "anima");
      throw new Error("no refusal rode — the E2-8 crime renders unchecked");
    } catch (e) {
      if (e instanceof EnvelopeRefusal) refused = e.message;
      else throw e;
    }
    expect(refused).toContain("cfg 1");
    expect(refused).toContain('"base"');
    expect(refused).toContain("[2, 8]");
    expect(refused).toContain("married to cfg 4");
  });

  it("the reverse marriage — 52 steps on the TURBO lane — refuses too", () => {
    expect(() =>
      stampCardOverlay({ steps: 52, cfg: 4 }, animaRow, animaDecl, animaTurbo, "1", "anima"),
    ).toThrow(EnvelopeRefusal);
  });

  it("the lane's own numbers ride: 52/4 base, 8/1 turbo (agency preserved)", () => {
    expect(stampCardOverlay({ steps: 52, cfg: 4 }, animaRow, animaDecl, animaBase, "1", "anima")["steps"]).toBe(52);
    expect(stampCardOverlay({ steps: 8, cfg: 1 }, animaRow, animaDecl, animaTurbo, "1", "anima")["steps"]).toBe(8);
  });

  it("the Draft recipe's 8-step stamp rides on BOTH lanes (no over-refusal); an unstated body never refuses", () => {
    expect(() => stampCardOverlay({ steps: 8 }, animaRow, animaDecl, animaBase, "1", "anima")).not.toThrow();
    expect(() => stampCardOverlay({ steps: 8 }, animaRow, animaDecl, animaTurbo, "1", "anima")).not.toThrow();
    expect(() => stampCardOverlay({}, animaRow, animaDecl, animaBase, "1", "anima")).not.toThrow();
  });
});
