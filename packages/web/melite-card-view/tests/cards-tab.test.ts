// cards-tab.test.ts — the sidebar Cards tab's three restorations
// (2026-09-11, operator-caught regressions):
//
//   address    — resolveCardsAddress serves the bench for any address
//                no cards provider claims (the `loading
//                sidebar://cards…` hang: the shell's navigation
//                address is the shell's, never a cards address).
//   categories — groupStagesByCard groups bench stages by card,
//                first-appearance order, none dropped.
//   restore    — restoreRunToBench turns a card back into a flow
//                (drafts/get → bench/get rev → per-stage
//                bench/add-stage as the user, CAS-chained).
//
// fetch is stubbed whole per method — the wire frame the tab posts
// is asserted, the canned server-response frames answer. React
// rendering (Modal drilldown, buttons) rides the live shell, not
// jsdom — the pure laws above are what pinned the regressions.
import { describe, expect, test, afterEach } from "bun:test";
import { resolveCardsAddress, groupStagesByCard } from "../src/client/CardsTab.tsx";
import { readRun, restoreRunToBench } from "../src/client/cards-resource.ts";
import type { BenchStageRow, CardsRunValue } from "../src/client/cards-resource.ts";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
  return { engine: "comfyui", ...over };
}

describe("resolveCardsAddress — the tab never hangs on a foreign address", () => {
  test("cards addresses pass through untouched", () => {
    expect(resolveCardsAddress("dsh-resource://cards/bench")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("dsh-resource://cards/run/abc")).toBe("dsh-resource://cards/run/abc");
  });
  test("the shell's own addresses serve the bench", () => {
    expect(resolveCardsAddress("sidebar://cards")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("dsh-resource://other/thing")).toBe("dsh-resource://cards/bench");
  });
});

describe("groupStagesByCard — the categories", () => {
  test("groups by card in first-appearance order", () => {
    const groups = groupStagesByCard([
      stage({ id: "s_0", card: "image-gen" }),
      stage({ id: "s_1", card: "tts" }),
      stage({ id: "s_2", card: "image-gen" }),
    ]);
    expect(groups.map((g) => g.card)).toEqual(["image-gen", "tts"]);
    expect(groups[0]?.rows.map((s) => s.id)).toEqual(["s_0", "s_2"]);
    expect(groups[1]?.rows.map((s) => s.id)).toEqual(["s_1"]);
  });
  test("cardless stages gather under uncategorized, never dropped", () => {
    const groups = groupStagesByCard([stage({ id: "s_0" }), stage({ id: "s_1", card: "x" })]);
    expect(groups.map((g) => g.card)).toEqual(["uncategorized", "x"]);
    expect(groups[0]?.rows).toHaveLength(1);
  });
});

describe("readRun — the draft key rides the value", () => {
  test("draft_id is kept for the restore path", () => {
    const v = readRun("r1", { status: "completed", draft_id: "bench-main", stages: [] });
    expect(v.draftId).toBe("bench-main");
  });
  test("a run naming no draft restores nothing (null, never '')", () => {
    expect(readRun("r1", { status: "x", stages: [] }).draftId).toBeNull();
    expect(readRun("r1", { status: "x", draft_id: "", stages: [] }).draftId).toBeNull();
  });
});

// ── restore wire ──────────────────────────────────────────────

interface Call { method: string; args: Record<string, unknown> }

let calls: Call[] = [];
let routes: Record<string, (args: Record<string, unknown>, n: number) => { ok: boolean; value?: unknown; error?: string }> = {};
let seen: Record<string, number> = {};

function stubWire(): void {
  calls = [];
  seen = {};
  routes = {};
  (globalThis as Record<string, unknown>)["fetch"] = async (_url: unknown, init?: { body?: unknown }): Promise<unknown> => {
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
afterEach(() => { (globalThis as Record<string, unknown>)["fetch"] = realFetch; });

function run(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return { kind: "run", runId: "r1", status: "completed", draftId: "bench-main", stages: [], lastFrame: undefined, ...over };
}

describe("restoreRunToBench — the card back into a flow", () => {
  test("drafts/get → bench/get rev → per-stage add-stage as the user, rev chained", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [
      { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a sailboat" } },
      { id: "s_1", card: "tts", params: { text: "hi" } },
    ] } });
    routes["bench/get"] = () => ({ ok: true, value: { draft_id: "bench-main", rev: 21, stages: [], log: [] } });
    routes["bench/add-stage"] = (_args, n) => ({ ok: true, value: { draft_id: "bench-main", session: "main", rev: 21 + n, stage: "s" } });
    const report = await restoreRunToBench(run());
    expect(report).toEqual({ added: 2, skipped: 0, notes: [] });
    expect(calls.map((c) => c.method)).toEqual(["drafts/get", "bench/get", "bench/add-stage", "bench/add-stage"]);
    expect(calls[0]?.args).toEqual({ draftId: "bench-main" });
    expect(calls[1]?.args).toEqual({ sessionKey: "main" });
    // first add carries the bench rev + user authorship; the second
    // chains the first answer's rev (the CAS law).
    expect(calls[2]?.args).toMatchObject({ card: "image-gen", engine: "comfyui", author: "user", expect_rev: 21, id: "s_0" });
    expect((calls[2]?.args["params"] as Record<string, unknown>)["prompt"]).toBe("a sailboat");
    expect(calls[3]?.args).toMatchObject({ card: "tts", author: "user", expect_rev: 22, id: "s_1" });
  });

  test("a run naming no draft throws before any fetch", async () => {
    stubWire();
    await expect(restoreRunToBench(run({ draftId: null }))).rejects.toThrow("names no draft");
    expect(calls).toEqual([]);
  });

  test("an unreadable draft throws with the door's text, bench untouched", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: false, error: "draft/gone: bench-main retired" });
    await expect(restoreRunToBench(run())).rejects.toThrow("producing draft is unreadable: draft/gone: bench-main retired");
    expect(calls.map((c) => c.method)).toEqual(["drafts/get"]);
  });

  test("cardless stages skip and count, the rest land", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [{ id: "s_0" }, { id: "s_1", card: "image-gen" }] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 3 } });
    routes["bench/add-stage"] = () => ({ ok: true, value: { rev: 4 } });
    const report = await restoreRunToBench(run());
    expect(report.added).toBe(1);
    expect(report.skipped).toBe(1);
    expect(calls.filter((c) => c.method === "bench/add-stage")).toHaveLength(1);
  });

  test("an id collision retries once without the id and notes it", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [{ id: "s_0", card: "image-gen" }] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 7 } });
    routes["bench/add-stage"] = (args) => args["id"] === undefined
      ? { ok: true, value: { rev: 8 } }
      : { ok: false, error: "stage id already on the bench: s_0" };
    const report = await restoreRunToBench(run());
    expect(report.added).toBe(1);
    expect(report.notes).toEqual(["s_0 was already on the bench — added under a fresh id"]);
    const adds = calls.filter((c) => c.method === "bench/add-stage");
    expect(adds).toHaveLength(2);
    expect(adds[1]?.args["id"]).toBeUndefined();
    expect(adds[1]?.args["expect_rev"]).toBe(7);
  });

  test("a real refusal stops the restore and names what landed", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [
      { id: "s_0", card: "image-gen" },
      { id: "s_1", card: "tts" },
    ] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 1 } });
    routes["bench/add-stage"] = (_args, n) => n === 1
      ? { ok: true, value: { rev: 2 } }
      : { ok: false, error: "bench/cas-conflict: stale rev" };
    await expect(restoreRunToBench(run())).rejects.toThrow("restore stopped after 1 stage(s): bench/cas-conflict: stale rev");
  });
});
