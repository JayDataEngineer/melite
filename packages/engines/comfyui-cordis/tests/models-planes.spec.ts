// @melite/comfyui-cordis — the models plane's residual arms
// (TEST-2 breadth, 2026-09-12): validateRegistryAgainstCards'
// boardings edge (the caller owns the card→atoms edge) and the
// catalog emission's served-row arms (the form law, the optional
// studio/accepts overlays). Synthetic decls — the registry's own
// rows already pin the mainline through the walls.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateRegistryAgainstCards } from "../src/models/validate.ts";
import { buildCatalog, isServedFamily } from "../src/models/catalogEmission.ts";
import type { ModelDecl } from "../src/models/families/contract.ts";

const decl = (over: Record<string, unknown> = {}): ModelDecl => ({
  id: "synth",
  genre: "image",
  label: "Synth",
  description: "a synthetic row",
  form: "gen",
  engine: "comfyui",
  card: "",
  defaults: {},
  variants: [],
  ...over,
} as unknown as ModelDecl);

const cards = new Map([["image-gen", new Map([["steps", {}]])]]);

describe("validateRegistryAgainstCards (the boardings edge)", () => {
  it("no boardings map returns the checked pairs as-is", () => {
    const out = validateRegistryAgainstCards([decl()], cards);
    assert.deepEqual(out, [], "card '' skips — the surface is still migrating");
  });

  it("a caller boarding an unregistered atom refuses (drift, not a skip)", () => {
    assert.throws(
      () => validateRegistryAgainstCards(
        [decl()], cards, [],
        new Map([["image-gen", ["ghost-atom"]]]),
      ),
      /card 'image-gen' boards 'ghost-atom' — no such model registered/,
    );
  });

  it("a caller may board a served route id (servedIds admits it)", () => {
    const out = validateRegistryAgainstCards(
      [decl()], cards, [],
      new Map([["image-gen", ["alias-route"]]]),
      new Set(["alias-route"]),
      new Map([["alias-route", decl({ id: "alias-route" })]]),
    );
    assert.deepEqual(out, [["alias-route", "image-gen"]], "the boarded route checks against its resolved view");
  });

  it("a route view never wins on id collision (registry decls win)", () => {
    const out = validateRegistryAgainstCards(
      [decl()], cards, [],
      new Map([["image-gen", ["synth"]]]),
      new Set(),
      new Map([["synth", decl({ id: "synth", card: "image-gen", defaults: { steps: 1 } })]]),
    );
    assert.deepEqual(out, [["synth", "image-gen"]], "the registry decl (not the route view) validates");
  });

  it("a boarding for an unknown card skips (no domains, no check)", () => {
    const out = validateRegistryAgainstCards(
      [decl()], cards, [],
      new Map([["ghost-card", ["synth"]]]),
    );
    assert.deepEqual(out, [], "the domains lookup misses — nothing to check against");
  });

  it("a served id without a view skips the second loop (decl-less route)", () => {
    const out = validateRegistryAgainstCards(
      [decl()], cards, [],
      new Map([["image-gen", ["alias-route"]]]),
      new Set(["alias-route"]),
    );
    assert.deepEqual(out, [], "no decl and no view — the route has no checkable row");
  });

  it("a boarded retired-engine row skips (frozen data, not drift)", () => {
    const out = validateRegistryAgainstCards(
      [decl({ id: "old", engine: "retired", card: "image-gen", defaults: {} })],
      cards, [],
      new Map([["image-gen", ["old"]]]),
    );
    assert.deepEqual(out, [], "retired-engine rows name their own engine's cards");
  });
});

describe("isServedFamily (LAW 0 + the offered gate)", () => {
  it("comfyui/blank-engine serves; retired/unoffered do not", () => {
    assert.equal(isServedFamily(decl()), true);
    assert.equal(isServedFamily(decl({ engine: "" })), true);
    assert.equal(isServedFamily(decl({ engine: undefined })), true);
    assert.equal(isServedFamily(decl({ engine: "retired" })), false);
    assert.equal(isServedFamily(decl({ unoffered: true })), false);
  });
});

describe("buildCatalog (the served-row arms)", () => {
  it("a formless served row refuses LOUD (the form law)", () => {
    assert.throws(
      () => buildCatalog([decl({ form: "   " })]),
      /family synth is served but declares no form/,
    );
    assert.throws(
      () => buildCatalog([decl({ form: undefined })]),
      /declares no form/,
    );
  });

  it("the optional overlays ride only when declared", () => {
    const bare = buildCatalog([decl({ description: undefined, accepts: [], source: undefined })]);
    assert.equal(bare.models["synth"]!.description, "");
    assert.equal(bare.families["synth"]!.accepts, undefined, "an empty accepts stays off the family");
    assert.equal(bare.families["synth"]!.studio, undefined, "no studio, no overlay");
    assert.deepEqual(bare.models["synth"]!.source, { type: "" });

    const full = buildCatalog([decl({
      accepts: ["image"],
      has_agent: true,
      has_inference: true,
      has_rubric: true,
      source: { type: "hf", repo_id: "o/m", filename: "w.safetensors" },
      studio: { tenant: "gen", owns_params: true, writes: ["prompt"], size: "s", layout: "l" },
    })]);
    assert.deepEqual(full.families["synth"]!.accepts, ["image"]);
    assert.deepEqual(full.families["synth"]!.studio, {
      tenant: "gen", owns_params: true, writes: ["prompt"], size: "s", layout: "l",
    });
    assert.equal(full.models["synth"]!.has_agent, true);
    assert.equal(full.models["synth"]!.source.repo_id, "o/m");

    // a non-string tenant is no studio at all (the typeof arm)
    const nostudio = buildCatalog([decl({ studio: { tenant: 42 } })]);
    assert.equal(nostudio.families["synth"]!.studio, undefined);
    // a null studio is no studio (the null arm)
    const nullstudio = buildCatalog([decl({ studio: null })]);
    assert.equal(nullstudio.families["synth"]!.studio, undefined);
    // a tenant-only studio rides the tenant with cleared overlays
    const mini = buildCatalog([decl({ studio: { tenant: "gen" } })]);
    assert.deepEqual(mini.families["synth"]!.studio, { tenant: "gen", owns_params: false });
    // an engine-less decl serves (LAW 0) with the empty engine row
    const noengine = buildCatalog([decl({ engine: undefined })]);
    assert.equal(noengine.models["synth"]!.engine, "");
  });

  it("unserved rows emit no row at all", () => {
    const out = buildCatalog([decl({ id: "old", engine: "retired" })]);
    assert.deepEqual(out.models, {});
    assert.deepEqual(out.families, {});
    // no catalog-level slot vocabulary or static sections (DELETED
    // 2026-09-18 with the frozen pin set); seats ride each model
    // row's input_slots.
  });
});
