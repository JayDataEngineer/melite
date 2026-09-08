/**
 * mask-prep parity — the TS twin vs the golden fixtures generated from
 * the authoritative Python (backend/media/comfyui/mask_prep.py).
 *
 * The SAME JSON is asserted by tests/unit/test_mask_prep.py on the
 * Python side at the same 1e-9 tolerance. If these fail after a Python
 * change: regenerate fixtures (scripts/gen_mask_prep_fixtures.py) and
 * update this twin in the SAME change — the contract is deliberate
 * (docs/design/mask-prep.md §6).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  DEFAULT_ALIGNMENT,
  applyOutpaintOverlap,
  applyPrep,
  coverage,
  deriveOutpaint,
  gaussianKernel,
  diskRowHalfWidths,
  isIdentityPrep,
  matFromNested,
  roundToMultiple,
  type MaskPrep,
} from "@melite/formats";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  here, "..", "lib", "__fixtures__", "maskPrepFixtures.json",
);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const FIX = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as {
  version: number;
  tolerance: number;
  cases: Record<string, FixtureCase>;
};

interface FixtureCase {
  kind: "chain" | "kernels" | "disks" | "outpaint" | "table";
  input?: number[][];
  prep?: { grow: number; feather: number; threshold: number; invert: boolean };
  expected?: number[][] | OutpaintExpected;
  report?: { applied: string[] };
  spec?: { top: number; right: number; bottom: number; left: number; overlap: number };
  orig?: [number, number];
  alignment?: number;
  data?: Record<string, unknown>;
}

interface OutpaintExpected {
  new_w: number; new_h: number; off_x: number; off_y: number;
  mask: number[][];
}

const TOL = FIX.tolerance as number;

function nestedOf(m: { w: number; data: Float64Array }): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < m.data.length; i++) {
    if (i % m.w === 0) rows.push([]);
    rows[rows.length - 1].push(m.data[i]);
  }
  return rows;
}

function expectClose(actual: number[][], expected: number[][], label: string) {
  expect(actual.length, `${label} rows`).toBe(expected.length);
  for (let y = 0; y < expected.length; y++) {
    expect(actual[y].length, `${label} row ${y} width`).toBe(expected[y].length);
    for (let x = 0; x < expected[y].length; x++) {
      const d = Math.abs(actual[y][x] - expected[y][x]);
      if (d > TOL) {
        throw new Error(
          `${label}: (${y},${x}) ts=${actual[y][x]} py=${expected[y][x]} ` +
          `delta=${d} > ${TOL}`,
        );
      }
    }
  }
}

const CHAIN_CASES = [
  "grow_plus3_A", "grow_neg2_A", "grow_disk_B4", "grow_disk_B7",
  "feather6_A", "feather4_C_ramp", "threshold_only_C", "invert_D",
  "chain_full_A", "chain_full_C", "identity_A",
  "overlap_pre_padded_t8", "overlap_pre_padded_all16",
  "overlap_pre_padded_zero",
] as const;

describe.each(CHAIN_CASES)("fixture chain case %s", (name: string) => {
  const c = FIX.cases[name] as FixtureCase;

  test("reproduces the Python golden matrix at 1e-9", () => {
    if ((c.prep as { op?: string }).op === "apply_outpaint_overlap") {
      const sp = (c.prep as unknown as {
        spec: { top: number; right: number; bottom: number; left: number;
                overlap: number };
      }).spec;
      const m = applyOutpaintOverlap(matFromNested(c.input!), sp);
      expectClose(nestedOf(m), c.expected as number[][], name);
      return;
    }
    const prep: MaskPrep = {
      grow: c.prep!.grow,
      feather: c.prep!.feather,
      threshold: c.prep!.threshold,
      invert: c.prep!.invert,
    };
    const { mask, report } = applyPrep(matFromNested(c.input!), prep);
    expectClose(nestedOf(mask), c.expected as number[][], name);
    // report vocabulary matches too (applied op names)
    expect(report.applied).toEqual(c.report!.applied);
  });
});

describe("kernel / disk / table fixtures", () => {
  test("gaussian kernels match Python (weights + truncation)", () => {
    const kernels = FIX.cases._gaussian_kernels!.data as Record<
      string, { sigma: number; k: number; weights: number[] }
    >;
    for (const [r, spec] of Object.entries(kernels)) {
      const k = gaussianKernel(Number(r));
      expect(k.length).toBe(spec.weights.length);
      expect((k.length - 1) / 2).toBe(spec.k);
      for (let i = 0; i < k.length; i++) {
        expect(Math.abs(k[i] - spec.weights[i])).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  test("disk half-widths match Python exactly (integers)", () => {
    const disks = FIX.cases._disk_half_widths!.data as Record<string, number[]>;
    for (const [r, hw] of Object.entries(disks)) {
      expect(diskRowHalfWidths(Number(r))).toEqual(hw);
    }
  });

  test("round_to_multiple table matches", () => {
    const table = FIX.cases._round_to_multiple!.data as Record<string, number>;
    for (const [v, out] of Object.entries(table)) {
      expect(roundToMultiple(Number(v), DEFAULT_ALIGNMENT)).toBe(out);
    }
  });

  test("quantization table matches", () => {
    const table = FIX.cases._quantize_table!.data as Record<string, number>;
    for (const [v, out] of Object.entries(table)) {
      expect(Math.round(Number(v) * 255)).toBe(out);
    }
  });
});

describe.each([
  "plain", "overlap16", "roundonly", "big_overlap", "single_side",
] as const)("fixture outpaint case %s", (name) => {
  const c = FIX.cases[`outpaint_${name}`] as FixtureCase;

  test("derives the same geometry + mask", () => {
    const g = deriveOutpaint(
      c.orig![0], c.orig![1], c.spec!, c.alignment ?? DEFAULT_ALIGNMENT,
    );
    const e = c.expected as OutpaintExpected;
    expect([g.newW, g.newH, g.offX, g.offY]).toEqual(
      [e.new_w, e.new_h, e.off_x, e.off_y],
    );
    expectClose(nestedOf(g.mask), e.mask, `outpaint_${name}`);
  });
});

describe("twin-side semantics (mirrored from test_mask_prep.py)", () => {
  test("identity detection incl. the threshold sentinel", () => {
    expect(isIdentityPrep({ grow: 0, feather: 0, threshold: 0, invert: false })).toBe(true);
    expect(isIdentityPrep({ grow: 0, feather: 0, threshold: 0.0, invert: false })).toBe(true);
    expect(isIdentityPrep({ grow: 1, feather: 0, threshold: 0, invert: false })).toBe(false);
    expect(isIdentityPrep({ grow: 0, feather: 0, threshold: 0.3, invert: false })).toBe(false);
    expect(isIdentityPrep({ grow: 0, feather: 0, threshold: 0, invert: true })).toBe(false);
  });

  test("grow(-1) on a 1px line THROWS (no silent fallback)", () => {
    const rows: number[][] = Array.from({ length: 20 }, () => new Array(20).fill(0));
    rows[10].fill(1);
    expect(() =>
      applyPrep(matFromNested(rows), { grow: -1, feather: 0, threshold: 0, invert: false }),
    ).toThrow(/NOTHING/);
  });

  test("coverage matches mean semantics", () => {
    const rows: number[][] = Array.from({ length: 10 }, (_, y) =>
      new Array(10).fill(y < 2 ? 1 : 0),
    );
    expect(coverage(matFromNested(rows))).toBeCloseTo(0.2, 12);
  });
});
