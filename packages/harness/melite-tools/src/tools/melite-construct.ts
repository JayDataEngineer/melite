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
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { EstateRequest } from '../estate.ts'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'
import { unwrapItemArrays } from '@melite/comfyui-card-kit'

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

/** Refusal formatting shared by every verb (the remote's RemoteError
 *  first — code + message, the CAS detail rides details.current_rev —
 *  then any Error's message; lanes still awaiting their remote refuse
 *  loudly as plain errors). */
function refusalOf(e: unknown, verb: string, bench: string): ConstructResult {
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
    })
  }
  const error = e instanceof Error ? e.message : String(e)
  return jsonClean<ConstructResult>({ verb, bench, error, error_kind: 'remote', ok: false })
}

/** GET the bench; not-found → ensure (birth) → GET again. Reads are
 *  the freshness mechanism — always a remote round trip. */
async function readBench(
  request: EstateRequest, bench: string, signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const get = (): Promise<unknown> =>
    request( 'GET', `/v1/bench/${bench}`, undefined, signal, 15000)
  try {
    return (await get()) as Record<string, unknown>
  } catch (e) {
    // The bench remote classifies the missing bench as
    // bench/not-found (the HTTP 404 died with the door).
    if (remoteErrorOf(e)?.code === 'bench/not-found') {
      await request( 'POST', '/v1/bench/ensure',
        { session: bench }, signal, 15000)
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
  request: EstateRequest, bench: string, verbPath: string,
  body: Record<string, unknown>, signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const attempt = (rev: unknown): Promise<Record<string, unknown>> =>
    request('POST', `/v1/bench/${bench}/${verbPath}`,
      { ...body, expect_rev: rev }, signal, 15000) as Promise<Record<string, unknown>>
  try {
    return await attempt(body['expect_rev'])
  } catch (e) {
    if (!isCasConflict(e)) throw e
    const fresh = await readBench(request, bench, signal)
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
  request: EstateRequest, bench: Record<string, unknown>, signal: AbortSignal,
): Promise<{ stages: unknown; runs: Record<string, unknown> | null }> {
  const stages: unknown = bench['stages']
  const none = { stages, runs: null } as { stages: unknown; runs: Record<string, unknown> | null }
  if (!Array.isArray(stages) || stages.length === 0) return none
  const draftId: unknown = bench['draft_id']
  if (typeof draftId !== 'string' || draftId === '') return none
  let env: Record<string, unknown>
  try {
    env = await request('GET', '/v1/flows/runs?limit=100', undefined, signal, 15000) as Record<string, unknown>
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


export function meliteConstruct(
  request: EstateRequest,
  opts: { headless?: boolean } = {},
): ToolDefinition {
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
      + 'inputs {image1: {stage: "s_0", output: "default"}} AND params {image1: "$image1"} — the $spell consumes the channel, the queue resolves it at run time; to chain '
      + 'the last generation, bind its stage, never hunt its artifact on disk; kinds derive from the card\'s ports — '
      + 'state expected only to override, outputs only for custom channels) | remove_stage {stage} | clear (EVERY stage out in one rev; undo restores all — the cure when the bench itself is the wound) | rewire {stage, input, from?} (from is {stage, output} | '
      + '{initial} — same law: stage bindings, never paths) | undo {n?, author?} | validate (compile '
      + 'check, no GPU). Mutations take expect_rev from your last read — a moved bench refuses 409 with '
      + 'current_rev; re-read, re-apply. No ids anywhere: the bench is the one shared state.',
    parameters: {
      verb: {
        type: 'string',
        enum: ['read', 'load', 'patch', 'add_stage', 'remove_stage', 'clear', 'rewire', 'undo', 'validate'],
        description: 'read (default when absent) | load | patch | add_stage | remove_stage | clear | rewire | undo | validate.',
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
      expect_rev: { type: 'number', description: 'CAS: the rev from your last read (required on mutations).' },
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
        },
      },
      render: (_args, value) => {
        const v = value as { verb?: string; rev?: number; ok?: boolean; error?: string; intent?: string; hint?: string; stages?: unknown }
        if (v && typeof v.error === 'string' && v.error !== '') {
          return [{ type: 'text', text: 'melite_construct REFUSED: ' + v.error }]
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
                suffix = ' — last_run null (draft has no run in the window)'
              }
              lines.push(`  ${id} — ${card} [${engine}]${suffix}`)
            }
          }
        }
        const runsFacts = (v as { runs?: { checked?: unknown; total?: unknown; matched?: unknown } }).runs
        if (runsFacts !== undefined) {
          lines.push(`runs window: checked ${String(runsFacts.checked ?? '?')}, total ${String(runsFacts.total ?? '?')}, matched ${String(runsFacts.matched ?? '?')}`)
        }
        if (typeof v.intent === 'string' && v.intent !== '') lines.push('intent: ' + v.intent)
        if (typeof v.hint === 'string' && v.hint !== '') lines.push('hint: ' + v.hint)
        return [{ type: 'text', text: lines.join('\n') }]
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
      try {
        if (verb === 'read') {
          const b = await readBench(request, bench, signal)
          const enriched = await withLastRun(request, b, signal)
          return out({
            rev: b.rev, intent: b.intent, stages: enriched.stages, log: b.log,
            ...(enriched.runs !== null ? { runs: enriched.runs } : {}),
            hint: 'mutate with expect_rev=' + String(b.rev),
          })
        }
        if (verb === 'validate') {
          const b = await readBench(request, bench, signal)
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
          const r = await request( 'POST', '/v1/flows/validate',
            { flow_inline: { id: flowId, stages } }, signal, 20000) as Record<string, unknown>
          return out({ rev: b.rev, compiles: r['ok'] === true || r['valid'] === true, report: r })
        }
        if (verb === 'load') {
          const stages = Array.isArray(a.stages) ? a.stages : []
          const r = await request( 'POST', '/v1/bench/ensure',
            {
              session: bench, stages,
              ...(typeof a.intent === 'string' && a.intent !== '' ? { intent: a.intent } : {}),
              ...(a.overwrite === true ? { overwrite: true } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stages: r.stages })
        }
        if (verb === 'patch') {
          const r = await postBenchVerb(request, bench, 'patch',
            { stage: a.stage, params: a.params, expect_rev: a.expect_rev }, signal)
          return out({ rev: r.rev, stage: r.stage, patched: r.patched })
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
          const r = await postBenchVerb(request, bench, 'add_stage',
            {
              card: a.card,
              ...(a.engine !== undefined ? { engine: a.engine } : {}),
              ...(a.params !== undefined ? { params: a.params } : {}),
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
          return out({ rev: r.rev, stage: r.stage })
        }
        if (verb === 'remove_stage') {
          const r = await postBenchVerb(request, bench, 'remove_stage',
            { stage: a.stage, expect_rev: a.expect_rev }, signal)
          return out({ rev: r.rev, stage: r.stage })
        }
        if (verb === 'clear') {
          // THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO
          // CLEAR ALL"): every stage out in one verb, one log entry,
          // undo restores everything. The cure for a bench that is
          // itself the wound (a stranded wire no repair verb could
          // reach before this law).
          const r = await postBenchVerb(request, bench, 'clear', { expect_rev: a.expect_rev }, signal)
          return out({ rev: r.rev, cleared: r.cleared })
        }
        if (verb === 'rewire') {
          const r = await postBenchVerb(request, bench, 'rewire',
            {
              stage: a.stage, input: a.input,
              ...(a.from !== undefined ? { from: a.from } : {}),
              expect_rev: a.expect_rev,
            }, signal)
          return out({ rev: r.rev, stage: r.stage, input: r.input })
        } else {
          // THE LAST ARM IS THE ELSE (the re-audit, 2026-10-16): the
          // verb is a literal enum in this tool's parameter schema,
          // so the wrapper refuses an undeclared verb with
          // ToolArgsError BEFORE this body (pinned by
          // melite-construct.spec.ts:480-494) — the chain above is
          // total over the declared vocabulary and an execute-side
          // duplicate unknown-verb refusal was dead.
          const r = await postBenchVerb(request, bench, 'undo',
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
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (junk/invalid args during streaming +
  // replay still render the generic view, never throw — the
  // tool-presentation wall pins this; same re-attach as every
  // other melite face).
  def.presentCall = presentCall
  return def as unknown as ToolDefinition
}
