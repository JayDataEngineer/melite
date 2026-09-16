// cards-resource-open.spec.ts — openCardsResource's address views
// (2026-09-16 burn-down): the not-ours refusal, the unmounted bench
// face (snapshot + honest stream-unavailable voice, missing-bench
// zero state, hard refusal), the draft snapshot + refusal, and the
// run view (refusal, terminal hydrate, live poll to terminal, poll
// transport recovery, mid-poll abort).
//
// NOTE (exemption, same-tick proof): pollRunFrames' sleepExecutor's
// `if (signal.aborted)` true arm (cards-resource.ts:952) is
// unreachable — sleep is invoked synchronously in the loop body's
// tick right after the `!signal.aborted` guard, so the flag cannot
// differ between guard and entry; an aborted signal skips the loop
// and never enters sleep.
import { afterEach, describe, expect, test, vi } from "vitest";
import { openCardsResource } from "../src/client/cards-resource.ts";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Answer { refuse?: string; value?: unknown; boom?: unknown }

function stubWire(route: (method: string, args: Record<string, unknown>) => Answer): void {
  vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
    const frame = JSON.parse(String(init?.body)) as {
      rpcId: string; method: string; payload: { args: Record<string, unknown> };
    };
    const answer = route(frame.method, frame.payload.args);
    if (answer.boom !== undefined) throw answer.boom;
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } };
    return new Response(JSON.stringify({ type: "server-response", rpcId: frame.rpcId, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  });
}

function ctx(): { signal: AbortSignal } {
  return { signal: new AbortController().signal };
}

async function collect(
  address: string,
  c: { signal: AbortSignal },
  cap = 8,
): Promise<Array<RemoteResult<never>>> {
  const frames: Array<RemoteResult<never>> = [];
  for await (const frame of openCardsResource(address, c, undefined, undefined)) {
    frames.push(frame as RemoteResult<never>);
    if (frames.length >= cap) break;
  }
  return frames;
}

function failureText(frame: RemoteResult<never>): string {
  expect(frame.ok).toBe(false);
  if (frame.ok === false) return String((frame.error as Error)?.message ?? frame.error);
  return "<ok>";
}

describe("the not-ours refusal — failures are frames, never throws", () => {
  test("a foreign address yields one failure frame", async () => {
    stubWire(() => ({ value: {} }));
    const frames = await collect("dsh-resource://flows/bench", ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("not a cards address");
  });
});

describe("the unmounted bench face — one snapshot, then the honest voice", () => {
  const BENCH = "dsh-resource://cards/bench";

  test("a served bench snapshots, then the stream-unavailable voice", async () => {
    stubWire((method) => method === "bench/get"
      ? { value: { draft_id: "bench-main", rev: 4, stages: [{ id: "s_0" }], log: [] } }
      : { value: {} });
    const frames = await collect(BENCH, ctx());
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({ ok: true, value: { rev: 4 } });
    expect(failureText(frames[1]!)).toContain("bench stream unavailable");
  });

  test("a not-yet-born bench snapshots empty (the zero state, not a failure)", async () => {
    stubWire((method) => method === "bench/get" ? { refuse: "no such bench" } : { value: {} });
    const frames = await collect(BENCH, ctx());
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({ ok: true, value: { rev: 0, stages: [] } });
    expect(failureText(frames[1]!)).toContain("bench stream unavailable");
  });

  test("a hard bench refusal yields only the failure (the door's own text)", async () => {
    stubWire((method) => method === "bench/get" ? { refuse: "admission: nope" } : { value: {} });
    const frames = await collect(BENCH, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("admission: nope");
  });

  test("a foreign bench throw voices verbatim (never a blank frame)", async () => {
    stubWire((method) => method === "bench/get" ? { boom: "kablam" } : { value: {} });
    const frames = await collect(BENCH, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("kablam");
  });

  test("a mounted remote without the bench namespace names the missing seat", async () => {
    stubWire(() => ({ value: {} }));
    const frames: Array<unknown> = [];
    for await (const frame of openCardsResource(BENCH, ctx(), {} as never, undefined)) {
      frames.push(frame);
    }
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0] as never)).toContain("bench namespace did not mount");
  });
});

describe("the draft view — one snapshot per open", () => {
  const ADDR = "dsh-resource://cards/draft/draft-1/s_0";

  test("a served draft snapshots the draft value", async () => {
    stubWire((method) => method === "drafts/get"
      ? { value: { intent: "the film", bench: { rev: 3, log: [] }, stages: [{ id: "s_0" }] } }
      : { value: {} });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      ok: true,
      value: { kind: "draft", draftId: "draft-1", stageId: "s_0", intent: "the film", rev: 3 },
    });
  });

  test("an unreadable draft yields the failure (the door's own text)", async () => {
    stubWire((method) => method === "drafts/get" ? { refuse: "no_such_draft" } : { value: {} });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("no_such_draft");
  });

  test("a foreign draft throw voices verbatim (never a blank frame)", async () => {
    stubWire((method) => method === "drafts/get" ? { boom: "kablam" } : { value: {} });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("kablam");
  });
});

describe("the run view — hydrate, then poll to terminal", () => {
  const ADDR = "dsh-resource://cards/run/run-1";

  test("a refused hydrate yields the failure", async () => {
    stubWire((method) => method === "runs/status" ? { refuse: "no such run" } : { value: {} });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("no such run");
  });

  test("a foreign hydrate throw voices verbatim (never a blank frame)", async () => {
    stubWire((method) => method === "runs/status" ? { boom: "kablam" } : { value: {} });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0]!)).toContain("kablam");
  });

  test("a terminal hydrate yields once and never polls", async () => {
    let statuses = 0;
    stubWire((method) => {
      if (method === "runs/status") {
        statuses++;
        return { value: { run_id: "run-1", status: "completed", stages: [] } };
      }
      return { value: {} };
    });
    const frames = await collect(ADDR, ctx());
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ ok: true, value: { kind: "run", status: "completed" } });
    expect(statuses).toBe(1);
  });

  test("a pre-aborted holder takes the hydrate and ends (never a poll)", async () => {
    let statuses = 0;
    stubWire((method) => {
      if (method === "runs/status") {
        statuses++;
        return { value: { run_id: "run-1", status: "running", stages: [] } };
      }
      return { value: {} };
    });
    const ctrl = new AbortController();
    ctrl.abort();
    const frames = await collect(ADDR, { signal: ctrl.signal });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
    expect(statuses).toBe(1);
  });

  test("a live run polls: silence on same-doc, a frame on movement, end at terminal", async () => {
    let polls = 0;
    stubWire((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls <= 2) return { value: { run_id: "run-1", status: "running", stages: [] } };
        return { value: { run_id: "run-1", status: "completed", stages: [{ id: "s_0", status: "succeeded" }] } };
      }
      return { value: {} };
    });
    const frames = await collect(ADDR, ctx());
    expect(polls).toBe(3);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
    expect(frames[1]).toMatchObject({ ok: true, value: { status: "completed" } });
  });

  test("a poll blip keeps the last ok value and recovers", async () => {
    let polls = 0;
    stubWire((method) => {
      if (method === "runs/status") {
        polls++;
        if (polls === 1) return { value: { run_id: "run-1", status: "running", stages: [] } };
        if (polls === 2) return { boom: new Error("blip") };
        return { value: { run_id: "run-1", status: "failed", error: "gpu gone", stages: [] } };
      }
      return { value: {} };
    });
    const frames = await collect(ADDR, ctx());
    expect(polls).toBe(3);
    expect(frames).toHaveLength(2);
    expect(frames[1]).toMatchObject({ ok: true, value: { status: "failed" } });
  });

  test("an abort mid-poll ends the tail (the hydrate stays the last frame)", async () => {
    stubWire((method) => method === "runs/status"
      ? { value: { run_id: "run-1", status: "running", stages: [] } }
      : { value: {} });
    const ctrl = new AbortController();
    const frames: Array<RemoteResult<never>> = [];
    const consuming = (async () => {
      for await (const frame of openCardsResource(ADDR, { signal: ctrl.signal }, undefined, undefined)) {
        frames.push(frame as RemoteResult<never>);
      }
    })();
    await new Promise((r) => setTimeout(r, 200));
    ctrl.abort();
    await consuming;
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
  });
});
