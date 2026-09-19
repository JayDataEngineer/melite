// bake-params.spec.ts — the AnnyBakeParams validator's every arm
// (TEST-2 breadth, the deterministic census of 2026-09-19). The
// validator is pure module truth (string in, rendered error or
// null); the flows specs ride its happy path only. THIS battery
// pins each refusal voice verbatim: the JSON walk, the envelope
// law, both dialects' dim counts and ranges, the scale vector's
// 139 law, the local_changes dialect split, and the extra sweep.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateBakeParams } from "../src/bakeParams.ts";

const S139: number[] = Array.from({ length: 139 }, () => 0.5);
const P11: number[] = Array.from({ length: 11 }, () => 0.5);
const P6: number[] = Array.from({ length: 6 }, () => 0.1);

describe("the JSON walk + envelope law", () => {
  it("not-JSON renders the parser's own message", () => {
    const out = validateBakeParams("{nope");
    assert.match(out ?? "", /params_json is not JSON/);
  });
  it("a JSON non-object refuses with the typeof", () => {
    assert.match(validateBakeParams("[1,2]") ?? "", /must be a JSON object, got object/);
    assert.match(validateBakeParams("7") ?? "", /got number/);
    assert.match(validateBakeParams('"x"') ?? "", /got string/);
  });
});

describe("required fields", () => {
  it("missing dialect and phenotype both voice", () => {
    const out = validateBakeParams("{}") ?? "";
    assert.match(out, /field required/i);
  });
  it("a non-array phenotype refuses the tuple law", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: 5 })) ?? "";
    assert.match(out, /value must be an array/);
  });
  it("a non-number phenotype item refuses at its index", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: ["x", ...P11.slice(1)] })) ?? "";
    assert.match(out, /Input should be a valid number/);
  });
  it("an unknown dialect refuses the enum", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "guessed", phenotype: P6 })) ?? "";
    assert.match(out, /'authored' or 'estimated'/);
  });
  it("extra keys sweep loud", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: P11, mystery: 1 })) ?? "";
    assert.match(out, /extra_forbidden|mystery|unexpected/i);
  });
});

describe("the authored dialect", () => {
  it("11 clean dims pass", () => {
    assert.equal(
      validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: P11 })),
      null,
    );
  });
  it("local_changes ride alongside", () => {
    assert.equal(
      validateBakeParams(JSON.stringify({
        dialect: "authored", phenotype: P11, local_changes: { weight: 0.5 },
      })),
      null,
    );
  });
  it("the wrong dim count refuses with the dims list", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: P6 })) ?? "";
    assert.match(out, /wants 11 dims, got 6/);
    assert.match(out, /gender\/age\/muscle/);
  });
  it("an out-of-range dim refuses at its index", () => {
    const bad = [...P11]; bad[3] = 1.5;
    const out = validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: bad })) ?? "";
    assert.match(out, /phenotype\[3\] = 1\.5 outside 0\.0\.\.1\.0/);
  });
  it("scale belongs to estimated: authored+scale refuses", () => {
    const out = validateBakeParams(JSON.stringify({
      dialect: "authored", phenotype: P11, scale: S139,
    })) ?? "";
    assert.match(out, /authored takes local_changes, not scale/);
  });
});

describe("the estimated dialect", () => {
  it("6 dims + the 139 scale pass", () => {
    assert.equal(
      validateBakeParams(JSON.stringify({ dialect: "estimated", phenotype: P6, scale: S139 })),
      null,
    );
  });
  it("the wrong dim count refuses with the estimator note", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "estimated", phenotype: P11, scale: S139 })) ?? "";
    assert.match(out, /wants 6 dims, got 11/);
    assert.match(out, /identity coefficients/);
  });
  it("a missing scale refuses", () => {
    const out = validateBakeParams(JSON.stringify({ dialect: "estimated", phenotype: P6 })) ?? "";
    assert.match(out, /estimated wants scale/);
  });
  it("the scale vector wants exactly 139", () => {
    const short = S139.slice(0, 138);
    const out = validateBakeParams(JSON.stringify({ dialect: "estimated", phenotype: P6, scale: short })) ?? "";
    assert.match(out, /scale wants 139 entries, got 138/);
  });
  it("local_changes would be ignored: refuses", () => {
    const out = validateBakeParams(JSON.stringify({
      dialect: "estimated", phenotype: P6, scale: S139, local_changes: { weight: 1 },
    })) ?? "";
    assert.match(out, /silently ignored/);
  });
});

describe("local_changes", () => {
  it("a non-object local_changes refuses", () => {
    const out = validateBakeParams(JSON.stringify({
      dialect: "authored", phenotype: P11, local_changes: 7,
    })) ?? "";
    assert.match(out, /local_changes must be an object/);
  });
  it("a non-number value refuses at its key", () => {
    const out = validateBakeParams(JSON.stringify({
      dialect: "authored", phenotype: P11, local_changes: { weight: "fat" },
    })) ?? "";
    assert.match(out, /local_changes.*weight|weight.*not a valid float/i);
  });
  it("the -1..2 range refuses outside", () => {
    const out = validateBakeParams(JSON.stringify({
      dialect: "authored", phenotype: P11, local_changes: { weight: 2.5 },
    })) ?? "";
    assert.match(out, /local_changes\["weight"\] = 2\.5 outside -1\.0\.\.2\.0/);
  });
  it("the range edges pass (-1 and 2 ride)", () => {
    assert.equal(
      validateBakeParams(JSON.stringify({
        dialect: "authored", phenotype: P11, local_changes: { low: -1, high: 2 },
      })),
      null,
    );
  });
});
