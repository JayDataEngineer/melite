// catalog-contract.spec.ts — the catalog contract validator: the shape
// gate, the records gate, the family/model/capability entry gates, and
// the error shape.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  CatalogContractError,
  validateCatalogContract,
} from "../src/catalogContract.ts";
import type {
  CatalogContractResult,
  CatalogViolation,
} from "../src/catalogContract.ts";

const fam = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  label: "Fam",
  ...over,
});
const mod = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  family: "f",
  form: "form_generate",
  label: "M",
  ...over,
});
const cat = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  families: { f: fam() },
  models: { m: mod() },
  ...over,
});

describe("CatalogContractError", () => {
  it("names the first violation, or unknown when empty", () => {
    const e = new CatalogContractError([
      { kind: "f", message: "boom" },
    ] as CatalogViolation[]);
    assert.equal(e.name, "CatalogContractError");
    assert.match(e.message, /boom/);
    assert.equal(e.violations.length, 1);
    const empty = new CatalogContractError([]);
    assert.match(empty.message, /unknown/);
  });
});

describe("validateCatalogContract shape gate", () => {
  it("refuses non-objects as error bodies", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      const r: CatalogContractResult = validateCatalogContract(bad);
      assert.equal(r.valid, false);
      assert.equal(r.violations.length, 1);
      assert.equal(r.violations[0].kind, "catalog");
    }
  });

  it("requires the families + models records", () => {
    const none = validateCatalogContract({});
    assert.equal(none.valid, false);
    assert.ok(none.violations.some((v) => v.message.includes("families")));
    assert.ok(none.violations.some((v) => v.message.includes("models")));
    const noModels = validateCatalogContract({ families: {} });
    assert.equal(noModels.valid, false);
    const badCaps = validateCatalogContract(
      cat({ capabilities: ["not", "a", "record"] }),
    );
    assert.equal(badCaps.valid, false);
    assert.ok(badCaps.violations.some((v) => v.message.includes("capabilities")));
    const ok = validateCatalogContract(cat());
    assert.equal(ok.valid, true);
    assert.deepEqual(ok.violations, []);
  });

  it("skips the entry loops when the records are present but malformed", () => {
    const badFam = validateCatalogContract(cat({ families: ["x"] }));
    assert.equal(badFam.valid, false);
    assert.ok(badFam.violations.some((v) => v.message.includes("families")));
    const badMod = validateCatalogContract(cat({ models: 5 }));
    assert.equal(badMod.valid, false);
    assert.ok(badMod.violations.some((v) => v.message.includes("models")));
  });
});

describe("validateCatalogContract families", () => {
  it("flags non-object family entries and empty labels", () => {
    const r = validateCatalogContract(
      cat({ families: { a: 7, b: fam({ label: "" }), c: fam({ label: "  " }), d: fam() } }),
    );
    assert.equal(r.valid, false);
    assert.ok(r.violations.some((v) => v.kind === "a"));
    assert.ok(r.violations.some((v) => v.kind === "b"));
    assert.ok(r.violations.some((v) => v.kind === "c"));
  });

  it("accepts null/undefined modifiers, flags non-array modifiers", () => {
    assert.equal(validateCatalogContract(cat()).valid, true);
    assert.equal(
      validateCatalogContract(cat({ families: { f: fam({ modifiers: null }) } })).valid,
      true,
    );
    const bad = validateCatalogContract(
      cat({ families: { f: fam({ modifiers: { lora: true } }) } }),
    );
    assert.equal(bad.valid, false);
    assert.match(bad.violations[0].message, /modifiers/);
  });

  it("skips non-lora/controlnet kinds and malformed entries", () => {
    const r = validateCatalogContract(
      cat({
        families: {
          f: fam({
            modifiers: [
              null,
              { kind: 7 },
              { kind: "vae", options: [] },
              { kind: "lora", cardinality: "scalar", options: [] },
            ],
          }),
        },
      }),
    );
    assert.equal(r.valid, true);
  });

  it("flags zero-option list lora/controlnet kinds without upload_dir", () => {
    const lora = validateCatalogContract(
      cat({ families: { f: fam({ modifiers: [{ kind: "lora", options: [] }] }) } }),
    );
    assert.equal(lora.valid, false);
    assert.match(lora.violations[0].message, /ZERO options/);
    const cn = validateCatalogContract(
      cat({ families: { f: fam({ modifiers: [{ kind: "controlnet" }] }) } }),
    );
    assert.equal(cn.valid, false);
    const honest = validateCatalogContract(
      cat({
        families: {
          f: fam({ modifiers: [{ kind: "lora", options: [], upload_dir: "loras" }] }),
        },
      }),
    );
    assert.equal(honest.valid, true);
    const stocked = validateCatalogContract(
      cat({
        families: { f: fam({ modifiers: [{ kind: "lora", options: ["a.safetensors"] }] }) },
      }),
    );
    assert.equal(stocked.valid, true);
  });
});

describe("validateCatalogContract models", () => {
  it("flags non-object models and missing family/form/label", () => {
    const r = validateCatalogContract(
      cat({
        models: {
          a: 5,
          b: mod({ family: "" }),
          c: mod({ form: "", label: "" }),
          d: mod(),
        },
      }),
    );
    assert.equal(r.valid, false);
    assert.ok(r.violations.some((v) => v.kind === "a"));
    assert.ok(r.violations.some((v) => v.kind === "b" && v.message.includes("family")));
    assert.ok(
      r.violations.some(
        (v) => v.kind === "c" && v.message.includes("form") && v.message.includes("label"),
      ),
    );
  });
});

describe("validateCatalogContract capabilities", () => {
  it("accepts a missing capabilities record, flags a malformed one", () => {
    assert.equal(validateCatalogContract(cat()).valid, true);
    const bad = validateCatalogContract(cat({ capabilities: { c: 9 } }));
    assert.equal(bad.valid, false);
    assert.equal(bad.violations[0].kind, "c");
  });

  it("requires label + route + families", () => {
    const good = validateCatalogContract(
      cat({
        capabilities: {
          c: { label: "C", default_family: "f", families: ["f"] },
          r: { label: "R", resolved: { family: "f", model: "m" }, families: ["f"] },
        },
      }),
    );
    assert.equal(good.valid, true);
    const bad = validateCatalogContract(
      cat({
        capabilities: {
          // present-but-empty default_family + empty families
          c: { label: "", default_family: 4, families: [] },
          // neither declared nor resolved route + non-string family member
          d: { label: "D", families: ["f", 3] },
          // resolved present but incomplete → still missing a route
          e: { label: "E", resolved: { family: "f" }, families: ["f"] },
        },
      }),
    );
    assert.equal(bad.valid, false);
    const byKind = new Map(bad.violations.map((v) => [v.kind, v.message]));
    assert.match(byKind.get("c") ?? "", /label/);
    assert.match(byKind.get("d") ?? "", /families/);
    assert.match(byKind.get("e") ?? "", /route/);
  });
});
