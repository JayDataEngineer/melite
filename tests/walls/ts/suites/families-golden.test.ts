// families-golden.test.ts — THE FAMILY TABLE GOLDEN WALL (the
// discharge stroke, 2026-09-08): the booted table (59 families,
// each a plugin registering through ctx.effect(() =>
// ctx.models.registerFamily(DECL))) is DEEP-EQUAL to the frozen
// golden snapshot (tests/walls/ts/data/families-golden.json).
//
// The golden replaced registry.generated.ts (the godfile): the
// declaration truth now lives in 59 per-family files under
// src/models/families/<genre>/<id>.ts — this wall pins that their
// SUM is still the exact table the estate served the day the
// godfile retired. A family change = golden regold (with cause),
// never a silent drift.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/families-golden.test.ts
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getModel, modelIds, registryIds } from "../../../../packages/engines/comfyui/src/models/models.ts";

const GOLDEN = JSON.parse(
  readFileSync(new URL("../data/families-golden.json", import.meta.url), "utf8"),
) as Record<string, Record<string, unknown>>;

describe("the family table ≡ golden (the godfile retirement wall)", () => {
  it("boots the model registry + its derived routes (the hierarchy stroke)", (): void => {
    // THE HIERARCHY (correction 2026-09-08): 53 MODELS (one per
    // engine-lane unit — ace-step is ONE model: turbo/base/sft/xl
    // variants × native/bf16 quants; qwen3-tts ONE model with the
    // base variant) + the derived route view (every flat id the
    // runtime addresses). The golden pins the full derived view.
    assert.equal(registryIds().length, 51);
    assert.equal(Object.keys(GOLDEN).length, modelIds().length);
  });

  it("every family row is deep-equal to its golden snapshot", (): void => {
    for (const id of modelIds()) {
      assert.ok(GOLDEN[id] !== undefined, `${id} missing from golden (regold or revert)`);
      assert.deepEqual(getModel(id), GOLDEN[id], `${id} drifted from golden`);
    }
  });

  it("the golden ids are exactly the table ids", (): void => {
    assert.deepEqual([...new Set([...modelIds(), ...Object.keys(GOLDEN)])].sort(), modelIds());
  });

  it("the compose models carry lane_inputs (the facts splice table)", (): void => {
    // 30 flat carriers − the folded tts pair (one model now) = 29
    // MODEL declarations (MOSS-SFX v2 is its own architecture, its
    // own model, its own lane table); their routes inherit the lane
    // table at the derived read (the route view carries 54).
    const withLanes = registryIds().filter((id) => getModel(id).lane_inputs !== undefined);
    assert.equal(withLanes.length, 29);
    assert.ok(modelIds().filter((id) => getModel(id).lane_inputs !== undefined).length > withLanes.length,
      "the derived route view inherits lane_inputs (the cascade)");
  });
});
