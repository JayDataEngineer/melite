// @melite/image-image-gen — composition tests.
//
// Harness-Packages law: product-visible plugins require a
// REAL-composition proof — boot through the production loading
// path (the composition root the gateway prime consumes), not a
// hand-built fixture — and registry contributions prove disposal
// (the HMR-safety test: dispose the fiber, observe removal).
//
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, loadCardDefs } from "@melite/comfyui-cordis";
import * as pkg from "../src/index.ts";
import { DECL as krea2Decl } from "@melite/models-krea-2";
import { DECL as zImageDecl } from "@melite/models-z-image";
import { DECL as animaDecl } from "@melite/models-anima";
import { toolBaseRows } from "../../../harness/estate-queue/src/toolProjection.ts";

describe("real composition (the production path)", () => {
  it("the composition root serves the card from the PACKAGE, not a glob hit", async () => {
    // loadCardDefs is the engine's composition root (the estate's
    // cardRegistry prime consumes it). With the folder moved out of
    // src/cards, serving proves the package list composed it — and
    // exactly once (the deleted engine card would double-register).
    const defs = await loadCardDefs();
    const def = defs.get("image-gen");
    assert.ok(def, "the composed package registers its card");
    assert.ok(def.requiresModel !== false, "a MODEL card rides the {model:} demand");
    assert.deepEqual([...def.boarded], ["krea-2", "z-image", "anima"]);
    // THE CARD GETS ITS MODELS FROM THE MODEL PLUGINS: boarded ids
    // ARE the DECL ids of packages/models/* (the model
    // plugins — distinct domain from card plugins — each carrying
    // variants, quants, HF links, mods; never a restated string).
    assert.deepEqual([...def.boarded], [krea2Decl.id, zImageDecl.id, animaDecl.id]);
    assert.equal(def.identity?.label, "Image");
  });

  it("stroke 34: the card-recipe layer is DEAD — no catalog, no knob", async () => {
    const defs = await loadCardDefs();
    const def = defs.get("image-gen")!;
    // the catalog is gone from the definition…
    assert.equal("recipes" in def, false);
    // …and the knob is gone from the walked surface (the schema's
    // own declaration order — one spelling)
    assert.equal(def.schema({ prompt: "x" }).recipe, undefined);
  });

  it("the card emits its tool row (M1 law holds through the package)", async () => {
    const defs = await loadCardDefs();
    const row = toolBaseRows(defs).get("image-gen");
    assert.ok(row);
    assert.equal(row.name, "image_gen_card");
    // The MODEL input, one spelling: boarded[0], the same law the
    // tool face's model knob and default resolution ride.
    assert.equal(row.model, "krea-2");
    assert.equal(row.kind, "card-compose");
    assert.ok(row.description.length > 0);
  });
});

describe("plugin shape (Harness-Packages law)", () => {
  it("named exports only: name/inject/apply; no default export", async () => {
    assert.equal(pkg.name, "@melite/image-gen");
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
    assert.ok(svc.cardIds().includes("image-gen"), "registered while live");
    await fiber.dispose();
    assert.ok(!svc.cardIds().includes("image-gen"), "fiber dispose must retract its card");
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0]);
    assert.ok(svc.cardIds().includes("image-gen"), "re-registration works after dispose");
  });
});
