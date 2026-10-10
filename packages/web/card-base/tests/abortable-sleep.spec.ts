// abortable-sleep.spec.ts — the watchers' shared wait (the round-18
// audits: dev_docs/audits/round18-auditor-runs-registry-2026-10-10.md
// F2, dev_docs/audits/round18-auditor-cardview-mutations-2026-10-10.md
// F3). The two leaking copies accumulated one abort listener per poll
// on a caller's signal; this pins the detach on both arms, which is
// what makes the wait safe to call in a loop.
import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { abortableSleep } from "../src/abortable.ts";

/** The caller's signal with its abort listeners counted: the count is of
 *  listeners still attached — one that fired under `once` and one that was
 *  removed both fall out of it — and the DOM environments these packages
 *  run under expose no listener introspection of their own. */
function countedSignal(
  controller: AbortController = new AbortController(),
): { signal: AbortSignal; attached: () => number } {
  const target = controller.signal;
  const live = new Set<EventListener>();
  const wrappers = new Map<EventListener, EventListener>();
  const signal = new Proxy(target, {
    get(inner, prop, receiver) {
      if (prop === "addEventListener") {
        return (type: string, fn: EventListener, opts?: AddEventListenerOptions): void => {
          if (type !== "abort") {
            target.addEventListener(type, fn, opts);
            return;
          }
          const once = typeof opts === "object" && opts.once === true;
          const wrapped: EventListener = (event) => {
            if (once) live.delete(fn);
            fn(event);
          };
          wrappers.set(fn, wrapped);
          live.add(fn);
          target.addEventListener(type, wrapped, opts);
        };
      }
      if (prop === "removeEventListener") {
        return (type: string, fn: EventListener, opts?: EventListenerOptions): void => {
          if (type !== "abort") {
            target.removeEventListener(type, fn, opts);
            return;
          }
          const wrapped = wrappers.get(fn);
          if (wrapped === undefined) return;
          wrappers.delete(fn);
          live.delete(fn);
          target.removeEventListener(type, wrapped, opts);
        };
      }
      return Reflect.get(inner, prop, receiver);
    },
  });
  return { signal, attached: () => live.size };
}

describe("abortableSleep (the run watchers' wait)", () => {
  test("a completed sleep leaves no abort listener on the caller's signal", async () => {
    const { signal, attached } = countedSignal();
    expect(await abortableSleep(1, signal)).toBe("slept");
    expect(attached()).toBe(0);
  });

  test("an abort resolves the wait and leaves no listener behind", async () => {
    const controller = new AbortController();
    const { signal, attached } = countedSignal(controller);
    const pending = abortableSleep(5_000, signal);
    controller.abort();
    expect(await pending).toBe("abort");
    expect(attached()).toBe(0);
  });

  test("an already-aborted signal resolves 'abort' without waiting out the timer", async () => {
    const controller = new AbortController();
    controller.abort();
    const started = Date.now();
    expect(await abortableSleep(5_000, controller.signal)).toBe("abort");
    assert.ok(Date.now() - started < 1_000, "an aborted signal must not wait for the timer");
  });

  test("a signal-less wait is a plain sleep", async () => {
    expect(await abortableSleep(1)).toBe("slept");
  });
});
