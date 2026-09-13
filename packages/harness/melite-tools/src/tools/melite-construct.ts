// melite-construct.ts — THE AUTHOR VERB over one shared bench
// (the bench rework, 2026-09-10; docs/plans/bench-rework-2026-09-10.md
// §4). melite_flow executes; melite_construct AUTHORS — verbs over
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
// outputs}) plus presentation extras the door tolerates and the
// wire projection strips (card, provenance, runStatus, result).
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { EstateRequest } from '../estate.ts'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'

/** The default bench — one shared state per gateway. */
export const DEFAULT_BENCH = 'main'

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
  return typeof k === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(k) ? k : DEFAULT_BENCH
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

/** Project bench stage rows onto the flow_inline wire contract
 *  (extra=forbid at the start/validate doors: card, provenance,
 *  runStatus, result, title strip; engine defaults comfyui). */
export function projectStages(stages: unknown): Record<string, unknown>[] {
  if (!Array.isArray(stages)) return []
  return stages
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && !Array.isArray(s))
    .map((s) => {
      const row: Record<string, unknown> = {
        id: String(s['id'] ?? ''),
        engine: typeof s['engine'] === 'string' && s['engine'] !== '' ? s['engine'] : 'comfyui',
        params: typeof s['params'] === 'object' && s['params'] !== null && !Array.isArray(s['params'])
          ? s['params'] : {},
        inputs: typeof s['inputs'] === 'object' && s['inputs'] !== null && !Array.isArray(s['inputs'])
          ? s['inputs'] : {},
        outputs: typeof s['outputs'] === 'object' && s['outputs'] !== null && !Array.isArray(s['outputs'])
          ? s['outputs'] : { default: 'image' },
      }
      if (typeof s['expected'] === 'object' && s['expected'] !== null && !Array.isArray(s['expected'])) {
        row['expected'] = s['expected']
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
      // actually has — melite_flow only exists headless; the browser
      // agent's contract ENDS at the bench (the user's Run press is
      // the start door — say so, or the model hunts a verb it was
      // never given and breaks down mid-task).
      + (opts.headless === true
        ? 'This never executes (melite_flow runs what is here; the user presses Run). '
        : 'This never executes — your job ENDS at the bench: tell the user to press Run on the card. ')
      + 'Verbs: read (the state — '
      + 'always start here) | load (replace stages wholesale) | patch {stage, params} | add_stage {card, params?, '
      + 'inputs?} | remove_stage {stage} | rewire {stage, input, from?} | undo {n?, author?} | validate (compile '
      + 'check, no GPU). Mutations take expect_rev from your last read — a moved bench refuses 409 with '
      + 'current_rev; re-read, re-apply. No ids anywhere: the bench is the one shared state.',
    parameters: {
      verb: {
        type: 'string',
        description: 'read | load | patch | add_stage | remove_stage | rewire | undo | validate.',
      },
      stage: { type: 'string', description: 'patch/remove_stage/rewire: the stage id.' },
      card: { type: 'string', description: 'add_stage: the card id (display + provenance hint).' },
      engine: { type: 'string', description: 'add_stage: engine id (default comfyui).' },
      params: {
        type: 'object', additionalProperties: true,
        description: 'patch (merge onto the stage) | add_stage | load single-stage shorthand.',
      },
      inputs: {
        type: 'object', additionalProperties: true,
        description: 'add_stage: {input: {stage, output} | {initial}} wiring.',
      },
      input: { type: 'string', description: 'rewire: the input name to bind.' },
      from: {
        type: 'object', additionalProperties: true,
        description: 'rewire: {stage, output} | {initial}; absent clears the binding.',
      },
      stages: {
        type: 'array', items: { type: 'object', additionalProperties: true },
        description: 'load: the full replacement [{id?, engine?, card?, params?, inputs?, outputs?}].',
      },
      intent: { type: 'string', description: 'load: what this bench produces.' },
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
        const v = value as { verb?: string; rev?: number; ok?: boolean; error?: string }
        if (v && typeof v.error === 'string' && v.error !== '') {
          return [{ type: 'text', text: 'melite_construct REFUSED: ' + v.error }]
        }
        return [{
          type: 'text',
          text: 'bench ' + String(v.verb ?? '?') + ' → rev ' + String(v.rev ?? '?'),
        }]
      },
    },
    async execute(args, exec): Promise<ConstructResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover
      // (2026-09-12).
      const a = args as Record<string, unknown>
      const verb = typeof a.verb === 'string' ? a.verb : ''
      const bench = benchKeyOf(a)
      const signal = exec.signal
      const out = (payload: Record<string, unknown>): ConstructResult =>
        jsonClean<ConstructResult>({ verb, bench, ok: true, ...payload })
      try {
        if (verb === 'read' || verb === '') {
          const b = await readBench(request, bench, signal)
          return out({
            rev: b.rev, intent: b.intent, stages: b.stages, log: b.log,
            hint: 'mutate with expect_rev=' + String(b.rev),
          })
        }
        if (verb === 'validate') {
          const b = await readBench(request, bench, signal)
          const stages = projectStages(b.stages)
          if (stages.length === 0) return out({ rev: b.rev, compiles: false, note: 'bench is empty' })
          const r = await request( 'POST', '/v1/flows/validate',
            { flow_inline: { stages } }, signal, 20000) as Record<string, unknown>
          return out({ rev: b.rev, compiles: r['ok'] === true || r['valid'] === true, report: r })
        }
        if (verb === 'load') {
          const stages = Array.isArray(a.stages) ? a.stages : []
          const r = await request( 'POST', '/v1/bench/ensure',
            {
              session: bench, stages,
              ...(typeof a.intent === 'string' && a.intent !== '' ? { intent: a.intent } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stages: r.stages })
        }
        if (verb === 'patch') {
          const r = await request( 'POST', `/v1/bench/${bench}/patch`,
            { stage: a.stage, params: a.params, expect_rev: a.expect_rev }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stage: r.stage, patched: r.patched })
        }
        if (verb === 'add_stage') {
          const r = await request( 'POST', `/v1/bench/${bench}/add_stage`,
            {
              card: a.card,
              ...(a.engine !== undefined ? { engine: a.engine } : {}),
              ...(a.params !== undefined ? { params: a.params } : {}),
              ...(a.inputs !== undefined ? { inputs: a.inputs } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stage: r.stage })
        }
        if (verb === 'remove_stage') {
          const r = await request( 'POST', `/v1/bench/${bench}/remove_stage`,
            { stage: a.stage, expect_rev: a.expect_rev }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stage: r.stage })
        }
        if (verb === 'rewire') {
          const r = await request( 'POST', `/v1/bench/${bench}/rewire`,
            {
              stage: a.stage, input: a.input,
              ...(a.from !== undefined ? { from: a.from } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, stage: r.stage, input: r.input })
        }
        if (verb === 'undo') {
          const r = await request( 'POST', `/v1/bench/${bench}/undo`,
            {
              ...(a.n !== undefined ? { n: a.n } : {}),
              ...(a.author !== undefined ? { author: a.author } : {}),
              expect_rev: a.expect_rev,
            }, signal, 15000) as Record<string, unknown>
          return out({ rev: r.rev, undone: r.undone, stages: r.stages })
        }
        return jsonClean<ConstructResult>({
          verb, bench, ok: false,
          error: 'unknown verb — want read|load|patch|add_stage|remove_stage|rewire|undo|validate',
          error_kind: 'args',
        })
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
