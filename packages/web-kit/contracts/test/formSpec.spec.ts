// formSpec.spec.ts — every runtime arm of the form-spec contract helpers:
// optionValue/optionLabel, variantGroupDefault, notchesOf, evalVisibleWhen
// (all operators, paren-strip wrap/non-wrap, || / && multi/single,
// splitOnOperator quote/paren paths, parseValue literals), isPresent,
// activeClause/activeChild, validateContract (requires/forbids/
// requires_one_of/mutually_exclusive + child recursion), and the
// fieldRequired/ForbiddenInMode two-tier reads.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  activeChild,
  activeClause,
  evalVisibleWhen,
  fieldForbiddenInMode,
  fieldRequiredInMode,
  isPresent,
  notchesOf,
  optionLabel,
  optionValue,
  validateContract,
  variantGroupDefault,
} from "../src/formSpec.ts";
import type {
  ConditionalContract,
  ContractClause,
  FormSpec,
} from "../src/formSpec.ts";

function contract(
  overrides: Partial<ConditionalContract> = {},
): ConditionalContract {
  return {
    discriminator: "mode",
    modes: ["a", "b"],
    clauses: {},
    ...overrides,
  } as ConditionalContract;
}

function specWith(
  overrides: Record<string, unknown> = {},
): FormSpec {
  return overrides as unknown as FormSpec;
}

describe("optionValue / optionLabel", () => {
  it("passes plain strings through", () => {
    assert.equal(optionValue("fast"), "fast");
    assert.equal(optionLabel("fast"), "fast");
  });

  it("reads the object arms", () => {
    assert.equal(optionValue({ value: "v", label: "L" }), "v");
    assert.equal(optionLabel({ value: "v", label: "L" }), "L");
  });
});

describe("variantGroupDefault", () => {
  const row = { default: "land" };
  const withGroups = { features: { variant_groups: { g: row } } };

  it("returns the declared landing default", () => {
    assert.equal(
      variantGroupDefault(specWith(withGroups), "g"),
      "land",
    );
  });

  it("nulls on absent inputs", () => {
    assert.equal(variantGroupDefault(null, "g"), null);
    assert.equal(variantGroupDefault(undefined, "g"), null);
    assert.equal(variantGroupDefault(specWith({}), "g"), null);
    assert.equal(
      variantGroupDefault(specWith({ features: {} }), "g"),
      null,
    );
    assert.equal(
      variantGroupDefault(
        specWith({ features: { variant_groups: {} } }),
        "g",
      ),
      null,
    );
  });

  it("nulls on missing/blank defaults", () => {
    assert.equal(
      variantGroupDefault(
        specWith({ features: { variant_groups: { g: {} } } }),
        "g",
      ),
      null,
    );
    assert.equal(
      variantGroupDefault(
        specWith({ features: { variant_groups: { g: { default: null } } } }),
        "g",
      ),
      null,
    );
    assert.equal(
      variantGroupDefault(
        specWith({ features: { variant_groups: { g: { default: "" } } } }),
        "g",
      ),
      null,
    );
    assert.equal(
      variantGroupDefault(
        specWith({
          features: { variant_groups: { g: { default: "   " } } },
        }),
        "g",
      ),
      null,
    );
  });
});

describe("notchesOf", () => {
  it("resolves the base defaults on absent input", () => {
    assert.deepEqual(notchesOf(null), { size: "default", layout: "form" });
    assert.deepEqual(notchesOf(undefined), { size: "default", layout: "form" });
    assert.deepEqual(notchesOf(specWith({})), {
      size: "default",
      layout: "form",
    });
  });

  it("resolves declared non-default notches", () => {
    assert.deepEqual(notchesOf(specWith({ size: "huge", layout: "studio" })), {
      size: "huge",
      layout: "studio",
    });
  });

  it("falls back on out-of-union notch values", () => {
    assert.deepEqual(
      notchesOf(specWith({ size: "tiny", layout: "grid" })),
      { size: "default", layout: "form" },
    );
  });
});

describe("evalVisibleWhen", () => {
  it("empty expressions are visible", () => {
    assert.equal(evalVisibleWhen(null, {}), true);
    assert.equal(evalVisibleWhen(undefined, {}), true);
    assert.equal(evalVisibleWhen("", {}), true);
    assert.equal(evalVisibleWhen("   ", {}), true);
  });

  it("evaluates == with quoted, raw, and null values", () => {
    assert.equal(evalVisibleWhen("mode == 'fast'", { mode: "fast" }), true);
    assert.equal(evalVisibleWhen("mode == 'fast'", { mode: "slow" }), false);
    assert.equal(evalVisibleWhen('mode == "fast"', { mode: "fast" }), true);
    assert.equal(evalVisibleWhen("mode == fast", { mode: "fast" }), true);
    assert.equal(evalVisibleWhen("mode == fast", { mode: "slow" }), false);
  });

  it("null ≡ undefined both ways for ==", () => {
    assert.equal(evalVisibleWhen("audio == null", {}), true);
    assert.equal(evalVisibleWhen("audio == null", { audio: null }), true);
    assert.equal(evalVisibleWhen("audio == null", { audio: "x" }), false);
  });

  it("evaluates != including null ≡ undefined both ways", () => {
    assert.equal(evalVisibleWhen("mode != 'fast'", { mode: "slow" }), true);
    assert.equal(evalVisibleWhen("mode != 'fast'", { mode: "fast" }), false);
    assert.equal(evalVisibleWhen("audio != null", { audio: "x" }), true);
    assert.equal(evalVisibleWhen("audio != null", {}), false);
    assert.equal(evalVisibleWhen("audio != null", { audio: null }), false);
  });

  it("evaluates numeric comparisons", () => {
    assert.equal(evalVisibleWhen("n >= 5", { n: 5 }), true);
    assert.equal(evalVisibleWhen("n >= 5", { n: 4 }), false);
    assert.equal(evalVisibleWhen("n <= 5", { n: 5 }), true);
    assert.equal(evalVisibleWhen("n <= 5", { n: 6 }), false);
    assert.equal(evalVisibleWhen("n > 5", { n: 6 }), true);
    assert.equal(evalVisibleWhen("n > 5", { n: 5 }), false);
    assert.equal(evalVisibleWhen("n < 5", { n: 4 }), true);
    assert.equal(evalVisibleWhen("n < 5", { n: 5 }), false);
  });

  it("evaluates bare-field truthiness", () => {
    assert.equal(evalVisibleWhen("flag", { flag: 1 }), true);
    assert.equal(evalVisibleWhen("flag", { flag: 0 }), false);
    assert.equal(evalVisibleWhen("flag", {}), false);
  });

  it("unknown atoms default to visible", () => {
    assert.equal(evalVisibleWhen("not-an-atom!", {}), true);
    assert.equal(evalVisibleWhen("a + b", {}), true);
  });

  it("parses true/false/number literals", () => {
    assert.equal(evalVisibleWhen("b == true", { b: true }), true);
    assert.equal(evalVisibleWhen("b == true", { b: "true" }), false);
    assert.equal(evalVisibleWhen("b == false", { b: false }), true);
    assert.equal(evalVisibleWhen("n == 42", { n: 42 }), true);
    assert.equal(evalVisibleWhen("f == 4.5", { f: 4.5 }), true);
    assert.equal(evalVisibleWhen("f == -4.5", { f: 4.5 }), false);
    assert.equal(evalVisibleWhen("n == -3", { n: -3 }), true);
  });

  it("falls back to the raw string for unquoted non-numbers", () => {
    assert.equal(evalVisibleWhen("s == abc123!", { s: "abc123!" }), true);
  });

  it("treats a dangling quote as raw text", () => {
    assert.equal(evalVisibleWhen('s == "abc', { s: '"abc' }), true);
    assert.equal(evalVisibleWhen('s == "abc', { s: "abc" }), false);
  });

  it("strips wrapping parens including nested wrap", () => {
    assert.equal(evalVisibleWhen("(mode == 'x')", { mode: "x" }), true);
    assert.equal(evalVisibleWhen("((mode == 'x'))", { mode: "x" }), true);
    assert.equal(evalVisibleWhen("((mode == 'x'))", { mode: "y" }), false);
  });

  it("keeps non-wrapping parens as grouping", () => {
    assert.equal(
      evalVisibleWhen("(a == 'x' || a == 'y') && flag", {
        a: "y",
        flag: true,
      }),
      true,
    );
    assert.equal(
      evalVisibleWhen("(a) || (b)", { a: 0, b: "yes" }),
      true,
    );
    assert.equal(evalVisibleWhen("(a) || (b)", { a: 0, b: 0 }), false);
  });

  it("leaves unbalanced leading parens to the default-visible atom", () => {
    assert.equal(evalVisibleWhen("((a)", { a: 0 }), true);
  });

  it("evaluates || multi/single and && multi/single", () => {
    assert.equal(
      evalVisibleWhen("a == 'x' || b == 'y'", { a: "x", b: "z" }),
      true,
    );
    assert.equal(
      evalVisibleWhen("a == 'x' || b == 'y'", { a: "w", b: "z" }),
      false,
    );
    assert.equal(evalVisibleWhen("a == 'x'", { a: "x" }), true);
    assert.equal(evalVisibleWhen("a == 'x' && b == 'y'", { a: "x", b: "y" }), true);
    assert.equal(
      evalVisibleWhen("a == 'x' && b == 'y'", { a: "x", b: "z" }),
      false,
    );
    assert.equal(evalVisibleWhen("flag && other", { flag: 1, other: 0 }), false);
  });

  it("ignores operators inside quotes and splits on single quotes", () => {
    assert.equal(
      evalVisibleWhen("note == 'a || b' && mode == 'x'", {
        note: "a || b",
        mode: "x",
      }),
      true,
    );
    assert.equal(
      evalVisibleWhen('note == "a && b" || mode == \'x\'', {
        note: "nope",
        mode: "x",
      }),
      true,
    );
  });

  it("keeps an escaped quote inside the string", () => {
    assert.equal(
      evalVisibleWhen('note == "say \\"hi\\" || bye" || mode == \'x\'', {
        note: "other",
        mode: "x",
      }),
      true,
    );
    assert.equal(
      evalVisibleWhen('note == "say \\"hi\\" || bye" || mode == \'x\'', {
        note: "other",
        mode: "y",
      }),
      false,
    );
  });

  it("respects paren depth when splitting", () => {
    assert.equal(
      evalVisibleWhen("(a == 'x' || b == 'y') && c == 'z'", {
        a: "w",
        b: "y",
        c: "z",
      }),
      true,
    );
    assert.equal(
      evalVisibleWhen("(a == 'x' || b == 'y') && c == 'z'", {
        a: "w",
        b: "y",
        c: "q",
      }),
      false,
    );
  });
});

describe("isPresent", () => {
  it("absent values", () => {
    assert.equal(isPresent(null), false);
    assert.equal(isPresent(undefined), false);
    assert.equal(isPresent(""), false);
    assert.equal(isPresent("   "), false);
    assert.equal(isPresent([]), false);
    assert.equal(isPresent({}), false);
  });

  it("present values including falsy-but-real 0/false", () => {
    assert.equal(isPresent("x"), true);
    assert.equal(isPresent(" x "), true);
    assert.equal(isPresent([0]), true);
    assert.equal(isPresent({ a: 1 }), true);
    assert.equal(isPresent(0), true);
    assert.equal(isPresent(false), true);
    assert.equal(isPresent(7), true);
    assert.equal(isPresent(true), true);
  });
});

describe("activeClause / activeChild", () => {
  const clauseA: ContractClause = { requires: ["f"] } as ContractClause;

  it("resolves the clause for a string mode", () => {
    const c = contract({ clauses: { a: clauseA } });
    assert.equal(activeClause(c, { mode: "a" }), clauseA);
  });

  it("stringifies non-string modes", () => {
    const c = contract({ clauses: { "5": clauseA } });
    assert.equal(activeClause(c, { mode: 5 }), clauseA);
  });

  it("falls back to the default clause, else undefined", () => {
    const c = contract({ clauses: {}, default_clause: clauseA });
    assert.equal(activeClause(c, { mode: "zzz" }), clauseA);
    const bare = contract({ clauses: {} });
    assert.equal(activeClause(bare, { mode: "zzz" }), undefined);
    assert.equal(activeClause(bare, {}), undefined);
  });

  it("resolves children, misses, and absent children", () => {
    const child = contract({ clauses: { x: clauseA } });
    const c = contract({ children: { a: child } });
    assert.equal(activeChild(c, { mode: "a" }), child);
    assert.equal(activeChild(c, { mode: "zzz" }), undefined);
    assert.equal(activeChild(c, {}), undefined);
    assert.equal(activeChild(contract({}), { mode: "a" }), undefined);
    assert.equal(activeChild(c, { mode: 7 }), undefined);
  });
});

describe("validateContract", () => {
  it("reports missing requires and passes present ones", () => {
    const c = contract({ clauses: { a: { requires: ["f"] } as ContractClause } });
    const bad = validateContract(c, { mode: "a" });
    assert.equal(bad.length, 1);
    assert.equal(bad[0].field, "f");
    assert.match(bad[0].message, /required when mode="a"/);
    assert.deepEqual(validateContract(c, { mode: "a", f: "v" }), []);
  });

  it("reports present forbids and passes absent ones", () => {
    const c = contract({ clauses: { a: { forbids: ["f"] } as ContractClause } });
    const bad = validateContract(c, { mode: "a", f: "v" });
    assert.equal(bad.length, 1);
    assert.equal(bad[0].field, "f");
    assert.match(bad[0].message, /not applicable when mode="a"/);
    assert.deepEqual(validateContract(c, { mode: "a" }), []);
  });

  it("requires_one_of: ignores thin lists, fires on 0-of-2+, passes on 1", () => {
    const thin0 = contract({
      clauses: { a: { requires_one_of: [] } as ContractClause },
    });
    assert.deepEqual(validateContract(thin0, { mode: "a" }), []);
    const thin1 = contract({
      clauses: { a: { requires_one_of: ["f"] } as ContractClause },
    });
    assert.deepEqual(validateContract(thin1, { mode: "a" }), []);
    const c = contract({
      clauses: { a: { requires_one_of: ["f", "g"] } as ContractClause },
    });
    const bad = validateContract(c, { mode: "a" });
    assert.equal(bad.length, 1);
    assert.equal(bad[0].field, "f|g");
    assert.match(bad[0].message, /at least one of \[f, g\]/);
    assert.deepEqual(validateContract(c, { mode: "a", g: "v" }), []);
  });

  it("mutually_exclusive: ignores thin lists, fires on 2+ present", () => {
    const thin = contract({
      clauses: { a: { mutually_exclusive: ["f"] } as ContractClause },
    });
    assert.deepEqual(validateContract(thin, { mode: "a", f: "v" }), []);
    const c = contract({
      clauses: { a: { mutually_exclusive: ["f", "g"] } as ContractClause },
    });
    assert.deepEqual(validateContract(c, { mode: "a", f: "v" }), []);
    assert.deepEqual(validateContract(c, { mode: "a" }), []);
    const bad = validateContract(c, { mode: "a", f: "v", g: "w" });
    assert.equal(bad.length, 1);
    assert.equal(bad[0].field, "f|g");
    assert.match(bad[0].message, /mutually exclusive when mode="a"/);
  });

  it("collects across both tiers with the child discriminator named", () => {
    const child = contract({
      discriminator: "region",
      modes: ["free", "box"],
      clauses: { free: { requires: ["mask"] } as ContractClause },
    });
    const c = contract({
      clauses: { a: { requires: ["prompt"] } as ContractClause },
      children: { a: child },
    });
    const bad = validateContract(c, { mode: "a", region: "free" });
    assert.equal(bad.length, 2);
    assert.ok(bad.some((v) => v.field === "prompt"));
    const mask = bad.find((v) => v.field === "mask");
    assert.ok(mask);
    assert.match(mask.message, /region="free"/);
    assert.deepEqual(
      validateContract(c, { mode: "a", region: "free", prompt: "p", mask: "m" }),
      [],
    );
  });

  it("skips child recursion when the parent value owns no child", () => {
    const child = contract({
      discriminator: "region",
      modes: ["free"],
      clauses: { free: { requires: ["mask"] } as ContractClause },
    });
    const c = contract({
      clauses: { a: {} as ContractClause },
      children: { b: child },
    });
    assert.deepEqual(validateContract(c, { mode: "a" }), []);
  });

  it("emits nothing with no active clause and no child", () => {
    assert.deepEqual(validateContract(contract({}), { mode: "zzz" }), []);
    assert.deepEqual(validateContract(contract({}), {}), []);
  });
});

describe("fieldRequiredInMode / fieldForbiddenInMode", () => {
  const child = contract({
    discriminator: "region",
    modes: ["free"],
    clauses: {
      free: { requires: ["mask"], forbids: ["box"] } as ContractClause,
    },
  });
  const c = contract({
    clauses: {
      a: { requires: ["prompt"], forbids: ["seed"] } as ContractClause,
    },
    children: { a: child },
  });

  it("reads the parent tier", () => {
    assert.equal(fieldRequiredInMode(c, "prompt", { mode: "a" }), true);
    assert.equal(fieldRequiredInMode(c, "nope", { mode: "a" }), false);
    assert.equal(fieldForbiddenInMode(c, "seed", { mode: "a" }), true);
    assert.equal(fieldForbiddenInMode(c, "nope", { mode: "a" }), false);
  });

  it("reads the child tier", () => {
    assert.equal(
      fieldRequiredInMode(c, "mask", { mode: "a", region: "free" }),
      true,
    );
    assert.equal(
      fieldForbiddenInMode(c, "box", { mode: "a", region: "free" }),
      true,
    );
    assert.equal(
      fieldRequiredInMode(c, "mask", { mode: "a", region: "box" }),
      false,
    );
  });

  it("undefined contracts never flag", () => {
    assert.equal(fieldRequiredInMode(undefined, "f", { mode: "a" }), false);
    assert.equal(fieldForbiddenInMode(undefined, "f", { mode: "a" }), false);
  });

  it("unknown modes activate neither tier", () => {
    assert.equal(fieldRequiredInMode(c, "prompt", { mode: "zzz" }), false);
    assert.equal(fieldForbiddenInMode(c, "seed", { mode: "zzz" }), false);
    assert.equal(fieldRequiredInMode(c, "prompt", {}), false);
    assert.equal(fieldForbiddenInMode(c, "seed", {}), false);
  });
});
