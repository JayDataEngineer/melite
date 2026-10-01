// run-status-contract-store.spec.ts — the status-channel verdict store:
// violation/error reports, the toast Retry repoll (success clears,
// failure is swallowed), and clear. Toasts are captured by swapping
// the ui store's addToast (no sonner at spec runtime).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { setContractToastSink } from "../src/contractToast.ts";
import { useRunStatusContractStore } from "../src/runStatusContractStore.ts";
import type { RunStatusVerdict } from "../src/runStatusContractStore.ts";
import type { RunStatusViolation } from "../src/runStatusContract.ts";

const realFetch = globalThis.fetch;

type Captured = { type: string; message: string; action?: { label: string; onClick: () => void } };
let captured: Captured[] = [];

afterEach(() => {
  globalThis.fetch = realFetch;
  useRunStatusContractStore.getState().clear();
  captured = [];
});

const captureToasts = (): void => {
  captured = [];
  setContractToastSink((type, message, action) => {
    captured.push({ type, message, action });
  });
};

const violation = (message: string): RunStatusViolation[] =>
  [{ field: "status", kind: "invalid", message }] as RunStatusViolation[];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const completed = (runId: string): Response =>
  new Response(
    JSON.stringify({
      run_id: runId,
      status: "completed",
      stages: [{ id: "s", name: "n", index: 0, status: "done" }],
    }),
    { status: 200 },
  );

describe("reportVerdicts", () => {
  it("records violations and errors with Retry toasts", () => {
    captureToasts();
    const store = useRunStatusContractStore.getState();
    store.reportViolation("r1", violation("bad status"));
    assert.deepEqual(useRunStatusContractStore.getState().verdict, {
      kind: "violation",
      runId: "r1",
      violations: violation("bad status"),
    });
    assert.equal(captured.length, 1);
    assert.equal(captured[0].type, "error");
    assert.match(captured[0].message, /r1/);
    assert.equal(captured[0].action?.label, "Retry");

    store.reportError("r2", "gone");
    assert.deepEqual(useRunStatusContractStore.getState().verdict, {
      kind: "error",
      runId: "r2",
      message: "gone",
    });
    assert.equal(captured.length, 2);
    assert.match(captured[1].message, /r2.*gone/);
  });

  it("falls back when a violation carries no message", () => {
    captureToasts();
    useRunStatusContractStore.getState().reportViolation("r9", []);
    assert.match(captured[0].message, /did not match the expected shape/);
  });
});

describe("subscribe / setState plumbing", () => {
  it("notifies subscribers on every mutation, stops after unsubscribe", () => {
    captureToasts();
    let calls = 0;
    const unsub = useRunStatusContractStore.subscribe(() => {
      calls++;
    });
    useRunStatusContractStore.getState().reportViolation("r1", violation("x"));
    assert.equal(calls, 1);
    unsub();
    useRunStatusContractStore.getState().reportError("r2", "y");
    assert.equal(calls, 1); // nobody notified after unsubscribe
  });

  it("setState merges function patches and honors replace", () => {
    const s0 = useRunStatusContractStore.getState();
    useRunStatusContractStore.setState((s) => ({ verdict: s.verdict }));
    assert.equal(useRunStatusContractStore.getState().verdict, null);
    useRunStatusContractStore.setState(s0, true);
    assert.equal(useRunStatusContractStore.getState().verdict, null);
    assert.equal(typeof useRunStatusContractStore.getState().reportViolation, "function");
  });

  it("exposes the initial verdict and a destroy no-op", () => {
    assert.equal(useRunStatusContractStore.getInitialState().verdict, null);
    useRunStatusContractStore.destroy();
  });

  it("pins the hook's selector contract through getState", () => {
    // The hook (v8-ignored, renderer-only) is selector(getState()) with no
    // selector yielding the full state — pin both readings here, no React.
    captureToasts();
    useRunStatusContractStore.getState().reportError("r7", "m");
    const verdictOf = (
      s: ReturnType<typeof useRunStatusContractStore.getState>,
    ): RunStatusVerdict | null => s.verdict;
    assert.deepEqual(verdictOf(useRunStatusContractStore.getState()), {
      kind: "error",
      runId: "r7",
      message: "m",
    });
  });
});

describe("repoll (toast Retry)", () => {
  it("clears the verdict when the re-poll succeeds", async () => {
    captureToasts();
    globalThis.fetch = (async () => completed("r1")) as typeof fetch;
    useRunStatusContractStore.getState().reportViolation("r1", violation("stale"));
    assert.ok(useRunStatusContractStore.getState().verdict !== null);
    captured[0].action?.onClick();
    for (let i = 0; i < 200 && useRunStatusContractStore.getState().verdict !== null; i++) {
      await sleep(10);
    }
    assert.equal(useRunStatusContractStore.getState().verdict, null);
  });

  it("swallows a still-bad re-poll (the card shows the truth)", async () => {
    captureToasts();
    globalThis.fetch = (async () => new Response("gone", { status: 404 })) as typeof fetch;
    useRunStatusContractStore.getState().reportError("r2", "gone");
    captured[0].action?.onClick();
    await sleep(300);
    assert.deepEqual(useRunStatusContractStore.getState().verdict, {
      kind: "error",
      runId: "r2",
      message: "gone",
    });
  });
});
