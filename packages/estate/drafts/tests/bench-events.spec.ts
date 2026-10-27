import { describe, expect, test } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { onBenchChange, notifyBenchChange, notifyBenchDocWrite, setBenchChangeSeam } from "../src/bench.ts";
import { BenchRemoteService, installBenchChangeSeam } from "../src/remote.ts";
import { sig, bootCtx } from "./bench-helpers.ts";
import { draftIdOf } from "@melite/contracts/benchStage"

// THE EVENT SEAT (the hand-roll row 1.2, 2026-10-12): these arms
// exercise the module's own event law, so they install the SAME seam
// the plugin installs — a real cordis Context carrying the typed
// `bench.changed` event. Nothing here hand-rolls a listener set: the
// law (a subscriber's fault never breaks the write, never starves the
// listeners after it) is the module's wrapper over the real bus, and
// this file is what keeps it pinned.
const ctx = new Context();
installBenchChangeSeam(ctx);

// ── THE CHANGE EVENTS + THE SUBSCRIBE STREAM (2026-09-12) ──────────
// The push source: every bench write fires the change event at the
// remote seam; bench/subscribe yields the doc on open and after every
// write that touches the session (the collapse plan's stream arm —
// the browser heartbeat consumes rev drift until the host's stream
// face lands).

describe("the bench change events (the push source)", () => {
  test("a write notify reaches the listener with the session", () => {
    const seen: string[] = [];
    const off = onBenchChange((session) => { seen.push(session) });
    notifyBenchChange("main");
    notifyBenchChange("second");
    off();
    notifyBenchChange("main");
    expect(seen).toEqual(["main", "second"]);
  });

  test("a listener's fault never breaks the write", () => {
    const off = onBenchChange(() => { throw new Error("listener fault") });
    expect(() => notifyBenchChange("main")).not.toThrow();
    off();
  });

  test("a tree with NO seam installed refuses LOUD (never a silent no-op)", () => {
    // THE LAW THIS FILE KEEPS: `onBenchChange` without a seam is a
    // programming error, not an empty subscription. A silent no-op
    // would let a whole test tree (or a boot path) stop hearing bench
    // writes and still pass every assertion it still runs.
    setBenchChangeSeam(null);
    try {
      expect(() => onBenchChange(() => {})).toThrow(/no bench change seam installed/);
    } finally {
      installBenchChangeSeam(ctx);
    }
  });

  test("an OLDER install's unwind clears only its own seam (the ownership stamp)", () => {
    // THE STAMP LAW (the J3 defect, both seam twins): LAST install
    // wins, and a displaced installer's detach is a NO-OP — the older
    // fiber's unwind must never null the newer, still-live seam.
    const older = new Context();
    const newer = new Context();
    const detachOlder = installBenchChangeSeam(older);
    const detachNewer = installBenchChangeSeam(newer); // displaces the older seam
    detachOlder(); // the older fiber unwinds FIRST — displaced, so a no-op
    const seen: string[] = [];
    const off = onBenchChange((session) => { seen.push(session); });
    notifyBenchChange("live");
    off();
    expect(seen).toEqual(["live"]);
    detachNewer();
    expect(() => onBenchChange(() => {})).toThrow(/no bench change seam installed/);
    installBenchChangeSeam(ctx); // restore the file's own seam
  });

  test("the seam's disposer detaches it (a torn-down Context leaves no emitter)", () => {
    const own = new Context();
    const detach = installBenchChangeSeam(own);
    detach();
    expect(() => onBenchChange(() => {})).toThrow(/no bench change seam installed/);
    installBenchChangeSeam(ctx); // restore the file's own seam
  });

  test("notifyBenchDocWrite parses bench-shaped draft ids only", () => {
    const seen: string[] = [];
    const off = onBenchChange((session) => { seen.push(session) });
    notifyBenchDocWrite(draftIdOf("bench-main"));
    notifyBenchDocWrite(draftIdOf("some-other-draft"));
    notifyBenchDocWrite(draftIdOf("bench-"));
    expect(seen).toEqual(["main"]);
    off();
  });
});

describe("the bench/subscribe stream remote", () => {
  type Row = { draft_id: string; session: string; rev: number; intent: unknown; stages: unknown[]; log: unknown[] };



  test("yields the doc on open, after a write, and abort ends", async () => {
    const controller = new AbortController();
    const rows: Row[] = [
      { draft_id: "bench-main", session: "main", rev: 3, intent: null, stages: [], log: [] },
      { draft_id: "bench-main", session: "main", rev: 4, intent: null, stages: [{ id: "s_1" }], log: [] },
    ];
    // the receiver: a bare object with the get arm the generator calls
    const fake = { get: async (): Promise<Row> => rows.shift() ?? rows[0]! };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    if (first.done !== false) throw new Error("no initial frame");
    // resume the stream INTO the change wait, then land the write
    const secondP = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 25));
    notifyBenchChange("main");
    const second = await secondP;
    if (second.done !== false) throw new Error("no change frame");
    expect([first.value.rev, second.value.rev]).toEqual([3, 4]);
    controller.abort();
    const third = await gen.next();
    if (third.done !== true) throw new Error("abort must end the stream");
  });

  test("a write landing mid-delivery wakes the parked stream with the new rev — no second write needed (S-S3)", async () => {
    const controller = new AbortController();
    const rows: Row[] = [
      { draft_id: "bench-main", session: "main", rev: 5, intent: null, stages: [], log: [] },
      { draft_id: "bench-main", session: "main", rev: 6, intent: null, stages: [{ id: "s_1" }], log: [] },
    ];
    const fake = { get: async (): Promise<Row> => rows.shift() ?? rows[0]! };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    if (first.done !== false) throw new Error("no initial frame");
    // THE GAP: the write lands while the generator sits suspended at
    // the yield — the consumer has not resumed it, so no park
    // listener exists. The mid-flight watch must carry the event.
    notifyBenchChange("main");
    const second = await gen.next();
    if (second.done !== false) throw new Error("the mid-flight write must deliver");
    expect(second.value.rev).toBe(6);
    controller.abort();
    await gen.next();
  });

  test("an abort that lands while suspended at a yield ends the stream on the next resume (no parked listener)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 2, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    // the abort lands with NO listener attached (the generator sits
    // suspended at the yield) — the executor's re-check must end it
    controller.abort();
    const next = await gen.next();
    expect(next.done).toBe(true);
  });

  test("a write and a racing abort settle ONCE (the double-finish guard)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 5, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    const parked = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 10));
    // the write wakes the park; the abort races in behind it — one
    // finish wins, both listeners come off, nothing double-resolves
    notifyBenchChange("main");
    controller.abort();
    // THE RACE'S OWN VERDICT (the walls audit's C2, 2026-10-10): the
    // old line was `second.done === false || second.done === true` —
    // true for every possible value, so a double-finish regression
    // (the racing write resolving the parked gen with done:true and
    // swallowing the change frame) passed this arm unchanged. The
    // race has TWO honest shapes and the pin states BOTH, so the
    // broken one is a red: the write wins (a final frame at the
    // current rev), or the abort wins (a clean end) — and the NEXT
    // next() agrees (no second frame, no hang, no throw).
    const second = await parked;
    if (second.done === true) {
      // the abort won first: a clean end, nothing swallowed
      expect(second.value).toBeUndefined();
    } else {
      // the write won: a FINAL FRAME carrying the row it delivered
      expect(second.value.rev).toBe(5);
    }
    const last = await gen.next();
    expect(last.done).toBe(true);
  });

  test("a foreign session's write does not wake the stream (the mismatch arm runs, the park holds)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 1, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    // resume INTO the park first (listener attaches), THEN probe it
    // with a foreign write — the mismatch arm returns early and the
    // stream stays parked (only the matching session may wake it)
    const parked = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 10));
    notifyBenchChange("other-session");
    const raced = await Promise.race([
      parked.then((r) => r.done === true ? "ended" : "FRAME"),
      new Promise((resolve) => setTimeout(() => resolve("parked"), 25)),
    ]);
    expect(raced).toBe("parked");
    controller.abort();
    const last = await parked;
    expect(last.done).toBe(true);
  });
});

describe("the bench/ensure notify", () => {
  test("the notify rides the doc's own gated session key", async () => {
    const { ctx } = await bootCtx();
    const heard: string[] = [];
    const off = onBenchChange((session) => { heard.push(session) });
    // the in-process ensure arm (the remote delegates here):
    // ensureBench gates the session key; the notify rides it verbatim
    const service = new BenchRemoteService(ctx);
    const row = await service.ensure({ session: "spec-fb" }, sig) as { session: string };
    expect(row.session).toBe("spec-fb");
    expect(heard).toEqual(["spec-fb"]);
    off();
  });
});
