// resolver-defaults-door-stamp.spec.ts — THE DOOR-DEPTH
// resolver_defaults STAMP WALL (axis-unification P1#5, audit
// dev_docs/audits/journey/axis-unification-2026-11-06.md item 5).
//
// The lesion: 2862e0ef2 (the Override Law) and d25765431 (the pick
// reconciles) pinned the CLIENT clamp only. Nobody pinned the DOOR's
// stamp — the served resolved body carrying the picked variant's
// resolver_defaults (anima turbo: steps 8, cfg 1) over the family
// defaults (steps 52, cfg 4). The operator's burn felt exactly this
// seam: the switch did not re-stamp, and every wall stayed green
// because no arm judged the door's own merge.
//
// The pinned invariant, one sentence: AFTER A VARIANT PICK, THE
// SERVED RESOLVED BODY CARRIES THE VARIANT'S resolver_defaults FOR
// EVERY ABSENT SURFACE KEY — the family defaults never win, the
// caller's stated values always win, and the stamp dies with the
// declaration that feeds it.
//
// Seats, each its own firing arm (the split-brain lesson):
//   1. THE DECLARATION (depth): the booted facts row declares turbo
//      resolver_defaults {steps: 8, cfg: 1} — derived off the REAL
//      boot (prime + loadCardDefs + loadFacts' live deriveRow), and
//      distinct from the family defaults the same row carries.
//   2. THE FEED: selectCardVariant (R1, the pure coordinate math)
//      returns resolverDefaults exactly as the row declares them —
//      the object stampCardOverlay merges.
//   3. THE MERGE (unit): stampCardOverlay lands the variant's
//      resolver_defaults OVER the family defaults for absent keys.
//      Toggling the merge loop reds THIS arm (and only it).
//   4. THE DOOR (end-to-end): prepareCardParams — one spelling with
//      the run — composes a pick's body whose unstated steps/cfg
//      ARE the variant's 8/1, never the family's 52/4. A stated
//      body rides verbatim (caller agency — stamps are absent-key
//      seeds, not overrides).
//   5. THE BURN, DOOR-SIDE (control): the pre-wave-31 quant
//      spelling "int8" refuses at the real door naming the known
//      cells (int8_convrot, bf16); the repaired coordinate
//      (int8_convrot) composes — the P0#3 repair verb's write is
//      exactly what the door admits.
//   6. THE DATA-SOURCE TOGGLE (in-wall firing proof): the same
//      prepareCardParams seat fed a facts table whose turbo
//      declaration is stripped composes the FAMILY's 52/4 — arm 4's
//      truth dies with the declaration, so the wall's green rides
//      the live resolver_defaults, never a frozen literal.
//   7. THE REQUIRED-DEFAULTS CENSUS (operator contract 2026-11-07,
//      surface-derived): every family whose SERVED card face exposes
//      steps AND cfg declares both variant-class in its
//      required_defaults manifest, and EVERY variant row carries its
//      own numbers — the family defaults can never substitute (the
//      registration gate in comfyui-cordis validateDecl is the boot
//      door; this arm re-derives the law estate-wide off the real
//      boot). x-families scoping keeps non-sampling lanes (the
//      rig-copy family on the shared img-to-mesh card) outside the
//      law; the h3 timeline face exposes steps without cfg and rides
//      the same carve.
//   8. THE CHECKPOINT RE-POINT (journey audit A2, 2026-11-07): the
//      h3 Singularity row's resolver_defaults is exactly
//      {model: "h3-singularity"} — a per-variant lane-address stamp,
//      not a sampling knob — and the booted facts DERIVE a row for
//      the "h3-singularity" address whose served default IS the
//      re-point (facts.ts deriveRow over the registry's merged
//      view). The model key never rides the compose stamp: the card's
//      params carry no model key — the lane IS the model — so the
//      absent-keys-only merge arms (3/4) stay the steps/cfg judges
//      and the address view is this row's door. The discriminator:
//      the timeline row carries NO resolver_defaults, so an arm
//      asserting the model key can never pass on the family copy.
//
// The merge-line toggle itself (stampCardOverlay's resolver_defaults
// loop lives in estate-queue/src/cardsVariant.ts — another hand's
// file) is owed to that owner per the §5 protocol; arm 3 is the arm
// that reds under it, arm 6 is the in-wall proof this suite can
// fire on its own path.
//
// Run: npx vitest run tests/walls/ts/suites/resolver-defaults-door-stamp.spec.ts
import { describe, expect, it, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { selectCardVariant, stampCardOverlay } from "../../../../packages/harness/estate-queue/src/cardsVariant.ts";
import { emitParamsSchema } from "../../../../packages/engines/comfyui-card-kit/src/params-emit.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import type { CardDeclRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";

let svc: CardRegistryService;
let facts: Record<string, ModelFactsRow>;

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "resolver-defaults-stamp-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  facts = svc.modelFacts() as Record<string, ModelFactsRow>;
}, 90_000);

/** The anima boot row + its turbo variant, derived off the REAL
 *  boot — never a hand copy (the DEPTH axis). */
function animaRow(): ModelFactsRow {
  const row = facts["anima"];
  expect(row, "the booted facts serve an anima row").toBeTruthy();
  return row;
}
function turboOf(row: ModelFactsRow): ModelFactsRow["variants"][number] {
  const turbo = (row.variants ?? []).find((v) => v.id === "turbo");
  expect(turbo, "the anima row serves the turbo variant").toBeTruthy();
  return turbo!;
}

describe("THE DOOR-DEPTH resolver_defaults STAMP (axis-unification P1#5)", () => {
  it("THE DECLARATION: the booted anima row declares turbo resolver_defaults {steps: 8, cfg: 1}, distinct from the family defaults (52 / 4)", () => {
    const row = animaRow();
    const turbo = turboOf(row);
    // the named seat the audit pins (anima turbo, the distilled lane)
    expect(turbo.resolver_defaults).toEqual({ steps: 8, cfg: 1 });
    // THE DISCRIMINATOR: the family defaults differ on BOTH knobs —
    // an arm asserting 8/1 can never pass on the family's copy
    expect(row.defaults["steps"]).toBe(52);
    expect(row.defaults["cfg"]).toBe(4);
    // the turbo cells carry the wave-31 spellings (the repair verb's
    // known-cells list)
    const quants = (turbo.cells ?? []).map((c) => c.quant).sort();
    expect(quants).toEqual(["bf16", "int8_convrot"]);
  });

  it("THE FEED: selectCardVariant returns resolverDefaults exactly as the row declares them — the object the stamp merge reads", () => {
    const row = animaRow();
    const sel = selectCardVariant("anima", row, { model: "anima", variant: "turbo" }, "wall-feed");
    expect(sel.variantId).toBe("turbo");
    expect(sel.resolverDefaults).toEqual({ steps: 8, cfg: 1 });
  });

  it("THE MERGE (unit): stampCardOverlay lands the variant's resolver_defaults OVER the family defaults for absent keys", () => {
    const row = animaRow();
    const sel = selectCardVariant("anima", row, { model: "anima", variant: "turbo" }, "wall-merge");
    const decl: CardDeclRow = svc.cardDecls(facts)[row.card]!;
    expect(decl, "the anima row's card declares a compose face").toBeTruthy();
    const out = stampCardOverlay(
      { model: "anima", variant: "turbo", prompt: "a cat" },
      row,
      decl,
      sel,
      "wall-merge",
      "anima",
    );
    // THE VARIANT WINS: 8/1, never the family's 52/4
    expect(out["steps"]).toBe(8);
    expect(out["cfg"]).toBe(1);
  });

  it("THE DOOR: prepareCardParams composes a turbo pick whose unstated steps/cfg ARE the variant's 8/1 — and a stated body rides verbatim (caller agency)", () => {
    // the pick: variant stated, knobs silent — the stamp lands
    const composed = prepareCardParams(svc, { model: "anima", variant: "turbo", prompt: "a cat" }, "anima", "wall-stamp");
    const params = composed.params as Record<string, unknown>;
    expect(params["steps"]).toBe(8);
    expect(params["cfg"]).toBe(1);
    // never the family defaults painted over the variant's marriage
    expect(params["steps"]).not.toBe(52);
    expect(params["cfg"]).not.toBe(4);
    // CALLER AGENCY: a stated body keeps its own numbers (the stamp
    // seeds ABSENT keys only — never an override). The statement sits
    // INSIDE the lane's declared envelope — outside is the envelope
    // law's loud refusal, not a quiet ride (krea 2026-09-21; anima
    // joined 2026-11-09, the E2-8 cure).
    const stated = prepareCardParams(svc, { model: "anima", variant: "turbo", prompt: "a cat", steps: 6, cfg: 1.5 }, "anima", "wall-agency");
    const statedParams = stated.params as Record<string, unknown>;
    expect(statedParams["steps"]).toBe(6);
    expect(statedParams["cfg"]).toBe(1.5);
    // the outside statement refuses at the same door, naming the lane
    expect(() =>
      prepareCardParams(svc, { model: "anima", variant: "turbo", prompt: "a cat", steps: 12, cfg: 3 }, "anima", "wall-agency-out"),
    ).toThrow(/OUTSIDE the route envelope for variant "turbo"/);
  });

  it("THE BURN, DOOR-SIDE (control): the pre-wave-31 quant spelling refuses at the real door naming the known cells; the repaired coordinate composes", async () => {
    const { unknownQuantVoice } = await import("@melite/contracts/laneRelations");
    // the stale doc (the operator's burn), composed at the door
    let refused = "";
    try {
      prepareCardParams(svc, { model: "anima", variant: "turbo", quant: "int8", prompt: "a cat" }, "anima", "wall-burn");
      refused = "";
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect(refused).not.toBe("");
    expect(refused).toContain(unknownQuantVoice("int8", "anima", "turbo", ["int8_convrot", "bf16"]));
    // THE REPAIRED COORDINATE (the P0#3 verb's write) composes clean
    const repaired = prepareCardParams(svc, { model: "anima", variant: "turbo", quant: "int8_convrot", prompt: "a cat" }, "anima", "wall-repaired");
    const params = repaired.params as Record<string, unknown>;
    expect(params["steps"]).toBe(8);
    expect(params["cfg"]).toBe(1);
  });

  it("THE DATA-SOURCE TOGGLE (in-wall firing proof): strip the turbo declaration → the same door composes the FAMILY's 52/4 — the wall's green rides the live declaration", () => {
    const stripped: Record<string, ModelFactsRow> = structuredClone(facts);
    const row = stripped["anima"]!;
    const turbo = (row.variants ?? []).find((v) => v.id === "turbo")!;
    turbo.resolver_defaults = {};
    // the same seat, the same body — the stamp's SOURCE gone
    const composed = prepareCardParams(
      svc,
      { model: "anima", variant: "turbo", prompt: "a cat" },
      "anima",
      "wall-toggle",
      stripped,
    );
    const params = composed.params as Record<string, unknown>;
    // the family defaults ride — arm 4's truth (8/1) is dead with
    // the declaration: the wall reds exactly when the stamp's data
    // source dies
    expect(params["steps"]).toBe(52);
    expect(params["cfg"]).toBe(4);
  });

  it("THE REQUIRED-DEFAULTS CENSUS (the steps+cfg law, surface-derived): every family whose SERVED face exposes steps AND cfg declares both variant-class, and every variant row carries its own numbers — the family defaults can never substitute", () => {
    const defs = svc.defsSync();
    let lawFamilies = 0;
    let lawVariants = 0;
    for (const [fam, row] of Object.entries(facts)) {
      if ((row.family ?? fam) !== fam) continue; // family rows only (routes derive)
      const def = defs.get(row.card);
      expect(def, `${fam}: the booted card '${row.card}' exists`).toBeTruthy();
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? (def as { schema?: unknown }).schema;
      // THE SERVED FACE (the SSOT emitter the form-spec door rides),
      // scoped to THIS family: an x-families row the family is not
      // in is not its surface — the shared img-to-mesh card scopes
      // steps/cfg to pixal3d/trellis2-native, so the rig-copy lane
      // (transfer-rig, which never samples) stays outside the law.
      const served = emitParamsSchema(carrier as never, [fam]).properties ?? {};
      const visible = (knob: string): boolean => {
        const node = served[knob] as { "x-families"?: unknown } | undefined;
        if (node === undefined) return false;
        const xf = node["x-families"];
        return xf === undefined || (Array.isArray(xf) && xf.includes(fam));
      };
      // THE USER CLASS NAMES REAL KNOBS (every family, triggered or
      // not): a user-class row documents what the compose caller
      // provides — a name the family's served face does not serve
      // is drift (the claim law).
      for (const m of row.required_defaults ?? []) {
        if (m.class !== "user") continue;
        expect(visible(m.name), `${fam}: user-class required default '${m.name}' names no knob on the ${row.card} card's served face`).toBe(true);
      }
      if (!visible("steps") || !visible("cfg")) continue;
      lawFamilies++;
      // THE MANIFEST DECLARES THE LAW: the census reads the booted
      // row's projected manifest, so a stripped declaration dies
      // here with the data source (never a hand copy).
      const manifest = row.required_defaults ?? [];
      for (const knob of ["steps", "cfg"] as const) {
        const rrow = manifest.find((m) => m.name === knob);
        expect(rrow, `${fam}: required_defaults must declare '${knob}' — the served face exposes it (operator contract 2026-11-07)`).toBeTruthy();
        expect(rrow!.class, `${fam}: '${knob}' is variant-class (the model x variant setup provides it)`).toBe("variant");
      }
      // THE LAW'S TEETH: every variant row carries its OWN numbers —
      // never a silent ride on the family defaults (the turbo-steps-
      // on-a-base-model hazard, estate-wide). Recipes are stamp
      // macros (plane canon L1): no resolver face, outside the law.
      for (const v of row.variants ?? []) {
        if (v.group === "Recipe") continue;
        for (const knob of ["steps", "cfg"] as const) {
          const stated = (v.resolver_defaults ?? {})[knob];
          expect(
            typeof stated === "number" && Number.isNaN(stated) === false,
            `${fam}/${v.id}: variant-class required default '${knob}' must be a declared number in the variant's own resolver_defaults (got ${JSON.stringify(stated ?? null)})`,
          ).toBe(true);
        }
        lawVariants++;
      }
    }
    // THE ROSTER PIN (2026-11-07): ten families are inside the law
    // — the five image-gen faces (anima, flux-klein, krea-2,
    // qwen-img-21, z-image), the two edit faces (qwen-img-edit-21,
    // qwen-img-edit-2511), the two 3d samplers (pixal3d,
    // trellis2-native), and moss-image (2026-11-07, the operator's
    // drop — the family declared the law at birth, steps+cfg
    // variant-class + the prompt user seat). An eleventh steps+cfg
    // face REDS HERE until its family declares the law — the census
    // grows by declaration, never by a silent neighbor.
    expect(lawFamilies).toBe(10);
    expect(lawVariants).toBeGreaterThan(0);
  });
});

describe("THE CHECKPOINT RE-POINT (journey audit A2, 2026-11-07): the h3 Singularity row stamps its own lane address through the same absent-keys-only merge", () => {
  function h3Row(): ModelFactsRow {
    const row = facts["h3"];
    expect(row, "the booted facts serve an h3 row").toBeTruthy();
    return row;
  }
  function singularityOf(row: ModelFactsRow): ModelFactsRow["variants"][number] {
    const singularity = (row.variants ?? []).find((v) => v.id === "singularity");
    expect(singularity, "the h3 row serves the Singularity checkpoint variant").toBeTruthy();
    return singularity!;
  }

  it("THE DECLARATION: the Singularity row's resolver_defaults is exactly {model: 'h3-singularity'} — the timeline row carries none (the discriminator)", () => {
    const row = h3Row();
    const singularity = singularityOf(row);
    // the ONE stamp is the per-variant model re-point — a deep-equal,
    // so a smuggled extra key (geometry, sampling) reds
    expect(singularity.resolver_defaults).toEqual({ model: "h3-singularity" });
    // THE DISCRIMINATOR: the timeline row carries NO resolver_defaults
    // — an arm asserting the model key can never pass on the family copy
    const timeline = (row.variants ?? []).find((v) => v.id === "timeline");
    expect(timeline, "the timeline variant serves").toBeTruthy();
    expect(timeline!.resolver_defaults ?? {}).toEqual({});
    // and the family default view never names the singularity lane
    expect(row.defaults?.["model"]).not.toBe("h3-singularity");
  });

  it("THE FEED: selectCardVariant returns the Singularity row's {model} verbatim — the object the stamp merge reads", () => {
    const row = h3Row();
    const sel = selectCardVariant("h3", row, { model: "h3", variant: "singularity" }, "wall-feed-singularity");
    expect(sel.variantId).toBe("singularity");
    expect(sel.resolverDefaults).toEqual({ model: "h3-singularity" });
  });

  it("THE ADDRESS VIEW (door-depth): the booted facts derive a row FOR the 'h3-singularity' address whose served default IS the re-point — never a frozen literal", () => {
    // loadFacts derives one row per claimed address through the
    // registry's own merged view: the variant's resolver_defaults.model
    // lands as the lane's defaults.model (facts.ts deriveRow →
    // service.ts merged defaults). This arm rides that REAL
    // derivation — toggling the DECL's stamp reds the re-boot.
    const addr = facts["h3-singularity"] as
      | { family?: string; card?: string; defaults?: Record<string, unknown> }
      | undefined;
    expect(addr, "the singularity lane's own facts row derives (the route the DECL claims is addressable)").toBeTruthy();
    expect(addr!.family).toBe("h3");
    expect(addr!.card).toBe("h3-timeline");
    expect(addr!.defaults).toEqual({ model: "h3-singularity" });
    // THE JOIN: the view's served default IS the variant row's
    // declaration — two seats, one truth, both live
    const row = h3Row();
    expect(addr!.defaults).toEqual(singularityOf(row).resolver_defaults);
    // the family address's view never carries the re-point
    expect(h3Row().defaults?.["model"]).not.toBe("h3-singularity");
  });

  it("THE DOOR (addressability): the re-pointed lane composes end-to-end at its own address, and the compose body never needs a model stamp (model rides the lane, not a param)", () => {
    // the checkpoint lane composes clean at its own address
    const composed = prepareCardParams(svc, { model: "h3-singularity", prompt: "a cat" }, "h3", "wall-door-singularity");
    expect((composed.params as Record<string, unknown>)["prompt"]).toBe("a cat");
    // the timeline pick (the family default view) composes too —
    // two lanes, one card, no shared spelling
    const plain = prepareCardParams(svc, { model: "h3", prompt: "a cat" }, "h3", "wall-door-plain");
    expect((plain.params as Record<string, unknown>)["prompt"]).toBe("a cat");
  });
});
