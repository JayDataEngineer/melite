// cards-resource-tail.spec.ts — the bench tail + spotlight watcher's
// edge arms (2026-09-16 burn-down): the loss latch's re-arm (TWO
// losses), the pre-first-frame end classification, the pre-aborted
// tail, the foreign supervisor throw, the watcher's halt edges,
// same-key fire, flip-flop rekey, regression resync, and the done
// break. The fakeRemote supervisor + channel model is imported from
// the provider-stream spec's harness file by COPY (one file per
// mission law — small, local, no cross-spec imports).
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  openCardsResource,
  watchBenchLands,
} from "../src/client/cards-resource.ts";
import { RemoteStreamCarrierError } from "@deepseek-ai/dsh-api-gateway/client";
import type { ClientRemote, RemoteStreamItem } from "@deepseek-ai/dsh-api-gateway/client";

/* ── THE FAKE REMOTE (copied from cards-resource.spec.ts' harness —
 * the mux swap's test face: supervisor with carrier classification,
 * live channels per key, push/drop/failOpen controls). ── */

interface Channel {
  key: string;
  open: boolean;
  queue: Array<Record<string, unknown>>;
  wake: (() => void) | undefined;
}

interface FakeBench {
  remote: ClientRemote;
  push: (key: string, doc: Record<string, unknown>) => void;
  drop: () => void;
  failOpen: (key: string, error: Error) => void;
  isOpen: (key: string) => boolean;
}

function fakeRemote(): FakeBench {
  const channels: Channel[] = [];
  const pending = new Map<string, Array<Record<string, unknown>>>();
  const rejections = new Map<string, Error>();
  const isOpen = (key: string): boolean => channels.some((c) => c.key === key && c.open);
  const openChannel = (key: string): AsyncIterable<Record<string, unknown>> => {
    const reject = rejections.get(key);
    if (reject !== undefined) {
      rejections.delete(key);
      return {
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.reject(reject),
        }),
      };
    }
    const channel: Channel = { key, open: true, queue: [...(pending.get(key) ?? [])], wake: undefined };
    pending.delete(key);
    channels.push(channel);
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<Record<string, unknown>>> =>
          new Promise((resolve) => {
            const step = (): void => {
              channel.wake = undefined;
              if (!channel.open) return resolve({ done: true, value: undefined as never });
              const head = channel.queue.shift();
              if (head === undefined) {
                channel.wake = step;
                return;
              }
              resolve({ done: false, value: head });
            };
            step();
          }),
      }),
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
    let channel: Channel | undefined;
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
      // a dead lifetime never opens (the pre-aborted tail/watcher must
      // leave no channel behind — the real supervisor cancels the open)
      if (lifetime.signal.aborted) return;
      while (!lifetime.signal.aborted && failed === undefined) {
        try {
          const before = channels.length;
          const iterable = await options.open(lifetime.signal);
          if (lifetime.signal.aborted) {
            // dispose raced the open: close what just registered
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
  const bench = {
    subscribe: (key: string, _signal?: AbortSignal): AsyncIterable<Record<string, unknown>> =>
      openChannel(key),
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
  return {
    remote: { bench, $stream } as unknown as ClientRemote,
    push,
    drop: () => { for (const c of channels) { c.open = false; c.wake?.(); } },
    failOpen: (key, error) => { rejections.set(key, error); },
    isOpen,
  };
}

const benchDoc = (rev: number, author: string): Record<string, unknown> => ({
  draft_id: "bench-main", rev, intent: "",
  stages: [{ id: "s_0", card: "image-gen", params: {} }],
  log: [{ rev, at: 1, author, kind: "add_stage" }],
});

const tick = async (n = 2): Promise<void> => {
  for (let i = 0; i < n; i++) await new Promise((resolve) => { setTimeout(resolve, 0); });
};

const until = async (probe: () => boolean, turns = 200): Promise<void> => {
  for (let i = 0; i < turns && !probe(); i++) await new Promise((resolve) => { setTimeout(resolve, 0); });
  expect(probe()).toBe(true);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A bespoke supervisor whose iterator answers a fixed script —
 *  for ends/throws the channel-model fake cannot voice. */
function bespokeStream(
  script: Array<{ doc: Record<string, unknown> } | { throw: unknown } | { done: true }>,
  hooks: { disposed?: () => void; accepts?: () => void } = {},
): ClientRemote {
  let i = 0;
  const $stream = (): {
    [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<Record<string, unknown>>>;
    dispose(): Promise<void>;
  } => ({
    [Symbol.asyncIterator]: () => ({
      next: async (): Promise<IteratorResult<RemoteStreamItem<Record<string, unknown>>>> => {
        const step = script[Math.min(i, script.length - 1)]!;
        if (step === undefined || "done" in step) return { done: true, value: undefined as never };
        if ("throw" in step) throw step.throw;
        i++;
        return {
          done: false,
          value: { value: step.doc, accept: () => { hooks.accepts?.(); } } as RemoteStreamItem<Record<string, unknown>>,
        };
      },
    }),
    dispose: async (): Promise<void> => { hooks.disposed?.(); },
  });
  return { $stream } as unknown as ClientRemote;
}

const benchNs = {
  subscribe: (_key: string, _sig?: AbortSignal): AsyncIterable<Record<string, unknown>> => ({
    [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true as const, value: undefined as never }) }),
  }),
};

function captureConsoleError(): { lines: string[][]; restore: () => void } {
  const lines: string[][] = [];
  const orig = console.error;
  console.error = (...args: unknown[]): void => { lines.push(args.map(String)); };
  return { lines, restore: () => { console.error = orig; } };
}

describe("the tail's loss latch — every episode voices, then re-arms", () => {
  test("a pre-first-frame drop voices loss (the never-opened classification), then serves", async () => {
    const bench = fakeRemote();
    const controller = new AbortController();
    const frames: unknown[] = [];
    const done = (async (): Promise<void> => {
      for await (const frame of openCardsResource(
        "dsh-resource://cards/bench", { signal: controller.signal }, bench.remote, bench.remote.bench,
      )) {
        frames.push(frame);
        if (frames.length === 3) controller.abort();
      }
    })();
    await until(() => bench.isOpen("main"));
    bench.drop(); // before any item: ended(false)
    await until(() => frames.length === 1);
    const first = frames[0] as { ok: boolean; error: { message: string } };
    expect(first.ok).toBe(false);
    expect(first.error.message).toContain("bench live stream lost");
    await until(() => bench.isOpen("main")); // the reconnect
    bench.push("main", benchDoc(7, "user"));
    await until(() => frames.length === 2);
    expect((frames[1] as { ok: boolean }).ok).toBe(true);
    bench.drop(); // a SECOND episode: the re-armed latch voices again
    await done;
    expect(frames.length).toBe(3);
    const third = frames[2] as { ok: boolean; error: { message: string } };
    expect(third.ok).toBe(false);
    expect(third.error.message).toContain("bench live stream lost");
  });
});

describe("the pre-aborted tail — dispose, no frames", () => {
  test("an aborted holder opens nothing and reads nothing", async () => {
    const bench = fakeRemote();
    bench.push("main", benchDoc(7, "user"));
    const controller = new AbortController();
    controller.abort();
    const frames: unknown[] = [];
    for await (const frame of openCardsResource(
      "dsh-resource://cards/bench", { signal: controller.signal }, bench.remote, bench.remote.bench,
    )) {
      frames.push(frame);
    }
    expect(frames).toEqual([]);
    expect(bench.isOpen("main")).toBe(false);
  });
});

describe("the foreign supervisor throw — the tail's catch voices verbatim", () => {
  test("a non-Error throw lands String()'d in the final frame (never a blank death)", async () => {
    const remote = bespokeStream([{ doc: benchDoc(7, "user") }, { throw: "kablam" }]);
    const frames: unknown[] = [];
    for await (const frame of openCardsResource(
      "dsh-resource://cards/bench", { signal: new AbortController().signal }, remote, benchNs as never,
    )) {
      frames.push(frame);
    }
    expect(frames.length).toBe(2);
    expect((frames[0] as { ok: boolean }).ok).toBe(true);
    const last = frames[1] as { ok: boolean; error: { message: string } };
    expect(last.ok).toBe(false);
    expect(last.error.message).toContain("bench stream failed");
    expect(last.error.message).toContain("kablam");
  });
});

describe("the watcher's halt edges — degrade honest, stop idempotent", () => {
  test("no remote face: one honest error, a working halt, twice-stoppable", async () => {
    const cap = captureConsoleError();
    try {
      const lands: string[] = [];
      const stop = watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, undefined, undefined, undefined);
      stop();
      stop();
      await tick(3);
      expect(lands).toEqual([]);
      expect(cap.lines).toHaveLength(1);
      expect(cap.lines[0]!.join(" ")).toContain("spotlight off");
    } finally {
      cap.restore();
    }
  });

  test("a pre-aborted signal never opens the stream", async () => {
    const bench = fakeRemote();
    const controller = new AbortController();
    controller.abort();
    const lands: string[] = [];
    const stop = watchBenchLands(() => "main", (k) => { lands.push(k); }, controller.signal, bench.remote, bench.remote.bench, undefined);
    await tick(3);
    expect(bench.isOpen("main")).toBe(false);
    expect(lands).toEqual([]);
    stop();
  });
});

describe("the watcher's end + failure arms", () => {
  test("a clean stream end breaks the watch (dispose + unsubscribe, never a fire)", async () => {
    let disposed = 0;
    let unsubscribed = 0;
    const remote = bespokeStream([{ doc: benchDoc(3, "user") }, { done: true }], {
      disposed: () => { disposed++; },
    });
    const lands: string[] = [];
    watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, remote, benchNs as never, () => () => { unsubscribed++; });
    await until(() => disposed === 1);
    expect(unsubscribed).toBe(1);
    expect(lands).toEqual([]);
  });

  test("a dying iterator logs once and disposes (the tab tail owns the truth)", async () => {
    const cap = captureConsoleError();
    try {
      let disposed = 0;
      const remote = bespokeStream([{ throw: new Error("mux died") }], {
        disposed: () => { disposed++; },
      });
      const lands: string[] = [];
      watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, remote, benchNs as never, undefined);
      await until(() => disposed === 1);
      expect(lands).toEqual([]);
      expect(cap.lines).toHaveLength(1);
      expect(cap.lines[0]!.join(" ")).toContain("spotlight stream failed");
    } finally {
      cap.restore();
    }
  });

  test("a stream death AFTER the page began unloading is teardown, never a logged failure", async () => {
    // the pagehide latch (cards-resource.ts): a reload aborts every
    // open transport mid-flight; the watcher must die quiet. The
    // listener registers with the watcher itself, so the pagehide
    // fires after the watch starts and before the stream's
    // rejection lands (a microtask later).
    const cap = captureConsoleError();
    try {
      let disposed = 0;
      const remote = bespokeStream([{ throw: new Error("aborted without reason") }], {
        disposed: () => { disposed++; },
      });
      const lands: string[] = [];
      watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, remote, benchNs as never, undefined);
      window.dispatchEvent(new window.Event("pagehide"));
      await until(() => disposed === 1);
      expect(lands).toEqual([]);
      expect(cap.lines).toEqual([]);
    } finally {
      cap.restore();
    }
  });

  test("a rev regression resyncs honestly (never a fire on old news)", async () => {
    const bench = fakeRemote();
    const lands: string[] = [];
    const stop = watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, bench.remote, bench.remote.bench, undefined);
    await until(() => bench.isOpen("main"));
    bench.push("main", benchDoc(12, "agent"));
    await tick(2);
    expect(lands).toEqual([]); // hydration baseline
    bench.push("main", benchDoc(10, "agent")); // the estate went backwards
    await tick(3);
    expect(lands).toEqual([]); // resync, never a reveal
    bench.push("main", benchDoc(11, "agent")); // forward past the resync
    await until(() => lands.length === 1);
    expect(lands).toEqual(["main"]);
    stop();
  });
});

describe("the watcher's rekey edges — quiet switches stay quiet", () => {
  test("a same-key fire reopens nothing", async () => {
    const bench = fakeRemote();
    let fire: (() => void) | undefined;
    const lands: string[] = [];
    const stop = watchBenchLands(
      () => "main", (k) => { lands.push(k); }, undefined,
      bench.remote, bench.remote.bench,
      (fn) => { fire = fn; return () => {}; },
    );
    await until(() => bench.isOpen("main"));
    bench.push("main", benchDoc(5, "user"));
    await tick(2);
    fire!(); // the observable fired, but the key never moved
    await tick(3);
    expect(bench.isOpen("s_other")).toBe(false);
    expect(lands).toEqual([]);
    stop();
  });

  test("a flip-flop fire (moved, moved back) reopens nothing", async () => {
    const bench = fakeRemote();
    const script = ["k1", "k2", "k1"];
    let calls = 0;
    const getSession = (): string => script[Math.min(calls++, script.length - 1)]!;
    let fire: (() => void) | undefined;
    const lands: string[] = [];
    const stop = watchBenchLands(
      getSession, (k) => { lands.push(k); }, undefined,
      bench.remote, bench.remote.bench,
      (fn) => { fire = fn; return () => {}; },
    );
    await until(() => bench.isOpen("k1"));
    fire!(); // the guard saw k2, but the race reads k1 again
    await tick(4);
    expect(bench.isOpen("k2")).toBe(false);
    expect(lands).toEqual([]);
    stop();
  });

  test("two fires rekey twice (the re-armed latch resolves again)", async () => {
    const bench = fakeRemote();
    // the guard AND the race each read the session: fire1 (k2, k2),
    // fire2 (k1, k1)
    const script = ["k1", "k2", "k2", "k1", "k1"];
    let calls = 0;
    const getSession = (): string => script[Math.min(calls++, script.length - 1)]!;
    let fire: (() => void) | undefined;
    const lands: string[] = [];
    const stop = watchBenchLands(
      getSession, (k) => { lands.push(k); }, undefined,
      bench.remote, bench.remote.bench,
      (fn) => { fire = fn; return () => {}; },
    );
    await until(() => bench.isOpen("k1"));
    fire!(); // the guard sees k2 — first rekey opens k2, closes k1
    await until(() => bench.isOpen("k2") && !bench.isOpen("k1"));
    fire!(); // the guard sees k1 — the RE-ARMED latch resolves again
    await until(() => bench.isOpen("k1"));
    bench.push("k1", benchDoc(30, "agent"));
    await tick(2);
    expect(lands).toEqual([]); // the reopened key re-baselines: hydration first
    bench.push("k1", benchDoc(31, "agent"));
    await until(() => lands.length === 1);
    expect(lands).toEqual(["k1"]); // the twice-rekeyed watch still reveals
    stop();
  });
});

describe("the watcher's supervisor voice — a never-opened channel names itself", () => {
  test("an end before the first frame logs the never-opened classification", async () => {
    const cap = captureConsoleError();
    try {
      let disposed = 0;
      let captured: {
        ended: (accepted: boolean) => Error;
      } | undefined;
      const remote = {
        $stream: (opts: { ended: (accepted: boolean) => Error }): {
          [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<Record<string, unknown>>>;
          dispose(): Promise<void>;
        } => {
          captured = opts;
          return {
            [Symbol.asyncIterator]: () => ({
              next: async (): Promise<IteratorResult<RemoteStreamItem<Record<string, unknown>>>> => {
                throw captured!.ended(false);
              },
            }),
            dispose: async (): Promise<void> => { disposed++; },
          };
        },
      } as unknown as ClientRemote;
      const lands: string[] = [];
      watchBenchLands(() => "main", (k) => { lands.push(k); }, undefined, remote, benchNs as never, undefined);
      await until(() => disposed === 1);
      expect(lands).toEqual([]);
      expect(cap.lines).toHaveLength(1);
      expect(cap.lines[0]!.join(" ")).toContain("spotlight stream failed");
      expect(cap.lines[0]!.join(" ")).toContain("never opened");
    } finally {
      cap.restore();
    }
  });
});
