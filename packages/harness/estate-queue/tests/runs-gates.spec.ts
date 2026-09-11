// runs-gates.spec.ts — the gateway-plane admission verdicts: the
// strict-wire decode, the estate record gate (PyNum exclusion), the
// leaf STRUCTURE verdicts, and every composite gate's full verdict
// order. Voices never escape here — only STRUCTURE kinds.
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
  checkStrictBody,
  checkUploadsStructure,
  checkFlowsStartEnvelope,
  checkFlowInlineTop,
  checkFlowStage,
  checkDraftPatch,
  UPLOADS_VOICE,
  FLOW_INLINE_TOP_VOICE,
  DRAFT_PATCH_VOICE,
} from "../src/runsGates.ts";
import { PyNum } from "../src/pyValue.ts";

const enc = (s: string): Uint8Array => Buffer.from(s, "utf-8");

describe("decodeStrictBody", () => {
  it("empty rides as {}", () => {
    assert.deepEqual(decodeStrictBody(enc("")), { text: "{}" });
  });

  it("valid JSON rides verbatim", () => {
    assert.deepEqual(decodeStrictBody(enc('{"a":1}')), { text: '{"a":1}' });
  });

  it("malformed JSON refuses bad_json with the parser voice", () => {
    const out = decodeStrictBody(enc("{nope"));
    assert.equal((out as { status: number }).status, 400);
    assert.equal((out as { payload: { code: string } }).payload.code, "bad_json");
    assert.match((out as { payload: { error: string } }).payload.error, /^bad JSON: /);
  });
});

describe("parseStrictJson", () => {
  it("decodes the doc on the happy wire", () => {
    assert.deepEqual(parseStrictJson(enc('{"a":[1]}')), { doc: { a: [1] } });
    assert.deepEqual(parseStrictJson(enc("")), { doc: {} });
  });

  it("the refusal rides through", () => {
    const out = parseStrictJson(enc("{nope"));
    assert.equal((out as { status: number }).status, 400);
  });
});

describe("isRecord", () => {
  it("plain mappings pass, everything else refuses", () => {
    assert.equal(isRecord({}), true);
    assert.equal(isRecord({ a: 1 }), true);
    assert.equal(isRecord(Object.create(null)), true);
    assert.equal(isRecord("x"), false);
    assert.equal(isRecord(42), false);
    assert.equal(isRecord(null), false);
    assert.equal(isRecord(undefined), false);
    assert.equal(isRecord([]), false);
    assert.equal(isRecord(new PyNum("1.0")), false);
    assert.equal(isRecord(Object.create({})), false);
  });
});

describe("leaf verdicts", () => {
  it("string: strings pass, absent/null/non-strings refuse", () => {
    assert.equal(isStringField("a"), true);
    assert.equal(isStringField(""), true);
    assert.equal(isStringField(undefined), false);
    assert.equal(isStringField(null), false);
    assert.equal(isStringField(5), false);
  });

  it("bool: strict — 0/1/\"true\" refuse", () => {
    assert.equal(isBoolField(true), true);
    assert.equal(isBoolField(false), true);
    assert.equal(isBoolField(0), false);
    assert.equal(isBoolField(1), false);
    assert.equal(isBoolField("true"), false);
  });

  it("number: numbers pass, strings/NaN-boxed refuse", () => {
    assert.equal(isNumberField(3), true);
    assert.equal(isNumberField("3"), false);
    assert.equal(isNumberField(undefined), false);
  });

  it("list: arrays pass, dicts refuse", () => {
    assert.equal(isListField([]), true);
    assert.equal(isListField([1]), true);
    assert.equal(isListField({}), false);
    assert.equal(isListField("a"), false);
  });

  it("dict: records pass, PyNums refuse (the estate exclusion)", () => {
    assert.equal(isDictField({}), true);
    assert.equal(isDictField(new PyNum("1.0")), false);
    assert.equal(isDictField([]), false);
  });
});

describe("checkStrictBody", () => {
  it("clean bodies offend nothing", () => {
    assert.deepEqual(checkStrictBody({ flow: "x", model: "m" }), { bad: [], carry: [] });
  });

  it("retired knobs and underscore stowaways offend (door keys pass)", () => {
    const out = checkStrictBody({
      start_from: 1,
      _secret: 2,
      flow: 4,
    });
    assert.deepEqual(out.bad, ["start_from", "_secret"]);
    assert.deepEqual(out.carry, []);
  });

  it("pipe-carry keys ride the carry list", () => {
    assert.deepEqual(checkStrictBody({ pipe: 1, stage_id: 2 }).carry, [
      "pipe",
      "stage_id",
    ]);
  });
});

describe("checkUploadsStructure", () => {
  it("verdict order: object, filename, data", () => {
    assert.deepEqual(checkUploadsStructure([1]).kind, "not-object");
    assert.deepEqual(checkUploadsStructure("x").kind, "not-object");
    assert.deepEqual(checkUploadsStructure({}).kind, "bad-filename");
    assert.deepEqual(checkUploadsStructure({ filename: 5 }).kind, "bad-filename");
    assert.deepEqual(checkUploadsStructure({ filename: "f" }).kind, "bad-data");
    assert.deepEqual(checkUploadsStructure({ filename: "f", data: 5 }).kind, "bad-data");
  });

  it("the ok verdict carries filename + data", () => {
    assert.deepEqual(checkUploadsStructure({ filename: "f", data: "data:x" }), {
      kind: "ok",
      filename: "f",
      dataUrl: "data:x",
    });
  });

  it("the voice table covers every refusal kind", () => {
    assert.deepEqual(Object.keys(UPLOADS_VOICE).sort(), [
      "bad-data",
      "bad-filename",
      "not-object",
    ]);
  });
});

describe("checkFlowsStartEnvelope", () => {
  it("verdict order: object, test-bool, draft presence, draft shape", () => {
    assert.deepEqual(checkFlowsStartEnvelope([]).kind, "not-object");
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: "d", test: "yes" }).kind, "bad-test");
    assert.deepEqual(
      (checkFlowsStartEnvelope({ draft_id: "d", test: "yes" }) as { testFlag: unknown }).testFlag,
      "yes",
    );
    assert.deepEqual(checkFlowsStartEnvelope({}).kind, "missing-draft");
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: "" }).kind, "missing-draft");
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: 5 }).kind, "missing-draft");
    assert.deepEqual(checkFlowsStartEnvelope({ draft_id: "has space" }).kind, "malformed-draft");
  });

  it("the ok verdict carries body + test flag (default false)", () => {
    const body = { draft_id: "d_1" };
    assert.deepEqual(checkFlowsStartEnvelope(body), { kind: "ok", body, testFlag: false });
    assert.deepEqual(checkFlowsStartEnvelope({ ...body, test: true }), {
      kind: "ok",
      body: { ...body, test: true },
      testFlag: true,
    });
  });
});

describe("checkFlowInlineTop", () => {
  const good = { id: "f", stages: [{ id: "s" }] };
  it("verdict order: object, unknown keys, id+stages, non-empty list", () => {
    assert.deepEqual(checkFlowInlineTop(5).kind, "not-object");
    assert.deepEqual(checkFlowInlineTop({ ...good, bogus: 1 }).kind, "unknown-keys");
    assert.deepEqual(checkFlowInlineTop({ id: "f" }).kind, "missing-id-stages");
    assert.deepEqual(checkFlowInlineTop({ stages: [] }).kind, "missing-id-stages");
    assert.deepEqual(checkFlowInlineTop({ id: "f", stages: {} }).kind, "bad-stages");
    assert.deepEqual(checkFlowInlineTop({ id: "f", stages: [] }).kind, "bad-stages");
  });

  it("the ok verdict carries the record", () => {
    assert.deepEqual(checkFlowInlineTop(good), { kind: "ok", rec: good });
  });

  it("the voice table covers the static arms", () => {
    assert.equal(FLOW_INLINE_TOP_VOICE["not-object"], "flow body must be a JSON object");
    assert.equal(FLOW_INLINE_TOP_VOICE["bad-stages"], "flow stages must be a non-empty list");
  });
});

describe("checkFlowStage", () => {
  it("verdict order: object, unknown fields, id legality", () => {
    assert.deepEqual(checkFlowStage(5).kind, "not-object");
    const extra = checkFlowStage({ id: "s", bogus: 1 });
    assert.equal(extra.kind, "unknown-fields");
    assert.deepEqual((extra as { extras: string[] }).extras, ["bogus"]);
    assert.deepEqual(checkFlowStage({}).kind, "bad-id");
    assert.deepEqual(checkFlowStage({ id: "Has Space" }).kind, "bad-id");
  });

  it("legal ids ride ok", () => {
    const st = { id: "a-1_x" };
    assert.deepEqual(checkFlowStage(st), { kind: "ok", st });
  });
});

describe("checkDraftPatch", () => {
  it("non-objects and unknown keys refuse first", () => {
    assert.deepEqual(checkDraftPatch(5).kind, "not-object");
    const unk = checkDraftPatch({ bogus: 1 });
    assert.equal(unk.kind, "unknown-keys");
    assert.deepEqual((unk as { unknown: string[] }).unknown, ["bogus"]);
  });

  it("every field gate refuses its verdict in table order", () => {
    assert.deepEqual(checkDraftPatch({ result: 5 }).kind, "bad-result");
    assert.deepEqual(checkDraftPatch({ runStatus: 5 }).kind, "bad-runStatus");
    assert.deepEqual(checkDraftPatch({ params: 5 }).kind, "bad-params");
    assert.deepEqual(checkDraftPatch({ inputs: {} }).kind, "bad-inputs");
    assert.deepEqual(checkDraftPatch({ inputOutputs: {} }).kind, "bad-inputOutputs");
  });

  it("absent keys skip, valid keys pass through to ok", () => {
    assert.deepEqual(checkDraftPatch({}), { kind: "ok", patch: {} });
    const patch = {
      result: {},
      runStatus: "s",
      params: {},
      inputs: [],
      inputOutputs: [],
    };
    assert.deepEqual(checkDraftPatch(patch), { kind: "ok", patch });
  });

  it("the voice table covers every static refusal", () => {
    assert.deepEqual(Object.keys(DRAFT_PATCH_VOICE).sort(), [
      "bad-inputOutputs",
      "bad-inputs",
      "bad-params",
      "bad-result",
      "bad-runStatus",
      "not-object",
    ]);
  });
});
