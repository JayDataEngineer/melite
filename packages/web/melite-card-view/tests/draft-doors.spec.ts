// draft-doors.spec.ts — draft.ts's wire-door + distillation arms the
// model spec leaves uncovered (2026-09-16 burn-down):
//
//   fetchDraftRev  — the served bench block read (rev number / dead
//                    door → null, never a throw).
//   patch rebase   — held-rev write; revless write reads then writes;
//                    revless with a dead door throws loud; CAS conflict
//                    re-reads and re-applies BOUNDED (3 tries; all
//                    THREE matcher voices — bench verbs, the drafts
//                    door's own, cas-conflict); exhaustion, a dead
//                    re-read, and any non-CAS refusal throw the named
//                    truth; delivered:false with a non-string reason
//                    lands as 'undelivered'.
//   outcome/start  — patchStageOutcome's frame; startDraft's run_id +
//                    malformed refusal.
//   rows/fold      — rowStatus's full precedence table (pending, cached,
//                    succeeded, error, unknown), prompt/service/thumb
//                    narrowing, foldFrame's empty-status keep + null-prev
//                    run frame.
//
// The doors ride the live one-lane seam (stroke 81): mountEstateFakes
// binds fakes over the mounted Typert namespaces; the recorded
// {method, args} call log is asserted (order, count, arg values).
// Fakes-not-mocks: no fetch stub answers an estate verb, no module
// mocks. Pure distillation (cardRows, foldFrame) needs no wire.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  cardRows, fetchDraft, fetchDraftRev, foldFrame, patchStageOutcome,
  patchStageParams, startDraft,
} from "../src/client/draft.ts";
import type { DraftDoc, RunStatusDoc } from "../src/client/draft.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

/** Mount the one-lane fakes for one test (drained in afterEach). */
function wire(opts: EstateFakesOptions = {}): Fakes {
  active?.unmount();
  active = mountEstateFakes(opts);
  return active;
}

afterEach(() => {
  active?.unmount();
  active = null;
  vi.unstubAllGlobals();
});

describe("fetchDraftRev — the served bench block read", () => {
  test("a numeric rev rides through", async () => {
    wire({ draftBenchRev: 41 });
    expect(await fetchDraftRev("d")).toBe(41);
  });
  test("a missing bench block reads null (never a throw)", async () => {
    wire({ draftOmitBench: true });
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a non-numeric rev reads null", async () => {
    wire({ draftBenchRev: "41" as unknown as number });
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a dead door reads null (the caller then throws loud)", async () => {
    wire({ throws: [{ method: "drafts/get", message: "network gone" }] });
    expect(await fetchDraftRev("d")).toBeNull();
  });
  test("a malformed doc reads null", async () => {
    // The harness always serves a well-formed envelope; the malformed
    // shape rides as non-array stages (served verbatim) — fetchDraft
    // refuses it, so the rev read still lands null.
    wire({ draftStages: { hello: "world" } as unknown as Array<Record<string, unknown>> });
    expect(await fetchDraftRev("d")).toBeNull();
  });
});

describe("patchStageParams — the CAS dance arms", () => {
  test("a held rev writes without a re-read", async () => {
    const fakes = wire();
    await patchStageParams("d", "s_0", { steps: 3 }, 7);
    expect(fakes.calls.map((c) => c.method)).toEqual(["drafts/patch"]);
    expect(fakes.calls[0]?.args).toEqual({ draftId: "d", stageId: "s_0", patch: { params: { steps: 3 } }, expectRev: 7 });
  });
  test("the 'cas-conflict' voice rebases too (the matcher's second arm)", async () => {
    const fakes = wire({
      draftBenchRev: 10,
      refusals: [{ method: "drafts/patch", message: "bench/cas-conflict: stale expect_rev" , code: 'bench/cas-conflict' }],
    });
    await patchStageParams("d", "s_0", { steps: 3 }, 7);
    expect(fakes.calls.filter((c) => c.method === "drafts/patch")).toHaveLength(2);
    expect(fakes.calls[fakes.calls.length - 1]?.args).toMatchObject({ expectRev: 10 });
  });
  test("the 'moved: rev is' voice rebases (the server's real words)", async () => {
    const fakes = wire({
      draftBenchRev: 429,
      refusals: [{ method: "drafts/patch", message: "bench main moved: rev is 429, caller held 35" , code: 'bench/cas-conflict' }],
    });
    await patchStageParams("d", "s_0", { steps: 3 }, 35);
    expect(fakes.calls[fakes.calls.length - 1]?.args).toMatchObject({ expectRev: 429 });
  });
  test("a revless write with a dead door throws loud (never a blind write)", async () => {
    wire({ throws: [{ method: "drafts/get", message: "network gone" }] });
    await expect(patchStageParams("d", "s_0", { steps: 3 }))
      .rejects.toThrow(/no bench rev to write against \(draft d\)/);
  });
  test("THE RUN-REFUSAL BURN (2026-10-09): the drafts/patch door's OWN voice rebases — the operator's exact message", async () => {
    // "THE WRITE DID NOT LAND — run refused: bench moved under the
    // patch (expect_rev 4, current 5) — re-read and re-apply" — the
    // operator hit this on EVERY param write while the matcher knew
    // only the bench verbs' sentence: 'moved under the patch' is the
    // drafts/patch door's OWN voice, and the cas-conflict CODE never
    // rides the message (unwrapRemote forwards message only). The
    // rebase was dead code for the one door the drill uses. This wall
    // pins the exact sentence forever: lose the arm, lose the build.
    const fakes = wire({
      draftBenchRev: 5,
      refusals: [{ method: "drafts/patch", message: "bench moved under the patch (expect_rev 4, current 5) — re-read and re-apply" , code: 'bench/cas-conflict' }],
    });
    await patchStageParams("d", "s_0", { prompt: "x" }, 4);
    const patches = fakes.calls.filter((c) => c.method === "drafts/patch");
    expect(patches).toHaveLength(2);
    expect(patches[1]?.args).toMatchObject({ expectRev: 5 });
  });
  test("conflicts on EVERY attempt throw loud (bounded, never a loop)", async () => {
    wire({
      draftBenchRev: 430,
      refusals: [
        { method: "drafts/patch", message: "bench main moved: rev is 431, caller held 430" , code: 'bench/cas-conflict' },
        { method: "drafts/patch", message: "bench main moved: rev is 431, caller held 430" , code: 'bench/cas-conflict' },
        { method: "drafts/patch", message: "bench main moved: rev is 431, caller held 430" , code: 'bench/cas-conflict' },
      ],
    });
    await expect(patchStageParams("d", "s_0", { steps: 3 }, 429))
      .rejects.toThrow(/rev is 431, caller held 430/);
  });
  test("a second author between the re-read and the retry loses to the third attempt (the once-law's death)", async () => {
    // The once-law died on a live bench with a second author bumping
    // the rev between the re-read and the retry: conflict → re-read
    // 430 → conflict again → REFUSED. The bounded loop rides it.
    const fakes = wire({
      draftBenchRev: 430,
      refusals: [
        { method: "drafts/patch", message: "bench main moved: rev is 430, caller held 429" , code: 'bench/cas-conflict' },
        { method: "drafts/patch", message: "bench main moved: rev is 430, caller held 429", onCall: 2, code: 'bench/cas-conflict' },
      ],
    });
    await patchStageParams("d", "s_0", { steps: 3 }, 429);
    const patches = fakes.calls.filter((c) => c.method === "drafts/patch");
    expect(patches).toHaveLength(3);
    expect(patches[2]?.args).toMatchObject({ expectRev: 430 });
  });
  test("a dead re-read leaves the original refusal standing", async () => {
    wire({
      refusals: [{ method: "drafts/patch", message: "bench main moved: rev is 429, caller held 35" , code: 'bench/cas-conflict' }],
      // the re-read dies: the ORIGINAL refusal is the honest answer
      throws: [{ method: "drafts/get", message: "network gone" }],
    });
    // NOTE: fetchDraftRev catches the door death → null → original refusal
    await expect(patchStageParams("d", "s_0", { steps: 3 }, 35))
      .rejects.toThrow(/rev is 429, caller held 35/);
  });
  test("a non-CAS refusal throws through untouched", async () => {
    const fakes = wire({
      draftBenchRev: 9,
      refusals: [{ method: "drafts/patch", message: "admission: unknown stage s_x" }],
    });
    await expect(patchStageParams("d", "s_x", { steps: 1 }))
      .rejects.toThrow(/admission: unknown stage/);
    expect(fakes.calls.filter((c) => c.method === "drafts/patch")).toHaveLength(1);
  });
  test("a transport throw propagates (never a conflict, never wrapped)", async () => {
    // ADAPTED (reported): the old lane rejected with the bare string
    // "kablam"; the live seam rejects with an Error carrying the text
    // (the harness throw queue), so the assertion pins the text, not
    // the string identity.
    wire({
      draftBenchRev: 9,
      throws: [{ method: "drafts/patch", message: "kablam" }],
    });
    await expect(patchStageParams("d", "s_0", { steps: 1 })).rejects.toThrow("kablam");
  });
  test("delivered:false with a non-string reason lands as 'undelivered'", async () => {
    wire({
      draftBenchRev: 9,
      patchFailures: [{ delivered: false, reason: 42 }],
    });
    await expect(patchStageParams("d", "s_0", { steps: 1 }))
      .rejects.toThrow(/drafts\/patch: undelivered \(draft d, stage s_0\)/);
  });
});

describe("patchStageOutcome — the attribution write", () => {
  test("the outcome frame carries runStatus + result + the held rev", async () => {
    const fakes = wire();
    await patchStageOutcome("d", "s_0", { runStatus: "completed", result: { url: "out.png" } }, 12);
    expect(fakes.calls).toHaveLength(1);
    expect(fakes.calls[0]?.args).toEqual({
      draftId: "d", stageId: "s_0",
      patch: { runStatus: "completed", result: { url: "out.png" } },
      expectRev: 12,
    });
  });
  test("a revless outcome write reads the rev first", async () => {
    const fakes = wire({ draftBenchRev: 5 });
    await patchStageOutcome("d", "s_0", { runStatus: "running" });
    expect(fakes.calls.map((c) => c.method)).toEqual(["drafts/get", "drafts/patch"]);
    expect(fakes.calls[1]?.args).toMatchObject({ expectRev: 5 });
  });
});

describe("startDraft — the run door", () => {
  test("startDraft returns the run_id", async () => {
    wire({ startDocs: [{ run_id: "r_7" }] });
    expect(await startDraft("d")).toBe("r_7");
  });
  test("startDraft refuses loud when the answer names no run", async () => {
    wire({ startDocs: [{ nope: true }] });
    await expect(startDraft("d")).rejects.toThrow(/runs\/start: no run_id in the answer/);
  });
  test("fetchDraft with a string draft_id but non-array stages refuses", async () => {
    wire({ draftStages: { draft_id: "d", stages: {} } as unknown as Array<Record<string, unknown>> });
    await expect(fetchDraft("d")).rejects.toThrow(/drafts\/get: not a draft doc/);
  });
});

describe("cardRows — the full precedence + narrowing table", () => {
  const doc = (stages: DraftDoc["stages"]): DraftDoc => ({ draft_id: "d", stages });
  test("the fold owns the word: named statuses keep their name; synonyms fold; an unknown word is the no-information face", () => {
    // pending is the estate's queued-for-start word and folds to the
    // waiting face; cached keeps its name (the dot map knows it);
    // succeeded folds to done; error keeps its name; interrupted is a
    // deliberate end and folds to stopped; the flow's own 'ready'
    // ("awaiting run") folds to the waiting face. An unknown word is
    // answered by the VIEW-SIDE READ (2026-10-12 follow-through, same
    // operator decision): a draft row's runStatus is a persisted word
    // no door validated — so the row renders the no-information face
    // instead of throwing the whole cards tab; the classifier's
    // refusal lives at seats reading a validated door.
    const rows = cardRows(doc([
      { id: "a", status: "pending" },
      { id: "b", status: "cached" },
      { id: "c", status: "succeeded" },
      { id: "d", status: "error" },
      { id: "e", status: "ready" },
      { id: "f", status: "interrupted" },
      { id: "g", status: "success" },
    ]));
    expect(rows.map((r) => r.status)).toEqual(["queued", "cached", "done", "error", "queued", "stopped", "done"]);
    expect(cardRows(doc([{ id: "h", status: "weird" }]))[0]?.status).toBe("pending");
    // 'unreachable' inside runStatus is an ERA row: the transport
    // stamp rode the status word before the health channel existed
    // (LOW-23, landed 2026-10-12 — the card plane now writes `health`)
    expect(cardRows(doc([{ id: "i", status: "unreachable" }]))[0]?.status).toBe("pending");
  });
  test("live pending → queued (the waiting face); live running → running; live queued → queued; live stopping → running", () => {
    const live = (status: string): RunStatusDoc => ({ run_id: "r", status: "running", stages: [{ id: "x", status }] });
    expect(cardRows(doc([{ id: "a" }]), live("pending"))[0]?.status).toBe("queued");
    expect(cardRows(doc([{ id: "a" }]), live("running"))[0]?.status).toBe("running");
    expect(cardRows(doc([{ id: "a" }]), live("queued"))[0]?.status).toBe("queued");
    expect(cardRows(doc([{ id: "a" }]), live("stopping"))[0]?.status).toBe("running");
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
    expect(kept.stages![0]?.status).toBe("running");
  });
  test("a run frame over null prev starts clean", () => {
    expect(foldFrame(null, "r1", { type: "run", status: "failed" }))
      .toEqual({ run_id: "r1", status: "failed" as const, stages: [] });
  });
});
