/** stage-run.ts — the card stage's run doors: ONE stage through the
 * composing {model:} door (card stages) or the FLOW door (the
 * generic MCP card — a standalone-subagent spawn), and the bench's
 * sequential pass (extracted from CardsTab.tsx hour 15). */

import { fetchFormSpec, fieldsOf } from './spec-form.tsx'
import { defaultFamilyForCard } from '@melite-plugin/melite-run-wire'
import { startCardRun, startFlowInlineRun } from '@melite/card-base/runs-policy'
import type { CardsBenchValue, BenchStageRow } from './cards-resource.ts'
import { freshStageRow, observeRunOutcome } from './cards-resource.ts'

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
 *  catalog (the runs door resolves neither card ids nor aliases —
 *  defaultFamilyForCard carries the currency, session-cached).
 *  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
 *  slot holds — an upload's estate path or a picked upstream output's
 *  media-route url — rides the start doc VERBATIM; the engine stages
 *  it under its runs-root arm. No client-side edge resolution exists.
 *  Exported for the tab seam's door-contract spec. */
export async function runCardStage(
  draftId: string,
  row: BenchStageRow,
): Promise<{ runId: string } | { refused: string }> {
  // THE NO-WIRE REFUSAL FIRST (the door contract): a row naming no
  // card refuses before any wire fires.
  if (typeof row.card !== 'string' || row.card === '') {
    return { refused: 'this stage names no card — nothing to compose' }
  }
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
  // normalizeAgentStageParams, never re-parsed client-side); an
  // empty brief refuses loud AT THE PRESS, never a zombie run.
  if (card === MCP_CARD) {
    const task = typeof params['task'] === 'string' ? params['task'].trim() : ''
    if (task === '') {
      return { refused: 'write the Task first — the subagent spawns with no brief otherwise' }
    }
    return await startFlowInlineRun({
      flowId: 'mcp',
      stages: [{ id: src.id, engine: 'agent', params, outputs: { default: 'text' } }],
      draftId,
    })
  }
  // the declared surface spells SELECT options as strings; a legacy
  // row may hold the matching number — normalize through the spec
  // (only when the stringified value IS a declared option; anything
  // else rides verbatim and the door refuses honestly)
  let doc = params
  try {
    const spec = await fetchFormSpec(card)
    const selects = fieldsOf(spec).filter((f) => f.type === 'select' && Array.isArray(f.options))
    if (selects.length > 0) {
      doc = { ...params }
      for (const f of selects) {
        const v = doc[f.name]
        if (typeof v === 'number') {
          const opts = (f.options as Array<string | { value: string }>).map((o) => typeof o === 'string' ? o : o.value)
          if (opts.includes(String(v))) doc[f.name] = String(v)
        }
      }
    }
  } catch { /* spec unavailable — params ride verbatim */ }
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
    if (stage.runStatus === 'done') continue // the cache-hit skip
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
