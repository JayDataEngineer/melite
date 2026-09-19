// runs-validate-inline.spec.ts — the inline edge/kind/branch
// validators' every arm (TEST-2 breadth, the deterministic census
// of 2026-09-19). These are the flow-validator's pure leaves:
// edgeRef's two spellings, inlineKind's non-string/non-vocab
// refusals, inlineEdge's four shapes, inlineSkip's five refusals
// + the ride. Plus the refusal builders (minLengthRefusal's
// prose, coerceRecord's falsy/object/pair-list/non-object arms)
// and needCardRegistry's absent-registry throw.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  edgeRef,
  inlineKind,
  inlineEdge,
  inlineSkip,
} from "../src/runsValidateInline.ts";
import {
  minLengthRefusal,
  coerceRecord,
} from "../src/runsValidateRefusals.ts";
import {
  FlowError,
  KIND_VOCAB,
  SKIP_VOCAB,
  needCardRegistry,
} from "../src/runsValidateShared.ts";

describe("edgeRef (the two spellings)", () => {
  it("initial edges read __initial__.<key>", () => {
    assert.equal(edgeRef({ kind: "initial", key: "seed" }), "__initial__.seed");
  });
  it("stage edges read <stage>.<output>", () => {
    assert.equal(edgeRef({ kind: "stage", stage: "s1", output: "image" }), "s1.image");
  });
});

describe("inlineKind (the closed Kind vocabulary)", () => {
  it("every member rides with its own name back", () => {
    for (const k of KIND_VOCAB) assert.equal(inlineKind("at", k), k);
  });
  it("a non-string refuses", () => {
    assert.throws(() => inlineKind("at", 7), FlowError);
    assert.throws(() => inlineKind("at", 7), /kind 7 is not a string/);
  });
  it("an unknown string refuses with the vocabulary", () => {
    assert.throws(() => inlineKind("at", "tensor"), /is not a Kind/);
    assert.throws(() => inlineKind("at", "tensor"), /closed vocabulary/);
  });
});

describe("inlineEdge (exactly two shapes)", () => {
  it('{"initial": key} rides as an initial edge', () => {
    assert.deepEqual(inlineEdge("at", { initial: "seed" }), {
      kind: "initial", key: "seed",
    });
  });
  it('{"stage", "output"} rides as a stage edge', () => {
    assert.deepEqual(inlineEdge("at", { stage: "s1", output: "img" }), {
      kind: "stage", stage: "s1", output: "img",
    });
  });
  it("a non-object refuses with the shape prose", () => {
    assert.throws(() => inlineEdge("at", "seed"), /is not an object/);
    assert.throws(() => inlineEdge("at", 7), /is not an object/);
  });
  it("wrong keys refuse (single non-initial, three keys, empty)", () => {
    assert.throws(() => inlineEdge("at", { other: 1 }), /are not an edge shape/);
    assert.throws(() => inlineEdge("at", {}), /are not an edge shape/);
    assert.throws(
      () => inlineEdge("at", { stage: "s", output: "o", extra: 1 }),
      /are not an edge shape/,
    );
  });
});

describe("inlineSkip (the branch law)", () => {
  it("null and undefined ride as no-skip", () => {
    assert.equal(inlineSkip("at", null), null);
    assert.equal(inlineSkip("at", undefined), null);
  });
  it("a well-formed skip rides", () => {
    assert.deepEqual(inlineSkip("at", { initial: "ref", when: "present" }), {
      initial: "ref", when: "present",
    });
  });
  it("a non-object refuses", () => {
    assert.throws(() => inlineSkip("at", 5), /is not an object/);
  });
  it("wrong keys refuse the exact shape", () => {
    assert.throws(() => inlineSkip("at", { initial: "x" }), /are not a branch shape/);
    assert.throws(
      () => inlineSkip("at", { initial: "x", when: "present", z: 1 }),
      /are not a branch shape/,
    );
  });
  it("a non-vocab 'when' refuses with the vocabulary", () => {
    assert.throws(
      () => inlineSkip("at", { initial: "x", when: "maybe" }),
      /is not a branch condition/,
    );
    assert.throws(
      () => inlineSkip("at", { initial: "x", when: 5 }),
      /is not a branch condition/,
    );
  });
  it("an empty or non-string initial refuses", () => {
    assert.throws(
      () => inlineSkip("at", { initial: "", when: "present" }),
      /is not a non-empty string/,
    );
    assert.throws(
      () => inlineSkip("at", { initial: 9, when: "absent" }),
      /is not a non-empty string/,
    );
  });
});

describe("the refusal builders", () => {
  it("minLengthRefusal renders the plain-TS prose", () => {
    assert.equal(
      minLengthRefusal("FlowError", "id"),
      "FlowError id must be a non-empty string",
    );
  });
  it("coerceRecord: objects ride copied; falsy rides {}", () => {
    assert.deepEqual(coerceRecord({ a: 1 }), { a: 1 });
    assert.deepEqual(coerceRecord(null), {});
    assert.deepEqual(coerceRecord(undefined), {});
    assert.deepEqual(coerceRecord(0), {});
    assert.deepEqual(coerceRecord(""), {});
  });
  it("coerceRecord: arrays (pair lists) and primitives refuse loud", () => {
    assert.throws(() => coerceRecord([["a", 1]]), /stage params must be an object/);
    assert.throws(() => coerceRecord(7), /stage params must be an object/);
    assert.throws(() => coerceRecord("x"), /stage params must be an object/);
  });
});

describe("needCardRegistry (the registry presence gate)", () => {
  it("a live registry rides through", () => {
    const like = { get: () => null };
    assert.equal(needCardRegistry(like as never, "where"), like);
  });
  it("null/undefined refuse with the stroke prose", () => {
    for (const absent of [null, undefined]) {
      assert.throws(
        () => needCardRegistry(absent, "validate"),
        /no CardRegistryService for validate/,
      );
    }
  });
});

// SKIP_VOCAB is exercised above; assert its shape for the census.
describe("vocab constants", () => {
  it("SKIP_VOCAB is the two-branch law", () => {
    assert.deepEqual([...SKIP_VOCAB], ["present", "absent"]);
  });
});
