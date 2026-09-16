// draft-doors.spec.ts — draft.ts's wire-door + distillation arms the
// model spec leaves uncovered (2026-09-16 burn-down):
//
//   fetchDraftRev  — the served bench block read (rev number / missing
//                    block → null / door throws → null, never a throw).
//   patch rebase   — held-rev write; revless write reads then writes;
//                    revless with a dead door throws loud; CAS conflict
//                    re-reads and re-applies ONCE (both matcher voices);
//                    a second conflict, a dead re-read, and any non-CAS
//                    refusal throw the named truth; delivered:false with
//                    a non-string reason lands as 'undelivered'.
//   outcome/start  — patchStageOutcome's frame; startDraft's run_id +
//                    its missing-run_id refusal; runStatus's doc + its
//                    malformed refusal.
//   rows/fold      — rowStatus's full precedence table (pending, cached,
//                    succeeded, error, unknown), prompt/service/thumb
//                    narrowing, foldFrame's empty-status keep + null-prev
//                    run frame.
//
// The stub speaks the REAL wire law (rebase-law.spec.ts): POST
// /api/<method> with the client-request frame; typert server-response
// envelopes (rpcId echoed; domain refusals at HTTP 200 ok:false).
// Fakes-not-mocks: fetch is replaced whole per test, the wire frame
// the door posts is asserted, deep-equal on the recorded output.
import { describe, expect, test, afterEach } from "vitest";
import {
  cardRows, fetchDraft, fetchDraftRev, foldFrame, patchStageOutcome,
  patchStageParams, runStatus, startDraft,
} from "../src/client/draft.ts";
import type { DraftDoc, RunStatusDoc } from "../src/client/draft.ts";

type Answer = { refuse?: string; value?: unknown; boom?: string; thrown?: unknown };

function stubWire(route: (method: string, args: Record<string, unknown>) => Answer): Array<{ method: string; args: Record<string, unknown> }> {
  const seen: Array<{ method: string; args: Record<string, unknown> }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = url.startsWith("/api/") ? url.slice("/api/".length) : url;
    let frame: Record<string, unknown> = {};
    if (typeof init?.body === "string") frame = JSON.parse(init.body) as Record<string, unknown>;
    const rpcId = frame["rpcId"];
    const args = ((frame["payload"] as { args?: Record<string, unknown> } | undefined)?.args ?? {}) as Record<string, unknown>;
    seen.push({ method, args });
    const answer = route(method, args);
    if (answer.boom !== undefined) throw new Error(answer.boom);
    if (answer.thrown !== undefined) throw answer.thrown;
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } };
    return new Response(JSON.stringify({ type: "server-response", rpcId, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  afterEach(() => { globalThis.fetch = realFetch; });
  return seen;
}

const DRAFT = (bench: unknown): Record<string, unknown> => ({
  draft_id: "d", stages: [{ id: "s_0" }], bench,
});

describe("fetchDraftRev — the served bench block read", () => {
  test("a numeric rev rides through", async () => {
    stubWire((m) => m === "drafts/get" ? { value: DRAFT({ rev: 41, log: [] }) } : {});
    expect(await fetchDraftRev("d")).toBe(41);
  });
  test("a missing bench block reads null (never a throw)", async () => {
    stubWire((m) => m === "drafts/get" ? { value: { draft_id: "d", stages: [] } } : {});
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a non-numeric rev reads null", async () => {
    stubWire((m) => m === "drafts/get" ? { value: DRAFT({ rev: "41", log: [] }) } : {});
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a dead door reads null (the caller then throws loud)", async () => {
    stubWire(() => ({ boom: "network gone" }));
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a malformed doc reads null", async () => {
    stubWire((m) => m === "drafts/get" ? { value: { hello: "world" } } : {});
    expect(await fetchDraftRev("d")).toBeNull();
  });
});

describe("patchStageParams — the CAS dance arms", () => {
  test("a held rev writes without a re-read", async () => {
    const seen = stubWire((m) => m === "drafts/patch"
      ? { value: { delivered: true } }
      : { value: DRAFT({ rev: 1, log: [] }) });
    await patchStageParams("d", "s_0", { steps: 3 }, 7);
    expect(seen.map((c) => c.method)).toEqual(["drafts/patch"]);
    expect(seen[0]?.args).toEqual({ draftId: "d", stageId: "s_0", patch: { params: { steps: 3 } }, expectRev: 7 });
  });
  test("the 'cas-conflict' voice rebases too (the matcher's second arm)", async () => {
    const seen = stubWire((m, a) => {
      if (m === "drafts/get") return { value: DRAFT({ rev: 10, log: [] }) };
      const doc = a["doc"] as Record<string, unknown> | undefined;
      void doc;
      return (a["expectRev"] as number) === 7
        ? { refuse: "bench/cas-conflict: stale expect_rev" }
        : { value: { delivered: true } };
    });
    await patchStageParams("d", "s_0", { steps: 3 }, 7);
    expect(seen.filter((c) => c.method === "drafts/patch")).toHaveLength(2);
    expect(seen[seen.length - 1]?.args).toMatchObject({ expectRev: 10 });
  });
  test("the 'moved: rev is' voice rebases (the server's real words)", async () => {
    const seen = stubWire((m, a) => {
      if (m === "drafts/get") return { value: DRAFT({ rev: 429, log: [] }) };
      return (a["expectRev"] as number) === 35
        ? { refuse: "bench main moved: rev is 429, caller held 35" }
        : { value: { delivered: true } };
    });
    await patchStageParams("d", "s_0", { steps: 3 }, 35);
    expect(seen[seen.length - 1]?.args).toMatchObject({ expectRev: 429 });
  });
  test("a revless write with a dead door throws loud (never a blind write)", async () => {
    stubWire(() => ({ boom: "network gone" }));
    await expect(patchStageParams("d", "s_0", { steps: 3 }))
      .rejects.toThrow(/no bench rev to write against \(draft d\)/);
  });
  test("a second conflict throws loud", async () => {
    stubWire((m) => m === "drafts/get"
      ? { value: DRAFT({ rev: 430, log: [] }) }
      : { refuse: "bench main moved: rev is 431, caller held 430" });
    await expect(patchStageParams("d", "s_0", { steps: 3 }, 429))
      .rejects.toThrow(/rev is 431, caller held 430/);
  });
  test("a dead re-read leaves the original refusal standing", async () => {
    stubWire((m) => {
      if (m === "drafts/patch") return { refuse: "bench main moved: rev is 429, caller held 35" };
      // the re-read dies: the ORIGINAL refusal is the honest answer
      throw new Error("network gone");
    });
    // NOTE: fetchDraftRev catches the door death → null → original refusal
    await expect(patchStageParams("d", "s_0", { steps: 3 }, 35))
      .rejects.toThrow(/rev is 429, caller held 35/);
  });
  test("a non-CAS refusal throws through untouched", async () => {
    const seen = stubWire((m) => m === "drafts/get"
      ? { value: DRAFT({ rev: 9, log: [] }) }
      : { refuse: "admission: unknown stage s_x" });
    await expect(patchStageParams("d", "s_x", { steps: 1 }))
      .rejects.toThrow(/admission: unknown stage/);
    expect(seen.filter((c) => c.method === "drafts/patch")).toHaveLength(1);
  });
  test("a non-Error throw propagates verbatim (never a conflict, never wrapped)", async () => {
    stubWire((m) => m === "drafts/get"
      ? { value: DRAFT({ rev: 9, log: [] }) }
      : { thrown: "kablam" });
    await expect(patchStageParams("d", "s_0", { steps: 1 })).rejects.toBe("kablam");
  });
  test("delivered:false with a non-string reason lands as 'undelivered'", async () => {
    stubWire((m) => m === "drafts/get"
      ? { value: DRAFT({ rev: 9, log: [] }) }
      : { value: { delivered: false, reason: 42 } });
    await expect(patchStageParams("d", "s_0", { steps: 1 }))
      .rejects.toThrow(/drafts\/patch: undelivered \(draft d, stage s_0\)/);
  });
});

describe("patchStageOutcome — the attribution write", () => {
  test("the outcome frame carries runStatus + result + the held rev", async () => {
    const seen = stubWire((m) => m === "drafts/patch"
      ? { value: { delivered: true } }
      : { value: DRAFT({ rev: 1, log: [] }) });
    await patchStageOutcome("d", "s_0", { runStatus: "completed", result: { url: "out.png" } }, 12);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.args).toEqual({
      draftId: "d", stageId: "s_0",
      patch: { runStatus: "completed", result: { url: "out.png" } },
      expectRev: 12,
    });
  });
  test("a revless outcome write reads the rev first", async () => {
    const seen = stubWire((m) => m === "drafts/get"
      ? { value: DRAFT({ rev: 5, log: [] }) }
      : { value: { delivered: true } });
    await patchStageOutcome("d", "s_0", { runStatus: "running" });
    expect(seen.map((c) => c.method)).toEqual(["drafts/get", "drafts/patch"]);
    expect(seen[1]?.args).toMatchObject({ expectRev: 5 });
  });
});

describe("startDraft / runStatus — the run doors", () => {
  test("startDraft returns the run_id", async () => {
    stubWire((m) => m === "runs/start" ? { value: { run_id: "r_7" } } : {});
    expect(await startDraft("d")).toBe("r_7");
  });
  test("startDraft refuses loud when the answer names no run", async () => {
    stubWire(() => ({ value: { nope: true } }));
    await expect(startDraft("d")).rejects.toThrow(/runs\/start: no run_id in the answer/);
  });
  test("runStatus returns the status doc", async () => {
    stubWire((m) => m === "runs/status" ? { value: { run_id: "r", status: "running", stages: [] } } : {});
    expect(await runStatus("r")).toEqual({ run_id: "r", status: "running", stages: [] });
  });
  test("runStatus refuses a non-doc payload", async () => {
    stubWire(() => ({ value: { run_id: "r" } }));
    await expect(runStatus("r")).rejects.toThrow(/runs\/status: not a status doc/);
  });
  test("fetchDraft with a string draft_id but non-array stages refuses", async () => {
    stubWire(() => ({ value: { draft_id: "d", stages: {} } }));
    await expect(fetchDraft("d")).rejects.toThrow(/drafts\/get: not a draft doc/);
  });
});

describe("cardRows — the full precedence + narrowing table", () => {
  const doc = (stages: DraftDoc["stages"]): DraftDoc => ({ draft_id: "d", stages });
  test("pending → queued; cached/succeeded → done; error → failed; unknown → ready", () => {
    const rows = cardRows(doc([
      { id: "a", status: "pending" },
      { id: "b", status: "cached" },
      { id: "c", status: "succeeded" },
      { id: "d", status: "error" },
      { id: "e", status: "weird" },
    ]));
    expect(rows.map((r) => r.status)).toEqual(["queued", "done", "done", "failed", "ready"]);
  });
  test("live pending → queued; live running → running; live queued → queued", () => {
    const live = (status: string): RunStatusDoc => ({ run_id: "r", status: "running", stages: [{ id: "x", status }] });
    expect(cardRows(doc([{ id: "a" }]), live("pending"))[0]?.status).toBe("queued");
    expect(cardRows(doc([{ id: "a" }]), live("running"))[0]?.status).toBe("running");
    expect(cardRows(doc([{ id: "a" }]), live("queued"))[0]?.status).toBe("queued");
  });
  test("non-string and empty prompts distill to null; missing params distill clean", () => {
    const rows = cardRows(doc([
      { id: "a", params: { prompt: 42 } },
      { id: "b", params: { prompt: "" } },
      { id: "c" },
    ]));
    expect(rows.map((r) => r.prompt)).toEqual([null, null, null]);
    expect(rows[2]?.thumbUrl).toBeNull();
  });
  test("empty-string service distills to null; non-string service distills to null", () => {
    const rows = cardRows(doc([
      { id: "a", service: "" },
      { id: "b", service: 7 as unknown as string },
    ]));
    expect(rows.map((r) => r.service)).toEqual([null, null]);
  });
  test("empty-string thumb url distills to null; missing run_id still rewrites", () => {
    const live: RunStatusDoc = { run_id: "", status: "running", stages: [{ id: "x", status: "completed", url: "" }] };
    expect(cardRows(doc([{ id: "a" }]), live)[0]?.thumbUrl).toBeNull();
    const live2 = { status: "running", stages: [{ id: "x", status: "completed", url: "o.png" }] } as unknown as RunStatusDoc;
    // a missing run_id still rewrites onto the media route (empty segment)
    expect(cardRows(doc([{ id: "a" }]), live2)[0]?.thumbUrl).toBe("/melite-media/runs//o.png");
  });
  test("non-string thumb url distills to null", () => {
    const live: RunStatusDoc = { run_id: "r", status: "running", stages: [{ id: "x", status: "completed", url: 9 as unknown as string }] };
    expect(cardRows(doc([{ id: "a" }]), live)[0]?.thumbUrl).toBeNull();
  });
});

describe("foldFrame — keep + null-prev arms", () => {
  test("a stage frame with an EMPTY status keeps the current one", () => {
    const first = foldFrame(null, "r1", { type: "stage", stage: "g", index: 0, status: "running" });
    const kept = foldFrame(first, "r1", { type: "stage", stage: "g", index: 0, status: "" });
    expect(kept.stages[0]?.status).toBe("running");
  });
  test("a run frame over null prev starts clean", () => {
    expect(foldFrame(null, "r1", { type: "run", status: "failed" }))
      .toEqual({ run_id: "r1", status: "failed", stages: [] });
  });
});
