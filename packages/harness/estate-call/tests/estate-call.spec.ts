// estate-call.spec.ts — the ONE lane-call contract every card tool
// shares (2026-09-11: the stamped-client audit SSOT'd eight
// hand-copied GatewayError + gwJson + fetch blocks into this module,
// and nothing pinned it — a loosened non-object check or a dropped
// pre-abort would silently change every card's refusal shape).
//
// Scripted transports, no network: the record passes through, every
// non-record body throws GatewayError exactly as the stamped clients
// did, GatewayErrors pass through unchanged, a pre-aborted signal
// never dials the lane.
//
// Run: npx vitest run packages/harness/estate-call/tests/estate-call.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GatewayError, jsonLane } from "../src/estateCall.ts";
import type { EstateCall } from "../src/estateCall.ts";

function scripted(answer: unknown): { calls: number; call: EstateCall } {
  const box = { calls: 0 };
  const call = (async (
    _method: "GET" | "POST" | "PATCH",
    _path: string,
    _body: unknown,
    signal: AbortSignal | undefined,
    _timeoutMs: number,
  ): Promise<unknown> => {
    box.calls += 1;
    signal?.throwIfAborted();
    if (answer instanceof Error) throw answer;
    return answer;
  }) as EstateCall;
  return {
    get calls(): number {
      return box.calls;
    },
    call,
  };
}

describe("GatewayError — the stamped shape", () => {
  it("carries status + body + the named refusal field", () => {
    const err = new GatewayError(422, "bad field", "runs/bad-envelope");
    assert.equal(err.name, "GatewayError");
    assert.equal(err.status, 422);
    assert.equal(err.body, "bad field");
    assert.equal(err.named, "runs/bad-envelope");
    assert.match(err.message, /gateway 422/);
  });
});

describe("jsonLane — the JSON-record contract", () => {
  it("a record body passes through untouched", async () => {
    const t = scripted({ run_id: "r1", status: "queued" });
    const out = await jsonLane(t.call)("POST", "/v1/x", {}, undefined, 1000);
    assert.deepEqual(out, { run_id: "r1", status: "queued" });
    assert.equal(t.calls, 1);
  });

  it("a non-object body throws GatewayError(0) with the stamped text", async () => {
    for (const body of ["text", 42, null, [1, 2], undefined]) {
      const t = scripted(body);
      await assert.rejects(
        jsonLane(t.call)("GET", "/v1/x"),
        (e: unknown) => {
          assert.ok(e instanceof GatewayError);
          assert.equal((e as GatewayError).status, 0);
          assert.equal((e as GatewayError).body, "lane returned a non-object body");
          return true;
        },
      );
    }
  });

  it("a GatewayError from the lane passes through unchanged (same object)", async () => {
    const refusal = new GatewayError(502, "engine down", "comfy/unreachable");
    const t = scripted(refusal);
    await assert.rejects(jsonLane(t.call)("POST", "/v1/x"), (e: unknown) => {
      assert.equal(e, refusal);
      return true;
    });
  });

  it("a transport throw becomes GatewayError(0) carrying the message", async () => {
    const t = scripted(new Error("connect ECONNREFUSED 127.0.0.1:8188"));
    await assert.rejects(jsonLane(t.call)("POST", "/v1/x"), (e: unknown) => {
      assert.ok(e instanceof GatewayError);
      assert.equal((e as GatewayError).status, 0);
      assert.match((e as GatewayError).body, /ECONNREFUSED/);
      return true;
    });
  });

  it("a pre-aborted signal never dials the lane", async () => {
    const t = scripted({ ok: true });
    const ctl = new AbortController();
    ctl.abort(new Error("caller gone"));
    await assert.rejects(jsonLane(t.call)("POST", "/v1/x", {}, ctl.signal, 1000));
    assert.equal(t.calls, 0, "the transport was never touched");
  });

  it("the timeout defaults to 60s when the caller passes none", async () => {
    let seen: number | undefined;
    const call = (async (
      _m: "GET" | "POST" | "PATCH",
      _p: string,
      _b: unknown,
      _s: AbortSignal | undefined,
      timeoutMs: number,
    ): Promise<unknown> => {
      seen = timeoutMs;
      return {};
    }) as EstateCall;
    await jsonLane(call)("GET", "/v1/x");
    assert.equal(seen, 60_000);
  });
});
