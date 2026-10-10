// family-param-contract.spec.ts — the params contract: bulk loader,
// sync lookup, scalar coercion, schema validation, modifier entries,
// the pre-submit gate. PHASED: the loader cache persists per module,
// so cold-cache tests run first, in order.
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";

const { apiJsonMock, getCachedCatalogMock } = vi.hoisted(() => ({
  apiJsonMock: vi.fn(),
  getCachedCatalogMock: vi.fn(),
}));
vi.mock("../src/api.ts", () => ({ apiJson: apiJsonMock }));
vi.mock("@melite/catalog", () => ({ getCachedCatalog: getCachedCatalogMock }));

import {
  assertParamsMatchFamilySchema,
  coerceParamsToSchema,
  getFamilySchema,
  isFamilySchemaCachePopulated,
  loadFamilySchemas,
  validateModifierEntries,
  validateParamsAgainstSchema,
} from "../src/familyParamContract.ts";
import type { FamilyParamSchema } from "../src/familyParamContract.ts";
import type { ModifierKindSpec } from "@melite/contracts";

const STR: FamilyParamSchema = {
  properties: {
    prompt: { type: "string" },
    steps: { type: "integer", default: 20 },
    cfg: { type: "number", default: 7.5 },
    flag: { type: "boolean" },
    tags: { type: "array" },
    opts: { type: "object" },
    anything: {},
  },
  required: ["prompt"],
  additionalProperties: false,
};

describe("loader cache phases (ordered: cold first)", () => {
  it("A1: a failing fetch rejects and clears the inflight", async () => {
    apiJsonMock.mockReset();
    apiJsonMock.mockRejectedValue(new Error("offline"));
    await assert.rejects(loadFamilySchemas(), /offline/);
    assert.equal(apiJsonMock.mock.calls.length, 1);
  });

  it("A2: cold sync lookups report empty", () => {
    assert.equal(getFamilySchema("f"), null);
    assert.equal(isFamilySchemaCachePopulated(), false);
  });

  it("A3: the gate defers when the catalog cache is unreachable", async () => {
    getCachedCatalogMock.mockImplementation(() => { throw new Error("cold"); });
    assert.deepEqual(await assertParamsMatchFamilySchema("m", { a: 1 }), { a: 1 });
  });

  it("A4: the gate defers when the catalog cache is empty", async () => {
    getCachedCatalogMock.mockReturnValue(undefined);
    assert.deepEqual(await assertParamsMatchFamilySchema("m", { a: 1 }), { a: 1 });
    // A truthy-but-modeless catalog still throws: the picker showed a ghost.
    getCachedCatalogMock.mockReturnValue({}); // no models map at all
    await assert.rejects(assertParamsMatchFamilySchema("m", { a: 1 }), /not in the catalog/);
  });

  it("A5: the gate throws when the model is not in the catalog", async () => {
    getCachedCatalogMock.mockReturnValue({ models: {}, families: {} });
    await assert.rejects(assertParamsMatchFamilySchema("ghost", {}), /not in the catalog/);
  });

  it("A6: the gate defers when the schema fetch fails", async () => {
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "f" } }, families: {} });
    apiJsonMock.mockReset();
    apiJsonMock.mockRejectedValue(new Error("offline"));
    assert.deepEqual(await assertParamsMatchFamilySchema("m", { prompt: "x" }), { prompt: "x" });
  });

  it("A7: an empty envelope loads but populates nothing", async () => {
    apiJsonMock.mockReset();
    apiJsonMock.mockResolvedValue({});
    assert.deepEqual(await loadFamilySchemas(), {});
    assert.equal(isFamilySchemaCachePopulated(), false);
  });

  it("A8: the gate defers for a family missing from an empty cache", async () => {
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "f" } }, families: {} });
    assert.deepEqual(await assertParamsMatchFamilySchema("m", { prompt: "x" }), { prompt: "x" });
    assert.equal(getFamilySchema("f"), null);
  });

  it("THE INGEST GATE (audit R-S7): a 200-lie body is refused — not cached, the gate defers to the backend", async () => {
    apiJsonMock.mockReset();
    // an error envelope parsed as JSON — a 200 with no schema index inside
    apiJsonMock.mockResolvedValue({ error: "gateway hiccup" });
    await assert.rejects(loadFamilySchemas({ force: true }), /malformed body/);
    // the cache was NEVER poisoned
    assert.equal(isFamilySchemaCachePopulated(), false);
    assert.equal(getFamilySchema("error"), null);
    // and the phantom branch stays unreachable: the gate DEFERS for a
    // REAL family instead of throwing "backend does not know"
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "f" } }, families: {} });
    assert.deepEqual(await assertParamsMatchFamilySchema("m", { prompt: "x" }), { prompt: "x" });
  });

  it("THE INGEST GATE (audit R-S7): a properties-less value is refused too", async () => {
    apiJsonMock.mockReset();
    apiJsonMock.mockResolvedValue({ f: { required: ["a"] } }); // no properties record
    await assert.rejects(loadFamilySchemas({ force: true }), /malformed body/);
    assert.equal(isFamilySchemaCachePopulated(), false);
  });

  it("B1: force loads the index, caches, and dedups inflight", async () => {
    apiJsonMock.mockReset();
    let release!: (v: unknown) => void;
    apiJsonMock.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    const p1 = loadFamilySchemas({ force: true });
    const p2 = loadFamilySchemas({ force: true });
    // NOTE: the fn is async, so p1/p2 are distinct wrappers — the dedup
    // proof is one fetch for both plus a shared resolution.
    release({ f: STR });
    assert.deepEqual(await p1, { f: STR });
    assert.deepEqual(await p2, { f: STR });
    assert.equal(apiJsonMock.mock.calls.length, 1);
    // Cached: no refetch without force.
    apiJsonMock.mockResolvedValue({ f: STR });
    assert.deepEqual(await loadFamilySchemas(), { f: STR });
    assert.equal(apiJsonMock.mock.calls.length, 1);
    assert.equal(isFamilySchemaCachePopulated(), true);
    assert.deepEqual(getFamilySchema("f"), STR);
    assert.equal(getFamilySchema("nope"), null);
    // Force refetches.
    assert.deepEqual(await loadFamilySchemas({ force: true }), { f: STR });
    assert.equal(apiJsonMock.mock.calls.length, 2);
  });

  it("B3: the gate throws for a phantom family in a populated cache", async () => {
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "ghost" } }, families: {} });
    await assert.rejects(assertParamsMatchFamilySchema("m", {}), /has no param schema/);
  });

  it("B4: the gate returns the TYPED body (null/defaults omitted)", async () => {
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "f" } } });
    const out = await assertParamsMatchFamilySchema("m", {
      prompt: "hi",
      steps: null, // defaulted -> omitted (never POST a null numerics refuse)
      cfg: "7.5", // canonical numeric string -> number
      loras: "x", // unknown key, but additionalProperties is false...
    });
    // loras IS wire-relaxed, so it passes through untouched.
    assert.deepEqual(out, { prompt: "hi", cfg: 7.5, loras: "x" });
  });

  it("B5: the gate throws listing every violation", async () => {
    getCachedCatalogMock.mockReturnValue({ models: { m: { family: "f" } } });
    try {
      await assertParamsMatchFamilySchema("m", { prompt: "x", steps: "abc", bogus: 1 });
      assert.fail("should throw");
    } catch (e) {
      const msg = (e as Error).message;
      assert.match(msg, /'f' family signature/);
      assert.match(msg, /steps/);
      assert.match(msg, /bogus/);
    }
  });

  it("B6: modifier violations throw through the gate with the raw draft", async () => {
    getCachedCatalogMock.mockReturnValue({
      models: { m: { family: "f" } },
      families: { f: { modifiers: [{ kind: "lora", param_key: "loras", cardinality: "list", fields: [] }] } },
    });
    await assert.rejects(
      assertParamsMatchFamilySchema("m", { prompt: "x", loras: "not-a-list" }),
      /expected a list of entries/,
    );
  });
});

describe("coerceParamsToSchema", () => {
  it("passes exact types and the number/integer tolerance through", () => {
    const { params, violations } = coerceParamsToSchema(STR, {
      prompt: "x", steps: 3, cfg: 7, flag: true, tags: [], opts: {}, anything: null,
    });
    assert.deepEqual(violations, []);
    assert.deepEqual(params, { prompt: "x", steps: 3, cfg: 7, flag: true, tags: [], opts: {}, anything: null });
  });

  it("passes untyped fields through untouched", () => {
    const { params, violations } = coerceParamsToSchema(STR, { anything: { deep: [1] } });
    assert.deepEqual(violations, []);
    assert.deepEqual(params, { anything: { deep: [1] } });
  });

  it("omits null/UNSET for defaulted fields, keeps them otherwise", () => {
    const withDefaults = coerceParamsToSchema(STR, { steps: null, cfg: "" });
    assert.deepEqual(withDefaults.violations, []);
    assert.deepEqual(withDefaults.params, {});
    const withoutDefaults = coerceParamsToSchema(STR, { flag: null, tags: "" });
    // flag has no default: kept as null for the validator to refuse loudly.
    // tags "" IS the picker's empty-array serialization -> [].
    assert.deepEqual(withoutDefaults.params, { flag: null, tags: [] });
    // "" is UNSET for a defaultless non-string field: kept as null so the
    // validator refuses it loudly (never 0, never false).
    const unset = coerceParamsToSchema(STR, { flag: "" });
    assert.deepEqual(unset.params, { flag: null });
    const { params } = coerceParamsToSchema(STR, { flag: "false" });
    assert.deepEqual(params, { flag: false });
  });

  it("coerces canonical strings, refuses the rest", () => {
    const { params, violations } = coerceParamsToSchema(
      STR, { steps: " 4 ", cfg: "2.5", flag: "true", tags: ["a"] },
      { pathPrefix: "step#1.params" },
    );
    assert.deepEqual(violations, []);
    assert.deepEqual(params, { steps: 4, cfg: 2.5, flag: true, tags: ["a"] });
    const bad = coerceParamsToSchema(STR, {
      steps: "abc", cfg: "zzz", flag: "yes", tags: "a,b", opts: "x", prompt: 7,
    });
    assert.equal(bad.violations.length, 6);
    assert.match(bad.violations[0]!.path, /steps/);
    // Untouched originals ride along for the validator's second pass.
    assert.equal(bad.params["steps"], "abc");
  });

  it("refuses fractions for integers, non-strings for scalars, empties honestly", () => {
    const bad = coerceParamsToSchema(STR, { steps: "3.5", flag: 5, prompt: "" });
    assert.equal(bad.violations.length, 2); // prompt "" stays a string: fine
    const nan = coerceParamsToSchema(STR, { steps: "Infinitybbq" });
    assert.equal(nan.violations.length, 1);
    const inf = coerceParamsToSchema({ properties: { steps: { type: "integer" } } }, { steps: "Infinity" });
    assert.equal(inf.violations.length, 1);
    const intFromFloat = coerceParamsToSchema({ properties: { steps: { type: "integer" } } }, { steps: 3.5 });
    assert.equal(intFromFloat.violations.length, 1); // exact-type miss, non-string: no coerce
    const fn = coerceParamsToSchema(STR, { flag: (() => {}) as unknown as boolean });
    assert.match(fn.violations[0]!.message, /expected boolean, got object/);
  });

  it("treats a missing properties map as untyped", () => {
    const { params, violations } = coerceParamsToSchema({} as FamilyParamSchema, { a: 1 });
    assert.deepEqual(violations, []);
    assert.deepEqual(params, { a: 1 });
  });
});

describe("validateParamsAgainstSchema", () => {
  it("defers on an empty envelope (unknown family backstop)", () => {
    assert.deepEqual(
      validateParamsAgainstSchema({ properties: {} }, { anything: 1 }),
      [],
    );
    // A schemaless envelope (no properties map at all) defers the same way.
    assert.deepEqual(validateParamsAgainstSchema({} as FamilyParamSchema, { a: 1 }), []);
  });

  it("flags unknown keys unless wire-relaxed, with an optional prefix", () => {
    const v = validateParamsAgainstSchema(STR, { bogus: 1, loras: [], prompt: "x" }, { pathPrefix: "p" });
    assert.equal(v.length, 1);
    assert.equal(v[0]!.path, "p.bogus");
    const open: FamilyParamSchema = { properties: { a: { type: "string" } } };
    assert.deepEqual(validateParamsAgainstSchema(open, { b: 1 }), []);
  });

  it("flags nulls without defaults and type mismatches, tolerating the rest", () => {
    const v = validateParamsAgainstSchema(STR, {
      prompt: "x", steps: null, flag: null, cfg: 1, tags: "s", noType: 1,
    });
    const paths = v.map((x) => x.path).sort();
    assert.deepEqual(paths, ["flag", "noType", "tags"]);
    // steps null rides its default; cfg 1 rides the number/integer tolerance.
  });

  it("passes untyped declared fields", () => {
    assert.deepEqual(validateParamsAgainstSchema(STR, { anything: 5 }), []);
  });
});

describe("validateModifierEntries", () => {
  // Fixtures stated against the real contract type — the object
  // literal's widened `kind: string` never reaches the param.
  // Options ride the contract's own shape ({value,label} — no
  // number/null members: the openapi ModifierOption is closed).
  const loraKind: ModifierKindSpec = {
    kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list",
    fields: [{ name: "id", type: "string" }, { name: "strength", type: "float", default: 1, min: 0, max: 2 }],
    options: [{ value: "a", label: "A" }, { value: "b", label: "B" }],
  };
  it("no-ops without kinds and without mods", () => {
    assert.deepEqual(validateModifierEntries(null, {}), []);
    assert.deepEqual(validateModifierEntries(undefined, {}), []);
    assert.deepEqual(validateModifierEntries([], { loras: [] }), []);
    assert.deepEqual(validateModifierEntries([loraKind], {}), []);
    assert.deepEqual(validateModifierEntries([loraKind], { loras: null }), []);
    // A kind declaring neither cardinality nor fields rides the
    // defaults. fields is contract-required but the source tolerates
    // its absence (defensive against backend rows) — this row rides
    // the wide side ON PURPOSE to keep that tolerance arm measured.
    assert.deepEqual(validateModifierEntries([{ kind: "x", label: "X", param_key: "xs" } as unknown as ModifierKindSpec], { xs: [{}] }), []);
  });

  it("gates cardinality strictly", () => {
    const scalar: ModifierKindSpec = { kind: "s", label: "S", param_key: "s", cardinality: "scalar", fields: [] };
    const scalarNamed: ModifierKindSpec = { kind: "s", label: "S", param_key: "s", cardinality: "scalar", fields: [{ name: "v", type: "string" }] };
    const scalarAnon: ModifierKindSpec = { kind: "s", label: "S", param_key: "s", cardinality: "scalar", fields: [{ name: "", type: "string" }] };
    assert.match(validateModifierEntries([scalar], { s: {} })[0]!.message, /scalar.*got object/);
    assert.match(validateModifierEntries([scalar], { s: [1] })[0]!.message, /scalar.*got array/);
    assert.deepEqual(validateModifierEntries([scalar], { s: "x" }), []);
    assert.deepEqual(validateModifierEntries([scalarNamed], { s: "x" }), []);
    assert.deepEqual(validateModifierEntries([scalarAnon], { s: "x" }), []);
    assert.match(validateModifierEntries([loraKind], { loras: "x" })[0]!.message, /expected a list/);
  });

  it("gates max_stack and entry shapes", () => {
    const capped = { ...loraKind, max_stack: 1 };
    assert.match(
      validateModifierEntries([capped], { loras: [{ id: "a" }, { id: "a" }] })[0]!.message,
      /max_stack/,
    );
    assert.deepEqual(validateModifierEntries([capped], { loras: [{ id: "a" }] }), []);
    const noCap = { ...loraKind, max_stack: undefined, fields: [] };
    assert.deepEqual(validateModifierEntries([noCap], { loras: [{}] }), []);
    const badEntries = validateModifierEntries([loraKind], { loras: ["x", ["y"], null, 5] });
    assert.equal(badEntries.length, 4);
    assert.match(badEntries[1]!.message, /got array/);
  });

  it("flags unknown entry keys but honors editor bookkeeping", () => {
    const v = validateModifierEntries([loraKind], {
      loras: [{ id: "a", strength: 1, value: 1, model: "m", preprocessor: "p", enabled: true, source: "s", typo: 1 }],
    });
    assert.equal(v.length, 1);
    assert.match(v[0]!.path, /typo/);
  });

  it("requires fields unless defaulted, image, or artifact", () => {
    const kinds = [{
      kind: "k", label: "K", param_key: "ks", cardinality: "list" as const,
      fields: [
        { name: "req", type: "string" as const },
        { name: "opt", type: "string" as const, default: "d" },
        { name: "img", type: "image" as const },
        { name: "artifact", type: "string" as const },
      ],
    }] satisfies ModifierKindSpec[];
    const v = validateModifierEntries(kinds, { ks: [{}] });
    assert.equal(v.length, 1);
    assert.match(v[0]!.path, /req/);
    // Explicit null/undefined counts as missing but never double-flags.
    const v2 = validateModifierEntries(kinds, { ks: [{ req: null, opt: undefined }] });
    assert.equal(v2.length, 1);
    // Image presence alone satisfies (no wire rules on conditioning).
    assert.deepEqual(validateModifierEntries(kinds, { ks: [{ req: "r", img: "blob" }] }), []);
    // A nameless declared field declares nothing: skipped, never
    // required (the contract demands a name; the empty string rides
    // the function's own falsy-name skip).
    const nameless = [{
      kind: "k", label: "K", param_key: "ks", cardinality: "list" as const,
      fields: [{ name: "", type: "string" as const, default: "d" }],
    }] satisfies ModifierKindSpec[];
    assert.deepEqual(validateModifierEntries(nameless, { ks: [{}] }), []);
  });

  it("gates numeric bounds and types", () => {
    const num: ModifierKindSpec = {
      kind: "n", label: "N", param_key: "ns", cardinality: "list",
      fields: [
        { name: "i", type: "integer", min: 0, max: 10 },
        { name: "fl", type: "float" },
        { name: "plain", type: "integer" },
      ],
    };
    assert.deepEqual(validateModifierEntries([num], { ns: [{ i: 5, fl: 0.5, plain: 1 }] }), []);
    const v = validateModifierEntries([num], { ns: [{ i: "x", fl: 1, plain: 1 }] });
    assert.match(v[0]!.message, /expected a number/);
    const v2 = validateModifierEntries([num], { ns: [{ i: 1.5, fl: 1, plain: 1 }] });
    assert.match(v2[0]!.message, /expected an integer/);
    assert.match(validateModifierEntries([num], { ns: [{ i: -1, fl: 1, plain: 1 }] })[0]!.message, /minimum/);
    assert.match(validateModifierEntries([num], { ns: [{ i: 11, fl: 1, plain: 1 }] })[0]!.message, /maximum/);
  });

  it("gates booleans, strings, and adapter membership", () => {
    const kinds = [{
      kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list" as const,
      fields: [
        { name: "id", type: "string" as const },
        { name: "on", type: "boolean" as const },
        { name: "note", type: "string" as const },
      ],
      options: [{ value: "a", label: "A" }],
    }];
    assert.deepEqual(validateModifierEntries(kinds, { loras: [{ id: "a", on: true, note: "n" }] }), []);
    assert.match(validateModifierEntries(kinds, { loras: [{ id: "zzz", on: true, note: "n" }] })[0]!.message, /unknown adapter/);
    assert.match(validateModifierEntries(kinds, { loras: [{ id: "a", on: "yes", note: "n" }] })[0]!.message, /expected a boolean/);
    assert.match(validateModifierEntries(kinds, { loras: [{ id: "a", on: true, note: 5 }] })[0]!.message, /expected a string/);
    // Upload-dir kinds are disk-driven: any id is legal. Option-less kinds skip too.
    const up = [{ ...kinds[0]!, upload_dir: "loras" }];
    assert.deepEqual(validateModifierEntries(up, { loras: [{ id: "custom", on: true, note: "n" }] }), []);
    const bare = [{ ...kinds[0]!, options: [] }];
    assert.deepEqual(validateModifierEntries(bare, { loras: [{ id: "custom", on: true, note: "n" }] }), []);
    // Controlnet kinds resolve through the model gate — never double-flagged.
    const cn = [{ ...kinds[0]!, kind: "controlnet" }];
    assert.deepEqual(validateModifierEntries(cn, { loras: [{ id: "custom", on: true, note: "n" }] }), []);
  });

  it("gates select membership (field options, then kind options)", () => {
    const kinds = [{
      kind: "sampler", label: "Sampler", param_key: "s", cardinality: "list" as const,
      fields: [{ name: "pick", type: "select" as const, options: ["a", "b"] }],
    }] satisfies ModifierKindSpec[];
    assert.deepEqual(validateModifierEntries(kinds, { s: [{ pick: "a" }] }), []);
    assert.match(validateModifierEntries(kinds, { s: [{ pick: "z" }] })[0]!.message, /unknown option/);
    assert.match(validateModifierEntries(kinds, { s: [{ pick: 5 }] })[0]!.message, /expected a string/);
    const kindBacked = [{
      kind: "lora", label: "LoRA", param_key: "loras", cardinality: "list" as const,
      fields: [{ name: "pick", type: "select" as const }],
      options: [{ value: "a", label: "A" }],
    }] satisfies ModifierKindSpec[];
    const base: ModifierKindSpec = kindBacked[0]!;
    assert.deepEqual(validateModifierEntries([base], { loras: [{ pick: "a" }] }), []);
    assert.match(validateModifierEntries([base], { loras: [{ pick: "z" }] })[0]!.message, /unknown option/);
    const up: ModifierKindSpec[] = [{ ...base, upload_dir: "d" }];
    assert.deepEqual(validateModifierEntries(up, { loras: [{ pick: "z" }] }), []);
    const cn: ModifierKindSpec[] = [{ ...base, kind: "controlnet" }];
    assert.deepEqual(validateModifierEntries(cn, { loras: [{ pick: "z" }] }), []);
    const bare: [] = [];
    assert.deepEqual(validateModifierEntries(bare, { loras: [{ pick: "z" }] }), []);
  });
});
