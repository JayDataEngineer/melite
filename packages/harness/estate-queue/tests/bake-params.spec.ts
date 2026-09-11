// bake-params.spec.ts — the params_json serve belt: the error render,
// the value repr, the float repr, and the dialect validation matrix.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { PyNum } from "../src/pyValue.ts";
import {
  PyTuple,
  pyFloatRepr,
  pyReprValue,
  renderErrors,
  truncateRepr,
  vErr,
  validateBakeParams,
} from "../src/bakeParams.ts";

const PH11 = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
const authored = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({ dialect: "authored", phenotype: PH11, ...over });
const estimated = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    dialect: "estimated",
    phenotype: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    scale: new Array(139).fill(0.1),
    ...over,
  });

describe("vErr + renderErrors + truncateRepr", () => {
  it("renders the pydantic shape (singular/plural, loc/less, truncation)", () => {
    const one = renderErrors("M", [vErr(["a", 0], "bad", "value_error", "x".repeat(60))]);
    assert.ok(one.startsWith("1 validation error for M\n"));
    assert.ok(one.includes("a.0\n"));
    assert.ok(one.includes("..."));
    assert.ok(one.includes("errors.pydantic.dev/2.13/v/value_error"));
    const two = renderErrors("M", [
      vErr([], "first", "missing", { a: 1 }),
      vErr(["b"], "second", "float_type", true),
    ]);
    assert.ok(two.startsWith("2 validation errors for M\n"));
    assert.equal(truncateRepr("x".repeat(50)), "x".repeat(50));
    assert.equal(truncateRepr("y".repeat(51)).length, 25 + 3 + 24);
  });
});

describe("pyReprValue", () => {
  it("mirrors repr() across the JSON value space", () => {
    assert.equal(pyReprValue(null), "None");
    assert.equal(pyReprValue(undefined), "None");
    assert.equal(pyReprValue(true), "True");
    assert.equal(pyReprValue(false), "False");
    assert.equal(pyReprValue("a'b"), '"a\'b"');
    assert.equal(pyReprValue(new PyNum("42")), "42");
    assert.equal(pyReprValue(new PyNum("0.5")), "0.5");
    assert.equal(pyReprValue(7), "7");
    assert.equal(pyReprValue(0.5), "0.5");
    assert.throws(() => pyReprValue(Infinity), /bad sidecar number/);
    assert.equal(pyReprValue(new PyTuple([])), "()");
    assert.equal(pyReprValue(new PyTuple([1])), "(1,)");
    assert.equal(pyReprValue(new PyTuple([1, "a"])), "(1, 'a')");
    assert.equal(pyReprValue([1, "a"]), "[1, 'a']");
    assert.equal(pyReprValue({ k: [1, null] }), "{'k': [1, None]}");
    assert.equal(pyReprValue(5n as unknown as number), "5");
  });
});

describe("pyFloatRepr", () => {
  it("renders the CPython windows (fixed, exponential, signed zero)", () => {
    assert.equal(pyFloatRepr(0), "0.0");
    assert.equal(pyFloatRepr(-0), "-0.0");
    assert.equal(pyFloatRepr(1), "1.0");
    assert.equal(pyFloatRepr(-2.5), "-2.5");
    assert.equal(pyFloatRepr(0.1), "0.1");
    assert.equal(pyFloatRepr(0.0001), "0.0001");
    assert.equal(pyFloatRepr(0.00001), "1e-05");
    assert.equal(pyFloatRepr(1e16), "1e+16");
    assert.equal(pyFloatRepr(1e15), "1000000000000000.0");
    assert.equal(pyFloatRepr(1e100), "1e+100");
    assert.equal(pyFloatRepr(1.5e-7), "1.5e-07");
    assert.equal(pyFloatRepr(100.5), "100.5");
    assert.equal(pyFloatRepr(123456789012345678), "1.2345678901234568e+17");
  });
});

describe("validateBakeParams", () => {
  it("passes the canonical dialects", () => {
    assert.equal(validateBakeParams(authored()), null);
    assert.equal(validateBakeParams(estimated()), null);
    assert.equal(validateBakeParams(authored({ local_changes: { jaw: 0.5 } })), null);
  });

  it("refuses corrupt wire text (bad JSON, non-objects)", () => {
    assert.match(validateBakeParams("{nope"), /not JSON/);
    assert.match(validateBakeParams("[1]"), /must be a JSON object, got list/);
    assert.match(validateBakeParams("null"), /must be a JSON object/);
  });

  it("refuses missing/ill-typed fields (required, literal, tuple, lax)", () => {
    assert.match(validateBakeParams("{}"), /Field required/);
    assert.match(validateBakeParams(JSON.stringify({ dialect: "authored" })), /phenotype/);
    assert.match(
      validateBakeParams(JSON.stringify({ dialect: "weird", phenotype: PH11 })),
      /should be 'authored' or 'estimated'/,
    );
    assert.match(
      validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: "nope" })),
      /valid tuple/,
    );
    assert.match(
      validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: [1, "x", 3] })),
      /valid number, unable to parse string/,
    );
    assert.match(
      validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: [1, null] })),
      /valid number/,
    );
    assert.match(
      validateBakeParams(JSON.stringify({ dialect: "authored", phenotype: PH11, zzz: 1 })),
      /Extra inputs are not permitted/,
    );
  });

  it("rides the lax number arms (bools, strings, PyNum-shaped, dicts)", () => {
    assert.equal(validateBakeParams(authored({ local_changes: { a: true } })), null);
    assert.equal(validateBakeParams(authored({ local_changes: { a: "0.5" } })), null);
    assert.equal(validateBakeParams(authored({ local_changes: { a: false } })), null);
    assert.match(
      validateBakeParams(authored({ scale: "nope" })),
      /valid tuple/,
    );
    const infWire = JSON.stringify({ dialect: "authored", phenotype: [0.5] }).replace("0.5", "1e999");
    assert.match(validateBakeParams(infWire), /phenotype\.0[\s\S]*valid number/);
    assert.match(
      validateBakeParams(authored({ local_changes: { a: "nope" } })),
      /unable to parse string/,
    );
    assert.match(
      validateBakeParams(authored({ local_changes: [1] })),
      /valid dictionary/,
    );
    assert.match(
      validateBakeParams(authored({ local_changes: { a: "1e999" } })),
      /unable to parse string/,
    );
  });

  it("refuses authored shape faults (dims, range, scale, locals range)", () => {
    assert.match(validateBakeParams(authored({ phenotype: [0.5] })), /wants 11 dims, got 1/);
    const wide = [...PH11];
    wide[3] = 2;
    assert.match(
      validateBakeParams(authored({ phenotype: wide })),
      /phenotype\[3\] = 2\.0 outside 0\.0\.\.1\.0/,
    );
    assert.match(
      validateBakeParams(authored({ scale: [1] })),
      /not scale \(that is the estimated dialect\)/,
    );
    assert.match(
      validateBakeParams(authored({ local_changes: { jaw: 9 } })),
      /local_changes\['jaw'\] = 9\.0 outside -1\.0\.\.2\.0/,
    );
  });

  it("refuses estimated shape faults (dims, scale, locals)", () => {
    assert.match(validateBakeParams(estimated({ phenotype: [0.1] })), /wants 6 dims, got 1/);
    const noScale = JSON.parse(estimated());
    delete noScale.scale;
    assert.match(validateBakeParams(JSON.stringify(noScale)), /wants scale/);
    assert.match(validateBakeParams(estimated({ scale: [1] })), /wants 139 entries, got 1/);
    assert.match(
      validateBakeParams(estimated({ local_changes: { jaw: 0.5 } })),
      /phenotype\+scale only/,
    );
  });
});
