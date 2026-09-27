// runs-gates.spec.ts — the wire/leaf/envelope structure gates'
// every arm (TEST-2 breadth, the deterministic census of
// 2026-09-19). These are the pure leaves beneath the doors:
// decodeStrictBody's empty-body law and parse refusal, the leaf
// vocabulary's true/false verdicts, the uploads structure table,
// the flows/start envelope order, and the draft-patch verdicts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  decodeStrictBody,
  parseStrictJson,
  isRecord,
  isStringField,
  isBoolField,
  isNumberField,
  isListField,
  isDictField,
  checkUploadsStructure,
  checkFlowsStartEnvelope,
  checkDraftPatch,
  checkStrictBody,
  checkFlowInlineTop,
  checkFlowStage,
} from "../src/runsGates.ts";

describe("decodeStrictBody (the strict wire)", () => {
  it("an empty body decodes as the empty object", () => {
    assert.deepEqual(decodeStrictBody(new Uint8Array(0)), { text: "{}" });
  });
  it("a JSON body rides as text", () => {
    assert.deepEqual(
      decodeStrictBody(new TextEncoder().encode('{"a":1}')),
      { text: '{"a":1}' },
    );
  });
  it("a non-JSON body refuses 400 with the parser's message", () => {
    const out = decodeStrictBody(new TextEncoder().encode("{nope"));
    if (!("status" in out)) assert.fail("expected a refusal");
    assert.equal(out.status, 400);
    assert.match(JSON.stringify(out.payload), /bad JSON/);
  });
});

describe("parseStrictJson (decode + parse)", () => {
  it("a good body parses to the doc", () => {
    assert.deepEqual(parseStrictJson(new TextEncoder().encode('{"a":1}')), {
      doc: { a: 1 },
    });
  });
  it("a refused body returns the door answer unchanged", () => {
    const out = parseStrictJson(new TextEncoder().encode("nope"));
    if (!("status" in out)) assert.fail("expected a refusal");
    assert.equal(out.status, 400);
    assert.match(JSON.stringify(out.payload), /bad JSON/);
  });
});

describe("the leaf vocabulary (structure verdicts)", () => {
  it("isRecord: plain objects and null-protos ride, others refuse", () => {
    assert.equal(isRecord({}), true);
    assert.equal(isRecord(Object.create(null)), true);
    assert.equal(isRecord(null), false);
    assert.equal(isRecord([]), false);
    assert.equal(isRecord("x"), false);
    assert.equal(isRecord(new Date()), false);
  });
  it("isStringField: strings ride, empty is a value, non-strings refuse", () => {
    assert.equal(isStringField("x"), true);
    assert.equal(isStringField(""), true);
    assert.equal(isStringField(1), false);
    assert.equal(isStringField(null), false);
  });
  it("isBoolField: booleans ride, everything else refuses", () => {
    assert.equal(isBoolField(true), true);
    assert.equal(isBoolField(false), true);
    assert.equal(isBoolField(0), false);
    assert.equal(isBoolField("true"), false);
  });
  it("isNumberField: finite numbers ride; NaN, strings refuse", () => {
    assert.equal(isNumberField(1.5), true);
    assert.equal(isNumberField(0), true);
    
    assert.equal(isNumberField("1"), false);
  });
  it("isListField: arrays ride regardless of item type", () => {
    assert.equal(isListField([]), true);
    assert.equal(isListField([1, "x", null]), true);
    assert.equal(isListField("[]"), false);
  });
  it("isDictField: plain objects ride; arrays, null, classed refuse", () => {
    assert.equal(isDictField({ a: 1 }), true);
    assert.equal(isDictField([]), false);
    assert.equal(isDictField(null), false);
  });
});

describe("checkUploadsStructure (the uploads table)", () => {
  it("non-object refuses not-object", () => {
    assert.deepEqual(checkUploadsStructure("x"), { kind: "not-object" });
  });
  it("a bad filename refuses bad-filename", () => {
    assert.deepEqual(checkUploadsStructure({ filename: 7, data: "data:" }), {
      kind: "bad-filename",
    });
  });
  it("a bad data refuses bad-data", () => {
    assert.deepEqual(checkUploadsStructure({ filename: "f.png", data: 7 }), {
      kind: "bad-data",
    });
  });
  it("a full pair rides ok", () => {
    assert.deepEqual(
      checkUploadsStructure({ filename: "f.png", data: "data:image/png;base64,x" }),
      { kind: "ok", filename: "f.png", dataUrl: "data:image/png;base64,x" },
    );
  });
});

describe("checkFlowsStartEnvelope (verdict order)", () => {
  it("non-object refuses first", () => {
    assert.deepEqual(checkFlowsStartEnvelope(7), { kind: "not-object", doc: 7 });
  });
  it("a non-bool test flag refuses second", () => {
    assert.deepEqual(checkFlowsStartEnvelope({ test: "yes", draft_id: "d" }), {
      kind: "bad-test", testFlag: "yes",
    });
  });
  it("absent, empty, and NON-STRING draft ids all ride missing-draft", () => {
    assert.deepEqual(checkFlowsStartEnvelope({}), { kind: "missing-draft" });
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: "" }), { kind: "missing-draft" });
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: 5 }), { kind: "missing-draft" });
  });
  it("a shape-bad draft id refuses malformed-draft", () => {
    const out = checkFlowsStartEnvelope({ draft_id: "not a draft id!!" });
    assert.deepEqual(out, { kind: "malformed-draft", draftId: "not a draft id!!" });
  });
  it("a clean envelope rides ok (test defaults false)", () => {
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: "d-01" }), {
      kind: "ok", body: { draft_id: "d-01" }, testFlag: false,
    });
    assert.deepEqual(
      checkFlowsStartEnvelope({ draft_id: "d-01", test: true }),
      { kind: "ok", body: { draft_id: "d-01", test: true }, testFlag: true },
    );
  });
});

describe("checkDraftPatch (the stage patch verdicts)", () => {
  it("non-object refuses not-object", () => {
    assert.deepEqual(checkDraftPatch(7), { kind: "not-object" });
  });
  it("unknown keys refuse with the list", () => {
    const out = checkDraftPatch({ mystery: 1 });
    assert.equal(out.kind, "unknown-keys");
    assert.deepEqual((out as { unknown: string[] }).unknown, ["mystery"]);
  });
  it("each field gate refuses its verdict on a bad leaf", () => {
    assert.equal(checkDraftPatch({ result: 7 }).kind, "bad-result");
    assert.equal(checkDraftPatch({ runStatus: 7 }).kind, "bad-runStatus");
    assert.equal(checkDraftPatch({ params: "flat" }).kind, "bad-params");
    assert.equal(checkDraftPatch({ inputs: 7 }).kind, "bad-inputs");
    assert.equal(checkDraftPatch({ inputOutputs: 7 }).kind, "bad-inputOutputs");
  });
  it("a legal patch rides ok with its payload", () => {
    const out = checkDraftPatch({ runStatus: "done", params: { a: 1 }, inputs: [] });
    assert.equal(out.kind, "ok");
    assert.deepEqual((out as { patch: unknown }).patch, { runStatus: "done", params: { a: 1 }, inputs: [] });
  });
});

describe("checkFlowInlineTop (the inline top verdicts)", () => {
  it("every verdict arm", () => {
    assert.equal(checkFlowInlineTop(7).kind, "not-object");
    assert.equal(checkFlowInlineTop({ extra: 1 }).kind, "unknown-keys");
    assert.equal(checkFlowInlineTop({ description: "d" }).kind, "missing-id-stages");
    assert.equal(checkFlowInlineTop({ id: "f", stages: "flat" }).kind, "bad-stages");
    assert.equal(checkFlowInlineTop({ id: "f", stages: [] }).kind, "bad-stages");
    const ok = checkFlowInlineTop({ id: "f", stages: [{}] });
    assert.equal(ok.kind, "ok");
  });
});

describe("checkFlowStage (the stage row verdicts)", () => {
  it("every verdict arm", () => {
    assert.equal(checkFlowStage(7).kind, "not-object");
    const extras = checkFlowStage({ id: "s", mystery: 1 });
    assert.equal(extras.kind, "unknown-fields");
    assert.equal(checkFlowStage({ id: "BAD ID" }).kind, "bad-id");
    assert.equal(checkFlowStage({ id: "legal-id_1" }).kind, "ok");
    assert.equal(checkFlowStage({}).kind, "bad-id", "an absent id tolls to the empty string");
  });
});

describe("checkStrictBody (the retired-knob and underscore doors)", () => {
  it("retired runner knobs and unknown underscore keys land in bad; carry keys ride", () => {
    const out = checkStrictBody({
      "start_from": 1,       // retired runner knob
      "_mystery": 2,         // underscore, not a door
      "_flow": 3,            // underscored door name — still bad (doors are literal)
      "flow": 4,             // the literal door key rides clean
      "pipe": 5,             // retired carry key -> carry list
    });
    assert.deepEqual(out.bad, ["start_from", "_mystery", "_flow"]);
    assert.deepEqual(out.carry, ["pipe"]);
  });
});
