/**
 * tests/lane/commission.spec.ts — THE COMMISSIONER'S WALLS.
 *
 * The 3088 lane harness's commissioning half is proven without a
 * maker, a GPU, or a provider key:
 *
 * - the BRIEF is a human task: it asks for a deliverable, never a card
 *   list, a graph, a model knob, or a decomposition checklist (the
 *   runbook's brief law). It DOES name a known source artifact when
 *   the caller has one, and it states the final verification.
 * - the LAUNCH PROMPT carries the runbook's reporting laws (the
 *   transcript naming law, the poll-don't-repress law, the
 *   never-shell-to-ComfyUI law) and points at the brief by path.
 * - the LAUNCH invokes the supervisor with the done-GLOB and the boot
 *   stamp, and returns its exit code honestly — a stubbed supervisor
 *   binary proves the wiring (the same stubbing seam
 *   scripts/commission-supervisor.spec.ts uses for its dsh binary),
 *   including the quota exit code (75) passing through UNCHANGED.
 * - a no-execute commission still mints both files (the dry shape a
 *   human reads before spending a maker).
 */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import {
  PATH_TABLE,
  attemptLogs,
  briefFor,
  commission,
  launchPromptFor,
  SUPERVISOR,
} from './commission.ts'

/** A stub DSH BINARY: the supervisor launches the maker as
 *  `node "$DSH_BIN" --profile … <prompt>`, so the stub is a Node
 *  script (a bash stub would die on its first line). It behaves like
 *  a MAKER, not like a no-op, because the supervisor's own contract
 *  turns on the two facts a maker produces:
 *
 *  - the TRANSCRIPT (the done-glob match) — without it the
 *    supervisor classifies the attempt as a boot flake and relaunches
 *    to its cap, which is the real law, not a stub artifact;
 *  - the WORDS (a quota body is a wall; a transient body is a
 *    moment) — so the quota wall can be proven end to end.
 *
 *  No maker boots, no provider is called, no GPU is touched. */
function stubMaker(opts: {
  exitCode?: number
  /** what the maker says (the supervisor classifies THESE words) */
  say?: string
  /** mint the transcript the done-glob expects (the happy path) */
  transcript?: boolean
}): { bin: string; record: string } {
  const dir = mkdtempSync(join(tmpdir(), 'lane-stub-maker-'))
  const record = join(dir, 'invocation.json')
  const bin = join(dir, 'maker-stub.mjs')
  const say = opts.say ?? 'brief read, transcript written'
  writeFileSync(
    bin,
    `import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
// the supervisor runs: node "$DSH_BIN" --profile <profile> <prompt>
const profile = process.argv[2] === '--profile' ? process.argv[3] : ''
const prompt = process.argv.slice(4).join(' ')
writeFileSync(${JSON.stringify(record)}, JSON.stringify({
  profile,
  prompt,
  env: {
    SUPERVISOR_PROFILE: process.env.SUPERVISOR_PROFILE ?? '',
    SUPERVISOR_STATE_ROOT: process.env.SUPERVISOR_STATE_ROOT ?? '',
    SUPERVISOR_DONE_GLOB: process.env.SUPERVISOR_DONE_GLOB ?? '',
    SUPERVISOR_MAX_ATTEMPTS: process.env.SUPERVISOR_MAX_ATTEMPTS ?? '',
    MELITE_HEADLESS: process.env.MELITE_HEADLESS ?? '',
    MELITE_STATE_ROOT: process.env.MELITE_STATE_ROOT ?? '',
    MELITE_STATE_ROOTS: process.env.MELITE_STATE_ROOTS ?? '',
  },
}, null, 2))
${opts.transcript === true ? `{
  const glob = process.env.SUPERVISOR_DONE_GLOB ?? ''
  if (glob !== '') {
    const name = glob.slice(glob.lastIndexOf('/') + 1).replace('*', '0000')
    writeFileSync(join(dirname(glob), name), '# stub transcript\\n- brief read\\n- deliverable named\\n')
  }
}` : ''}
process.stdout.write(${JSON.stringify(say)} + '\\n')
process.exit(${opts.exitCode ?? 0})
`,
    'utf8',
  )
  return { bin, record }
}

/** `commission()` runs the repo's real supervisor; a wall that wants
 *  a stub needs the seam. The supervisor takes its dsh binary from
 *  SUPERVISOR_DSH_BIN, but the SUPERVISOR SCRIPT path is fixed — so
 *  the wall copies the real script's contract by pointing SUPERVISOR's
 *  own knobs at a stub dsh, exactly as the supervisor's own spec does. */
async function launchThroughRealSupervisor(
  stub: { bin: string; record: string },
  opts: { maxAttempts?: number; slug: string; transcriptDir: string; stateRoot: string },
): Promise<{ code: number | null; env: string; output: string; logPrefix: string }> {
  const result = await commission({
    path: 'video',
    slug: opts.slug,
    stateRoot: opts.stateRoot,
    transcriptDir: opts.transcriptDir,
    maxAttempts: opts.maxAttempts,
    env: {
      // the real supervisor still runs (its classifier + turn-wait
      // are the contract under test); the DSH BINARY is the stub, so
      // no maker boots.
      SUPERVISOR_DSH_BIN: stub.bin,
      SUPERVISOR_BACKOFF_S: '0',
    },
  })
  const env = existsSync(stub.record) ? readFileSync(stub.record, 'utf8') : ''
  return { code: result.exit_code, env, output: result.output_tail, logPrefix: result.log_prefix }
}

describe('the commissioner — the brief law (a human task, not a checklist)', () => {
  it('asks for the deliverable in human words and names no card, graph, or knob', () => {
    for (const path of ['video', '3d'] as const) {
      const brief = briefFor(path)
      expect(brief).toMatch(/# Commission brief/)
      expect(brief).toMatch(/Deliverables:/)
      expect(brief).toMatch(/Final verification:/)
      // the forbidden shapes: a systems checklist in a brief
      for (const forbidden of ['melite_construct', 'add_stage', 'class_type', 'workflow', 'steps:', 'cfg', 'denoise']) {
        expect(brief).not.toMatch(new RegExp(forbidden.replace(':', '\\s*:')))
      }
    }
  })

  it('the video brief asks for ONE assembled film, not renders', () => {
    const brief = briefFor('video', { subject: 'a lighthouse keeper in a storm' })
    expect(brief).toMatch(/lighthouse keeper in a storm/)
    expect(brief).toMatch(/single playable video file/)
  })

  it('the 3D brief asks for a model file, and says a viewer must be able to open it', () => {
    const brief = briefFor('3d', { subject: 'the ruined lighthouse' })
    expect(brief).toMatch(/ruined lighthouse/)
    expect(brief).toMatch(/loadable as-is by a 3D viewer/)
    // a mesh, explicitly not a turntable sheet
    expect(brief).toMatch(/not a preview image or a turntable sheet/)
  })

  it('names a known source artifact only when the caller has one', () => {
    expect(briefFor('3d')).not.toMatch(/Known source material/)
    const withSource = briefFor('3d', { sourceImage: '/v1/assets/runs/run-x/img.png' })
    expect(withSource).toMatch(/Known source material/)
    expect(withSource).toMatch(/\/v1\/assets\/runs\/run-x\/img\.png/)
  })

  it('the path table states each path receipt, and warns that anny alone is not a mesh', () => {
    expect(PATH_TABLE.video.cards).toContain('h3-timeline')
    expect(PATH_TABLE.video.receipt).toMatch(/assembled film/)
    expect(PATH_TABLE['3d'].cards).toContain('img-to-mesh')
    expect(PATH_TABLE['3d'].receipt_note).toMatch(/anny alone writes a multi-view image sheet/)
  })
})

describe('the commissioner — the launch prompt (the laws ride here, not the brief)', () => {
  const prompt = launchPromptFor('/tmp/brief.md', 'lane-harness')

  it('points at the brief by path and demands it be read', () => {
    expect(prompt).toMatch(/Read the brief file at \/tmp\/brief\.md/)
    expect(prompt).toMatch(/execute it exactly/)
  })

  it('carries the reporting laws the analyst depends on', () => {
    expect(prompt).toMatch(/Poll it with run_status; do not\s*\n?re-press it/)
    expect(prompt).toMatch(/Never shell out to ComfyUI/)
    expect(prompt).toMatch(/A quota wall or\s*\n?native door error is a stop condition/)
  })

  it('names the transcript with the collision-law slug and the finish-time stamp', () => {
    expect(prompt).toMatch(/transcript-lane-harness-<YYYYMMDD-HHMM>\.md/)
    expect(prompt).toMatch(/the time you FINISH/)
  })

  it('demands the artifact path and run id in the final report', () => {
    expect(prompt).toMatch(/exact\s*\n?artifact path of the deliverable/)
    expect(prompt).toMatch(/run id that produced it/)
  })
})

describe('the commissioner — the launch (a stubbed maker, never a real one)', () => {
  it('mints both files without executing when asked for the dry shape', async () => {
    const result = await commission({ path: 'video', slug: 'lane-dry', execute: false })
    expect(result.exit_code).toBeNull()
    expect(existsSync(result.brief_path)).toBe(true)
    expect(existsSync(result.prompt_path)).toBe(true)
    expect(readFileSync(result.brief_path, 'utf8')).toMatch(/# Commission brief/)
    expect(readFileSync(result.prompt_path, 'utf8')).toMatch(/Read the brief file at/)
  })

  it('passes the done-GLOB (never a predicted exact path) and the headless profile to the supervisor', async () => {
    const stub = stubMaker({ transcript: true })
    const transcriptDir = mkdtempSync(join(tmpdir(), 'lane-transcripts-'))
    const stateRoot = mkdtempSync(join(tmpdir(), 'lane-state-'))
    const launched = await launchThroughRealSupervisor(stub, {
      slug: 'lane-glob',
      transcriptDir,
      stateRoot,
    })
    expect(launched.code).toBe(0)
    const seen = JSON.parse(launched.env) as { env: Record<string, string>; profile: string; prompt: string }
    expect(seen.profile).toBe('headless')
    expect(seen.env.SUPERVISOR_DONE_GLOB).toBe(`${transcriptDir}/transcript-lane-glob-*.md`)
    // the supervisor exports the headless lane + pins the state root
    expect(seen.env.MELITE_HEADLESS).toBe('1')
    expect(seen.env.MELITE_STATE_ROOT).toBe(stateRoot)
    // and the maker receives the COMPLETE launch prompt as its prompt
    expect(seen.prompt).toMatch(/Read the brief file at/)
    // the done-GLOB is what ended the commission: the stub's
    // transcript now exists, minted by the stub against the glob
    expect(existsSync(join(transcriptDir, 'transcript-lane-glob-0000.md'))).toBe(true)
  }, 120_000)

  it('passes a quota wall (exit 75) through UNCHANGED — the harness never reclassifies it', async () => {
    const stub = stubMaker({
      exitCode: 1,
      // the dead-key receipt: a 429 that names the usage limit
      say: '429 rate_limit_exceeded: You have exceeded your quota (usage limit reached). Please try again later.',
    })
    const transcriptDir = mkdtempSync(join(tmpdir(), 'lane-transcripts-'))
    const stateRoot = mkdtempSync(join(tmpdir(), 'lane-state-'))
    const launched = await launchThroughRealSupervisor(stub, { slug: 'lane-quota', transcriptDir, stateRoot })
    // 75 is the supervisor's quota wall: token written, no relaunch,
    // passed through untouched — the harness reports the code, it
    // never reclassifies a wall as a moment (the runbook's stop law)
    expect(launched.code).toBe(75)
    const token = join(dirname(launched.logPrefix as string), 'attempt-lane-quota-resume.token.md')
    expect(existsSync(token)).toBe(true)
  }, 120_000)

  it('records the attempt logs the supervisor wrote beside its out-prefix', async () => {
    const stub = stubMaker({ transcript: true, say: 'attempt 1: brief read, transcript written' })
    const transcriptDir = mkdtempSync(join(tmpdir(), 'lane-transcripts-'))
    const stateRoot = mkdtempSync(join(tmpdir(), 'lane-state-'))
    const result = await commission({
      path: '3d',
      slug: 'lane-logs',
      stateRoot,
      transcriptDir,
      env: { SUPERVISOR_DSH_BIN: stub.bin, SUPERVISOR_BACKOFF_S: '0' },
    })
    const logs = attemptLogs(result)
    expect(logs.length).toBeGreaterThan(0)
    expect(readFileSync(logs[0] as string, 'utf8')).toMatch(/brief read, transcript written/)
  }, 120_000)
})

describe('the commissioner — the work dir is a real, readable receipt', () => {
  it('keeps the brief and prompt together, and the transcript dir is where the law says', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lane-work-'))
    const result = await commission({ path: 'video', slug: 'lane-files', workDir: dir, execute: false })
    expect(result.brief_path.startsWith(dir)).toBe(true)
    expect(result.prompt_path.startsWith(dir)).toBe(true)
    expect(result.log_prefix.startsWith(dir)).toBe(true)
    expect(result.transcript_dir).toMatch(/data\/agent-video-test$/)
    // the written brief names the path it was given
    expect(readFileSync(result.brief_path, 'utf8')).toMatch(/Commission brief/)
  })

  it('creates a work dir when the caller names none (never a silent cwd write)', async () => {
    const before = existsSync(join(process.cwd(), 'brief-lane-auto.md'))
    const result = await commission({ path: '3d', slug: 'lane-auto', execute: false })
    expect(existsSync(join(process.cwd(), 'brief-lane-auto.md'))).toBe(before)
    expect(result.brief_path).toMatch(/lane-3d-/)
  })
})
