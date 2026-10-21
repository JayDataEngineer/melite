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
import { DECL as decl2511 } from "../../../../packages/models/qwen-img-edit-2511/src/index.ts";
import { judgeSamplerEnvelope } from "@melite/contracts/laneRelations";
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

/** THE DRAINED DEBTS (CONTRACTS §4 debt 27, drained 2026-10-21):
 *  z-image, qwen-img-21, qwen-img-edit-21 and qwen-img-edit-2511
 *  each declared sampler envelopes on their split-numbers lanes in
 *  the same change that added their door twins below — the carve-out
 *  is deleted, never emptied: a future split-numbers family with no
 *  envelope refuses THIS wall by name (the failures list), never
 *  silently exempts. */

describe("THE ENVELOPE DECLARATION LAW (split-numbers lanes declare their sampler domain)", () => {
  it("every split-numbers family declares envelopes on ALL its offered lanes (derived census)", () => {
    const failures: string[] = [];
    for (const [fam, row] of Object.entries(facts)) {
      const lanes = offeredLanes(row).map((v) => ({ v, s: stamps(v) }));
      const numeric = lanes.filter((l) => l.s.steps !== undefined && l.s.cfg !== undefined);
      if (numeric.length < 2) continue; // not a split-numbers family
      const distinct = new Set(numeric.map((l) => `${l.s.steps}/${l.s.cfg}`));
      if (distinct.size < 2) continue; // one shared marriage — no cross-lane crime exists
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

/** THE DRAINED-FAMILY DOOR TWINS (CONTRACTS §4 debt 27, 2026-10-21):
 *  each drained family proves the same law as anima at the same seat
 *  the queue composes through — the neighbor lane's marriage refuses
 *  LOUD, the lane's own numbers ride, the envelope pins verbatim.
 *  Real booted rows through the real selectCardVariant +
 *  stampCardOverlay; the harness-min decl frame carries only the
 *  judged knobs. The 2511 lanes are hidden-by-design (the survivor
 *  arc), so the door cannot seat them — their twin judges the real
 *  DECL envelopes through the same one judge the door asks. */
const knobDecl: CardDeclRow = {
  skeleton: "knob",
  boarded: [],
  schemaNames: ["steps", "cfg"],
  admits: [],
  spells: [],
};

function familyRow(fam: string): ModelFactsRow {
  const row = facts[fam];
  if (row === undefined) throw new Error(`booted facts carry no family ${JSON.stringify(fam)} — the twin judges nothing`);
  return row;
}

/** The burn shape through the real door: the refusal voice, or a
 *  thrown Error naming the unchecked crime (never a silent pass). */
function burnRefusal(fam: string, variant: string, body: Record<string, unknown>): string {
  const row = familyRow(fam);
  const sel = selectCardVariant(fam, row, { variant }, "1");
  try {
    stampCardOverlay(body, row, knobDecl, sel, "1", fam);
  } catch (e) {
    if (e instanceof EnvelopeRefusal) return e.message;
    throw e;
  }
  throw new Error(`no refusal rode — the E2-8 crime renders unchecked (${fam} ${variant} ${JSON.stringify(body)})`);
}

function ownRides(fam: string, variant: string, body: Record<string, unknown>): Record<string, unknown> {
  const row = familyRow(fam);
  return stampCardOverlay(body, row, knobDecl, selectCardVariant(fam, row, { variant }, "1"), "1", fam);
}

describe("THE Z-IMAGE MARRIAGE DOOR (debt 27 drain)", () => {
  it("the base marriage — 25 steps at CFG 4 — REFUSES on the turbo lane", () => {
    const voice = burnRefusal("z-image", "turbo", { steps: 25, cfg: 4 });
    expect(voice).toContain('variant "turbo"');
    expect(voice).toContain("stated steps 25");
    expect(voice).toContain("[4, 8]");
    expect(voice).toContain("married to steps 8");
  });

  it("the turbo marriage — 8 steps at CFG 1 — REFUSES on the base lane", () => {
    const voice = burnRefusal("z-image", "base", { steps: 8, cfg: 1 });
    expect(voice).toContain('variant "base"');
    expect(voice).toContain("stated steps 8");
    expect(voice).toContain("[20, 30]");
    expect(voice).toContain("married to steps 25");
  });

  it("the lanes' own numbers ride; an unstated body never refuses", () => {
    expect(ownRides("z-image", "turbo", { steps: 8, cfg: 1 })["steps"]).toBe(8);
    expect(ownRides("z-image", "base", { steps: 25, cfg: 4 })["steps"]).toBe(25);
    expect(() => ownRides("z-image", "base", {})).not.toThrow();
  });

  it("the envelopes pin verbatim (the declared domains, not a drifted copy)", () => {
    const row = familyRow("z-image");
    const byId = new Map((row.variants ?? []).map((v) => [v.id, v] as const));
    expect((byId.get("turbo") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [4, 8], cfg: [1, 2] });
    expect((byId.get("base") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [20, 30], cfg: [3, 5] });
  });
});

describe("THE QWEN-IMG-21 MARRIAGE DOOR (debt 27 drain)", () => {
  it("the base marriage — 25 steps at CFG 1 — REFUSES on the turbo lane", () => {
    const voice = burnRefusal("qwen-img-21", "turbo", { steps: 25, cfg: 1 });
    expect(voice).toContain('variant "turbo"');
    expect(voice).toContain("(route qwen-img-21-turbo)");
    expect(voice).toContain("stated steps 25");
    expect(voice).toContain("[4, 8]");
    expect(voice).toContain("married to steps 8");
  });

  it("the turbo marriage — 8 steps at CFG 1 — REFUSES on the base lane", () => {
    const voice = burnRefusal("qwen-img-21", "base", { steps: 8, cfg: 1 });
    expect(voice).toContain('variant "base"');
    expect(voice).toContain("(route qwen-img-21)");
    expect(voice).toContain("stated steps 8");
    expect(voice).toContain("[20, 30]");
    expect(voice).toContain("married to steps 25");
  });

  it("the lanes' own numbers ride; an unstated body never refuses", () => {
    expect(ownRides("qwen-img-21", "base", { steps: 25, cfg: 1 })["steps"]).toBe(25);
    expect(ownRides("qwen-img-21", "turbo", { steps: 8, cfg: 1 })["steps"]).toBe(8);
    expect(() => ownRides("qwen-img-21", "base", {})).not.toThrow();
  });

  it("the envelopes pin verbatim (the declared domains, not a drifted copy)", () => {
    const row = familyRow("qwen-img-21");
    const byId = new Map((row.variants ?? []).map((v) => [v.id, v] as const));
    expect((byId.get("base") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [20, 30], cfg: [1, 2] });
    expect((byId.get("turbo") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [4, 8], cfg: [1, 2] });
  });
});

describe("THE QWEN-IMG-EDIT-21 MARRIAGE DOOR (debt 27 drain)", () => {
  it("the base marriage — 25 steps at CFG 1 — REFUSES on the turbo lane", () => {
    const voice = burnRefusal("qwen-img-edit-21", "turbo", { steps: 25, cfg: 1 });
    expect(voice).toContain('variant "turbo"');
    expect(voice).toContain("(route qwen-img-edit-21-turbo)");
    expect(voice).toContain("stated steps 25");
    expect(voice).toContain("[4, 8]");
    expect(voice).toContain("married to steps 8");
  });

  it("the turbo marriage — 8 steps at CFG 1 — REFUSES on the base lane", () => {
    const voice = burnRefusal("qwen-img-edit-21", "base", { steps: 8, cfg: 1 });
    expect(voice).toContain('variant "base"');
    expect(voice).toContain("(route qwen-img-edit-21)");
    expect(voice).toContain("stated steps 8");
    expect(voice).toContain("[20, 30]");
    expect(voice).toContain("married to steps 25");
  });

  it("the lanes' own numbers ride; an unstated body never refuses", () => {
    expect(ownRides("qwen-img-edit-21", "base", { steps: 25, cfg: 1 })["steps"]).toBe(25);
    expect(ownRides("qwen-img-edit-21", "turbo", { steps: 8, cfg: 1 })["steps"]).toBe(8);
    expect(() => ownRides("qwen-img-edit-21", "base", {})).not.toThrow();
  });

  it("the envelopes pin verbatim (the declared domains, not a drifted copy)", () => {
    const row = familyRow("qwen-img-edit-21");
    const byId = new Map((row.variants ?? []).map((v) => [v.id, v] as const));
    expect((byId.get("base") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [20, 30], cfg: [1, 2] });
    expect((byId.get("turbo") as { sampler_envelope?: unknown }).sampler_envelope).toEqual({ steps: [4, 8], cfg: [1, 2] });
  });
});

describe("THE 2511 MARRIAGE DOOR (debt 27 drain, hidden lanes)", () => {
  function envelopeOf(id: string): { steps?: readonly number[]; cfg?: readonly number[] } {
    const v = (decl2511.variants ?? []).find((row) => row.id === id);
    if (v === undefined) throw new Error(`the 2511 DECL carries no variant ${JSON.stringify(id)} — the twin judges nothing`);
    const env = (v as { sampler_envelope?: { steps?: readonly number[]; cfg?: readonly number[] } }).sampler_envelope;
    if (env === undefined) throw new Error(`the 2511 DECL variant ${JSON.stringify(id)} declares no envelope — the census arm owns this red`);
    return env;
  }

  it("the standard marriage — 20 steps at CFG 2.5 — is OFF the lightning envelope", () => {
    const off = judgeSamplerEnvelope({ steps: 20, cfg: 2.5 }, envelopeOf("lightning"), { id: "lightning" });
    expect(off?.knob).toBe("steps");
    expect(off?.voice).toContain('variant "lightning"');
    expect(off?.voice).toContain("[4, 8]");
  });

  it("the lightning marriage — 4 steps at CFG 1 — is OFF the standard envelope", () => {
    const off = judgeSamplerEnvelope({ steps: 4, cfg: 1 }, envelopeOf("standard"), { id: "standard" });
    expect(off?.knob).toBe("steps");
    expect(off?.voice).toContain('variant "standard"');
    expect(off?.voice).toContain("[10, 30]");
  });

  it("each hidden lane's own numbers ride its own envelope", () => {
    expect(judgeSamplerEnvelope({ steps: 4, cfg: 1 }, envelopeOf("lightning"), { id: "lightning" })).toBeNull();
    expect(judgeSamplerEnvelope({ steps: 20, cfg: 2.5 }, envelopeOf("standard"), { id: "standard" })).toBeNull();
  });

  it("the envelopes pin verbatim (the declared domains, not a drifted copy)", () => {
    expect(envelopeOf("lightning")).toEqual({ steps: [4, 8], cfg: [1, 2] });
    expect(envelopeOf("standard")).toEqual({ steps: [10, 30], cfg: [2, 4] });
  });
});
