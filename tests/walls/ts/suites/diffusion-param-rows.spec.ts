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
// bounds, so any row that drifts from the shared surface fails at
// the family's own name (a byte-correct copy passes — it is the
// same array — and is dead weight the factory deletes at review).
//
// The wall also pins the served order (prompt pair, size pair,
// managed seed, sampler knobs) and the narrowing the edit families
// legitimately declare, so the parameterization cannot quietly widen
// back to the text-to-image envelope.

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { diffusionParamRows, EDIT_DIFFUSION_BOUNDS } from "../../../../packages/engines/comfyui-card-kit/src/paramRows.ts";
import { t2i as qwenImg21T2I } from "../../../../packages/models/qwen-img-21/src/actions.ts";
import { t2i as zImageT2I } from "../../../../packages/models/z-image/src/actions.ts";
import { t2i as animaT2I } from "../../../../packages/models/anima/src/actions.ts";
import { t2i as krea2T2I } from "../../../../packages/models/krea-2/src/actions.ts";
import { edit as edit21 } from "../../../../packages/models/qwen-img-edit-21/src/actions.ts";
import { edit as edit2511 } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";

/** The text-to-image surface: the factory's defaults, in full. */
const T2I_ROWS = diffusionParamRows();

/** qwen-img-21's OWN tail row (audit 004/C4, 2026-10-22): the
 * reference-guided lane's image_list seat — the only t2i family
 * whose encoder reads references, so the row is the family's own
 * and rides AFTER the shared block (the edit families' own
 * head/tail rows around their core are the precedent). */
const QWEN21_OWN_TAIL = [{ name: "reference_images", type: "image_list" }];

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

/** The adopters, DERIVED FROM THE TREE — not an import list. A
 * family that spreads the factory self-joins this wall; the named
 * maps below must then grow with it (a hand list stayed blind to a
 * seventh family — the F2 verification's hole (b)). */
const modelsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../packages/models");
const ADOPTERS = readdirSync(modelsDir).filter((f) => {
  try {
    return readFileSync(join(modelsDir, f, "src", "actions.ts"), "utf8").includes("diffusionParamRows(");
  } catch { return false; }
});

describe("the shared diffusion param surface (one home)", () => {
  it("every tree adopter is asserted by name here (the census is the tree, not this file)", () => {
    const asserted = new Set(["qwen-img-21", "z-image", "anima", "krea-2", "qwen-img-edit-21", "qwen-img-edit-2511"]);
    assert.deepEqual(
      ADOPTERS.filter((f) => !asserted.has(f)),
      [],
      "a family spreads diffusionParamRows() but has no named assertion in this wall — add its expectations",
    );
    assert.deepEqual(ADOPTERS.length, 6, "the adopter census changed — update this pin and the named assertions together");
  });

  it("the four text-to-image families declare the factory's rows, not a hand copy", () => {
    for (const [family, action, own] of [
      ["qwen-img-21", qwenImg21T2I, QWEN21_OWN_TAIL],
      ["z-image", zImageT2I, []],
      ["anima", animaT2I, []],
      ["krea-2", krea2T2I, []],
    ] as const) {
      assert.deepEqual(
        action.params,
        [...T2I_ROWS, ...own],
        `${family}'s t2i action must spread the shared rows — a row drifted from the factory fails here at the family's name`,
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
