// runs-subscribe-wakeup.spec.ts — the watch's own wake law (the
// round-14 race audit's R2, dev_docs/audits/round14-race-registries-
// 2026-10-22.md): a settle that lands while the consumer is suspended
// at a yield finds no listener attached, and the loop used to park
// again on a row that had already moved — the subscriber slept forever
// on a pre-terminal row. The watch now attaches first and verifies the
// row's bytes after, so the change that fired in that window is still
// delivered. This file drives the real RunsRemoteService over a seat
// that answers only the watch arms: `status` serves the row the test
// holds, `onRunChange` is a local listener set with its own fire.
import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RunsRemoteService } from "@melite/estate-runs";

/** The watch arms of a runs seat, plus the test's own fire. */
function seatOf(row: () => Record<string, unknown> | undefined): {
  seat: Record<string, unknown>;
  fire: (runId: string) => void;
} {
  const listeners = new Set<(runId: string) => void>();
  const unary = (name: string) => async (): Promise<never> => {
    throw new Error(`this file drives only the watch: ${name} is unary`);
  };
  return {
    seat: {
      start: unary("start"),
      stop: unary("stop"),
      list: unary("list"),
      validate: unary("validate"),
      status: async (runId: string) => {
        const current = row();
        if (current === undefined) {
          throw new RemoteError("runs/unknown-run", `no run ${runId}`, { runId });
        }
        return current;
      },
      onRunChange: (fn: (runId: string) => void) => {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      },
    },
    fire: (runId: string) => { for (const fn of listeners) fn(runId); },
  };
}

function watchOf(seat: Record<string, unknown>): RunsRemoteService {
  const ctx = new Context();
  ctx.provide("runs", seat as never);
  return new RunsRemoteService(ctx);
}

const settleWindow = 200;

describe("the runs watch's wake law (the round-14 race audit's R2)", () => {
  test("a settle that lands while the consumer is suspended at a yield is still delivered", async () => {
    let row: Record<string, unknown> | undefined = { run_id: "run-a", status: "running" };
    const { seat, fire } = seatOf(() => row);
    const svc = watchOf(seat);
    const controller = new AbortController();
    const stream = svc.subscribe("run-a", controller.signal)[Symbol.asyncIterator]();
    const first = await stream.next();
    expect((first.value as Record<string, unknown>)["status"]).toBe("running");
    // the settle lands HERE: the generator sits at its yield, so the
    // notify fires with nobody attached — the audit's window
    row = { run_id: "run-a", status: "completed" };
    fire("run-a");
    const second = await Promise.race([
      stream.next(),
      new Promise<"stalled">((resolve) => { setTimeout(() => resolve("stalled"), settleWindow); }),
    ]);
    assert.ok(
      second !== "stalled",
      "the watch parked on a row that had already moved: the terminal change was lost",
    );
    expect((second.value as Record<string, unknown>)["status"]).toBe("completed");
    controller.abort();
  });

  test("an abort while the watch is parked ends the stream instead of stalling", async () => {
    const { seat } = seatOf(() => ({ run_id: "run-b", status: "running" }));
    const svc = watchOf(seat);
    const controller = new AbortController();
    const stream = svc.subscribe("run-b", controller.signal)[Symbol.asyncIterator]();
    await stream.next();
    const parked = stream.next();
    controller.abort();
    const settled = await Promise.race([
      parked,
      new Promise<"stalled">((resolve) => { setTimeout(() => resolve("stalled"), settleWindow); }),
    ]);
    assert.ok(settled !== "stalled", "an abort left the watch parked");
    expect(settled.done).toBe(true);
  });
});
