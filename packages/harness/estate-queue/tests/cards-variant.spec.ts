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
    const only = row({ variants: [{ id: "recipe", group: "Recipe", cells: [{ quant: "fp8" }] }] });
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
      .toThrow(/the variant declares no cells/);
  });
  it("a non-string quant refuses with the type voice", () => {
    expect(() => selectCardVariant("m", row(), { quant: 7 }, "1")).toThrow(/quant must be a string \(got number\)/);
    expect(() => selectCardVariant("m", row(), { quant: ["x"] }, "1")).toThrow(/quant must be a string \(got list\)/);
  });
  it("an unknown quant refuses with the known cells; a cell-less variant names the absence", () => {
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
      expect((e as Error).message).toMatch(/the variant declares no cells/);
    }
  });
  it("a legal quant lands its cell", () => {
    expect(selectCardVariant("m", row(), { quant: "fp8" }, "1").quant).toBe("fp8");
  });
  it("absent keys toll their fallbacks (cells key off, quant-less first cell, defaults off)", () => {
    const bare = row({ variants: [{ id: "bare" }, { id: "objcell", cells: [{}] }] });
    // cells key ABSENT + explicit quant -> the empty-cells refusal
    expect(() => selectCardVariant("m", bare, { variant: "bare", quant: "q" }, "1"))
      .toThrow(/declares no cells/);
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
    const bare2 = row({ defaults: undefined, variants: [{ id: "bare" }] });
    const out = stampCardOverlay({}, bare2, decl(), selectCardVariant("m", bare2, {}, "1"));
    expect(Object.keys(out)).toEqual([]);
  });
});

describe("stampCardOverlay (the route-lens overlay)", () => {
  const sel = selectCardVariant("m", row(), {}, "1");
  it("absent keys receive family defaults + resolver defaults; present keys never restamp", () => {
    const out = stampCardOverlay({ width: 512 }, row(), decl(), sel);
    expect(out["width"]).toBe(512, "the body's own value wins");
    expect(out["seed"]).toBe(42);
    expect(out["ckpt"]).toBe("base.safetensors");
  });
  it("null/undefined/'' stamps never ride (UNSET markers)", () => {
    const out = stampCardOverlay({}, row(), decl(), sel);
    expect("notes" in out).toBe(false);
  });
  it("off-surface keys never ride (schema + admits lens)", () => {
    const r = row({ defaults: { seed: 42, hidden_knob: 1, image_extra: 2, exact_admit: 3 } });
    const d = decl({ admits: ["image_*", "exact_admit"] });
    const out = stampCardOverlay({}, r, d, sel);
    expect("hidden_knob" in out).toBe(false);
    expect(out["image_extra"]).toBe(2, "the trailing-* admit matches its prefix");
    expect(out["exact_admit"]).toBe(3, "an exact admit matches itself");
  });
  it("envelope keys never stamp", () => {
    const r = row({ defaults: { flow: "x", draft_id: "y", test: true, service: "z", yaml: "a", model: "b", flow_inline: "c" } });
    const out = stampCardOverlay({}, r, decl({ schemaNames: ["flow", "draft_id", "test", "service", "yaml", "model", "flow_inline"] }), sel);
    for (const k of ["flow", "draft_id", "test", "service", "yaml", "model", "flow_inline"]) {
      expect(k in out).toBe(false, k + " is gateway envelope, never a stamp");
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
      { id: "base", group: "", cells: [{ quant: "fp16" }], resolver_defaults: { ckpt: "base.safetensors" } },
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
      stampCardOverlay({ steps: 25, cfg: 4.5 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel);
      throw new Error("no refusal rode");
    } catch (e) {
      expect(e).toBeInstanceOf(CardArmError);
      const msg = String((e as Error).message);
      expect(msg).toContain("turbo");
      expect(msg).toContain("steps 25");
      expect(msg).toContain("[4, 8]");
      expect(msg).toContain("married to steps 8");
    }
  });

  it("a stated steps/cfg INSIDE the envelope rides (agency preserved)", () => {
    const out = stampCardOverlay({ steps: 6 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel);
    expect(out["steps"]).toBe(6, "the caller's in-envelope value wins");
  });

  it("cfg walls on its own axis; absent statements never refuse", () => {
    expect(() => stampCardOverlay({ cfg: 9 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel)).toThrow(CardArmError);
    expect(() => stampCardOverlay({}, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel)).not.toThrow();
  });

  it("boundary values are IN (closed bounds); non-numeric junk never walls", () => {
    expect(() => stampCardOverlay({ steps: 8, cfg: 1 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel)).not.toThrow();
    expect(() => stampCardOverlay({ steps: 4 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel)).not.toThrow();
    expect(() => stampCardOverlay({ steps: "later" }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), sel)).not.toThrow();
  });

  it("a variant with NO envelope never refuses (opt-in per route)", () => {
    const bare = selectCardVariant("m", turboRow, { variant: "base" }, "1");
    expect(() => stampCardOverlay({ steps: 25 }, turboRow, decl({ schemaNames: ["steps", "cfg"] }), bare)).not.toThrow();
  });
});
