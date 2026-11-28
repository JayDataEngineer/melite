// @contract gates-coverage-ratchet-growth
// coverage-ratchet-growth.spec.ts — THE BATTERY'S COVERAGE RATCHET
// JUDGES TWO LEDGERS, AND ITS VERDICT HAS A JUDGE (2026-11-28, the
// branch-only burn).
//
// tools/coverage-ratchet.mjs is the pre-push battery's coverage
// verdict (tools/hook-full-battery.mjs spawns it). Until this spec
// its two pure seams — judgeGrowth and packageRootOf — were armed by
// NO wall: no registry row named the tool, and the
// coverage-baseline-ratchet wall judges the TABLE (floors move up,
// every gated file has a row), never the verdict read off it.
//
// The burn: S1 and B4b (569d06ea5) added nine bare BRANCH paths over
// executed lines across three files. The line ledger read "no new
// debt" (a bare branch adds no uncovered line), the battery went
// green, the push landed, and CI's coverage gate red on four per-file
// floors (run 46112457941: comfyui-execute.ts branches 87.04 < 87.88,
// manageProbe.ts branches 96.47 < 98.36, comfy-manage.ts statements
// 99.07 < 99.66 and branches 98.81 < 99.73). Vitest's own exit could
// not be the local verdict — it reds on the dev box's SEATED face by
// design — so the cure reads CI's face (effectiveBaseline(false)) as
// ARITHMETIC over the same fresh summary and judges it under the same
// delta law as the line ledger: a breach in a package touched since
// the baseline commit reds the push; an untouched package's is named
// drift and passes. No second run, no floor moved.
//
// Axes: ACCURACY (each verdict arm states the law it guards and
// asserts exactly it), ENFORCEMENT (toggle proofs in the receipt:
// the second-ledger call removed reds the wiring arm; the delta law
// inverted reds the verdict arms), DEPTH (the real unseated table and
// CI's own frozen readings; export roster derived from the .mjs
// source, never a hand list).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ciFloorRows,
  FLOOR_METRICS,
  judgeFloors,
  judgeGrowth,
  packageRootOf,
} from "../../../../tools/coverage-ratchet.mjs";
import { effectiveBaseline } from "../../../../scripts/coverage-baseline.ts";

const ROOT = join(__dirname, "..", "..", "..", "..");
const TOOL = join(ROOT, "tools", "coverage-ratchet.mjs");
const DECL = join(ROOT, "tools", "coverage-ratchet.d.mts");
const BATTERY = join(ROOT, "tools", "hook-full-battery.mjs");

const touched = () => true;
const untouched = () => false;

describe("packageRootOf — the root a diff can vouch for", () => {
  it("reads the three-segment package root and refuses everything outside a package", () => {
    expect(packageRootOf("packages/harness/estate-queue/src/manageProbe.ts")).toBe("packages/harness/estate-queue");
    expect(packageRootOf("packages/video/h3-timeline/tests/card.spec.ts")).toBe("packages/video/h3-timeline");
    expect(packageRootOf("scripts/coverage-baseline.ts")).toBeNull();
    expect(packageRootOf("tools/coverage-ratchet.mjs")).toBeNull();
    // Two segments are not a package; a bare "packages" is not one either.
    expect(packageRootOf("packages/harness")).toBeNull();
    expect(packageRootOf("packages")).toBeNull();
  });
});

describe("judgeGrowth — THE LINE LEDGER'S VERDICT (armed here for the first time)", () => {
  const row = { file: "packages/estate/drafts/src/bench.ts", uncovered: 4, owned: 2 };

  it("growth in a touched package is red — zero tolerance", () => {
    const v = judgeGrowth([row], touched);
    expect(v.red).toEqual(["packages/estate/drafts/src/bench.ts: 4 uncovered > owned 2"]);
    expect(v.drift).toEqual([]);
  });

  it("the same row in an untouched package is named drift and passes — the tree cannot grow what it did not touch", () => {
    const v = judgeGrowth([row], untouched);
    expect(v.red).toEqual([]);
    expect(v.drift).toHaveLength(1);
    expect(v.drift[0]).toContain("packages/estate/drafts/src/bench.ts: 4 uncovered > owned 2");
    expect(v.drift[0]).toContain("untouched since the baseline commit");
  });

  it("a file outside every package is judged strictly — no package, no vouching, even when changed() says nothing changed", () => {
    const v = judgeGrowth([{ file: "scripts/run-walker-safe.mjs", uncovered: 3, owned: 0 }], untouched);
    expect(v.red).toEqual(["scripts/run-walker-safe.mjs: 3 uncovered > owned 0"]);
    expect(v.drift).toEqual([]);
  });

  it("an empty ledger is an empty verdict", () => {
    expect(judgeGrowth([], touched)).toEqual({ red: [], drift: [] });
  });
});

describe("ciFloorRows — CI'S OWN FACE, READ OFF THE SUMMARY", () => {
  const REPO = "/home/user/Documents/programs/active/inference.cpp";
  const face = (pct: number, covered: number, total: number) => ({ pct, covered, total });
  const summary = {
    total: { branches: face(50, 1, 2) },
    [`${REPO}/packages/x/y/src/a.ts`]: {
      statements: face(100, 10, 10),
      branches: face(50, 1, 2),
      functions: face(100, 0, 0),
      lines: face(100, 10, 10),
    },
    [`${REPO}/packages/x/y/src/b.ts`]: { branches: face(87.88, 292, 332) },
    [`${REPO}/packages/x/y/src/c.ts`]: { branches: face(99, 99, 100) },
    [`${REPO}/packages/x/y/src/d.ts`]: { branches: face(99.999, 999, 1000) },
  };
  const floors = {
    "**/packages/x/y/src/a.ts": { statements: 100, branches: 87.88, functions: 80, lines: 94 },
    "**/packages/x/y/src/b.ts": { statements: null, branches: 87.88, functions: null, lines: null },
    "**/packages/x/y/src/c.ts": { statements: null, branches: 99, functions: null, lines: null },
    "**/packages/x/y/src/d.ts": { statements: null, branches: 100, functions: null, lines: null },
    "**/packages/x/y/src/gone.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
  };

  it("a glob's tail names the file and the row comes back repo-relative — summary keys are absolute", () => {
    const rows = ciFloorRows(summary, floors);
    expect(rows).toEqual([
      { file: "packages/x/y/src/a.ts", metric: "branches", pct: 50, floor: 87.88 },
      { file: "packages/x/y/src/d.ts", metric: "branches", pct: 99.999, floor: 100 },
    ]);
  });

  it("a null floor (zero paths on that metric) and a zero-total metric are not rows — vitest judges neither", () => {
    // a.ts functions: floor 80, total 0 → not a row; b.ts's null statements/functions/lines → not rows.
    const aRows = ciFloorRows(summary, floors).filter((r) => r.file.endsWith("/a.ts"));
    expect(aRows.map((r) => r.metric)).toEqual(["branches"]);
  });

  it("a file exactly at its floor is not below it — vitest's comparison is strict (pct < threshold)", () => {
    const rows = ciFloorRows(summary, floors);
    expect(rows.some((r) => r.file.endsWith("/b.ts"))).toBe(false);
    expect(rows.some((r) => r.file.endsWith("/c.ts"))).toBe(false);
  });

  it("a floor row whose file the summary never loaded is not a row, and an empty summary yields nothing", () => {
    expect(ciFloorRows({ total: { branches: face(0, 0, 1) } }, floors)).toEqual([]);
    expect(ciFloorRows({}, {})).toEqual([]);
  });

  it("THE REAL UNSEATED TABLE is a well-formed face: every glob is the double-star prefix over a repo path and every row carries the four metrics as a number or the honest null", () => {
    const real = effectiveBaseline(false);
    expect(Object.keys(real).length).toBeGreaterThan(100);
    for (const [glob, row] of Object.entries(real)) {
      expect(glob.startsWith("**/packages/")).toBe(true);
      const rel = glob.slice(3);
      expect(rel.endsWith(".ts") || rel.endsWith(".tsx")).toBe(true);
      for (const m of FLOOR_METRICS) {
        const f = row[m];
        expect(f === null || (typeof f === "number" && Number.isFinite(f))).toBe(true);
      }
    }
  });

  it("THE BURN, FROZEN — CI run 46112457941's four readings red against the real floors and nothing else does", () => {
    // The readings CI printed at 569d06ea5, verbatim (percent, covered/total
    // reconstructed to the printed percentage). Every other gated file is
    // placed at 100 so it cannot fire; the expected roster is DERIVED from
    // the live table (a floor row that no longer exists drops its reading —
    // floors only move up, so a remaining row still fires).
    const readings: Array<[string, (typeof FLOOR_METRICS)[number], number]> = [
      ["packages/engines/comfyui-cordis/src/comfyui-execute.ts", "branches", 87.04],
      ["packages/harness/estate-queue/src/manageProbe.ts", "branches", 96.47],
      ["packages/harness/melite-tools/src/tools/comfy-manage.ts", "statements", 99.07],
      ["packages/harness/melite-tools/src/tools/comfy-manage.ts", "branches", 98.81],
    ];
    const real = effectiveBaseline(false);
    const frozen: Record<string, Record<string, ReturnType<typeof face>>> = {};
    for (const glob of Object.keys(real)) {
      const rel = glob.slice(3);
      frozen[`${REPO}/${rel}`] = {};
      for (const m of FLOOR_METRICS) frozen[`${REPO}/${rel}`][m] = face(100, 100, 100);
    }
    for (const [rel, metric, pct] of readings) frozen[`${REPO}/${rel}`][metric] = face(pct, 100, 100);
    const rows = ciFloorRows(frozen, real);
    const expected = readings
      .filter(([rel, metric, pct]) => (real[`**/${rel}`]?.[metric] ?? null) !== null && real[`**/${rel}`][metric] > pct)
      .map(([file, metric, pct]) => ({ file, metric, pct, floor: real[`**/${file}`][metric] }));
    expect(rows).toEqual(expected);
    // The burn is still a burn: all four readings sit below their floors today.
    expect(rows.map((r) => `${r.file} ${r.metric}`)).toEqual([
      "packages/engines/comfyui-cordis/src/comfyui-execute.ts branches",
      "packages/harness/estate-queue/src/manageProbe.ts branches",
      "packages/harness/melite-tools/src/tools/comfy-manage.ts statements",
      "packages/harness/melite-tools/src/tools/comfy-manage.ts branches",
    ]);
    expect(rows.map((r) => r.floor)).toEqual([87.88, 98.36, 99.66, 99.73]);
  });
});

describe("judgeFloors — THE SAME DELTA LAW OVER CI'S FLOOR ROWS", () => {
  const breach = { file: "packages/harness/estate-queue/src/manageProbe.ts", metric: "branches" as const, pct: 96.47, floor: 98.36 };

  it("a breach in a package touched since the baseline commit is red, naming CI's floor", () => {
    const v = judgeFloors([breach], touched);
    expect(v.red).toEqual([
      "packages/harness/estate-queue/src/manageProbe.ts: branches 96.47% below CI's floor 98.36% — the package changed since the baseline commit",
    ]);
    expect(v.drift).toEqual([]);
  });

  it("an untouched package's breach is named drift and passes — judged by its baseline-time measurement, like the line ledger", () => {
    const v = judgeFloors([breach], untouched);
    expect(v.red).toEqual([]);
    expect(v.drift).toHaveLength(1);
    expect(v.drift[0]).toContain("branches 96.47% below CI's floor 98.36%");
    expect(v.drift[0]).toContain("untouched since the baseline commit");
  });

  it("the two ledgers share one law: a touched package's growth and floor breach both red; an untouched package's both drift", () => {
    const grown = judgeGrowth([{ file: breach.file, uncovered: 5, owned: 0 }], touched);
    const floored = judgeFloors([breach], touched);
    expect(grown.red).toHaveLength(1);
    expect(floored.red).toHaveLength(1);
    expect(judgeGrowth([{ file: breach.file, uncovered: 5, owned: 0 }], untouched).drift).toHaveLength(1);
    expect(judgeFloors([breach], untouched).drift).toHaveLength(1);
  });

  it("a floor on a file outside every package is judged strictly", () => {
    const v = judgeFloors([{ file: "scripts/x.ts", metric: "lines" as const, pct: 90, floor: 95 }], untouched);
    expect(v.red).toEqual(["scripts/x.ts: lines 90% below CI's floor 95% — the package changed since the baseline commit"]);
    expect(v.drift).toEqual([]);
  });
});

describe("THE TOOL WIRES THE SECOND LEDGER (source pins — the real door)", () => {
  const source = readFileSync(TOOL, "utf8");
  const battery = readFileSync(BATTERY, "utf8");

  it("main judges ciFloorRows(summary, effectiveBaseline(false)) through judgeFloors under the SAME changed() and dies on either ledger's red", () => {
    expect(source).toContain("judgeFloors(ciFloorRows(summary, effectiveBaseline(false)), changed)");
    expect(source).toContain("const red = [...grown.red, ...floored.red]");
    expect(source).toContain("const drift = [...grown.drift, ...floored.drift]");
    // The face judged is CI's — never the seated face, never the detector.
    expect(source).toContain("import { effectiveBaseline } from '../scripts/coverage-baseline.ts'");
    expect(source).not.toMatch(/effectiveBaseline\((true|ESTATE_STORE_SEATED)\)/);
  });

  it("the battery launches the ratchet with type stripping on — the .ts face import must load across the engines range", () => {
    expect(battery).toMatch(/--experimental-strip-types",\s*"--no-warnings",\s*"tools\/coverage-ratchet\.mjs"/);
  });

  it("the declaration face names every export the .mjs ships — the roster is read off the source, never a hand list", () => {
    const shipped = [...source.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
    expect(shipped.sort()).toEqual(["FLOOR_METRICS", "ciFloorRows", "judgeFloors", "judgeGrowth", "packageRootOf"]);
    const decl = readFileSync(DECL, "utf8");
    for (const name of shipped) expect(decl, `${name} missing from coverage-ratchet.d.mts`).toMatch(new RegExp(`^export (?:function|const) ${name}\\b`, "m"));
  });

  it("importing the tool runs no gate — main() is guarded by the direct-launch check", () => {
    expect(source).toMatch(/if \(process\.argv\[1\] && import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href\) main\(\)/);
  });
});
