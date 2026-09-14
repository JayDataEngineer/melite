// draft-model.spec.ts — the native card surface's PURE layer walled:
// row distillation (status precedence), the param field projection,
// and the edit→PATCH coercion (raw-typed strings, coerced once).
// The fetch doors are exercised live by smoke; here they are stubbed
// to their wire shapes only where narrowing behavior is the contract
// (named refusal propagation, malformed-doc refusal).
import { describe, expect, test } from "vitest";
import {
  cardRows, coerceEdit, editPatch, fetchDraft, foldFrame, paramFields, patchStageParams, runFinished,
} from "../src/client/draft.ts";
import type { DraftDoc, RunStatusDoc } from "../src/client/draft.ts";

const DOC: DraftDoc = {
  draft_id: "draft-1",
  intent: "a green cone",
  stages: [
    { id: "s_0", title: "image-gen", kind: "generation", service: "krea-2", params: { prompt: "a green cone", seed: -1, steps: 8, turbo: false } },
    { id: "s_1", title: "upscale", kind: "post", status: "done" },
  ],
  status: "ready",
  createdAt: 1,
};

function res(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("cardRows — status precedence and distillation", () => {
  test("no live run: draft stage status, else ready", () => {
    const rows = cardRows(DOC, null);
    expect(rows.map((r) => r.status)).toEqual(["ready", "done"]);
    expect(rows[0].thumbUrl).toBe(null);
    expect(rows[0].prompt).toBe("a green cone");
    expect(rows[0].service).toBe("krea-2");
  });

  test("live run wins POSITIONALLY (run ids never equal draft ids)", () => {
    const live: RunStatusDoc = {
      run_id: "r1", status: "running",
      stages: [{ id: "generate", status: "completed", url: "/v1/assets/runs/r1/generate/out.png" }],
    };
    const rows = cardRows(DOC, live);
    expect(rows[0].status).toBe("done");
    expect(rows[0].thumbUrl).toBe("/v1/assets/runs/r1/generate/out.png");
    expect(rows[1].status).toBe("done"); // draft status holds when run has no row yet
  });

  test("long prompts clip at 96 chars; empty prompt is null", () => {
    const doc: DraftDoc = { ...DOC, stages: [{ id: "s", title: "t", kind: "k", params: { prompt: "x".repeat(200) } }, { id: "s2", title: "t2", kind: "k2" }] };
    const rows = cardRows(doc);
    expect(rows[0].prompt?.length).toBe(96);
    expect(rows[1].prompt).toBe(null);
  });
});

describe("paramFields + editPatch — the form model", () => {
  test("booleans→switch atom, numbers→number, strings→text; objects dropped", () => {
    const fields = paramFields({ b: true, n: 1.5, s: "x", o: { deep: true }, nil: null });
    expect(fields.map((f) => [f.key, f.atom])).toEqual([["b", "switch"], ["n", "number"], ["s", "text"]]);
  });

  test("raw typing survives decimals; coercion happens once at patch", () => {
    const fields = paramFields({ steps: 8 });
    expect(coerceEdit(fields[0], "8.")).toBe(8);
    expect(coerceEdit(fields[0], "8.5")).toBe(8.5);
    expect(coerceEdit(fields[0], "x")).toBe(8); // non-finite keeps the field value
  });

  test("editPatch: only changed keys, retyped-back-to-original is not an edit", () => {
    const fields = paramFields({ steps: 8, prompt: "a", turbo: false });
    const edits = new Map([["steps", "9"], ["prompt", "a"], ["turbo", true]]);
    expect(editPatch(fields, edits)).toEqual({ steps: 9, turbo: true });
    expect(editPatch(fields, new Map([["steps", "8"]]))).toBe(null); // same value, no PATCH
  });
});

describe("foldFrame — the events-bus idempotent patch", () => {
  test("stage frames patch positionally by index, never by id", () => {
    const first = foldFrame(null, "r1", { type: "stage", stage: "generate", index: 0, status: "running" });
    expect(first.stages[0]).toEqual({ id: "0", status: "running", url: undefined });
    const second = foldFrame(first, "r1", { type: "stage", stage: "generate", index: 0, status: "completed" });
    expect(second.stages[0].status).toBe("completed");
    // a frame WITHOUT status keeps the current one (idempotent patch)
    const third = foldFrame(second, "r1", { type: "stage", stage: "generate", index: 0 });
    expect(third.stages[0].status).toBe("completed");
  });

  test("frame without index patches nothing; run frames set the run status", () => {
    const base = foldFrame(null, "r1", { type: "stage", stage: "x", status: "running" });
    expect(base.stages).toEqual([]);
    const run = foldFrame(base, "r1", { type: "run", status: "completed" });
    expect(run.status).toBe("completed");
    expect(run.stages).toEqual([]);
  });
});

// The wire stub: fetch is replaced whole; the canned RemoteResult
// answers inside the server-response frame the wire caller expects
// (fetchDraft self-fetches — the gateway-era fetch injection died
// with the app; tests stub globalThis.fetch per call).
function stubWire(result: { ok: true; value: unknown } | { ok: false; error: { message: string } }): void {
  (globalThis as { fetch: unknown }).fetch = async (_input: unknown, init?: RequestInit): Promise<Response> => {
    const frame = JSON.parse(String(init?.body)) as { rpcId?: string; method?: string };
    return new Response(JSON.stringify({
      type: "server-response", rpcId: frame.rpcId, result,
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
}

describe("door narrowing — named refusals, malformed docs", () => {
  test("fetchDraft propagates the remote's named error", async () => {
    stubWire({ ok: false, error: { message: "no_such_draft" } });
    expect((await fetchDraft("d").catch((e: Error) => e.message))).toBe("no_such_draft");
  });

  test("fetchDraft refuses a non-doc payload with its own name", async () => {
    stubWire({ ok: true, value: { hello: "world" } });
    expect((await fetchDraft("d").catch((e: Error) => e.message))).toBe("drafts/get: not a draft doc");
  });

  test("patchStageParams rides the drafts/patch wire door (reborn 2026-09-11)", async () => {
    // The REAL door: the write arm over the drafts domain. The frame
    // carries the named args + the {params} patch body + the CAS
    // expectRev (the revless-write cure: the door requires a rev, so
    // the write reads the served doc's bench block first); delivered
    // false lands as a named throw (never a lying success).
    const sent: Array<Record<string, unknown>> = [];
    (globalThis as { fetch: unknown }).fetch = async (_i: unknown, init?: RequestInit): Promise<Response> => {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      sent.push(frame as unknown as Record<string, unknown>);
      const value = frame.method === "drafts/get"
        ? { draft_id: "d", stages: [], bench: { rev: 9, log: [] } }
        : { draftId: "d", stageId: "s_0", delivered: true, patched: ["params"] };
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId,
        result: { ok: true, value },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    await patchStageParams("d", "s_0", { steps: 12 });
    const write = sent.find((f) => (f as { method: string }).method === "drafts/patch") as unknown as { method: string; payload: { args: Record<string, unknown> } };
    expect(write.method).toBe("drafts/patch");
    expect(write.payload.args).toEqual({ draftId: "d", stageId: "s_0", patch: { params: { steps: 12 } }, expectRev: 9 });

    (globalThis as { fetch: unknown }).fetch = async (_i: unknown, init?: RequestInit): Promise<Response> => {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      const value = frame.method === "drafts/get"
        ? { draft_id: "d", stages: [], bench: { rev: 9, log: [] } }
        : { draftId: "d", stageId: "s_x", delivered: false, reason: "stage not found" };
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId,
        result: { ok: true, value },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const message = await patchStageParams("d", "s_x", { steps: 1 }).catch((e: Error) => e.message);
    expect(message).toContain("stage not found");
  });

  test("runFinished pins the estate TERMINAL set (FlowEvents, verbatim)", () => {
    for (const s of ["completed", "failed", "stopped", "unknown"]) expect(runFinished(s)).toBe(true);
    for (const s of ["running", "queued", "error"]) expect(runFinished(s)).toBe(false);
  });
});
