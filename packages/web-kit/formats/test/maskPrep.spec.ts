// maskPrep.spec.ts — the TypeScript twin of mask_prep.py: op container,
// matrix helpers, disk morph, feather, threshold/invert, the fixed chain,
// outpaint geometry, and the ImageData bridge.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  DEFAULT_ALIGNMENT,
  applyOutpaintOverlap,
  applyPrep,
  cloneMat,
  coverage,
  deriveOutpaint,
  diskRowHalfWidths,
  featherMask,
  gaussianKernel,
  growMask,
  invertMask,
  isIdentityPrep,
  maskFromImageData,
  matFromNested,
  matToNested,
  roundToMultiple,
  thresholdMask,
  tintMaskToImageData,
  unionMaskAt,
} from "../src/maskPrep.ts";
import type { MaskMat, MaskPrep, OutpaintSpec } from "../src/maskPrep.ts";

const mat = (rows: number[][]): MaskMat => matFromNested(rows);
const val = (m: MaskMat, x: number, y: number): number => m.data[y * m.w + x]!;
const IDENTITY: MaskPrep = { grow: 0, feather: 0, threshold: 0, invert: false };
const SPEC: OutpaintSpec = { top: 1, right: 1, bottom: 1, left: 1, overlap: 0 };

const approx = (a: number, b: number, eps = 1e-9): void => {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);
};

describe("isIdentityPrep", () => {
  it("recognizes the identity op", () => {
    assert.equal(isIdentityPrep(IDENTITY), true);
    assert.equal(isIdentityPrep({ ...IDENTITY, threshold: -1 }), true);
  });

  it("rejects every non-identity arm", () => {
    assert.equal(isIdentityPrep({ ...IDENTITY, grow: 1 }), false);
    assert.equal(isIdentityPrep({ ...IDENTITY, feather: 2 }), false);
    assert.equal(isIdentityPrep({ ...IDENTITY, threshold: 0.5 }), false);
    assert.equal(isIdentityPrep({ ...IDENTITY, invert: true }), false);
  });
});

describe("matrix helpers", () => {
  it("round-trips nested rows", () => {
    const m = mat([[0, 0.5], [1, 0.25]]);
    assert.equal(m.w, 2);
    assert.equal(m.h, 2);
    assert.deepEqual(matToNested(m), [[0, 0.5], [1, 0.25]]);
  });

  it("rejects ragged rows", () => {
    assert.throws(() => matFromNested([[1, 2], [3]]), /ragged matrix/);
  });

  it("handles the empty matrix", () => {
    const m = matFromNested([]);
    assert.deepEqual([m.w, m.h], [0, 0]);
    assert.deepEqual(matToNested(m), []);
  });

  it("clones without aliasing", () => {
    const m = mat([[1]]);
    const c = cloneMat(m);
    assert.deepEqual(matToNested(c), [[1]]);
    c.data[0] = 9;
    assert.equal(m.data[0], 1);
  });
});

describe("diskRowHalfWidths", () => {
  it("computes exact Euclidean half-widths", () => {
    assert.deepEqual(diskRowHalfWidths(2), [0, 1, 2, 1, 0]);
    assert.deepEqual(diskRowHalfWidths(1), [0, 1, 0]);
    assert.deepEqual(diskRowHalfWidths(0), [0]);
  });
});

describe("growMask", () => {
  it("returns a clone for px=0", () => {
    const m = mat([[1, 0], [0, 0]]);
    const out = growMask(m, 0);
    assert.deepEqual(matToNested(out), [[1, 0], [0, 0]]);
    assert.notEqual(out.data, m.data);
  });

  it("dilates with an exact disk (plus shape at r=1)", () => {
    const out = growMask(mat([[0, 0, 0], [0, 1, 0], [0, 0, 0]]), 1);
    assert.deepEqual(matToNested(out), [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ]);
  });

  it("erodes leniently at the edges (full canvas survives r=1)", () => {
    const full = mat([[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]);
    assert.deepEqual(matToNested(growMask(full, -1)), matToNested(full));
  });

  it("erodes holes outward", () => {
    const out = growMask(mat([[1, 1, 1], [1, 0, 1], [1, 1, 1]]), -1);
    assert.deepEqual(matToNested(out), [
      [1, 0, 1],
      [0, 0, 0],
      [1, 0, 1],
    ]);
  });

  it("throws (no silent fallback) when erosion empties the mask", () => {
    assert.throws(
      () => growMask(mat([[0, 0, 0], [0, 1, 0], [0, 0, 0]]), -1),
      /eroded the mask to NOTHING/,
    );
  });
});

describe("gaussianKernel + featherMask", () => {
  it("builds a normalized symmetric kernel", () => {
    const k = gaussianKernel(2);
    assert.equal(k.length, 7);
    approx(Array.from(k).reduce((s, v) => s + v, 0), 1);
    for (let i = 0; i < k.length; i++) approx(k[i]!, k[k.length - 1 - i]!);
  });

  it("returns a clone for radius <= 0", () => {
    const m = mat([[1, 0], [0, 1]]);
    assert.deepEqual(matToNested(featherMask(m, 0)), [[1, 0], [0, 1]]);
    assert.deepEqual(matToNested(featherMask(m, -2)), [[1, 0], [0, 1]]);
  });

  it("spreads a point with the peak at the center", () => {
    const m = mat([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const out = featherMask(m, 2);
    const c = val(out, 2, 2);
    assert.ok(c > 0 && c < 1);
    assert.ok(val(out, 0, 0) >= 0);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(val(out, x, y) <= c);
      }
    }
  });

  it("preserves a constant field on both axes", () => {
    const m = mat([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
    const out = featherMask(m, 3);
    for (const v of out.data) approx(v, 1);
  });
});

describe("thresholdMask / invertMask / coverage", () => {
  it("returns a clone for threshold <= 0", () => {
    const m = mat([[0.7]]);
    assert.deepEqual(matToNested(thresholdMask(m, 0)), [[0.7]]);
    assert.deepEqual(matToNested(thresholdMask(m, -1)), [[0.7]]);
  });

  it("binarizes at >= t", () => {
    assert.deepEqual(matToNested(thresholdMask(mat([[0, 0.4, 0.5, 0.9]]), 0.5)), [[0, 0, 1, 1]]);
  });

  it("inverts (1 - m)", () => {
    assert.deepEqual(matToNested(invertMask(mat([[0, 1, 0.25]]))), [[1, 0, 0.75]]);
  });

  it("measures the mean", () => {
    approx(coverage(mat([[0, 1], [0.5, 0.5]])), 0.5);
  });
});

describe("applyPrep", () => {
  it("reports identity for the identity op", () => {
    const { mask, report } = applyPrep(mat([[0.3]]), IDENTITY);
    assert.deepEqual(matToNested(mask), [[0.3]]);
    assert.deepEqual(report, { applied: ["identity"] });
  });

  it("applies the fixed chain grow → feather → threshold → invert", () => {
    const { mask, report } = applyPrep(mat([[0, 0, 0], [0, 1, 0], [0, 0, 0]]), {
      grow: 1,
      feather: 2,
      threshold: 0.5,
      invert: true,
    });
    assert.deepEqual(report, {
      applied: ["grow(1px)", "feather(2px)", "threshold(0.5)", "invert"],
    });
    assert.equal(mask.w, 3);
    // Grow(1) makes a plus, feather spreads it (corners ≈0.43, core ≈0.64),
    // threshold(0.5) keeps the core, invert flips it.
    assert.equal(val(mask, 1, 1), 0);
    assert.equal(val(mask, 0, 0), 1);
  });

  it("applies each op alone", () => {
    const m = mat([[0, 1]]);
    assert.deepEqual(applyPrep(m, { ...IDENTITY, grow: 1 }).report, { applied: ["grow(1px)"] });
    assert.deepEqual(applyPrep(m, { ...IDENTITY, feather: 2 }).report, { applied: ["feather(2px)"] });
    assert.deepEqual(applyPrep(m, { ...IDENTITY, threshold: 0.5 }).report, { applied: ["threshold(0.5)"] });
    assert.deepEqual(applyPrep(m, { ...IDENTITY, invert: true }).report, { applied: ["invert"] });
  });
});

describe("roundToMultiple", () => {
  it("rounds up to the alignment", () => {
    assert.equal(DEFAULT_ALIGNMENT, 8);
    assert.equal(roundToMultiple(8), 8);
    assert.equal(roundToMultiple(9), 16);
    assert.equal(roundToMultiple(0), 0);
    assert.equal(roundToMultiple(10, 5), 10);
    assert.equal(roundToMultiple(11, 5), 15);
  });

  it("throws for non-positive multiples", () => {
    assert.throws(() => roundToMultiple(8, 0), /alignment multiple must be > 0/);
    assert.throws(() => roundToMultiple(8, -4), /alignment multiple must be > 0/);
  });
});

describe("deriveOutpaint", () => {
  it("derives padded geometry with a border mask", () => {
    const g = deriveOutpaint(10, 10, SPEC);
    assert.equal(g.newW, 16);
    assert.equal(g.newH, 16);
    assert.equal(g.offX, 1);
    assert.equal(g.offY, 1);
    assert.equal(g.actualRight, 5);
    assert.equal(g.actualBottom, 5);
    assert.equal(g.mask.w, 16);
    assert.equal(g.mask.h, 16);
    assert.equal(val(g.mask, 0, 0), 1);
    assert.equal(val(g.mask, 5, 5), 0);
  });

  it("grows the border into the overlap seam", () => {
    const noOverlap = deriveOutpaint(10, 10, SPEC);
    const withOverlap = deriveOutpaint(10, 10, { ...SPEC, overlap: 2 });
    // Just inside the kept rect: 0 without overlap, 1 with.
    assert.equal(val(noOverlap.mask, 1, 1), 0);
    assert.equal(val(withOverlap.mask, 1, 1), 1);
  });

  it("treats fractional overlap as no-op growth", () => {
    const g = deriveOutpaint(10, 10, { ...SPEC, overlap: 0.5 });
    assert.equal(val(g.mask, 5, 5), 0);
  });

  it("throws on bad dims, pads, and overlap", () => {
    assert.throws(() => deriveOutpaint(0, 10, SPEC), /original dims must be positive/);
    assert.throws(() => deriveOutpaint(10, -1, SPEC), /original dims must be positive/);
    assert.throws(() => deriveOutpaint(10, 10, { ...SPEC, top: -1 }), /outpaint pads must be >= 0/);
    assert.throws(() => deriveOutpaint(10, 10, { ...SPEC, right: -1 }), /outpaint pads must be >= 0/);
    assert.throws(() => deriveOutpaint(10, 10, { ...SPEC, bottom: -1 }), /outpaint pads must be >= 0/);
    assert.throws(() => deriveOutpaint(10, 10, { ...SPEC, left: -1 }), /outpaint pads must be >= 0/);
    assert.throws(() => deriveOutpaint(10, 10, { ...SPEC, overlap: -1 }), /overlap must be >= 0/);
  });
});

describe("applyOutpaintOverlap", () => {
  it("throws when pads exceed the canvas", () => {
    const m = mat([[0, 0], [0, 0]]);
    assert.throws(
      () => applyOutpaintOverlap(m, { top: 1, right: 0, bottom: 2, left: 0, overlap: 0 }),
      /exceed canvas 2x2/,
    );
    assert.throws(
      () => applyOutpaintOverlap(m, { top: 0, right: 1, bottom: 0, left: 2, overlap: 0 }),
      /exceed canvas 2x2/,
    );
  });

  it("unions the border over the canvas (max)", () => {
    const m: MaskMat = { w: 6, h: 6, data: new Float64Array(36).fill(0.4) };
    const out = applyOutpaintOverlap(m, { top: 1, right: 1, bottom: 1, left: 1, overlap: 0 });
    assert.equal(val(out, 0, 0), 1);
    // Interior keeps the canvas value (0.4 > grown 0).
    assert.equal(val(out, 3, 3), 0.4);
  });

  it("keeps the stronger canvas value and grows the seam on overlap", () => {
    const hi: MaskMat = { w: 6, h: 6, data: new Float64Array(36).fill(1) };
    assert.equal(val(applyOutpaintOverlap(hi, SPEC), 0, 0), 1);
    const m: MaskMat = { w: 6, h: 6, data: new Float64Array(36) };
    const grown = applyOutpaintOverlap(m, { ...SPEC, overlap: 1 });
    assert.equal(val(grown, 1, 1), 1);
  });
});

describe("unionMaskAt", () => {
  it("places the wired mask 1:1 and unions by max", () => {
    const canvas: MaskMat = { w: 4, h: 4, data: new Float64Array(16).fill(0.8) };
    const wired = mat([[0.5, 0.9], [0.9, 0.5]]);
    const out = unionMaskAt(canvas, wired, 1, 1);
    assert.equal(val(out, 0, 0), 0.8);
    assert.equal(val(out, 1, 1), 0.8);
    assert.equal(val(out, 2, 1), 0.9);
    // Canvas is untouched (clone).
    assert.equal(val(canvas, 2, 1), 0.8);
  });
});

describe("ImageData bridge", () => {
  const fake = (data: number[]): ImageData =>
    ({ width: 2, height: 1, data: new Uint8ClampedArray(data) }) as unknown as ImageData;

  it("reads the alpha carrier by default", () => {
    const m = maskFromImageData(fake([10, 20, 30, 40, 50, 60, 70, 80]));
    assert.equal(m.w, 2);
    assert.equal(m.h, 1);
    approx(m.data[0]!, 40 / 255);
    approx(m.data[1]!, 80 / 255);
  });

  it("reads the red carrier on request", () => {
    const m = maskFromImageData(fake([10, 20, 30, 40, 50, 60, 70, 80]), "red");
    approx(m.data[0]!, 10 / 255);
    approx(m.data[1]!, 50 / 255);
  });

  it("tints proportionally to the mask value", () => {
    const m: MaskMat = { w: 1, h: 2, data: new Float64Array([0, 1]) };
    const img = fake([100, 100, 100, 200, 100, 100, 100, 200]);
    tintMaskToImageData(m, img, 200, 0, 0);
    // v=0 → untouched; v=1 → (200, 0, 0, 128 default alpha).
    assert.deepEqual(Array.from(img.data.slice(0, 4)), [100, 100, 100, 200]);
    assert.deepEqual(Array.from(img.data.slice(4, 8)), [200, 0, 0, 128]);
  });

  it("honors an explicit overlay alpha", () => {
    const m: MaskMat = { w: 1, h: 1, data: new Float64Array([1]) };
    const img = fake([0, 0, 0, 0]);
    tintMaskToImageData(m, img, 10, 20, 30, 255);
    assert.deepEqual(Array.from(img.data.slice(0, 4)), [10, 20, 30, 255]);
  });
});
