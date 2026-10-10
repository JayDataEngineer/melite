// flow-protocol.spec.ts — the ONE generation protocol: error bodies,
// artifact collectors, the status poll, param-drop guard, compiled run.
import { describe, it, afterEach, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";

const { reports, assertParamsMock, ensureDraftIdMock } = vi.hoisted(() => ({
  reports: [] as Array<{ runId: string; violations: unknown }>,
  assertParamsMock: vi.fn(),
  ensureDraftIdMock: vi.fn(),
}));
vi.mock("../src/runStatusContractStore.ts", () => ({
  useRunStatusContractStore: { getState: () => ({ reportViolation: (runId: string, violations: unknown) => {
    reports.push({ runId, violations });
  } }) },
}));
vi.mock("../src/familyParamContract.ts", () => ({
  assertParamsMatchFamilySchema: assertParamsMock,
}));
vi.mock("../src/cardBirth.ts", () => ({ ensureDraftId: ensureDraftIdMock }));

import {
  assertNoParamDrops,
  collectNamedArtifacts,
  collectStageUrls,
  describeErrorBody,
  pollFlowRun,
  runCompiledGeneration,
  sanitizeRevivedResult,
  setRequiredEmptyResolver,
} from "../src/FlowProtocol.ts";
import { RunStatusContractError } from "../src/runStatusContract.ts";

const realFetch = globalThis.fetch;
let routes: Array<{ match: (url: string) => boolean; respond: () => Response }> = [];
let seenBodies: Array<{ url: string; body: unknown }> = [];

beforeEach(() => {
  routes = [];
  seenBodies = [];
  reports.length = 0;
  assertParamsMock.mockReset();
  ensureDraftIdMock.mockReset();
  setRequiredEmptyResolver(null);
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    let parsed: unknown = null;
    try {
      parsed = init?.body ? JSON.parse(String(init.body)) : null;
    } catch {
      parsed = null;
    }
    seenBodies.push({ url: String(url), body: parsed });
    for (const r of routes) {
      if (r.match(String(url))) return r.respond();
    }
    return new Response("no route", { status: 500 });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  setRequiredEmptyResolver(null);
});

const ok = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s0",
  name: "brick",
  index: 0,
  status: "running",
  ...over,
});
const status = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  run_id: "r1",
  status: "running",
  stages: [stage()],
  ...over,
});
const statusRoute = (queue: Response[]): void => {
  routes.push({ match: (u) => u.includes("/v1/flows/status/"), respond: () => queue.shift() ?? ok(status({ status: "completed" })) });
};

describe("describeErrorBody", () => {
  it("unwraps the backend error envelope, else returns raw text", () => {
    assert.equal(describeErrorBody(JSON.stringify({ error: "line1\nline2" })), "line1\nline2");
    assert.equal(describeErrorBody(JSON.stringify({ error: 7 })), JSON.stringify({ error: 7 }));
    assert.equal(describeErrorBody(JSON.stringify({ nope: 1 })), JSON.stringify({ nope: 1 }));
    assert.equal(describeErrorBody("<html>proxy</html>"), "<html>proxy</html>");
  });
});

describe("collectStageUrls", () => {
  it("flattens stage urls and string gallery urls in order", () => {
    assert.deepEqual(
      collectStageUrls([
        { url: "a", gallery: [{ url: "b" }, { url: "c", name: "n" }] },
        { gallery: [{ url: "d" }] },
      ]),
      ["a", "b", "c", "d"],
    );
  });

  it("skips gallery junk and tolerates missing shapes", () => {
    assert.deepEqual(collectStageUrls(undefined), []);
    assert.deepEqual(collectStageUrls({} as unknown as []), []);
    assert.deepEqual(
      collectStageUrls([{ url: "", gallery: "x" }, { gallery: [null, {}, { url: 7 }] }] as unknown as Array<{ url: string; gallery: Array<{ url: string }> }>),
      [],
    );
  });
});

describe("sanitizeRevivedResult", () => {
  it("nulls non-objects and filters string-only artifacts", () => {
    assert.equal(sanitizeRevivedResult(null), null);
    assert.equal(sanitizeRevivedResult("x"), null);
    assert.equal(sanitizeRevivedResult(7), null);
    const clean = sanitizeRevivedResult({
      assetUrls: ["a", 7, "", null, "b"],
      artifacts: { m: "u", bad: 7, empty: "", list: [] },
      metadata: { k: 1 },
      completedAt: 123,
      durationSec: 4,
    })!;
    assert.deepEqual(clean.assetUrls, ["a", "b"]);
    assert.deepEqual(clean.artifacts, { m: "u" });
    assert.deepEqual(clean.metadata, { k: 1 });
    assert.equal(clean.completedAt, 123);
    assert.equal(clean.durationSec, 4);
  });

  it("defaults missing numerics and non-object metadata", () => {
    const r = sanitizeRevivedResult({ assetUrls: "x", artifacts: ["a"], metadata: "m", completedAt: "t", durationSec: null })!;
    assert.deepEqual(r.assetUrls, []);
    assert.deepEqual(r.artifacts, {});
    assert.deepEqual(r.metadata, {});
    assert.equal(typeof r.completedAt, "number");
    assert.equal(r.durationSec, 0);
    const arr = sanitizeRevivedResult([]) as unknown as { assetUrls: unknown[] };
    assert.deepEqual(arr.assetUrls, []);
  });
});

describe("collectNamedArtifacts", () => {
  it("merges named_urls, skipping non-string/empty targets", () => {
    assert.deepEqual(
      collectNamedArtifacts([
        { named_urls: { mask: "m", primary: "p" } },
        { url: "x" },
        { named_urls: "nope" },
        { named_urls: { bad: 7, empty: "" } },
      ] as unknown as Array<{ url: string; gallery: Array<{ url: string }>; named_urls: Record<string, string> }>),
      { mask: "m", primary: "p" },
    );
    assert.deepEqual(collectNamedArtifacts(undefined), {});
    assert.deepEqual(collectNamedArtifacts({} as unknown as []), {});
  });
});

describe("pollFlowRun", () => {
  it("returns the terminal completed status without ticking", async () => {
    let ticks = 0;
    statusRoute([ok(status({ status: "completed" }))]);
    const out = await pollFlowRun("r1", undefined, { onTick: () => ticks++ });
    assert.equal(out.status, "completed");
    assert.equal(ticks, 0);
  });

  it("uses default opts (no tick, default ceiling/interval)", async () => {
    statusRoute([ok(status({ status: "completed" }))]);
    assert.equal((await pollFlowRun("r1")).status, "completed");
  });

  it("ticks live progress then throws the failure detail", async () => {
    const ticks: string[] = [];
    statusRoute([
      ok(status({ status: "running" })),
      ok(status({ status: "failed", error: "boom" })),
    ]);
    await assert.rejects(
      pollFlowRun("r1", undefined, { intervalMs: 1, onTick: (s) => ticks.push(String(s.status)) }),
      /Flow run r1 failed: boom/,
    );
    assert.deepEqual(ticks, ["running"]);
  });

  it("throws bare when a failed run carries no detail", async () => {
    statusRoute([ok(status({ status: "failed" }))]);
    await assert.rejects(pollFlowRun("r1", undefined, { intervalMs: 1 }), /Flow run r1 failed$/);
  });

  it("a vanished run surfaces instead of spinning", async () => {
    statusRoute([new Response("gone", { status: 404 })]);
    await assert.rejects(pollFlowRun("r1", undefined, { intervalMs: 1 }), /is gone/);
  });

  it("a violations envelope fails visibly and reports", async () => {
    const violations = [{ field: "status", kind: "invalid", message: "bad" }];
    statusRoute([ok({ error: "contract", run_id: "r1", violations }, 400)]);
    try {
      await pollFlowRun("r1", undefined, { intervalMs: 1 });
      assert.fail("should throw");
    } catch (e) {
      assert.ok(e instanceof RunStatusContractError);
      assert.deepEqual(reports, [{ runId: "r1", violations }]);
    }
  });

  it("a 200 breaching the core fails visibly and reports", async () => {
    statusRoute([ok({ run_id: "r1", status: "done", stages: [] })]);
    try {
      await pollFlowRun("r1", undefined, { intervalMs: 1 });
      assert.fail("should throw");
    } catch (e) {
      assert.ok(e instanceof RunStatusContractError);
      assert.equal(reports.length, 1);
    }
  });

  it("rides out transient blips and malformed error bodies", async () => {
    // 4xx (never retried inside apiFetch) so each poll-level arm lands:
    // unparseable body, JSON without the violations signature, then live.
    statusRoute([
      new Response("blip", { status: 400 }),
      ok({ nope: true }, 400),
      ok(status({ status: "completed" })),
    ]);
    const out = await pollFlowRun("r1", undefined, { intervalMs: 1 });
    assert.equal(out.status, "completed");
  });

  it("an aborted signal throws AbortError", async () => {
    const ctl = new AbortController();
    ctl.abort();
    statusRoute([ok(status({ status: "completed" }))]);
    await assert.rejects(pollFlowRun("r1", ctl.signal, { intervalMs: 1 }), /Aborted/);
  });

  it("times out past the ceiling", async () => {
    routes.push({ match: (u) => u.includes("/v1/flows/status/"), respond: () => ok(status()) });
    await assert.rejects(
      pollFlowRun("r1", undefined, { maxWaitMs: 40, intervalMs: 5 }),
      /timed out after 0 min/,
    );
  });
});

describe("pollFlowRun abort fencing (audit R-S1)", () => {
  it("an abort landing during the interval sleep rejects at once — not after the full interval", async () => {
    // every poll answers NON-terminal running (an empty queue would
    // complete and resolve before the abort lands)
    routes.push({
      match: (u) => u.includes("/v1/flows/status/"),
      respond: () => ok(status()),
    });
    const ctl = new AbortController();
    const started = performance.now();
    const poll = pollFlowRun("r1", ctl.signal, { intervalMs: 5_000 });
    void poll.catch(() => {}); // observe without unhandled noise
    // let one poll land + one interval sleep begin, then abort
    await new Promise((r) => setTimeout(r, 25));
    ctl.abort();
    await assert.rejects(poll, /Aborted/);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 2_000, "abort must beat the 5s interval (took " + elapsed + "ms)");
  });

  it("an abort landing during the 5xx poll sleep rejects at once too (the 5xx leg takes the signal)", async () => {
    routes.push({
      match: (u) => u.includes("/v1/flows/status/"),
      respond: () => new Response("gateway down", { status: 503 }),
    });
    const ctl = new AbortController();
    const started = performance.now();
    const poll = pollFlowRun("r1", ctl.signal, { intervalMs: 5_000 });
    void poll.catch(() => {});
    await new Promise((r) => setTimeout(r, 25));
    ctl.abort();
    await assert.rejects(poll, /Aborted/);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 2_000, "abort must beat the 5s interval (took " + elapsed + "ms)");
  });
});

describe("assertNoParamDrops", () => {
  it("passes clean bodies", () => {
    assertNoParamDrops({ model: "m", prompt: "x", steps: 3, tags: [] });
  });

  it("lists dropped and mutated fields together", () => {
    try {
      assertNoParamDrops({ a: 1, u: undefined, f: () => {}, s: Symbol("s"), n: NaN, b: 2n });
      assert.fail("should throw");
    } catch (e) {
      const msg = (e as Error).message;
      assert.match(msg, /DROPPED: \[u, f \(function value/);
      assert.match(msg, /s \(symbol value/);
      assert.match(msg, /MUTATED: \[n \(NaN\/Infinity/);
      assert.match(msg, /b \(bigint/);
    }
  });

  it("reports drops-only and mutations-only shapes", () => {
    assert.throws(() => assertNoParamDrops({ u: undefined }), /DROPPED: \[u\]/);
    assert.throws(() => assertNoParamDrops({ n: Infinity }), /MUTATED: \[n/);
  });

  it("enforces resolver-declared required fields", () => {
    setRequiredEmptyResolver((model) => (model === "m" ? ["prompt"] : null));
    assert.throws(() => assertNoParamDrops({ model: "m", prompt: "  " }), /'prompt' is empty/);
    assertNoParamDrops({ model: "m", prompt: "x" });
    assertNoParamDrops({ model: "other", prompt: "" }); // resolver defers: backend decides
    assertNoParamDrops({ model: "m", prompt: 5 }); // non-strings are not empties
    assertNoParamDrops({ prompt: "" }); // model-less bodies skip the seam
    setRequiredEmptyResolver(() => []);
    assertNoParamDrops({ model: "m", prompt: "" });
  });
});

describe("runCompiledGeneration", () => {
  const draftFlow = (startBody: unknown, pollQueue: Response[]): void => {
    routes.length = 0; // re-runnable within one test: first match wins
    ensureDraftIdMock.mockResolvedValue("d1");
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    routes.push({
      match: (u) => u.endsWith("/v1/flows/start"),
      respond: () => (typeof startBody === "string" ? new Response(startBody, { status: 200 }) : ok(startBody)),
    });
    statusRoute(pollQueue);
  };

  it("runs the full model path: migrate loras, gate, draft, compile, start, poll", async () => {
    assertParamsMock.mockImplementation(async (_m: string, p: Record<string, unknown>) => p);
    let onStartId = "";
    draftFlow({ run_id: "r9" }, [ok(status({ status: "completed", stages: [stage({ url: "u1", gallery: [{ url: "u2" }] })] }))]);
    const out = await runCompiledGeneration(
      { model: "m", prompt: "x", loras: [{ name: "70s", strength: 0.8 }, "keep"] },
      undefined,
      { intervalMs: 1, onStart: (id) => { onStartId = id; }, onTick: () => {} },
    );
    assert.equal(out.kind, "started");
    assert.equal(out.runId, "r9");
    assert.equal(onStartId, "r9");
    assert.deepEqual(out.urls, ["u1", "u2"]);
    // The start envelope is {model} + typed params + draft_id (never raw).
    const start = seenBodies.find((s) => s.url.endsWith("/v1/flows/start"))!;
    assert.deepEqual(start.body as Record<string, unknown>, {
      model: "m", prompt: "x", loras: [{ id: "70s", strength: 0.8 }, "keep"], draft_id: "d1",
    });
    // The compile envelope matches (draft stamped post-coerce, pre-validate).
    const compile = seenBodies.find((s) => s.url.endsWith("/v1/flows/validate"))!;
    assert.equal((compile.body as Record<string, unknown>).draft_id, "d1");
  });

  it("non-model starts ride the same draft envelope (or reuse a declaration)", async () => {
    draftFlow({ run_id: "r2" }, [ok(status({ status: "completed" }))]);
    const out = await runCompiledGeneration({ flow: "named-flow" }, undefined, { intervalMs: 1 });
    assert.equal(out.runId, "r2");
    assert.equal(ensureDraftIdMock.mock.calls.length, 1);
    ensureDraftIdMock.mockClear();
    draftFlow({ run_id: "r3" }, [ok(status({ status: "completed" }))]);
    await runCompiledGeneration({ flow: "f", draft_id: "declared" }, undefined, { intervalMs: 1 });
    assert.equal(ensureDraftIdMock.mock.calls.length, 0); // valid draft_id reused
    ensureDraftIdMock.mockClear();
    draftFlow({ run_id: "r4" }, [ok(status({ status: "completed" }))]);
    await runCompiledGeneration({ flow: "f", draft_id: "" }, undefined, { intervalMs: 1 });
    assert.equal(ensureDraftIdMock.mock.calls.length, 1); // empty draft_id reborn
  });

  it("refuses param drops before any fetch", async () => {
    await assert.rejects(runCompiledGeneration({ model: "m", u: undefined }), /SILENT PARAMETER DROP/);
    assert.equal(seenBodies.length, 0);
  });

  it("a compile refusal throws with violations before starting", async () => {
    assertParamsMock.mockImplementation(async (_m: string, p: Record<string, unknown>) => p);
    ensureDraftIdMock.mockResolvedValue("d1");
    routes.push({
      match: (u) => u.endsWith("/v1/flows/validate"),
      respond: () => new Response(JSON.stringify({ violations: [{ field: "a", message: "bad" }, { field: "b" }] }), { status: 400 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }, undefined, { intervalMs: 1 }), /card failed to compile: HTTP 400[\s\S]*a: bad/);
    ensureDraftIdMock.mockResolvedValue("d1");
    routes.length = 0;
    routes.push({
      match: (u) => u.endsWith("/v1/flows/validate"),
      respond: () => new Response("plain refusal", { status: 400 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /card failed to compile: HTTP 400: plain refusal/);
    routes.length = 0;
    routes.push({
      match: (u) => u.endsWith("/v1/flows/validate"),
      respond: () => new Response("", { status: 400 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /card failed to compile: HTTP 400$/);
  });

  it("start failures surface with bodies, violations, or bare headlines", async () => {
    assertParamsMock.mockImplementation(async (_m: string, p: Record<string, unknown>) => p);
    ensureDraftIdMock.mockResolvedValue("d1");
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    routes.push({
      match: (u) => u.endsWith("/v1/flows/start"),
      respond: () => new Response(JSON.stringify({ error: "gpu busy", violations: [{ field: "a", message: "bad" }] }), { status: 500 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /generate failed: HTTP 500: gpu busy[\s\S]*a: bad/);
    routes.length = 0;
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    routes.push({
      match: (u) => u.endsWith("/v1/flows/start"),
      respond: () => new Response("", { status: 500 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /generate failed: HTTP 500$/);
    // A fieldless violation renders under "?"; fully-filtered violations
    // append nothing.
    routes.length = 0;
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    const fieldless = JSON.stringify({ violations: [{ message: "m" }] });
    routes.push({
      match: (u) => u.endsWith("/v1/flows/start"),
      respond: () => new Response(fieldless, { status: 400 }),
    });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /\?: m/);
    routes.length = 0;
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    const allFiltered = JSON.stringify({ violations: [{ field: "x" }] });
    routes.push({
      match: (u) => u.endsWith("/v1/flows/start"),
      respond: () => new Response(allFiltered, { status: 400 }),
    });
    try {
      await runCompiledGeneration({ model: "m" });
      assert.fail("should throw");
    } catch (e) {
      assert.equal((e as Error).message, `generate failed: HTTP 400: ${allFiltered}`);
    }
  });

  it("a start without JSON or run_id throws loudly", async () => {
    assertParamsMock.mockImplementation(async (_m: string, p: Record<string, unknown>) => p);
    ensureDraftIdMock.mockResolvedValue("d1");
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    routes.push({ match: (u) => u.endsWith("/v1/flows/start"), respond: () => new Response("<html>", { status: 200 }) });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /non-JSON body/);
    routes.length = 0;
    routes.push({ match: (u) => u.endsWith("/v1/flows/validate"), respond: () => ok({}) });
    routes.push({ match: (u) => u.endsWith("/v1/flows/start"), respond: () => ok({ nope: 1 }) });
    await assert.rejects(runCompiledGeneration({ model: "m" }), /returned no run_id/);
  });
});
