/**
 * tests/lane/run.ts — THE 3088 LANE HARNESS DRIVER.
 *
 * One command, two phases, the operator's ask in one place:
 *
 *   analyse    (default) read the maker's run tree + the transcript
 *              namespace and JUDGE the video and 3D (non-Unity)
 *              paths. No maker boots. Exits non-zero when a path
 *              fails or is blocked — a blocked harness is never a
 *              pass.
 *
 *   commission launch a REAL headless maker on the 3088 lane for the
 *              chosen path(s) through scripts/commission-supervisor.sh
 *              (minutes long; spends provider quota), then analyse
 *              what it left behind. `--dry` mints the brief + launch
 *              prompt and prints them without launching anything.
 *
 * Usage:
 *   node --experimental-strip-types tests/lane/run.ts analyse [--path video|3d|both]
 *   node --experimental-strip-types tests/lane/run.ts commission --path video|3d|both [--dry]
 *
 * The harness never fabricates a receipt, never hand-drives an estate
 * door, and never treats a self-skip as a pass (RUNBOOK-3088-AGENT).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PATH_NAMES,
  assessPath,
  discoverTranscript,
  renderReport,
  scanRunTree,
  transcriptFloor,
  type LaneReport,
  type PathName,
} from './analysis.ts'
import { REPO_ROOT, commission, type CommissionResult } from './commission.ts'

interface Args {
  phase: 'analyse' | 'commission'
  path: PathName | 'both'
  dry: boolean
  /** THE WINDOW: only runs newer than this are judged (the tree is
   *  cumulative; the default is 24h so a stand-alone analyse reports
   *  the recent commission, not the archive) */
  sinceMs: number
  slug?: string
  subject?: string
  sourceImage?: string
}

function parseArgs(argv: readonly string[]): Args {
  const phase = argv[0] === 'commission' ? 'commission' : 'analyse'
  const out: Args = { phase, path: 'both', dry: false, sinceMs: Date.now() - 86_400_000 }
  for (let i = phase === 'commission' ? 1 : 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--path') {
      const value = argv[i + 1]
      if (value === 'video' || value === '3d' || value === 'both') out.path = value
      i++
    } else if (arg === '--dry') {
      out.dry = true
    } else if (arg === '--since') {
      const raw = argv[i + 1]
      const parsed = raw !== undefined ? Date.parse(raw) : Number(raw)
      if (!Number.isNaN(parsed)) out.sinceMs = parsed
      i++
    } else if (arg === '--all') {
      out.sinceMs = 0
    } else if (arg === '--slug') {
      out.slug = argv[i + 1]
      i++
    } else if (arg === '--subject') {
      out.subject = argv[i + 1]
      i++
    } else if (arg === '--source-image') {
      out.sourceImage = argv[i + 1]
      i++
    }
  }
  return out
}

const chosen = (path: PathName | 'both'): PathName[] =>
  path === 'both' ? [...PATH_NAMES] : [path]

/** THE RUN-SEAT LAW (learned from a live commission, 2026-09-26): a
 *  maker launched by the supervisor runs under SUPERVISOR_STATE_ROOT
 *  (the repo root by default) and mints ITS runs in
 *  `<state root>/output/` — while the studio/user lane's estate serves
 *  `data/runs/output/`. Both are real seats; a harness that reads only
 *  the user's tree judges a commission it cannot see. So: the state
 *  root FIRST (the maker's own seat), then the studio tree, then any
 *  §23 cross-root extras, deduped. */
const ROOTS: string[] = [
  ...new Set([
    process.env['MELITE_STATE_ROOT'] ?? REPO_ROOT,
    join(REPO_ROOT, 'data/runs'),
    ...((process.env['MELITE_STATE_ROOTS'] ?? '').split(':').filter((r) => r !== '')),
  ]),
]

const VERDICT_PATH = join(REPO_ROOT, 'data/lane-harness/verdict.json')

function writeVerdict(report: LaneReport, commissions: CommissionResult[]): void {
  mkdirSync(dirnameOf(VERDICT_PATH), { recursive: true })
  writeFileSync(
    VERDICT_PATH,
    JSON.stringify(
      {
        kind: '3088-lane-verdict',
        written_at: new Date().toISOString(),
        pass: report.blocked.length === 0 && report.paths.every((p) => p.state === 'pass'),
        blocked: report.blocked,
        commissions: commissions.map((c) => ({
          path: c.path,
          slug: c.slug,
          exit_code: c.exit_code,
          brief: c.brief_path,
          prompt: c.prompt_path,
          logs: c.log_prefix,
        })),
        lane_gaps: commissions.flatMap((c) => c.lane_gaps.map((g) => `${c.path}: ${g}`)),
        report,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
}

function dirnameOf(path: string): string {
  const at = path.lastIndexOf('/')
  return at === -1 ? '.' : path.slice(0, at)
}

function analyse(commissions: CommissionResult[], sinceMs: number): number {
  const boot = Date.now()
  const receipts = scanRunTree(ROOTS)
  const report: LaneReport = {
    boot_ms: boot,
    roots: ROOTS,
    runs_scanned: receipts.length,
    runs: receipts,
    // THE TRANSCRIPT-FLOOR LAW: the commission's boot, never this
    // analysis's own clock (see analysis.ts).
    transcript: discoverTranscript(
      join(REPO_ROOT, 'data/agent-video-test'),
      'lane',
      transcriptFloor(commissions, Math.min(sinceMs, boot)),
    ),
    paths: chosen(args.path).map((name) => assessPath(name, receipts, { sinceMs, requireAudio: true })),
    blocked: [],
  }
  console.log(renderReport(report))
  const gaps = commissions.flatMap((c) => c.lane_gaps)
  if (gaps.length > 0) {
    console.log('\nlane boot gaps this commission (the estate\'s own decisions):')
    for (const gap of gaps) console.log(`  ! ${gap}`)
  }
  console.log(`\nwindow: runs newer than ${new Date(sinceMs).toISOString()} (${receipts.length} run dir(s) in the tree)`)
  writeVerdict(report, commissions)
  console.log(`\nverdict receipt: ${VERDICT_PATH}`)
  for (const verdict of report.paths) {
    if (verdict.state !== 'pass') {
      console.error(`[lane] ${verdict.path}: ${verdict.state} — ${verdict.reasons.join(' | ')}`)
    }
  }
  // the exit law: a fail or a block is a non-zero harness run
  return report.paths.every((p) => p.state === 'pass') ? 0 : 1
}

const args = parseArgs(process.argv.slice(2))

if (args.phase === 'analyse') {
  process.exit(analyse([], args.sinceMs))
} else {
  const base = args.slug ?? `lane-harness-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13)}`
  const results: CommissionResult[] = []
  for (const name of chosen(args.path)) {
    // THE SLUG LAW: each path's commission owns its slug, or a
    // `--path both` run would have the second launch overwrite the
    // first's attempt logs and share one transcript glob.
    const slug = args.slug !== undefined || chosen(args.path).length === 1 ? base : `${base}-${name}`
    console.log(`[lane] commissioning the ${name} path (slug ${slug}) …`)
    const result = await commission({
      path: name,
      slug,
      subject: args.subject,
      sourceImage: args.sourceImage,
      execute: !args.dry,
    })
    results.push(result)
    if (args.dry) {
      console.log(`[lane] dry — brief: ${result.brief_path}\n[lane] dry — prompt: ${result.prompt_path}`)
      continue
    }
    console.log(`[lane] ${name} supervisor exit: ${result.exit_code}`)
    if (result.exit_code !== 0) {
      console.error(result.output_tail)
    }
  }
  if (args.dry) {
    process.exit(0)
  }
  const missing = results.filter((r) => !existsSync(join(r.transcript_dir, `transcript-${r.slug}-0000.md`)))
  void missing
  // the commission's own boot is the window: the harness judges THIS
  // commission, and the archive can never make it pass or fail
  process.exit(analyse(results, results[0]?.boot_ms ?? args.sinceMs))
}
