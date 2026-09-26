/**
 * tests/lane/commission.ts — THE 3088 LANE COMMISSIONER (the
 * harness's commissioning half, 2026-09-26).
 *
 * The runbook's ONE-CALL LAUNCH, as a callable: write the brief, write
 * the complete launch prompt, invoke
 * `scripts/commission-supervisor.sh`, and hand the result to the
 * analyst. Everything the runbook insists on is here, because each
 * one was paid for in a failed commission:
 *
 * - The brief is a HUMAN TASK, not a systems checklist (no card list,
 *   no graph, no hidden knobs — the maker discovers and loads those
 *   through the estate tools).
 * - The launch prompt carries the runbook's reporting laws, because
 *   "the laws ride in the prompt, not the brief".
 * - The transcript is discovered by GLOB + mtime ≥ this commission's
 *   boot (the collision law: the maker mints the `<HHMM>` name at
 *   FINISH time, so a predicted exact path reads every success as a
 *   flake).
 * - The commission is the HEADLESS maker on the 3088 lane through the
 *   supervisor. This module never hand-drives an estate door and
 *   never talks to 3080: a maker-less "harness" is the substitute the
 *   runbook forbids.
 * - The paths commissioned are the two the operator named: VIDEO
 *   (h3-timeline's film) and 3D non-Unity (the mesh cards/flows —
 *   Unity is an MCP editor lane, not this maker's).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PathName } from './analysis.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(HERE, '..', '..')
export const SUPERVISOR = join(REPO_ROOT, 'scripts/commission-supervisor.sh')

/** THE PATH TABLE — what each path's receipt IS, so a brief can ask
 *  for the deliverable in human words and the analyst can name what
 *  it is waiting for. Sourced from the estate's own declarations:
 *  `h3-timeline` (packages/video/h3-timeline, one card, family h3) is
 *  the only video card, and the non-Unity mesh cards are
 *  `img-to-mesh`, `rig`, `quad-remesh` (plus the mesh-emitting
 *  registry flows anny-hmr / body-to-somax / character / fit-seat /
 *  skin-apply). `anny` alone writes an 8-view PNG sheet, not a mesh —
 *  a 3D brief must therefore reach a mesh-writing card. */
export interface PathTableRow {
  path: PathName
  /** the deliverable in the brief's own words */
  deliverable: string
  /** what the analyst counts as the receipt (the path's artifact kind) */
  receipt: string
  /** the cards/flows a maker may legitimately reach for */
  cards: string[]
  receipt_note: string
}

export const PATH_TABLE: Readonly<Record<PathName, PathTableRow>> = {
  video: {
    path: 'video',
    deliverable: 'one short multi-window film, assembled and encoded as a single playable video file',
    receipt: 'the assembled film (h3_t4_film_*.mp4), not the per-window renders',
    cards: ['h3-timeline'],
    receipt_note: 'a run of window renders is not a film receipt — the assembled tail is',
  },
  '3d': {
    path: '3d',
    deliverable: 'one usable 3D model file of the subject, saved as a single binary mesh',
    receipt: 'a binary mesh (.glb) with real geometry',
    cards: ['img-to-mesh', 'rig', 'quad-remesh', 'anny-hmr', 'body-to-somax', 'character', 'fit-seat', 'skin-apply'],
    receipt_note: 'anny alone writes a multi-view image sheet, not a mesh — reach a mesh-writing card for the deliverable',
  },
} as const

/** THE BRIEF (a human task, never a checklist). The task text is the
 *  deliverable ask; the source artifacts are named by their served
 *  references; the transcript path is left to the maker's collision
 *  law (the harness never predicts the `<HHMM>` name — it globs). */
export function briefFor(path: PathName, opts: { subject?: string; sourceImage?: string } = {}): string {
  const row = PATH_TABLE[path]
  const subject = opts.subject ?? (path === 'video' ? 'a single character in a short scene' : 'the subject of the reference image')
  const lines: string[] = []
  lines.push('# Commission brief — 3088 media maker')
  lines.push('')
  if (path === 'video') {
    lines.push(
      `Produce ${row.deliverable}. The film should show ${subject}, and it should be watchable end to end: if the work needs a voice line, sound effects, or a music bed, make them and wire them into the film.`,
    )
  } else {
    lines.push(
      `Produce ${row.deliverable} for ${subject}. The model file must be loadable as-is by a 3D viewer — a real mesh with geometry, not a preview image or a turntable sheet.`,
    )
  }
  if (opts.sourceImage !== undefined) {
    // THE SOURCE-HONESTY LAW (a live commission's finding, 2026-09-26):
    // a brief that says "the subject" about an image the maker cannot
    // see invites a report that claims a subject it never observed —
    // which is exactly what happened when a 6 KB flat-colour TEST
    // FIXTURE was named as the subject. So: the image is the SOURCE
    // to reproduce (that is a fact), and a fixture/bench path is
    // labelled the stand-in it is.
    const standIn = /(^|\/)(tests?|bench|fixtures?|data\/probe)(\/|$)/.test(opts.sourceImage)
    lines.push('')
    lines.push(
      standIn
        ? 'Known source material — a STAND-IN reference image (it lives in a test/bench tree, so it is a stand-in, not the commissioned subject):'
        : 'Known source material — the reference image to reproduce as the deliverable:',
    )
    lines.push(`- ${opts.sourceImage}`)
    lines.push(
      'Reproduce THAT image as the deliverable. If your wire surface cannot show you images, say so in your report and describe the deliverable by its structure and measurements — never by a subject you could not see.',
    )
  }
  lines.push('')
  lines.push('Deliverables:')
  lines.push(`- the ${path === 'video' ? 'film' : 'model'} file itself, and the run that produced it`)
  lines.push('- a written report naming every run id and artifact you produced')
  lines.push('')
  lines.push(
    'Final verification: the deliverable must be present and openable. A queued run, a graph, or a screenshot is not a deliverable.',
  )
  return lines.join('\n') + '\n'
}

/** THE LAUNCH PROMPT — the runbook's skeleton, with the reporting
 *  laws the coding session relies on to analyze the result. */
export function launchPromptFor(briefPath: string, transcriptSlug: string): string {
  return `Read the brief file at ${briefPath} with the read tool and execute it exactly.

The native maker faces melite_discover, melite_load, melite_construct,
melite_flow, and run_status are direct function calls on your wire surface.
Do not search for them with search_tools and do not pass them through
invoke_tool. Deferred estate doors may be catalog-visible through the normal
tool mechanism.

Call search_tools once only if it is exposed on this wire surface, solely to
discover the deferred file tools needed to read the brief. Native maker
faces are intentionally absent from that catalog; if the tool is unavailable,
use the available direct read tool and record the gap. After the brief is
read, call melite_discover directly.

Use melite_discover to find the relevant card/flow, melite_load to open its
contract, and melite_construct to author the shared bench. Use melite_flow
only to execute the commissioned work and run_status to wait for progress.
Never shell out to ComfyUI, hand-build a graph, or use raw estate HTTP.

The lane is sandboxed. Do not try systemctl, journalctl, or nvidia-smi.
Use comfy_manage for engine status/logs, run_status for progress, ledger_tail
for history, melite_view for artifacts, and melite_read for a run's own TEXT
sidecars (\`_request.json\`, \`_flow.json\`, a handoff STATE.md — omit \`path\` to
list what the run holds).

Each melite_flow call mints a new run. Poll it with run_status; do not
re-press it as a polling mechanism. Read the exact refusal. A quota wall or
native door error is a stop condition, not a reason to silently retry.

THE MEDIA NAMESPACE: the /melite-media/ and /v1/assets/ paths are
engine-side references — they resolve for the estate, not for your
sandbox filesystem, and listing them locally will find nothing. The SAME
artifacts are on disk under the state root (the run's own output/<run_id>
directory); use melite_read for a run's text sidecars and run_status for
the served paths. Do not report a missing mount as a defect — it is the
shape of this lane.

THE FIDELITY-HONESTY LAW (a live commission's own finding): your report
describes what you actually made. If your wire surface cannot SHOW you an
image — no image input, no observe arm — then say so plainly and describe
every deliverable by its structure and measurement (bytes, vertices,
triangles, streams, duration, loudness), never by the subject you were
asked for. A reconstruction of a stand-in reference is not a mesh of the
subject, and a report that says it is has lied to the operator even if the
run succeeded. Where a source image is named in the brief and you could not
view it, the report must say the subject is UNVERIFIED.

Write your transcript to data/agent-video-test/transcript-${transcriptSlug}-<YYYYMMDD-HHMM>.md,
where the timestamp is the time you FINISH (the collision law: concurrent
commission sessions share that directory and a bare counter would overwrite a
sibling's receipt). Include every material tool call, run id, artifact path,
and any harness gap you encountered. Your final report must name the exact
artifact path of the deliverable and the run id that produced it.
`
}

export interface CommissionOptions {
  path: PathName
  /** a human-readable slug for the transcript (the collision-law name) */
  slug: string
  subject?: string
  sourceImage?: string
  /** the state root the maker runs under (the supervisor's own) */
  stateRoot?: string
  transcriptDir?: string
  profile?: string
  maxAttempts?: number
  lockWaitS?: number
  env?: Record<string, string>
  /** where the brief + launch prompt land (a temp dir by default) */
  workDir?: string
  /** run the launch (default true); false mints the files only */
  execute?: boolean
}

/** THE LANE-GAP READER (a live commission's finding, 2026-09-26):
 *  the estate's boot decisions ride the maker's log, and a not-seated
 *  seat on line 3 is read by nobody. The harness reads its OWN
 *  commission's attempt logs and carries the lane's boot gaps into the
 *  verdict, so "the agent engine was never seated" is a reported fact
 *  of the commission instead of a line somebody has to go looking for.
 *  Only the estate's own `[melite-estate]` lines are read — a maker's
 *  words are never mined for gaps. */
export function laneBootGaps(logText: string): string[] {
  const out: string[] = []
  for (const line of logText.split('\n')) {
    if (!line.startsWith('[melite-estate]')) continue
    const body = line.slice('[melite-estate]'.length).trim()
    if (body === '') continue
    // the boot DECISIONS (a seated seat, a not-seated seat, a refusal)
    if (/NOT seated|refus|not mounted|not set|unavailable|disabled|skipping/i.test(body)) {
      out.push(body)
    }
  }
  return out
}

export interface CommissionResult {
  /** the estate's boot decisions from this commission's own logs */
  lane_gaps: string[]
  path: PathName
  slug: string
  boot_ms: number
  brief_path: string
  prompt_path: string
  log_prefix: string
  /** the supervisor's exit code (null when not executed) */
  exit_code: number | null
  /** the supervisor's stderr/stdout tail — the death, when it died */
  output_tail: string
  state_root: string
  transcript_dir: string
}

function tail(text: string, lines = 40): string {
  return text.split('\n').slice(-lines).join('\n')
}

/** THE LAUNCH: mint the brief + launch prompt, then run the
 *  supervisor (the runbook's one-call launch). The supervisor owns
 *  the transient-vs-quota classifier, the queue-lock turn-wait, and
 *  the MELITE_HEADLESS export; this function only supplies its two
 *  files, the done-glob, and the boot stamp the analyst's transcript
 *  discovery needs. */
export async function commission(opts: CommissionOptions): Promise<CommissionResult> {
  const bootMs = Date.now()
  const workDir = opts.workDir ?? mkdtempSync(join(tmpdir(), `lane-${opts.path}-`))
  mkdirSync(workDir, { recursive: true })
  const briefPath = join(workDir, `brief-${opts.slug}.md`)
  const promptPath = join(workDir, `launch-${opts.slug}.txt`)
  const logPrefix = join(workDir, `attempt-${opts.slug}`)
  writeFileSync(briefPath, briefFor(opts.path, { subject: opts.subject, sourceImage: opts.sourceImage }), 'utf8')
  writeFileSync(promptPath, launchPromptFor(briefPath, opts.slug), 'utf8')
  const stateRoot = opts.stateRoot ?? REPO_ROOT
  const transcriptDir = opts.transcriptDir ?? join(REPO_ROOT, 'data/agent-video-test')

  if (opts.execute === false) {
    return {
      path: opts.path,
      slug: opts.slug,
      boot_ms: bootMs,
      brief_path: briefPath,
      prompt_path: promptPath,
      log_prefix: logPrefix,
      lane_gaps: [],
      exit_code: null,
    output_tail: '',
      state_root: stateRoot,
      transcript_dir: transcriptDir,
    }
  }

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...(opts.env ?? {}),
    SUPERVISOR_PROFILE: opts.profile ?? 'headless',
    SUPERVISOR_STATE_ROOT: stateRoot,
    // THE COLLISION LAW: the done marker is a GLOB (the maker mints
    // the <HHMM> name at finish), filtered by the supervisor's boot.
    SUPERVISOR_DONE_GLOB: join(transcriptDir, `transcript-${opts.slug}-*.md`),
  }
  if (opts.maxAttempts !== undefined) env['SUPERVISOR_MAX_ATTEMPTS'] = String(opts.maxAttempts)
  if (opts.lockWaitS !== undefined) env['SUPERVISOR_LOCK_WAIT_S'] = String(opts.lockWaitS)

  const result = await new Promise<{ code: number | null; output: string }>((resolvePromise) => {
    const child = spawn('bash', [SUPERVISOR, promptPath, logPrefix], { env, cwd: stateRoot })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('error', (e) => resolvePromise({ code: null, output: output + `\nspawn failed: ${e.message}` }))
    child.on('close', (code) => resolvePromise({ code, output }))
  })

  return {
    path: opts.path,
    slug: opts.slug,
    boot_ms: bootMs,
    brief_path: briefPath,
    prompt_path: promptPath,
    log_prefix: logPrefix,
    lane_gaps: laneBootGaps(attemptLogText(logPrefix)),
    exit_code: result.code,
    output_tail: tail(result.output),
    state_root: stateRoot,
    transcript_dir: transcriptDir,
  }
}

/** The attempt logs the supervisor wrote beside its out-prefix (the
 *  analyst reads them; the harness never invents a receipt). */
/** The concatenated attempt logs of one commission (the analyst's
 *  own read; the supervisor's death words are in the same files). */
export function attemptLogText(logPrefix: string): string {
  const dir = dirname(logPrefix)
  if (!existsSync(dir)) return ''
  const base = logPrefix.slice(dir.length + 1)
  let out = ''
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(base) || !name.endsWith('.log')) continue
    try {
      out += readFileSync(join(dir, name), 'utf8')
    } catch {
      // a log that cannot be read is not a gap; the supervisor's exit
      // code carries the death
    }
  }
  return out
}

export function attemptLogs(result: CommissionResult): string[] {
  const dir = dirname(result.log_prefix)
  if (!existsSync(dir)) return []
  const base = result.log_prefix.slice(dir.length + 1)
  const out: string[] = []
  // the supervisor writes <prefix>-attempt<k>.log beside its out-prefix
  for (const name of readdirSync(dir)) {
    if (name.startsWith(base) && name.endsWith('.log')) out.push(join(dir, name))
  }
  return out.sort()
}

export function readTextIfPresent(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined
}
