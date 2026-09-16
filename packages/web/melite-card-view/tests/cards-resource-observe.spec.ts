// cards-resource-observe.spec.ts — observeRunOutcome's poll law and
// reconcileBenchRuns' attribution (2026-09-16 burn-down). fetch is
// stubbed whole per test: runs/status answers the poll script,
// runs/list answers the file-era fallback, drafts/get + drafts/patch
// serve the outcome writes (the CAS rev rides). Refusals are ok:false
// (WireRefusedError — the phantom path); throws are transport.
//
// NOTE (deleted arm, type-level proof — was the trailing `return
// null`): observeRunOutcome's settle path is entered only when
// isTerminalRun(row.status), whose set is exactly {completed,
// failed, stopped}, and the terminal mapping sends those to
// {done, failed, stopped}, so the disjunction above the return is
// exhaustive — the null arm could never fire and is gone (the `as`
// narrows what the compiler cannot see).
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  observeRunOutcome,
  reconcileBenchRuns,
} from "../src/client/cards-resource.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Answer { refuse?: string; value?: unknown; boom?: unknown }

function stubEstate(route: (method: string, args: Record<string, unknown>, call: number) => Answer): {
  patches: Array<Record<string, unknown>>
  touches: () => number
} {
  const patches: Array<Record<string, unknown>> = [];
  let touched = 0;
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
    const frame = JSON.parse(String(init?.body)) as {
      rpcId: string; method: string; payload: { args: Record<string, unknown> };
    };
    calls++;
    const answer = route(frame.method, frame.payload.args, calls);
    if (answer.boom !== undefined) throw answer.boom;
    if (frame.method === "drafts/patch") patches.push(frame.payload.args);
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } };
    return new Response(JSON.stringify({ type: "server-response", rpcId: frame.rpcId, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  });
  return { patches, touches: () => touched };
}

const DRAFT_DOC = {
  draft_id: "d_1", intent: "the film", bench: { rev: 9, log: [] },
  stages: [{ id: "s_0", card: "image-gen", params: {} }],
};

/** The estate baseline: drafts/* serve the outcome writes. */
function withDrafts(route: (method: string, args: Record<string, unknown>, call: number) => Answer) {
  return stubEstate((method, args, call) => {
    if (method === "drafts/get") return { value: DRAFT_DOC };
    if (method === "drafts/patch") return { value: { delivered: true } };
    return route(method, args, call);
  });
}

const RUNNING = { run_id: "r_1", status: "running", stages: [] };

describe("observeRunOutcome — the start read binds the row first", () => {
  test("a queued start shows queued (never a lie about running)", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { value: { ...RUNNING, status: "queued" } };
      return { value: {} };
    });
    // the second poll is terminal — the watch ends on it
    const ctrl = new AbortController();
    const done = observeRunOutcome("d_1", "s_0", "r_1", ctrl.signal, () => {});
    // NOTE: this script answers queued forever — abort to end the watch.
    await new Promise((r) => setTimeout(r, 100));
    ctrl.abort();
    await expect(done).resolves.toBeNull();
    expect(patches[0]).toMatchObject({
      draftId: "d_1", stageId: "s_0",
      patch: { runStatus: "queued", result: { run_id: "r_1" } },
    });
  });

  test("a running start through terminal done returns done", async () => {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        return polls === 1
          ? { value: RUNNING }
          : { value: { run_id: "r_1", status: "completed", stages: [] } };
      }
      return { value: {} };
    });
    let touched = 0;
    await expect(observeRunOutcome("d_1", "s_0", "r_1", undefined, () => { touched++; }))
      .resolves.toBe("done");
    expect(polls).toBe(2);
    expect(patches).toHaveLength(2);
    expect(patches[0]).toMatchObject({ patch: { runStatus: "running", result: { run_id: "r_1" } } });
    expect(patches[1]).toMatchObject({ patch: { runStatus: "done", result: { run_id: "r_1" } } });
    expect(touched).toBe(2);
  });

  test("a dead start read still binds running (transport is not a verdict)", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { boom: new Error("door down") };
      return { value: {} };
    });
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(observeRunOutcome("d_1", "s_0", "r_1", ctrl.signal)).resolves.toBeNull();
    expect(patches[0]).toMatchObject({ patch: { runStatus: "running" } });
  });
});

describe("observeRunOutcome — THE PHANTOM CURE (refused status, file-era verdict)", () => {
  function phantom(listValue: unknown) {
    return withDrafts((method) => {
      if (method === "runs/status") return { refuse: "no such run" };
      if (method === "runs/list") return { value: listValue };
      return { value: {} };
    });
  }

  test("absent from both maps: gone → stopped", async () => {
    const { patches } = phantom({ runs: [] });
    let touched = 0;
    await expect(observeRunOutcome("d_1", "s_0", "r_1", undefined, () => { touched++; }))
      .resolves.toBe("stopped");
    // [0] is the start binding (a refused start still binds running);
    // [1] is the phantom verdict.
    expect(patches[0]).toMatchObject({ patch: { runStatus: "running" } });
    expect(patches[1]).toMatchObject({ patch: { runStatus: "stopped", result: { run_id: "r_1" } } });
    expect(touched).toBe(2);
  });

  test("the list's completed answer: done", async () => {
    const { patches } = phantom({ runs: [{ run_id: "r_1", status: "completed" }] });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("done");
    expect(patches[1]).toMatchObject({ patch: { runStatus: "done" } });
  });

  test("a live verdict from the list keeps watching (returns null, never a fake terminal)", async () => {
    const { patches } = phantom({ runs: [{ run_id: "r_1", status: "running" }] });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBeNull();
    expect(patches[1]).toMatchObject({ patch: { runStatus: "running" } });
  });

  test("a foreign list verdict rides verbatim (the phantom map's word is law)", async () => {
    const { patches } = phantom({ runs: [{ run_id: "r_1", status: "failed" }] });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("failed");
    expect(patches[1]).toMatchObject({ patch: { runStatus: "failed", result: { run_id: "r_1" } } });
  });
});

describe("observeRunOutcome — the live fold (progress rides the row)", () => {
  test("percent + activity patch only when they move (no CAS churn)", async () => {
    let polls = 0;
    const stage = (extra: Record<string, unknown> = {}) => ({
      id: "other", status: "running", url: "",
      ...extra,
    });
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls === 1) return { value: RUNNING };
        // single-stage fallback: the id never matches, the one stage answers
        if (polls === 2) return { value: { run_id: "r_1", status: "running", stages: [stage({ activity: "sampling" })] } };
        if (polls === 3) return { value: { run_id: "r_1", status: "running", stages: [stage({ activity: "sampling" })] } };
        return { value: { run_id: "r_1", status: "completed", stages: [stage()] } };
      }
      return { value: {} };
    });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("done");
    // start + activity-only + terminal (the repeat poll patches NOTHING)
    expect(patches.map((p) => p["patch"])).toEqual([
      { runStatus: "running", result: { run_id: "r_1" } },
      { runStatus: "running", result: { run_id: "r_1", activity: "sampling" } },
      { runStatus: "done", result: { run_id: "r_1" } },
    ]);
  });

  test("integer percent rides with the progress body", async () => {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls === 1) return { value: RUNNING };
        if (polls === 2) return {
          value: { run_id: "r_1", status: "running", stages: [
            { id: "s_0", progress: { value: 1, max: 4 }, activity: "" },
          ] },
        };
        return { value: { run_id: "r_1", status: "completed", stages: [] } };
      }
      return { value: {} };
    });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("done");
    expect(patches[1]).toMatchObject({
      patch: { runStatus: "running", result: { run_id: "r_1", progress: { value: 1, max: 4 } } },
    });
  });

  test("a resultless live flip patches bare (never a padded result)", async () => {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls === 1) return { value: RUNNING };
        // queued with progress-less, activity-less rows: the move
        // patches, but the result stays off
        if (polls === 2) return { value: { run_id: "r_1", status: "queued", stages: [{ id: "s_0" }] } };
        return { value: { run_id: "r_1", status: "completed", stages: [] } };
      }
      return { value: {} };
    });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("done");
    expect(patches.map((p) => p["patch"])).toEqual([
      { runStatus: "running", result: { run_id: "r_1" } },
      { runStatus: "queued" },
      { runStatus: "done", result: { run_id: "r_1" } },
    ]);
  });
    let polls = 0;
  test("a transport blip mid-poll sleeps and recovers (the last ok value stays)", async () => {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls === 1) return { value: RUNNING };
        if (polls === 2) return { boom: new Error("blip") };
        return { value: { run_id: "r_1", status: "completed", stages: [] } };
      }
      return { value: {} };
    });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("done");
    expect(polls).toBe(3);
    expect(patches).toHaveLength(2);
  });
});

describe("observeRunOutcome — the terminal carry", () => {
  async function terminal(status: string, doc: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        return polls === 1 ? { value: RUNNING } : { value: { run_id: "r_1", status, ...doc } };
      }
      return { value: {} };
    });
    return observeRunOutcome("d_1", "s_0", "r_1").then(() => patches.map((p) => p["patch"] as Record<string, unknown>));
  }

  test("the stage's own error rides a failed run", async () => {
    const patches = await terminal("failed", { stages: [{ id: "s_0", error: "node 3 blew up" }] });
    expect(patches[1]).toMatchObject({
      runStatus: "failed", result: { run_id: "r_1", error: "node 3 blew up" },
    });
  });

  test("the run-level text is the fallback reason", async () => {
    const patches = await terminal("failed", { error: "gpu gone", stages: [] });
    expect(patches[1]).toMatchObject({
      runStatus: "failed", result: { run_id: "r_1", error: "gpu gone" },
    });
  });

  test("no reason anywhere carries no error key (never an empty lie)", async () => {
    const patches = await terminal("failed", { stages: [] });
    expect(patches[1]).toEqual({ runStatus: "failed", result: { run_id: "r_1" } });
  });

  test("gallery names rewrite onto the media route (empties filter out)", async () => {
    const patches = await terminal("completed", {
      stages: [{ id: "s_0", status: "succeeded", url: "out/flat.mp4", gallery: [{ name: "" }, { name: "a.png" }] }],
    });
    expect(patches[1]).toEqual({
      runStatus: "done",
      result: {
        run_id: "r_1",
        url: "/melite-media/runs/r_1/out/flat.mp4",
        artifacts: {
          video: "/melite-media/runs/r_1/out/flat.mp4",
          "a.png": "/melite-media/runs/r_1/a.png",
        },
        assetUrls: ["/melite-media/runs/r_1/out/flat.mp4", "/melite-media/runs/r_1/a.png"],
      },
    });
  });

  test("a bare stage url carries no video key (never an empty artifact)", async () => {
    const patches = await terminal("completed", {
      stages: [{ id: "s_0", status: "succeeded", url: "", gallery: [{ name: "a.png" }] }],
    });
    expect(patches[1]).toEqual({
      runStatus: "done",
      result: {
        run_id: "r_1",
        artifacts: { "a.png": "/melite-media/runs/r_1/a.png" },
        assetUrls: ["/melite-media/runs/r_1/a.png"],
      },
    });
  });

  test("stopped returns stopped", async () => {
    let polls = 0;
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") {
        polls++;
        return polls === 1 ? { value: RUNNING } : { value: { run_id: "r_1", status: "stopped", stages: [] } };
      }
      return { value: {} };
    });
    await expect(observeRunOutcome("d_1", "s_0", "r_1")).resolves.toBe("stopped");
    expect(patches[1]).toMatchObject({ patch: { runStatus: "stopped" } });
  });
});

describe("reconcileBenchRuns — the attribution half", () => {
  const bench = (stages: Array<Record<string, unknown>>) => ({
    kind: "bench" as const, draftId: "d_1", rev: 1, stages, log: [],
  });

  test("idle rows and runless rows are skipped silently", async () => {
    const { patches } = withDrafts(() => ({ value: {} }));
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "done", result: { run_id: "r_1" } },
      { id: "s_1", runStatus: "running" },
      { id: "s_2", runStatus: "running", result: null },
    ]));
    expect(patches).toEqual([]);
  });

  test("an already-armed key is skipped (the set is the caller's)", async () => {
    const { patches } = withDrafts(() => ({ value: {} }));
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
    ]), { armed: new Set(["s_0:r_1"]) });
    expect(patches).toEqual([]);
  });

  test("a transport verdict disarms (a later refresh retries)", async () => {
    const armed = new Set<string>();
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { boom: new Error("blip") };
      return { value: {} };
    });
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
    ]), { armed });
    expect(armed.has("s_0:r_1")).toBe(false);
    expect(patches).toEqual([]);
  });

  test("a live row arms an observer (the start binds running first)", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { value: RUNNING };
      return { value: {} };
    });
    const ctrl = new AbortController();
    ctrl.abort();
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
    ]), { signal: ctrl.signal });
    // the observer floats (void) — flush it before reading the writes
    await new Promise((r) => setTimeout(r, 100));
    expect(patches[0]).toMatchObject({ patch: { runStatus: "running" } });
  });

  test("a gone row flips stopped", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { refuse: "no such run" };
      if (method === "runs/list") return { value: { runs: [] } };
      return { value: {} };
    });
    let touched = 0;
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "queued", result: { run_id: "r_1" } },
    ]), { onTouched: () => { touched++; } });
    expect(patches[0]).toMatchObject({ patch: { runStatus: "stopped" } });
    expect(touched).toBe(1);
  });

  test("a listed completed row flips done", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { refuse: "no such run" };
      if (method === "runs/list") return { value: { runs: [{ run_id: "r_1", status: "completed" }] } };
      return { value: {} };
    });
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
    ]));
    expect(patches[0]).toMatchObject({ patch: { runStatus: "done" } });
  });

  test("a listed foreign verdict rides verbatim (never paraphrased)", async () => {
    const { patches } = withDrafts((method) => {
      if (method === "runs/status") return { refuse: "no such run" };
      if (method === "runs/list") return { value: { runs: [{ run_id: "r_1", status: "failed" }] } };
      return { value: {} };
    });
    await reconcileBenchRuns(bench([
      { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
    ]));
    expect(patches[0]).toMatchObject({ patch: { runStatus: "failed" } });
  });
});
