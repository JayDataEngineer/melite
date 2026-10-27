import { WIRE_STAGE_KEYS, benchSessionOf, normalizeBenchStages } from "@melite/contracts/benchStage"
import { FLOW_ID_RE } from '@melite/estate-queue'
// melite-construct.ts — THE AUTHOR VERB over one shared bench
// (the bench rework, 2026-09-10). melite_flow executes;
// melite_construct AUTHORS — verbs over
// THE working flow both the model and the user edit. Never mints:
// the bench is ensure'd once per key and edited in place.
//
// ZERO IDS (the one-shared-state law): the common signature carries
// no draft id, no bench key — the default bench ("main") is the
// shared state the card tab streams. The optional `bench` key
// exists for named side-benches only (the door supports arbitrary
// session keys; the tool surface stays single-state by default).
//
// CAS LAW: every mutation takes expect_rev — the rev from the
// model's last read. A moved bench refuses 409 with current_rev;
// re-read and re-apply. Reads are always fresh (no cache between
// calls — staleness is structurally impossible).
//
// Verbs:
//   read         → {rev, intent, stages[], log heads} (auto-ensures)
//   load         → replace the stages (template/restore/bulk)
//   patch        → merge params onto one stage
//   add_stage    → append a card stage (optional input wiring)
//   remove_stage → splice a stage out
//   rewire       → set/clear one input binding
//   undo         → walk the log (author-filterable)
//   validate     → compile the bench at the validate door (NO GPU)
//
// The stage ROW is the runner's shape ({id, engine, params, inputs,
// outputs} + card for the kinds pass) plus presentation extras the
// door tolerates and the wire projection strips (provenance,
// runStatus, result).
import { createHash } from 'node:crypto'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { Estate, BenchVerb } from '../estate.ts'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'
import { coerceWireArrays, unwrapItemArrays } from '@melite/comfyui-card-kit'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { emitKnob } from '@melite/comfyui-card-kit/params-emit'
import { extraOf } from '@melite/contracts/extraKeys'

/** The doc ride's fetch bound (same 20s as the load door's card read):
 *  the landing has already succeeded, so a slow doc plane must not
 *  hold the call open. */
const DOC_TIMEOUT_MS = 20_000

/** The default bench — the unattributed seat (headless runs,
 *  legacy callers). */
export const DEFAULT_BENCH = 'main'

// ── THE PER-CONVERSATION BENCH (stroke 44: the flow belongs to the
// conversation — "when I start a new conversation, that old flow
// will be there like before" — never again). The agent on whose
// behalf the call runs IS the conversation: ToolExecution.agent.id
// is the SessionId (dsh-agent: "Session-backed Agent identity"; the
// agent loop sets it on every chat dispatch — tools.md:195). The
// construct binds to exactly that key, so a conversation's agent
// can only ever author its OWN bench — cross-conversation state is
// unreachable, not merely discouraged.
export function benchKeyOfExec(exec: { agent?: { id?: unknown } }): string {
  // THE ONE SPELLING (the li-ay stroke, 2026-10-11): the sanitize
  // decision was spelled inline here TWICE (this one and benchKeyOf
  // below) while the two clients spelled it again — the contract
  // floor owns the decision now, beside its grammar.
  const id = exec.agent?.id
  return benchSessionOf(typeof id === 'string' ? id : undefined)
}

type ConstructResult = {
  verb: string;
  bench: string;
  rev?: number;
  ok?: boolean;
  error?: string;
  error_kind?: string;
} & Record<string, JsonValue>

function benchKeyOf(a: Record<string, unknown>): string {
  const k = a['bench']
  return benchSessionOf(typeof k === 'string' ? k : undefined)
}

/** The mutation verbs whose failure leaves the write unproven — the
 *  door cannot say whether the seat applied before it failed
 *  (slice 5's ambiguous_no_write landing state). Read-only verbs and
 *  validate never claim a landing. */
const MUTATION_VERBS = new Set([
  'load', 'patch', 'add_stage', 'remove_stage', 'clear', 'floor', 'rewire', 'undo',
])

/** The ambiguous-no-write landing fragment for a failed mutation —
 *  a Record so the payload's index signature stays JsonValue (an
 *  optional `landing?: undefined` property is not a JsonValue). */
function unprovenLandingOf(verb: string): Record<string, JsonValue> {
  return MUTATION_VERBS.has(verb) ? { landing: 'ambiguous_no_write' } : {}
}

/** Refusal formatting shared by every verb (the remote's RemoteError
 *  first — code + message, the CAS detail rides details.current_rev —
 *  then any Error's message; lanes still awaiting their remote refuse
 *  loudly as plain errors). A mutation's failure carries the third
 *  landing state: the write is UNPROVEN (a transport failure cannot
 *  prove the seat did not apply), so the answer says re-read before
 *  retrying instead of implying a clean no-write. */
function refusalOf(e: unknown, verb: string, bench: string): ConstructResult {
  const landing = unprovenLandingOf(verb)
  const refusal = remoteErrorOf(e)
  if (refusal !== undefined) {
    const details = refusal.details as Record<string, unknown> | undefined
    const currentRev = details !== undefined && typeof details['current_rev'] === 'number'
      ? details['current_rev'] as number
      : undefined
    return jsonClean<ConstructResult>({
      verb, bench,
      error: refusal.message,
      error_kind: refusal.code,
      ok: false,
      ...(currentRev !== undefined ? { current_rev: currentRev } : {}),
      ...landing,
    })
  }
  const error = e instanceof Error ? e.message : String(e)
  return jsonClean<ConstructResult>({ verb, bench, error, error_kind: 'remote', ok: false, ...landing })
}

// ── THE COMPILE VERDICT ON EVERY WIRING MUTATION (session
// 90a0b920's worst loop, 2026-10-21: the agent landed wires, met the
// kind gate only at a LATER validate, read an identical refusal three
// times, guessed kinds, and abandoned wiring — the operator repaired
// the bench off-log). The mutation that changes wiring now carries
// the compile's own verdict IN ITS ANSWER: ok, or the gate's teaching
// refusal verbatim (the vocabulary + the expected {} fix + where the
// card's own kinds live). One call = the write + the judgement.

/** The card-schema remedy for a compile refusal (slice 5): the
 *  structured {public_param, current_value, allowed_values} the agent
 *  can act on. Best-effort — a card-defs read that fails leaves the
 *  compile_error as the only voice, never a fabricated cure.
 *  @param stages the post-write bench stages.
 *  @returns the first named violation, or undefined. */
async function remedyFor(
  stages: Array<Record<string, unknown>>,
): Promise<Record<string, unknown> | undefined> {
  try {
    const defs = await loadCardDefs()
    return remedyOf(stages, defs)
  } catch {
    return undefined
  }
}

/** The landing state a write's compile verdict names (slice 5, the
 *  transcript's most confusing state given its own seat): a stage
 *  that LANDED but does not compile is not the same event as a write
 *  that never landed. Returns {} when no verdict ran (the door has
 *  nothing to claim). */
function landingOf(compile: Record<string, unknown> | undefined): Record<string, unknown> {
  if (compile === undefined) return {}
  return { landing: compile['compile_ok'] === true ? 'landed_and_compiling' : 'landed_not_compiling' }
}

/** Run the compile check the validate verb runs, over the bench's
 *  CURRENT stages (post-write truth), and fold the verdict into a
 *  result-payload fragment. Never throws — a compile refusal is a
 *  VALUE the answer teaches with, not a failed mutation.
 *  @returns undefined when the bench holds no stages to compile. */
async function compileVerdictOf(
  estate: Estate, bench: string, signal: AbortSignal,
): Promise<Record<string, unknown> | undefined> {
  const b = await readBench(estate, bench, signal)
  const stages = projectStages(b.stages)
  if (stages.length === 0) return undefined
  const intent: string = typeof b.intent === 'string' ? b.intent : ''
  const flowId: string =
    intent !== '' && FLOW_ID_RE.test(intent) ? intent : 'bench'
  try {
    const r = await estate.runsValidate(
      { flow_inline: { id: flowId, stages } }, signal, 20000) as Record<string, unknown>
    if (r['ok'] === true || r['valid'] === true) return { compile_ok: true }
    const compileError = typeof r['error'] === 'string' ? r['error'] : JSON.stringify(r)
    return { compile_ok: false, compile_error: compileError, ...(await remedyFragment(stages)) }
  } catch (e) {
    // the gate's refusal IS the verdict (the teaching voice rides it)
    const refusal = remoteErrorOf(e)
    const message = refusal !== undefined ? refusal.message : e instanceof Error ? e.message : String(e)
    return { compile_ok: false, compile_error: message, ...(await remedyFragment(stages)) }
  }
}

/** The remedy payload fragment (empty when none is derivable). */
async function remedyFragment(
  stages: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const remedy = await remedyFor(stages)
  return remedy !== undefined ? { remedy } : {}
}

// ── THE SPELL VOICE (session 90a0b920, 2026-11-05) ─────────────────
// The operator's burn: the agent passed params {image1: "$input"} with
// NOTHING wired — "you were supposed to attach a) A real image b) A
// previous output from a flow. It was unclear." The spell gate refuses
// at RUN time; the mutation answer now carries the same judgement at
// COMPOSE time, naming every $-token and the ONE source that resolves
// it: the stage's wired input (a channel), or a run-request initial
// (the user attaches it at the Run press / melite_flow initials).
// Anything else — including a real file on disk, which is an asset
// path from melite_view, never a $spell — reads as request_initial
// with the law spelled out, so the next call fixes the wire instead of
// discovering the refusal four hops later.

type SpellLine = {
  token: string;
  on: string;
  resolves: 'channel' | 'request_initial';
  via: string;
};

/** Every $-token in a params bag, at the top level and one nesting
 *  level deep (the spell grammar's whole domain), keyed by the param
 *  it rides. Returns [] when the bag carries no spells. */
function spellTokensIn(params: unknown, prefix = ''): Array<{ token: string; on: string }> {
  if (typeof params !== 'object' || params === null) return []
  const found: Array<{ token: string; on: string }> = []
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    const on = prefix === '' ? key : prefix + '.' + key
    if (typeof value === 'string' && value.startsWith('$')) found.push({ token: value, on })
    else if (typeof value === 'object' && value !== null && prefix === '') {
      found.push(...spellTokensIn(value, on))
    }
  }
  return found
}

/** The inputs record of one stage row (the bench's own spelling:
 *  {slot: {stage, output?}}); {} when the row wires nothing. */
function inputsOfStageRow(stages: Array<Record<string, unknown>>, stage: unknown): Record<string, unknown> {
  if (typeof stage !== 'string') return {}
  const row = stages.find((entry) => entry['stage'] === stage || entry['id'] === stage)
  const inputs = row === undefined ? undefined : row['inputs']
  return typeof inputs === 'object' && inputs !== null && !Array.isArray(inputs)
    ? inputs as Record<string, unknown>
    : {}
}

/** The stage row's card id (the bench read's truth for a patch's
 *  schema-derived walk) — '' when the stage is absent or cardless. */
function cardOfStageRow(stages: Array<Record<string, unknown>>, stage: unknown): string {
  if (typeof stage !== 'string') return ''
  const row = stages.find((entry) => entry['stage'] === stage || entry['id'] === stage)
  const card = row === undefined ? undefined : row['card']
  return typeof card === 'string' ? card : ''
}

/** True when a params bag carries a value the CARD's craft law could
 *  rewrite — a non-empty string (the only values a preprocessor
 *  touches: prompt seats). The patch door must know the stage's card
 *  before it can apply that card's law, so this joins the pre-read
 *  trigger beside the spell and wire-shape candidates. */
function craftCandidate(params: unknown): boolean {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return false
  return Object.values(params as Record<string, unknown>).some((v) => typeof v === 'string' && v !== '')
}

/** True when a params bag carries a value the card-seat wire grammar
 *  would restore on a declared array lane ("" | $name | {item:…}).
 *  The patch door reads the bench only when this fires — the same
 *  bounded-read law the spell voice already rides. */
function wireShapeCandidate(params: unknown): boolean {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return false
  for (const v of Object.values(params as Record<string, unknown>)) {
    if (v === '') return true
    if (typeof v === 'string' && v.startsWith('$')) return true
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const keys = Object.keys(v)
      if (keys.length === 1 && keys[0] === 'item') return true
    }
  }
  return false
}

/** The voice itself: each $-token named with its resolution source.
 *  A token whose name matches a WIRED input resolves to that channel
 *  (stage.output); every other token is a REQUEST INITIAL — the run
 *  must declare it or the spell gate refuses at start. */
function spellVoiceOf(params: unknown, inputs: unknown): SpellLine[] {
  const wired = typeof inputs === 'object' && inputs !== null && !Array.isArray(inputs)
    ? inputs as Record<string, unknown>
    : {}
  return spellTokensIn(params).map(({ token, on }) => {
    const name = token.slice(1)
    const channel = wired[name]
    if (typeof channel === 'object' && channel !== null && !Array.isArray(channel)
      && typeof (channel as Record<string, unknown>)['stage'] === 'string') {
      const output = (channel as Record<string, unknown>)['output']
      return {
        token, on, resolves: 'channel' as const,
        via: (channel as Record<string, unknown>)['stage'] as string + '.'
          + (typeof output === 'string' && output !== '' ? output : 'default'),
      }
    }
    return {
      token, on, resolves: 'request_initial' as const,
      via: name + ' — the run must carry this initial (user attaches it at the Run press), or wire inputs.' + name
        + ' {stage, output}; a real file is an asset path from melite_view, never a $spell',
    }
  })
}

/** GET the bench; not-found → ensure (birth) → GET again. Reads are
 *  the freshness mechanism — always a remote round trip. */
async function readBench(
  estate: Estate, bench: string, signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const get = (): Promise<unknown> => estate.benchGet(bench, signal, 15000)
  try {
    return (await get()) as Record<string, unknown>
  } catch (e) {
    // The bench remote classifies the missing bench as
    // bench/not-found (the HTTP 404 died with the door).
    if (remoteErrorOf(e)?.code === 'bench/not-found') {
      await estate.benchEnsure({ session: bench }, signal, 15000)
      return (await get()) as Record<string, unknown>
    }
    throw e
  }
}

/** THE CAS VERDICT MATCHER (2026-10-12, the code law — the same
 *  cure the browser plane landed): the seats throw RemoteError and
 *  the protocol's own law is "discrimination is always by code,
 *  never by message text" — every CAS voice (bench verbs, ensure,
 *  drafts/patch) carries bench/cas-conflict. The substring arms
 *  died with their two dead-matcher incidents; estate.ts's own
 *  conflict() closure reads the code exactly this way. */
function isCasConflict(e: unknown): boolean {
  return (e as { code?: unknown })?.code === 'bench/cas-conflict'
}

/** ONE-RETRY REBASE (the operator's stuck-agent cure, 2026-10-09:
 *  "I can't even change models in the cards — it breaks"): an
 *  agent's held expect_rev goes stale the moment ANYTHING else
 *  writes the bench — the user's own GUI edit, a concurrent agent,
 *  or the agent's own prior patch whose new rev it never folded.
 *  The CAS verdict itself is CORRECT (never merge under a moved
 *  bench); what broke the operator was the tool face lacking the
 *  browser's cure: on the door's cas-conflict, re-read the fresh
 *  rev and re-apply ONCE. Non-destructive verbs only — load's
 *  wholesale replacement still refuses when moved (a rebase there
 *  could clobber a concurrent write silently). */
async function postBenchVerb(
  estate: Estate, bench: string, verbPath: BenchVerb,
  body: Record<string, unknown>, signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const attempt = (rev: unknown): Promise<Record<string, unknown>> =>
    estate.benchVerb(bench, verbPath,
      { ...body, expect_rev: rev }, signal, 15000) as Promise<Record<string, unknown>>
  // THE AUTO-REV FRONT DOOR (session 90a0b920's friction map: the
  // agent burned a whole bench read per mutation just to learn the
  // rev — reads the render then told it to repeat): an omitted
  // expect_rev takes the SAME path the rebase takes behind a
  // conflict — one bounded read, the fresh rev, the write. The CAS
  // door still guards every write; a race between the fill-read
  // and the write meets the one-retry rebase below. Non-destructive
  // verbs only (this helper's law); load's wholesale replacement
  // keeps demanding the caller's own rev.
  let rev0 = body['expect_rev']
  if (rev0 === undefined || rev0 === null) {
    const fresh = await readBench(estate, bench, signal)
    if (typeof fresh['rev'] === 'number') rev0 = fresh['rev']
  }
  try {
    return await attempt(rev0)
  } catch (e) {
    if (!isCasConflict(e)) throw e
    const fresh = await readBench(estate, bench, signal)
    const rev = fresh['rev']
    if (typeof rev !== 'number') throw e
    return await attempt(rev)
  }
}

/** Enrich bench stages with the draft's latest run (the lookup
 *  the agent cannot do itself: runs are born from drafts — the
 *  start door refuses cardless runs — so the bench's draft_id
 *  joins to /v1/flows/runs rows server-side; the agent never
 *  touches a filesystem path). A stage that has run carries
 *  last_run {run_id, status, created_at, thumbnail, artifacts} —
 *  view it with melite_view, chain it with {stage, output}.
 *  last_run is PER-STAGE (commission 015, §6 finding 6): a run
 *  names the stages it composed in its stage_ids digest (stamped
 *  at sidecar birth), and a stage advertises the NEWEST run that
 *  names it — never another stage's run. Runs from before the
 *  digest cannot name their stages, so they stamp nothing (the
 *  runs facts still show the draft ran; the stage row keeps its
 *  own memory).
 *  No match carries last_run: null PLUS the window facts
 *  (runs {checked, total, matched}) — never-ran reads off small
 *  totals, window-miss off total >> checked. Enrichment DEGRADES,
 *  never refuses: a failed runs call (seat absent, lane hiccup)
 *  returns the stages verbatim with no runs key — lookup-failed
 *  (key absent) vs no-match (null + facts) stay distinct.
 *  One window: the newest 100 global runs. */
async function withLastRun(
  estate: Estate, bench: Record<string, unknown>, signal: AbortSignal,
): Promise<{ stages: unknown; runs: Record<string, unknown> | null }> {
  const stages: unknown = bench['stages']
  const none = { stages, runs: null } as { stages: unknown; runs: Record<string, unknown> | null }
  if (!Array.isArray(stages) || stages.length === 0) return none
  // NARROWED, not branded: this seat compares the raw sidecar rows'
  // draft_id rows against the same wire string (row equality — the
  // "string flows into string" law), so no brand crosses here.
  const draftId: unknown = bench['draft_id']
  if (typeof draftId !== 'string' || draftId === '') return none
  let env: Record<string, unknown>
  try {
    env = await estate.runsList('100', signal, 15000) as Record<string, unknown>
  } catch {
    return none
  }
  const rows: unknown = env['runs']
  if (!Array.isArray(rows)) return none
  const total: unknown = env['count']
  const facts = (matched: number): Record<string, unknown> => ({
    checked: rows.length,
    total: typeof total === 'number' ? total : rows.length,
    matched,
  })
  const mine: Array<{ created: number; row: Record<string, unknown> }> = []
  for (const r of rows) {
    if (typeof r !== 'object' || r === null || Array.isArray(r)) continue
    const rec = r as Record<string, unknown>
    if (rec['draft_id'] !== draftId) continue
    const created: unknown = rec['created_at']
    mine.push({ created: typeof created === 'number' ? created : 0, row: rec })
  }
  if (mine.length === 0) {
    return {
      stages: stages.map((s): unknown => {
        if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
        return { ...(s as Record<string, unknown>), ...paramsSummary(s), last_run: null }
      }),
      runs: facts(0),
    }
  }
  mine.sort((a, b): number => b.created - a.created)
  // THE PER-STAGE STAMP (commission 015, §6 finding 6): a stage
  // advertises the newest run that NAMES it — the run's stage_ids
  // digest, born with the sidecar. The old shared stamp told a
  // human the TTS stage last produced a PNG because an image-edit
  // run topped the draft; membership is now the only ticket. A run
  // carrying no digest (pre-fix sidecars) names nothing and stamps
  // nothing — the stage row's own memory keeps its evidence.
  const summaryOf = (win: Record<string, unknown>): Record<string, unknown> => ({
    run_id: win['run_id'],
    status: win['status'],
    created_at: win['created_at'],
    thumbnail: win['thumbnail'],
    artifacts: win['artifacts'],
    // THE RECEIPT DETAIL (024's self-critique #5, 2026-09-24): the
    // read is bench bookkeeping without the mint + first artifact —
    // project the list row's export_name through so the render can
    // voice which .qvoice the draft's latest run minted.
    ...(typeof win['export_name'] === 'string' && win['export_name'] !== '' ? { export_name: win['export_name'] } : {}),
    // THE EXPORT PATH (the FULL-mint voice): the engine-reported
    // .qvoice file rides the read's last_run too — additive.
    ...(typeof win['export_path'] === 'string' && win['export_path'] !== '' ? { export_path: win['export_path'] } : {}),
  })
  const namesOf = (row: Record<string, unknown>): Set<string> => {
    const v: unknown = row['stage_ids']
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [])
  }
  return {
    stages: stages.map((s): unknown => {
      if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
      const sid: unknown = (s as Record<string, unknown>)['id']
      const hit = typeof sid === 'string' && sid !== ''
        ? mine.find((m) => namesOf(m.row).has(sid))
        : undefined
      return { ...(s as Record<string, unknown>), ...paramsSummary(s), last_run: hit ? summaryOf(hit.row) : null }
    }),
    runs: facts(mine.length),
  }
}

/** THE PARAMS SUMMARY (035 attempt-15's gap #3, 2026-09-24): the
 *  read's stage rows carried card/engine/last_run but NOT the
 *  resolved model or the array-shape facts a probe needs to verify
 *  its own landing — the maker had to read the raw draft doc
 *  separately. Every stage row now carries `model` (when a param
 *  states it) and `arrays` (key=shape for every array-valued
 *  param: true-array vs wrapped — the Probe-B receipt shape). */
function paramsSummary(s: Record<string, unknown>): Record<string, unknown> {
  const rec = s
  const params: unknown = rec['params']
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return {}
  const p = params as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const model: unknown = p['model']
  if (typeof model === 'string' && model !== '') out['model'] = model
  const arrays: Record<string, string> = {}
  for (const [k, v] of Object.entries(p)) {
    if (Array.isArray(v)) arrays[k] = 'array[' + String(v.length) + ']'
    else if (typeof v === 'object' && v !== null && Object.prototype.hasOwnProperty.call(v, 'item')) arrays[k] = 'wrapped{item}'
  }
  if (Object.keys(arrays).length > 0) out['arrays'] = arrays
  return out
}

/** Record guard for verb args the doors admit as maps (expected,
 *  outputs): plain objects only — null, arrays, and scalars would
 *  die silently at the bench's isRecord, so the tool sheds them. */function isRecordArg(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** First artifact's usable path (024's self-critique #5): string
 *  rows print verbatim; object rows print their path; list-row
 *  `./output/…` strips to repo-relative. Route-relative rows stay
 *  as-served here (the bench read names no out root) — run_status
 *  is the canonical receipt door. */
function firstArtifactPath(artifacts: unknown[]): string {
  const a = artifacts[0]
  const p = typeof a === 'string' ? a
    : (typeof a === 'object' && a !== null && typeof (a as { path?: unknown }).path === 'string'
      ? (a as { path: string }).path : '')
  return p.startsWith('./') ? p.slice(2) : p
}

/** Project bench stage rows onto the flow_inline wire contract
 *  (the doors forbid provenance/runStatus/result/title as extras —
 *  they strip; `card` RIDES (STAGE_KEYS admit it) because the
 *  kinds pass derives input kinds from the card's own flowKinds —
 *  stripping it manufactured phantom "wired but untyped" refusals
 *  on correctly-wired card stages; engine defaults comfyui). */
export function projectStages(stages: unknown): Record<string, unknown>[] {
  if (!Array.isArray(stages)) return []
  // THE CONTRACT SHAPES EVERY ROW (2026-10-10, the audit's Rule 1 —
  // this was a second writer, so the same bench read as a different
  // document depending on which door projected it; and the audit's
  // Rule 3, which forbade it from DEMANDING the engine the contract
  // derives). The contract carries the card-ports law, the media-path
  // heal, the self-naming strip and the engine derivation — the
  // projection only preserves the view's identity and the fields the
  // compile needs (`expected`).
  const source = stages
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && !Array.isArray(s))
  return normalizeBenchStages(source).map((row, i) => {
    // normalizeBenchStages is 1:1 over its input — one normalized row
    // pushed per source row, never a skip (benchStage.ts:243-263) — so
    // index i of the projection always has a source row behind it (the
    // re-audit, 2026-10-16).
    const from = source[i] as Record<string, unknown>
    // the view's id is the SOURCE's id, stringified (an absent id
    // reports as ''), never the contract's birth mint — the view
    // reports what the bench holds, it does not mint
    row['id'] = String(from['id'] ?? '')
    // the caller's own id rides (the projection is a VIEW, not a
    // mint): a row with NO id stays id-less rather than gaining the
    // contract's birth mint — the view reports what the bench holds
    if (typeof from['id'] === 'string' && from['id'] !== '') row['id'] = from['id']
    // THE VIEW ADMITS THE WIRE'S OWN KEYS (STAGE_KEYS, the flow
    // gate's own list): the bench's bookkeeping (title, result,
    // runStatus, provenance) is not a wire field and never compiled
    for (const key of Object.keys(row)) {
      if (key === 'expected' || WIRE_STAGE_KEYS.includes(key)) continue
      delete row[key]
    }
    // `expected` is a compile-only field and must be a record: the
    // contract carries whatever the source held, so a junk value
    // ('nope', an array) is DROPPED here rather than compiled
    if (typeof from['expected'] === 'object' && from['expected'] !== null && !Array.isArray(from['expected'])) {
      row['expected'] = from['expected']
    } else {
      delete row['expected']
    }
    return row
  })
}


// ── THE FIRST-DOOR WIRE GRAMMAR (slice 5, the agent-flow rework,
// 2026-11-12) ────────────────────────────────────────────────────
// H7's burn (session 384a13cd): `ref_images: "$ref_images"` passed
// compose and compile — the lattice's own coerceWireArrays restores
// the array IN MEMORY — and refused only at RUN admission, "ref_images
// must be an ARRAY", after the wire had landed. The bench is the
// durable truth, so the restore must happen at the WRITE: the door
// stores the array the card's schema declares and echoes every change
// it made (`applied_derivations`), so the agent SEES the derived state
// instead of discovering it at the user's Run press. The derivation
// rides the SAME schema-derived arms the card seats use
// (coerceWireArrays: "" → [], $name → [name], {item} → [item]) plus
// the primitive wrap the transcript's failure names — never a
// hand-copied key list.
// Source: DSH agent-experience "Say each fact once" — the write
// answers with the state it actually wrote
// (dev_docs/research/agent-surfaces/deepseek-harness-agent-experience-2026-10-23.md).

/** The card definition fields the door's schema-derived walks read. */
type CardDefSeat = {
  schema?: unknown;
  schemaCarrier?: unknown;
  flowKinds?: { inputs?: Record<string, string>; legacyAliases?: Record<string, string> };
};

/** The card's walkable schema carrier (plain schemas carry the dict;
 *  hand-written normalizers carry the inner schemastery object at
 *  schemaCarrier) — the floor verb's carrier law, shared. */
function carrierOfDef(def: unknown): { dict?: Record<string, unknown> } | undefined {
  if (def === null || typeof def !== 'object') return undefined
  const d = def as CardDefSeat
  const carrier = d.schemaCarrier ?? d.schema
  // THE CARRIER LAW'S WALK HALF (the floor verb's own lesson):
  // schemastery nodes are CALLABLES with fields (functions, not
  // objects) — guard null/undefined only.
  if (carrier === null || carrier === undefined) return undefined
  return carrier as { dict?: Record<string, unknown> }
}

/** The derivation rule a changed value walked (the echo's WHY — a
 *  bare from/to pair would leave the agent guessing which law fired). */
function derivationRuleOf(from: unknown): string {
  if (from === '') return 'empty-string-to-array'
  if (typeof from === 'string' && from.startsWith('$')) return 'spell-to-array'
  if (typeof from === 'object' && from !== null && !Array.isArray(from)) {
    const item = (from as Record<string, unknown>)['item']
    return Array.isArray(item) ? 'item-wrapper-to-array' : 'single-item-to-array'
  }
  return 'scalar-to-array'
}

/** Coerce a params bag against the card's declared array lanes, at
 *  the WRITE. Returns the ORIGINAL bag when nothing changed (identity
 *  is the "no derivation" signal the echo reads).
 *  @param def the stage's card definition (undefined = no law).
 *  @param params the caller's params bag.
 *  @returns the bag to store plus the derivations to echo. */
function coerceArrayLanes(
  def: unknown, params: Record<string, unknown>,
): { params: Record<string, unknown>; derived: Array<Record<string, unknown>> } {
  const carrier = carrierOfDef(def)
  if (carrier?.dict === undefined) return { params, derived: [] }
  let out = coerceWireArrays(carrier as { dict?: Record<string, { type?: string }> }, params)
  for (const [key, node] of Object.entries(carrier.dict)) {
    const inner = node as { type?: string; inner?: { type?: string } } | null
    if (inner?.type !== 'array') continue
    const v = out[key]
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') continue
    if (v === '') continue
    const el = inner.inner?.type
    // a scalar on an object-list lane is malformed, not a one-element
    // list — the schema's own refusal stays the honest voice there
    if (el !== 'string' && el !== 'number' && el !== 'boolean') continue
    if (out === params) out = { ...params }
    out[key] = [v]
  }
  const derived: Array<Record<string, unknown>> = []
  for (const key of Object.keys(out)) {
    if (out[key] === params[key]) continue
    derived.push({
      param: key,
      from: params[key] as JsonValue,
      to: out[key] as JsonValue,
      rule: derivationRuleOf(params[key]),
    })
  }
  return { params: out, derived }
}

/** THE CARD-OWNED CRAFT PREPROCESSOR (slice 6, H5's split): the card
 *  declares the FORMATTING law of its prompt seats and the write door
 *  applies it — the bench stores the spelling the card's own grammar
 *  wants, so compose is already correct and the agent stops reading a
 *  craft manual per request. A preprocessor fixes spacing; it never
 *  invents content. The fix rides the SAME applied_derivations echo the
 *  array-lane restore uses (rule names are `craft:<rule>`), so the
 *  agent sees what changed instead of discovering it in a refusal.
 *  Returns the ORIGINAL bag when nothing changed (the no-derivation
 *  signal) and an empty list for a card with no craft law.
 *  @param def the stage's card definition (undefined = no law).
 *  @param params the params bag the array-lane restore already walked.
 *  @returns the bag to store plus one derivation per fired rule. */
function craftParams(
  def: unknown, params: Record<string, unknown>,
): { params: Record<string, unknown>; derived: Array<Record<string, unknown>> } {
  if (def === null || typeof def !== 'object') return { params, derived: [] }
  const craft = (def as { craft?: { normalize?: unknown } }).craft
  if (craft === undefined || craft === null || typeof craft.normalize !== 'function') {
    return { params, derived: [] }
  }
  const rewrite = (craft.normalize as (p: Record<string, unknown>) => {
    params?: unknown; fixed?: unknown
  })(params)
  const next = rewrite.params
  const fixed = Array.isArray(rewrite.fixed) ? rewrite.fixed : []
  if (next === undefined || next === null || typeof next !== 'object' || Array.isArray(next)) {
    return { params, derived: [] }
  }
  const out = next as Record<string, unknown>
  const derived: Array<Record<string, unknown>> = []
  for (const f of fixed) {
    if (f === null || typeof f !== 'object') continue
    const param = (f as { param?: unknown }).param
    const rule = (f as { rule?: unknown }).rule
    if (typeof param !== 'string' || typeof rule !== 'string') continue
    if (out[param] === params[param]) continue
    derived.push({
      param,
      from: params[param] as JsonValue,
      to: out[param] as JsonValue,
      rule: 'craft:' + rule,
    })
  }
  return { params: out, derived }
}

/** THE FIRST-DOOR DERIVATIONS, in one pass: the card's declared array
 *  lanes are restored, then the card's craft law rewrites its prompt
 *  seats — one echo list, two laws (the answer never grows a second
 *  derivations key). */
function deriveParams(
  def: unknown, params: Record<string, unknown>,
): { params: Record<string, unknown>; derived: Array<Record<string, unknown>> } {
  const coerced = coerceArrayLanes(def, params)
  const crafted = craftParams(def, coerced.params)
  return { params: crafted.params, derived: [...coerced.derived, ...crafted.derived] }
}

/** The card's declared wiring lanes — the canonical ports plus the
 *  legacy spellings old drafts still wire (never offered as a face,
 *  accepted for archives). Undefined when the card declares no
 *  flowKinds (no lane law to judge). */
function lanesOf(def: unknown): { canonical: string[]; legacy: string[] } | undefined {
  if (def === null || typeof def !== 'object') return undefined
  const fk = (def as CardDefSeat).flowKinds
  if (fk === undefined || fk === null || fk.inputs === undefined) return undefined
  return { canonical: Object.keys(fk.inputs), legacy: Object.keys(fk.legacyAliases ?? {}) }
}

/** Refuse a wiring lane the card does not declare, naming the lanes it
 *  does — never the silent-accept class (an undeclared channel is fed
 *  by nothing the run's kind pass knows, so the stage renders
 *  text-only). Returns undefined when every key is declared, the
 *  inputs bag is absent, or the card carries no lane law. */
function unknownLaneRefusal(
  card: string, inputs: unknown, def: unknown,
): { error: string; error_kind: string; allowed_lanes: string[] } | undefined {
  if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) return undefined
  const lanes = lanesOf(def)
  if (lanes === undefined) return undefined
  const known = new Set([...lanes.canonical, ...lanes.legacy])
  const bad = Object.keys(inputs as Record<string, unknown>).filter((k) => !known.has(k))
  if (bad.length === 0) return undefined
  const list = lanes.canonical.length > 0 ? lanes.canonical.join(', ') : '(none declared)'
  return {
    error: 'input lane ' + bad.map((k) => JSON.stringify(k)).join(', ')
      + (bad.length === 1 ? ' is' : ' are') + ' not a port of card ' + JSON.stringify(card)
      + ' — the declared lanes: ' + list
      + (lanes.legacy.length > 0 ? ' (legacy: ' + lanes.legacy.join(', ') + ')' : '')
      + '. Wire one of those: an undeclared lane would be fed by nothing the run\'s kind pass knows, and the stage would render text-only.',
    error_kind: 'unknown-lane',
    allowed_lanes: lanes.canonical,
  }
}

/** The first card-schema violation a compile refusal can name — the
 *  structured remedy {public_param, current_value, allowed_values}
 *  the agent can act on without decoding prose (H6: a refusal may
 *  only speak vocabulary its own door accepts). Walks the SAME dict
 *  the form and agent faces serve (emitKnob), so a card that moves
 *  its enum or bounds moves the remedy with it. Undefined when no
 *  enumerated/bounded violation is found — the compile_error is the
 *  voice then, never an invented cure. */
function remedyOf(
  stages: Array<Record<string, unknown>>, defs: { get(card: string): unknown },
): Record<string, unknown> | undefined {
  for (const row of stages) {
    const card = typeof row['card'] === 'string' ? row['card'] : ''
    const carrier = carrierOfDef(defs.get(card))
    if (carrier?.dict === undefined) continue
    const params = (typeof row['params'] === 'object' && row['params'] !== null && !Array.isArray(row['params']))
      ? row['params'] as Record<string, unknown>
      : {}
    for (const [key, node] of Object.entries(carrier.dict)) {
      const v = params[key]
      if (v === undefined || node === null || node === undefined) continue
      const knob = emitKnob(node as never) as Record<string, unknown>
      const allowed = knob['enum']
      if (Array.isArray(allowed) && !allowed.includes(v as never)) {
        return { public_param: key, current_value: v as JsonValue, allowed_values: allowed as JsonValue }
      }
      if (typeof v !== 'number') continue
      const min = knob['minimum']
      const max = knob['maximum']
      if (typeof min === 'number' && v < min) {
        return { public_param: key, current_value: v, allowed_values: (typeof max === 'number' ? [min, max] : [min]) as JsonValue }
      }
      if (typeof max === 'number' && v > max) {
        return { public_param: key, current_value: v, allowed_values: (typeof min === 'number' ? [min, max] : [max]) as JsonValue }
      }
    }
  }
  return undefined
}

/** Fetch the card's agent doc for the just-in-time ride (slice 4b).
 *  Enrichment only: a load failure or a doc-less card answers
 *  undefined and never blocks the landing. Dedupe is by the DOC's own
 *  digest — the same text never rides twice in one session.
 *
 * @param estate the tool's estate seat.
 * @param card the landed card id.
 * @param sent the session's sent-doc digests (card → digest).
 * @param signal the call's abort signal.
 * @returns the doc payload, or undefined when the card has no doc. */
async function cardDocOf(
  estate: Estate,
  card: string,
  sent: Map<string, string>,
  signal: AbortSignal,
): Promise<{ card: string; digest: string; changed?: boolean; unchanged?: boolean; files?: Array<{ path: string; text: string }> } | undefined> {
  let bundle: unknown
  try {
    bundle = await estate.loadCard('card', card, signal, DOC_TIMEOUT_MS)
  } catch {
    // the landing already succeeded; a doc fetch failure is not the
    // agent's problem to solve at this door (enrichment, never a gate)
    return undefined
  }
  const agents = (bundle as { agents?: unknown } | null | undefined)?.agents
  if (!Array.isArray(agents)) return undefined
  const files: Array<{ path: string; text: string }> = []
  for (const row of agents) {
    const path = (row as { path?: unknown })?.path
    const text = (row as { text?: unknown })?.text
    if (typeof path === 'string' && path !== '' && typeof text === 'string' && text !== '') {
      files.push({ path, text })
    }
  }
  if (files.length === 0) return undefined
  const digest = createHash('sha256')
    .update(files.map((f) => f.path + '\0' + f.text).join('\0'))
    .digest('hex').slice(0, 16)
  const prev = sent.get(card)
  if (prev === digest) return { card, digest, unchanged: true }
  sent.set(card, digest)
  return { card, digest, ...(prev !== undefined ? { changed: true } : {}), files }
}

export function meliteConstruct(
  estate: Estate,
  opts: { headless?: boolean } = {},
): ToolDefinition {
  // SLICE 4b — THE JUST-IN-TIME CARD DOC (operator 2026-11-12): the
  // landing carries the card's own agent doc inline as refinement
  // material, deduped per session by DOC DIGEST (a changed doc
  // re-sends flagged). One send per card per session; the family
  // guide stays one skill_read away (its hint already rides the load
  // digest). The doc is enrichment AFTER the landing, never a
  // prerequisite gate — compose is already correct via defaults.
  // Source: DSH agent-experience "Use locality" — include a bounded
  // amount of likely needed adjacent context with an operation's
  // result, mark omissions, and provide a way to retrieve more
  // (commit 22ddee3792; dev_docs/research/agent-surfaces/
  // deepseek-harness-agent-experience-2026-10-23.md).
  const sentDocs = new Map<string, string>()
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (args ?? {}) as { verb?: unknown; stage?: unknown; card?: unknown }
    const verb = typeof a.verb === 'string' ? a.verb : '?'
    const on = typeof a.stage === 'string' && a.stage !== '' ? a.stage
      : typeof a.card === 'string' && a.card !== '' ? a.card : ''
    return { card: 'generic', title: `Bench ${verb}${on !== '' ? ' · ' + on : ''}`, kind: 'execute' }
  }
  const def = defineTool({
    name: 'melite_construct',
    description:
      'Author THE shared bench — one working flow the user sees live in the cards tab and edits alongside you. '
      // THE INTERFACE LAW (2026-09-13): name the run door the agent
      // actually has — melite_flow only exists headless. The browser
      // agent is the LIVE CO-EDITOR of the flow state (compose it,
      // keep editing it as the user asks — the bench is the shared
      // state), never its executor: runs start at the user's Run
      // press. Say the contract, never a phantom verb.
      + (opts.headless === true
        ? 'This never executes (melite_flow runs what is here; the user presses Run). '
        : 'You compose the flow and edit its state here, live with the user — runs start at the user\'s Run press, never yours. ')
      + 'Verbs: read (the state — '
      + 'always start here; a stage that has run carries last_run {run_id, status, artifacts} — null + runs '
      + '{checked, total, matched} when the draft has no run in the window; view a run_id with melite_view, '
      + 'chain it with {stage, output}) | load (replace stages wholesale — DESTRUCTIVE on THE CONVERSATION\'S '
      + 'SHARED BENCH: this is the bench the user watches in their cards tab, and overwrite:true replaces whatever '
      + 'was there — load a throwaway TEST/scratch flow only when replacing is the intent, never to "try" a shape; '
      + 'refused on a non-empty bench unless overwrite:true confirms it; prefer add_stage to grow the bench) | patch {stage, params} | add_stage {card, params?, '
      + 'inputs?, expected?, outputs?} (inputs wire PRIOR STAGES through the card\'s declared ports, never files: '
      + 'inputs {image1: {stage: "s_0", output: "default"}} AND params {image1: "$image1"} — the $spell is the CHANNEL REFERENCE ONLY: it resolves at run time to that wired stage output or a request initial the USER attaches at the Run press, nothing else; for a REAL FILE on disk use its asset path from melite_view, never a $spell; to chain '
      + 'the last generation, bind its stage, never hunt its artifact on disk; kinds derive from the card\'s ports — '
      + 'state expected only to override, outputs only for custom channels) | remove_stage {stage} | clear (EVERY stage out in one rev; undo restores all — the cure when the bench itself is the wound) | floor {stage?} (THE GPU ECONOMY VERB: clamps every resolution-group param to the card\'s DECLARED minimum — one stage when {stage} names one, every stage when absent; floors derive live off the card\'s own schema, never hand-baked numbers, every write is voiced {param, from, to}, absent params are SET to the floor (defaults are not assumed minimal), values at/below it stay untouched, and a card declaring no resolution group says so honestly) | rewire {stage, input, from?} (from is {stage, output} | '
      + '{initial} — same law: stage bindings, never paths) | undo {n?, author?} | validate (compile '
      + "check, no GPU). Mutations take expect_rev from your last read — or omit it: the tool fills the fresh rev itself (one bounded read) and a moved bench still refuses 409 with current_rev, re-read, re-apply. No ids anywhere: the bench is the one shared state.",
    parameters: {
      verb: {
        type: 'string',
        required: true,
        enum: ['read', 'load', 'patch', 'add_stage', 'remove_stage', 'clear', 'floor', 'rewire', 'undo', 'validate'],
        description: 'REQUIRED — the schema refuses a call without it, and no payload ever derives one (a WRITE is never guessed; slice 5, the agent-flow rework). read (the state — always start here) | load | patch | add_stage | remove_stage | clear | floor | rewire | undo | validate.',
      },
      stage: { type: 'string', description: 'patch/remove_stage/rewire: the stage id.' },
      card: { type: 'string', description: 'add_stage: the card id (display + provenance hint).' },
      engine: { type: 'string', description: 'add_stage: engine id (default comfyui).' },
      params: {
        type: 'object', additionalProperties: true,
        description: 'patch (merge onto the stage) | add_stage | load single-stage shorthand. '
          + 'A null value UNSETS its key (the drafts door\'s JSON Merge Patch law, both doors one law since 2026-09-24 — '
          + 'patch {voice_name: null} clears it; no remove_stage dance). '
          + 'MODEL SWITCH LAW: a stage\'s variant/quant belong to its model — switching the model seat (the stage\'s top-level `model`; tts-family cards read it from params.model — the loaded card doc names its seat) without '
          + 'co-stating the new family\'s variant (melite_load names each family\'s variants) composes a refusal '
          + '(unknown variant for the new model). State model + variant (+ quant) together, or leave the model alone.',
      },
      inputs: {
        type: 'object', additionalProperties: true,
        description: 'add_stage: {input: {stage, output} | {initial}} wiring.',
      },
      expected: {
        type: 'object', additionalProperties: true,
        description: 'add_stage: hand-typed input kinds ({input: Kind}) — the override ONLY (kinds derive from the card\'s own ports; state what the card cannot know, e.g. initials, never a mirror to hand-copy).',
      },
      outputs: {
        type: 'object', additionalProperties: true,
        description: 'add_stage: custom output channels ({name: Kind}) — absent defaults to {default: "image"}.',
      },
      input: { type: 'string', description: 'rewire: the input name to bind.' },
      from: {
        type: 'object',
        additionalProperties: false,
        properties: {
          stage: { type: 'string', description: 'The source stage id.' },
          output: { type: 'string', description: 'The source stage\'s output name.' },
          initial: { type: 'string', description: 'An operator-supplied initial key.' },
        },
        description: 'rewire: {stage, output} | {initial}; absent clears the binding.',
      },
      stages: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', description: 'The stage id.' },
            engine: { type: 'string', description: 'Engine id (default comfyui).' },
            card: { type: 'string', description: 'The card id (display + provenance hint).' },
            description: { type: 'string', description: 'What the stage produces.' },
            params: { type: 'object', additionalProperties: true, description: 'Stage params (open — the card/engine owns the keys).' },
            inputs: { type: 'object', additionalProperties: true, description: '{input: {stage, output} | {initial}} wiring.' },
            outputs: { type: 'object', additionalProperties: true, description: 'Custom output channels {name: Kind}.' },
          },
        },
        description: 'load: the full replacement [{id?, engine?, card?, params?, inputs?, outputs?}].',
      },
      intent: { type: 'string', description: 'load: what this bench produces.' },
      overwrite: {
        type: 'boolean',
        description: 'load: confirm wholesale replacement of a non-empty bench (required — the overwrite law refuses without it).',
      },
      n: { type: 'number', description: 'undo: how many entries (default 1).' },
      author: { type: 'string', description: 'undo: "agent" (default) | "user" — whose entries to revert.' },
      expect_rev: { type: 'number', description: 'CAS: the rev from your last read. Optional on non-destructive mutations — omitted, the tool reads the fresh rev itself (one bounded read); supply it to assert the state you saw.' },
    },
    presentCall,
    output: {
      schema: {
        type: 'object', additionalProperties: true,
        properties: {
          verb: { type: 'string', required: true, description: 'Echoed verb.' },
          bench: { type: 'string', required: true, description: 'The bench key (default "main").' },
          rev: { type: 'number', description: 'The bench revision AFTER the verb.' },
          ok: { type: 'boolean', description: 'False exactly when the verb refused.' },
          error: { type: 'string', description: 'Refusal text (ok: false).' },
          landing: {
            type: 'string',
            description: 'The write\'s landing state (slice 5): landed_and_compiling | landed_not_compiling (the stage is ON the bench; the compile refusal rides below) | ambiguous_no_write (the write is UNPROVEN — re-read before retrying). Absent when the verb wrote no stage.',
          },
          applied_derivations: {
            type: 'array',
            description: 'Every value the door DERIVED before writing ({param, from, to, rule}) — the agent sees the state the bench actually stores (slice 5\'s first-door wire grammar: array-lane restores and the card\'s own craft spelling).',
          },
          remedy: {
            type: 'object', additionalProperties: true,
            description: 'A structured cure for a compile refusal ({public_param, current_value, allowed_values}) when the card schema can name one — never an invented fix.',
          },
          doc: { type: 'object', additionalProperties: true, description: 'add_stage: the landed card\'s agent doc inline (refinement material after the landing; deduped per session by doc digest).' },
        },
      },
      render: (_args, value) => {
        const v = value as { verb?: string; rev?: number; ok?: boolean; error?: string; intent?: string; hint?: string; stages?: unknown; landing?: unknown }
        if (v && typeof v.error === 'string' && v.error !== '') {
          const landing = v.landing === 'ambiguous_no_write'
            ? '\nlanding: ambiguous_no_write — the write is UNPROVEN (the seat failed after the call left); re-read before retrying, never assume it did not land'
            : ''
          return [{ type: 'text', text: 'melite_construct REFUSED: ' + v.error + landing }]
        }
        // STROKE 85 (the operator's report — the blind read that
        // wrecked a bench): read/undo/load RETURN the stages, but
        // the render collapsed every verb to "bench X → rev N" —
        // the model could not see what was staged, so it PROBED
        // destructively (load overwrite, undos) to find out. The
        // render now discloses the stages it already holds: one
        // line each (id, card, engine), plus the intent. A model
        // that can read never probes.
        const lines: string[] = ['bench ' + String(v.verb ?? '?') + ' → rev ' + String(v.rev ?? '?')]
        // THE MINTED-ID DISCLOSURE (session 90a0b920's friction map,
        // 2026-10-21: a read after every mutation to learn the minted
        // id): add_stage/patch/remove_stage answers carry the stage id
        // in the payload, but the render never printed it — the model
        // could not address the stage it just added. The render
        // voices what it holds (stroke 85's law, extended).
        const stageId = (v as { stage?: unknown }).stage
        if (typeof stageId === 'string' && stageId !== '') {
          const verb = String(v.verb ?? '?')
          lines.push(verb === 'add_stage' ? 'minted stage ' + stageId + ' (patch/remove_stage/rewire address it as {stage: "' + stageId + '"})' : 'stage ' + stageId)
        }
        // THE STALENESS LINE, RENDERED (the warm-2 fire: the payload
        // carried stale:true and the model never saw it — a payload
        // key nobody prints is a voice nobody hears). The patch that
        // changed params says so: the done mark is cleared, the next
        // flow re-runs the stage — no [done] no-op to diagnose.
        if ((v as { stale?: unknown }).stale === true) {
          lines.push('stale: params changed — the stage\'s done mark is cleared; the next flow re-runs it (its old artifact stays readable as last_run)')
        }
        // THE SPELL VOICE, RENDERED (the compose-time spell gate,
        // 2026-10-21): the payload names every $-token and its one
        // resolution source; the render says it in the model's own
        // read — channel (the wired stage output) or request initial
        // (the run must declare it). This is the line that teaches
        // the wire BEFORE the run-time gate refuses it.
        // THE COMPILE VERDICT, RENDERED (the model-facing law: a
        // payload key nobody prints is a voice nobody hears): the
        // wiring mutation's own answer says whether the bench
        // compiles — the teaching refusal verbatim when it does not,
        // one calm line when it does (the validate round-trip the
        // agent no longer needs).
        const compileOk = (v as { compile_ok?: unknown }).compile_ok
        if (compileOk === false) {
          const compileError = (v as { compile_error?: unknown }).compile_error
          lines.push('COMPILE REFUSED — ' + (typeof compileError === 'string' ? compileError : '?')
            + ' — the write LANDED; fix the wire it names (expected {slot: kind} on the stage) and re-run.')
          // THE STRUCTURED REMEDY (slice 5): when the card schema can
          // name the violating knob, the answer carries the cure as
          // data — never a prose-only invitation to guess.
          const remedy = (v as { remedy?: unknown }).remedy
          if (remedy !== null && typeof remedy === 'object') {
            const r = remedy as { public_param?: unknown; current_value?: unknown; allowed_values?: unknown }
            lines.push('remedy: ' + String(r.public_param ?? '?') + ' = ' + JSON.stringify(r.current_value)
              + ' — allowed: ' + JSON.stringify(r.allowed_values))
          }
        } else if (compileOk === true) {
          lines.push('compiles ✓ (no validate call needed)')
        }
        // THE LANDING STATE, RENDERED (slice 5): the three states the
        // transcript's worst burn could not tell apart — landed and
        // compiling, landed but refused, and unproven.
        if (v.landing === 'landed_and_compiling') {
          lines.push('landing: landed_and_compiling')
        } else if (v.landing === 'landed_not_compiling') {
          lines.push('landing: landed_not_compiling — the stage is ON the bench; the refusal above is closable by the next mutation')
        }
        // THE DERIVATIONS, RENDERED (a payload key nobody prints is a
        // voice nobody hears): every value the door restored before
        // the write says so, with the rule that fired.
        const derivations = (v as { applied_derivations?: unknown }).applied_derivations
        if (Array.isArray(derivations)) {
          for (const line of derivations) {
            const d = line as { stage?: unknown; param?: unknown; from?: unknown; to?: unknown; rule?: unknown }
            const head = typeof d.stage === 'string' && d.stage !== '' ? d.stage + ': ' : ''
            const rule = String(d.rule ?? '?')
            // slice 6 — the craft preprocessor's fixes ride the same
            // echo; the tail names the law that fired (a craft fix is
            // a spelling restore, never an array restore).
            const why = rule.startsWith('craft:')
              ? ' — the card\'s craft law restored the declared spelling; the bench stores the restored text'
              : ' — the card declares this lane an array; the bench stores the array'
            lines.push(head + 'derived ' + String(d.param ?? '?') + ': ' + JSON.stringify(d.from)
              + ' → ' + JSON.stringify(d.to) + ' (' + rule + ')' + why)
          }
        }
        // slice 4b — the card doc ride, rendered (a payload key nobody
        // prints is a voice nobody hears)
        const doc = (v as { doc?: unknown }).doc
        if (doc !== null && doc !== undefined && typeof doc === 'object') {
          const d = doc as { card?: unknown; digest?: unknown; changed?: unknown; unchanged?: unknown; files?: unknown }
          if (d.unchanged === true) {
            lines.push('card doc already sent this session (' + String(d.card ?? '?') + ', digest ' + String(d.digest ?? '?') + ') — not re-sent')
          } else if (Array.isArray(d.files)) {
            lines.push((d.changed === true
              ? 'card doc CHANGED since it last rode — re-read before refining: '
              : 'card doc (rides once per session; refinement only — compose is already correct): ')
              + String(d.card ?? '?'))
            for (const f of d.files) {
              const path = (f as { path?: unknown }).path
              const text = (f as { text?: unknown }).text
              if (typeof text === 'string' && text !== '') lines.push('--- ' + String(path ?? '?') + ' ---\n' + text)
            }
          }
        }
        const spellLines = (v as { spells?: unknown }).spells
        if (Array.isArray(spellLines)) {
          for (const line of spellLines) {
            const row = line as { stage?: unknown; token?: unknown; on?: unknown; resolves?: unknown; via?: unknown }
            const head = typeof row.stage === 'string' && row.stage !== '' ? row.stage + ': ' : ''
            if (row.resolves === 'channel') {
              lines.push(`spell ${String(row.token)} on ${String(row.on)} → channel ${String(row.via)}`)
            } else if (row.resolves === 'request_initial') {
              lines.push(`spell ${String(row.token)} on ${String(row.on)} → REQUEST INITIAL — nothing wired; ${String(row.via)}`)
            } else {
              lines.push(`${head}spell ${String(row.token)} on ${String(row.on)} → ${String(row.via)}`)
            }
          }
        }
        // hoisted once (the null-voice truth below and the trailing
        // facts line read the same seam — one read, two voices)
        const runsFacts = (v as { runs?: { checked?: unknown; total?: unknown; matched?: unknown } }).runs
        const matched = Number((runsFacts as { matched?: unknown } | undefined)?.matched ?? 0)
        if (Array.isArray(v.stages)) {
          const stages = v.stages as Array<Record<string, unknown>>
          if (stages.length === 0) {
            lines.push('stages: (bench is empty)')
          } else {
            lines.push(`stages: ${stages.length}`)
            for (const s of stages) {
              const id = typeof s.id === 'string' ? s.id : '?'
              const card = typeof s.card === 'string' ? s.card : (typeof s.card_id === 'string' ? s.card_id : '?')
              const engine = typeof s.engine === 'string' ? s.engine : '?'
              // THE LAST_RUN DISCLOSURE (022's self-critique #2,
              // 2026-09-24 — stroke 85's twin): withLastRun ATTACHES
              // the draft's latest run to every stage, but the render
              // never printed it — the model read a stage list that
              // promised last_run in the description and saw nothing,
              // then paid a turn confirming the bench is not a
              // receipt source. The render now voices what it holds.
              const lr = s.last_run as { run_id?: unknown; status?: unknown; artifacts?: unknown; export_name?: unknown; export_path?: unknown } | null | undefined
              let suffix = ''
              if (lr !== null && lr !== undefined && typeof lr.run_id === 'string' && lr.run_id !== '') {
                const arts = Array.isArray(lr.artifacts) ? lr.artifacts.length : 0
                // THE RECEIPT DETAIL (024#5): the first artifact path
                // + the mint ride the suffix — the read answers which
                // .qvoice the draft holds, not just that a run exists.
                // String artifacts print verbatim (absolute); object
                // rows print their path; route-relative rows gain
                // their out root (the run_status canonical law).
                // THE FULL MINT (2026-09-24): when the engine's path
                // rode, it prints beside the name — the exact file.
                const first = Array.isArray(lr.artifacts) ? firstArtifactPath(lr.artifacts) : ''
                const expName = typeof lr.export_name === 'string' && lr.export_name !== '' ? lr.export_name : ''
                const expPath = typeof lr.export_path === 'string' && lr.export_path !== '' ? lr.export_path : ''
                const exp = expName !== ''
                  ? `, export '${expName}'${expPath !== '' ? ` @ ${expPath}` : ''}`
                  : expPath !== '' ? `, export ${expPath}` : ''
                suffix = ` — last_run ${lr.run_id} (${String(lr.status ?? '?')}${arts ? ', ' + arts + ' artifact(s)' : ''}${exp}${first !== '' ? ', ' + first : ''})`
              } else if (lr === null) {
                // THE NULL-VOICE TRUTH (the invisible-press burn,
                // 2026-10-20): "draft has no run in the window" LIED
                // whenever the runs facts said matched>0 — the
                // operator's read printed "matched 2" beside it while
                // the completed press sat invisible (its digest named
                // the card skeleton, a namespace the bench rows never
                // heard of). The two nulls are different diseases and
                // must say so: no runs at all vs runs that name no
                // stage of this draft.
                suffix = matched > 0
                  ? ' — last_run null (no run in the window names this stage)'
                  : ' — last_run null (draft has no run in the window)'
              }
              lines.push(`  ${id} — ${card} [${engine}]${suffix}`)
            }
          }
        }
        if (runsFacts !== undefined) {
          lines.push(`runs window: checked ${String(runsFacts.checked ?? '?')}, total ${String(runsFacts.total ?? '?')}, matched ${String(runsFacts.matched ?? '?')}`)
        }
        if (typeof v.intent === 'string' && v.intent !== '') lines.push('intent: ' + v.intent)
        if (typeof v.hint === 'string' && v.hint !== '') lines.push('hint: ' + v.hint)
        return [{ type: 'text', text: lines.join('\n') }]
      },
      // presentationMeta: the NATIVE link channel — persisted verbatim
      // on tool/result; the client derives the flow-link address from
      // it (the same path melite_flow's {draft_id} rides: execute
      // values always carry their bench key — the out() helper binds
      // it, and refusalOf binds it on refusals — so the link survives
      // every verb and every refusal). Pure: live streaming AND
      // session-log replay call it with the frozen value alone. The
      // agent never sees this payload.
      presentationMeta: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>
        return {
          ...typeof v.bench === 'string' && v.bench !== '' ? { bench: v.bench } : {},
          ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
        }
      },
    },
    async execute(args, exec): Promise<ConstructResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover
      // (2026-09-12).
      // THE ARRAY WIRE GUARD (P2, 2026-09-24 — commission 034's
      // forensic, run-9953f652410d-d365af74): arrays nested under
      // free-form tool params (additionalProperties) corrupt on the
      // wire — a non-empty array arrives as `{item:[…]}`, an empty
      // one as `""`. The unwrap is shape-based and unambiguous; it
      // runs on EVERY param-bearing arg (params, stages[].params,
      // inputs, expected, outputs, from) so the bench STORES clean —
      // reads and compose never see the poison. (The `""`→[] fill
      // for schema-declared array keys lives at the card parse seat
      // — the card kit's coerceWireArrays, h3 precedent law.)
      // THE REBIND LAW (attempt-035's freeze receipt, 2026-09-24):
      // writing onto the wire-delivered args object threw
      // `Cannot assign to read only property 'params'` — Probe A
      // and Probe B were dead instruments. The guard walks a copy;
      // the body reads the fresh binding only, the caller's object
      // is never touched.
      const a = { ...unwrapItemArrays(args) } as Record<string, unknown>
      // Absent verb normalizes to the documented default 'read'
      // (T11's residual, 2026-10-12: the description says "read
      // (default when absent)", so the echo says 'read' too — the
      // old '' echo contradicted the declared contract; an explicit
      // '' refuses at the wrapper gate's enum, never reaching here).
      const verb = typeof a.verb === 'string' ? a.verb : 'read'
      // The conversation wins (the one-flow law rides the agent's own
      // session); an explicit bench key applies only to unattributed
      // seats (headless, scripts) that carry no agent.
      const agentBench = benchKeyOfExec(exec as { agent?: { id?: unknown } })
      const bench = agentBench !== DEFAULT_BENCH ? agentBench : benchKeyOf(a)
      const signal = exec.signal
      const out = (payload: Record<string, unknown>): ConstructResult =>
        jsonClean<ConstructResult>({ verb, bench, ok: true, ...payload })
      // A pre-write refusal is a VALUE (ok:false) — the payload's own
      // error_kind names the law, and nothing was read or written.
      const refuse = (payload: Record<string, unknown>): ConstructResult =>
        jsonClean<ConstructResult>({ verb, bench, ok: false, ...payload })
      // THE VERB IS REQUIRED (slice 5, correction 1 of the rework's
      // adjudication, 2026-11-12: "Verb-default-to-add is a safety
      // regression — the 'no verb' refusal was a write-guard. Make
      // verb required in the tool schema (grammar in the schema beats
      // silent semantics); never derive a WRITE."). The schema gate
      // refuses a call without it; this guard is the same law for any
      // seat that reaches execute directly. A BARE call no longer
      // reads — a payload never derives a verb, and a read is a verb
      // like every other (the session 7a82 burn: two silent reads
      // while the agent believed it was composing).
      if (a.verb === undefined) {
        return jsonClean<ConstructResult>({
          verb, bench, ok: false,
          error: 'verb is required — the call was refused before anything was read or written (a payload never derives a verb; a WRITE is never guessed). '
            + "State one: 'read' | 'load' {stages} | 'patch' {stage, params} | 'add_stage' {card, params?, inputs?} | 'remove_stage' {stage} | 'clear' | 'floor' {stage?} | 'rewire' {stage, input, from?} | 'undo' {n?, author?} | 'validate'.",
          error_kind: 'verb-required',
        })
      }
      try {
        if (verb === 'read') {
          const b = await readBench(estate, bench, signal)
          const enriched = await withLastRun(estate, b, signal)
          return out({
            rev: b.rev, intent: b.intent, stages: enriched.stages, log: b.log,
            ...(enriched.runs !== null ? { runs: enriched.runs } : {}),
            hint: 'mutate with expect_rev=' + String(b.rev),
          })
        }
        if (verb === 'validate') {
          const b = await readBench(estate, bench, signal)
          const stages = projectStages(b.stages)
          if (stages.length === 0) return out({ rev: b.rev, compiles: false, note: 'bench is empty' })
          // THE TOOL DOES ITS OWN BOOKKEEPING (2026-09-21): the
          // validate door demands a flow id — this arm supplies it
          // itself (the bench's intent when legal, else 'bench').
          // The caller never spells an incantation.
          const intent: string = typeof b.intent === 'string' ? b.intent : ''
          // THE FLOW-ID LAW, FROM ITS ONE HOME (runsGates.FLOW_ID_RE):
          // the same admission the start and validate doors apply. An
          // inline copy of the regex here was a second answer to "is
          // this a legal flow id" — the drift closure-gate RULE 4d
          // exists to prevent, in the one file that was still
          // carrying it.
          const flowId: string =
            intent !== '' && FLOW_ID_RE.test(intent) ? intent : 'bench'
          const r = await estate.runsValidate(
            { flow_inline: { id: flowId, stages } }, signal, 20000) as Record<string, unknown>
          return out({ rev: b.rev, compiles: r['ok'] === true || r['valid'] === true, report: r })
        }
        if (verb === 'load') {
          const rawStages = Array.isArray(a.stages) ? a.stages : []
          // SLICE 5 — the wholesale replace walks the SAME first-door
          // grammar add_stage speaks: every stage's inputs are judged
          // against its card's declared lanes (unknown lanes REFUSE,
          // named), and every params bag rides the card's own schema
          // (scalar→array restored at the write, echoed per stage).
          const defs = rawStages.some((stage) =>
            typeof stage === 'object' && stage !== null && !Array.isArray(stage)
            && typeof (stage as Record<string, unknown>)['card'] === 'string')
            ? await loadCardDefs()
            : undefined
          const appliedDerivations: Array<Record<string, unknown>> = []
          const stages: unknown[] = []
          for (const stage of rawStages) {
            if (typeof stage !== 'object' || stage === null || Array.isArray(stage)) {
              stages.push(stage)
              continue
            }
            const row = { ...(stage as Record<string, unknown>) }
            const card = typeof row['card'] === 'string' ? row['card'] : ''
            const def = card !== '' ? defs?.get(card) : undefined
            if (def !== undefined) {
              const laneRefusal = unknownLaneRefusal(card, row['inputs'], def)
              if (laneRefusal !== undefined) return refuse({ ...laneRefusal, stage: card })
              if (isRecordArg(row['params'])) {
                const derived = deriveParams(def, row['params'])
                row['params'] = derived.params
                for (const line of derived.derived) appliedDerivations.push({ stage: card, ...line })
              }
            }
            stages.push(row)
          }
          const r = await estate.benchEnsure(
            {
              session: bench, stages,
              ...(typeof a.intent === 'string' && a.intent !== '' ? { intent: a.intent } : {}),
              ...(a.overwrite === true ? { overwrite: true } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          // THE SPELL VOICE rides load too: every stage's params swept,
          // each $-token named against that stage's own wired inputs.
          // (The sweep reads the CALLER's rows: the token's resolution
          // is the same either way, and the param path the agent wrote
          // is the one it can recognize.)
          const spells = rawStages.flatMap((stage, i) => {
            if (typeof stage !== 'object' || stage === null) return []
            const row = stage as Record<string, unknown>
            const card = typeof row['card'] === 'string' ? row['card'] : 'stage ' + i
            return spellVoiceOf(row['params'], row['inputs']).map((line) => ({ stage: card, ...line }))
          })
          // THE COMPILE VERDICT rides every load that lands stages —
          // the wholesale replace is the strongest write on the bench;
          // its answer must say whether what it landed compiles.
          const compile = stages.length > 0 ? await compileVerdictOf(estate, bench, signal) : undefined
          return out({ rev: r.rev, stages: r.stages, ...(spells.length > 0 ? { spells } : {}), ...(appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {}), ...(compile !== undefined ? { ...compile } : {}), ...landingOf(compile) })
        }
        if (verb === 'patch') {
          // THE SPELL VOICE needs the stage's wired inputs, which a
          // patch does not carry — one bounded bench read, ONLY when
          // the params carry a spell OR a wire shape the card seat
          // would restore (the read births the same bench the patch
          // below writes, so it adds no cross-bench state).
          let wiredInputs: unknown
          let stageCard = ''
          // the spell read doubles as the AUTO-REV fill when the
          // caller brought no rev — one bounded read serves both
          // (the fill never adds a second read on this path)
          let rev0 = a.expect_rev
          if (spellTokensIn(a.params).length > 0 || wireShapeCandidate(a.params) || craftCandidate(a.params)) {
            const b = await readBench(estate, bench, signal)
            const rows = projectStages(b.stages)
            wiredInputs = inputsOfStageRow(rows, a.stage)
            stageCard = cardOfStageRow(rows, a.stage)
            if (rev0 === undefined && typeof b.rev === 'number') rev0 = b.rev
          }
          // SLICE 5 — THE FIRST-DOOR GRAMMAR on a merge: the card's
          // own schema restores the array the run will admit, and the
          // answer echoes the derivation (the write stores the state,
          // not the wire's spelling of it).
          let params = a.params
          let appliedDerivations: Array<Record<string, unknown>> = []
          if (stageCard !== '' && isRecordArg(params)) {
            const defs = await loadCardDefs()
            const def = defs.get(stageCard)
            if (def !== undefined) {
              const derived = deriveParams(def, params)
              params = derived.params
              appliedDerivations = derived.derived
            }
          }
          const r = await postBenchVerb(estate, bench, 'patch',
            { stage: a.stage, params, expect_rev: rev0 }, signal)
          const spellLines = spellVoiceOf(a.params, wiredInputs)
          // THE STALENESS VOICE (the silent no-op cure): the door
          // answers stale:true when the patch changed params and
          // invalidated the stage's done mark — the model reads WHY
          // its next flow will re-run (or, absent stale, that the
          // write was idempotent and the done mark stands).
          const stale = r['stale'] === true
          // THE COMPILE VERDICT RIDES A PARAMS-CHANGED PATCH (session
          // 7a82's autopsy P3, 2026-11-12): the steps-25 ∉ [4,8]
          // class — a landed param violating the family's envelope —
          // surfaced only at the OPERATOR's Run press, because only
          // wiring mutations carried the compile verdict. A patch
          // that changed params (stale) re-runs its stage: compose it
          // NOW, at authoring time, in the same voice add_stage
          // already speaks (never a refusal — the write landed; a
          // closable teaching line the next mutation can still cure).
          const compile = stale === true ? await compileVerdictOf(estate, bench, signal) : undefined
          return out({ rev: r.rev, stage: r.stage, patched: r.patched,
            ...(stale ? { stale: true } : {}),
            ...(spellLines.length > 0 ? { spells: spellLines } : {}),
            ...(appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {}),
            ...(compile !== undefined ? { ...compile } : {}),
            ...landingOf(compile) })
        }
        if (verb === 'add_stage') {
          // LOUD, never accept-and-ignore (2026-09-21): add_stage
          // names no stage — ids are assigned (s_0, s_1, ...) and the
          // answer carries the assigned id. A `stage` here was a
          // silent no-op that burned a patch cycle downstream.
          // THE EMPTY-STAGE DROP (035 attempt-14's Probe-A strand,
          // 2026-09-24): the tool's SHARED schema exposes a stage
          // slot for every verb — generated add_stage calls rode
          // `stage: ""` (noise, never intent) and the full refusal
          // stopped the probe sequence cold. An EMPTY string is
          // dropped silent; a NON-EMPTY stage on add_stage stays the
          // loud refusal (real addressing intent on a verb that
          // mints its own id).
          if (typeof a.stage === 'string' && a.stage.trim() === '') a.stage = undefined
          if (a.stage !== undefined) return out({ error: 'add_stage assigns its own stage id (s_0, s_1, ...) — the answer carries it; patch/remove_stage/rewire take {stage}. Drop the stage arg.' })
          // SLICE 5 — THE FIRST-DOOR GRAMMAR: the card's own schema
          // derives the wire shape (scalar→array on declared array
          // lanes) and judges the wiring lanes BEFORE the write, so
          // the bench stores the state the run will actually admit.
          const card = typeof a.card === 'string' ? a.card : ''
          let params = a.params
          let appliedDerivations: Array<Record<string, unknown>> = []
          if (card !== '') {
            const defs = await loadCardDefs()
            const def = defs.get(card)
            if (def !== undefined) {
              const laneRefusal = unknownLaneRefusal(card, a.inputs, def)
              if (laneRefusal !== undefined) return refuse(laneRefusal)
              if (isRecordArg(params)) {
                const derived = deriveParams(def, params)
                params = derived.params
                appliedDerivations = derived.derived
              }
            }
          }
          const r = await postBenchVerb(estate, bench, 'add_stage',
            {
              card: a.card,
              ...(a.engine !== undefined ? { engine: a.engine } : {}),
              ...(params !== undefined ? { params } : {}),
              ...(a.inputs !== undefined ? { inputs: a.inputs } : {}),
              // expected/outputs ride when stated as RECORDS (the door
              // admits both — ADD_KEYS; derivation covers card ports,
              // the override covers what the card cannot know).
              // Absent keys stay absent (the drops-absent law). The
              // type:object arg gate refuses stated non-records LOUD
              // before execute; the guard below holds the line if the
              // schema ever loosens — the bench's isRecord would shed
              // them silently, and accept-and-ignore is the one thing
              // this verb never does (the F6 remnant, 2026-09-21).
              ...(isRecordArg(a.expected) ? { expected: a.expected } : {}),
              ...(isRecordArg(a.outputs) ? { outputs: a.outputs } : {}),
              expect_rev: a.expect_rev,
            }, signal)
          // THE SPELL VOICE rides the verb that MINTS the stage: the
          // call's own inputs are the wired truth here, no extra read.
          // (The voice reads the CALLER's params, not the coerced bag:
          // the token's resolution is the same either way, and the
          // param path the agent wrote is the one it can recognize.)
          const spellLines = spellVoiceOf(a.params, a.inputs)
          // THE COMPILE VERDICT rides every add_stage (session 7a82's
          // autopsy: a params-only add minted the steps-25 class
          // unwitnessed — the verdict rode wiring mutations only;
          // now every minted stage composes, the familyless and
          // envelope classes both speak at LANDING, never at the
          // operator's press)
          const compile = await compileVerdictOf(estate, bench, signal)
          // slice 4b: the card's own doc rides the landing (deduped)
          const doc = typeof a.card === 'string' && a.card !== ''
            ? await cardDocOf(estate, a.card, sentDocs, signal)
            : undefined
          return out({ rev: r.rev, stage: r.stage, ...(spellLines.length > 0 ? { spells: spellLines } : {}), ...(appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {}), ...(compile !== undefined ? { ...compile } : {}), ...landingOf(compile), ...(doc !== undefined ? { doc } : {}) })
        }
        if (verb === 'remove_stage') {
          const r = await postBenchVerb(estate, bench, 'remove_stage',
            { stage: a.stage, expect_rev: a.expect_rev }, signal)
          return out({ rev: r.rev, stage: r.stage })
        }
        if (verb === 'clear') {
          // THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO
          // CLEAR ALL"): every stage out in one verb, one log entry,
          // undo restores everything. The cure for a bench that is
          // itself the wound (a stranded wire no repair verb could
          // reach before this law).
          const r = await postBenchVerb(estate, bench, 'clear', { expect_rev: a.expect_rev }, signal)
          return out({ rev: r.rev, cleared: r.cleared })
        }
        if (verb === 'floor') {
          // THE GPU ECONOMY VERB (operator 2026-10-24: "For GPU
          // usage, you should have a tool that makes stuff minimum
          // resolution to save GPU time"): Layer-A lawful to its
          // bone — it writes GRAPH PARAMS on bench stages (the
          // card's own resolution knobs), never engine config; the
          // estate's VRAM management stays ComfyUI's alone (the
          // GPU laws). THE FLOORS ARE DERIVED (the contract's DEPTH
          // axis): each card's live schema declares the resolution
          // group's members and their validating minimums — the
          // tool walks the SAME dict the form-spec door serves
          // (params-emit's emitKnob + the extra bag's group), so a
          // card that widens or narrows its resolution knobs is
          // followed without a tool change. Never a hand-baked
          // name list, never a baked number.
          const b = await readBench(estate, bench, signal)
          const rows = projectStages(b.stages)
          if (rows.length === 0) return out({ error: 'the bench holds no stages — nothing to floor' })
          let targets = rows
          if (typeof a.stage === 'string' && a.stage !== '') {
            targets = rows.filter((row) => row['id'] === a.stage)
            if (targets.length === 0) {
              return out({ error: `stage ${a.stage} is not on the bench — read names the live ids` })
            }
          }
          const defs = await loadCardDefs()
          let rev: unknown = typeof b.rev === 'number' ? b.rev : a.expect_rev
          const stages: Array<Record<string, unknown>> = []
          for (const row of targets) {
            const stageId = typeof row['id'] === 'string' ? row['id'] : ''
            const card = typeof row['card'] === 'string' ? row['card'] : ''
            const def = defs.get(card)
            // the carrier law (card-definition N4): plain schemas
            // carry the walkable dict themselves; hand-written
            // normalizers carry the inner schemastery object at
            // schemaCarrier.
            const carrier = def?.schemaCarrier ?? def?.schema
            const dict = carrier?.dict ?? {}
            const floors: Record<string, number> = {}
            for (const [name, node] of Object.entries(dict)) {
              // THE CARRIER LAW'S WALK HALF: schemastery nodes are
              // CALLABLES with fields (functions, not objects) — an
              // object-type guard here refused every node and the
              // verb floored nothing; guard null/undefined only and
              // let emitKnob/extraOf judge the shape.
              if (node === null || node === undefined) continue
              const ex = extraOf(node as { meta?: Record<string, unknown> }) as Record<string, unknown>
              if (ex['group'] !== 'resolution') continue
              const knob = emitKnob(node as never) as Record<string, unknown>
              if (knob['type'] !== 'number' && knob['type'] !== 'integer') continue
              if (typeof knob['minimum'] !== 'number') continue
              floors[name] = knob['minimum']
            }
            const floorEntries = Object.entries(floors)
            if (floorEntries.length === 0) {
              stages.push({ stage: stageId, card, floored: [], note: 'declares no resolution group — nothing to floor' })
              continue
            }
            const params = (typeof row['params'] === 'object' && row['params'] !== null && !Array.isArray(row['params']))
              ? row['params'] as Record<string, unknown>
              : {}
            const patch: Record<string, number> = {}
            const floored: Array<Record<string, unknown>> = []
            for (const [name, min] of floorEntries) {
              const cur = params[name]
              // ABSENT = SET (the default is not assumed minimal —
              // the whole point of the verb); ABOVE = clamp; at or
              // below = untouched (idempotent, honest voice).
              if (cur === undefined) {
                patch[name] = min
                floored.push({ param: name, from: '(default)', to: min })
              } else if (typeof cur === 'number' && cur > min) {
                patch[name] = min
                floored.push({ param: name, from: cur, to: min })
              } else if (typeof cur !== 'number') {
                floored.push({ param: name, from: cur, note: 'not a number — left untouched, the card coerces its own wire' })
              }
            }
            if (Object.keys(patch).length === 0) {
              stages.push({ stage: stageId, card, floored: [], note: 'already at or below every declared floor' })
              continue
            }
            const r = await postBenchVerb(estate, bench, 'patch',
              { stage: stageId, params: patch, expect_rev: rev }, signal)
            rev = r.rev
            stages.push({ stage: stageId, card, floored })
          }
          return out({ rev, stages, note: 'floors ride the cards\' own declared resolution minimums — compose still validates every write' })
        }
        if (verb === 'rewire') {
          // SLICE 5 — THE LANE LAW AT THE REWIRE DOOR: the input name
          // must be a declared port of the stage's card. One bounded
          // read names the card; the compile verdict below reads the
          // post-write bench (this read is the pre-write truth).
          if (typeof a.input === 'string' && a.input !== '') {
            const b = await readBench(estate, bench, signal)
            const card = cardOfStageRow(projectStages(b.stages), a.stage)
            if (card !== '') {
              const def = (await loadCardDefs()).get(card)
              if (def !== undefined) {
                const laneRefusal = unknownLaneRefusal(card, { [a.input]: true }, def)
                if (laneRefusal !== undefined) return refuse({ ...laneRefusal, stage: a.stage })
              }
            }
          }
          const r = await postBenchVerb(estate, bench, 'rewire',
            {
              stage: a.stage, input: a.input,
              ...(a.from !== undefined ? { from: a.from } : {}),
              expect_rev: a.expect_rev,
            }, signal)
          // THE COMPILE VERDICT rides every rewire (the verb IS wiring)
          const compile = await compileVerdictOf(estate, bench, signal)
          return out({ rev: r.rev, stage: r.stage, input: r.input, ...(compile !== undefined ? { ...compile } : {}), ...landingOf(compile) })
        } else {
          // THE LAST ARM IS THE ELSE (the re-audit, 2026-10-16): the
          // verb is a literal enum in this tool's parameter schema,
          // so the wrapper refuses an undeclared verb with
          // ToolArgsError BEFORE this body (pinned by
          // melite-construct.spec.ts:480-494) — the chain above is
          // total over the declared vocabulary and an execute-side
          // duplicate unknown-verb refusal was dead.
          const r = await postBenchVerb(estate, bench, 'undo',
            {
              ...(a.n !== undefined ? { n: a.n } : {}),
              ...(a.author !== undefined ? { author: a.author } : {}),
              expect_rev: a.expect_rev,
            }, signal)
          return out({ rev: r.rev, undone: r.undone, stages: r.stages })
        }
      } catch (e) {
        return refusalOf(e, verb, bench)
      }
    },
  })
  // (§7 P7: the presenter rides defineTool validation — no second,
  // ungated seat over the gate. The tool-presentation wall pins the
  // gated face.)
  return def as unknown as ToolDefinition
}
