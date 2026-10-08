// @vitest-environment happy-dom
/**
 * sleep.spec.ts — the shared delay's CONTRACT (2026-10-12).
 *
 * The package had four clones of this one function; folding them left
 * the merged contract held in place by nothing (the verification
 * receipt's D1: deleting the whole abort branch turned every suite
 * green). The verifier is right — this file is the pin. Each arm
 * states a behavior a caller in this package relies on:
 *
 *   - api.ts's retry rides the abort to cut a backoff short;
 *   - the listener is REMOVED on resolve (a poll that sleeps thousands
 *     of times must not accumulate listeners);
 *   - an already-aborted signal rejects without arming a timer;
 *   - a caller with no signal gets the plain delay (text-to-pose's
 *     poll and FlowProtocol's two ticks pass none).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { sleep } from "../src/sleep.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("sleep — the package's one delay", () => {
  it("resolves after the delay when no signal is given", async () => {
    vi.useFakeTimers();
    const done = sleep(50);
    await vi.advanceTimersByTimeAsync(50);
    await expect(done).resolves.toBeUndefined();
  });

  it("an abort rejects with the AbortError the retry path catches", async () => {
    const controller = new AbortController();
    const done = sleep(10_000, controller.signal);
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
  });

  it("an abort CLEARS the timer — the backoff never fires after cancel", async () => {
    vi.useFakeTimers();
    const cleared = vi.spyOn(globalThis, "clearTimeout");
    const controller = new AbortController();
    const done = sleep(10_000, controller.signal);
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    expect(cleared).toHaveBeenCalled();
    // no timer can still resolve the (already settled) promise later
    await vi.advanceTimersByTimeAsync(20_000);
    cleared.mockRestore();
  });

  it("an ALREADY-aborted signal rejects without arming a timer", async () => {
    vi.useFakeTimers();
    const armed = vi.spyOn(globalThis, "setTimeout");
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(10_000, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(armed).not.toHaveBeenCalled();
    armed.mockRestore();
  });

  it("the abort listener is REMOVED on resolve (a poll adds no listener per tick)", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const done = sleep(10, controller.signal);
    await vi.advanceTimersByTimeAsync(10);
    await done;
    expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
    removed.mockRestore();
  });
});
