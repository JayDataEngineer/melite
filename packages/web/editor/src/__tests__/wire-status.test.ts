// WireStatus.test.ts — THE WIRE ADOPTION P3 client seam gates: the
// browser caller's envelope round-trip against the wire contract
// (wall-pinned server-side by tests/walls/ts/suites/runs-remote
// .test.ts), plus the fallback law (transport absent → null, never a
// throw). Runs under happy-dom (the DSH client caller reads
// window.location at call time for the same-origin base).
import { afterEach, describe, expect, it, vi } from "vitest";
import { probeRunStatus, reconcilePhantomRun } from "@melite/catalog/WireStatus";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("probeRunStatus (Connection transport seam)", () => {
  it("round-trips the client-request envelope and reads the wire row", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(String(input)).toContain("/api/runs/status");
      expect(init?.method).toBe("POST");
      const frame = JSON.parse(String(init?.body)) as { type: string; method: string; payload: { args: { runId: string } } };
      expect(frame.type).toBe("client-request");
      expect(frame.method).toBe("runs/status");
      expect(frame.payload.args.runId).toBe("run-1");
      return okResponse({
        type: "server-response",
        rpcId: frame.rpcId,
        result: { ok: true, value: { run_id: "run-1", known: true, status: "queued" } },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const row = await probeRunStatus("run-1");
    expect(row).toEqual({ known: true, status: "queued" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves known:false rows (the drift-pin shape)", async () => {
    globalThis.fetch = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string };
      return okResponse({
        type: "server-response",
        rpcId: frame.rpcId,
        result: { ok: true, value: { run_id: "run-2", known: false, status: null } },
      });
    }) as unknown as typeof fetch;
    expect(await probeRunStatus("run-2")).toEqual({ known: false, status: null });
  });

  it("falls back to null when the channel is unclaimed (404)", async () => {
    globalThis.fetch = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof fetch;
    expect(await probeRunStatus("run-3")).toBeNull();
  });

  it("falls back to null on malformed envelopes (never throws)", async () => {
    globalThis.fetch = vi.fn(async () => okResponse({ type: "something-else" })) as unknown as typeof fetch;
    expect(await probeRunStatus("run-4")).toBeNull();
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("network refused");
    }) as unknown as typeof fetch;
    expect(await probeRunStatus("run-4")).toBeNull();
  });
});

describe("reconcilePhantomRun (pure verdict mapping)", () => {
  it("maps running/queued rows to live", () => {
    expect(reconcilePhantomRun({ known: true, status: "running" })).toBe("live");
    expect(reconcilePhantomRun({ known: true, status: "queued" })).toBe("live");
  });

  it("maps unknown runs and terminal statuses to gone", () => {
    expect(reconcilePhantomRun({ known: false, status: null })).toBe("gone");
    expect(reconcilePhantomRun({ known: true, status: "completed" })).toBe("gone");
    expect(reconcilePhantomRun({ known: true, status: "failed" })).toBe("gone");
    expect(reconcilePhantomRun({ known: true, status: "stopped" })).toBe("gone");
  });

  it("maps absent/surprising rows to unknown (never a claim)", () => {
    expect(reconcilePhantomRun(null)).toBe("unknown");
    expect(reconcilePhantomRun({ known: true, status: null })).toBe("unknown");
  });
});
