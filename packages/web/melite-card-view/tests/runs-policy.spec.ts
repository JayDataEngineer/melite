/**
 * runs-policy.spec.ts — the moved run laws over the bind seam
 * (stroke 81): every start/status/stop/list arm of runs-policy.ts
 * pinned through mountEstateFakes (the ONE fake — no module mocks,
 * no envelope stubs). The laws:
 *  - the start doc spells knobs TOP-LEVEL beside model/draft_id/
 *    test (the {model:} door's convention — a nested params stanza
 *    would lose to family defaults estate-side);
 *  - a refusal or a throw BOTH land as {refused} with the estate's
 *    text (never thrown past the gesture, never silent);
 *  - a start answer with no run_id is a refusal, not a ghost run;
 *  - the single-stage fallback: a one-stage run's only stage IS the
 *    asked stage under any label;
 *  - the file-era arm: a REFUSED status falls back to the runs/list
 *    row's first artifact; transport errors rethrow;
 *  - the gone-verdict: refused + absent from the list = 'gone';
 *    refused + listed = the list's status; a transport throw is NOT
 *    a verdict (it rethrows);
 *  - the newest-run bridge scans the wide list tail, newest
 *    created_at wins.
 */
import { afterEach, expect, test } from "vitest";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";
import { bindEstateRemote, estateRemote, unbindEstateRemote, unwrapRemote } from "@melite/card-base/estate-remote";
import { fetchMediaLibrary } from "@melite/card-base/media-library";
import {
  fetchLatestRunForDraft,
  fetchListRow,
  fetchRunStageUrl,
  fetchRunStatus,
  fetchRunTerminal,
  pollRunStageUrl,
  probeRunGone,
  startCardRun,
  startFlowInlineRun,
  stopRun,
} from "@melite/card-base/runs-policy";
import { mountEstateFakes } from "./estate-harness.ts";

afterEach(() => {
  mountEstateFakes().unmount();
});

const DRAFT = "bench-s1";

// ── the start doors ─────────────────────────────────────────────

test("startCardRun spells the composing doc: knobs top-level, family model, draft id, test false", async () => {
  const fakes = mountEstateFakes();
  try {
    const res = await startCardRun({ model: "anima", params: { prompt: "a red cube", steps: 8 }, draftId: DRAFT });
    expect(res).toEqual({ runId: "run-1" });
    const start = fakes.calls.find((c) => c.method === "runs/start")!;
    const doc = start.args["doc"] as Record<string, unknown>;
    // knobs ride TOP-LEVEL (no params stanza — the door strips
    // envelope keys and a nested stanza would merge under the
    // family defaults).
    expect(doc["prompt"]).toBe("a red cube");
    expect(doc["steps"]).toBe(8);
    expect(doc["params"]).toBeUndefined();
    expect(doc["model"]).toBe("anima");
    expect(doc["draft_id"]).toBe(DRAFT);
    expect(doc["test"]).toBe(false);
  } finally {
    fakes.unmount();
  }
});

test("startCardRun threads test:true for the dry-run gesture", async () => {
  const fakes = mountEstateFakes();
  try {
    await startCardRun({ model: "anima", params: {}, draftId: DRAFT, test: true });
    const start = fakes.calls.find((c) => c.method === "runs/start")!;
    expect((start.args["doc"] as Record<string, unknown>)["test"]).toBe(true);
  } finally {
    fakes.unmount();
  }
});

test("startCardRun carries the estate refusal verbatim — never thrown past the gesture", async () => {
  const fakes = mountEstateFakes({ refusals: [{ method: "runs/start", message: "card= stages are unported" }] });
  try {
    const res = await startCardRun({ model: "image-gen", params: {}, draftId: DRAFT });
    expect(res).toEqual({ refused: "card= stages are unported" });
  } finally {
    fakes.unmount();
  }
});

test("startCardRun converts a wire throw to a refusal — the start never rejects", async () => {
  const fakes = mountEstateFakes({ throws: [{ method: "runs/start", message: "wire down" }] });
  try {
    const res = await startCardRun({ model: "anima", params: {}, draftId: DRAFT });
    expect(res).toEqual({ refused: "wire down" });
  } finally {
    fakes.unmount();
  }
});

test("startCardRun refuses when the answer carries no run_id — never a ghost run", async () => {
  const fakes = mountEstateFakes({ startDocs: [{ status: "queued" }] });
  try {
    const res = await startCardRun({ model: "anima", params: {}, draftId: DRAFT });
    expect(res).toEqual({ refused: "run refused: no run_id in the answer" });
  } finally {
    fakes.unmount();
  }
});

test("startFlowInlineRun rides the flow door with the bench draft id and test false", async () => {
  const fakes = mountEstateFakes();
  try {
    const stages = [{ card: "image-gen", params: { workflow: { nodes: [] } } }];
    const res = await startFlowInlineRun({ flowId: "flow-9", stages, draftId: DRAFT });
    expect(res).toEqual({ runId: "run-1" });
    const start = fakes.calls.find((c) => c.method === "runs/start")!;
    const doc = start.args["doc"] as Record<string, unknown>;
    expect(doc["flow_inline"]).toEqual({ id: "flow-9", stages });
    expect(doc["draft_id"]).toBe(DRAFT);
    expect(doc["test"]).toBe(false);
  } finally {
    fakes.unmount();
  }
});

// ── stop ────────────────────────────────────────────────────────

test("stopRun fires runs/stop and a refusal throws the estate text", async () => {
  const okFakes = mountEstateFakes();
  try {
    await stopRun("run-1");
    expect(okFakes.calls.some((c) => c.method === "runs/stop")).toBe(true);
  } finally {
    okFakes.unmount();
  }
  const refusedFakes = mountEstateFakes({ refusals: [{ method: "runs/stop", message: "no such run" }] });
  try {
    await expect(stopRun("run-9")).rejects.toThrow("no such run");
  } finally {
    refusedFakes.unmount();
  }
});

// ── status reads ────────────────────────────────────────────────

test("fetchRunStatus normalizes the live doc and fetchRunTerminal reads the vocabulary", async () => {
  const fakes = mountEstateFakes({
    runDocs: [
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [] },
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [] },
      { run_id: "run-1", status: "completed", draft_id: DRAFT, stages: [] },
    ],
  });
  try {
    const row = await fetchRunStatus("run-1");
    expect(row.status).toBe("running");
    expect(await fetchRunTerminal("run-1")).toBe(false);
    // the last queued doc lingers (poll loops terminate).
    expect(await fetchRunTerminal("run-1")).toBe(true);
  } finally {
    fakes.unmount();
  }
});

test("fetchRunStageUrl answers the matching stage url, null when the stage carries none yet", async () => {
  const fakes = mountEstateFakes({
    runDocs: [
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "frame.png" }] },
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] },
    ],
  });
  try {
    expect(await fetchRunStageUrl("run-1", "s_0")).toBe("/melite-media/runs/run-1/frame.png");
    expect(await fetchRunStageUrl("run-1", "s_0")).toBeNull();
  } finally {
    fakes.unmount();
  }
});

test("fetchRunStageUrl single-stage fallback: the only stage answers under any label", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{ run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "img-to-mesh", url: "mesh.glb" }] }],
  });
  try {
    // the {model:} door names the stage by the card skeleton —
    // the caller holds the bench row id.
    expect(await fetchRunStageUrl("run-1", "s_1")).toBe("/melite-media/runs/run-1/mesh.glb");
  } finally {
    fakes.unmount();
  }
});

test("fetchRunStageUrl file-era arm: a REFUSED status falls back to the list row artifact", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    listRows: [{ run_id: "run-7", status: "completed", artifacts: [{ url: "run-7/frame.png" }] }],
  });
  try {
    expect(await fetchRunStageUrl("run-7", "s_0")).toBe("/melite-media/runs/run-7/frame.png");
  } finally {
    fakes.unmount();
  }
});

test("fetchRunStageUrl file-era arm: absent from the list too is null, not a throw", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
  });
  try {
    expect(await fetchRunStageUrl("run-9", "s_0")).toBeNull();
  } finally {
    fakes.unmount();
  }
});

test("fetchRunStageUrl rethrows transport errors — a down wire is not a verdict", async () => {
  const fakes = mountEstateFakes({ throws: [{ method: "runs/status", message: "wire down" }] });
  try {
    await expect(fetchRunStageUrl("run-1", "s_0")).rejects.toThrow("wire down");
  } finally {
    fakes.unmount();
  }
});

// ── the gone-verdict ────────────────────────────────────────────

test("probeRunGone: a known run is live", async () => {
  const fakes = mountEstateFakes();
  try {
    expect(await probeRunGone("run-1")).toBe("live");
  } finally {
    fakes.unmount();
  }
});

test("probeRunGone: refused and absent from the list is gone", async () => {
  const fakes = mountEstateFakes({ refusals: [{ method: "runs/status", message: "no such run" }] });
  try {
    expect(await probeRunGone("run-9")).toBe("gone");
  } finally {
    fakes.unmount();
  }
});

test("probeRunGone: refused but listed answers the list status, defaulting to completed", async () => {
  const listed = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    listRows: [{ run_id: "run-7", status: "failed", artifacts: [] }],
  });
  try {
    expect(await probeRunGone("run-7")).toBe("failed");
  } finally {
    listed.unmount();
  }
  const unstatused = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    listRows: [{ run_id: "run-8", artifacts: [] }],
  });
  try {
    expect(await probeRunGone("run-8")).toBe("completed");
  } finally {
    unstatused.unmount();
  }
});

test("probeRunGone: a transport throw is not a verdict — it rethrows", async () => {
  const fakes = mountEstateFakes({ throws: [{ method: "runs/status", message: "wire down" }] });
  try {
    await expect(probeRunGone("run-1")).rejects.toThrow("wire down");
  } finally {
    fakes.unmount();
  }
});

// ── the newest-run bridge ───────────────────────────────────────

test("fetchLatestRunForDraft scans the wide tail — newest created_at wins, other drafts skipped", async () => {
  const fakes = mountEstateFakes({
    listRows: [
      { run_id: "run-old", draft_id: DRAFT, created_at: 10, artifacts: [] },
      { run_id: "run-other", draft_id: "bench-zzz", created_at: 99, artifacts: [] },
      { id: "run-new", draft_id: DRAFT, created_at: 20, artifacts: [] },
      { run_id: "run-undated", draft_id: DRAFT, artifacts: [] },
    ],
  });
  try {
    expect(await fetchLatestRunForDraft(DRAFT)).toBe("run-new");
    expect(await fetchLatestRunForDraft("bench-zzz")).toBe("run-other");
    expect(await fetchLatestRunForDraft("bench-empty")).toBeNull();
  } finally {
    fakes.unmount();
  }
});

test("fetchLatestRunForDraft reads the list through the '500' wide tail", async () => {
  const fakes = mountEstateFakes();
  try {
    expect(await fetchLatestRunForDraft(DRAFT)).toBeNull();
    expect(fakes.calls.find((c) => c.method === "runs/list")?.args["rawLimit"]).toBe("500");
  } finally {
    fakes.unmount();
  }
});

// ── the artifact poll ───────────────────────────────────────────

test("pollRunStageUrl fires onUrl once when the url lands immediately", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{ run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "mesh.glb" }] }],
  });
  try {
    const seen: string[] = [];
    await pollRunStageUrl("run-1", "s_0", { onUrl: (u) => { seen.push(u); }, intervalMs: 1 });
    expect(seen).toEqual(["/melite-media/runs/run-1/mesh.glb"]);
    expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
  } finally {
    fakes.unmount();
  }
});

test("pollRunStageUrl resolves silent when the run settles with no url", async () => {
  const fakes = mountEstateFakes({
    runDocs: [
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] },
      { run_id: "run-1", status: "completed", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] },
    ],
  });
  try {
    let fired = 0;
    await pollRunStageUrl("run-1", "s_0", { onUrl: () => { fired += 1; }, intervalMs: 1 });
    expect(fired).toBe(0);
  } finally {
    fakes.unmount();
  }
});

test("pollRunStageUrl file-era arm: refused status + listed artifact fires the list url", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    listRows: [{ run_id: "run-7", status: "completed", artifacts: [{ url: "run-7/mesh.glb" }] }],
  });
  try {
    const seen: string[] = [];
    await pollRunStageUrl("run-7", "s_0", { onUrl: (u) => { seen.push(u); }, intervalMs: 1 });
    expect(seen).toEqual(["/melite-media/runs/run-7/mesh.glb"]);
  } finally {
    fakes.unmount();
  }
});

test("pollRunStageUrl file-era arm: refused status + no row settles silent", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
  });
  try {
    let fired = 0;
    await pollRunStageUrl("run-9", "s_0", { onUrl: () => { fired += 1; }, intervalMs: 1 });
    expect(fired).toBe(0);
  } finally {
    fakes.unmount();
  }
});

test("pollRunStageUrl survives a transport-blip list read — the answer lands next cadence", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    throws: [{ method: "runs/list", message: "wire blip" }],
    runDocs: [
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] },
      { run_id: "run-1", status: "completed", draft_id: DRAFT, stages: [{ id: "s_0", url: "mesh.glb" }] },
    ],
  });
  try {
    const seen: string[] = [];
    await pollRunStageUrl("run-1", "s_0", { onUrl: (u) => { seen.push(u); }, intervalMs: 1 });
    expect(seen).toEqual(["/melite-media/runs/run-1/mesh.glb"]);
  } finally {
    fakes.unmount();
  }
});

test("pollRunStageUrl honors a pre-aborted signal — no calls, no fire", async () => {
  const fakes = mountEstateFakes();
  try {
    const ctrl = new AbortController();
    ctrl.abort();
    let fired = 0;
    await pollRunStageUrl("run-1", "s_0", { onUrl: () => { fired += 1; }, intervalMs: 1 }, ctrl.signal);
    expect(fired).toBe(0);
    expect(fakes.calls).toHaveLength(0);
  } finally {
    fakes.unmount();
  }
});

// ── the stroke-81 burn-down (2026-09-16): the residual arms the
//    migration's vacuously-green gate run left uncovered ──────────

// THE UNBOUND LAW (estate-remote): a verb call before the mount is a
// wiring bug — LOUD, never a silent fallback.
test("estateRemote throws loud when unbound (never a silent fallback)", () => {
  unbindEstateRemote();
  expect(() => estateRemote()).toThrow("estate remote not mounted");
});

// THE UNWRAP VOICE LAW (estate-remote): a refusal that carries no
// words falls back to the caller's voice (never an empty throw).
test("unwrapRemote falls back to the caller's voice when the refusal carries no words", async () => {
  const empty = { ok: false, error: new RemoteError("gateway/bad-request", "", {}) } as unknown as RemoteResult<Record<string, unknown>>;
  await expect(unwrapRemote(empty, "runs/status")).rejects.toThrow("runs/status: refused");
  const wordless = { ok: false, error: {} } as unknown as RemoteResult<Record<string, unknown>>;
  await expect(unwrapRemote(wordless, "runs/status")).rejects.toThrow("runs/status: refused");
});

// THE MALFORMED-LIBRARY LAW (media-library): a non-array items shape
// reads as empty — the picker's source never throws on estate drift.
test("fetchMediaLibrary reads a malformed items shape as empty (never a throw on the picker's source)", async () => {
  const fakes = mountEstateFakes({ mediaItems: "nope" as unknown as Array<Record<string, unknown>> });
  try {
    await expect(fetchMediaLibrary("image")).resolves.toEqual([]);
  } finally {
    fakes.unmount();
  }
});

/** Bind ONLY runs/list over dead namespaces (the malformed-tail arm
 *  the shared harness cannot serve — it always wraps an array). */
function bindRunsListDoc(doc: unknown): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error("unused namespace in this wall: " + method) };
  bindEstateRemote({
    bench: { get: dead("bench/get") },
    drafts: { get: dead("drafts/get") },
    runs: { list: async () => ({ ok: true, value: doc }) },
    media: { list: dead("media/list") },
  } as unknown as Parameters<typeof bindEstateRemote>[0]);
}

// THE MALFORMED-TAIL LAW (runs-policy): a non-array runs tail reads
// as empty — the bridge and the row read null, never throw.
test("a malformed runs tail reads empty — the newest-run bridge and the row read null, never throw", async () => {
  bindRunsListDoc({ runs: "nope" });
  try {
    await expect(fetchLatestRunForDraft(DRAFT)).resolves.toBeNull();
    await expect(fetchListRow("run-1")).resolves.toBeNull();
  } finally {
    unbindEstateRemote();
  }
});

// THE ID-CURRENCY LAW (fetchListRow): rows keyed by bare id answer
// too, and a miss after live rows reads null (never a throw).
test("fetchListRow matches the id fallback and reads a miss as null", async () => {
  const fakes = mountEstateFakes({
    listRows: [
      { run_id: "run-7", draft_id: DRAFT, created_at: 3, artifacts: [] },
      { id: "run-8", draft_id: DRAFT, created_at: 4, artifacts: [] },
    ],
  });
  try {
    await expect(fetchListRow("run-7")).resolves.toMatchObject({ run_id: "run-7" });
    await expect(fetchListRow("run-8")).resolves.toMatchObject({ id: "run-8" });
    await expect(fetchListRow("run-9")).resolves.toBeNull();
  } finally {
    fakes.unmount();
  }
});

// THE FILE-ERA DEAD-LIST ARM (fetchRunStageUrl): the list read dies
// on transport — settle null (the answer may land next poll).
test("fetchRunStageUrl file-era arm: a dead list read settles null", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    throws: [{ method: "runs/list", message: "wire blip" }],
  });
  try {
    await expect(fetchRunStageUrl("run-7", "s_0")).resolves.toBeNull();
  } finally {
    fakes.unmount();
  }
});

// THE SINGLE-STAGE BOUNDARY (fetchRunStageUrl): no match on a
// multi-stage run is null — the fallback never reaches past one stage.
test("fetchRunStageUrl with no matching stage on a multi-stage run is null", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{
      run_id: "run-1", status: "running", draft_id: DRAFT,
      stages: [{ id: "a", url: "" }, { id: "b", url: "" }],
    }],
  });
  try {
    await expect(fetchRunStageUrl("run-1", "s_9")).resolves.toBeNull();
  } finally {
    fakes.unmount();
  }
});

// THE GONE-VERDICT DEAD-LIST ARM (probeRunGone): the list read dies
// on transport — settle gone (nothing answered).
test("probeRunGone: a dead list read settles gone", async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: "runs/status", message: "no such run" }],
    throws: [{ method: "runs/list", message: "wire blip" }],
  });
  try {
    await expect(probeRunGone("run-9")).resolves.toBe("gone");
  } finally {
    fakes.unmount();
  }
});

// THE FOREIGN-THROW LAW (startRun): a non-Error throw lands as the
// fallback refusal (never the value past the gesture).
test("startCardRun converts a foreign throw to the fallback refusal", async () => {
  const fakes = mountEstateFakes({ throws: [{ method: "runs/start", value: "kablam" }] });
  try {
    await expect(startCardRun({ model: "anima", params: {}, draftId: DRAFT }))
      .resolves.toEqual({ refused: "run request failed" });
  } finally {
    fakes.unmount();
  }
});

// THE STATUS-TRANSPORT ARM (pollRunStageUrl): the status read dies
// on transport — the poll stays alive on the unknown row and the
// answer lands next cadence (transport never settles the poll).
test("pollRunStageUrl survives a transport-blip status read — the answer lands next cadence", async () => {
  const fakes = mountEstateFakes({
    throws: [{ method: "runs/status", message: "wire blip" }],
    runDocs: [
      { run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] },
      { run_id: "run-1", status: "completed", draft_id: DRAFT, stages: [{ id: "s_0", url: "mesh.glb" }] },
    ],
  });
  try {
    const seen: string[] = [];
    await pollRunStageUrl("run-1", "s_0", { onUrl: (u) => { seen.push(u); }, intervalMs: 1 });
    expect(seen).toEqual(["/melite-media/runs/run-1/mesh.glb"]);
  } finally {
    fakes.unmount();
  }
});

// THE DEFAULT CADENCE (pollRunStageUrl): no intervalMs rides the
// 1500ms cadence — an abort still settles promptly (never the full wait).
test("pollRunStageUrl without knobs rides the default cadence and still settles on abort", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{ run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] }],
  });
  try {
    const ctrl = new AbortController();
    let fired = 0;
    const polled = pollRunStageUrl("run-1", "s_0", { onUrl: () => { fired += 1; } }, ctrl.signal);
    ctrl.abort();
    await polled;
    expect(fired).toBe(0);
  } finally {
    fakes.unmount();
  }
});
// THE MID-FLIGHT ABORT (pollRunStageUrl): the abort lands while the
// status read is in flight — the sleep opens already-aborted and
// settles 'abort' instead of waiting out the cadence.
test("pollRunStageUrl settles on an abort that lands mid-flight — no fire, no hang", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{ run_id: "run-1", status: "running", draft_id: DRAFT, stages: [{ id: "s_0", url: "" }] }],
  });
  try {
    const ctrl = new AbortController();
    let fired = 0;
    const polled = pollRunStageUrl("run-1", "s_0", { onUrl: () => { fired += 1; }, intervalMs: 5 }, ctrl.signal);
    ctrl.abort();
    await polled;
    expect(fired).toBe(0);
  } finally {
    fakes.unmount();
  }
});

// THE REFUSING-LIST ARM (pollRunStageUrl): the list refuses — no such
// row, nothing will ever land — settle silent.
test("pollRunStageUrl file-era arm: a refusing list settles silent", async () => {
  const fakes = mountEstateFakes({
    refusals: [
      { method: "runs/status", message: "no such run" },
      { method: "runs/list", message: "no such row" },
    ],
  });
  try {
    let fired = 0;
    await pollRunStageUrl("run-9", "s_0", { onUrl: () => { fired += 1; }, intervalMs: 1 });
    expect(fired).toBe(0);
  } finally {
    fakes.unmount();
  }
});

// THE POLL SINGLE-STAGE FALLBACK (pollRunStageUrl): a one-stage run's
// only stage IS the asked stage — it fires under any label.
test("pollRunStageUrl single-stage fallback: the only stage fires under any label", async () => {
  const fakes = mountEstateFakes({
    runDocs: [{
      run_id: "run-1", status: "running", draft_id: DRAFT,
      stages: [{ id: "img-to-mesh", url: "mesh.glb" }],
    }],
  });
  try {
    const seen: string[] = [];
    await pollRunStageUrl("run-1", "s_1", { onUrl: (u) => { seen.push(u); }, intervalMs: 1 });
    expect(seen).toEqual(["/melite-media/runs/run-1/mesh.glb"]);
  } finally {
    fakes.unmount();
  }
});
