// queue-voices.spec.ts — direct pins for the pure queue voice
// modules split out of queue.ts (2026-09-18): the refusal envelope,
// the submit pre-registration chain, and the retry policy. These
// are door-verbatim shapes (the comments carry the Gateway line
// numbers they port); the door specs exercise them end-to-end,
// these pin EVERY arm — including the ones the doors never hit in
// anger. (The stop/resume/reproduce constructor pins left with the
// dead constructors themselves — the wire-chain audit cure,
// 2026-10-18: src had zero call sites for them.)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  refusal,
  strictBodyCheck,
  walkSubmitEnvelope,
  submitDoorsOf,
  ambiguousDoorsRefusal,
  noDoorRefusal,
  SUBMIT_DOORS,
} from "../src/queueSubmit.ts";
import { shouldRetry, noteStageRetry } from "../src/queueRetry.ts";

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

describe("walkSubmitEnvelope (the one pre-registration walker, in order)", () => {
  const ok = (): boolean => true;
  it("non-object bodies refuse bad_envelope/body with the typeof (arrays say array — the one voice)", async () => {
    for (const doc of [null, 7, "x", true]) {
      const w = await walkSubmitEnvelope(doc, ok);
      assert.equal(w.kind, "refusal");
      if (w.kind !== "refusal") return;
      assert.equal(w.refusal.payload["code"], "bad_envelope");
      assert.equal(w.refusal.payload["loc"], "body");
      assert.equal(w.refusal.payload["expected"], "object");
      assert.equal(w.refusal.payload["got"], typeof doc);
    }
    // arrays voice "array", never a misleading "object" — the same
    // table the registry's live envelope walk speaks
    const w = await walkSubmitEnvelope([], ok);
    assert.equal(w.kind, "refusal");
    if (w.kind !== "refusal") return;
    assert.equal(w.refusal.payload["got"], "array");
  });
  it("a non-boolean test flag refuses bad_envelope/test", async () => {
    const w = await walkSubmitEnvelope({ test: "yes", draft_id: "d", flow: "f" }, ok);
    assert.equal(w.kind, "refusal");
    if (w.kind !== "refusal") return;
    assert.equal(w.refusal.payload["code"], "bad_envelope");
    assert.equal(w.refusal.payload["loc"], "test");
    assert.equal(w.refusal.payload["expected"], "boolean");
  });
  it("absent test rides the ok face with testFlag false; true and false carry through", async () => {
    const plain = await walkSubmitEnvelope({ draft_id: "d", flow: "f" }, ok);
    assert.equal(plain.kind, "ok");
    if (plain.kind !== "ok") return;
    assert.equal(plain.testFlag, false);
    const off = await walkSubmitEnvelope({ test: false, draft_id: "d", flow: "f" }, ok);
    const on = await walkSubmitEnvelope({ test: true, draft_id: "d", flow: "f" }, ok);
    assert.equal(off.kind === "ok" && off.testFlag, false);
    assert.equal(on.kind === "ok" && on.testFlag, true);
  });
  it("THE PER-RUN CEILING (F8): a non-numeric execute_ceil_ms refuses at the walk, never past it", async () => {
    for (const bad of ["30min", true, null, Number.NaN, Number.POSITIVE_INFINITY]) {
      const w = await walkSubmitEnvelope({ draft_id: "d", model: "m", execute_ceil_ms: bad }, ok);
      assert.equal(w.kind, "refusal");
      if (w.kind !== "refusal") return;
      assert.equal(w.refusal.payload["code"], "bad");
      assert.equal(w.refusal.payload["loc"], "execute_ceil_ms");
      assert.match(String(w.refusal.payload["error"]), /finite number of milliseconds/);
    }
    // absent, positive, and the disabling `<= 0` ride the ok face
    for (const [doc, want] of [
      [{ draft_id: "d", model: "m" }, undefined],
      [{ draft_id: "d", model: "m", execute_ceil_ms: 3_600_000 }, 3_600_000],
      [{ draft_id: "d", model: "m", execute_ceil_ms: 0 }, 0],
    ] as const) {
      const w = await walkSubmitEnvelope(doc, ok);
      assert.equal(w.kind, "ok");
      if (w.kind !== "ok") return;
      assert.equal(w.ceilMs, want);
    }
  });
  it("missing or empty draft_id refuses draft_required (CARD BIRTH LAW)", async () => {
    for (const doc of [{ flow: "f" }, { draft_id: "", flow: "f" }, { draft_id: 7, flow: "f" }]) {
      const w = await walkSubmitEnvelope(doc, ok);
      assert.equal(w.kind, "refusal");
      if (w.kind !== "refusal") return;
      assert.equal(w.refusal.payload["code"], "draft_required");
      assert.equal(w.refusal.payload["loc"], "draft_id");
    }
  });
  it("malformed draft_id refuses draft_malformed with the head", async () => {
    const w = await walkSubmitEnvelope({ draft_id: "bad!id", flow: "f" }, ok);
    assert.equal(w.kind, "refusal");
    if (w.kind !== "refusal") return;
    assert.equal(w.refusal.payload["code"], "draft_malformed");
    assert.equal(w.refusal.payload["expected"], "[A-Za-z0-9_-]{1,96}");
  });
  it("well-formed but absent draft refuses draft_unknown (the probe rides the caller's seat)", async () => {
    const w = await walkSubmitEnvelope({ draft_id: "ghost", flow: "f" }, (x) => x !== "ghost");
    assert.equal(w.kind, "refusal");
    if (w.kind !== "refusal") return;
    assert.equal(w.refusal.payload["code"], "draft_unknown");
    assert.match(String(w.refusal.payload["error"]), /no card doc at drafts\/ghost\.json/);
  });
  it("the structural faces outrank the draft probe: a malformed body refuses before any probe runs", async () => {
    let probed = false;
    const w = await walkSubmitEnvelope(null, () => {
      probed = true;
      return true;
    });
    assert.equal(w.kind, "refusal");
    assert.equal(probed, false, "the structural refusal precedes the probe (no wasted seat hop)");
  });
  it("strict knobs and door selection live at startReserved, past the walk — the pieces stay pinned here", () => {
    // the walker's ok face is door-blind by design: strict + doors
    // judge AFTER the replay/reservation verdict on the live face
    // (runsRegistry startReserved), from THESE pieces.
    const r = strictBodyCheck({ draft_id: "d", flow: "f", model: "m", since: 1 });
    assert.match(String(r?.payload["error"]), /retired runner knob/);
    const doors = submitDoorsOf({ draft_id: "d", model: "m", flow: "f" });
    assert.deepEqual(doors, ["flow", "model"]);
    assert.equal(ambiguousDoorsRefusal(doors).payload["code"], "invalid_request");
    assert.match(String(noDoorRefusal().payload["error"]), /provide flow, flow_inline or model/);
  });
  it("each door alone walks ok; SUBMIT_DOORS order is the law", async () => {
    assert.deepEqual(SUBMIT_DOORS, ["flow", "flow_inline", "model"]);
    for (const k of SUBMIT_DOORS) {
      const w = await walkSubmitEnvelope({ draft_id: "d", [k]: "x" }, ok);
      assert.equal(w.kind, "ok");
    }
  });
});

describe("the doors twin (one home, two seats — the envelope-twin cure's parity wall)", () => {
  it("both submit faces answer the SAME door refusals for the same bodies; the one-door selections agree", async () => {
    const { selectSubmitDoor } = await import("../src/runsStart.ts");
    type AnyRefusal = { payload: Record<string, unknown> };
    const twoDoors: Record<string, unknown> = { draft_id: "d", model: "m", flow: "f" };
    const noDoor: Record<string, unknown> = { draft_id: "d", params: {} };
    // the walker is door-blind by design — the shared door helpers
    // ARE the core face; the runs seat composes them into
    // selectSubmitDoor (same texts, one home: queueSubmit).
    const coreAmb = ambiguousDoorsRefusal(submitDoorsOf(twoDoors));
    const runsAmb = selectSubmitDoor(twoDoors) as unknown as AnyRefusal;
    assert.equal(runsAmb.payload["error"], coreAmb.payload["error"]);
    assert.equal(runsAmb.payload["code"], coreAmb.payload["code"]);
    const coreNone = noDoorRefusal();
    const runsNone = selectSubmitDoor(noDoor) as unknown as AnyRefusal;
    assert.equal(runsNone.payload["error"], coreNone.payload["error"]);
    // the one-door selections agree across the door set
    for (const k of SUBMIT_DOORS) {
      assert.equal(
        (selectSubmitDoor({ draft_id: "d", [k]: "x" }) as unknown as { door: string }).door,
        k,
      );
    }
    // the DRAFT DOOR stays the runs seat's own arm (never the core's)
    assert.deepEqual(selectSubmitDoor({ draft_id: "d" }, { draftBench: true }), { door: "draft" });
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
