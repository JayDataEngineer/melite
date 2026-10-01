// diffusion-param-rows.spec.ts — THE SHARED SURFACE IS ONE HOME
// (the atom-vocabulary attainment audit's F2, 2026-10-12).
//
// Six actions across six families used to re-type the same nine
// diffusion rows by hand: the four text-to-image blocks were
// byte-identical, the two edit blocks byte-identical. A bounds
// change was a six-file edit with nothing to catch a miss, and the
// rows cited the engine vocabularies in six import blocks. The
// surface now lives in ONE factory (comfyui-card-kit's
// paramRows.ts) and this wall holds it there: every family's
// declared rows must EQUAL the factory's output for that family's
// bounds, so a hand-retyped row — even a byte-correct copy — fails.
//
// The wall also pins the served order (prompt pair, size pair,
// managed seed, sampler knobs) and the narrowing the edit families
// legitimately declare, so the parameterization cannot quietly widen
// back to the text-to-image envelope.

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { diffusionParamRows, EDIT_DIFFUSION_BOUNDS } from "../../../../packages/engines/comfyui-card-kit/src/paramRows.ts";
import { t2i as qwenImg21T2I } from "../../../../packages/models/qwen-img-21/src/actions.ts";
import { t2i as zImageT2I } from "../../../../packages/models/z-image/src/actions.ts";
import { t2i as animaT2I } from "../../../../packages/models/anima/src/actions.ts";
import { t2i as krea2T2I } from "../../../../packages/models/krea-2/src/actions.ts";
import { edit as edit21 } from "../../../../packages/models/qwen-img-edit-21/src/actions.ts";
import { edit as edit2511 } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";

/** The text-to-image surface: the factory's defaults, in full. */
const T2I_ROWS = diffusionParamRows();

/** The two edit families' own rows, wrapped around the shared core. */
const EDIT_OWN_HEAD = [
  { name: "input_images", type: "image_list" },
  { name: "image1", type: "string" },
  { name: "image2", type: "string" },
  { name: "image3", type: "string" },
  { name: "reference_images", type: "image_list" },
];
const EDIT_OWN_TAIL = [
  { name: "use_stock_nodes", type: "boolean" },
  { name: "double_reference", type: "boolean" },
];
const EDIT_ROWS = [...EDIT_OWN_HEAD, ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS), ...EDIT_OWN_TAIL];

describe("the shared diffusion param surface (one home)", () => {
  it("the four text-to-image families declare the factory's rows, not a hand copy", () => {
    for (const [family, action] of [
      ["qwen-img-21", qwenImg21T2I],
      ["z-image", zImageT2I],
      ["anima", animaT2I],
      ["krea-2", krea2T2I],
    ] as const) {
      assert.deepEqual(
        action.params,
        T2I_ROWS,
        `${family}'s t2i action must spread the shared rows — a hand-typed row fails here even when byte-correct`,
      );
    }
  });

  it("the two edit families declare the narrowed rows around their own", () => {
    for (const [family, action] of [
      ["qwen-img-edit-21", edit21],
      ["qwen-img-edit-2511", edit2511],
    ] as const) {
      assert.deepEqual(
        action.params,
        EDIT_ROWS,
        `${family}'s edit action must wrap the shared rows with its own five head and two tail rows`,
      );
    }
  });

  it("the served order is the canonical one: prompt pair, size pair, managed seed, sampler knobs", () => {
    assert.deepEqual(
      T2I_ROWS.map((row) => row.name),
      ["prompt", "negative_prompt", "width", "height", "seed", "steps", "cfg", "sampler", "scheduler"],
    );
  });

  it("the parameterization is load-bearing: the edit narrowing is NOT the text-to-image envelope", () => {
    const editCore = diffusionParamRows(EDIT_DIFFUSION_BOUNDS);
    const steps = editCore.find((row) => row.name === "steps");
    const cfg = editCore.find((row) => row.name === "cfg");
    assert.deepEqual(steps?.bounds, [1, 50], "the edit families' steps envelope");
    assert.deepEqual(cfg?.bounds, [0.1, 10], "the edit families' cfg envelope");
    const width = editCore.find((row) => row.name === "width");
    assert.equal(width?.bounds, undefined, "size: null declares the row UNBOUNDED, never a default");
    // and the defaults are the text-to-image envelope, still bounded
    const t2iSteps = T2I_ROWS.find((row) => row.name === "steps");
    assert.deepEqual(t2iSteps?.bounds, [1, 100]);
    assert.notDeepEqual(steps?.bounds, t2iSteps?.bounds, "a silent widening to the default would fail here");
  });

  it("the managed seed rides the shared block, so no family re-derives it", () => {
    for (const row of [...T2I_ROWS, ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS)]) {
      if (row.name === "seed") assert.equal(row.rule, "seed-sentinel", "the managed affair is the shared block's");
    }
  });
});
