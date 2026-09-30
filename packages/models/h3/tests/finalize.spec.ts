// @melite/models-h3 — THE T4 STRIP PASS, at its new home (the
// kit-arm retirement, 2026-09-30). The strip is this family's
// serialization law: the t4 templates omit these pin defaults, so
// the engine would auto-fill them at serialization, and the t4r
// branch carries all of them explicitly and strips nothing. The cases
// moved here with the function.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { finalizeH3 } from "../src/finalize.ts";

describe("finalizeH3 (the t4 strip pass)", () => {
  it("finalizeH3: the t4r family marker rides untouched (strip never fires)", () => {
    const out = finalizeH3({
      "MiniMaxH3ImageToVideo.0": { class_type: "MiniMaxH3ImageToVideo", inputs: { image: "x.png" } },
    } as never);
    assert.deepEqual(out, {
      "MiniMaxH3ImageToVideo.0": { class_type: "MiniMaxH3ImageToVideo", inputs: { image: "x.png" } },
    }, "the t4r marker short-circuits the strip");
  });

  it("finalizeH3: a non-t4r graph strips the t4 autofill keys, keeps the rest", () => {
    const out = finalizeH3({
      L: { class_type: "LTX_lora_loader", inputs: { lora_ui: "", strength: 0.8 } },
      S: { class_type: "SeedVR2LoadVAEModel", inputs: { cache_model: true, decode_tiled: "", keep: 1 } },
      X: { class_type: "LoadImage", inputs: { image: "ref.png" } },
    } as never);
    assert.ok(!("lora_ui" in out.L.inputs), "a strip-table empty drops");
    assert.equal(out.L.inputs.strength, 0.8, "a non-empty table value stays");
    assert.ok(!("decode_tiled" in out.S.inputs), "the seed strip row drops empties too");
    assert.equal(out.S.inputs.keep, 1, "untouched seed keys stay");
    assert.equal(out.X.inputs.image, "ref.png", "classes outside the table ride");
  });
});
