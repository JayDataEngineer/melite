// specContract.spec.ts — the frontend half of the NO SILENT DROPS contract.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateSpecContract } from "../src/specContract.ts";

/** Minimal contract-valid spec; override pieces per test. */
const base = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  features: {},
  fields: [{ name: "steps" }],
  schema_groups: [],
  ...over,
});

const kind = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: "lora",
  cardinality: "list",
  param_key: "lora",
  fields: [{ name: "strength" }],
  options_scanned: true,
  upload_dir: "/uploads",
  options: [{ value: "a", installed: true }],
  ...over,
});

describe("validateSpecContract shape gates", () => {
  it("rejects non-object bodies", () => {
    for (const bad of [null, undefined, 42, "spec", []]) {
      const out = validateSpecContract(bad);
      assert.equal(out.valid, false);
      assert.equal(out.violations[0]!.kind, "spec");
      assert.match(out.violations[0]!.message, /not an object/);
      assert.equal(out.spec, undefined);
    }
  });

  it("rejects a body with no features object", () => {
    const out = validateSpecContract(base({ features: undefined }));
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("features")));
  });

  it("accepts absent/null modifiers when the rest is valid", () => {
    assert.equal(validateSpecContract(base()).valid, true);
    assert.equal(validateSpecContract(base({ features: { modifiers: null } })).valid, true);
  });

  it("blesses the narrowed spec on success", () => {
    const s = base();
    const out = validateSpecContract(s);
    assert.equal(out.valid, true);
    assert.deepEqual(out.violations, []);
    assert.equal(out.spec, s as never);
  });
});

describe("validateSpecContract fields gate", () => {
  it("rejects a missing fields array", () => {
    const { fields: _drop, ...rest } = base();
    const out = validateSpecContract(rest);
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("fields")));
  });

  it("rejects a non-object fields entry", () => {
    const out = validateSpecContract(base({ fields: ["steps"] }));
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("fields")));
  });

  it("rejects an entry with a non-string name", () => {
    const out = validateSpecContract(base({ fields: [{ name: 5 }] }));
    assert.equal(out.valid, false);
  });

  it("rejects an entry with an empty name", () => {
    const out = validateSpecContract(base({ fields: [{ name: "" }] }));
    assert.equal(out.valid, false);
  });
});

describe("validateSpecContract schema_groups gate", () => {
  it("rejects a missing schema_groups array", () => {
    const { schema_groups: _drop, ...rest } = base();
    const out = validateSpecContract(rest);
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("schema_groups")));
  });
});

describe("validateSpecContract modifiers gates", () => {
  it("rejects a non-array modifiers capability", () => {
    const out = validateSpecContract(base({ features: { modifiers: {} } }));
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("modifiers")));
  });

  it("rejects a non-object kind entry and keeps checking the rest", () => {
    const out = validateSpecContract(
      base({ features: { modifiers: [42, kind()] } }),
    );
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("not a kind object")));
  });

  it("rejects an entry with a non-string kind", () => {
    const out = validateSpecContract(
      base({ features: { modifiers: [{ kind: 7 }] } }),
    );
    assert.equal(out.valid, false);
  });

  it("rejects a bad cardinality", () => {
    const out = validateSpecContract(
      base({ features: { modifiers: [kind({ cardinality: "weird" })] } }),
    );
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("cardinality")));
  });

  it("accepts scalar cardinality", () => {
    const out = validateSpecContract(
      base({ features: { modifiers: [kind({ cardinality: "scalar" })] } }),
    );
    assert.equal(out.valid, true);
  });

  it("defaults a missing cardinality to list", () => {
    const k = kind();
    delete k.cardinality;
    const out = validateSpecContract(base({ features: { modifiers: [k] } }));
    assert.equal(out.valid, true);
  });

  it("rejects a missing param_key", () => {
    assert.equal(
      validateSpecContract(base({ features: { modifiers: [kind({ param_key: "" })] } })).valid,
      false,
    );
    assert.equal(
      validateSpecContract(base({ features: { modifiers: [kind({ param_key: 5 })] } })).valid,
      false,
    );
  });

  it("rejects a kind with no fields array", () => {
    const k = kind();
    delete k.fields;
    const out = validateSpecContract(base({ features: { modifiers: [k] } }));
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("no fields")));
  });
});

describe("validateSpecContract weights-file gates", () => {
  it("rejects zero options without scan proof", () => {
    const k = kind();
    delete k.options_scanned;
    delete k.upload_dir;
    delete k.options;
    const out = validateSpecContract(base({ features: { modifiers: [k] } }));
    assert.equal(out.valid, false);
    assert.ok(out.violations.some((v) => v.message.includes("ZERO options")));
  });

  it("rejects scan proof without an upload dir", () => {
    const k = kind();
    delete k.upload_dir;
    delete k.options;
    assert.equal(
      validateSpecContract(base({ features: { modifiers: [k] } })).valid,
      false,
    );
  });

  it("rejects an unscanned upload dir without proof", () => {
    const k = kind({ options_scanned: false });
    delete k.options;
    assert.equal(
      validateSpecContract(base({ features: { modifiers: [k] } })).valid,
      false,
    );
  });

  it("accepts zero options with scan proof plus upload dir", () => {
    const k = kind();
    delete k.options;
    assert.equal(
      validateSpecContract(base({ features: { modifiers: [k] } })).valid,
      true,
    );
  });

  it("rejects options without a value", () => {
    for (const options of [
      [{ value: "" }],
      [{ label: "no value" }],
      ["plain"],
    ]) {
      const out = validateSpecContract(
        base({ features: { modifiers: [kind({ options })] } }),
      );
      assert.equal(out.valid, false);
      assert.ok(out.violations.some((v) => v.message.includes("without a \"value\"")));
    }
  });

  it("rejects an all-uninstalled dropdown", () => {
    const out = validateSpecContract(
      base({
        features: {
          modifiers: [
            kind({ options: [{ value: "a", installed: false }, { value: "b" }] }),
          ],
        },
      }),
    );
    // 'b' has no installed flag (not === false) → not all-uninstalled.
    assert.equal(out.valid, true);
    const out2 = validateSpecContract(
      base({
        features: {
          modifiers: [
            kind({ options: [{ value: "a", installed: false }, { value: "b", installed: false }] }),
          ],
        },
      }),
    );
    assert.equal(out2.valid, false);
    assert.ok(out2.violations.some((v) => v.message.includes("NOT installed")));
  });

  it("ignores the weights gates for non-weights kinds", () => {
    const out = validateSpecContract(
      base({
        features: {
          modifiers: [{ kind: "strength", cardinality: "list", param_key: "s", fields: [] }],
        },
      }),
    );
    assert.equal(out.valid, true);
  });

  it("accepts a fully-declared lora kind", () => {
    const out = validateSpecContract(base({ features: { modifiers: [kind()] } }));
    assert.equal(out.valid, true);
  });
});
