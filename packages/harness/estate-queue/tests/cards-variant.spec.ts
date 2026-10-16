// cards-variant.spec.ts — the variant/quant selection + stamp +
// lift coordinate math, every arm (pure functions, crafted
// rows — the refusal voices pinned once here so the registry's
// happy paths stay thin).
import { describe, it, expect } from "vitest";
import {
  selectCardVariant,
  stampCardOverlay,
  liftCardParams,
} from "../src/cardsVariant.ts";
import type { ModelFactsRow, CardDeclRow } from "../src/cardsFacts.ts";
import { CardArmError } from "../src/cardsArmError.ts";

/** The family the stamp fold scopes by (audit Z-S1: the sixth
 *  arg is the door's signature; this fiber never boots the models
 *  service, so the fold degrades to knobs+admits either way — the
 *  booted-fold verdict is the registry spec's, this one pins the
 *  shape law). */
const FAM = "z-image";

const row = (over: Partial<ModelFactsRow> = {}): ModelFactsRow => ({
  variants: [
    { id: "recipe", group: "Recipe", cells: [{ quant: "fp8" }], resolver_defaults: { ckpt: "recipe.safetensors" } },
    { id: "base", group: "", cells: [{ quant: "fp16" }, { quant: "fp8" }], resolver_defaults: { ckpt: "base.safetensors", width: 1024 } },
    { id: "turbo", route: "turbo-route", cells: [], resolver_defaults: {} },
  ],
  defaults: { seed: 42, notes: "" },
  ...over,
} as unknown as ModelFactsRow);

const decl = (over: Partial<CardDeclRow> = {}): CardDeclRow => ({
  schemaNames: ["ckpt", "width", "seed", "notes"],
  admits: ["image_*"],
  spells: [],
  ...over,
} as unknown as CardDeclRow);

describe("selectCardVariant (the R1 wire contract)", () => {
  it("unstated coordinates fall to the FIRST non-Recipe variant + first cell", () => {
    const sel = selectCardVariant("m", row(), {}, "1");
    expect(sel.variantId).toBe("base");
    expect(sel.quant).toBe("fp16");
    expect(sel.resolverDefaults).toEqual({ ckpt: "base.safetensors", width: 1024 });
  });
  it("a Recipe-only family falls back to the Recipe variant itself", () => {
    const only = row({ variants: [{ id: "recipe", group: "Recipe", route: "", resolver_defaults: {}, cells: [{ quant: "fp8", route: "" }] }] });
    const sel = selectCardVariant("m", only, {}, "1");
    expect(sel.variantId).toBe("recipe");
  });
  it("an explicit variant matches id OR route; unstated quant takes the first cell", () => {
    expect(selectCardVariant("m", row(), { variant: "turbo" }, "1").variantId).toBe("turbo");
    expect(selectCardVariant("m", row(), { variant: "turbo-route" }, "1").variantId).toBe("turbo");
    const sel = selectCardVariant("m", row(), { variant: "base" }, "1");
    expect(sel.quant).toBe("fp16");
  });
  it("null coordinates ride the unstated arm; a cell-less variant leaves quant empty", () => {
    const sel = selectCardVariant("m", row(), { variant: null, quant: null }, "1");
    expect(sel.variantId).toBe("base");
    const noCells = selectCardVariant("m", row(), { variant: "turbo" }, "1");
    expect(noCells.quant).toBe("");
  });
  it("a non-string variant refuses with the type voice (list and scalar)", () => {
    for (const bad of [7, ["a"]]) {
      expect(() => selectCardVariant("m", row(), { variant: bad }, "2"))
        .toThrow(CardArmError);
      try {
        selectCardVariant("m", row(), { variant: bad }, "2");
        expect.unreachable(); // (the re-audit, 2026-10-16): without
        // this, a non-throwing call ran zero assertions in the try
      } catch (e) {
        expect((e as Error).message).toMatch(/variant must be a string/);
      }
    }
    expect(() => selectCardVariant("m", row(), { variant: ["a"] }, "2")).toThrow(/got list/);
    expect(() => selectCardVariant("m", row(), { variant: 7 }, "2")).toThrow(/got number/);
  });
  it("an unknown variant refuses LOUD with the known ids", () => {
    try {
      selectCardVariant("m", row(), { variant: "ghost" }, "1");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CardArmError);
      expect((e as Error).message).toMatch(/unknown variant "ghost"/);
      expect((e as Error).message).toMatch(/known: recipe, base, turbo/);
    }
  });
  it("a variant-less family selects empty coordinates; an explicit quant still refuses", () => {
    const sel = selectCardVariant("m", row({ variants: undefined }), {}, "1");
    expect(sel.variantId).toBe("");
    expect(sel.quant).toBe("");
    expect(() => selectCardVariant("m", row({ variants: undefined }), { quant: "fp8" }, "1"))
      .toThrow(/the served matrix declares no cells for this variant/);
  });
  it("a non-string quant refuses with the type voice", () => {
    expect(() => selectCardVariant("m", row(), { quant: 7 }, "1")).toThrow(/quant must be a string \(got number\)/);
    expect(() => selectCardVariant("m", row(), { quant: ["x"] }, "1")).toThrow(/quant must be a string \(got list\)/);
  });
  it("an unknown quant refuses with the known cells; a cell-less variant names the projection break", () => {
    try {
      selectCardVariant("m", row(), { quant: "q4" }, "1");
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/unknown quant "q4"/);
      expect((e as Error).message).toMatch(/known: fp16, fp8/);
    }
    try {
      selectCardVariant("m", row(), { variant: "turbo", quant: "q4" }, "1");
      expect.unreachable();
    } catch (e) {
      // the honest voice (the axis-unification cure): the door's row
      // is the projection it read — it names the matrix it holds and
      // the sync break, never a DECL fact.
      expect((e as Error).message).toMatch(/the served matrix declares no cells for this variant — DECL\/projection sync break/);
    }
  });
  it("hidden variants and cells never enter the offered coordinate space", () => {
    const hidden = row({
      variants: [
        { id: "legacy", group: "", hide_from_dropdown: true, route: "legacy-route", resolver_defaults: {}, cells: [{ quant: "fp8", route: "" }] },
        { id: "base", group: "", route: "", resolver_defaults: {}, cells: [{ quant: "fp16", route: "" }, { quant: "bf16", route: "", hide_from_dropdown: true }, { quant: "fp8", route: "" }] },
      ],
    });
    expect(selectCardVariant("m", hidden, {}, "1").variantId).toBe("base");
    expect(selectCardVariant("m", hidden, {}, "1").quant).toBe("fp16");
    expect(() => selectCardVariant("m", hidden, { variant: "legacy" }, "1")).toThrow(/not offered/);
    expect(() => selectCardVariant("m", hidden, { variant: "legacy-route" }, "1")).toThrow(/not offered/);
    expect(() => selectCardVariant("m", hidden, { variant: "base", quant: "bf16" }, "1")).toThrow(/unknown quant/);
    expect(() => selectCardVariant("legacy-route", hidden, {}, "1")).toThrow(/not offered/);
  });
  it("a family with only hidden variants refuses instead of selecting none", () => {
    const allHidden = row({ variants: [{ id: "hidden", group: "", hide_from_dropdown: true, route: "", resolver_defaults: {}, cells: [{ quant: "fp8", route: "" }] }] });
    expect(() => selectCardVariant("m", allHidden, {}, "1")).toThrow(/has no offered variants/);
  });

  it("a legal quant lands its cell", () => {
    expect(selectCardVariant("m", row(), { quant: "fp8" }, "1").quant).toBe("fp8");
  });
  it("absent keys toll their fallbacks (cells key off, quant-less first cell, defaults off)", () => {
    const bare = row({ variants: [
      { id: "bare", group: "", route: "", resolver_defaults: {}, cells: [] },
      { id: "objcell", group: "", route: "", resolver_defaults: {}, cells: [{ quant: "", route: "" }] },
    ] });
    // cells key ABSENT-or-empty + explicit quant -> the empty-cells refusal
    expect(() => selectCardVariant("m", bare, { variant: "bare", quant: "q" }, "1"))
      .toThrow(/declares no cells for this variant/);
    // a cell with NO quant key tolls the empty string
    expect(selectCardVariant("m", bare, { variant: "objcell" }, "1").quant).toBe("");
    // the unknown-variant refusal on a variants-less row tolls the
    // empty known list
    try {
      selectCardVariant("m", row({ variants: undefined }), { variant: "ghost" }, "1");
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/\(known: \)/);
    }
    // a defaults-less, resolver-less family stamps nothing
    const bare2 = row({ defaults: undefined, variants: [{ id: "bare", group: "", route: "", resolver_defaults: {}, cells: [] }] });
    const out = stampCardOverlay({}, bare2, decl(), selectCardVariant("m", bare2, {}, "1"), "1", FAM);
    expect(Object.keys(out)).toEqual([]);
  });
  it("normalizes malformed, reversed, and one-axis envelopes", () => {
    const malformed = row({
      variants: [{
        id: "bad", group: "", cells: [], resolver_defaults: {},
        sampler_envelope: { steps: [1], cfg: [2, 1] },
      } as never],
    });
    expect(selectCardVariant("m", malformed, { variant: "bad" }, "1").samplerEnvelope)
      .toBeNull();
    const onlySteps = row({
      variants: [{
        id: "steps", group: "", cells: [], resolver_defaults: {},
        sampler_envelope: { steps: [1, 2], cfg: "bad" },
      } as never],
    });
    expect(selectCardVariant("m", onlySteps, { variant: "steps" }, "1").samplerEnvelope)
      .toEqual({ steps: [1, 2], cfg: undefined });
    const onlyCfg = row({
      variants: [{
        id: "cfg", group: "", cells: [], resolver_defaults: {},
        sampler_envelope: { steps: "bad", cfg: [1, 2] },
      } as never],
    });
    expect(selectCardVariant("m", onlyCfg, { variant: "cfg" }, "1").samplerEnvelope)
      .toEqual({ steps: undefined, cfg: [1, 2] });
  });
});

describe("stampCardOverlay (the route-lens overlay)", () => {
  const sel = selectCardVariant("m", row(), {}, "1");
  it("absent keys receive family defaults + resolver defaults; present keys never restamp", () => {
    const out = stampCardOverlay({ width: 512 }, row(), decl(), sel, "1", FAM);
    expect(out["width"]).toBe(512);
    expect(out["seed"]).toBe(42);
    expect(out["ckpt"]).toBe("base.safetensors");
  });
  it("null/undefined/'' stamps never ride (UNSET markers)", () => {
    const out = stampCardOverlay({}, row(), decl(), sel, "1", FAM);
    expect("notes" in out).toBe(false);
  });
  it("off-surface keys never ride (schema + admits lens)", () => {
    const r = row({ defaults: { seed: 42, hidden_knob: 1, image_extra: 2, exact_admit: 3 } });
    const d = decl({ admits: ["image_*", "exact_admit"] });
    const out = stampCardOverlay({}, r, d, sel, "1", FAM);
    expect("hidden_knob" in out).toBe(false);
    expect(out["image_extra"]).toBe(2);
    expect(out["exact_admit"]).toBe(3);
  });
  it("envelope keys never stamp", () => {
    const r = row({ defaults: { flow: "x", draft_id: "y", test: true, service: "z", yaml: "a", model: "b", flow_inline: "c" } });
    const out = stampCardOverlay({}, r, decl({ schemaNames: ["flow", "draft_id", "test", "service", "yaml", "model", "flow_inline"] }), sel, "1", FAM);
    for (const k of ["flow", "draft_id", "test", "service", "yaml", "model", "flow_inline"]) {
      expect(k in out).toBe(false);
    }
  });
});

describe("liftCardParams (the params stanza)", () => {
  it("envelope + variant/quant ride OUT; everything else rides in", () => {
    const out = liftCardParams({
      flow: "f", model: "m", yaml: "y", flow_inline: "fi", draft_id: "d",
      test: true, service: "s", variant: "base", quant: "fp8",
      seed: 7, notes: "keep",
    });
    expect(out).toEqual({ seed: 7, notes: "keep" });
  });
  it("the stanza fills what siblings leave out (siblings win, gaps fill)", () => {
    const out = liftCardParams({
      text: "sibling",
      params: { text: "inner", style: "gentle" },
    });
    // the sibling text wins; the stanza's ABSENT-everywhere key rides
    expect(out).toEqual({ text: "sibling", style: "gentle" });
  });
});

// THE EDGE SEATS (the coverage queue's cardsVariant batch,
// 2026-10-16): a family with NO variant rows at all, and a hidden
// row that matches nothing — both are real estate shapes (the
// model-base packs declare empty variants arrays; a hidden route
// next to an offered one is the dropdown's everyday layout). The
// rows are runtime-minimal ON PURPOSE (the arms prove the ?? legs
// fire when a member is absent), so they ride the same wholesale
// cast as the default `row()` above — the type stays ModelFactsRow.
const vrow = (variants: unknown[]): ModelFactsRow =>
  ({ variants, defaults: { seed: 42, notes: "" } }) as unknown as ModelFactsRow;

describe("selectCardVariant (the edge seats)", () => {
  it("a hidden row that matches NOTHING evaluates past the hidden gate (no refusal)", () => {
    const withHidden = vrow([
      { id: "base", group: "", cells: [{ quant: "fp16" }], resolver_defaults: {} },
      { id: "ghost", hide_from_dropdown: true, route: "ghost-route", cells: [], resolver_defaults: {} },
    ]);
    // mid "m" names no hidden route/id/cell — the hidden gate reads
    // the row and falls through to normal selection
    const sel = selectCardVariant("m", withHidden, {}, "1");
    expect(sel.variantId).toBe("base");
    expect(sel.quant).toBe("fp16");
  });
  it("a variants-less family returns the unstated selection with empty coordinates", () => {
    const sel = selectCardVariant("m", vrow([]), {}, "1");
    // THE CELL SEAT (the size-at-quant fold, operator 2026-10-26):
    // the selection carries the cell's compose address + surface
    // (cellRoute/cellParams) — no variant row means no cell either,
    // so the address is empty, never a neighbor's route.
    expect(sel).toEqual({
      variantId: "", variantRoute: "", quant: "",
      cellRoute: "", cellParams: undefined,
      resolverDefaults: {}, samplerEnvelope: null,
    });
  });
  it("a variants-less family with a stated quant refuses naming the empty variant", () => {
    try {
      selectCardVariant("m", vrow([]), { quant: "fp8" }, "1");
      throw new Error("no refusal rode");
    } catch (e) {
      expect(e).toBeInstanceOf(CardArmError);
      const msg = String((e as Error).message);
      // the voice names the empty variant seat ("" — no row exists)
      expect(msg).toContain('quant "fp8"');
      expect(msg).toContain('variant ""');
    }
  });
  // the NULLISH seats: a variant row may omit cells and
  // resolver_defaults entirely (the model-base shape) — every read
  // coalesces, and a cell row may omit quant (the first cell leaves
  // quant empty rather than "undefined")
  it("a variant omitting cells + resolver_defaults selects with empty coordinates", () => {
    const bare = vrow([{ id: "bare", group: "" }]);
    const sel = selectCardVariant("m", bare, {}, "1");
    // THE CELL SEAT (the size-at-quant fold, operator 2026-10-26):
    // omitted cells/resolver_defaults coalesce — the selection still
    // carries the cell seat empty (no route, no surface, no stamps).
    expect(sel).toEqual({
      variantId: "bare", variantRoute: "", quant: "",
      cellRoute: "", cellParams: undefined,
      resolverDefaults: {}, samplerEnvelope: null,
    });
    // the same bare row with a STATED quant refuses (no cells to hit)
    try {
      selectCardVariant("m", bare, { quant: "fp8" }, "1");
      throw new Error("no refusal rode");
    } catch (e) {
      expect(e).toBeInstanceOf(CardArmError);
    }
  });
  it("a first cell omitting quant leaves the selection's quant empty", () => {
    const sel = selectCardVariant("m", vrow([{ id: "cq", group: "", cells: [{}], resolver_defaults: {} }]), {}, "1");
    expect(sel.variantId).toBe("cq");
    expect(sel.quant).toBe("");
  });
});

// THE ROUTE ENVELOPE (the skill-system rework wave 2, 2026-09-21 —
// the 25-steps-into-turbo cure): a variant that owns a distilled
// lane DECLARES its sampler envelope; a caller that hand-stamps a
// steps/cfg outside it refuses LOUD at compose — the garbage
// marriage never reaches the queue. Inside the envelope is agency;
// outside is refusal.
describe("THE ROUTE ENVELOPE (compose-side guard)", () => {
  const turboEnv = { steps: [4, 8], cfg: [1, 2] };
  const turboRow = row({
    variants: [
      { id: "base", group: "", route: "", cells: [{ quant: "fp16", route: "" }], resolver_defaults: { ckpt: "base.safetensors" } },
      {
        id: "turbo", route: "turbo-route", cells: [], resolver_defaults: { steps: 8, cfg: 1 },
        sampler_envelope: turboEnv,
      } as never,
    ],
  });
  const sel = selectCardVariant("krea-2", turboRow, { variant: "turbo" }, "1");

  it("carries the envelope on the SELECTION (the stamp gate reads it)", () => {
    expect(sel.samplerEnvelope).toEqual(turboEnv);
    expect(sel.variantRoute).toBe("turbo-route");
  });

  it("a stated steps OUTSIDE the envelope REFUSES naming route + marriage", () => {
    try {
      stampCardOverlay({ steps: 25, cfg: 4.5 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM);
      throw new Error("no refusal rode");
    } catch (e) {
      expect(e).toBeInstanceOf(CardArmError);
      const msg = String((e as Error).message);
      expect(msg).toContain("turbo");
      expect(msg).toContain("steps 25");
      expect(msg).toContain("[4, 8]");
      expect(msg).toContain("married to steps 8");
      // the full voice, pinned exactly (the frame change of the
      // voice audit: the envelope arm joins the phase law)
      expect(msg).toBe(
        'card_compose phase 1: stated steps 25 is OUTSIDE the route envelope for variant "turbo"'
        + ' (route turbo-route) — the declared envelope is [4, 8]'
        + ' and the lane is married to steps 8.'
        + ' The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.'
        + ' (Read the family lane: melite_skill_read model:<family>.)',
      );
    }
  });

  it("a stated steps/cfg INSIDE the envelope rides (agency preserved)", () => {
    const out = stampCardOverlay({ steps: 6 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM);
    expect(out["steps"]).toBe(6);
  });

  it("cfg walls on its own axis; absent statements never refuse", () => {
    expect(() => stampCardOverlay({ cfg: 9 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM)).toThrow(CardArmError);
    expect(() => stampCardOverlay({}, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM)).not.toThrow();
  });

  it("boundary values are IN (closed bounds); non-numeric junk never walls", () => {
    expect(() => stampCardOverlay({ steps: 8, cfg: 1 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM)).not.toThrow();
    expect(() => stampCardOverlay({ steps: 4 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM)).not.toThrow();
    expect(() => stampCardOverlay({ steps: "later" }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel, "1", FAM)).not.toThrow();
  });

  it("a variant with NO envelope never refuses (opt-in per route)", () => {
    const bare = selectCardVariant("m", turboRow, { variant: "base" }, "1");
    expect(() => stampCardOverlay({ steps: 25 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), bare, "1", FAM)).not.toThrow();
  });

  it("skips an absent bound and refuses a routeless, unmarried variant", () => {
    const open = row({
      variants: [{
        id: "open", route: "", cells: [], resolver_defaults: {},
        sampler_envelope: { cfg: [1, 2] },
      } as never],
    });
    const sel = selectCardVariant("m", open, { variant: "open" }, "1");
    try {
      stampCardOverlay({ cfg: 9 }, open, decl({ schemaNames: ["cfg"] }), sel, "1", FAM);
      expect.unreachable();
    } catch (e) {
      const message = String((e as Error).message);
      expect(message).toContain("cfg 9");
      expect(message).not.toContain(" (route ");
      expect(message).not.toContain("married to");
    }
  });
});
