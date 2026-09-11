// run-status.spec.ts — the live-run status probe slot: null probe
// voices null, a registered probe delegates, re-registering null
// restores the slot. Order matters (module state): the default-null
// read runs first.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { registerRunStatusProbe, runStatus } from "../src/runStatus.ts";

describe("runStatus", () => {
  it("no live owner in this process voices null", () => {
    assert.equal(runStatus("r1"), null);
  });

  it("a registered probe delegates by run id", () => {
    registerRunStatusProbe((runId: string): string | null =>
      runId === "live" ? "running" : null,
    );
    assert.equal(runStatus("live"), "running");
    assert.equal(runStatus("gone"), null);
  });

  it("re-registering null restores the empty slot", () => {
    registerRunStatusProbe(null);
    assert.equal(runStatus("live"), null);
  });
});
