// queue-voices.spec.ts — direct pins for the pure queue voice
// modules split out of queue.ts (2026-09-18): the refusal envelope,
// the submit pre-registration chain, the retry policy, and the
// stop/resume/reproduce refusals. These are door-verbatim shapes
// (the comments carry the Gateway line numbers they port); the
// door specs exercise them end-to-end, these pin EVERY arm —
// including the ones the doors never hit in anger.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  refusal,
  strictBodyCheck,
  validateSubmitEnvelope,
  SUBMIT_DOORS,
} from "../src/queueSubmit.ts";
import { shouldRetry, noteStageRetry } from "../src/queueRetry.ts";
import {
  refuseUnknownStop,
  refuseTerminalStop,
  refuseLiveResume,
  refuseNoDurableRecord,
  refuseCompletedResume,
  refuseUnresumable,
  refuseUnusableRecord,
  refuseLiveReproduce,
  refuseCardlessReplay,
  refuseMissingRequest,
  refuseNonObjectRequest,
} from "../src/queueLifecycle.ts";

describe("refusal envelope (queueSubmit)", () => {
  it("bare: error + code only, no optional keys", () => {
    assert.deepEqual(refusal(400, "boom", "bad"), {
      status: 400,
      payload: { error: "boom", code: "bad" },
    });
  });
  it("loc alone joins; expected/got stay absent", () => {
    assert.deepEqual(refusal(422, "nope", "x", "field"), {
      status: 422,
      payload: { error: "nope", code: "x", loc: "field" },
    });
  });
  it("loc + expected, got absent", () => {
    const r = refusal(400, "m", "c", "f", "object");
    assert.equal(r.payload["expected"], "object");
    assert.equal("got" in r.payload, false);
  });
  it("all five keys present", () => {
    const r = refusal(400, "m", "c", "f", "object", "string");
    assert.deepEqual(r.payload, {
      error: "m",
      code: "c",
      loc: "f",
      expected: "object",
      got: "string",
    });
  });
});

describe("strictBodyCheck (the retired-knob gate)", () => {
  const exists = (): boolean => true;
  it("retired runner knobs refuse (silent-drop class)", () => {
    const r = strictBodyCheck({ overrides: 1, draft_id: "d", flow: "f" });
    assert.equal(r?.payload["code"], "invalid_request");
    assert.match(String(r?.payload["error"]), /retired runner knob/);
  });
  it("underscore keys refuse (no underscore door key exists in the vocab)", () => {
    const r = strictBodyCheck({ _stowaway: 1, draft_id: "d", flow: "f" });
    assert.match(String(r?.payload["error"]), /retired runner knob/);
    assert.deepEqual(JSON.parse(String(r?.payload["error"]).match(/\[".*"\]/)?.[0] ?? "[]"), ["_stowaway"]);
  });
  it("retired carry keys refuse (the stowaway wire)", () => {
    const r = strictBodyCheck({ pipe: {}, draft_id: "d", flow: "f" });
    assert.match(String(r?.payload["error"]), /retired pipe-carry key/);
  });
  it("a clean body passes", () => {
    assert.equal(
      strictBodyCheck({ draft_id: "d", flow: "anny-hmr", params: {} }),
      null,
    );
  });
});

describe("validateSubmitEnvelope (the pre-registration chain, in order)", () => {
  const missing = (id: string): ((x: string) => boolean) => {
    return (x: string): boolean => x !== id;
  };
  it("non-object bodies refuse bad_envelope/body with the typeof", () => {
    for (const doc of [null, [], 7, "x", true]) {
      const r = validateSubmitEnvelope(doc, () => true);
      assert.equal(r?.payload["code"], "bad_envelope");
      assert.equal(r?.payload["loc"], "body");
      assert.equal(r?.payload["expected"], "object");
      assert.equal(r?.payload["got"], typeof doc);
    }
  });
  it("a non-boolean test flag refuses bad_envelope/test", () => {
    const r = validateSubmitEnvelope({ test: "yes", draft_id: "d", flow: "f" }, () => true);
    assert.equal(r?.payload["code"], "bad_envelope");
    assert.equal(r?.payload["loc"], "test");
    assert.equal(r?.payload["expected"], "boolean");
  });
  it("absent test defaults false and proceeds; false rides too", () => {
    assert.equal(validateSubmitEnvelope({ draft_id: "d", flow: "f" }, () => true), null);
    assert.equal(validateSubmitEnvelope({ test: false, draft_id: "d", flow: "f" }, () => true), null);
    assert.equal(validateSubmitEnvelope({ test: true, draft_id: "d", flow: "f" }, () => true), null);
  });
  it("missing or empty draft_id refuses draft_required (CARD BIRTH LAW)", () => {
    for (const doc of [{ flow: "f" }, { draft_id: "", flow: "f" }, { draft_id: 7, flow: "f" }]) {
      const r = validateSubmitEnvelope(doc, () => true);
      assert.equal(r?.payload["code"], "draft_required");
      assert.equal(r?.payload["loc"], "draft_id");
    }
  });
  it("malformed draft_id refuses draft_malformed with the head", () => {
    const r = validateSubmitEnvelope({ draft_id: "bad!id", flow: "f" }, () => true);
    assert.equal(r?.payload["code"], "draft_malformed");
    assert.equal(r?.payload["expected"], "[A-Za-z0-9_-]{1,96}");
  });
  it("well-formed but absent draft refuses draft_unknown", () => {
    const r = validateSubmitEnvelope({ draft_id: "ghost", flow: "f" }, missing("ghost"));
    assert.equal(r?.payload["code"], "draft_unknown");
    assert.match(String(r?.payload["error"]), /no card doc at drafts\/ghost\.json/);
  });
  it("strict knobs fire before door ambiguity", () => {
    const r = validateSubmitEnvelope(
      { draft_id: "d", flow: "f", model: "m", since: 1 },
      () => true,
    );
    assert.match(String(r?.payload["error"]), /retired runner knob/);
  });
  it("two doors refuse ambiguous, DOOR order not sorted", () => {
    const r = validateSubmitEnvelope(
      { draft_id: "d", model: "m", flow: "f" },
      () => true,
    );
    assert.equal(r?.payload["code"], "invalid_request");
    assert.match(String(r?.payload["error"]), /"flow","model"/);
  });
  it("no door refuses no-door", () => {
    const r = validateSubmitEnvelope({ draft_id: "d", params: {} }, () => true);
    assert.match(String(r?.payload["error"]), /provide flow, flow_inline or model/);
  });
  it("each door alone proceeds; SUBMIT_DOORS order is the law", () => {
    assert.deepEqual(SUBMIT_DOORS, ["flow", "flow_inline", "model"]);
    for (const k of SUBMIT_DOORS) {
      assert.equal(validateSubmitEnvelope({ draft_id: "d", [k]: "x" }, () => true), null);
    }
  });
});

describe("shouldRetry (R3.3: attempts remain AND no stop)", () => {
  it("attempts remaining, no stop: retry", () => {
    assert.equal(shouldRetry({ attempt: 0, maxExtra: 2, stopSet: false }), true);
  });
  it("attempts exhausted: never (even without a stop)", () => {
    assert.equal(shouldRetry({ attempt: 2, maxExtra: 2, stopSet: false }), false);
    assert.equal(shouldRetry({ attempt: 5, maxExtra: 2, stopSet: false }), false);
  });
  it("a deliberate STOP never retries (even with attempts left)", () => {
    assert.equal(shouldRetry({ attempt: 0, maxExtra: 2, stopSet: true }), false);
  });
});

describe("noteStageRetry (one documented retry)", () => {
  it("the three rows agree on attempt + stage identity", () => {
    const n = noteStageRetry("run-1", "st-b", 2, 1, "engine 502");
    assert.deepEqual(n.stagePatch, { retries_used: 1, retry_last_error: "engine 502" });
    assert.equal(n.ledgerEvent, "run.stage_retry");
    assert.deepEqual(n.ledgerData, {
      run_id: "run-1",
      stage: "st-b",
      attempt: 1,
      error: "engine 502",
    });
    assert.deepEqual(n.busFrame, { type: "stage", stage: "st-b", index: 2, retry: 1 });
  });
});

describe("stop / resume / reproduce refusals (queueLifecycle)", () => {
  it("unknown stop", () => {
    const r = refuseUnknownStop("r-9");
    assert.equal(r.status, 400);
    assert.deepEqual(r.payload, {
      error: 'unknown run_id "r-9"',
      code: "run_unknown",
      loc: "run_id",
    });
  });
  it("terminal stop is a 200 error-only envelope", () => {
    const r = refuseTerminalStop("completed");
    assert.deepEqual(r, {
      status: 200,
      payload: { error: "cannot stop run in state completed" },
    });
  });
  it("live resume", () => {
    const r = refuseLiveResume("r-1", "running");
    assert.equal(r.payload["code"], "run_live");
    assert.equal(r.payload["expected"], "failed|stopped");
    assert.equal(r.payload["got"], "running");
  });
  it("no durable record (resume + reproduce share it)", () => {
    const r = refuseNoDurableRecord("r-2");
    assert.equal(r.payload["code"], "run_unknown");
    assert.match(String(r.payload["error"]), /no durable record/);
  });
  it("completed resume", () => {
    const r = refuseCompletedResume("r-3");
    assert.equal(r.payload["code"], "run_completed");
    assert.equal(r.payload["got"], "completed");
  });
  it("unresumable: a named status voices it verbatim", () => {
    const r = refuseUnresumable("r-4", "queued");
    assert.equal(r.payload["code"], "run_not_resumable");
    assert.equal(r.payload["got"], "queued");
  });
  it("unresumable: an EMPTY status voices unknown (the honest arm)", () => {
    const r = refuseUnresumable("r-5", "");
    assert.equal(r.payload["got"], "unknown");
    assert.equal(r.payload["expected"], "failed|stopped");
  });
  it("unusable record", () => {
    const r = refuseUnusableRecord("r-6");
    assert.equal(r.payload["code"], "run_record_unusable");
    assert.match(String(r.payload["error"]), /resubmit instead/);
  });
  it("live reproduce", () => {
    const r = refuseLiveReproduce("r-7", "running");
    assert.equal(r.payload["code"], "run_live");
    assert.equal(r.payload["expected"], "completed|failed|stopped");
    assert.equal(r.payload["got"], "running");
  });
  it("cardless legacy replay", () => {
    const r = refuseCardlessReplay("r-8");
    assert.equal(r.payload["code"], "run_cardless");
    assert.equal(r.payload["loc"], "draft_id");
    assert.equal(r.payload["got"], "absent");
  });
  it("missing + non-object recorded request", () => {
    const a = refuseMissingRequest("r-10");
    assert.equal(a.payload["code"], "run_record_unusable");
    const b = refuseNonObjectRequest("r-11", "string");
    assert.equal(b.payload["expected"], "object");
    assert.equal(b.payload["got"], "string");
  });
});
