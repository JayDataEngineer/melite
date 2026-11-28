// @contract walls-tsc-net
//
// THE WALLS TSC NET (2026-11-28 — ROADMAP L4721(b), auditor B's F-3:
// "the walls tier is the only untyped spec tree — seat tests/walls/ts
// in a tsc project so vitest-4 signature drift is a compile red").
//
// The burn: tests/walls/ts/tsconfig.json existed, the walls README
// named `tsc -p tests/walls/ts/tsconfig.json` as the types command,
// and NO gate ran it. The first executed sweep read 448 errors: the
// hand-copied paths table carried 49 of the runtime facade's 305 rows
// (27 TS2307 — benchStage, timelineContract, formSpec, catalog,
// infer-gallery absent), the face had no DOM lib or jsx for the client
// sources suites reach, and two census suites typed `ts.Node` through
// a VALUE alias (`typeof import('typescript')` — a namespace no value
// can own, 20 TS2503 nobody saw). The day's own two walls carried 7.
//
// The seat, each arm on its own firing path:
//
//   ARM 1 — THE LAW, pure: the comparator refuses an erring file no
//     row prices, growth above a row, and a row gone stale; exact
//     counts pass. Each refusal is its own `it`.
//   ARM 2 — THE BASELINE IS HONEST: every row names a real file and a
//     positive integer; keys sorted; one trailing newline; the files
//     this seat authored carry NO row (the new-file law, judged by
//     name, not by a count).
//   ARM 3 — THE FACE IS THE FACADE'S: tools/walls-face.mjs --check
//     exits 0 (a hand-edited paths row is drift), and the face's
//     program carries EVERY spec the walls project runs (the roster
//     is vitest's, not a named list).
//   ARM 4 — THE NET FIRES: a probe spec with one type error, seated
//     in the face's own directory, is counted and refused as NEW on
//     the real tsc, the real face, the real comparator — and the
//     same run without it judges the tree green.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { judgeCounts, parseTscOutput, readBaseline, renderBaseline, runWallsTsc, ROOT, FACE_DIR, BASELINE } from "../../../../scripts/walls-tsc-ratchet.mjs";

const PROBE_DIR = join(FACE_DIR, ".probe");

function specRoster(): string[] {
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".spec.ts") ? [relative(ROOT, p)] : [];
  });
  return [...walk(join(FACE_DIR, "suites")), ...walk(join(ROOT, "tests/lane"))].sort();
}

describe("walls-tsc-net — the walls tier is typed, ratcheted, and rides the test tier", () => {
  beforeAll(() => {
    // debris from a killed run: a probe no live pid owns is swept (the
    // typecheck-tests law for synthesized configs)
    if (existsSync(PROBE_DIR)) rmSync(PROBE_DIR, { recursive: true, force: true });
    mkdirSync(PROBE_DIR, { recursive: true });
  });
  afterAll(() => rmSync(PROBE_DIR, { recursive: true, force: true }));

  it("ARM 1a — THE LAW: an erring file no row prices is refused (a new wall types clean or the push does not land)", () => {
    const v = judgeCounts({ "tests/walls/ts/suites/new-wall.spec.ts": 1 }, { "tests/walls/ts/suites/old.spec.ts": 3 });
    expect(v.ok).toBe(false);
    expect(v.fresh).toEqual([["tests/walls/ts/suites/new-wall.spec.ts", 1]]);
    expect(v.grew).toEqual([]);
  });

  it("ARM 1b — THE LAW: growth above a row is refused, naming the row", () => {
    const v = judgeCounts({ "a.spec.ts": 4 }, { "a.spec.ts": 3 });
    expect(v.ok).toBe(false);
    expect(v.grew).toEqual([["a.spec.ts", 3, 4]]);
    expect(v.fresh).toEqual([]);
    expect(v.stale).toEqual([]);
  });

  it("ARM 1c — THE LAW: a row gone stale is refused until lowered (a cure never banks headroom for a relapse)", () => {
    const healed = judgeCounts({}, { "a.spec.ts": 3 });
    expect(healed.ok).toBe(false);
    expect(healed.stale).toEqual([["a.spec.ts", 3, 0]]);
    const lowered = judgeCounts({ "a.spec.ts": 1 }, { "a.spec.ts": 3 });
    expect(lowered.ok).toBe(false);
    expect(lowered.stale).toEqual([["a.spec.ts", 3, 1]]);
  });

  it("ARM 1d — THE LAW: exact counts pass, and a zero count is no finding", () => {
    const v = judgeCounts({ "a.spec.ts": 3, "b.spec.ts": 0 }, { "a.spec.ts": 3 });
    expect(v).toEqual({ ok: true, fresh: [], grew: [], stale: [], priced: 1 });
  });

  it("ARM 1e — THE PARSER: tsc's own line shape keys per file; continuation and summary lines count nothing", () => {
    const text = [
      "suites/a.spec.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      "  Type 'string' is not assignable to type 'number'.",
      "packages/x/src/y.ts(1,1): error TS2339: Property 'z' does not exist on type 'Q'.",
      "suites/a.spec.ts(20,9): error TS7006: Parameter 'n' implicitly has an 'any' type.",
      "Found 3 errors in 2 files.",
      "",
    ].join("\n");
    expect(parseTscOutput(text)).toEqual({ "suites/a.spec.ts": 2, "packages/x/src/y.ts": 1 });
  });

  it("ARM 2 — THE BASELINE IS HONEST: real files, positive integers, sorted, one trailing newline; this seat's own walls carry no row", () => {
    const baseline = readBaseline(); // refuses a ghost row and a non-positive row itself
    const keys = Object.keys(baseline);
    expect(keys).toEqual([...keys].sort());
    const raw = readFileSync(BASELINE, "utf8");
    expect(raw).toBe(renderBaseline(baseline));
    for (const [file, count] of Object.entries(baseline)) {
      expect(Number.isInteger(count) && count > 0, `${file}: ${count}`).toBe(true);
      expect(existsSync(join(ROOT, file)), `${file} names no file`).toBe(true);
    }
    // THE NEW-FILE LAW, judged on the files this seat authored: they
    // landed under the net, so they type clean or they never land.
    for (const mine of [
      "tests/walls/ts/suites/cards-h3-quant-run-plane.spec.ts",
      "tests/walls/ts/suites/bench-hostpath-currency-transports.spec.ts",
      "tests/walls/ts/suites/walls-tsc-net.spec.ts",
    ]) {
      expect(baseline[mine], `${mine} is priced — a wall authored under the net types clean`).toBeUndefined();
    }
  });

  it("ARM 3a — THE FACE IS THE FACADE'S: the paths block is the generator's rendering (a hand-edited row is drift)", () => {
    const out = execFileSync(process.execPath, [join(ROOT, "tools", "walls-face.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" });
    expect(out).toMatch(/rows, stable/);
  });

  it("ARM 3b — THE ROSTER IS VITEST'S: every spec the walls project runs is in the face's program", () => {
    const tsc = execFileSync(process.execPath, [join(ROOT, "tools", "tsc-path.mjs")], { encoding: "utf8" }).trim();
    const shown = JSON.parse(execFileSync(process.execPath, [tsc, "--showConfig", "-p", "tsconfig.json"], { cwd: FACE_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })) as { files: string[] };
    // showConfig names files relative to the face (its cwd): resolve before judging
    const inProgram = new Set(shown.files.map((f) => relative(ROOT, resolve(FACE_DIR, f))));
    const missing = specRoster().filter((f) => !inProgram.has(f));
    expect(missing, "specs the walls project runs that the net does not type").toEqual([]);
  });

  it("ARM 4 — THE NET FIRES: a probe spec with one type error is counted and refused as NEW on the real tsc and face; without it the tree judges green", async () => {
    const probe = join(PROBE_DIR, `probe-${process.pid}.spec.ts`);
    writeFileSync(probe, [
      'import { it } from "vitest";',
      'it("probe", () => { const drift: number = "a vitest-4 signature the net must see"; void drift; });',
      "",
    ].join("\n"));
    const probeKey = relative(ROOT, probe);
    const fired = await runWallsTsc({ extraFiles: [probe] });
    expect(fired.counts[probeKey], "the probe's type error must be counted").toBeGreaterThanOrEqual(1);
    const verdict = judgeCounts(fired.counts, readBaseline());
    expect(verdict.ok).toBe(false);
    expect(verdict.fresh).toEqual([[probeKey, fired.counts[probeKey]]]);
    // the restored tree: the same run without the probe judges green —
    // the refusal above was the probe's, nothing else's
    const { verdict: clean, total } = await (async () => {
      const { counts } = await runWallsTsc();
      return { verdict: judgeCounts(counts, readBaseline()), total: Object.values(counts).reduce((a, b) => a + b, 0) };
    })();
    expect(clean.ok, JSON.stringify({ fresh: clean.fresh, grew: clean.grew, stale: clean.stale })).toBe(true);
    expect(total).toBeGreaterThan(0); // the priced census is non-empty — the ratchet has teeth to show
    expect(existsSync(join(FACE_DIR, `.tsconfig.probe.${process.pid}.json`)), "the probe config is removed in a finally").toBe(false);
  }, 600_000);
});
