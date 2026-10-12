// models-cascade.spec.ts — THE CORDIS-INHERENCY CASCADE WALL +
// THE MODELS-SERVICE WALL (A3, then the PORT LAW landing
// 2026-09-08: "the Models are not cordis" — they are).
//
// The operator's charge (a): the cascade was hand-rolled on
// Object.assign — a DSH-AS-LANGUAGE defect. This wall pins:
//   - the defaults merge rides Service[symbols.resolveConfig] with
//     ctx.intercept carrying the variant (the real
//     @deepseek-ai/cordis, not a reimplementation);
//   - the precedence is the py compose's: family base < variant
//     intercept < cell head (closest wins);
//   - the root context stays clean (an intercept on one family's
//     resolution never leaks into another);
//   - the krea-2 pins hold byte-for-byte;
//   - THE SERVICE SHAPE (PORT LAW): models register through
//     ModelsService (boot-loud validation), duplicates refuse,
//     the frozen registry rode at boot.
//
// Run: npx vitest run tests/walls/ts/suites/models-cascade.spec.ts

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// The bare specifier resolves inside packages/* (per-package
// node_modules); from tests/ the pnpm store path is direct:
import { Context, Service, symbols } from '@deepseek-ai/cordis';
import {
  MODELS_SERVICE,
  ModelsService,
  resolveCascade,
  modelsService,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { mergedDefaults } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { assertAddressesServe } from "../../../../packages/engines/comfyui-cordis/src/models/service.ts";

describe("the defaults cascade is the cordis primitive (A3)", () => {
  it("the models system is a booted Service (the PORT LAW)", (): void => {
    const svc = modelsService();
    assert.ok(svc instanceof ModelsService, "modelsService() returns a Service instance");
    assert.equal(svc.name, MODELS_SERVICE);
    // NO HAND COUNT (2026-10-13, the flake audit). This literal was
    // 48 with a five-line editorial trail of "+1 / -2" annotations —
    // a ratchet that fires on any family mint AND can never fail
    // independently: bootModels already refuses when familyCount()
    // disagrees with FAMILY_PLUGINS.length (service.ts:1113), over the
    // same table registryIds() reads. What this wall actually owns is
    // the DERIVED property: every registered family serves an address.
    assertAddressesServe(svc.modelIds(), svc.registryIds());
    // The route census is a DERIVED property, not a number: every
    // registry id must be reachable as a model id (assertAddressesServe
    // above) and every flat id must resolve through its ladder. A count
    // would be a hand-maintained ratchet with the same editorial trail.
    assert.ok(svc.modelIds().length >= svc.registryIds().length, "the route surface is at least the registry");
    assert.ok(svc.modelIds().length > 0, "the boot served at least one route");
  });

  it("registerFamily refuses duplicates LOUD (one owner per id)", (): void => {
    const svc = modelsService();
    const decl = svc.getModel("z-image");
    assert.throws(() => svc.registerFamily(decl), /registered twice/, "duplicate registration must refuse");
  });

  it("registerFamily refuses corrupt rows at the gate (the metaclass's import-time validation)", (): void => {
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({ ...svc.getModel("z-image"), id: "Bad-Id", genre: "Genre.IMAGE" } as never),
      /lowercase|genre/,
      "enum-repr corruption refuses at registration",
    );
  });

  // THE NESTED DRIFT LAW (2026-10-10, the DECL audit's HIGH-1): the
  // top-level strip check cannot see inside — schemastery drops
  // `strict` in a nested property()/array resolve, so a typo on a
  // VARIANT or a misspelled relation word booted CLEAN, merged, and
  // bound nothing while the author believed a law held. Each level
  // carries the same extra: forbid the top level always had.
  it("a typo on a VARIANT refuses (nested extra: forbid)", (): void => {
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({
        ...svc.getModel("z-image"),
        id: "typo-variant",
        variants: [{ id: "v", label: "V", group: "Variant", cells: [], parmas: ["prompt"] }],
      } as never),
      /parmas|unknown key/,
      "a variant-level typo refuses by name, not silently",
    );
  });

  it("a misspelled relation word refuses (a law that binds nothing is worse than no law)", (): void => {
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({
        ...svc.getModel("z-image"),
        id: "typo-relation",
        params: ["prompt"],
        relations: { requiers: [{ field: "prompt", needs: ["steps"] }] },
      } as never),
      /requiers|unknown relation/,
      "an unknown relation word refuses at the gate",
    );
  });

  it("a misspelled relation word on a VARIANT refuses too (the DECL audit's gap 5 — every row is gated where it is declared)", (): void => {
    // 2026-10-10: relationDrift ran only on the FAMILY's rows, so a
    // variant row with the same typo booted clean and bound nothing
    // while its author believed a lane law held.
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({
        ...svc.getModel("z-image"),
        id: "typo-variant-relation",
        variants: [{
          id: "v", label: "V", group: "Variant", cells: [],
          relations: { requiers: [{ field: "prompt", needs: ["steps"] }] },
        }],
      } as never),
      /requiers|unknown relation/,
      "a variant-level misspelled word refuses at the gate",
    );
    // and a legal variant row still boots (the gate is not a blanket)
    svc.registerFamily({
      ...svc.getModel("z-image"),
      id: "legal-variant-relation",
      variants: [{
        id: "v", label: "V", group: "Variant", cells: [],
        relations: { required: [{ fields: ["prompt"] }] },
      }],
    } as never);
    assert.equal(svc.getModel("legal-variant-relation") !== undefined, true,
      "a legal variant relation boots");
  });

  it("a typo INSIDE a relation row refuses too (the row's own keys, not just the word's)", (): void => {
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({
        ...svc.getModel("z-image"),
        id: "typo-relation-row",
        params: ["prompt"],
        // a VALID row plus one extra key: the drift arm owns it
        relations: { requires: [{ field: "prompt", needs: ["steps"], neeedz: ["x"] }] },
      } as never),
      /neeedz|unknown relation/,
      "the row's own keys are checked, not just the word's",
    );
  });

  it("a relation row MISSING a required member refuses in the schema's own voice", (): void => {
    const svc = modelsService();
    assert.throws(
      () => svc.registerFamily({
        ...svc.getModel("z-image"),
        id: "typo-relation-shape",
        params: ["prompt"],
        relations: { requires: [{ field: "prompt" }] },
      } as never),
      /needs/,
      "a row without its needs is a shape refusal, named by the member",
    );
  });

  it("the WELL-FORMED declaration still boots (the law above refuses typos, not authors)", (): void => {
    const svc = modelsService();
    // the shipped declarations are the receipt: every family's own
    // params/relations pass the nested check (the whole registry
    // booted above, and this is THE declaring family — the Qwen
    // fold 2026-10-26 merged the two dead atoms into ONE family,
    // so the pre-fold pair walk retired; F3 audit
    // 2026-10-12-audit-display-fold)
    for (const id of ["qwen3-tts"]) {
      const decl = svc.getModel(id) as { params?: unknown; relations?: unknown; variants?: unknown[] };
      assert.ok(decl.params !== undefined, id + " declares a surface");
      assert.ok(decl.relations !== undefined, id + " declares its laws");
    }
  });

  it("resolveCascade = base → intercept → head, via symbols.resolveConfig", (): void => {
    const merged = resolveCascade(
      { steps: 8, cfg: 3.5, sampler: "euler" },
      { steps: 52, cfg: 3.5 },
      { seed: 42 },
    );
    assert.deepEqual(merged, { steps: 52, cfg: 3.5, sampler: "euler", seed: 42 });
  });

  it("empty intercept/head collapse to plain copies (no chain links)", (): void => {
    const merged = resolveCascade({ steps: 8 }, null, null);
    assert.deepEqual(merged, { steps: 8 });
  });

  it("an intercept never leaks into the root context (isolation)", (): void => {
    const merged = resolveCascade({ steps: 8 }, { steps: 52 }, null);
    assert.equal(merged["steps"], 52);
    // root service still resolves bare: the parent is not affected
    // (cordis context.ts:139 contract)
    const fresh = resolveCascade({ steps: 9 }, null, null);
    assert.equal(fresh["steps"], 9);
  });

  it("the framework symbol is the REAL one (no reimplementation)", async (): Promise<void> => {
    // resolveConfig must exist on a plain Service subclass built
    // the same way — proving we ride the shipped class, not a copy
    class Probe extends Service {
      constructor(ctx: Context) {
        super(ctx, "probe.a3");
      }
    }
    const ctx = new Context();
    void ctx.plugin({
      apply(c: Context): void {
        new Probe(c);
      },
    });
    // NOT AN IDENTITY TAUTOLOGY (the walls audit's row 11,
    // 2026-10-10): the old proof compared Service.resolveConfig with
    // symbols.resolveConfig — the same class member through two
    // import paths, a comparison that cannot fail and proves
    // nothing about the code that runs. The teeth are behavioural:
    // the framework's OWN resolver, invoked on a live service the
    // way the models plane invokes it, must merge the two layers.
    const probe = new Probe(ctx);
    const merged = probe[symbols.resolveConfig]({ steps: 9 }, { steps: 52, cfg: 3.5 }) as
      { steps?: unknown; cfg?: unknown };
    assert.equal(merged.steps, 52, "the head layer wins (the cascade's own law)");
    assert.equal(merged.cfg, 3.5, "the head's own keys ride");
    // E-C4 (the wall audit, 2026-09-28): the grep used to read
    // models.ts, where the symbols appear only in COMMENTS — the
    // real cascade lives in service.ts (ctx.intercept building the
    // view, svc[symbols.resolveConfig] composing through it). The
    // proof reads service.ts CODE (comments stripped) and requires
    // BOTH halves of the wiring.
    const serviceSrc = readFileSync(
      new URL("../../../../packages/engines/comfyui-cordis/src/models/service.ts", import.meta.url),
      "utf8",
    );
    const code = serviceSrc.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n");
    assert.match(code, /ctx\.intercept|this\.ctx\.intercept/,
      "the cascade builds its layer through ctx.intercept (the framework's view primitive — a reimplementation is the drift this arm stood for)");
    assert.match(code, /symbols\.resolveConfig/,
      "the cascade composes through Service[symbols.resolveConfig] (the shipped symbol, not a copy)");
    // E-L11 (the wall audit, 2026-09-28): `notEqual(MODELS_SERVICE,
    // "")` was a filler — a constant is never empty, so the arm
    // proved nothing. The seat key is the ENGINE'S EXPORT, compared
    // against the module that owns it: a rename on either side
    // breaks here.
    const owner = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
    assert.equal(MODELS_SERVICE, owner.MODELS_SERVICE,
      "the seat key this wall uses IS the engine's exported seat key (one spelling)");
  });

  it("the cascade WIRING composes: base < intercept < head, and the root stays clean (E-C4)", (): void => {
    // the behavioural half the audit owed: not "cordis works" but
    // OUR seat's cascade method — the same call resolve() rides —
    // layering a family base, a variant intercept, and a cell head.
    const svc = modelsService();
    const base = { steps: 20, cfg: 4.5, sampler: "euler" };
    // the intercept layer: overrides ONE key, adds another
    const withIntercept = svc.cascade(base, { steps: 30, seed: 7 }, null);
    assert.equal(withIntercept.steps, 30, "the intercept layer beats the family base");
    assert.equal(withIntercept.cfg, 4.5, "the base's untouched keys survive the intercept");
    assert.equal(withIntercept.seed, 7, "the intercept's own keys ride");
    // the full chain: base < intercept < head (closest wins)
    const full = svc.cascade(base, { steps: 30 }, { steps: 40, cfg: 7 });
    assert.equal(full.steps, 40, "the head (cell) beats the intercept (variant) beats the base (family)");
    assert.equal(full.cfg, 7, "the head's own keys ride over the base");
    assert.equal(full.sampler, "euler", "the base's untouched keys survive the whole chain");
    // AND THE ROOT STAYS CLEAN (the wall's own third law): the
    // intercepted view must not leak into the next resolution — a
    // second cascade WITHOUT the intercept sees the base alone.
    const after = svc.cascade(base, null, null);
    assert.equal(after.steps, 20, "the root view is clean after an intercepted resolution (the intercept never leaked)");
    assert.equal(after.seed, undefined, "the intercept's keys do not persist into later resolutions");
  });

  it("krea-2 pins hold byte-for-byte on the primitive", (): void => {
    const fam = mergedDefaults("krea-2");
    assert.equal(fam["width"], 1024);
    assert.equal(fam["sampler"], "euler");
    const raw = mergedDefaults("krea-2", "raw");
    assert.equal(raw["steps"], 52);
    assert.equal(raw["cfg"], 3.5);
  });

  it("EVERY family merges its own declared defaults (E-L11: not one family of thirty)", (): void => {
    // E-L11 (the wall audit, 2026-09-28): the byte pin above judged
    // ONE family of 45 — forty-four could merge nothing at all. The
    // law is now census-wide: every registered family resolves
    // through the primitive, and its merged view carries the shape
    // the card plane reads (a record, string/number values only).
    const svc = modelsService();
    const ids = svc.registryIds();
    // the walk is over EVERY id the seat holds (a floor: arms above
    // this one register well-formed probe families on the same
    // service, so the absolute count moves with them — the exact
    // census of the PRODUCTION families is pinned by the boot arm).
    // 45 -> 35 -> 30 (2026-10-12: the 12-fossil sweep, then the
    // operator's five-family kill — ace-step, moss, skintokens,
    // ltx-2-3, ltx-director-distilled; probe arms above still add
    // their own, so the walk stays census-wide).
    assert.ok(ids.length >= 30,
      `the census walks the whole registry (${String(ids.length)} families; the sample was one)`);
    // An EMPTY bag is a lawful declaration (a rig family with no
    // knobs); what may not happen is a family that does not RESOLVE
    // or a merged value the card plane cannot carry.
    const unresolved: string[] = [];
    const malformed: string[] = [];
    for (const id of ids) {
      const merged = mergedDefaults(id);
      if (merged === null || typeof merged !== "object" || Array.isArray(merged)) {
        unresolved.push(id);
        continue;
      }
      for (const [k, v] of Object.entries(merged)) {
        const t = typeof v;
        if (t !== "string" && t !== "number" && t !== "boolean") {
          malformed.push(`${id}.${k} is ${t}`);
        }
      }
    }
    assert.deepEqual(unresolved, [], "every family resolves through the primitive (a family that did not is named)");
    assert.deepEqual(malformed, [], "every merged default is a scalar the card plane can carry");
  });
});
