// cards-resource-open.spec.ts — openCardsResource's address views
// (2026-09-16 burn-down): the not-ours refusal, the unmounted bench
// face (snapshot + honest stream-unavailable voice, missing-bench
// zero state, hard refusal), the draft snapshot + refusal, and the
// run view over runs/subscribe (refused hydrate, terminal hydrate,
// the unmounted face, live stream to terminal, carrier-loss recovery,
// mid-stream abort — the poll retired 2026-10-12, audits row 1.8).
//
// THE ONE-LANE LAW (stroke 81): the views ride the mounted
// namespaces through mountEstateFakes — no fetch stub answers an
// estate verb. Refusals queue in `refusals` (the door's own text on
// the error branch); transport deaths queue in `throws` (the promise
// itself rejects); poll scripts ride `runDocs` (served in order, the
// last lingering for poll loops).
//
import { afterEach, describe, expect, test, vi } from "vitest";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import type { EstateFakesOptions } from "./estate-harness.ts";
import { openCardsResource } from "../src/client/cards-resource.ts";
import type { RemoteResult, RemoteStreamHandle } from "@deepseek-ai/dsh-typert-protocol";
import { RemoteStreamCarrierError } from "@deepseek-ai/dsh-api-gateway/client";
import type { ClientRemote, RemoteStreamItem } from "@deepseek-ai/dsh-api-gateway/client";
import type { RunRow } from "@melite/estate-runs";

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


/* -- THE RUN STREAM FAKE (the bench tail spec's supervisor + channel
 *  model, copied local on purpose -- importing it across spec files
 *  would run their suites): channels keyed by run id with push/drop
 *  controls, and a $stream supervisor that classifies carrier loss
 *  and reconnects. The channels ride mountEstateFakes' openRunStream
 *  (the runs/subscribe verb). */
interface RunChannel {
  key: string;
  open: boolean;
  queue: Array<Record<string, unknown>>;
  wake: (() => void) | undefined;
}

function fakeRunStream(): {
  remote: ClientRemote;
  open: (runId: string, signal: AbortSignal) => RemoteStreamHandle<RunRow, never>;
  push: (runId: string, doc: Record<string, unknown>) => void;
  drop: () => void;
  isOpen: (runId: string) => boolean;
} {
  const channels: RunChannel[] = [];
  const pending = new Map<string, Array<Record<string, unknown>>>();
  const isOpen = (key: string): boolean => channels.some((c) => c.key === key && c.open);
  const openChannel = (key: string): RemoteStreamHandle<RunRow, never> => {
    const channel: RunChannel = { key, open: true, queue: [...(pending.get(key) ?? [])], wake: undefined };
    pending.delete(key);
    channels.push(channel);
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<RunRow>> =>
          new Promise((resolve) => {
            const step = (): void => {
              channel.wake = undefined;
              if (!channel.open) return resolve({ done: true, value: undefined as never });
              const head = channel.queue.shift();
              if (head === undefined) {
                channel.wake = step;
                return;
              }
              resolve({ done: false, value: head as RunRow });
            };
            step();
          }),
      }),
      send: (): void => { throw new Error("fake runs handle has no uplink") },
      end: (): void => { channel.open = false; channel.wake?.(); },
      dispose: (): void => { channel.open = false; channel.wake?.(); },
    };
  };
  const $stream = <T,>(options: {
    name: string;
    open: (signal: AbortSignal) => AsyncIterable<T> | Promise<AsyncIterable<T>>;
    ended: (accepted: boolean) => Error;
    carrierFailed?: (error: RemoteStreamCarrierError) => void;
  }): { [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<T>>; dispose(): Promise<void> } => {
    const lifetime = new AbortController();
    const queue: Array<RemoteStreamItem<T>> = [];
    const parked: Array<{
      resolve: (result: IteratorResult<RemoteStreamItem<T>>) => void;
      reject: (error: Error) => void;
    }> = [];
    let failed: Error | undefined;
    let channel: RunChannel | undefined;
    const closeChannel = (): void => {
      if (channel !== undefined && channel.open) {
        channel.open = false;
        channel.wake?.();
      }
    };
    const deliver = (): void => {
      while (parked.length > 0 && queue.length > 0) {
        const head = queue.shift()!;
        parked.shift()!.resolve({ done: false, value: head });
      }
    };
    lifetime.signal.addEventListener("abort", () => {
      closeChannel();
      for (const waiter of parked.splice(0)) waiter.resolve({ done: true, value: undefined as never });
    });
    const run = async (): Promise<void> => {
      if (lifetime.signal.aborted) return;
      while (!lifetime.signal.aborted && failed === undefined) {
        try {
          const before = channels.length;
          const iterable = await options.open(lifetime.signal);
          if (lifetime.signal.aborted) {
            for (const c of channels.slice(before)) { c.open = false; c.wake?.(); }
            return;
          }
          channel = channels.at(-1);
          let accepted = false;
          for await (const value of iterable) {
            if (lifetime.signal.aborted || failed !== undefined) return;
            queue.push({ generation: 0, value, signal: lifetime.signal, accept: () => { accepted = true } });
            deliver();
          }
          if (lifetime.signal.aborted) return;
          throw options.ended(accepted);
        } catch (error) {
          if (lifetime.signal.aborted || failed !== undefined) return;
          if (error instanceof RemoteStreamCarrierError) {
            options.carrierFailed?.(error);
            await Promise.resolve();
            continue;
          }
          failed = error instanceof Error ? error : new Error(String(error));
          for (const waiter of parked.splice(0)) waiter.reject(failed);
          return;
        }
      }
    };
    void run();
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<RemoteStreamItem<T>>> =>
          new Promise((resolve, reject) => {
            if (lifetime.signal.aborted) return resolve({ done: true, value: undefined as never });
            const head = queue.shift();
            if (head !== undefined) return resolve({ done: false, value: head });
            if (failed !== undefined) return reject(failed);
            parked.push({ resolve, reject });
          }),
      }),
      dispose: async (): Promise<void> => { lifetime.abort(); },
    };
  };
  const push = (key: string, doc: Record<string, unknown>): void => {
    const live = channels.filter((c) => c.key === key && c.open).at(-1);
    if (live === undefined) {
      pending.set(key, [...(pending.get(key) ?? []), doc]);
      return;
    }
    live.queue.push(doc);
    live.wake?.();
  };
  const drop = (): void => { for (const c of channels) { c.open = false; c.wake?.(); } };
  return {
    remote: { $stream } as unknown as ClientRemote,
    open: (runId: string, _signal: AbortSignal) => openChannel(runId),
    push,
    drop,
    isOpen,
  };
}

const until = async (probe: () => boolean, turns = 200): Promise<void> => {
  for (let i = 0; i < turns && !probe(); i++) await new Promise((resolve) => { setTimeout(resolve, 0); });
  expect(probe()).toBe(true);
};

/** Drive the run resource with a mounted stream remote and collect
 *  its frames -- collect's stream-era shape. */
async function collectStream(
  address: string,
  remote: ClientRemote,
  c: { signal: AbortSignal },
  cap = 8,
): Promise<Array<RemoteResult<never>>> {
  const frames: Array<RemoteResult<never>> = [];
  for await (const frame of openCardsResource(address, c, remote, undefined)) {
    frames.push(frame as RemoteResult<never>);
    if (frames.length >= cap) break;
  }
  return frames;
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

describe("the run view — hydrate, then the push stream to terminal", () => {
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

  test("a terminal hydrate yields once and never opens the stream", async () => {
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "completed", stages: [] }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { kind: "run", status: "completed" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
      expect(fakes.calls.filter((c) => c.method === "runs/subscribe")).toHaveLength(0);
    } finally {
      fakes.unmount();
    }
  });

  test("a pre-aborted holder takes the hydrate, opens, and ends at the stream's guard", async () => {
    // The run branch keeps NO aborted re-check of its own before the
    // stream (the bench branch's shape): the stream's opening guard
    // owns that arm -- the open happens, the guard disposes, and the
    // tail ends without a single item read.
    const fake = fakeRunStream();
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
      openRunStream: fake.open,
    });
    try {
      const ctrl = new AbortController();
      ctrl.abort();
      const frames = await collectStream(ADDR, fake.remote, { signal: ctrl.signal });
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
      expect(fakes.calls.filter((c) => c.method === "runs/subscribe")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("an unmounted remote face degrades honestly: one snapshot, one failure voice", async () => {
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
    });
    try {
      const frames = await collect(ADDR, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]!.ok).toBe(false);
      expect(failureText(frames[1]!)).toContain("run stream unavailable");
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("a live run streams: silence on same-row, a frame on movement, end at terminal", async () => {
    // THE POLL IS DEAD (audits row 1.8, 2026-10-12): the run view
    // rides runs/subscribe through the carrier. The LAWS are the
    // poll's, unchanged -- ONE hydrate read, the same-row items stay
    // silent (the spam floor is seeded from the hydrated row),
    // movement frames (a NON-terminal movement keeps watching; the
    // terminal one ends the tail).
    const fake = fakeRunStream();
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
      openRunStream: fake.open,
    });
    try {
      // queued upfront: the channel serves in order
      fake.push("run-1", { run_id: "run-1", status: "running", stages: [] });
      fake.push("run-1", { run_id: "run-1", status: "running", stages: [] });
      fake.push("run-1", { run_id: "run-1", status: "queued", stages: [] });
      fake.push("run-1", { run_id: "run-1", status: "completed", stages: [{ id: "s_0", status: "succeeded" }] });
      const frames = await collectStream(ADDR, fake.remote, ctx());
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
      expect(fakes.calls.filter((c) => c.method === "runs/subscribe")).toHaveLength(1);
      expect(frames).toHaveLength(3);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]).toMatchObject({ ok: true, value: { status: "queued" } });
      expect(frames[2]).toMatchObject({ ok: true, value: { status: "completed" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a carrier blip keeps the last ok value and recovers — TWO losses, two voices", async () => {
    // The poll's blip law over the stream, both of its arms: each
    // carrier loss surfaces as ONE failure frame beside the last ok
    // value (the RE-ARMED latch voices the second episode exactly as
    // the first), and each reconnect's next row recovers (the
    // visibility law). The first generation ends AFTER its snapshot
    // (accepted); the second ends before its next accept -- the
    // ended() classifier sees both arms.
    const fake = fakeRunStream();
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
      openRunStream: fake.open,
    });
    try {
      const controller = new AbortController();
      const frames: Array<RemoteResult<never>> = [];
      const consuming = (async () => {
        for await (const frame of openCardsResource(ADDR, { signal: controller.signal }, fake.remote, undefined)) {
          frames.push(frame as RemoteResult<never>);
        }
      })();
      await until(() => fake.isOpen("run-1"));
      fake.push("run-1", { run_id: "run-1", status: "running", stages: [] }); // same row: silent, marks the snapshot accepted
      fake.drop(); // loss #1 -- one loss voice, then the reconnect serves
      fake.push("run-1", { run_id: "run-1", status: "queued", stages: [] }); // recovery: a NON-terminal movement
      await until(() => frames.length === 3);
      fake.drop(); // loss #2 -- the re-armed latch voices again
      await until(() => frames.length === 4);
      fake.push("run-1", { run_id: "run-1", status: "completed", stages: [{ id: "s_0", status: "succeeded" }] });
      await consuming; // the terminal row ends the tail on its own
      expect(frames).toHaveLength(5);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]!.ok).toBe(false);
      expect(failureText(frames[1]!)).toContain("run live stream lost");
      expect(frames[2]).toMatchObject({ ok: true, value: { status: "queued" } });
      expect(frames[3]!.ok).toBe(false);
      expect(failureText(frames[3]!)).toContain("run live stream lost");
      expect(frames[4]).toMatchObject({ ok: true, value: { status: "completed" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("a non-Error stream failure voices String(e) (the foreign throw's text arm)", async () => {
    // The supervisor's terminal failure is not always an Error
    // instance at the seat -- the tail's last voice must still name
    // it through the String() arm of the catch (the bench tail's own
    // foreign-throw law, one voice for both tails).
    let i = 0;
    const bespoke = {
      $stream: (): {
        [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<Record<string, unknown>>>;
        dispose(): Promise<void>;
      } => ({
        [Symbol.asyncIterator]: () => ({
          next: async (): Promise<IteratorResult<RemoteStreamItem<Record<string, unknown>>>> => {
            i += 1;
            if (i === 1) {
              const item: RemoteStreamItem<Record<string, unknown>> = {
                generation: 0,
                value: { run_id: "run-1", status: "running", stages: [] },
                signal: new AbortController().signal,
                accept: () => {},
              };
              return { done: false, value: item };
            }
            throw "a plain string rejection";
          },
        }),
        dispose: async (): Promise<void> => {},
      }),
    };
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
    });
    try {
      const frames = await collectStream(ADDR, bespoke as unknown as ClientRemote, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]!.ok).toBe(false);
      expect(failureText(frames[1]!)).toContain("a plain string rejection");
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("an out-of-vocabulary stream row yields the named failure and ends (never a buried terminal)", async () => {
    // strictness fix 3's stream arm: readRunStatus throws on a status
    // outside RUN_STATUS_WORDS -- the old ':unknown' default handed
    // the garbage to the fold, which buried it as a terminal. The
    // guard surfaces the door's own text against the ADDRESS and
    // stops the tail (the hydrate stays the last ok frame).
    const fake = fakeRunStream();
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
      openRunStream: fake.open,
    });
    try {
      fake.push("run-1", { run_id: "run-1", status: "running", stages: [] });
      fake.push("run-1", { run_id: "run-1", status: "banana", stages: [] });
      fake.push("run-1", { run_id: "run-1", status: "completed", stages: [] });
      const frames = await collectStream(ADDR, fake.remote, ctx());
      expect(frames).toHaveLength(2);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(frames[1]!.ok).toBe(false);
      expect(failureText(frames[1]!)).toMatch(/outside the vocabulary/);
      // the completed row never serves: the tail returned at the failure
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });

  test("an abort mid-stream ends the tail (the hydrate stays the last frame)", async () => {
    const fake = fakeRunStream();
    const fakes = stubWire({
      runDocs: [{ run_id: "run-1", status: "running", stages: [] }],
      openRunStream: fake.open,
    });
    try {
      const controller = new AbortController();
      const frames: Array<RemoteResult<never>> = [];
      const consuming = (async () => {
        for await (const frame of openCardsResource(ADDR, { signal: controller.signal }, fake.remote, undefined)) {
          frames.push(frame as RemoteResult<never>);
        }
      })();
      await until(() => fake.isOpen("run-1"));
      fake.push("run-1", { run_id: "run-1", status: "running", stages: [] }); // same row: no frame
      await new Promise((r) => setTimeout(r, 200)); // parked: nothing left to serve
      controller.abort();
      await consuming;
      expect(frames).toHaveLength(1);
      expect(frames[0]).toMatchObject({ ok: true, value: { status: "running" } });
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(1);
    } finally {
      fakes.unmount();
    }
  });
});
