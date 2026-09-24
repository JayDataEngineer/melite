// coerce-wire-arrays.spec.ts — THE ARRAY WIRE GUARD's walls (P2,
// ROADMAP §36.4; receipts from commission 034's forensic,
// run-9953f652410d-d365af74): arrays under free-form tool params
// corrupt on the wire — non-empty `{item:[…]}`, empty `""`. The
// shape arm unwraps; the schema arm fills; ambiguity stays LOUD.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import Schema from "@deepseek-ai/schemastery";
import { isItemWrapped, unwrapItemArrays, coerceWireArrays, coerceWireNumbers, wireTypeLedger } from "../src/coerceWireArrays.ts";

describe("isItemWrapped (the shape verdict)", () => {
  it("THE RECEIPT: {item:[…]} is the wire array encoding — single own key, array value", () => {
    assert.equal(isItemWrapped({ item: [1, 2] }), true);
    assert.equal(isItemWrapped({ item: [] }), true);
  });
  it("everything else is not (never a fuzzy guess)", () => {
    assert.equal(isItemWrapped({ item: [1], extra: 2 }), false, "two keys");
    assert.equal(isItemWrapped({ item: "no" }), false, "non-array item");
    assert.equal(isItemWrapped({ items: [1] }), false, "plural key");
    assert.equal(isItemWrapped([1, 2]), false, "a bare array");
    assert.equal(isItemWrapped(""), false);
    assert.equal(isItemWrapped(null), false);
  });
});

describe("unwrapItemArrays (the deep tool-boundary walk)", () => {
  it("THE RECEIPT: params trees land clean — nested wraps unwrap at every depth", () => {
    const poisoned = {
      params: { ref_images: { item: ["/a.png", "/b.png"] }, prompt: "x" },
      stages: [{ id: "s_0", params: { calls: { item: [{ text: "hi" }] } } }],
    };
    const clean = unwrapItemArrays(poisoned);
    assert.deepEqual(clean.params.ref_images, ["/a.png", "/b.png"]);
    assert.deepEqual(clean.stages[0].params.calls, [{ text: "hi" }]);
    assert.equal(clean.params.prompt, "x", "non-wrapped values ride verbatim");
  });
  it("the original tree is never mutated; cycles sever by identity", () => {
    const original = { ref_images: { item: [1] } };
    const clean = unwrapItemArrays(original);
    assert.deepEqual(clean.ref_images, [1]);
    assert.deepEqual(original.ref_images, { item: [1] }, "the input stands");
    const cyc: Record<string, unknown> = { self: null };
    cyc.self = cyc;
    const out = unwrapItemArrays(cyc) as Record<string, unknown>;
    assert.equal(out.self, out, "the cycle resolves to the same clone");
  });
});

describe("coerceWireArrays (the schema-derived card seat)", () => {
  const schema = Schema.object({
    calls: Schema.array(Schema.any()),
    prompt: Schema.string(),
  });
  it("THE RECEIPT: '' fills to [] for schema-declared array keys only", () => {
    const out = coerceWireArrays(schema, { calls: "" });
    assert.deepEqual(out.calls, []);
  });
  it("a wrapped array unwraps at the card seat too (both arms, one door)", () => {
    const out = coerceWireArrays(schema, { calls: { item: [1] } });
    assert.deepEqual(out.calls, [1]);
  });
  it("non-array keys and absent keys ride untouched (no silent rewrites)", () => {
    const raw = { prompt: "", calls: undefined };
    const out = coerceWireArrays(schema, raw);
    assert.equal(out.prompt, "", "a string key's '' is ITS value, never filled");
    assert.equal(out.calls, undefined, "absent stays absent for the schema default");
  });
});

describe("coerceWireNumbers (the numeric-string fill, commission 035)", () => {
  const schema = Schema.object({
    width: Schema.number().min(256).max(2048),
    prompt: Schema.string(),
    seed: Schema.number(),
  });
  it("THE RECEIPT: a wire-stringified number fills back to a number for declared numeric keys", () => {
    const out = coerceWireNumbers(schema, { width: "768" }) as Record<string, unknown>;
    assert.equal(out.width, 768);
    assert.equal(typeof out.width, "number");
  });
  it("floats and signed strings fill too; real numbers ride untouched", () => {
    const out = coerceWireNumbers(schema, { width: "-512.5", seed: 42 }) as Record<string, unknown>;
    assert.equal(out.width, -512.5);
    assert.equal(out.seed, 42);
  });
  it("non-numeric strings NEVER reinterpret (0x, empty, prose) — the bounds refusal stays honest", () => {
    const out = coerceWireNumbers(schema, { width: "0x10", seed: "" }) as Record<string, unknown>;
    assert.equal(out.width, "0x10");
    assert.equal(out.seed, "");
  });
  it("string-typed keys never fill (schema-derived, not shape-guessed)", () => {
    const out = coerceWireNumbers(schema, { prompt: "768" }) as Record<string, unknown>;
    assert.equal(out.prompt, "768");
  });
  it("non-object raw and schema-less carriers ride verbatim", () => {
    assert.equal(coerceWireNumbers(schema, null), null);
    const arr = [1];
    assert.equal(coerceWireNumbers(schema, arr), arr);
    const noDict = coerceWireNumbers({ dict: undefined }, { width: "768" }) as Record<string, unknown>;
    assert.equal(noDict.width, "768");
  });
});

describe("wireTypeLedger (the receipt's type evidence, 035 gap #2)", () => {
  const schema = Schema.object({
    width: Schema.number(),
    prompt: Schema.string(),
    seed: Schema.number(),
  });
  it("names the received typeof for every mismatched declared key", () => {
    const out = wireTypeLedger(schema, { width: {}, prompt: 7, seed: "42" });
    assert.match(out, /width=object/);
    assert.match(out, /prompt=number/);
    assert.match(out, /seed=string/);
  });
  it("matching types and absent keys report nothing", () => {
    assert.equal(wireTypeLedger(schema, { width: 768, prompt: "x" }), "");
    assert.equal(wireTypeLedger(schema, {}), "");
  });
});

describe("coerceWireNumbers — the boxed-number unbox", () => {
  const schema = Schema.object({
    width: Schema.number(),
    prompt: Schema.string(),
    seed: Schema.number(),
  });
  it("a boxed Number restores to its primitive for declared numeric keys", () => {
    const boxed = new Number(768); // eslint-disable-line no-new-wrappers
    const out = coerceWireNumbers(schema, { width: boxed }) as Record<string, unknown>;
    assert.equal(out.width, 768);
    assert.equal(typeof out.width, "number");
  });
});

describe("coerceWireArrays — the single-element arm (035 attempt-008)", () => {
  const schema = Schema.object({
    ref_images: Schema.array(String),
    prompt: Schema.string(),
  });
  it("a one-element transport encoding {item: el} restores to [el] for array-declared keys", () => {
    const out = coerceWireArrays(schema, { ref_images: { item: "/a.png" }, prompt: "x" });
    assert.deepEqual(out.ref_images, ["/a.png"]);
  });
  it("a two-key object with an item key never fills (not the transport shape)", () => {
    const out = coerceWireArrays(schema, { ref_images: { item: "/a.png", x: 1 }, prompt: "x" });
    assert.deepEqual(out.ref_images, { item: "/a.png", x: 1 });
  });
});

describe("coerceWireNumbers — the deep element fill (035 attempt-8's last disease)", () => {
  const schema = Schema.object({
    audio_clips: Schema.array(Schema.object({
      start_frame: Schema.number(),
      dur_frames: Schema.number(),
      text: Schema.string(),
    })),
    top: Schema.number(),
  });
  it("stringified nested numerics inside true-array elements restore", () => {
    const out = coerceWireNumbers(schema, {
      audio_clips: [
        { start_frame: "144", dur_frames: "134", text: "Rain's done." },
        { start_frame: 0, dur_frames: "10", text: "gulls" },
      ],
      top: "768",
    }) as Record<string, unknown>;
    assert.deepEqual(out.audio_clips, [
      { start_frame: 144, dur_frames: 134, text: "Rain's done." },
      { start_frame: 0, dur_frames: 10, text: "gulls" },
    ]);
    assert.equal(out.top, 768);
  });
  it("elements that need no fill ride verbatim (same-reference rows)", () => {
    const rows = [{ start_frame: 1, dur_frames: 2, text: "x" }];
    const out = coerceWireNumbers(schema, { audio_clips: rows }) as Record<string, unknown>;
    assert.equal(out.audio_clips, rows);
  });
});
