// py-json.spec.ts — pyReprString + the ledger-line JSON parser.
// Pure string work: every escape, every fail() arm, every value
// shape. The parser keeps numbers as PyNum literals (verbatim).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { pyReprString, parseJson } from "../src/pyJson.ts";
import { PyNum } from "../src/pyValue.ts";

describe("pyReprString", () => {
  it("quote-free strings ride single-quoted", () => {
    assert.equal(pyReprString("abc"), "'abc'");
  });

  it("apostrophes flip to double quotes", () => {
    assert.equal(pyReprString("a'b"), '"a\'b"');
  });

  it("both quote kinds stay single-quoted with the escape", () => {
    assert.equal(pyReprString(`a'b"c`), `'a\\'b"c'`);
  });

  it("backslash and whitespace escapes ride", () => {
    assert.equal(pyReprString("a\\b"), "'a\\\\b'");
    assert.equal(pyReprString("a\nb"), "'a\\nb'");
    assert.equal(pyReprString("a\rb"), "'a\\rb'");
    assert.equal(pyReprString("a\tb"), "'a\\tb'");
  });

  it("other controls ride \\xHH", () => {
    assert.equal(pyReprString("a\x00b\x7f"), "'a\\x00b\\x7f'");
  });
});

describe("parseJson values", () => {
  it("objects, arrays, scalars, ws", () => {
    assert.deepEqual(parseJson(" \t\n\r{\n} \r\n"), {});
    assert.deepEqual(parseJson("[]"), []);
    assert.equal(parseJson("true"), true);
    assert.equal(parseJson("false"), false);
    assert.equal(parseJson("null"), null);
    assert.equal(parseJson('"hi"'), "hi");
  });

  it("numbers ride PyNum literals verbatim", () => {
    const n = parseJson("1.00") as PyNum;
    assert.ok(n instanceof PyNum);
    assert.equal(n.literal, "1.00");
    assert.equal((parseJson("-12") as PyNum).literal, "-12");
    assert.equal((parseJson("0") as PyNum).literal, "0");
    assert.equal((parseJson("3.5e-4") as PyNum).literal, "3.5e-4");
  });

  it("every simple escape rides", () => {
    assert.equal(
      parseJson('"\\"\\\\\\/\\b\\f\\n\\r\\t"'),
      '"\\/\b\f\n\r\t',
    );
  });

  it("\\uXXXX rides, surrogate pairs fuse", () => {
    assert.equal(parseJson('"caf\\u00e9"'), "caf\u00e9");
    assert.equal(parseJson('"\\ud834\\udd1e"'), "\uD834\uDD1E");
  });

  it("nested shapes ride whole", () => {
    assert.deepEqual(parseJson('{"a":[1,{"b":null}],"c":"x"}'), {
      a: [new PyNum("1"), { b: null }],
      c: "x",
    });
  });
});

describe("parseJson refusals", () => {
  const bad = [
    "",
    " ",
    "tru",
    "nul",
    "fals",
    "1 2",
    "{",
    '{"a"',
    '{"a":1',
    '{"a" 1}',
    '{"a":1,}',
    '{1:2}',
    '{"a":1;2}',
    "[",
    "[1",
    "[1,]",
    "[1;2]",
    '"abc',
    '"ab\\',
    '"\\x"',
    '"\\u12"',
    '"\\u12zz"',
    "-",
    "abc",
    "}",
    "+1",
    ".5",
  ];
  for (const text of bad) {
    it(`refuses ${JSON.stringify(text)}`, () => {
      assert.throws(() => parseJson(text), /bad json @/);
    });
  }
});
