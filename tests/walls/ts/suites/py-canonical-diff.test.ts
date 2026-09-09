// py-canonical-diff.test.ts — ROW 29 (pyValue cutover, ledger § THE
// WIRE ADOPTION F3). The cutover contract; RE-PINNED at STAGE 2
// (dumpsPy retired -> dumpsJson; the verbatim-emission test became
// the toJSON-normalization test — deliberate re-pin, ledgered):
//
//   WRITE side: the serve/journal writers and canonical
//   JSON.stringify are JSON-SEMANTICALLY IDENTICAL (JSON.parse both
//   sides, deep-equal). The only diffs are byte-level (spacing,
//   \uXXXX escapes, PyNum literal normalization) — no live consumer
//   parses bytes: the whole wall battery parses-then-compares
//   (verified 2026-09-10: zero raw py-byte pins in
//   suites/fixtures/data), and browser/python/ComfyUI JSON parsers
//   accept both shapes.
//
//   READ side: parseJson stays LENIENT forever — py-era files
//   ("1.00" literals, \uXXXX escapes) keep parsing with literals
//   preserved as PyNum. This suite pins the reader the cutover must
//   never break.
//
// Pure unit suite (no sandbox boot): relative source imports — walls
// have no workspace package boundary (see run.mjs); bare deps of the
// sources resolve through their own packages' node_modules.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/py-canonical-diff.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dumpsJson, parseJson } from "../../../../packages/gateway/doors/src/doors/assets.ts";
import { PyNum } from "../../../../packages/gateway/core/src/core/pyValue.ts";
import { dumpsLedgerData } from "../../../../packages/gateway/queue/src/queue/queue.ts";

const CASES: Array<[string, Record<string, unknown>]> = [
  ["scalars", { i: 3, f: 1.5, one: 1.0, b: true, n: null, s: "x", e: "", u: undefined }],
  ["cjk-emoji", { zh: "中文測試", emo: "🎨🔥", mixed: "aé中🎨" }],
  ["floats", { a: 0.1 + 0.2, big: 1e16, small: 1e-7, neg: -2.5, zero: 0 }],
  ["nesting", { a: [1, "二", { deep: [true, null, 3.0] }], empty: {}, list: [] }],
  ["nonfinite", { a: Infinity, b: -Infinity, c: NaN }],
];

describe("serve/journal writers ≡ canonical under JSON.parse", () => {
  for (const [label, payload] of CASES) {
    it(`dumpsJson(${label})`, () => {
      assert.deepEqual(JSON.parse(dumpsJson(payload)), JSON.parse(JSON.stringify(payload)));
    });
    it(`dumpsLedgerData(${label})`, () => {
      assert.deepEqual(JSON.parse(dumpsLedgerData(payload)), JSON.parse(JSON.stringify(payload)));
    });
  }

  it("PyNum normalizes to numbers at the serve boundary (value-truth)", () => {
    const raw: string = dumpsJson({ v: new PyNum("1.00"), w: new PyNum("2.50") });
    assert.ok(!raw.includes("1.00") && !raw.includes("2.50"), "no verbatim literals: " + raw);
    const parsed = JSON.parse(raw) as { v: number; w: number };
    assert.equal(parsed.v, 1);
    assert.equal(parsed.w, 2.5);
  });

  it("out-of-range PyNum literals serve null (the non-finite rule)", () => {
    const parsed = JSON.parse(dumpsJson({ v: new PyNum("1e400") })) as { v: null };
    assert.equal(parsed.v, null);
  });

  it("byte diffs are byte-level only (the cutover surface, recorded)", () => {
    // ensure_ascii is the ENTIRE delta for fresh data — a JS number
    // 1.0 is integer-valued, so canonical emits "1". Every remaining
    // byte change a later stage could make lives here.
    const served: string = dumpsJson({ s: "中", f: 1.0 });
    assert.ok(served.includes("\\u4e2d"), "ensure_ascii escapes non-ASCII");
    assert.ok(!served.includes("1.0"), "fresh floats emit canonical: " + served);
  });
});

describe("parseJson stays lenient (py-era files keep reading)", () => {
  it("preserves number literals as PyNum", () => {
    const doc = parseJson('{"v": 1.00, "f": 1.0, "i": 3}') as {
      v: unknown;
      f: unknown;
      i: unknown;
    };
    assert.ok(doc.v instanceof PyNum && doc.v.literal === "1.00");
    assert.ok(doc.f instanceof PyNum && doc.f.literal === "1.0");
    assert.ok(doc.i instanceof PyNum && doc.i.literal === "3");
  });

  it("decodes \\uXXXX escapes", () => {
    const doc = parseJson('{"s": "\\u4e2d\\u6587"}') as { s: string };
    assert.equal(doc.s, "中文");
  });
});
