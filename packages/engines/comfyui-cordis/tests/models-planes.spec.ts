// @melite/comfyui-cordis — the models plane's residual arms
// (TEST-2 breadth, 2026-09-12): validateRegistryAgainstCards'
// boardings edge (the caller owns the card→atoms edge) and the
// catalog emission's served-row arms (the form law, the optional
// studio/accepts overlays). Synthetic decls — the registry's own
// rows already pin the mainline through the walls.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateRegistryAgainstCards, fieldDomains } from "../src/models/validate.ts";
import { buildCatalog, isServedFamily } from "../src/models/catalogEmission.ts";
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';

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

  it("AN ADMITTED DEFAULT KEY IS LEGAL TRUTH (2026-09-22, the tagger weights rail: the variant rail stamps, the surface never renders)", () => {
    const d = decl();
    const withCheckpoint = { ...d, defaults: { ...(d.defaults ?? {}), checkpoint: "wd-v1-4-moat-tagger-v2" } } as typeof d;
    // no admits → the refusal stands (drift is still drift)
    assert.throws(
      () => validateRegistryAgainstCards(
        [withCheckpoint], cards, [], new Map([["image-gen", [d.id]]]),
      ),
      /names no field/,
    );
    // the card admits the route-stamped key → the default passes
    const out = validateRegistryAgainstCards(
      [withCheckpoint], cards, [], new Map([["image-gen", [d.id]]]),
      undefined, undefined,
      new Map([["image-gen", ["checkpoint"]]]),
    );
    assert.deepEqual(out, [[d.id, "image-gen"]], "the admitted default validates");
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

  // THE AXIS-PARAMS ARM (the estate contract laws, 2026-10-10): a
  // decl's variant_groups own durable draft seats, so a default whose
  // key IS a group id (lowercased — the axisKey law) is a stamp, never
  // a ghost card field. No in-tree decl reaches it through the wall
  // (every served family's axis stamp is also admitted), so one is
  // driven here with and without its group.
  it("a default naming its OWN variant_group passes — the axis stamp, not a ghost field", () => {
    const stamped = decl({ defaults: { variant: "base" }, variant_groups: [{ id: "Variant" }] });
    const boardings = new Map([["image-gen", [stamped.id]]]);
    assert.deepEqual(
      validateRegistryAgainstCards([stamped], cards, [], boardings),
      [["synth", "image-gen"]],
      "the card declares no 'variant' field — the axis stamp skips",
    );
    assert.throws(
      () => validateRegistryAgainstCards(
        [decl({ defaults: { variant: "base" } })], cards, [], boardings,
      ),
      /default 'variant' names no field on card image-gen/,
    );
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

describe("fieldDomains (the union-options projection)", () => {
  it("a union branch carrying null NEVER joins the options (the retired shift_video shape)", () => {
    const dict = {
      shift_video: {
        type: "union",
        list: [
          { type: "number", value: 8 },
          { type: "const", value: null },
        ],
      },
    } as never;
    const out = fieldDomains(dict as never);
    const opts = out.get("shift_video")?.options ?? [];
    assert.deepEqual(opts, ["8"], "the number branch stringifies in; the null branch never joins");
  });

  it("a union whose branches are ALL null projects NO options (the empty-opts arm)", () => {
    const dict = {
      ghost: { type: "union", list: [{ type: "const", value: null }, { type: "const", value: null }] },
    } as never;
    const out = fieldDomains(dict as never);
    assert.equal(out.get("ghost")?.options, undefined, "no non-null branch — no options key at all");
  });

  it("a plain bounded field carries min/max into its domain", () => {
    const dict = {
      steps: { type: "number", meta: { min: 4, max: 30 } },
    } as never;
    const out = fieldDomains(dict as never);
    assert.equal(out.get("steps")?.min, 4);
    assert.equal(out.get("steps")?.max, 30);
  });
});
