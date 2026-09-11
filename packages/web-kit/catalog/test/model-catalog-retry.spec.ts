// model-catalog-retry.spec.ts — ensureCatalog's 3s-retry half: a failure
// while a retry pends clears and reschedules, then the fired retry
// succeeds (the timer-fire lines + the then FALSE arm). Separate file
// because _loaded latches on the first success.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { ensureCatalog, isCatalogLoaded } from "../src/modelCatalog.ts";
import { useToastStore } from "@melite/ui";

const realFetch = globalThis.fetch;
const realAddToast = useToastStore.getState().addToast;
afterEach(() => {
  globalThis.fetch = realFetch;
  useToastStore.setState({ addToast: realAddToast });
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const GOOD = {
  families: { v1: { label: "V1" } },
  models: { m1: { family: "v1", form: "form_generate", label: "M1" } },
};

describe("ensureCatalog background retry", () => {
  it("fires the scheduled retry, which succeeds with no timer pending", async () => {
    useToastStore.setState({ addToast: (() => {}) as typeof realAddToast });
    let calls = 0;
    let good = false;
    globalThis.fetch = (async () => {
      calls++;
      return good ? json(GOOD) : new Response("bad", { status: 400 });
    }) as typeof fetch;
    ensureCatalog(); // fails → T1 pending
    await sleep(150);
    ensureCatalog(); // fails again → clears T1, T2 pending
    await sleep(150);
    assert.equal(calls, 2);
    good = true;
    await sleep(3400); // T2 fires → success (timer null in then)
    assert.equal(calls, 3);
    assert.equal(isCatalogLoaded(), true);
  }, 20_000);
});
