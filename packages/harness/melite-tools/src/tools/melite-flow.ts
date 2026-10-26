// melite_flow — Melite flow (the rework, 2026-09-09): the ONE
// execution verb. Takes a card or a flow tool call and executes it
// through the serial GPU queue — card_run + flow_run + build_flow
// unified (their three paths survive inside, the draft ceremony
// does not surface). Drafts stay DOOR-level (CARD BIRTH LAW: every
// start rides a doc-backed draft_id — minted here, never argued).
//
// THREE modes, exactly one per call:
//   - {card, model, prompt?, params?} — a single card (the old
//     card_run path, composed inside: manifest gate + runnability
//     gate + defaults merge, then draft + {model} start).
//   - {flow, params?} — a NAMED template (the old flow_run path:
//     drafts {flow,...} + {flow} start). params are the OVERRIDE
//     door onto the template's stage params: a flat value rides the
//     one stage whose card admits the key ({file_format: "fbx"} on
//     body-to-somax), {stage_id: {…}} targets one stage — keys the
//     stage's card does not admit refuse loud, before any run.
//   - {stages, connects?} — cards drafted on the fly (the old
//     build_flow MULTI path: COMPILE FIRST at validate — no GPU on
//     a bad wire — then draft + {flow_inline} start).
// Returns {run_id, draft_id}; poll with run_status. One active run
// machine-wide. L4 test flag rides every mode. The draft_id rides
// the value AND the render's leading `card <draftId>` token — the
// chat tile handle (FlowCards parseCardsBlock), never an agent arg.
import { CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX, benchDraftIdOf, canonicalRunMediaUrl, draftIdOf, type DraftId } from '@melite/contracts/benchStage'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import { normalizeJsonArrayParams } from '@melite/estate-call/cardTool'
import type { Estate } from '../estate.ts'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'
import { unwrapItemArrays } from '@melite/comfyui-card-kit'
import { benchKeyOfExec } from './melite-construct.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { boardedMap, resolveSpecKeyForTool } from '../discovery.ts'
import { isTerminalStatus, statusOf, statusOrPendingOf } from '@melite/contracts/stageView'

/** The row's model (the QUEUE LANE LAW, agent-side): the row's
 *  params may name `model` explicitly; otherwise the card id
 *  resolves through form-spec's OWN alias law (boarded[0] — the
 *  same truth /v1/form-spec serves and the UI's
 *  defaultFamilyForCard reads; ONE resolution, never re-derived).
 *  A card that boards NO family (rig, mask) returns '' — THE
 *  FAMILYLESS MARKER (stroke 3): the stage rides the draft arm and
 *  the registry composes it by its OWN card id, never an injected
 *  body.model (that injection's voice — "model 'rig' is not offered
 *  by card 'rig'" — the af-move commission's stop, 2026-10-09). An
 *  unknown card id rides the same arm; the registry door names the
 *  ghost in its own voice. */
async function modelForCard(card: string, params: Record<string, unknown>): Promise<string> {
  if (typeof params['model'] === 'string' && params['model'] !== '') return params['model'] as string
  const defs = await loadCardDefs()
  if ((defs.get(card)?.boarded ?? []).length === 0) return ''
  const res = resolveSpecKeyForTool(card, defs, boardedMap(defs))
  // res.model is undefined only for cards boarding nothing, and the
  // guard above already returned for those — the check keeps the
  // minted-model kill's type honest (no phantom seat, no phantom id).
  return res !== null && res.model !== undefined ? res.model : ''
}
export interface MeliteConnectArg {
  from?: unknown
  to?: unknown
  kind?: unknown
}

/** One stage row from the agent's surface (gateway inline shape). */
export interface MeliteStageArg {
  id?: unknown
  engine?: unknown
  description?: unknown
  card?: unknown
  params?: unknown
  outputs?: unknown
}

/** The gateway edge row (flow_from_body contract). */
type EdgeRow = { initial: string } | { stage: string; output: string }

export interface MeliteFoldedStage {
  id: string
  engine: string
  description: string
  // THE CARD FOLD (attempt-035's dead-route receipt, 2026-09-24):
  // the fold once DROPPED `card` — validate saw a cardless row,
  // start's card gate never fired, and the engine answered with
  // the cryptic `node carries no inline workflow`. The fold keeps
  // the card so validate's own gate refuses loud, compile-first.
  card: string
  params: Record<string, unknown>
  inputs: Record<string, EdgeRow>
  expected: Record<string, string>
  outputs: Record<string, string>
}

/** Fold flat connects into per-stage typed edges. LOUD on shapes the
 * gateway would only bounce later — the agent reads the refusal HERE,
 * before any HTTP round trip. Kind resolution: the connect's `kind`
 * wins; a stage-to-stage connect may omit it when the upstream stage
 * DECLARES its outputs (inferred); an `initial.*` connect must state
 * it (nothing to infer from — the agent knows what its key carries). */
export function foldConnects(
  flowId: string,
  stages: MeliteStageArg[],
  connects: MeliteConnectArg[],
): MeliteFoldedStage[] {
  const folded: MeliteFoldedStage[] = stages.map((st) => {
    const outputs: Record<string, string> = {}
    const o = st.outputs
    if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        outputs[k] = String(v)
      }
    }
    return {
      id: String(st.id ?? ''),
      engine: String(st.engine ?? ''),
      description: String(st.description ?? ''),
      card: typeof st.card === 'string' ? st.card : '',
      params: (st.params !== null && typeof st.params === 'object'
        && !Array.isArray(st.params))
        ? st.params as Record<string, unknown> : {},
      inputs: {},
      expected: {},
      outputs,
    }
  })
  const byId = new Map(folded.map((s) => [s.id, s]))
  for (const c of connects) {
    const from = typeof c.from === 'string' ? c.from : ''
    const to = typeof c.to === 'string' ? c.to : ''
    if (from === '' || to === '') {
      throw new Error(
        'build_flow: connect needs {from, to} — got from=' + JSON.stringify(c.from)
        + ' to=' + JSON.stringify(c.to)
        + ' (from: "stage[.output]" or "initial.key"; to: "stage.input")',
      )
    }
    // to: "stage.input" — stage ids cannot contain dots (FLOW_ID_RE),
    // so the FIRST dot is the seam.
    const toDot = to.indexOf('.')
    if (toDot < 1) {
      throw new Error(
        'build_flow: connect to=' + JSON.stringify(to)
        + ' is not "stage.input" — the receiving stage and its input name',
      )
    }
    const target = byId.get(to.slice(0, toDot))
    if (target === undefined) {
      throw new Error(
        'build_flow: connect to=' + JSON.stringify(to)
        + ' names unknown stage ' + JSON.stringify(to.slice(0, toDot))
        + ' (flow ' + flowId + ' stages: ' + folded.map((s) => s.id).join(', ') + ')',
      )
    }
    const inputName = to.slice(toDot + 1)
    let edge: EdgeRow
    let inferred: string | undefined
    if (from.startsWith('initial.')) {
      edge = { initial: from.slice('initial.'.length) }
    } else {
      const dot = from.indexOf('.')
      const stageId = dot < 0 ? from : from.slice(0, dot)
      const output = dot < 0 ? 'default' : from.slice(dot + 1)
      const upstream = byId.get(stageId)
      if (upstream === undefined) {
        throw new Error(
          'build_flow: connect from=' + JSON.stringify(from)
          + ' names unknown stage ' + JSON.stringify(stageId)
          + ' (initial wires are "initial.<key>")',
        )
      }
      edge = { stage: stageId, output }
      // kind inference: only when the upstream DECLARES this output
      inferred = upstream.outputs[output]
    }
    let kind: string | undefined
    if (typeof c.kind === 'string' && c.kind.length > 0) kind = c.kind
    else if (inferred !== undefined) kind = inferred
    if (kind === undefined) {
      throw new Error(
        'build_flow: connect ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to)
        + ' has no kind and none can be inferred — state it (text, image,'
        + ' video, audio, mesh, num, lora, seg)'
        + (from.startsWith('initial.')
          ? ' (initial wires ALWAYS need an explicit kind)'
          : ' (the upstream stage does not declare this output)'),
      )
    }
    if (target.inputs[inputName] !== undefined) {
      throw new Error(
        'build_flow: stage ' + target.id + ' input ' + JSON.stringify(inputName)
        + ' is wired twice',
      )
    }
    target.inputs[inputName] = edge
    target.expected[inputName] = kind
  }
  return folded
}

const TIMEOUT_MS = 30_000
const DRAFT_TIMEOUT_MS = 15_000
const VALIDATE_TIMEOUT_MS = 15_000
/** THE OBSERVATION BUDGET (the commission wedge landing, 2026-10-03):
 *  the outcome observer polled WITHOUT a wall clock — a run whose
 *  claim never released (the queue's single-active lane) hung the
 *  tool for the life of the session (the film press wedged 95 min
 *  on a dead engine; the queue-side armor landed with this budget —
 *  runsRegistry.ts's pump catch). The budget bounds the
 *  OBSERVATION, never the run: expiry returns the waiting face
 *  ('queued' — a word the terminal arm can never produce), re-arms
 *  a background attribution link, and the caller reports a pending
 *  receipt (run_status owns re-waiting). Three times the wait
 *  family's WAIT_MAX_S=300 — above every legitimate render
 *  observed, short enough to free a wedged transcript. */
const OBSERVE_MAX_MS = 900_000

interface StartResult {
  run_id?: unknown
  status?: unknown
  error?: string
}

/** POST /v1/flows/start — the verbatim-error pattern (the agent
 *  reads the gateway's refusal text, not a transport code). */
/** THE WIRE-BOOLEAN READ (attempt-035's provenance receipt,
 * 2026-09-24): the same corruptor that stringifies declared
 *  numerics can stringify the declared boolean — `test: "true"`
 *  failed `=== true` and diagnostic runs landed under output/ as
 *  test:false. Loose spellings read truthy; everything else stays
 *  false (never truthy-coerce junk like 1/"yes"). */
function wireBool(v: unknown): boolean {
  return v === true || v === 'true'
}

async function startRun(
  estate: Estate,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let res: StartResult
  try {
    res = await estate.runsStart(body, signal, TIMEOUT_MS) as StartResult
  } catch (e) {
    // Remote refusals carry their named error on the protocol's one
    // class (the RayGatewayError HTTP-era arm died with the seats).
    const re = remoteErrorOf(e)
    if (re !== null && re !== undefined) {
      return { error: re.message || 'queue refused the start' }
    }
    throw e
  }
  // THE EMPTY-ERROR TRAP (run-status's twin, fixed with it 2026-09-24):
  // a start answer may carry `error: ""` on success — only a NON-EMPTY
  // error refuses.
  if (res && typeof res.error === 'string' && res.error !== '') return { error: res.error }
  return {
    run_id: typeof res.run_id === 'string' ? res.run_id : '',
    status: typeof res.status === 'string' ? res.status : 'queued',
  }
}

/** LOAD THE BENCH (the one-shared-state law — the bench rework,
 *  2026-09-10): every mode's composition lands on THE shared bench
 *  (draft doc bench-<key>) instead of minting a fresh draft per
 *  run. The user's cards tab streams the same bench; runs snapshot
 *  their composition in the run registry (CARD BIRTH LAW holds —
 *  the start still rides a doc-backed draft_id, now the bench's). */
async function loadBench(
  estate: Estate,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<DraftId> {
  // THE CAS READ-MODIFY-WRITE (the door's own law): under the host's
  // persistent storage the shared bench SURVIVES runs — a bare
  // {stages} ensure on an existing bench refuses bench/cas-conflict.
  // Read the row first; a live bench's rev rides as expect_rev, a
  // missing bench births (no expect_rev — the birth arm).
  // body.session is set by all three internal call sites (runSingle /
  // runTemplate / runAdHoc each pass the one-bench-law session —
  // execute's bench, the caller's conversation bench) — the cast
  // rides that call-site proof instead of a dead 'default' fallback
  // (2026-09-12).
  const session: string = body['session'] as string
  let expectRev: number | undefined
  try {
    const cur = await estate.benchGet(session, signal, DRAFT_TIMEOUT_MS) as { rev?: unknown }
    if (cur !== null && typeof cur === 'object' && typeof cur['rev'] === 'number') {
      expectRev = cur['rev']
    }
  } catch (e) {
    // bench/not-found = the birth arm (no expect_rev); anything else
    // is a real refusal and propagates.
    const re = remoteErrorOf(e)
    if (re === null || re === undefined || re.code !== 'bench/not-found') throw e
  }
  const b = await estate.benchEnsure({
    ...body,
    // THE LANDING DECLARES ITSELF (the overwrite law, 2026-09-15):
    // a run landing replaces the shared bench by design (the
    // one-shared-state law) — so it passes overwrite: true up
    // front. The composing agent's melite_construct load gets no
    // such pass; it must confirm each wipe itself.
    overwrite: true,
    ...(expectRev !== undefined ? { expect_rev: expectRev } : {}),
  }, signal, DRAFT_TIMEOUT_MS) as { draft_id?: unknown; error?: string }
  if (b && typeof b.error === 'string' && b.error) throw new Error(b.error)
  const id = b && b.draft_id
  if (typeof id !== 'string' || id === '') throw new Error('bench ensure returned no draft_id')
  // THE PARSE EDGE: the id came off the ensure answer's wire body.
  return draftIdOf(id)
}

/** BENCH (the AI-control pillar, 2026-09-12): the agent drives THE
 *  shared bench exactly like the user's Run press — ONE SEQUENTIAL
 *  PASS, agent-side, one card at a time through the serial queue.
 *  The flow_inline batch arm is DEAD here (the executor takes
 *  single-stage pre-composed graphs only — a multi-stage bench was
 *  an honest refusal, never a pass): each row runs through the
 *  {model: card-id} compose arm under the bench's own draft_id
 *  (resolveCardFamily resolves the card → family estate-side — the
 *  same truth /v1/form-spec serves), the run is observed to
 *  terminal on the run-wire cadence, and EVERY flip is written onto
 *  the bench row (runStatus + result {run_id, url}) through the
 *  bench patch door — the same attribution the tab's observer
 *  performs, so the user's tiles go live WHILE the agent drives.
 *  The pass law is Run All's law verbatim: bench order, skip done
 *  rows, one refusal or failed terminal STOPS the pass. */
async function runBench(
  estate: Estate,
  a: { test?: boolean; bench: string },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const empty = { mode: 'bench', target: benchDraftIdOf(a.bench), error: 'the bench is empty — construct stages first (melite_construct)' }
  let b: Record<string, unknown>
  try {
    b = await estate.benchGet(a.bench, signal, 15_000) as Record<string, unknown>
  } catch (e) {
    // The bench remote classifies the empty bench as bench/not-found
    // (the HTTP 404 died with the door).
    if (remoteErrorOf(e)?.code === 'bench/not-found') return empty
    throw e
  }
  const rows = Array.isArray(b['stages'])
    ? (b['stages'] as unknown[]).filter((s): s is Record<string, unknown> =>
        typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>)['id'] === 'string')
    : []
  if (rows.length === 0) return empty
  const draftId = typeof b['draft_id'] === 'string' ? draftIdOf(b['draft_id']) : benchDraftIdOf(a.bench)
  const target = `${benchDraftIdOf(a.bench)} @ rev ${String(b['rev'] ?? '?')}`
  const pass: Array<Record<string, unknown>> = []
  for (const row of rows) {
    const stageId = row['id'] as string
    const card = typeof row['card'] === 'string' && row['card'] !== '' ? row['card'] as string : ''
    // THE CACHE-HIT SKIP, folded (2026-10-01): the raw 'done' compare
    // re-ran every stage the estate settles 'completed' and every
    // cached/reused row.
    // The view-side read (2026-10-12): a draft row's runStatus is a
    // persisted word no door validated — era rows carry the card
    // plane's old 'unreachable' spelling (the transport escalation
    // now writes the health channel) — so the classifier's refusal
    // must not kill the tool call; an unreadable row is simply not
    // done and runs.
    {
      const folded = statusOrPendingOf(typeof row['runStatus'] === 'string' ? row['runStatus'] as string : '')
      if (folded === 'done' || folded === 'cached' || folded === 'reused') {
        pass.push({ stage: stageId, card, skipped: 'done' })
        continue
      }
    }
    if (card === '') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
        error: `stage ${stageId} names no card — nothing to compose (melite_construct patch)`, pass }
    }
    const params = row['params'] !== null && typeof row['params'] === 'object' && !Array.isArray(row['params'])
      ? row['params'] as Record<string, unknown> : {}
    const model = await modelForCard(card, params)
    // A familyless stage presses the DRAFT ARM alone (the same body
    // runSingle's wired path rides): the run door composes the bench's
    // stages — the familyless one by its own card id. A model key here
    // would select the card arm and hit the board check.
    const started = await startRun(estate, model === ''
      ? { test: wireBool(a.test), draft_id: draftId }
      : { ...params, model, test: wireBool(a.test), draft_id: draftId },
    signal)
    if (typeof started['error'] === 'string') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId, error: started['error'], pass }
    }
    const runId = started['run_id'] as string
    const outcome = await observeAndAttribute(estate, draftId, stageId, runId, signal, wireBool(a.test))
    pass.push({ stage: stageId, card, run_id: runId, status: outcome.status,
      ...(outcome.url !== '' ? { url: outcome.url } : {}),
      ...(outcome.artifacts.length > 0 ? { artifacts: outcome.artifacts } : {}),
      ...(outcome.host_paths.length > 0 ? { host_paths: outcome.host_paths } : {}),
      ...(outcome.stamp_note !== undefined ? { stamp_note: outcome.stamp_note } : {}) })
    if (outcome.status === 'queued') {
      // THE PENDING RECEIPT (the commission wedge, 2026-10-03): the
      // observation budget spent on a run that is still live — the
      // flow is NOT failed. The run continues on the queue, the
      // render prints `[pending] — poll with run_status`, and the
      // background attribution link still lands the terminal stamp
      // on the stage row when the run settles.
      return { mode: 'bench', target, draft_id: draftId, status: 'pending', stoppedAt: stageId, run_id: runId, pass }
    }
    if (outcome.status !== 'done') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId, run_id: runId,
        error: `stage ${stageId} (${card}) ended ${outcome.status}`, pass }
    }
  }
  // THE RUN-ID VISIBILITY LAW (commissions 032/033, the transcript-016
  // half that never landed): the SUCCESS return carries the final
  // stage's run_id at the top level and every minted id in pass[] —
  // the render prints them. A maker that cannot see the id it just
  // paid for burns calls on ledger_tail to find it (032 and 033 both
  // did, twice each — the doc promised {run_id, draft_id} while the
  // value printed '?').
  const lastRun = (() => {
    for (let i = pass.length - 1; i >= 0; i--) {
      const rid = pass[i]!['run_id']
      if (typeof rid === 'string' && rid !== '') return rid
    }
    return ''
  })()
  const lastHosts = (() => {
    const acc: string[] = []
    for (const row of pass) {
      const hp = row['host_paths']
      if (!Array.isArray(hp)) continue
      for (const h of hp) {
        if (typeof h === 'string' && h !== '' && !acc.includes(h)) acc.push(h)
      }
    }
    return acc
  })()
  return { mode: 'bench', target, draft_id: draftId, run_id: lastRun, status: 'done',
    ...(lastHosts.length > 0 ? { host_paths: lastHosts } : {}), pass }
}

/** Signal-honoring sleep — the observer's poll cadence (the run-wire
 *  cadence, 1500ms). DECIDED per-plane (the dry-sweep's J5, recorded
 *  like the J13 variance): this spelling RESOLVES on abort because
 *  the observer's loop re-checks its deadline after every tick — a
 *  rejection here would surface as a failed observe, not a quiet
 *  exit; run-status.ts's sleepAbortable REJECTS for the mirror
 *  reason (its poll has no post-await check). No Context reaches a
 *  tool body, so ctx.timeout is not a seat for either; the kit's
 *  browser sleep (catalog/src/sleep.ts) is another plane's law. */
function sleepAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

/** THE HOST-PATH CANONICALIZER (session 90a0b920's F7, the
 * artifact-path archaeology burn: the agent read `/melite-media/...`
 * urls in flow results, tried them on the host, `ls: cannot access
 * '/melite-media/'`, and burned ~6 bash calls on find + a python
 * census over 1,834 runs to learn the estate's path dialects before
 * daring to touch a file). The media route is the BROWSER's channel;
 * the maker's shell never sees it. This mirrors run-status.ts's
 * canonical receipt law (023's self-critique #3) and adds the one
 * spelling that tool never meets: a full media url folds back to
 * its out-root form — `/melite-media/runs/<rid>/<rel>` is the
 * estate output tree served over HTTP, so it canonicalizes to
 * `output/<rid>/<rel>` (test runs root under test-output/ — the
 * flag rides the caller's run request, never the url). Absolute
 * non-media paths stay verbatim (run-status's law); bare relatives
 * stay bare (one home per fact: the UI face keeps the media url,
 * the agent face carries this). */
function canonicalHostPath(p: string, rid: string, test: boolean): string {
  const media = RUN_MEDIA_PREFIX + '/'
  let value = p
  if (value.startsWith(media)) value = value.slice(media.length)
  if (value.startsWith('/')) return p
  const bare = value.startsWith('./') ? value.slice(2) : value
  // the legacy-double collapse (024's self-critique #2): rows served
  // before the run-dir-relative fix spell <rid>/<rid>/…
  const single = rid !== '' && bare.startsWith(rid + '/' + rid + '/')
    ? rid + bare.slice((rid + '/' + rid).length) : bare
  const root = test ? 'test-output/' : 'output/'
  if (rid !== '' && (single === rid || single.startsWith(rid + '/'))) {
    return root + single
  }
  // a bare run-relative name (the live row's gallery spelling) still
  // lives under the run's own directory — root it there (run-status
  // never meets this spelling; its rows arrive rid-prefixed).
  return single !== '' && rid !== '' ? root + rid + '/' + single : single
}

/** THE OUTCOME OBSERVER, agent-side (observeRunOutcome's law, the
 *  attribution half): poll the run to terminal, writing every flip
 *  onto the stage row (runStatus + result) through the DRAFTS
 *  stage-patch door — `/v1/flows/drafts/<draftId>/stages/<stageId>`
 *  (THE SKIP-DONE HOLE, transcript-011's duplicate GPU runs, fixed
 *  2026-09-24: the old arm posted runStatus/result to the BENCH
 *  patch verb, whose law REFUSES run outcomes — "run outcomes ride
 *  the drafts/patch door" — so every agent-side attribution was
 *  refused and swallowed as bookkeeping; done marks never landed
 *  and the next bench pass re-ran completed stages. The UI's
 *  observer always used this door — that is why the user's Run All
 *  skipped and the agent's never did). Patches remain bookkeeping —
 *  a refusal is swallowed (the run's own outcome is the answer) —
 *  but the door is now the one the law names, so the swallow only
 *  ever sees transport, never a wired-in refusal. The url rides the
 *  estate's media route: run-RELATIVE names prefix
 *  /melite-media/runs/<runId>/, urls that carry a scheme or lead
 *  with / pass verbatim (the ONE rewrite — the run-wire law,
 *  mirrored). */
export async function observeAndAttribute(
  estate: Estate,
  draftId: DraftId,
  stageId: string,
  runId: string,
  signal: AbortSignal,
  test: boolean,
  budgetMs: number = OBSERVE_MAX_MS,
  rearms: number = 2,
): Promise<{ status: string; url: string; artifacts: string[]; host_paths: string[]; stamp_note?: string }> {
  const deadline = Date.now() + budgetMs
  let lastLive = ''
  // THE LOUD MISS (the no-feedback defect, 2026-10-22): the operator
  // watched an agent bench pass mint five runs while the cards tab
  // showed NOTHING — every stamp died at the seat seam and each
  // death was swallowed as "bookkeeping". A stamp that does not land
  // is a voice the user never hears, so the observation CARRIES the
  // miss (stamp_note) instead of eating it; the run's own outcome
  // still answers. The newest attempt owns the note: a later stamp
  // that LANDS clears it (the preview paints — the earlier miss is
  // history), a later miss overwrites it.
  let stampNote: string | undefined
  const noteMiss = (phase: string, why: string): void => {
    stampNote = `attribution ${phase}: ${why}`
  }
  for (;;) {
    signal.throwIfAborted()
    let doc: Record<string, unknown>
    try {
      doc = await estate.runsStatus(runId, false, signal, TIMEOUT_MS) as Record<string, unknown>
    } catch (e) {
      // a classified unknown-run is terminal (the poll's stop set
      // must match the stream's — runFinished's law); transport
      // hiccups retry on cadence.
      const re = remoteErrorOf(e)
      // folded like every other arm of this poller: unknown-outcome
      // is the 'stopped' CardStatus by the owner's contract
      if (re !== null && re !== undefined && re.code === 'runs/unknown-run') return { status: statusOf('unknown'), url: '', artifacts: [], host_paths: [] }
      await sleepAbort(1500, signal)
      continue
    }
    const status = typeof doc['status'] === 'string' ? doc['status'] as string : 'unknown'
    if (isTerminalStatus(status)) {
      const stages = Array.isArray(doc['stages'])
        ? (doc['stages'] as unknown[]).filter((s): s is Record<string, unknown> =>
            typeof s === 'object' && s !== null) : []
      const st = stages.find((s) => s['id'] === stageId)
        ?? (stages.length === 1 ? stages[0] : undefined)
      // THE MEDIA URL IS THE CONTRACT'S (2026-10-10, the records
      // audit's H2 — a LIVE second copy: this re-wrote the prefix and
      // passed a LEGACY `/v1/assets/runs` path through VERBATIM
      // because it begins with a slash, so a stored pre-law path
      // went to the browser dead. canonicalRunMediaUrl heals both
      // spellings to the live one, and the prefix is the contract's.
      const toMediaUrl = (value: string): string => {
        if (value === '') return ''
        const healed = canonicalRunMediaUrl(value)
        if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(healed)) return healed
        const relative = healed.startsWith(`${runId}/`) ? healed.slice(runId.length + 1) : healed
        return `${RUN_MEDIA_PREFIX}/${encodeURIComponent(runId)}/${relative.split('/').map(encodeURIComponent).join('/')}`
      }
      const rawUrl = st !== undefined && typeof st['url'] === 'string' && st['url'] !== '' ? st['url'] as string : ''
      const url = toMediaUrl(rawUrl)
      // THE HOST FACE rides the raw spellings the browser rewrite
      // consumed (F7's law): the agent gets out-rooted paths its
      // shell can open, minted BEFORE any media prefix joins.
      const hostPaths: string[] = rawUrl !== '' ? [canonicalHostPath(rawUrl, runId, test)] : []
      const arts: string[] = []
      const rawArts = doc['artifacts']
      if (Array.isArray(rawArts)) {
        for (const a of rawArts) {
          const p = typeof a === 'string' ? a
            : (typeof (a as { path?: unknown })?.['path'] === 'string' ? (a as { path: string })['path'] : '')
          if (p !== '') arts.push(p)
        }
      }
      const names: string[] = []
      const gallery = st !== undefined && Array.isArray(st['gallery'])
        ? (st['gallery'] as unknown[]).flatMap((entry): string[] => {
            if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return []
            const name = (entry as { name?: unknown }).name
            return typeof name === 'string' && name !== '' ? [name] : []
          })
        : []
      for (const name of [...gallery, ...arts]) {
        if (!names.includes(name)) names.push(name)
      }
      for (const name of names) {
        const host = canonicalHostPath(name, runId, test)
        if (host !== '' && !hostPaths.includes(host)) hostPaths.push(host)
      }
      const result: Record<string, unknown> = { run_id: runId }
      if (url !== '') result['url'] = url
      const artifacts: Record<string, string> = {}
      const assetUrls: string[] = []
      for (const name of names) {
        const mediaUrl = toMediaUrl(name)
        if (assetUrls.includes(mediaUrl)) continue
        artifacts[name] = mediaUrl
        assetUrls.push(mediaUrl)
      }
      if (url !== '' && !assetUrls.includes(url)) assetUrls.unshift(url)
      if (Object.keys(artifacts).length > 0) result['artifacts'] = artifacts
      if (assetUrls.length > 0) result['assetUrls'] = assetUrls
      // THE FOLD (2026-10-01): the old ternary translated ONLY
      // 'completed' and passed every other word verbatim, so cached,
      // reused, skipped, stale and live landed on bench rows as words
      // nothing translated. One fold classifies every word.
      const terminal = statusOf(status)
      // The stamp is BOOKKEEPING for the run but FEEDBACK for the
      // watching user (the cards tab adopts foreign runs off these
      // very rows) — a miss answers loud, never silence.
      try {
        const ans = await estate.draftsStagePatch(draftId, stageId, { runStatus: terminal, result }, signal, DRAFT_TIMEOUT_MS) as { delivered?: unknown; reason?: unknown }
        if (ans !== null && typeof ans === 'object' && ans['delivered'] === false) {
          noteMiss('refused', typeof ans['reason'] === 'string' && ans['reason'] !== '' ? ans['reason'] : 'not delivered')
        } else {
          stampNote = undefined
        }
      } catch (e) {
        noteMiss('failed', e instanceof Error ? e.message : String(e))
      }
      return { status: terminal, url, artifacts: arts, host_paths: hostPaths, ...(stampNote !== undefined ? { stamp_note: stampNote } : {}) }
    }
    // the queue-feedback stamp, classified by the fold (queued or
    // still-waiting stamps queued; 'live'/'stopping' stamp running).
    // The view-side read: this doc came over the wire without
    // readRunStatus's validation, and isTerminalStatus above passes an
    // unreadable word through as non-terminal — the poller keeps its
    // cadence on a word it cannot read, never dies on the throw.
    const foldedLive = statusOrPendingOf(status)
    const live = foldedLive === 'queued' || foldedLive === 'pending' ? 'queued' : 'running'
    if (live !== lastLive) {
      lastLive = live
      try {
        await estate.draftsStagePatch(draftId, stageId, { runStatus: live, result: { run_id: runId } }, signal, DRAFT_TIMEOUT_MS)
      } catch (e) {
        // bookkeeping for the run, FEEDBACK for the watching user —
        // noted, superseded by whatever the terminal stamp does.
        noteMiss('live stamp failed', e instanceof Error ? e.message : String(e))
      }
    }
    if (Date.now() >= deadline) {
      // THE WAIT-EXPIRED RECEIPT (the commission wedge, 2026-10-03):
      // budget spent on a run that is still live — the observation
      // ends, the run does not. 'queued' is the fold's waiting face
      // and a word the terminal arm can never return, so the
      // callers branch on it cleanly. Attribution outlives the
      // observation: one background link with a fresh signal (the
      // attribution-outlives-the-call law — the fire-and-forget
      // arms' own shape) keeps stamping the stage row until the run
      // settles or the chain's re-arms run out (the queue-side
      // armor bounds the run itself).
      if (rearms > 0) {
        void observeAndAttribute(estate, draftId, stageId, runId, new AbortController().signal, test, budgetMs, rearms - 1).catch(String)
      }
      return { status: 'queued', url: '', artifacts: [], host_paths: [], ...(stampNote !== undefined ? { stamp_note: stampNote } : {}) }
    }
    await sleepAbort(1500, signal)
  }
}

/** SINGLE (the old card_run path, composed inside): manifest gate
 *  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(
  estate: Estate,
  // hasCard gate (execute, the sole caller): card is a non-empty string
  // and params always an object here — no empty fallbacks exist to cover
  // (2026-09-12). model normalizes at the caller (missing → ''), so the
  // !model guard below stays reachable ('' rides it — melite-load's
  // `if (!name)` precedent).
  a: { card: string; model: string; prompt?: string; params: Record<string, unknown>; test?: boolean; bench: string },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const card = a.card
  // THE MODEL DERIVE (the zero-friction audit, 2026-10-21): the card
  // arm refused without an explicit `model` while modelForCard — the
  // same card→family derivation the BENCH arm rides — sat one block
  // above unused. The operator's explicit family still wins; a card
  // that boards a family derives it (the QUEUE LANE LAW's own
  // resolver, never a minted id); only a card boarding NOTHING still
  // refuses, and the refusal now names where the family lives.
  let model = a.model
  if (!model) model = await modelForCard(card, a.params)
  if (!model) return { mode: 'card', target: card, error: 'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card)' }
  // THE CARD ARM OWNS THE COMPOSE (REBUILD-9): the runs registry's
  // start {model:} arm gates (manifest/runnability), overlays the
  // route-lens stamp (family defaults + variant resolver_defaults),
  // composes phase-1/phase-2 and registers — the tool passes the
  // USER bag and surfaces the arm's refusal voices (RemoteError →
  // {error}). The tool's caller names the family itself; the
  // /v1/card-tools + /v1/model-catalog faces serve NO model pick
  // for a model-less card (THE MINTED-MODEL KILL, 2026-10-12) and
  // never did compose — the card-id alias is admission's law
  // (PROOF-13), not a served pick.
  // execute always passes params: bag (an object) — spread of undefined
  // is {} anyway, so no fallback exists to cover (2026-09-12).
  const bag: Record<string, unknown> = { ...a.params }
  if (typeof a.prompt === 'string' && a.prompt !== '') bag["prompt"] = a.prompt
  const defs = await loadCardDefs()
  const resolved = resolveSpecKeyForTool(card, defs, boardedMap(defs))
  // M7 (the fallback audit): an unknown card used to degrade to
  // `cardDef === undefined`, the tool still birthed a draft with the
  // bogus card id, and the refusal surfaced only at the run door —
  // the bench polluted with an uncomposable stage first. The law is
  // the tool's own comment above ("surfaces the arm's refusal
  // voices"): refuse HERE, before anything is written.
  if (resolved === null) {
    return { mode: 'card', target: card, error: `unknown card '${card}' — name a registered card or family (melite_discover lists them); nothing was written to the bench` }
  }
  const cardDef = defs.get(resolved.card)
  const normalizedBag = normalizeJsonArrayParams(bag, cardDef?.jsonArrayParams)
  // CARD BIRTH LAW (2026-09-13, the hour-6 form regression): a card
  // tool's draft is born with THE CARD ID AS ITS INTENT and one
  // stage. The bench normalization strips `card` from the stage row
  // (identity survives on the intent alone), and the studio consult
  // re-attaches cardName from the intent — so intent MUST be the
  // card id, never the prompt. The prompt-as-intent arm here is what
  // rendered the generic form for every prompt-carrying chat birth:
  // the consult keyed on "a quiet beach at dusk" and no studio
  // claimed it. The prompt rides bag.prompt (params), its display
  // home. (drafts/list shows the card id as the draft name — the
  // bench-default receipt's own shape.)
  /* v8 ignore next -- resolveSpecKey answered above; every real card
   * id and family alias is far under 80 chars, so the truncation arm
   * is defensive only (2026-10-13, the coverage-cure pass). */
  const intent = card.length > 80 ? card.slice(0, 77) + '…' : card
  let draftId: DraftId
  try {
    draftId = await loadBench(estate, {
      session: a.bench,
      intent,
      stages: [{
        id: 's_0',
        card,
        engine: CARD_PLANE_ENGINE,
        params: normalizedBag,
      }],
    }, signal)
  } catch (e) {
    return { mode: 'card', target: card, error: e instanceof Error ? e.message : String(e) }
  }
  // THE WIRED-BENCH CONTRACT (2026-10-10, the operator's a-priori
  // order: "CONTRACTS SHOULD WORK A PRIORI"): a single-card body
  // ({model, params}) composes ONE stage with inputNames: {} — every
  // wire on the bench would be DISCARDED, and the run door refuses
  // that loudly (the operator met the wall as "no FromStage links"
  // nonsense). The tool holds the contract ITSELF now: after the
  // ensure it reads the bench it just wrote; if ANY stage carries
  // wiring, the start rides the FLOW arm (draft_id alone — the
  // draft's stages compose with their wires as FromStage links,
  // exactly the run door's own cure), never a single-card body. The
  // wall can no longer be reached from this tool, whatever the
  // bench holds.
  let benchStages: Array<Record<string, unknown>> = []
  try {
    const row = await estate.benchGet(a.bench, signal, DRAFT_TIMEOUT_MS) as { stages?: unknown }
    if (row !== null && typeof row === 'object' && Array.isArray(row['stages'])) {
      benchStages = row['stages'].filter((st: unknown): st is Record<string, unknown> => typeof st === 'object' && st !== null)
    }
  } catch { /* the read is advisory: an unreachable bench falls to the single-card arm and the run door's own wall names it */ }
  const wired = benchStages.filter((st) => {
    const ins = st['inputs']
    return typeof ins === 'object' && ins !== null && !Array.isArray(ins) && Object.keys(ins).length > 0
  })
  if (wired.length > 0) {
    const started = await startRun(estate, { test: wireBool(a.test), draft_id: draftId }, signal)
    if (typeof started["error"] === "string") return { mode: 'card', target: card, rode: 'flow-arm (bench carries wiring — the wires ride as stage inputs)', ...started }
    const runId = started['run_id']
    if (typeof runId === 'string' && runId !== '') {
      void observeAndAttribute(estate, draftId, 's_0', runId, new AbortController().signal, wireBool(a.test)).catch(String)
    }
    return { mode: 'card', target: card, model, draft_id: draftId, rode: 'flow-arm (bench carries wiring — the wires ride as stage inputs)', ...started }
  }
  const started = await startRun(estate, { ...normalizedBag, model, test: wireBool(a.test), draft_id: draftId }, signal)
  if (typeof started["error"] === "string") return { mode: 'card', target: card, ...started }
  const runId = started['run_id']
  if (typeof runId === 'string' && runId !== '') {
    void observeAndAttribute(estate, draftId, 's_0', runId, new AbortController().signal, wireBool(a.test)).catch(String)
  }
  return { mode: 'card', target: card, model, draft_id: draftId, ...started }
}

/** TEMPLATE (the old flow_run path): drafts {flow,...} + start. */
async function runTemplate(
  estate: Estate,
  // hasFlow gate (execute, the sole caller): flow is a non-empty string
  // and params always an object here — no fallbacks exist to cover
  // (2026-09-12).
  a: { flow: string; params: Record<string, unknown>; test?: boolean; bench: string },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const flow = a.flow
  /* v8 ignore next -- hasFlow gate proves non-empty flow (2026-09-12) */
  if (!flow) return { mode: 'flow', target: '', error: 'flow is required (a discovered flow name)' }
  const overrides = a.params
  let draftId: DraftId
  try {
    // TEMPLATE load sugar: the bench carries the template REFERENCE
    // (the {flow} start arm expands the graph server-side; the run
    // registry snapshots it). One marker row keeps the doc honest.
    draftId = await loadBench(estate, {
      session: a.bench,
      intent: flow,
      stages: [{ id: 's_0', engine: CARD_PLANE_ENGINE, ref_flow: flow, params: {} }],
    }, signal)
  } catch (e) {
    // The bench remote's refusal (RemoteError) — its message is the
    // diagnostic ("bench moved: rev is N, caller held M").
    return { mode: 'flow', target: flow, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(estate, { ...overrides, flow, test: wireBool(a.test), draft_id: draftId }, signal)
  // a refused start carries the error and NO draft_id — a tile never
  // mounts for a run that never registered (the estate card-tool law).
  if (typeof started["error"] === 'string') return { mode: 'flow', target: flow, ...started }
  return { mode: 'flow', target: flow, draft_id: draftId, ...started }
}

/** AD-HOC (the old build_flow MULTI path): COMPILE FIRST at
 *  validate (no GPU on a bad wire), then draft + {flow_inline}. */
async function runAdHoc(
  estate: Estate,
  a: { stages?: unknown; connects?: unknown; id?: unknown; description?: unknown; test?: boolean; bench: string },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const rawStages = a.stages
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    return { mode: 'adhoc', target: 'adhoc', error: 'stages must be a non-empty array of {id, engine, params?, outputs?} rows' }
  }
  const flowId = typeof a.id === 'string' && a.id !== '' ? a.id : 'adhoc'
  const connects = Array.isArray(a.connects) ? a.connects as Array<{ from?: unknown; to?: unknown; kind?: unknown }> : []
  let folded: MeliteFoldedStage[]
  try {
    folded = foldConnects(flowId, rawStages as Array<{ id?: unknown; engine?: unknown; description?: unknown; params?: unknown; outputs?: unknown }>, connects)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : /* v8 ignore next -- foldConnects throws Error only: all six sites `new Error`, and property-access TypeErrors are Errors too (2026-09-12) */ String(e) }
  }
  const flowBody = {
    id: flowId,
    description: typeof a.description === 'string' ? a.description : '',
    stages: folded.map((s) => ({
      id: s.id,
      engine: s.engine,
      description: s.description,
      ...(s.card !== '' ? { card: s.card } : {}),
      params: s.params,
      ...(Object.keys(s.inputs).length > 0 ? { inputs: s.inputs } : {}),
      ...(Object.keys(s.expected).length > 0 ? { expected: s.expected } : {}),
      ...(Object.keys(s.outputs).length > 0 ? { outputs: s.outputs } : {}),
    })),
  }
  try {
    await estate.runsValidate(flowBody, signal, VALIDATE_TIMEOUT_MS)
  } catch (e) {
    const re = remoteErrorOf(e)
    if (re !== null && re !== undefined) {
      return { mode: 'adhoc', target: flowId, error: re.message || 'flow does not compile' }
    }
    throw e
  }
  let draftId: DraftId
  try {
    draftId = await loadBench(estate, {
      session: a.bench,
      intent: flowId,
      stages: folded,
    }, signal)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(estate, { flow_inline: flowBody, test: wireBool(a.test), draft_id: draftId }, signal)
  if (typeof started["error"] === 'string') return { mode: 'adhoc', target: flowId, ...started }
  return { mode: 'adhoc', target: flowId, draft_id: draftId, ...started }
}

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). mode/target ride every
 *  composed shape AND every pre-dispatch guard (the af-move2 cure:
 *  a bare guard refusal died at the tool-call validation layer and
 *  its voice never reached the agent). */
type FlowResult = {
  mode: string;
  target: string;
  run_id?: string;
  draft_id?: string;
  status?: string;
  model?: string;
  error?: string;
} & Record<string, JsonValue>;

export function meliteFlow(estate: Estate): ToolDefinition {
  // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
  // seat for the invalid face): the presenter rides defineTool
  // validation, and defineTool's soft gate OWNS invalid args
  // (invalid → undefined, never throw). The pre-purge re-attach over
  // that gate (a second, ungated seat rendering the generic card for
  // junk) is deleted — conversion invariance (presentCall output must
  // not change) now reads against the gated face. execute validation
  // (ToolArgsError/INVALID_ARGS) is unaffected.
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (args ?? {}) as { card?: unknown; flow?: unknown; stages?: unknown };
    const target = typeof a.card === 'string' && a.card !== '' ? a.card
      : typeof a.flow === 'string' && a.flow !== '' ? a.flow
      : Array.isArray(a.stages) ? `adhoc (${a.stages.length} stages)` : '?';
    return { card: 'generic', title: `Run ${target}`, kind: 'execute' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_flow',
    description:
      'Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared '
      + 'bench exactly as it stands — what the user\'s Run press runs) | card (a card id + model — single '
      + 'generation) | flow (a NAMED template from melite_load) | stages (engine-node stages on the fly: [{id, engine, '
      + 'params?, outputs?}] + optional connects — compiled at validate BEFORE any GPU is spent). Compositions '
      + 'LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the '
      + 'bench\'s doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an '
      + 'agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper) — every composition arm stays
    // optional because exactly-one cross-property exclusivity is not
    // expressible in this grammar (per-property annotations only);
    // execute owns that refusal. What the schema CAN own, it does:
    // stage rows refuse an undeclared key or a missing id/engine,
    // connect rows a missing from/to — validateArgs fires these
    // before execute runs.
    parameters: {
      bench: {
        type: 'boolean',
        description: 'BENCH mode: run THE shared bench exactly as it stands (what the user\'s Run press runs). A JSON boolean — true, never the string "true". Exclusive with card/flow/stages.',
      },
      card: {
        type: 'string',
        description: 'SINGLE mode: the card id (discovered). Requires model alongside.',
      },
      model: {
        type: 'string',
        description: 'SINGLE mode: the family id, named explicitly (must own a card tool).',
      },
      flow: {
        type: 'string',
        description: 'TEMPLATE mode: the flow name exactly as loaded.',
      },
      stages: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', required: true, description: 'The stage id (connects and run rows name it).' },
            engine: { type: 'string', required: true, description: 'The engine id (e.g. comfyui).' },
            card: { type: 'string', description: 'The card id the stage composes through — the card fold keeps it on the row so start\'s card gate fires (035 dead-route receipt).' },
            description: { type: 'string', description: 'What the stage produces.' },
            params: { type: 'object', additionalProperties: true, description: 'Engine node params (open — the engine owns the keys).' },
            outputs: { type: 'object', additionalProperties: true, description: 'Output channels {name: kind}.' },
          },
        },
        description: 'AD-HOC mode: [{id, engine, description?, params?, outputs?: {name: kind}}]. Exclusive with card/flow.',
      },
      connects: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', required: true, description: '"stage[.output]" | "initial.key".' },
            to: { type: 'string', required: true, description: '"stage.input".' },
            kind: { type: 'string', description: 'The wire kind when it cannot be derived.' },
          },
        },
        description: 'AD-HOC mode: [{from: "stage[.output]" | "initial.key", to: "stage.input", kind?}].',
      },
      prompt: {
        type: 'string',
        // THE CARD-MODE PROMPT SEAT (027's self-critique #2,
        // 2026-09-24): top-level prompt merges into the card body
        // where the card's admission rejects it (tts wants `text`
        // inside params) — state the seat so card mode never
        // reaches for this field.
        description: 'SINGLE mode ONLY: the generation prompt (wins over params.prompt). Card mode takes its text key (e.g. text) INSIDE params — top-level prompt on a card refuses as an unknown param.',
      },
      params: {
        type: 'object',
        additionalProperties: true,
        description: 'Overrides merged over the mode defaults (seed, knobs).',
      },
      id: {
        type: 'string',
        description: 'AD-HOC mode: the pipeline name for the compiled flow.',
      },
      description: {
        type: 'string',
        description: 'AD-HOC mode: what the pipeline produces.',
      },
      test: {
        type: 'boolean',
        description: 'L4 barrier: true routes the run to test-output, hidden from production assets. Default false.',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id). Absent on a pre-run refusal; PRESENT on a stopped-mid-flow refusal (a stage that ran and failed — render prints it after the error).' },
          draft_id: { type: 'string', description: 'The minted card draft id — the chat tile handle (?meliteCards=). Absent on refusal.' },
          status: { type: 'string', description: 'The bench outcome: done | pending | stopped | queued | running. pending = the observation budget spent on a still-live run (the run continues on the queue — re-wait with run_status(run_id)); absent on refusal.' },
          mode: { type: 'string', description: 'Which composition ran (or was attempted): card | flow | adhoc.', required: true },
          target: { type: 'string', description: 'The card id, flow name, or ad-hoc pipeline name (echoed on refusal).', required: true },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
        // Ledger row 11 (2026-09-10): required is the fields EVERY
        // return shape carries — the refusal echoes mode/target
        // (comfy-manage's ok/action pattern); run_id/draft_id/status
        // are success-only and stay optional so the declared schema
        // never calls a careful refusal a schema failure.
      },
      render: (_args, value) => {
        const v = value as { run_id?: string; draft_id?: string; mode?: string; target?: string; status?: string; error?: string }
        if (v && typeof v.error === 'string') {
          // A stopped-mid-flow bench carries the failed stage's run_id
          // ALONGSIDE the error (the loop return at the stop site).
          // The maker must never have to glob output/ to find a run it
          // already paid for (transcript-016: ten wasted calls hunting
          // the id the tool held but did not print).
          const ran = typeof v.run_id === 'string' && v.run_id !== '' ? ` — run ${v.run_id} (poll with run_status)` : ''
          return [{ type: 'text', text: 'melite_flow REFUSED: ' + v.error + ran }]
        }
        // The render stays human/model-facing prose; the tile handle rides
        // presentationMeta (the persisted channel — see below). The leading
        // `card <draftId>` token is the LEGACY replay path only: sessions
        // logged before the meta channel keep hydrating through it.
        // THE PASS LIST rides the prose too (032/033: a maker that minted
        // three runs saw ONE '?' — every id it paid for prints here now).
        const pass = (v as { pass?: unknown }).pass
        const passRows = Array.isArray(pass)
          ? (pass as Array<Record<string, unknown>>).map((p) =>
            '  · ' + String(p['stage'] ?? '?') + ' ' + String(p['card'] ?? '?')
            + (typeof p['run_id'] === 'string' && p['run_id'] !== '' ? ' → ' + p['run_id'] : '')
            // THE HONEST SKIP FACE (the warm-fire no-op lie): a
            // skipped row printed [done] — indistinguishable from a
            // minted run, and the agent hunted a run that never
            // existed. The skip says WHAT it skipped and WHY.
            // THE HONEST SKIP FACE (the warm-fire no-op lie): a
            // skipped row printed [done] — indistinguishable from a
            // minted run, and the agent hunted a run that never
            // existed. The skip says WHAT it skipped and WHY.
            + ' [' + (p['status'] === undefined && p['skipped'] !== undefined
              ? 'skipped ' + String(p['skipped']) + ' — unchanged since its last run; patch params to re-run'
              : String(p['status'] ?? p['skipped'] ?? '?')) + ']'
            // THE LOUD MISS FACE (the no-feedback defect): a stamp
            // that never landed means the watching user's cards tab
            // paints NOTHING for this row — the maker must see that
            // and say so, not report a run the user cannot find.
            + (typeof p['stamp_note'] === 'string' && p['stamp_note'] !== ''
              ? ' — STAMP MISSED (' + p['stamp_note'] + '): the user\u2019s cards tab will NOT show this run'
              : '')
            + (typeof p['url'] === 'string' && p['url'] !== '' ? ' ' + p['url'] : '')
            + (Array.isArray(p['host_paths']) && (p['host_paths'] as unknown[]).length > 0
              ? ' (host: ' + (p['host_paths'] as string[]).join(', ') + ')' : ''),
          ).join('\n')
          : ''
        return [{
          type: 'text',
          text: 'card ' + String(v.draft_id ?? '?') + ' · flow ' + String(v.target ?? '?')
            // no dangling arrow: an all-skipped bench mints nothing
            // (run_id '') and the header says so — the id prints only
            // when a run exists to poll.
            + (typeof v.run_id === 'string' && v.run_id !== '' ? ' → ' + v.run_id : '')
            + ' [' + String(v.status ?? 'queued') + '] — poll with run_status'
            + (passRows !== '' ? '\n' + passRows : '')
            // THE RUN CONTRACT'S HOST FACE (F7): every path the
            // maker's shell can open, in run_status's resolving-root
            // voice — the media urls above are the browser's
            // channel, these are the filesystem's.
            + (Array.isArray((v as { host_paths?: unknown }).host_paths) && ((v as { host_paths?: unknown[] }).host_paths ?? []).length > 0
              ? '\nartifacts on host (rooted at the estate output tree, not your cwd): '
                + ((v as { host_paths: string[] }).host_paths).join('\n  ')
              : ''),
        }]
      },
      // presentationMeta: the NATIVE tile channel — persisted verbatim on
      // tool/result; the client derives card props from it (the same path
      // every card tool rides: {draft_id, run_id, model?, status, error}).
      // Pure: live streaming AND session-log replay call it with the frozen
      // value alone. The agent never sees this payload.
      presentationMeta: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>
        return {
          mode: String(v.mode ?? '?'),
          target: String(v.target ?? '?'),
          ...typeof v.model === 'string' && v.model !== '' ? { model: v.model } : {},
          ...typeof v.draft_id === 'string' && v.draft_id !== '' ? { draft_id: v.draft_id } : {},
          ...typeof v.run_id === 'string' && v.run_id !== '' ? { run_id: v.run_id } : {},
          ...typeof v.status === 'string' && v.status !== '' ? { status: v.status } : {},
          ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
        }
      },
    },
    async execute(args, exec): Promise<FlowResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover;
      // every composition arm stays optional (exactly-one is enforced
      // below, never the schema) (2026-09-12).
      // THE ARRAY WIRE GUARD (P2, ROADMAP §36.4 — commission 034's
      // forensic): free-form nested arrays corrupt on the wire
      // (`{item:[…]}` non-empty, `""` empty). The shape-based
      // unwrap rides EVERY param-bearing arg before composition —
      // the card seat (the kit's coerceWireArrays) fills the ""
      // arm for schema-declared arrays.
      // THE REBIND LAW (attempt-035's construct/flow freeze
      // receipt, 2026-09-24): the wire may deliver args FROZEN —
      // writing `a.params = …` threw `Cannot assign to read only
      // property 'params'` on every param-bearing mutation. The
      // guard NEVER writes to the caller's object: it walks a copy
      // and the body reads the new binding only.
      const a = { ...unwrapItemArrays(args) } as {
        bench?: unknown; card?: unknown; model?: unknown; flow?: unknown; stages?: unknown; connects?: unknown;
        prompt?: unknown; params?: unknown; id?: unknown; description?: unknown; test?: unknown;
      }
      const bag = (a.params && typeof a.params === 'object' && !Array.isArray(a.params))
        ? a.params as Record<string, unknown> : {}
      const test = wireBool(a.test)
      const hasBench = a.bench === true
      const hasCard = typeof a.card === 'string' && a.card !== '';
      const hasFlow = typeof a.flow === 'string' && a.flow !== '';
      const hasStages = a.stages !== undefined;
      const modes = [hasBench, hasCard, hasFlow, hasStages].filter(Boolean).length;
      /* The three guards below carry mode/target: the declared
       * output.schema requires them, and a bare {error} here died at
       * the tool-call validation layer — the schema error ("missing
       * value.mode/target") reached the agent INSTEAD of the guard's
       * own voice (the af-move2 commission's "harness bug",
       * 2026-10-09 — three masked diagnostics in one run). mode
       * 'flow' + target '' name nothing-selected, the same voice the
       * hasFlow guard uses. */
      if (modes === 0) {
        return jsonClean({ mode: 'flow', target: '', error: 'one composition is required: bench (run what is there) | card (+model) | flow | stages (cards drafted on the fly)' }) as FlowResult;
      }
      if (modes > 1) {
        return jsonClean({ mode: 'flow', target: '', error: 'exactly one composition per call: bench | card | flow | stages — never combined' }) as FlowResult;
      }
      // THE UNKNOWN-ARG VOICE (029's self-critique #1, 2026-09-24):
      // a card param at FLOW top-level (qvoice_save beside card)
      // used to drop SILENTLY — the bag only spreads known keys —
      // and the maker paid a generic missing-params refusal instead
      // of the pointed one. Unknown top-level keys refuse HERE,
      // naming the seat (card params ride INSIDE params).
      const KNOWN_FLOW_ARGS = ['bench', 'card', 'model', 'flow', 'stages', 'connects', 'prompt', 'params', 'id', 'description', 'test'] as const;
      const known = new Set<string>(KNOWN_FLOW_ARGS);
      const stray = Object.keys(args as Record<string, unknown>).filter((k) => !known.has(k));
      if (stray.length > 0) {
        return jsonClean({ mode: 'flow', target: '', error: 'unknown melite_flow arg(s) ' + JSON.stringify(stray) + ' — card params (text, voice_name, qvoice, variant, …) ride INSIDE params, never top-level; top-level carries only bench | card (+model) | flow | stages (+connects/id/description/test)' }) as FlowResult;
      }
      // THE ONE-BENCH LAW (§22, 2026-09-22): flow lands on the
      // CALLER's conversation bench (benchKeyOfExec — the agent's own
      // session), never the hardcoded main — construct binds the same
      // key, so the composed tiles and the executed pipeline are one
      // bench. Unattributed seats (no agent id) fall back to main,
      // exactly like construct's benchKeyOf fallback.
      const bench = benchKeyOfExec(exec as { agent?: { id?: unknown } })
      try {
        if (hasBench) {
          return jsonClean(await runBench(estate, { test, bench }, exec.signal)) as FlowResult;
        }
        if (hasFlow) {
          return jsonClean(await runTemplate(estate, {
            flow: a.flow as string, params: bag, test, bench,
          }, exec.signal)) as FlowResult;
        }
        if (hasCard) {
          return jsonClean(await runSingle(estate, {
            card: a.card as string,
            model: typeof a.model === 'string' ? a.model : '',
            prompt: typeof a.prompt === 'string' ? a.prompt : undefined,
            params: bag, test, bench,
          }, exec.signal)) as FlowResult;
        }
        return jsonClean(await runAdHoc(estate, {
          stages: a.stages,
          connects: a.connects,
          id: a.id,
          description: typeof a.description === 'string' ? a.description : undefined,
          test, bench,
        }, exec.signal)) as FlowResult;
      } catch (e) {
        const re = remoteErrorOf(e)
        if (re !== null && re !== undefined) {
          // Ledger row 11: the refusal echoes mode/target (the fields the
          // schema requires of EVERY shape — comfy-manage's ok/action
          // pattern) so a careful refusal never fails output validation.
          // BENCH-ONLY (2026-09-12): the sole RemoteError escaping to this
          // catch is runBench's bench GET — runSingle/runTemplate/runAdHoc
          // convert every remote refusal to an {error} value inside
          // (loadBench try/catch, startRun's remote arm, validate's remote
          // arm); non-remote errors rethrow below. The old flow/card/adhoc
          // mapping was dead here and mislabeled bench failures as
          // adhoc/pipeline — the refusal rides bench's own mode/target
          // (a real mislabel, fixed minimally).
          return jsonClean<FlowResult>({ error: re.message || 'remote refused', mode: 'bench', target: benchDraftIdOf(bench) });
        }
        throw e;
      }
    },
  });
  // (§7 P7: the presenter rides defineTool validation — no second,
  // ungated seat over the gate. The tool-presentation wall pins the
  // gated face.)
  return def;
}
