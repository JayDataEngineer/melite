/**
 * h3-surface-size — THE SERVE HALF OF THE TIMELINE CARD'S WIDTH LAW
 * (the 2026-11-01 operator burn: the timeline card rendered narrower
 * than sibling studio cards). The card declares surface
 * {size:'huge', layout:'studio'} (the registry arm lives in
 * h3-timeline's card-surface-width.spec); THIS arm judges the estate's
 * emission: the served form-spec doc must carry the size verbatim —
 * the drill's envelope lift reads doc.size, so a serve that drops it
 * bounds the card to 760px in the operator's seat even with the
 * declaration intact (the deployment-side class the restart window
 * delivered).
 */
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";
import { formSpecArm } from "../src/discovery.ts";

/** THE TRANSIENT-GENRE RACE (discovery.spec's wrapper verbatim, the
 *  bounded scratch-signature backoff): enhance-recipes.spec lays
 *  ephemeral zz-cov-<pid> genres under the real models root — a
 *  parallel worker's sweep here can catch one mid-flight. */
const formSpecSweep = async (...args: Parameters<typeof formSpecArm>): Promise<ReturnType<typeof formSpecArm>> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await formSpecArm(...args);
    } catch (error) {
      if (attempt >= 4 || !/zz-cov-\d+/.test(String(error))) throw error;
      vi.useFakeTimers();
      try {
        const slept = new Promise((r): void => { setTimeout(r, 200) });
        await vi.advanceTimersByTimeAsync(200);
        await slept;
      } finally {
        vi.useRealTimers();
      }
    }
  }
};

describe("h3-surface-size (the served h3 doc carries the huge studio surface)", () => {
  it("ARM — THE SERVE: the family doc serves size 'huge' + layout 'studio'", async () => {
    const doc = await formSpecSweep("h3");
    assert.ok(doc, "the served h3 form-spec answers");
    assert.equal(doc.size, "huge");
    assert.equal(doc.layout, "studio");
  });

  it("ARM — THE CARD-ID ALIAS: the card-addressed doc serves the same surface", async () => {
    const doc = await formSpecSweep("h3-timeline");
    assert.ok(doc, "the served h3-timeline form-spec answers");
    assert.equal(doc.size, "huge");
    assert.equal(doc.layout, "studio");
  });
});
