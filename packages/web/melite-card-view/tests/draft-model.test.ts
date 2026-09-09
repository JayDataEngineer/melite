// draft-model.test.ts — the native card surface's PURE layer walled:
// row distillation (status precedence), the param field projection,
// and the edit→PATCH coercion (raw-typed strings, coerced once).
// The fetch doors are exercised live by smoke; here they are stubbed
// to their wire shapes only where narrowing behavior is the contract
// (named refusal propagation, malformed-doc refusal).
import { describe, expect, test } from "bun:test";
import {
  cardRows, coerceEdit, editPatch, fetchDraft, paramFields, runFinished,
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

  test("live run wins per stage; thumb rides the artifact url", () => {
    const live: RunStatusDoc = {
      run_id: "r1", status: "running",
      stages: [{ id: "s_0", status: "completed", url: "/v1/assets/runs/r1/s_0/out.png" }],
    };
    const rows = cardRows(DOC, live);
    expect(rows[0].status).toBe("done");
    expect(rows[0].thumbUrl).toBe("/v1/assets/runs/r1/s_0/out.png");
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

describe("door narrowing — named refusals, malformed docs", () => {
  test("fetchDraft propagates the door's named error", async () => {
    const stub = async () => res(400, { error: "no_such_draft" });
    expect((await fetchDraft(stub, "d").catch((e: Error) => e.message))).toBe("no_such_draft");
  });

  test("fetchDraft refuses a non-doc payload with its own name", async () => {
    const stub = async () => res(200, { hello: "world" });
    expect((await fetchDraft(stub, "d").catch((e: Error) => e.message))).toBe("draft GET: not a draft doc");
  });

  test("runFinished pins the terminal set", () => {
    for (const s of ["completed", "failed", "error", "stopped"]) expect(runFinished(s)).toBe(true);
    for (const s of ["running", "queued"]) expect(runFinished(s)).toBe(false);
  });
});
