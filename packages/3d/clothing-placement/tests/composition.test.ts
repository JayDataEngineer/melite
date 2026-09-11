// @melite/3d-clothing-placement — composition tests.
//
// Harness-Packages law: product-visible plugins require a
// REAL-composition proof — boot through the production loading
// path (the composition root the estate prime consumes), not a
// hand-built fixture — and registry contributions prove disposal
// (the HMR-safety test: dispose the fiber, observe removal).
//
// Run: node --experimental-strip-types --test tests/
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, loadCardDefs } from "@melite/comfyui-cordis";
import * as pkg from "../src/index.ts";
import { toolBaseRows } from "../../../harness/estate-queue/src/toolProjection.ts";

describe("real composition (the production path)", () => {
  it("the composition root serves the card from the PACKAGE, not a glob hit", async () => {
    // loadCardDefs is the engine's composition root (the estate's
    // cardRegistry prime consumes it). With the folder moved out of
    // src/cards, serving proves the package list composed it.
    const defs = await loadCardDefs();
    const def = defs.get("clothing-placement");
    assert.ok(def, "the composed package registers its card");
    assert.equal(def.requiresModel, false);
    assert.deepEqual(def.boarded, []);
    assert.equal(def.identity?.label, "Clothing Placement");
  });

  it("the card emits its tool row (M1 law holds through the package)", async () => {
    const defs = await loadCardDefs();
    const row = toolBaseRows(defs).get("clothing-placement");
    assert.ok(row);
    assert.equal(row.name, "clothing_placement_card");
    assert.equal(row.model, null);
    assert.equal(row.kind, "card-compose");
    assert.ok(row.description.length > 0);
  });
});

describe("plugin shape (Harness-Packages law)", () => {
  it("named exports only: name/inject/apply; no default export", async () => {
    assert.equal(pkg.name, "clothing-placement");
    // Both faces optional (Scenario B): an empty inject — a hard
    // comfyui gate would hold the plugin PENDING in a standalone
    // agent host and the tool would never register.
    assert.deepEqual(pkg.inject, []);
    assert.equal(typeof pkg.apply, "function");
    const mod = pkg as unknown as { default?: unknown };
    assert.equal(mod.default, undefined, "function plugins carry no default export");
  });
});

describe("HMR safety (registry contributions prove disposal)", () => {
  it("fiber dispose retracts the card; re-registration works", async () => {
    const ctx = new Context();
    const svc = new ComfyUIService(ctx);
    const fiber = await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0]);
    assert.ok(svc.cardIds().includes("clothing-placement"), "registered while live");
    await fiber.dispose();
    assert.ok(!svc.cardIds().includes("clothing-placement"), "fiber dispose must retract its card");
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0]);
    assert.ok(svc.cardIds().includes("clothing-placement"), "re-registration works after dispose");
  });
});
