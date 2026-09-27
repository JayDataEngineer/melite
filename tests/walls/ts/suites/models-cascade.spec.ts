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

describe("the defaults cascade is the cordis primitive (A3)", () => {
  it("the models system is a booted Service (the PORT LAW)", (): void => {
    const svc = modelsService();
    assert.ok(svc instanceof ModelsService, "modelsService() returns a Service instance");
    assert.equal(svc.name, MODELS_SERVICE);
    // 45 since the form-seams stroke (ideogram retired with its
    // card 2026-09-17; fit + skin went at stroke 87)
    assert.equal(svc.registryIds().length, 45) // +1: yue2 on the music card (2026-09-20) // +1: the qwen TTS voicedesign family (2026-09-21; base folded back into the .6 as the Base variant) // +2: the qwen 2.1 pair (2026-09-21) // -2: the H3 fold (h3 + h3-keyframe died into h3-timeline's variants; their routes survive), "every registered model through the service at boot");
    // 91 since stroke 87 (fit + skin retired — 89 + the z-image base
    // routes (with cause alongside — the variant landed without
    // its count updates)
    assert.equal(svc.modelIds().length, 98) // +1: qwen3-tts-voicedesign-design — the design lane's own route (transcript-015, 2026-09-24) // +1: yue2 on the music card (2026-09-20) // +6: the qwen 2.1 pair (2026-09-21) // +1: the survivor-id correction (2026-09-22 — the h3 family id serves as its own address; the family renames h3-timeline → h3 in place) // +1: qwen3-tts-voicedesign-base — the 1.7B clone lane's own flat route (the 1:1 matrix, 2026-09-23), "every flat id still serves (routes over the registry)"); // 90 since the form-seams stroke (ideogram retired)
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
    // booted above, and these two are the declaring families)
    for (const id of ["qwen3-tts", "qwen3-tts-voicedesign"]) {
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

  it("the framework symbol is the REAL one (no reimplementation)", (): void => {
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
    // and the models service's cascade seat is not shadowed by a
    // local reimplementation (the file must IMPORT the primitive)
    const src = readFileSync(
      new URL("../../../../packages/engines/comfyui-cordis/src/models/models.ts", import.meta.url),
      "utf8",
    );
    assert.match(src, /resolveConfig|symbols/,
      "the models plane rides the framework's resolver (a local reimplementation is the drift this arm stood for)");
    assert.notEqual(MODELS_SERVICE, "");
  });

  it("krea-2 pins hold byte-for-byte on the primitive", (): void => {
    const fam = mergedDefaults("krea-2");
    assert.equal(fam["width"], 1024);
    assert.equal(fam["sampler"], "euler");
    const raw = mergedDefaults("krea-2", "raw");
    assert.equal(raw["steps"], 52);
    assert.equal(raw["cfg"], 3.5);
  });
});
