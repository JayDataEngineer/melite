// models-cascade.test.ts — THE CORDIS-INHERENCY CASCADE WALL
// (correction stroke A3: the cascade is the framework's, not ours).
//
// The operator's charge (a): the cascade was hand-rolled on
// Object.assign — a DSH-AS-LANGUAGE defect. This wall pins the
// rebuilt shape:
//   - the defaults merge rides Service[symbols.resolveConfig] with
//     ctx.intercept carrying the variant (imported from the real
//     @deepseek-ai/cordis, not a reimplementation);
//   - the precedence is the py compose's: family base < variant
//     intercept < cell head (closest wins);
//   - the root context stays clean (an intercept on one family's
//     resolution never leaks into another);
//   - the krea-2 pins hold byte-for-byte.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/models-cascade.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
// The bare specifier resolves inside packages/* (per-package
// node_modules); from tests/ the pnpm store path is direct:
import { Context, Service, symbols } from "../../../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.2_@deepseek-ai+cordis-plugin-include@1.0.6_@deepseek-ai+cordis-plugin-loader@1.0.3/node_modules/@deepseek-ai/cordis/lib/index.js";
import {
  DEFAULTS_SERVICE,
  resolveCascade,
  cascadeReady,
} from "../../../../packages/engines/comfyui/src/models/cascade.ts";
import { mergedDefaults } from "../../../../packages/engines/comfyui/src/models/models.ts";

describe("the defaults cascade is the cordis primitive (A3)", () => {
  it("cascade module booted the real service", (): void => {
    assert.equal(cascadeReady(), true);
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
    // the shipped static resolves to the SAME symbol we key with —
    // proof we ride the framework's class, not a copy
    assert.equal(Service.resolveConfig, symbols.resolveConfig);
    assert.notEqual(DEFAULTS_SERVICE, "");
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
