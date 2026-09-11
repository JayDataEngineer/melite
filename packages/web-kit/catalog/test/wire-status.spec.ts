// wire-status.spec.ts — the runs/status wire probe and the
// phantom-reconciliation verdict.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  probeRunStatus,
  reconcilePhantomRun,
} from "../src/WireStatus.ts";
import type { WireRunStatus } from "../src/WireStatus.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const ok = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200 });

describe("reconcilePhantomRun", () => {
  it("maps rows onto live/gone/unknown", () => {
    assert.equal(reconcilePhantomRun(null), "unknown");
    assert.equal(reconcilePhantomRun({ known: false, status: null }), "gone");
    assert.equal(
      reconcilePhantomRun({ known: true, status: "running" }),
      "live",
    );
    assert.equal(reconcilePhantomRun({ known: true, status: "queued" }), "live");
    assert.equal(reconcilePhantomRun({ known: true, status: null }), "unknown");
    assert.equal(
      reconcilePhantomRun({ known: true, status: "completed" }),
      "gone",
    );
    assert.equal(
      reconcilePhantomRun({ known: true, status: "weird" }),
      "gone",
    );
    const row: WireRunStatus = { known: true, status: "failed" };
    assert.equal(reconcilePhantomRun(row), "gone");
  });
});

describe("probeRunStatus", () => {
  it("returns the row on a clean envelope, with or without a signal", async () => {
    let seen: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      seen = JSON.parse(String((init?.body as string) ?? "{}")) as Record<string, unknown>;
      const rpcId = String(seen["rpcId"] ?? "");
      return ok({
        type: "server-response",
        rpcId,
        result: { ok: true, value: { known: true, status: "running" } },
      });
    }) as typeof fetch;
    const row = await probeRunStatus("r1");
    assert.deepEqual(row, { known: true, status: "running" });
    assert.equal(
      (seen["payload"] as { args: { runId: string } }).args.runId,
      "r1",
    );
    const ctl = new AbortController();
    const row2 = await probeRunStatus("r2", ctl.signal);
    assert.deepEqual(row2, { known: true, status: "running" });
  });

  it("resolves null when the channel is absent or surprising", async () => {
    globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch;
    assert.equal(await probeRunStatus("r1"), null);
    globalThis.fetch = (async () => {
      throw new Error("refused");
    }) as typeof fetch;
    assert.equal(await probeRunStatus("r1"), null);
    globalThis.fetch = (async () => new Response("{{{not json", { status: 200 })) as typeof fetch;
    assert.equal(await probeRunStatus("r1"), null);
    // Envelopes that fail readWireRow at each guard: rpcId mismatch first,
    // then each post-match guard with the SENT rpcId echoed back.
    let tail: unknown = null;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body ?? "{}")) as { rpcId: string };
      // A literal "wrong" rpcId pins the id-mismatch arm; every other
      // object tail echoes the SENT id so the later guards are reached.
      const body =
        tail !== null && typeof tail === "object" && "rpcId" in (tail as Record<string, unknown>)
          ? tail
          : tail !== null && typeof tail === "object"
            ? { ...(tail as Record<string, unknown>), rpcId: sent.rpcId }
            : tail;
      return ok(body);
    }) as typeof fetch;
    const tails: unknown[] = [
      null,
      "str",
      { type: "client-response" },
      { type: "server-response", rpcId: "wrong" },
      { type: "server-response", result: null },
      { type: "server-response", result: 7 },
      { type: "server-response", result: { ok: false } },
      { type: "server-response", result: { ok: true, value: 7 } },
      { type: "server-response", result: { ok: true, value: { known: "y", status: null } } },
      { type: "server-response", result: { ok: true, value: { known: true, status: 9 } } },
    ];
    for (const t of tails) {
      tail = t;
      assert.equal(await probeRunStatus("r1"), null);
    }
  });

  it("falls back to a local id when crypto.randomUUID is absent", async () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
    try {
      let seen = "";
      globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        const sent = JSON.parse(String(init?.body ?? "{}")) as { rpcId: string };
        seen = sent.rpcId;
        return ok({
          type: "server-response",
          rpcId: sent.rpcId,
          result: { ok: true, value: { known: true, status: "queued" } },
        });
      }) as typeof fetch;
      assert.deepEqual(await probeRunStatus("r1"), { known: true, status: "queued" });
      assert.match(seen, /^rpc-/);
    } finally {
      if (desc) Object.defineProperty(globalThis, "crypto", desc);
    }
  });

  it("accepts a known:false row and a null-status row", async () => {
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body ?? "{}")) as { rpcId: string };
      return ok({
        type: "server-response",
        rpcId: sent.rpcId,
        result: { ok: true, value: { known: false, status: null } },
      });
    }) as typeof fetch;
    assert.deepEqual(await probeRunStatus("r1"), { known: false, status: null });
  });
});
