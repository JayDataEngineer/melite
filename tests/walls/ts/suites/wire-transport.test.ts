// wire-transport.test.ts — THE WIRE ADOPTION WALL (P1 pilot, operator
// decision 2026-09-10; ledger § "THE WIRE ADOPTION").
//
// Pins, black-box over the sandbox gateway (no in-process imports of
// the compiled wire lib — the transport is the contract under test):
//
//   1. TRANSPORT: POST /api/<ns>/<method> with a Connection
//      client-request frame round-trips through the vendored
//      webserver → /api prefix route → trust fence → RPC envelope
//      validation → typertGateway SRC claim → RunsRemoteService.
//   2. CORRELATION: rpcId echoes verbatim on success and error.
//   3. ENVELOPE: a malformed frame answers the pinned bad-request
//      envelope (the Connection's own schema voice, not ours).
//   4. TRUST FENCE: a rebound Host header is refused 403 before any
//      dispatch (row 26's transport-layer trust, live).
//   4b. ROW-26 REMAINDER (skipped until the vendored-platform bump):
//      /api currently answers WITHOUT a bearer when the fence passes
//      (pinned by test 1, which sends no bearer against a
//      token-configured sandbox) — the estate token does not wrap the
//      shared /api FetchHandler yet. rc.8 offers no host-side seam
//      for it (single /api interceptor owned by typertGateway; the
//      fence+bridge live in the connection closure; the decoded
//      handler signature carries no headers), so the wrap rides the
//      vendored bump that also unblocks P2 generation. The skipped
//      test below is the pre-written red-to-green flip target.
//   5. UNCLAIMED: an endpoint no SRC binding claims stays the
//      transport's 404 (never a gateway error).
//   6. DRIFT PIN (two-phase boot): a QUEUED sidecar referencing a
//      real draft resurrects into the registry Map, and the wire
//      status answers known:true + status:"queued" — if RunRecord's
//      read shape or the registry seat drifts, known flips false and
//      this wall FAILS LOUD (the guard is pinned, not trusted).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/wire-transport.test.ts
import { describe, it, before, after } from "node:test";
import { request } from "node:http";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { HttpOut, Sandbox } from "../helpers/boot.ts";

const TOKEN = "wall-ts-wire-2026-09-10";

/** One Connection client-request frame (the transport's own wire
 * shape — the generated client is sugar over exactly this). */
function frame(rpcId: string, method: string, args: Record<string, unknown>): string {
  return JSON.stringify({
    type: "client-request",
    rpcId,
    method,
    payload: { args },
  });
}

async function wireCall(port: number, rpcId: string, method: string, args: Record<string, unknown>): Promise<{ status: number; doc: Record<string, unknown> }> {
  const out: HttpOut = await http(port, "POST", "/api/" + method, {
    body: frame(rpcId, method, args),
    contentType: "application/json",
  });
  return { status: out.status, doc: parsed(out.bytes) as Record<string, unknown> };
}

describe("the wire transport (sandbox boot, P1 pilot)", () => {
  let sandbox: Sandbox | null = null;

  before(async (): Promise<void> => {
    sandbox = await bootSandbox({ token: TOKEN });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  it("round-trips a client-request frame through the full transport", async (): Promise<void> => {
    const s = sandbox as Sandbox;
    const r = await wireCall(s.port, "w1", "runs/status", { run_id: "run-unknown" });
    assert.equal(r.status, 200);
    assert.equal(r.doc["type"], "server-response");
    assert.equal(r.doc["rpcId"], "w1");
    const result = r.doc["result"] as Record<string, unknown>;
    assert.equal(result["ok"], true);
    assert.deepEqual(result["value"], { run_id: "run-unknown", known: false, status: null });
  });

  it("refuses a malformed frame with the Connection's pinned envelope", async (): Promise<void> => {
    const s = sandbox as Sandbox;
    // HTTP 200 BY DESIGN: the Connection carries RPC errors in the
    // server-response envelope, never as transport status codes.
    const out: HttpOut = await http(s.port, "POST", "/api/runs/status", {
      body: JSON.stringify({ args: { run_id: "x" } }),
      contentType: "application/json",
    });
    assert.equal(out.status, 200);
    const doc = parsed(out.bytes) as Record<string, unknown>;
    assert.equal(doc["type"], "server-response");
    assert.equal(doc["rpcId"], "invalid-request");
    const result = doc["result"] as Record<string, unknown>;
    assert.equal(result["ok"], false);
    assert.equal((result["error"] as Record<string, unknown>)["code"], "bad-request");
  });

  it("keeps the trust fence ahead of dispatch (rebound Host → 403)", async (): Promise<void> => {
    const s = sandbox as Sandbox;
    // node:http with setHost:false — undici silently overrides a
    // forged Host header, so fetch can never exercise the fence.
    const status: number = await new Promise((resolveStatus): void => {
      const req = request(
        { host: "127.0.0.1", port: s.port, path: "/api/runs/status", method: "POST",
          headers: { "content-type": "application/json", host: "evil.example.com" }, setHost: false },
        (res): void => {
          res.resume();
          res.on("end", (): void => { resolveStatus(res.statusCode ?? 0); });
        },
      );
      req.on("error", (): void => { resolveStatus(0); });
      req.end(frame("w-evil", "runs/status", { run_id: "x" }));
    });
    assert.equal(status, 403);
  });

  it("leaves unclaimed endpoints to the transport's 404", async (): Promise<void> => {
    const s = sandbox as Sandbox;
    const out: HttpOut = await http(s.port, "POST", "/api/nope/void", {
      body: frame("w2", "nope/void", {}),
      contentType: "application/json",
    });
    assert.equal(out.status, 404);
  });

  // ROW-26 REMAINDER (see header 4b): flip to live when the vendored
  // bump wraps the shared /api FetchHandler with the estate token.
  it("demands the estate bearer on /api when a token is configured", { skip: true }, async (): Promise<void> => {
    const s = sandbox as Sandbox;
    const bare: HttpOut = await http(s.port, "POST", "/api/runs/status", {
      body: frame("w-tok", "runs/status", { run_id: "run-unknown" }),
      contentType: "application/json",
    });
    assert.equal(bare.status, 401);
  });
});

describe("the wire drift pin (resurrected run through the guard)", () => {
  let first: Sandbox | null = null;
  let second: Sandbox | null = null;
  let stateRoot = "";

  before(async (): Promise<void> => {
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-wire-"));
    first = await bootSandbox({ token: TOKEN, stateRoot });
    // A real draft in the domain: resurrect's usability gate demands
    // a draft_id that exists (cardless rows orphan, by design).
    const saved: HttpOut = await http(first.port, "POST", "/v1/flows/drafts", {
      body: JSON.stringify({
        status: "draft",
        intent: "wire wall seed",
        stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
        model: "wall-model",
        name: "Wire Wall Draft",
      }),
      token: TOKEN,
      contentType: "application/json",
    });
    const draftId = String((parsed(saved.bytes) as Record<string, unknown>)["draftId"]);
    assert.ok(draftId !== "", "draft save must answer a draft_id");
    reap((first as Sandbox).proc);
    first = null;
    // The QUEUED sidecar + request that resurrect rebuilds into the
    // registry Map (planResurrect: status queued + usable record).
    const dir = join(stateRoot, "output", "run-wire");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        status: "queued",
        pipeline: "img",
        prompt: "wire wall",
        draft_id: draftId,
        seed: 1,
        created_at: 1700000000,
        graph: [],
        stages: [],
        skipped_stages: [],
        artifacts: [],
      }),
    );
    writeFileSync(join(dir, "_request.json"), JSON.stringify({ prompt: "wire wall" }));
    second = await bootSandbox({ token: TOKEN, stateRoot });
  });

  after((): void => {
    if (first !== null) reap(first.proc);
    if (second !== null) reap(second.proc);
  });

  it("answers known:true + the resurrected status through the wire", async (): Promise<void> => {
    const s = second as Sandbox;
    const r = await wireCall(s.port, "w3", "runs/status", { run_id: "run-wire" });
    assert.equal(r.status, 200);
    const result = r.doc["result"] as Record<string, unknown>;
    assert.equal(result["ok"], true, "frame: " + JSON.stringify(r.doc));
    // THE DRIFT PIN: the registry row rode RunRecord → guard → wire.
    // A shape drift on either side flips known back to false.
    assert.deepEqual(result["value"], { run_id: "run-wire", known: true, status: "queued" });
  });
});
