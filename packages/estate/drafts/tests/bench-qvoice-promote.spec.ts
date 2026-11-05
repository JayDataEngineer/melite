// The F49 storage-seam wall (2026-11-01): EVERY params-bearing write
// on the bench stores a flat `qvoice: "<path>"` press BAG-SHAPED —
// the mods surface chips only ARRAY-valued params, so a flat press
// used to land voiceless in the studio's mods bar (compose read it,
// the chip never rendered). The promotion rides the same wireParams
// seat as the transport unwrap; these arms pin the STORED shape
// through the real add/patch doors.
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { addStageBench, getBench, patchBench, ensureBench } from "../src/bench.ts";
import { boot } from "./bench-helpers.ts";

type Row = { id: string; params: Record<string, unknown> };
const stage = (doc: unknown, id: string): Row =>
  (doc as { stages: Row[] }).stages.find((r) => r.id === id)!;

describe("the flat-qvoice promotion at the store seat", () => {
  test("a flat qvoice press lands bag-shaped on add", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", {
      card: "tts", expect_rev: 0,
      params: { text: "hello there", qvoice: "/voices/kunoichi.qvoice" },
    });
    const st = stage(getBench(drafts, "s"), "s_0");
    assert.deepEqual(st.params["qvoice"], [
      { qvoice: "/voices/kunoichi.qvoice", voice_strength: 1 },
    ]);
  });

  test("a stated strength folds into the stored row", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", {
      card: "tts", expect_rev: 0,
      params: { text: "hi", qvoice: "/v.qvoice", voice_strength: 1.4 },
    });
    const st = stage(getBench(drafts, "s"), "s_0");
    assert.deepEqual(st.params["qvoice"], [{ qvoice: "/v.qvoice", voice_strength: 1.4 }]);
  });

  test("patch promotes too — and a bag press rides untouched", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", {
      card: "tts", expect_rev: 0, params: { text: "hi" },
    });
    const first = await patchBench(drafts, "s", {
      stage: "s_0", params: { qvoice: "/v.qvoice", voice_strength: 0.5 }, expect_rev: 1,
    });
    const st = stage(getBench(drafts, "s"), "s_0");
    assert.deepEqual(st.params["qvoice"], [{ qvoice: "/v.qvoice", voice_strength: 0.5 }]);

    const bag = [{ qvoice: "/v.qvoice", voice_strength: 1.2 }];
    await patchBench(drafts, "s", {
      stage: "s_0", params: { qvoice: bag }, expect_rev: first.rev,
    });
    assert.deepEqual(stage(getBench(drafts, "s"), "s_0").params["qvoice"], bag);
  });

  test("a non-qvoice stage stores byte-for-byte as before", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", {
      card: "image-gen", expect_rev: 0,
      params: { prompt: "a lighthouse", qvoiceLookalike: "/not/a/voice" },
    });
    const st = stage(getBench(drafts, "s"), "s_0");
    assert.equal(st.params["prompt"], "a lighthouse");
    assert.equal(st.params["qvoiceLookalike"], "/not/a/voice");
    assert.equal("qvoice" in st.params, false);
  });
});
