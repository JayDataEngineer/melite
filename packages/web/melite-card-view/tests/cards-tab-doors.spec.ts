// cards-tab-doors.spec.ts — the tab's door arms, second battery
// (2026-09-16 burn-down, installment 1): the fresh-read law's
// fallback arms (non-object params, cardless fresh row), the
// select-normalization keep arms (undeclared numerics ride verbatim,
// non-numerics skip), the preview-artifact junk filters + fallbacks,
// and the sequential pass's pre-aborted return. fetch stubbed whole
// per method (the cards-tab.spec harness, duplicated — one file, one
// harness, no cross-file fixtures).
import { describe, expect, test, afterEach } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import {
  previewArtifactsFor,
  runBenchSequential,
  runCardStage,
} from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
  return { engine: "comfyui", ...over };
}

interface Call { method: string; args: Record<string, unknown> }
let calls: Call[] = [];
let routes: Record<string, (args: Record<string, unknown>, n: number) => { ok: boolean; value?: unknown; error?: string }> = {};
let seen: Record<string, number> = {};

function stubWire(): void {
  calls = [];
  seen = {};
  routes = {};
  (globalThis as Record<string, unknown>)["fetch"] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
    if (String(url) === "/v1/model-catalog") {
      return { ok: true, json: async () => ({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } }) };
    }
    if (String(url).startsWith("/v1/form-spec")) {
      return { ok: true, json: async () => ({ form: "img-to-mesh", schema: schemaEnvelope({
        input_image: { type: "string", meta: { description: "Source image", extra: { wtype: "image" } } },
        resolution: { consts: ["512", "1024", "1536"], meta: { description: "Resolution" } },
      }) }) };
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
    calls.push({ method: frame.method, args: frame.payload.args });
    const n = (seen[frame.method] ?? 0) + 1;
    seen[frame.method] = n;
    const route = routes[frame.method];
    const out = route !== undefined
      ? route(frame.payload.args, n)
      : { ok: false as const, error: "unstubbed " + frame.method };
    return {
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: frame.rpcId,
        result: out.ok ? { ok: true, value: out.value } : { ok: false, error: { message: out.error } },
      }),
    };
  };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  (globalThis as Record<string, unknown>)["fetch"] = realFetch;
  resetCardFamiliesCache();
});

function startDoc(): Record<string, unknown> {
  return (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
}

describe("runCardStage — the fresh-read law's fallback arms", () => {
  test("fresh params that are no object compose empty (never a lying array)", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["drafts/get"] = () => ({ ok: true, value: {
      stages: [{ id: "s_1", card: "img-to-mesh", params: ["junk"] }],
    } });
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    const res = await runCardStage("bench-main", stage({ id: "s_1", card: "img-to-mesh", params: { prompt: "held" } }));
    expect(res).toEqual({ runId: "run-9" });
    // the held prompt is GONE (the fresh row won), the model rode
    expect(startDoc()).toEqual({ model: "trellis2-native", draft_id: "bench-main", test: false });
  });

  test("a fresh row naming no card refuses (the held card never overrules)", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["drafts/get"] = () => ({ ok: true, value: {
      stages: [{ id: "s_1", card: "", params: {} }],
    } });
    const res = await runCardStage("bench-main", stage({ id: "s_1", card: "img-to-mesh", params: {} }));
    expect(res).toEqual({ refused: "this stage names no card — nothing to compose" });
    expect(calls.some((c) => c.method === "runs/start")).toBe(false);
  });
});

describe("runCardStage — the select-normalization keep arms", () => {
  test("a numeric select outside the declared options rides verbatim", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 999 },
    }));
    expect(startDoc()["resolution"]).toBe(999);
  });

  test("a non-numeric select value skips normalization untouched", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: "1024" },
    }));
    expect(startDoc()["resolution"]).toBe("1024");
  });
});

describe("previewArtifactsFor — the junk filters and the fallback chain", () => {
  test("non-string and empty artifacts filter out (never a broken thumb)", () => {
    expect(previewArtifactsFor({ result: { artifacts: { a: 42, b: "", c: "/x.png" } } }))
      .toEqual([{ name: "c", url: "/x.png" }]);
  });

  test("no artifacts: the assetUrls carry, junk filtered", () => {
    expect(previewArtifactsFor({ result: { assetUrls: ["", 7, "/a.png"] } }))
      .toEqual([{ name: "output", url: "/a.png" }]);
  });

  test("neither: the lone url carries", () => {
    expect(previewArtifactsFor({ result: { url: "/u.png" } }))
      .toEqual([{ name: "output", url: "/u.png" }]);
  });

  test("a resultless row previews nothing (never a throw)", () => {
    expect(previewArtifactsFor({})).toEqual([]);
    expect(previewArtifactsFor({ result: "junk" })).toEqual([]);
  });
});

describe("runBenchSequential — the pre-aborted pass returns empty", () => {
  test("an aborted signal before the first card runs nothing", async () => {
    stubWire();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "never" } }),
    ] };
    const res = await runBenchSequential(bench, { signal: AbortSignal.abort() });
    expect(res).toEqual({ ran: [], stoppedAt: null, refused: null });
    expect(calls).toEqual([]);
  });
});
