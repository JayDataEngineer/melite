// cards-resource-open.spec.ts — openCardsResource's address views
// (2026-09-16 burn-down): the not-ours refusal, the unmounted bench
// face (snapshot + honest stream-unavailable voice, missing-bench
// zero state, hard refusal), the draft snapshot + refusal, and the
// run view (refusal, terminal hydrate, live poll to terminal, poll
// transport recovery, mid-poll abort).
//
// THE ONE-LANE LAW (stroke 81): the views ride the mounted
// namespaces through mountEstateFakes — no fetch stub answers an
// estate verb. Refusals queue in `refusals` (the door's own text on
// the error branch); transport deaths queue in `throws` (the promise
// itself rejects); poll scripts ride `runDocs` (served in order, the
// last lingering for poll loops).
//
// NOTE (exemption, same-tick proof): pollRunFrames' sleepExecutor's
// `if (signal.aborted)` true arm (cards-resource.ts:952) is
// unreachable — sleep is invoked synchronously in the loop body's
// tick right after the `!signal.aborted` guard, so the flag cannot
// differ between guard and entry; an aborted signal skips the loop
// and never enters sleep.
import { afterEach, describe, expect, test, vi } from "vitest";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import type { EstateFakesOptions } from "./estate-harness.ts";
import { openCardsResource } from "../src/client/cards-resource.ts";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

/** Mount the live-lane fakes for one view test (unmounted by the caller). */
function stubWire(opts: EstateFakesOptions = {}): ReturnType<typeof mountEstateFakes> {
  return mountEstateFakes(opts);
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
    const fakes = stubWire();
    try {
      const frames = await collect("dsh-resource://flows/bench", ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("not a cards address");
    } finally {
      fakes.unmount();
    }
  });
});

describe("the unmounted bench face — one snapshot, then the honest voice", () => {
  const BENCH = "dsh-resource://cards/bench";

  test("a served bench snapshots, then the stream-unavailable voice", async () => {
    const fakes = stubWire({
      benchDoc: { draft_id: "bench-main", rev: 4, stages: [{ id: "s_0" }], log: [] },
    });
    try {
      const frames = await collect(BENCH, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { rev: 4 } });
      expect(failureText(frames[1]!)).toContain("bench stream unavailable");
    } finally {
      fakes.unmount();
    }
  });

  test("a not-yet-born bench snapshots empty (the zero state, not a failure)", async () => {
    const fakes = stubWire({
      refusals: [{ method: "bench/get", message: "no such bench" }],
    });
    try {
      const frames = await collect(BENCH, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { rev: 0, stages: [] } });
      expect(failureText(frames[1]!)).toContain("bench stream unavailable");
    } finally {
      fakes.unmount();
    }
  });

  test("a hard bench refusal yields only the failure (the door's own text)", async () => {
    const fakes = stubWire({
      refusals: [{ method: "bench/get", message: "admission: nope" }],
    });
    try {
      const frames = await collect(BENCH, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("admission: nope");
    } finally {
      fakes.unmount();
    }
  });

  test("a transport bench throw voices verbatim (never a blank frame)", async () => {
    const fakes = stubWire({
      throws: [{ method: "bench/get", value: "kablam" }],
    });
    try {
      const frames = await collect(BENCH, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("kablam");
    } finally {
      fakes.unmount();
    }
  });

  test("a mounted remote without the bench namespace names the missing seat", async () => {
    // no wire at all — the injected remote face answers directly.
    const frames: Array<unknown> = [];
    for await (const frame of openCardsResource(BENCH, ctx(), {} as never, undefined)) {
      frames.push(frame);
    }
    expect(frames).toHaveLength(1);
    expect(failureText(frames[0] as never)).toContain("bench namespace did not mount");
  });
});

describe("the draft view — a snapshot that TAILS (HOLE 1, 2026-10-11)", () => {
  const ADDR = "dsh-resource://cards/draft/draft-1/s_0";

  /** Drive the stream, aborting after `want` frames (the tail never
   *  ends on its own — a still-open tab is a still-polling tab). */
  async function collectTail(
    fakes: ReturnType<typeof mountEstateFakes>,
    want: number,
    run: () => Promise<void>,
  ): Promise<Array<RemoteResult<never>>> {
    const frames: Array<RemoteResult<never>> = [];
    const controller = new AbortController();
    const driving = (async (): Promise<void> => {
      for await (const frame of openCardsResource(ADDR, { signal: controller.signal }, undefined, undefined)) {
        frames.push(frame as RemoteResult<never>);
        if (frames.length >= want) controller.abort();
      }
    })();
    await run();
    // wake the parked tail: under fake timers an abort mid-sleep
    // leaves the pending interval unadvanced — advance one interval
    // so the loop sees the flag and ends (a real timer fires alone)
    controller.abort();
    await vi.advanceTimersByTimeAsync(1600);
    await driving;
    void fakes;
    return frames;
  }

  test("a served draft snapshots, and a foreign-landed generation yields a FRESH frame", async () => {
    vi.useFakeTimers();
    const fakes = stubWire({
      draftStages: [{ id: "s_0" }],
      draftBenchRev: 3,
      draftIntent: "the film",
    });
    try {
      let frames: Array<RemoteResult<never>> = [];
      frames = await collectTail(fakes, 2, async () => {
        await vi.advanceTimersByTimeAsync(0); // the snapshot frame
        // the agent (or a sibling tab) lands a generation on the
        // shared draft — the rev moves, a stage's bytes move
        fakes.setDraftDoc({ rev: 4, stages: [{ id: "s_0", runStatus: "completed" }] });
        await vi.advanceTimersByTimeAsync(1500); // one poll interval
      });
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({
        ok: true,
        value: { kind: "draft", draftId: "draft-1", stageId: "s_0", intent: "the film" },
      });
      // the fresh frame carries the foreign-landed generation's
      // bytes (the value's OWN rev rides the bench block — the doc
      // rev feeds the change gate, not the rendered value)
      expect(frames[1]).toMatchObject({
        ok: true,
        value: { stages: [{ id: "s_0", runStatus: "completed" }] },
      });
    } finally {
      vi.useRealTimers();
      fakes.unmount();
    }
  });

  test("an unchanged doc yields NOTHING — three poll intervals, still one frame", async () => {
    vi.useFakeTimers();
    const fakes = stubWire({ draftStages: [{ id: "s_0" }] });
    try {
      const frames = await collectTail(fakes, 2, async () => {
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(4500); // three full intervals
      });
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { kind: "draft" } });
    } finally {
      vi.useRealTimers();
      fakes.unmount();
    }
  });

  test("a transient mid-tail read failure keeps the last frame standing (no failure frame)", async () => {
    vi.useFakeTimers();
    const fakes = stubWire({
      draftStages: [{ id: "s_0" }],
      // the SECOND get (the first poll after the snapshot) dies in
      // transport — the estate hiccup the tail must ride out
      throws: [{ method: "drafts/get", value: "wire flapped", onCall: 2 }],
    });
    try {
      const frames = await collectTail(fakes, 2, async () => {
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(1500); // the dying poll
        await vi.advanceTimersByTimeAsync(1500); // a healthy one after
      });
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { kind: "draft" } });
    } finally {
      vi.useRealTimers();
      fakes.unmount();
    }
  });

  test("an unreadable draft yields the failure (the door's own text)", async () => {
    const fakes = stubWire({
      refusals: [{ method: "drafts/get", message: "no_such_draft" }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("no_such_draft");
    } finally {
      fakes.unmount();
    }
  });

  test("a transport draft throw voices verbatim (never a blank frame)", async () => {
    const fakes = stubWire({
      throws: [{ method: "drafts/get", value: "kablam" }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("kablam");
    } finally {
      fakes.unmount();
    }
  });
});

describe("the run view — hydrate, then poll to terminal", () => {
  const ADDR = "dsh-resource://cards/run/run-1";

  test("a refused hydrate yields the failure", async () => {
    const fakes = stubWire({
      refusals: [{ method: "runs/status", message: "no such run" }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("no such run");
    } finally {
      fakes.unmount();
    }
  });

  test("a transport hydrate throw voices verbatim (never a blank frame)", async () => {
    const fakes = stubWire({
      throws: [{ method: "runs/status", value: "kablam" }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(failureText(frames[0]!)).toContain("kablam");
    } finally {
      fakes.unmount();
    }
  });

  test("a terminal hydrate yields once and never polls", async () => {
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "completed", stages: [] }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { kind: "run", status: "completed" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("a pre-aborted holder takes the hydrate and ends (never a poll)", async () => {
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
    });
    try {
      const ctrl = new AbortController();
      ctrl.abort();
      const frames = await collect(ADDR, { signal: ctrl.signal });
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("a live run polls: silence on same-doc, a frame on movement, end at terminal", async () => {
    const fakes = stubWire({
      runDocs: [
        { run_id: "run-1", status: "running", stages: [] },
        { run_id: "run-1", status: "running", stages: [] },
        { run_id: "run-1", status: "completed", stages: [{ id: "s_0", status: "succeeded" }] },
      ],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(3);
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]).toMatchObject({ ok: true, value: { status: "completed" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a poll blip keeps the last ok value and recovers", async () => {
    const fakes = stubWire({
      runDocs: [
        { run_id: "run-1", status: "running", stages: [] },
        { run_id: "run-1", status: "failed" as const, error: "gpu gone", stages: [] },
      ],
      // the blip lands mid-poll (the 2nd status call): the hydrate
      // ok'd, the blip is swallowed with the last ok value staying,
      // the next poll recovers to terminal.
      throws: [{ method: "runs/status", message: "blip", onCall: 2 }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(3);
      expect(frames).toHaveLength(2);
      expect(frames[1]).toMatchObject({ ok: true, value: { status: "failed" } });
    } finally {
      fakes.unmount();
    }
  });

  test("an out-of-vocabulary poll doc yields the named failure and ends (never a buried terminal)", async () => {
    // strictness fix 3's poll arm: readRunStatus throws on a status
    // outside RUN_STATUS_WORDS — the old ':unknown' default handed
    // the garbage to the fold, which buried it as a terminal. The
    // guard surfaces the door's own text against the ADDRESS and
    // stops the tail (the hydrate stays the last ok frame).
    const fakes = stubWire({
      runDocs: [
        { run_id: "run-1", status: "running", stages: [] },
        { run_id: "run-1", status: "banana", stages: [] },
        { run_id: "run-1", status: "completed", stages: [] },
      ],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]!.ok).toBe(false);
      expect(failureText(frames[1]!)).toMatch(/outside the vocabulary/);
      // the third doc never serves: the tail returned at the failure
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(2);
    } finally {
      fakes.unmount();
    }
  });

  test("an abort mid-poll ends the tail (the hydrate stays the last frame)", async () => {
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
    });
    try {
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
    } finally {
      fakes.unmount();
    }
  });
});
