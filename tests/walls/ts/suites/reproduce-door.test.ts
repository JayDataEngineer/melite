// reproduce-door.test.ts — THE REPRODUCE WALL (the exact-resubmit
// landing, 2026-09-09): POST /v1/flows/reproduce/<id> refusal gates
// byte-exact + the replayable verdict that replaced the py-era
// preview_scope stub. The preview refusal is DEAD — a replayable
// record must reach the ONE start arm (its refusal voice passes
// through verbatim), never a synthetic preview.
//
// Pinned shapes:
//   1. UNIT GATES (handleFlowsReproduce, byte-exact): run_live →
//      run_unknown → run_cardless → run_record_unusable (absent) →
//      run_record_unusable (non-object) — order is the contract.
//   2. REPLAYABLE VERDICT: a settled, card-backed, object-request
//      record returns {replayable, request} — the verbatim recorded
//      body, never a refusal.
//   3. HTTP WIRE: the same gates over the sandbox door + the
//      exact-resubmit pass-through (a stale draft answers the START
//      arm's draft_unknown voice — proof the replay rides the one
//      submit path, and preview_scope never answers again).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/reproduce-door.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, reap } from "../helpers/boot.ts";
import type { Sandbox } from "../helpers/boot.ts";
import { handleFlowsReproduce } from "../../../../packages/gateway/queue/src/queue/reproduce.ts";

const TOKEN = "wall-ts-reproduce-2026-09-09";

function seedRecord(
  runsRoot: string,
  id: string,
  flow: Record<string, unknown> | null,
  request: string | null,
): void {
  const dir = join(runsRoot, id);
  mkdirSync(dir, { recursive: true });
  if (flow !== null) {
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({ status: "success", draft_id: "", ...flow }),
    );
  }
  if (request !== null) {
    writeFileSync(join(dir, "_request.json"), request);
  }
}

describe("reproduce gates (unit, byte-exact)", () => {
  const stateRoot: string = mkdtempSync(join(tmpdir(), "wall-ts-repro-"));
  const runsRoot: string = join(stateRoot, "output");

  it("live queued/running refuses run_live first (order is the contract)", () => {
    for (const live of ["queued", "running"] as const) {
      const a = handleFlowsReproduce("run-live", live, stateRoot, runsRoot);
      assert.ok(!("replayable" in a), "live never reaches the record gates");
      assert.equal(a.status, 400);
      assert.equal(a.payload["code"], "run_live");
      assert.equal(
        a.payload["error"],
        "run run-live is still " + live + " — wait for it to settle or stop it first",
      );
    }
  });

  it("no durable record refuses run_unknown", () => {
    const a = handleFlowsReproduce("run-missing", null, stateRoot, runsRoot);
    assert.ok(!("replayable" in a));
    assert.equal(a.status, 400);
    assert.equal(a.payload["code"], "run_unknown");
    assert.equal(a.payload["error"], "no durable record for run 'run-missing'");
  });

  it("cardless legacy row refuses run_cardless", () => {
    seedRecord(runsRoot, "run-cardless", { prompt: "p" }, null);
    const a = handleFlowsReproduce("run-cardless", null, stateRoot, runsRoot);
    assert.ok(!("replayable" in a));
    assert.equal(a.payload["code"], "run_cardless");
    assert.equal(
      a.payload["error"],
      "run run-cardless is a cardless legacy row (no draft_id) — compose a fresh card to replay it",
    );
  });

  it("missing request body refuses run_record_unusable", () => {
    seedRecord(runsRoot, "run-noreq", { draft_id: "d1" }, null);
    const a = handleFlowsReproduce("run-noreq", null, stateRoot, runsRoot);
    assert.ok(!("replayable" in a));
    assert.equal(a.payload["code"], "run_record_unusable");
    assert.equal(
      a.payload["error"],
      "run run-noreq has no recorded request body — cannot replay",
    );
  });

  it("non-object request body refuses run_record_unusable with the py type", () => {
    seedRecord(runsRoot, "run-badreq", { draft_id: "d1" }, "[1, 2]");
    const a = handleFlowsReproduce("run-badreq", null, stateRoot, runsRoot);
    assert.ok(!("replayable" in a));
    assert.equal(a.payload["code"], "run_record_unusable");
    assert.equal(a.payload["expected"], "object");
    assert.equal(a.payload["got"], "list");
  });

  it("THE REPLAYABLE VERDICT: settled card-backed object record yields the verbatim request (preview_scope is dead)", () => {
    seedRecord(
      runsRoot,
      "run-ok",
      { draft_id: "draft-abc" },
      JSON.stringify({ draft_id: "draft-abc", model: "krea-2", test: false, prompt: "a castle" }),
    );
    const a = handleFlowsReproduce("run-ok", null, stateRoot, runsRoot);
    assert.ok("replayable" in a, "a replayable record must never refuse");
    assert.deepEqual(a.request, {
      draft_id: "draft-abc",
      model: "krea-2",
      test: false,
      prompt: "a castle",
    });
  });
});

describe("reproduce door (sandbox boot, the exact-resubmit wire)", () => {
  let sandbox: Sandbox;

  before(async () => {
    sandbox = await bootSandbox({ token: TOKEN });
    const out = join(sandbox.stateRoot, "output");
    seedRecord(out, "run-http-cardless", { prompt: "p" }, null);
    seedRecord(out, "run-http-noreq", { draft_id: "d1" }, null);
    seedRecord(
      out,
      "run-http-replay",
      { draft_id: "draft-gone" },
      JSON.stringify({ draft_id: "draft-gone", model: "krea-2", test: false }),
    );
  });

  after(() => {
    reap(sandbox.proc);
  });

  it("unknown run 400s run_unknown on the wire", async () => {
    const r = await http(sandbox.port, "POST", "/v1/flows/reproduce/run-nope", {
      token: TOKEN,
      contentType: "application/json",
      body: "{}",
    });
    assert.equal(r.status, 400);
    const doc = JSON.parse(r.bytes.toString("utf8")) as Record<string, unknown>;
    assert.equal(doc["code"], "run_unknown");
  });

  it("cardless and request-less records 400 their gates on the wire", async () => {
    for (const [id, code] of [
      ["run-http-cardless", "run_cardless"],
      ["run-http-noreq", "run_record_unusable"],
    ] as const) {
      const r = await http(sandbox.port, "POST", "/v1/flows/reproduce/" + id, {
        token: TOKEN,
        contentType: "application/json",
        body: "{}",
      });
      assert.equal(r.status, 400);
      const doc = JSON.parse(r.bytes.toString("utf8")) as Record<string, unknown>;
      assert.equal(doc["code"], code);
    }
  });

  it("THE EXACT-RESUBMIT: a replayable record rides the ONE start arm — a stale draft answers draft_unknown, never preview_scope", async () => {
    const r = await http(sandbox.port, "POST", "/v1/flows/reproduce/run-http-replay", {
      token: TOKEN,
      contentType: "application/json",
      body: "{}",
    });
    assert.equal(r.status, 400);
    const doc = JSON.parse(r.bytes.toString("utf8")) as Record<string, unknown>;
    assert.equal(doc["code"], "draft_unknown", "the start arm's own voice passes through");
    assert.ok(
      !String(doc["error"] ?? "").includes("preview_scope"),
      "the py-era preview stub never answers again",
    );
    assert.ok(
      String(doc["error"] ?? "").includes("draft-gone"),
      "the refusal names the recorded draft",
    );
  });
});
