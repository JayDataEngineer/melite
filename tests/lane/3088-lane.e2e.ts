/**
 * tests/lane/3088-lane.e2e.ts — THE 3088 LANE LIVE GATE (the
 * operator's ask, 2026-09-26: "tests for the 3088 lane … test and
 * analyze the video paths and the 3d paths (non-unity)").
 *
 * This spec is the harness's LIVE half. It runs against the real
 * estate (the maker's own run tree, the real engine, the served
 * media door) and judges the VIDEO and 3D paths from what a
 * commission actually left behind — the runbook's analyst pass as a
 * gate.
 *
 * THE PREREQUISITE LAW: a missing prerequisite self-skips the SPEC
 * (the inference-smoke precedent — a skip is not a cost signal), but
 * the skip is never a PASS: this spec writes a machine-readable
 * verdict receipt naming the exact prerequisite, and its receipt
 * reports `blocked`, not `pass`. Run it with
 * `pnpm run test:lane` to see the verdict; the walls that prove the
 * judging itself live in tests/lane/analysis.spec.ts and run with no
 * engine at all.
 *
 * To COMMISSION a fresh video or 3D brief through the headless maker
 * (the real 3088 lane, minutes long, provider quota), run
 * `pnpm run test:lane:commission -- --path video|3d|both`. This spec
 * then judges whatever the tree holds — the harness never fabricates
 * a receipt to pass.
 */
import { describe, it, expect } from 'vitest'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PATH_NAMES,
  assessPath,
  discoverTranscript,
  renderReport,
  scanRunTree,
  type LaneReport,
  type PathVerdict,
} from './analysis.ts'
import { PATH_TABLE } from './commission.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')
const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')
/** the runs roots the analyst reads: the maker's own state root
 *  (`MELITE_STATE_ROOT`, else the repo's data/runs) plus any extra
 *  cross-root seat the environment names (§23's law). */
const ROOTS: string[] = [
  process.env['MELITE_STATE_ROOT'] ?? join(REPO, 'data/runs'),
  ...((process.env['MELITE_STATE_ROOTS'] ?? '').split(':').filter((r) => r !== '')),
]

async function engineAlive(): Promise<boolean> {
  try {
    const res = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/system_stats`, {
      signal: AbortSignal.timeout(20_000),
    })
    return res.ok
  } catch {
    return false
  }
}

const VERDICT_PATH = join(REPO, 'data/lane-harness/verdict.json')

function writeVerdict(report: LaneReport, blocked: string[]): void {
  mkdirSync(dirname(VERDICT_PATH), { recursive: true })
  writeFileSync(
    VERDICT_PATH,
    JSON.stringify(
      {
        kind: '3088-lane-verdict',
        written_at: new Date().toISOString(),
        // THE SKIP LAW: a blocked harness is `pass: false`. A reader
        // can never mistake "did not run" for "ran clean".
        pass: blocked.length === 0 && report.paths.every((p) => p.state === 'pass'),
        blocked,
        report,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
}

const HAS_ENGINE = await engineAlive()
const BLOCKED: string[] = HAS_ENGINE
  ? []
  : [`ComfyUI engine not reachable at http://${ENGINE_HOST}:${ENGINE_PORT} (the video and 3D paths both compose through it)`]

/** THE WINDOW: the run tree is cumulative (thousands of historical
 *  runs), so the gate judges a window — 24h by default, overridable
 *  with LANE_SINCE_MS (the commission driver's own boot after a fresh
 *  commission). A gate that reported the archive would answer "the
 *  tree", not "the lane". */
const SINCE_MS = Number(process.env['LANE_SINCE_MS'] ?? Date.now() - 86_400_000)

/** THE STRICT PIN: by default this spec proves the HARNESS is honest
 *  (it judges, reports and records whatever the tree holds) so a box
 *  without a fresh commission is not permanently red. With
 *  `LANE_STRICT=1` it is the GATE: every judged path must pass, and a
 *  fail fails the suite with its reasons. The driver
 *  (`pnpm run test:lane:analyse`) always exits non-zero on a fail. */
const STRICT = process.env['LANE_STRICT'] === '1'

describe.skipIf(!HAS_ENGINE)('the 3088 lane — the live analyst (video + 3d, non-Unity)', () => {
  const boot = Date.now()
  const receipts = scanRunTree(ROOTS)
  const paths: PathVerdict[] = PATH_NAMES.map((name) =>
    assessPath(name, receipts, { blocked: BLOCKED, sinceMs: SINCE_MS }),
  )
  const report: LaneReport = {
    boot_ms: boot,
    roots: ROOTS,
    runs_scanned: receipts.length,
    transcript: discoverTranscript(join(REPO, 'data/agent-video-test'), 'lane', boot),
    paths,
    blocked: BLOCKED,
  }
  writeVerdict(report, BLOCKED)

  it('scans the real runs tree (a tree with no run dirs is a finding, not a crash)', () => {
    console.log(renderReport(report))
    expect(Array.isArray(receipts)).toBe(true)
  })

  for (const name of PATH_NAMES) {
    it(`judges the ${name} path against real artifacts (${PATH_TABLE[name].receipt})`, () => {
      const verdict = paths.find((p) => p.path === name)
      expect(verdict).toBeDefined()
      // the verdict is REPORTED either way — the wall is that it is
      // honest, and that a pass is only ever claimed on a real,
      // parseable receipt of this path's kind
      if (verdict?.state === 'pass') {
        expect(verdict.artifacts.some((a) => a.receipt && a.verdict_ok)).toBe(true)
        for (const art of verdict.artifacts) {
          if (art.receipt) expect(art.bytes).toBeGreaterThan(0)
        }
      } else {
        expect(verdict?.reasons.length).toBeGreaterThan(0)
        console.log(`[lane] ${name} is ${verdict?.state}: ${verdict?.reasons.join(' | ')}`)
      }
      // the receipt file is always written: blocked/fail/pass alike
      expect(existsSync(VERDICT_PATH)).toBe(true)
      if (STRICT) {
        expect(
          verdict?.state,
          `the ${name} path is ${verdict?.state}: ${verdict?.reasons.join(' | ')}`,
        ).toBe('pass')
      }
    })
  }
})

describe('the 3088 lane — the verdict receipt (always runs, even when the engine is gone)', () => {
  it('names the exact prerequisite when blocked, and never calls a skip a pass', () => {
    if (HAS_ENGINE) {
      expect(existsSync(VERDICT_PATH)).toBe(true)
      return
    }
    const blocked = [`ComfyUI engine not reachable at http://${ENGINE_HOST}:${ENGINE_PORT}`]
    const empty: LaneReport = {
      boot_ms: Date.now(),
      roots: ROOTS,
      runs_scanned: 0,
      transcript: discoverTranscript(join(REPO, 'data/agent-video-test'), 'lane', Date.now()),
      paths: PATH_NAMES.map((name) => assessPath(name, [], { blocked })),
      blocked,
    }
    writeVerdict(empty, blocked)
    const written = JSON.parse(readFileSync(VERDICT_PATH, 'utf8')) as { pass: boolean; blocked: string[] }
    expect(written.pass).toBe(false)
    expect(written.blocked[0]).toMatch(/ComfyUI engine not reachable/)
  })
})
