// catalog-contract-store.spec.ts — the catalog verdict store: ok /
// violation / error reports, the once-per-outage toast latch, retry.
import { describe, it, afterEach, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";

const { toasts, loadCatalogMock } = vi.hoisted(() => ({
  toasts: [] as Array<{ type: string; message: string; action?: { label: string; onClick: () => void } }>,
  loadCatalogMock: vi.fn(),
}));
vi.mock("../src/modelCatalog.ts", () => ({ loadCatalog: loadCatalogMock }));

import { contractToast, setContractToastSink } from "../src/contractToast.ts";
import { useCatalogContractStore } from "../src/catalogContractStore.ts";

// Toasts fire through the contract seam — record them the same way.
setContractToastSink((type, message, action) => {
  toasts.push({ type, message, action });
});
import type { CatalogContractRecord } from "../src/catalogContractStore.ts";

const err = console.error;
beforeEach(() => {
  console.error = () => {};
  useCatalogContractStore.getState().clear();
  toasts.length = 0;
  loadCatalogMock.mockReset();
});
afterEach(() => {
  console.error = err;
});

const record = () => useCatalogContractStore.getState().record;

describe("reportOk", () => {
  it("marks loaded silently when there was no outage", () => {
    useCatalogContractStore.getState().reportOk();
    assert.deepEqual(record(), { state: "loaded", violations: [], error: null });
    assert.equal(toasts.length, 0);
  });

  it("toasts recovery exactly once after an error outage", () => {
    const s = useCatalogContractStore.getState();
    s.reportError(" 502 Bad Gateway ");
    assert.equal(record().error, "502 Bad Gateway"); // trimmed
    assert.equal(toasts.length, 1);
    useCatalogContractStore.getState().reportOk();
    assert.equal(record().state, "loaded");
    assert.equal(toasts.length, 2);
    assert.equal(toasts[1]!.type, "info");
    assert.match(toasts[1]!.message, /back online/);
  });

  it("a violation clearing toasts nothing (repopulation is signal enough)", () => {
    const s = useCatalogContractStore.getState();
    s.reportViolation([{ kind: "catalog", message: "bad" }]);
    const n = toasts.length;
    useCatalogContractStore.getState().reportOk();
    assert.equal(toasts.length, n);
  });
});

describe("THE SINK-SAFE REPORT PATHS (audit R-S4)", () => {
  // Cold boot: the module-warm ensureCatalog races the entry face that
  // wires the sink. contractToast stays loud for direct callers, but the
  // STORE outcome paths must never throw through their result.
  it("an unwired recovery (reportOk after outage) still records loaded — the toast is lost + logged, not thrown", () => {
    setContractToastSink(null); // unwire for this arm
    try {
      useCatalogContractStore.getState().reportError("502 Bad Gateway");
      assert.equal(record().state, "error");
      // the recovery: MUST not throw despite the unwired sink
      useCatalogContractStore.getState().reportOk();
      assert.deepEqual(record(), { state: "loaded", violations: [], error: null });
    } finally {
      setContractToastSink((type, message, action) => {
        toasts.push({ type, message, action });
      });
    }
  });

  it("an unwired reportError / reportViolation still records the verdict", () => {
    setContractToastSink(null);
    try {
      useCatalogContractStore.getState().reportError("network down");
      assert.equal(record().state, "error");
      assert.equal(record().error, "network down");
      useCatalogContractStore.getState().reportViolation([{ message: "bad shape" }] as never);
      assert.equal(record().state, "violation");
    } finally {
      setContractToastSink((type, message, action) => {
        toasts.push({ type, message, action });
      });
    }
  });

  it("contractToast itself stays loud (the law) — only the store paths are fenced", () => {
    setContractToastSink(null);
    try {
      assert.throws(() => contractToast("info", "direct fire"));
    } finally {
      setContractToastSink((type, message, action) => {
        toasts.push({ type, message, action });
      });
    }
  });
});

describe("reportViolation", () => {
  it("records the violations and toasts with a Retry action", () => {
    const violations = [{ kind: "lora", message: "missing" }];
    useCatalogContractStore.getState().reportViolation(violations);
    assert.deepEqual(record(), { state: "violation", violations, error: null });
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]!.type, "error");
    assert.match(toasts[0]!.message, /lora: missing/);
    assert.equal(toasts[0]!.action?.label, "Retry");
  });

  it("renders catalog-kind violations without a kind prefix", () => {
    useCatalogContractStore.getState().reportViolation([{ kind: "catalog", message: "shape bad" }]);
    assert.match(toasts[0]!.message, /shape bad/);
    assert.ok(!toasts[0]!.message.includes("catalog:"));
    useCatalogContractStore.getState().reportViolation([{ kind: "", message: "kindless" }]);
    assert.match(toasts[1]!.message, /kindless/);
  });

  it("falls back to the generic line for an empty violation list", () => {
    useCatalogContractStore.getState().reportViolation([]);
    assert.match(toasts[0]!.message, /did not match the expected shape/);
  });

  it("the Retry action re-fetches and the funnel re-reports", async () => {
    loadCatalogMock.mockResolvedValue({ ok: true });
    useCatalogContractStore.getState().reportViolation([{ kind: "catalog", message: "x" }]);
    const retry = toasts[0]!.action?.onClick;
    assert.ok(retry);
    retry!();
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(loadCatalogMock.mock.calls[0], [{ force: true }]);
  });

  it("a failing re-fetch stays silent (the funnel already re-toasted)", async () => {
    loadCatalogMock.mockRejectedValue(new Error("still down"));
    useCatalogContractStore.getState().reportError("still down");
    const n = toasts.length;
    const retry = toasts[0]!.action?.onClick;
    retry!();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(toasts.length, n); // catch arm: no fresh toast here
  });
});

describe("reportError latch", () => {
  it("toasts once per outage, again on a new message, again after recovery", () => {
    const s = useCatalogContractStore.getState();
    s.reportError("boom");
    assert.equal(record().state, "error");
    assert.equal(toasts.length, 1);
    s.reportError("boom"); // same outage — latched
    s.reportError("boom");
    assert.equal(toasts.length, 1);
    assert.equal(record().error, "boom"); // record stays per-attempt truthful
    s.reportError("different"); // new information — toasts once more
    assert.equal(toasts.length, 2);
    s.reportOk(); // re-arms (recovery toast)
    const n = toasts.length;
    s.reportError("boom"); // next outage announces itself exactly once
    assert.equal(toasts.length, n + 1);
    s.reportError("boom");
    assert.equal(toasts.length, n + 1);
  });

  it("clear() re-arms the latch and resets to idle", () => {
    const s = useCatalogContractStore.getState();
    s.reportError("boom");
    assert.equal(toasts.length, 1);
    s.clear();
    assert.deepEqual(record(), { state: "idle", violations: [], error: null });
    s.reportError("boom");
    assert.equal(toasts.length, 2);
  });
});

describe("subscribe / setState plumbing", () => {
  it("notifies subscribers on every mutation, stops after unsubscribe", () => {
    const seen: string[] = [];
    const unsub = useCatalogContractStore.subscribe(() => {
      seen.push(useCatalogContractStore.getState().record.state);
    });
    useCatalogContractStore.getState().reportOk();
    assert.deepEqual(seen, ["loaded"]);
    unsub();
    useCatalogContractStore.getState().reportViolation([{ kind: "catalog", message: "x" }]);
    assert.deepEqual(seen, ["loaded"]); // nobody notified after unsubscribe
  });

  it("setState merges function patches", () => {
    useCatalogContractStore.getState().reportOk();
    useCatalogContractStore.setState((s) => ({ record: { ...s.record, error: "fn" } }));
    assert.equal(record().error, "fn");
    assert.equal(record().state, "loaded");
  });

  it("setState honors replace (and the store survives it)", () => {
    const saved = useCatalogContractStore.getState();
    const replacement = { ...saved, record: { ...saved.record, error: "whole" } };
    let calls = 0;
    const unsub = useCatalogContractStore.subscribe(() => {
      calls++;
    });
    useCatalogContractStore.setState(replacement, true);
    assert.equal(calls, 1);
    assert.equal(typeof useCatalogContractStore.getState().reportOk, "function");
    // Replacing with the very record already in place keeps the snapshot
    // reference and notifies nobody (the platform store's parity rule, the
    // one the timeline store already pinned).
    useCatalogContractStore.setState(useCatalogContractStore.getState(), true);
    assert.equal(calls, 1);
    unsub();
    useCatalogContractStore.getState().reportOk();
    assert.equal(record().state, "loaded");
  });

  it("exposes the initial record and a destroy no-op", () => {
    assert.deepEqual(useCatalogContractStore.getInitialState().record, {
      state: "idle",
      violations: [],
      error: null,
    });
    useCatalogContractStore.destroy();
  });

  it("pins the hook's selector contract through getState", () => {
    // The hook (v8-ignored, renderer-only) is selector(getState()) with no
    // selector yielding the full state — pin both readings here, no React.
    useCatalogContractStore.getState().reportError("boom");
    const recordOf = (s: ReturnType<typeof useCatalogContractStore.getState>): CatalogContractRecord =>
      s.record;
    assert.deepEqual(recordOf(useCatalogContractStore.getState()), record());
    assert.equal(recordOf(useCatalogContractStore.getState()).state, "error");
  });
});
