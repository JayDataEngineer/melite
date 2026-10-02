/** stage-run.ts — the card stage's run doors: ONE stage through the
 * composing {model:} door (card stages) or the FLOW door (the
 * generic MCP card — a standalone-subagent spawn), and the bench's
 * sequential pass (extracted from CardsTab.tsx hour 15). */

import { fetchFormSpec, fieldsOf } from '@melite/card-base/client'
import { statusOf } from '@melite/contracts/stageView'
import { defaultFamilyForCard } from '@melite-plugin/melite-run-wire'
import { startCardRun, startFlowInlineRun } from '@melite/card-base/client'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { freshStageRow, observeRunOutcome } from './cards-resource.ts'
import { refuseForUnlandedWrite } from './draft.ts'

/** The generic MCP card's id (the ONE engine-served card the run
 * press routes on — the subagent-spawn card, engine 'agent'). */
const MCP_CARD = 'mcp'

/** Run ONE card stage through its composing door (the run-wire
 *  package's startCardRun — the {model:} arm) — EXCEPT the engine
 *  stage (the generic MCP card), which runs through the FLOW door
 *  (startMcpStage below). The flow_inline door
 *  this gesture rode before cannot consume cards ("card= stages are
 *  unported on this gateway") and its executor demanded a pre-composed
 *  params.workflow nobody emitted — the Sep 11 bench runs' "node
 *  carries no inline workflow". The {model:} door composes the card's
 *  arms estate-side; `model` is the card's DEFAULT FAMILY from the
 *  catalog, and — the Run-press law, 2026-10-08 — a family-less
 *  card rides its OWN id (defaultFamilyForCard's documented
 *  fallback): the door's card-unit arm composes the card verbatim
 *  (prepareCardParams' card-unit arm; no family overlay).
 *  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
 *  slot holds — an upload's estate path or a picked upstream output's
 *  media-route url — rides the start doc VERBATIM; the engine stages
 *  it under its runs-root arm. No client-side edge resolution exists.
 *  Exported for the tab seam's door-contract spec. */
export async function runCardStage(
  draftId: string,
  row: BenchStageView,
): Promise<{ runId: string } | { refused: string }> {
  // THE NO-WIRE REFUSAL FIRST (the door contract): a row naming no
  // card refuses before any wire fires.
  if (typeof row.card !== 'string' || row.card === '') {
    return { refused: 'this stage names no card — nothing to compose' }
  }
  // THE RUN GATE (the one-press/one-engine law, 2026-09-23, seated
  // 2026-09-23 audit: the gate lived on two call sites while Run ALL
  // and the chat tile composed past it). THIS is the seat now — the
  // SAME single-stage door the drill, the tile, the draft view, the
  // sequential pass, and the rescue rerun all ride: every compose
  // flushes the stage's authoring writes and refuses when a key's
  // latest write has not landed. A future caller inherits the law
  // by calling this door; no call site can route around it.
  const gate = await refuseForUnlandedWrite(draftId, row.id)
  if (gate !== null) return { refused: gate }
  // THE FRESH-READ LAW (2026-09-13 incident): compose the ESTATE's
  // row, read back AFTER the drill's patch — the passed row is the
  // client's render snapshot (the row as it stood at open) and the
  // patch the drill just awaited lives only estate-side. Without this
  // read-back every param typed between open and Run is dropped (the
  // music prompt refusal). A failed read composes the held row — the
  // door refuses honestly rather than lying with a fallback fetch.
  const src = await freshStageRow(draftId, row.id) ?? row
  const params = typeof src.params === 'object' && src.params !== null && !Array.isArray(src.params)
    ? src.params as Record<string, unknown>
    : {}
  const card = typeof src.card === 'string' && src.card !== '' ? src.card : ''
  if (card === '') return { refused: 'this stage names no card — nothing to compose' }
  // THE MODEL PASS-ALONG (2026-09-12: "the card-ui package is supposed
  //  to pass along the model, variant, and quant fields"): the stage's
  //  held `model` param — what the Model/Variant/Quant axes wrote (the
  //  variant defaults overlay re-points it: raw → krea-2-raw) — rides
  //  the {model:} door VERBATIM. The card's default family is only the
  //  RESTING value for stages that never touched the axes.
  const heldModel = params['model']
  const model = typeof heldModel === 'string' && heldModel !== '' ? heldModel
    : await defaultFamilyForCard(card)
  // THE ENGINE-STAGE ARM (the generic MCP card, operator 2026-09-21:
  // "ALWAYS spawn a completely standalone DSH subagent"): the mcp
  // card composes NO card graph — its run is the AGENT stage on the
  // FLOW door (the subagent loop with the card's MCPs/Skills/Inputs
  // tiles and the Task brief). The params ride VERBATIM (bag entries
  // folded engine-side by the executor's own gate —
  // normalizeAgentStageParams, never re-parsed client-side) EXCEPT
  // the Brain stamp below; an empty brief refuses loud AT THE PRESS, never a zombie run.
  if (card === MCP_CARD) {
    const task = typeof params['task'] === 'string' ? params['task'].trim() : ''
    if (task === '') {
      return { refused: 'write the Task first — the subagent spawns with no brief otherwise' }
    }
    // THE BRAIN TRANSLATION (operator 2026-09-21: a dropdown of
    // known routes): the face fields it `brain` — a card field
    // named `model` is the estate's model key, never a brain route
    // — while the engine's own contract key IS `model`
    // (normalizeAgentStageParams passes it to parseRoute, LOUD on
    // a rotted row). The seam stamps it here: a picked brain rides
    // as the engine's per-stage override, blank rides ABSENT and
    // the lane's seated brain serves. `brain` itself never crosses
    // (the engine's gate builds its own wire).
    const brain = typeof params['brain'] === 'string' ? params['brain'].trim() : ''
    const engineParams: Record<string, unknown> = { ...params }
    if (brain !== '') engineParams['model'] = brain
    delete engineParams['brain']
    return await startFlowInlineRun({
      flowId: 'mcp',
      stages: [{ id: src.id, engine: 'agent', params: engineParams, outputs: { default: 'text' } }],
      draftId,
    })
  }
  // THE WIRE RESOLUTION LAW (2026-10-10, the operator's
  // extermination order — NO SILENT BEHAVIOR): the bench's own
  // wiring law (admitWiring) REQUIRES every wired input to carry a
  // matching $spell in params — but the {model:} door composes ONE
  // stage and resolves NOTHING. Until now a wired stage's Run sent
  // the spell verbatim: the door accepted, the merge died with a
  // stranger's voice ('workflow carries $input_images'), and the
  // wire was silently discarded (run 880aaa85d928). THE WIRE MEANS
  // ONE THING: this input IS that stage's output. Running the stage
  // ALONE resolves the wire to the upstream's LAST RESULT —
  // result.url, the media-route currency the tiles already trade —
  // and sends the CONCRETE value. An upstream with no output yet
  // REFUSES HERE, naming the wire — never a doomed run, never a
  // silent drop.
  const wires = typeof src.inputs === 'object' && src.inputs !== null && !Array.isArray(src.inputs)
    ? src.inputs as Record<string, unknown>
    : {}
  let resolved = params
  const wireNames = Object.keys(wires)
  if (wireNames.length > 0) {
    resolved = { ...params }
    for (const name of wireNames) {
      const ref = wires[name] as Record<string, unknown> | null
      const isStageWire = typeof ref === 'object' && ref !== null
        && typeof ref['stage'] === 'string' && typeof ref['output'] === 'string'
      if (!isStageWire) {
        return { refused: 'input ' + JSON.stringify(name) + ' is neither {stage, output} nor a resolvable binding — the single-stage run maps only stage wires (got ' + JSON.stringify(ref ?? null) + ')' }
      }
      const upstreamId = String(ref!['stage'])
      const upstream = await freshStageRow(draftId, upstreamId)
      const res = typeof upstream?.result === 'object' && upstream.result !== null
        ? upstream.result as Record<string, unknown> : {}
      const url = typeof res['url'] === 'string' && res['url'] !== '' ? res['url'] : ''
      if (url === '') {
        return {
          refused: 'input ' + JSON.stringify(name) + ' is wired to stage ' + JSON.stringify(upstreamId)
            + ' which has no output yet — run it first (or clear the wire). The single-stage run resolves wires to the upstream\'s last result; it never drops them.',
        }
      }
      // substitute EVERY occurrence of the spell: a bare string or
      // inside arrays (input_images: ["$input_images"] → [url])
      const spell = '$' + name
      const substitute = (v: unknown): unknown => {
        if (v === spell) return url
        if (Array.isArray(v)) return v.map(substitute)
        if (typeof v === 'object' && v !== null) {
          const out: Record<string, unknown> = {}
          for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = substitute(x)
          return out
        }
        return v
      }
      for (const k of Object.keys(resolved)) resolved[k] = substitute(resolved[k])
    }
  }
  // the declared surface spells SELECT options as strings; a legacy
  // row may hold the matching number — normalize through the spec
  // (only when the stringified value IS a declared option; anything
  // else rides verbatim and the door refuses honestly)
  let spec: Awaited<ReturnType<typeof fetchFormSpec>>
  try {
    spec = await fetchFormSpec(card)
  } catch (e) {
    // THE DOWNED SPEC DOOR REFUSES (G10's stage-run half, 2026-10-12):
    // riding params verbatim past an unreachable spec door composes
    // against a surface this client never verified — the run stops
    // spoken, naming the door's own failure, never a silent degrade.
    return {
      refused: 'the form-spec door for ' + JSON.stringify(card) + ' is unreachable ('
        + (e instanceof Error ? e.message : String(e)) + ') — the run refuses rather than compose unverified params',
    }
  }
  let doc = resolved
  const selects = fieldsOf(spec).filter((f) => f.type === 'select' && Array.isArray(f.options))
  if (selects.length > 0) {
    doc = { ...resolved }
    for (const f of selects) {
      const v = doc[f.name]
      if (typeof v === 'number') {
        const opts = (f.options as Array<string | { value: string }>).map((o) => typeof o === 'string' ? o : o.value)
        if (opts.includes(String(v))) doc[f.name] = String(v)
      }
    }
  }
  return await startCardRun({ model, params: doc, draftId })
}

/** THE SEQUENTIAL PASS — Run ALL, the old system's composer law
 *  verbatim (flowExecuteSlice runAll, 2026-08-11): execute the
 *  stages IN ORDER, one run per card (the SAME single-stage door the
 *  drill's Run uses — a typed composer bench is never one graph
 *  run; the flow_inline door serves the chain/graph surface, not
 *  this one). Skip stages already done (the cache-hit skip). A
 *  failed or refused stage STOPS the pass — fail loud, never a
 *  doomed downstream run. The per-card observer patches each row as
 *  it goes (running → terminal), so the tiles flip one by one and
 *  the bench is never taken over. Exported for the door-contract
 *  spec. */
export async function runBenchSequential(
  bench: CardsBenchValue,
  hooks: {
    onCardStarted?: (runId: string, ran: { draftId: string; stageId: string }) => void
    onTouched?: () => void
    signal?: AbortSignal
  } = {},
): Promise<{ ran: string[]; stoppedAt: string | null; refused: string | null }> {
  const ran: string[] = []
  for (const stage of bench.stages) {
    if (hooks.signal?.aborted === true) return { ran, stoppedAt: null, refused: null }
    // THE CACHE-HIT SKIP, folded (2026-10-01): the raw 'done' compare
    // re-ran every stage the estate settles 'completed' and every
    // 'cached'/'reused' row — the skip now recognizes the whole done
    // family, exactly what the fold says carries an artifact.
    {
      const folded = statusOf(typeof stage.runStatus === 'string' ? stage.runStatus : '')
      if (folded === 'done' || folded === 'cached' || folded === 'reused') continue
    }
    const res = await runCardStage(bench.draftId, stage)
    if ('refused' in res) return { ran, stoppedAt: stage.id, refused: res.refused }
    hooks.onCardStarted?.(res.runId, { draftId: bench.draftId, stageId: stage.id })
    const terminal = await observeRunOutcome(bench.draftId, stage.id, res.runId, hooks.signal, hooks.onTouched)
    if (terminal !== 'done') {
      // failed / stopped / unknown — the pass stops at this card
      return { ran: [...ran, stage.id], stoppedAt: stage.id, refused: null }
    }
    ran.push(stage.id)
  }
  return { ran, stoppedAt: null, refused: null }
}
