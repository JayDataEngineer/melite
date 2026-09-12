// toast.spec.ts — the catalog's native toast store: the duration law
// (errors persist 15s, success/info auto-dismiss at 5s), removeToast,
// subscribe/unsubscribe. Runs the REAL module under fake timers.
import { describe, it, beforeEach, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { useToastStore } from "../src/toast.ts";

let errSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("addToast durations", () => {
  it("errors persist 15s, then auto-dismiss", () => {
    useToastStore.getState().addToast("error", "boom");
    assert.equal(useToastStore.getState().toasts.length, 1);
    assert.match(useToastStore.getState().toasts[0]!.message, /boom/);
    vi.advanceTimersByTime(14_999);
    assert.equal(useToastStore.getState().toasts.length, 1);
    vi.advanceTimersByTime(1);
    assert.deepEqual(useToastStore.getState().toasts, []);
  });

  it("errors with a Retry action log the action, success/info dismiss at 5s", () => {
    let clicked = false;
    useToastStore.getState().addToast("error", "down", {
      label: "Retry",
      onClick: () => {
        clicked = true;
      },
    });
    assert.equal(errSpy.mock.calls.length, 1);
    useToastStore.getState().addToast("success", "ok");
    useToastStore.getState().addToast("info", "note");
    assert.equal(useToastStore.getState().toasts.length, 3);
    assert.equal(infoSpy.mock.calls.length, 2);
    vi.advanceTimersByTime(5_000);
    // The two 5s toasts dismissed; the 15s error survives.
    assert.deepEqual(
      useToastStore.getState().toasts.map((t) => t.type),
      ["error"],
    );
    assert.equal(clicked, false);
    vi.advanceTimersByTime(10_000);
    assert.deepEqual(useToastStore.getState().toasts, []);
  });
});

describe("removeToast", () => {
  it("removes by id, ignores unknown ids", () => {
    useToastStore.getState().addToast("info", "a");
    useToastStore.getState().addToast("info", "b");
    const [first, second] = useToastStore.getState().toasts;
    useToastStore.getState().removeToast(999_999);
    assert.equal(useToastStore.getState().toasts.length, 2);
    useToastStore.getState().removeToast(first!.id);
    assert.deepEqual(
      useToastStore.getState().toasts.map((t) => t.id),
      [second!.id],
    );
  });
});

describe("subscribe", () => {
  it("notifies on every mutation, stops after unsubscribe", () => {
    let calls = 0;
    const unsub = useToastStore.subscribe(() => {
      calls++;
    });
    useToastStore.getState().addToast("info", "a");
    assert.equal(calls, 1);
    useToastStore.getState().removeToast(useToastStore.getState().toasts[0]!.id);
    assert.equal(calls, 2);
    unsub();
    useToastStore.getState().addToast("info", "b");
    assert.equal(calls, 2); // nobody notified after unsubscribe
  });
});
