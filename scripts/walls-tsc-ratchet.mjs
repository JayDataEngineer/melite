#!/usr/bin/env node
// walls-tsc-ratchet.mjs — THE WALLS TIER'S TYPECHECK RATCHET (L4721(b)).
//
// tests/walls/ts/tsconfig.json was the estate's one untyped spec tree:
// the README named `tsc -p tests/walls/ts/tsconfig.json` as the types
// command and NO gate ran it (the first executed sweep, 2026-11-28,
// read 448 errors — 27 of them modules the hand-copied paths table
// no longer carried, 20 a namespace a value alias could never own).
// The tree is now typed by scripts/typecheck-tests.mjs's walls tier
// (the same implementation the typecheck-gate wall and the ship lane
// run), judged as a RATCHET — the estate's own precedent
// (scripts/coverage-baseline.ts: owned debt priced per file, never a
// number nobody may lower):
//
//   NEW ERRING FILE      → red. A file the baseline does not price
//                          (a new wall, a helper, a source the face
//                          reaches for the first time) types CLEAN or
//                          the push does not land. This is the row's
//                          whole point: vitest-4 signature drift in a
//                          walls spec is a compile red from now on.
//   GROWTH               → red. A priced file may carry no error above
//                          its row.
//   STALE ROW            → red. A row whose file now carries FEWER
//                          errors (or none) is lowered to the measured
//                          count before the push lands
//                          (`node scripts/walls-tsc-ratchet.mjs
//                          --write-baseline`): a ratchet that banks
//                          headroom lets a cure pay for a relapse in
//                          the same file. The baseline only shrinks.
//
// The comparator is pure and exported (the wall judges each arm on
// its own path); the runner is the one tsc invocation both seats share.
//
//   node scripts/walls-tsc-ratchet.mjs                   judge (exit 1 red)
//   node scripts/walls-tsc-ratchet.mjs --write-baseline   lower the rows

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FACE_DIR = join(ROOT, "tests/walls/ts");
export const BASELINE = join(ROOT, "scripts/walls-tsc-baseline.json");

const tscPath = () => execFileSync(process.execPath, [join(ROOT, "tools", "tsc-path.mjs")], { encoding: "utf8" }).trim();

const ERROR_LINE = /^(.+?)\(\d+,\d+\): error TS\d+:/;

/** Per-file error counts from tsc's stdout — repo-relative paths, the
 *  face run from the repo root so package sources the face reaches key
 *  by their own path (a source that errors only under this face is
 *  this face's finding, priced like any other).
 *  @param {string} text
 *  @returns {Record<string, number>} */
export function parseTscOutput(text) {
  const counts = {};
  for (const line of text.split("\n")) {
    const m = ERROR_LINE.exec(line);
    if (!m) continue;
    const file = m[1];
    counts[file] = (counts[file] ?? 0) + 1;
  }
  return counts;
}

/** THE LAW. Three refusals, each reported on its own list so a red
 *  names its class: `fresh` (an erring file no row prices), `grew`
 *  (above the row), `stale` (below the row — lower it). Files the
 *  baseline prices at zero are ordinary rows: a single error is growth.
 *  @param {Record<string, number>} actual
 *  @param {Record<string, number>} baseline
 *  @returns {{ok: boolean, fresh: Array<[string, number]>, grew: Array<[string, number, number]>, stale: Array<[string, number, number]>, priced: number}} */
export function judgeCounts(actual, baseline) {
  const fresh = [];
  const grew = [];
  const stale = [];
  for (const [file, count] of Object.entries(actual)) {
    if (count === 0) continue;
    if (!(file in baseline)) fresh.push([file, count]);
    else if (count > baseline[file]) grew.push([file, baseline[file], count]);
  }
  for (const [file, row] of Object.entries(baseline)) {
    const count = actual[file] ?? 0;
    if (count < row) stale.push([file, row, count]);
  }
  const priced = Object.keys(baseline).filter((f) => (actual[f] ?? 0) > 0).length;
  return { ok: fresh.length === 0 && grew.length === 0 && stale.length === 0, fresh, grew, stale, priced };
}

/** Run the face once. With `extraFiles` (the wall's firing probe) a
 *  probe config in the face's own directory extends the face and
 *  widens the roster — so the probe resolves what a suite resolves —
 *  and is removed in a finally; a probe config a killed run left
 *  behind is swept by dead pid first (typecheck-tests' own law).
 *  @param {{extraFiles?: string[]}} [opts]
 *  @returns {Promise<{counts: Record<string, number>, status: number | null}>} */
export async function runWallsTsc(opts = {}) {
  const tsc = tscPath();
  for (const e of readdirSync(FACE_DIR)) {
    if (!e.startsWith(".tsconfig.probe.")) continue;
    const pid = Number(e.slice(".tsconfig.probe.".length).replace(/\.json$/, ""));
    let dead = true;
    if (Number.isInteger(pid) && pid > 0) {
      try { process.kill(pid, 0); dead = false; } catch (err) { dead = err.code === "ESRCH"; }
    }
    if (dead) rmSync(join(FACE_DIR, e), { force: true });
  }
  // run from the repo root so every reported path keys repo-relative;
  // the face is named by its own path (a bare tsconfig.json here would
  // be the root SOLUTION face — the one config no program may seed)
  let project = join("tests", "walls", "ts", "tsconfig.json");
  let probe = null;
  if (opts.extraFiles && opts.extraFiles.length > 0) {
    const { stdout } = await execFileP(process.execPath, [tsc, "--showConfig", "-p", "tsconfig.json"], { cwd: FACE_DIR, encoding: "utf8" });
    const include = JSON.parse(stdout).include ?? [];
    probe = join(FACE_DIR, `.tsconfig.probe.${process.pid}.json`);
    writeFileSync(probe, JSON.stringify({
      extends: "./tsconfig.json",
      include: [...include, ...opts.extraFiles.map((f) => relative(FACE_DIR, f))],
    }));
    project = probe;
  }
  try {
    const proc = await execFileP(process.execPath, [tsc, "--noEmit", "-p", project, "--pretty", "false"], {
      cwd: ROOT, encoding: "utf8", timeout: 480_000, maxBuffer: 64 * 1024 * 1024,
    }).catch((err) => err); // tsc exits 2 on any error; the judge reads the text
    const text = proc instanceof Error ? `${proc.stdout ?? ""}${proc.stderr ?? ""}` : proc.stdout;
    const status = proc instanceof Error ? (proc.code ?? null) : 0;
    return { counts: parseTscOutput(text), status };
  } finally {
    if (probe) rmSync(probe, { force: true });
  }
}

/** The tracked rows, validated: every key a file that exists, every
 *  value a positive integer (a zero row is a stale row).
 *  @returns {Record<string, number>} */
export function readBaseline() {
  const raw = JSON.parse(readFileSync(BASELINE, "utf8"));
  const out = {};
  for (const [file, count] of Object.entries(raw)) {
    if (!Number.isInteger(count) || count <= 0) throw new Error(`walls-tsc-baseline: row '${file}' carries ${count} — a row is a positive integer (a clean file has no row)`);
    if (!existsSync(join(ROOT, file))) throw new Error(`walls-tsc-baseline: row '${file}' names no file — a ghost row is a ratchet nobody can lower`);
    out[file] = count;
  }
  return out;
}

/** The rows sorted by key, one trailing newline (the file-end law).
 *  @param {Record<string, number>} counts
 *  @returns {string} */
export function renderBaseline(counts) {
  const rows = Object.fromEntries(Object.keys(counts).filter((f) => counts[f] > 0).sort().map((f) => [f, counts[f]]));
  return JSON.stringify(rows, null, 2) + "\n";
}

/** One judged run — the tier both seats print. Returns the verdict
 *  and the lines to print; the caller owns the exit code.
 *  @returns {Promise<{verdict: ReturnType<typeof judgeCounts>, lines: string[], total: number}>} */
export async function judgeWallsTier() {
  const { counts } = await runWallsTsc();
  const verdict = judgeCounts(counts, readBaseline());
  const lines = [];
  for (const [file, count] of verdict.fresh) lines.push(`  NEW ${file}: ${count} error(s), no baseline row — a new file types clean`);
  for (const [file, row, count] of verdict.grew) lines.push(`  GREW ${file}: ${count} errors, row ${row}`);
  for (const [file, row, count] of verdict.stale) lines.push(`  STALE ${file}: ${count} errors, row ${row} — lower the row: node scripts/walls-tsc-ratchet.mjs --write-baseline`);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { verdict, lines, total };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write-baseline")) {
    const { counts } = await runWallsTsc();
    const seated = Object.keys(counts).filter((f) => counts[f] > 0);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    // THE FIRST SEATING is the one write with no tracked rows to judge
    // against: the whole measured census lands, reviewed in the diff.
    if (!existsSync(BASELINE)) {
      writeFileSync(BASELINE, renderBaseline(counts));
      console.log(`walls-tsc-baseline: seated, ${seated.length} rows, ${total} errors priced`);
    } else {
      const before = readBaseline();
      // every later write only lowers: a row above the tracked one is
      // growth the judge must red, never a regen's to launder
      const grown = Object.entries(counts).filter(([f, c]) => c > (before[f] ?? 0));
      if (grown.length > 0) {
        for (const [f, c] of grown) console.error(`  GREW ${f}: ${c} errors, tracked row ${before[f] ?? "none"} — a regen does not seat growth`);
        process.exit(1);
      }
      writeFileSync(BASELINE, renderBaseline(counts));
      console.log(`walls-tsc-baseline: lowered, ${seated.length} rows, ${total} errors priced`);
    }
  } else {
    const { verdict, lines, total } = await judgeWallsTier();
    if (verdict.ok) console.log(`walls tier: ${total} errors, every file at or under its row`);
    else for (const l of lines) console.log(l);
    process.exit(verdict.ok ? 0 : 1);
  }
}
