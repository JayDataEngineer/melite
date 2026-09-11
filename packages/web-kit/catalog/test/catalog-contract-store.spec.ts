// catalog-contract-store.spec.ts — the catalog verdict store: ok /
// violation / error reports, the once-per-outage toast latch, retry.
import { describe, it, afterEach, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";

const { toasts, loadCatalogMock } = vi.hoisted(() => ({
  toasts: [] as Array<{ type: string; message: string; action?: { label: string; onClick: () => void } }>,
  loadCatalogMock: vi.fn(),
}));
vi.mock("@melite/ui", () => ({
  useToastStore: { getState: () => ({ addToast: (type: string, message: string, action?: { label: string; onClick: () => void }) => {
    toasts.push({ type, message, action });
  } }) },
}));
vi.mock("../src/modelCatalog.ts", () => ({ loadCatalog: loadCatalogMock }));

import { useCatalogContractStore } from "../src/catalogContractStore.ts";

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
