// @melite/comfyui-card-kit — the poser morph vocabulary wall (stroke
// 90): the hand-listed const ≡ the DOOR PIN, set-equal and
// order-equal (the vocab.ts law — the pin drifts, the wall fails,
// the const is edited by hand; never a runtime read into schemas).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANNY_MORPH_LABELS, ANNY_MORPH_RANGE, ANNY_MORPH_DEFAULT } from "../src/morphs.ts";

const PIN = JSON.parse(
  readFileSync(new URL("../../comfyui-cordis/data/poser-identity-space-anny.json", import.meta.url), "utf8"),
) as { labels: string[]; range: [number, number]; defaults: number[] };

describe("the poser morph vocabulary (the door pin law)", () => {
  it("254 labels, set-equal AND order-equal with the pin", () => {
    assert.equal(ANNY_MORPH_LABELS.length, 254);
    assert.deepEqual([...ANNY_MORPH_LABELS], PIN.labels);
    assert.equal(new Set(ANNY_MORPH_LABELS).size, 254, "labels are unique");
  });

  it("the range and the default ride the pin ([-1, 2], all 0)", () => {
    assert.deepEqual(ANNY_MORPH_RANGE, PIN.range);
    assert.equal(ANNY_MORPH_DEFAULT, 0);
    assert.ok(PIN.defaults.every((v) => v === 0), "the pin's own defaults are all 0");
  });

  it("the labels are the served local-changes spelling (dashed, l/r-prefixed parts ride)", () => {
    assert.ok(ANNY_MORPH_LABELS.includes("l-lowerarm-scale-depth-incr"));
    assert.ok(ANNY_MORPH_LABELS.every((l) => /^[a-z0-9-]+$/.test(l)), "the served spelling");
  });
});
