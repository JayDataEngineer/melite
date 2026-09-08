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
import { getModel, modelIds } from "../../../../packages/engines/comfyui/src/models/models.ts";

const GOLDEN = JSON.parse(
  readFileSync(new URL("../data/families-golden.json", import.meta.url), "utf8"),
) as Record<string, Record<string, unknown>>;

describe("the family table ≡ golden (the godfile retirement wall)", () => {
  it("boots all 59 families", (): void => {
    assert.equal(modelIds().length, 59);
    assert.equal(Object.keys(GOLDEN).length, 59);
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

  it("the 30 compose families carry lane_inputs (the facts splice table)", (): void => {
    const withLanes = modelIds().filter((id) => getModel(id).lane_inputs !== undefined);
    assert.equal(withLanes.length, 30);
  });
});
