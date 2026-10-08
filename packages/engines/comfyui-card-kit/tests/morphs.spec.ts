// @melite/comfyui-card-kit — the poser morph vocabulary wall (stroke
// 90): the hand-listed const ≡ the DOOR PIN, set-equal and
// order-equal (the vocab.ts law — the pin drifts, the wall fails,
// the const is edited by hand; never a runtime read into schemas).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANNY_MORPH_LABELS, ANNY_MORPH_RANGE, ANNY_MORPH_DEFAULT } from "../src/morphs.ts";

// THE PIN READ IS CHECKOUT-ROOT-ANCHORED (the poser-hop cure,
// 2026-10-18): the shipped seat carries the hand pin (the vocab.ts
// law — no runtime read into schemas, so no consumer-install hop
// exists); only this wall reads the door pin, and it used to reach
// it through a repo-shaped sibling hop (../../comfyui-cordis from
// this package's tests). The root-anchored spelling below names no
// sibling shape — the same idiom as the walls tier's own reads.
const PIN = JSON.parse(
  readFileSync(join(process.cwd(), "packages", "engines", "comfyui-cordis", "data", "poser-identity-space-anny.json"), "utf8"),
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
