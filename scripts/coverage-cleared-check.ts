// coverage-cleared-check — the scoped-clearing honesty gate
// (ROADMAP "a scoped run's cleared record is not coverage",
// found 2026-10-14 batch 17: a scoped reporter can DROP a record
// while the raw count stays 0 — cardsRegistry.ts:893/:966 both
// read "cleared" in scoped runs whose coverage-final.json said
// 0).
//
// Law: an arm named as CLEARED by any scoped run is believed only
// when the run's raw coverage-final.json shows a non-zero count
// for a statement that spans the arm's line. Absence of a record
// is not coverage; a line no statement covers is not coverage.
//
// Usage:
//   node --experimental-strip-types scripts/coverage-cleared-check.ts \
//     --coverage <coverage-final.json> --arm <file:line> [--arm ...]
// Exit 0 = every named arm has a non-zero raw count; exit 1 names
// every arm that does not (REFUSED).

import { readFileSync } from "node:fs";

/** One file's raw istanbul/v8 JSON — only the two fields the
 * count read needs (statementMap maps statement ids to source
 * ranges; s maps the same ids to their hit counts). */
export interface RawCoverageFile {
  statementMap: Record<string, { start: { line: number }, end: { line: number } }>;
  s: Record<string, number>;
}

/** The parsed coverage-final.json shape this gate reads. */
export type RawCoverage = Record<string, RawCoverageFile>;

/** One arm's verdict — `file:line` in, honest count out. */
export interface ArmVerdict {
  readonly arm: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** Matches an arm's repo-relative path against coverage keys
 * (absolute, forward or back slashed) by suffix — the arm's own
 * path spelling is not negotiated, its FILE is. */
function findFile(coverage: RawCoverage, rel: string): string | null {
  const want = rel.split("\\").join("/");
  let best: string | null = null;
  for (const key of Object.keys(coverage)) {
    const have = key.split("\\").join("/");
    if (have === want || have.endsWith("/" + want)) {
      // longest key wins so nested same-name files never shadow
      if (best === null || key.length > best.length) best = key;
    }
  }
  return best;
}

/** The gate itself: every arm must carry a non-zero raw count
 * from a statement spanning its line.
 * @param coverage parsed coverage-final.json
 * @param arms `file:line` spellings claimed cleared
 * @returns one verdict per arm, input order */
export function clearedVerdicts(coverage: RawCoverage, arms: readonly string[]): ArmVerdict[] {
  const out: ArmVerdict[] = [];
  for (const arm of arms) {
    const at = arm.lastIndexOf(":");
    const rel = arm.slice(0, at);
    const line = Number(arm.slice(at + 1));
    if (at <= 0 || rel === "" || !Number.isInteger(line) || line < 1) {
      out.push({ arm, ok: false, detail: "not a file:line arm" });
      continue;
    }
    const key = findFile(coverage, rel);
    if (key === null) {
      out.push({
        arm,
        ok: false,
        detail: "no entry for " + rel + " — the run never measured that file",
      });
      continue;
    }
    const file = coverage[key] as RawCoverageFile | undefined;
    if (file === undefined || file.statementMap === undefined || file.s === undefined) {
      out.push({ arm, ok: false, detail: "entry for " + rel + " has no statement map" });
      continue;
    }
    let count = 0;
    const spanning: string[] = [];
    for (const id of Object.keys(file.statementMap)) {
      const range = file.statementMap[id] as { start: { line: number }, end: { line: number } };
      if (range.start.line <= line && line <= range.end.line) {
        spanning.push(id);
        count += file.s[id] ?? 0;
      }
    }
    if (spanning.length === 0) {
      out.push({
        arm,
        ok: false,
        detail: "no statement spans line " + line + " in " + rel +
          " — a line nothing covers is not coverage",
      });
      continue;
    }
    out.push({
      arm,
      ok: count > 0,
      detail: count > 0
        ? "raw count " + count + " across " + spanning.length + " statement(s)"
        : "raw count 0 across " + spanning.length + " statement(s) — the scoped run's silence is not a clear",
    });
  }
  return out;
}

function main(argv: readonly string[]): number {
  let coveragePath = "";
  const arms: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (a === "--coverage") coveragePath = (argv[i + 1] ?? "");
    else if (a === "--arm") {
      const v = argv[i + 1];
      if (v !== undefined) arms.push(v);
    }
  }
  if (coveragePath === "" || arms.length === 0) {
    console.log("REFUSED: usage is --coverage <coverage-final.json> --arm <file:line> [--arm ...]");
    return 1;
  }
  let coverage: RawCoverage;
  try {
    coverage = JSON.parse(readFileSync(coveragePath, "utf8")) as RawCoverage;
  } catch (error: unknown) {
    console.log("REFUSED: cannot read coverage at " + coveragePath + " — " +
      (error instanceof Error ? error.message : String(error)));
    return 1;
  }
  let rc = 0;
  for (const verdict of clearedVerdicts(coverage, arms)) {
    console.log((verdict.ok ? "CLEARED  " : "REFUSED  ") + verdict.arm + " — " + verdict.detail);
    if (!verdict.ok) rc = 1;
  }
  if (rc !== 0) {
    console.log("REFUSED: a scoped run's cleared record is not coverage — every false clear is named above");
  }
  return rc;
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("coverage-cleared-check.ts")) {
  process.exit(main(process.argv.slice(2)));
}
