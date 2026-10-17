#!/usr/bin/env node
// coverage-rows-tripwire.mjs — THE EMPTY-TABLE TRIPWIRE (journey E5,
// 2026-10-17, the vitest-4 pool-merge coverage break's own tripwire).
//
// THE LAW. A coverage run that collects NO rows is not a 0% run — it is
// a run that collected nothing, and it PASSES: vitest's per-file
// thresholds iterate coverageMap.files(), so an empty map produces zero
// threshold errors and exit 0. Five gates died green exactly that way
// (the `!`-prefixed include rows spliced into coverage.exclude claimed
// every src file; audit
// dev_docs/audits/journey/e5-coverage-pool-merge-2026-10-17.md). The
// gate therefore refuses, AFTER vitest exits 0, any summary face that
// proves the collection was dead:
//
//   coverage collection produced no rows — the gate is lying
//
// Refused faces (each with vitest itself green):
//   1. the summary file is missing   — the run skipped its report;
//   2. zero file rows                — nothing was collected;
//   3. the total row sits at 0x4     — the remap kept nothing.
//
// Usage:
//   node scripts/coverage-rows-tripwire.mjs [--coverage <path>]
// The default path is the gate's canonical shared tree
// (coverage/coverage-summary.json). A scratch run (the per-process
// reportsDirectory vitest.config.ts salts) points --coverage at its own
// summary instead. Exit 0 = a real table; exit 1 = the loud refusal.
//
// Wall: the tripwire arms in tests/walls/ts/suites/
// coverage-baseline-ratchet.spec.ts (registry gates-coverage-rows-tripwire).

import { existsSync, readFileSync } from 'node:fs'

/** The default summary path — the shared tree the full gate pins. */
export const DEFAULT_SUMMARY_PATH = 'coverage/coverage-summary.json'

/** @param summary parsed coverage-summary.json
 *  @returns the per-file rows (the `total` aggregate excluded). */
export function summaryFileRows(summary) {
  return Object.entries(summary ?? {}).filter(([key]) => key !== 'total')
}

/** The verdict: is this summary face a real coverage table or the gate
 *  lying? Pure — the wall arms it with inline fixtures.
 *  @param summaryExists whether the summary file exists
 *  @param summary       the parsed summary (null when absent)
 *  @returns {ok, refused} — refused carries the loud voice verbatim. */
export function emptyTableVerdict(summaryExists, summary) {
  if (!summaryExists || summary === null || typeof summary !== 'object') {
    return {
      ok: false,
      refused: 'coverage-summary.json is missing — the run skipped its report: '
        + 'coverage collection produced no rows — the gate is lying',
    }
  }
  const rows = summaryFileRows(summary)
  if (rows.length === 0) {
    return {
      ok: false,
      refused: 'coverage-summary.json carries zero file rows: '
        + 'coverage collection produced no rows — the gate is lying',
    }
  }
  const total = summary.total
  const flat = total
    && total.statements?.pct === 0 && total.branches?.pct === 0
    && total.functions?.pct === 0 && total.lines?.pct === 0
  if (flat) {
    return {
      ok: false,
      refused: `coverage-summary.json holds ${rows.length} row(s) and every one is 0x4 `
        + '(total 0 statements / 0 branches / 0 functions / 0 lines): '
        + 'coverage collection produced no rows — the gate is lying',
    }
  }
  return { ok: true, refused: null }
}

function main(argv) {
  let coveragePath = DEFAULT_SUMMARY_PATH
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--coverage') coveragePath = argv[i + 1] ?? ''
  }
  if (coveragePath === '') {
    console.log('REFUSED: usage is node scripts/coverage-rows-tripwire.mjs [--coverage <coverage-summary.json>]')
    return 1
  }
  if (!existsSync(coveragePath)) {
    console.log(`REFUSED (${coveragePath}): coverage-summary.json is missing — the run skipped its report: `
      + 'coverage collection produced no rows — the gate is lying')
    return 1
  }
  let summary
  try {
    summary = JSON.parse(readFileSync(coveragePath, 'utf8'))
  } catch (error) {
    console.log(`REFUSED (${coveragePath}): the summary is not readable JSON — `
      + (error instanceof Error ? error.message : String(error))
      + ' — coverage collection produced no rows — the gate is lying')
    return 1
  }
  const verdict = emptyTableVerdict(true, summary)
  if (!verdict.ok) {
    console.log(`REFUSED (${coveragePath}): ${verdict.refused}`)
    return 1
  }
  const rows = summaryFileRows(summary)
  const total = summary.total
  console.log(`coverage table verified at ${coveragePath}: ${rows.length} file row(s), `
    + `total ${total?.statements?.pct ?? '?'}% statements / ${total?.lines?.pct ?? '?'}% lines — not an empty table`)
  return 0
}

if (process.argv[1] !== undefined && process.argv[1].endsWith('coverage-rows-tripwire.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
