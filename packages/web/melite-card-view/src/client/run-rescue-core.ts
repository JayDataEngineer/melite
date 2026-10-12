/**
 * run-rescue-core.ts — the run-gate rescue's data half (roadmap item 4,
 * the operator's 2026-09-20 order: hit RUN without a model or a
 * ComfyUI extension → a popup offers the install through the
 * manage seat, right where the run refused).
 *
 * THE LINKS-IN-CODE LAW (the operator, same order: "we NEVER do
 * one-time downloads, ALL download links are KEPT IN CODE"): the
 * client NEVER carries a URL. It passes NAMES ONLY —
 * install_extension takes the pack id from the refusal's own text;
 * acquire_weight takes the FAMILY id and the manage seat resolves
 * the DECL provision rows server-side (the declaration is the one
 * truth for what downloads from where). An ad-hoc URL has no door
 * here, by construction.
 *
 * THE ONE WIRE: the install rides postManageAction (card-base's
 * manage/act gateway door — the SAME wire the form-time prompts
 * ride; there is no second manage client). This module is the
 * RUN-TIME half: the form-time prompts (PackPrompt, the model
 * offer) catch the miss BEFORE the press; this catches the miss
 * the press itself surfaced — a pack the form could not see, a
 * model file the presence mark believed present, an engine refusal
 * mid-run. Same seat, same vocabulary, later gate.
 */

import { postManageAction } from '@melite/card-base/client'
import type { ManageJsonValue } from '@melite/estate-manage/types'
import { statusOrPendingOf } from '@melite/contracts/stageView'

/** What a failed run can offer to fix. `extension` names a pack id
 * (from the missing-extension refusal's own text); `model` names a
 * missing model FILE (from the engine's error) — the family rides
 * separately (the stage params own it; the DECL owns the file). */
export type Rescue =
  | { kind: 'extension', pack: string }
  | { kind: 'model', file: string, target?: string }

/** Parse a failed run's reason for a rescueable miss. The
 * missing-extension refusal names its pack verbatim
 * ("card 'x' requires 'PACK' …"); the lane-presence gate names its
 * family and declared file verbatim ("lane presence: family 'x'
 * declares <slot> '<file>' but no store copy exists …"); a model
 * miss names a weight file in a not-found context. Anything else is
 * not ours to fix — null (never a wrong install). */
export function parseRescue(error: string): Rescue | null {
  if (typeof error !== 'string' || error === '') return null
  // THE ANCHORED PACK VOICE (the client-plane audit cure, 2026-10-18):
  // only the door's own sentence matches — `card '<id>' requires
  // '<pack>' (nodes …) — none live on the engine`. A bare
  // /requires '…'/ also ate the lane voices ("this lane requires
  // 'prompt'" — the incomplete-draft class, and the stated-wrong
  // requires arm), rendering an Install banner for a phantom pack
  // named after a lane word.
  const ext = /card '[^']*' requires '([^']+)'/.exec(error)
  if (ext !== null) return { kind: 'extension', pack: ext[1]! }
  // THE LANE-PRESENCE VOICE (operator 2026-10-22): the estate's
  // presence gate refuses with its own sentence — `lane presence:
  // family '<fam>' declares <slot> '<file>' but no store copy
  // exists (folders checked: …) — fetch it: <url>`. The family IS
  // the provision target (the DECL owns the fetch URL — this
  // anchor trusts the gate the way the needs-weight arm does, and
  // the carried URL stays server-side: names only, always).
  const lane = /lane presence: family '([^']+)' declares \S+ '([\w.-]+\.(?:safetensors|bin|pt|pth|ckpt|gguf))' but no store copy exists/.exec(error)
  if (lane !== null) return { kind: 'model', file: lane[2]!, target: lane[1]! }
  const target = /provision_model\s+model=([A-Za-z0-9_-]+)(?=\s|\)|;|,|$)/i.exec(error)?.[1]
  const weight = /needs weight '([^']+)'/i.exec(error)
  if (weight !== null && /absent on the models tree/i.test(error)) {
    return {
      kind: 'model',
      file: weight[1]!,
      ...(target === undefined ? {} : { target }),
    }
  }
  const file = /([\w.-]+\.(?:safetensors|bin|pt|pth|ckpt|gguf))/.exec(error)
  // THE PROVISION-BEARING FENCE (client-plane RISK-2, 2026-10-20):
  // this fallback once fired on ANY text pairing a weight-looking
  // filename with a not-found word — an output-write failure
  // ("output x.safetensors not found after run") or a lane cure
  // naming a file promised an acquire the DECL never owned (the
  // links-in-code law: rescue offers only DECL-owned provision
  // targets). The arm now requires the text itself to carry a
  // provision bearing: a parsed `provision_model` target, or the
  // needs-weight sentence naming the SAME file (the door's own
  // voice, which the weight arm above already trusts).
  const provisionBorne = target !== undefined
    || new RegExp("needs weight '" + (file?.[1] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'", 'i').test(error)
  if (file !== null && provisionBorne
    && /not found|does not exist|no such file|missing|absent on the models tree|404/i.test(error)) {
    return {
      kind: 'model',
      file: file[1]!,
      ...(target === undefined ? {} : { target }),
    }
  }
  return null
}

/** THE STRUCTURED LANE MISS (operator 2026-10-22): the runs door's
 *  lane_input_missing details row, read into the popup's Rescue —
 *  the exact key at the press site, no prose parsing. Null when the
 *  record is not that row (the prose anchor in parseRescue still
 *  covers the row-derived face). */
export function rescueOfLaneDetails(details: Record<string, unknown> | undefined): Rescue | null {
  if (details === undefined) return null
  const family = details['family']
  const slot = details['slot']
  const missing = details['missing']
  if (typeof family !== 'string' || family === ''
    || typeof slot !== 'string' || slot === ''
    || typeof missing !== 'string' || missing === ''
    || details['kind'] !== 'model') return null
  return { kind: 'model', file: missing, target: family }
}

export interface RescueResult {
  detail: string
  restartRequired: boolean
}

/** THE F9 ACQUIRE-WEIGHT READ (the tracker's poll): one live
 *  snapshot of the backend's byte ledger — real landed bytes over
 *  the DECL total, never an animation. */
export interface WeightAcquireState {
  operationId: string
  state: string
  bytes: number
  total: number
  detail?: string
}

/** Terminal acquire_weight states (the tracker stops polling). */
export const ACQUIRE_TERMINAL: ReadonlySet<string> = new Set([
  'active', 'installed', 'restart_required', 'failed', 'blocked',
])

function weightStateOf(reply: { data?: unknown, detail?: string }): WeightAcquireState {
  const data = typeof reply.data === 'object' && reply.data !== null && !Array.isArray(reply.data)
    ? reply.data as Record<string, unknown>
    : {}
  const operationId = typeof data['operation_id'] === 'string'
    ? data['operation_id'] as string
    : typeof data['operationId'] === 'string' ? data['operationId'] as string : ''
  if (operationId === '') throw new Error('acquire_weight answered without an operation_id')
  return {
    operationId,
    state: typeof data['state'] === 'string' ? data['state'] as string : 'acquiring',
    bytes: typeof data['bytes'] === 'number' ? data['bytes'] as number : 0,
    total: typeof data['total'] === 'number' ? data['total'] as number : 0,
    ...(typeof reply.detail === 'string' && reply.detail !== '' ? { detail: reply.detail as string } : {}),
  }
}

/** Start the weight fetch through the ONE acquisition door (the
 *  same door the agent's comfy_manage acquire_weight seat rides —
 *  one door, two callers). Names only: the model/card id plus the
 *  missing file for DISPLAY (the DECL owns the fetch source).
 *  Returns the operation id at once with the opening bytes/total —
 *  the caller polls acquireWeightPoll for the live count. */
/** ONE acquire seat for this module (the door + the optional
 *  teardown signal): a present signal rides as postManageAction's
 *  third arg; an absent one keeps the two-arg seam the specs pin. */
async function acquireAction(payload: Record<string, ManageJsonValue>, signal?: AbortSignal) {
  return signal === undefined
    ? postManageAction('acquire_weight', payload)
    : postManageAction('acquire_weight', payload, signal)
}

export async function acquireWeightStart(target: string, file?: string, signal?: AbortSignal): Promise<WeightAcquireState> {
  const reply = await acquireAction({
    model: target,
    ...(file === undefined || file === '' ? {} : { file }),
  }, signal)
  if (!reply.ok) throw new Error(reply.detail ?? 'manage refused')
  return weightStateOf(reply)
}

/** Poll one weight fetch (the tracker's read): the SAME action with
 *  ONLY the operation id — no model, no second fetch. */
export async function acquireWeightPoll(operationId: string, signal?: AbortSignal): Promise<WeightAcquireState> {
  const reply = await acquireAction({ operation_id: operationId }, signal)
  if (!reply.ok) throw new Error(reply.detail ?? 'manage refused')
  return weightStateOf(reply)
}

/** Offer one rescue through the manage seat. Names only — the
 * server owns every URL (the declaration law above). The target
 * is the model family OR the card id (model-less tool cards carry
 * their own provision rows under the card id — the acquire_weight
 * door resolves both, as provision_model did before it). The model
 * arm rides acquire_weight (ONE door with the popup tracker and the
 * agent seat); the extension arm keeps install_extension. Resolves
 * with the reply's detail line, refuses with its own name. */
export async function runRescueCall(rescue: Rescue, target: string, signal?: AbortSignal): Promise<RescueResult> {
  const provisionTarget = rescue.kind === 'model' && rescue.target !== undefined && rescue.target !== ''
    ? rescue.target
    : target
  if (rescue.kind === 'extension') {
    const reply = await postManageAction('install_extension', { nodes: [rescue.pack] })
    if (!reply.ok) throw new Error(reply.detail ?? 'manage refused')
    const data = typeof reply.data === 'object' && reply.data !== null && !Array.isArray(reply.data)
      ? reply.data as Record<string, unknown>
      : null
    const state = data !== null && typeof data['state'] === 'string' ? data['state'] : ''
    return {
      detail: reply.detail ?? rescue.pack + ' installed',
      restartRequired: (data !== null && data['restart_required'] === true) || state === 'restart_required',
    }
  }
  // THE MODEL ARM (F9 one-door law): start the fetch, then poll the
  // SAME door to the terminal state — the popup tracker polls the
  // same snapshots this loop awaits.
  // THE SIGNAL RIDES THE WHOLE LOOP (audit L-ERROR-3, 2026-10-22):
  // an aborted caller stops paying manage calls — the start, every
  // poll, and each sleep carry it, so a closed caller tears down.
  const first = await acquireWeightStart(provisionTarget, rescue.file, signal)
  let current = first
  for (let attempt = 0; !ACQUIRE_TERMINAL.has(current.state) && attempt < 150; attempt += 1) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 200)
      signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
    })
    if (signal?.aborted === true) throw signal.reason ?? new Error('aborted')
    current = await acquireWeightPoll(current.operationId, signal)
  }
  const restartRequired = current.state === 'restart_required' || current.state === 'installed'
  if (current.state === 'failed' || current.state === 'blocked') {
    throw new Error(current.detail ?? 'weight acquisition ' + current.state)
  }
  return {
    detail: current.detail ?? provisionTarget + ' acquired (' + String(current.bytes) + '/' + String(current.total) + ' bytes)',
    restartRequired,
  }
}

export function terminalStageErrorOf(stages: ReadonlyArray<{ runStatus?: unknown, result?: unknown }>): string | null {
  for (const stage of stages) {
    // the owner's failed judgement (was a raw 'failed' compare — an
    // 'error'-worded row's refusal text never reached the rescue pane).
    // The view-side read: this is a persisted draft word no door
    // validated (the card plane writes 'unreachable') — an unreadable
    // row is not failed, and the pane must not die on the throw.
    if (statusOrPendingOf(typeof stage.runStatus === 'string' ? stage.runStatus : '') !== 'error') continue
    if (typeof stage.result !== 'object' || stage.result === null || Array.isArray(stage.result)) continue
    const error = Reflect.get(stage.result, 'error')
    if (typeof error === 'string' && error !== '') return error
  }
  return null
}

/** THE RUN FACE'S TERMINAL VOICE (the runface-error cure,
 *  2026-10-12): the run wire carries stage errors on a DIFFERENT
 *  shape than drafts — `RunStageStatus { status, error }` (the
 *  status door serves the failure text verbatim on the row; the
 *  run-level `error` is the observer's fallback when no single
 *  stage owns the reason) — so terminalStageErrorOf's
 *  `{ runStatus, result.error }` read folds every run stage to
 *  not-failed and the run face voiced nothing. Same law, run
 *  shape: the first error-folded stage's verbatim error wins, the
 *  run-level text is the fallback (terminalOutcomeOf's own
 *  stage-first order in cards-resource.ts). The view-side read is
 *  the same: an unreadable status word is not failed, and an
 *  empty/non-string error is no voice. */
export function terminalRunStageErrorOf(
  stages: ReadonlyArray<{ status?: unknown, error?: unknown }>,
  runError?: unknown,
): string | null {
  for (const stage of stages) {
    if (statusOrPendingOf(typeof stage.status === 'string' ? stage.status : '') !== 'error') continue
    if (typeof stage.error === 'string' && stage.error !== '') return stage.error
  }
  if (typeof runError === 'string' && runError !== '') return runError
  return null
}

/** The first family id on a bench/draft's stage params (the model
 * the run shot — the rescue's provision target). Null when no
 * stage names one (the card-id fallback below gets its turn). */
export function familyOfStages(stages: Array<{ params?: Record<string, unknown> }>): string | null {
  for (const s of stages) {
    const m = s.params?.['model']
    if (typeof m === 'string' && m !== '') return m
  }
  return null
}

/** THE CARD-ID FALLBACK (the mask SAM2 law, 2026-09-19):
 * model-less tool cards name no family — the stage's own card id
 * is the provision target (the manage door resolves card-owned
 * DECL rows under it). Null when no stage names a card. */
export function cardOfStages(stages: Array<{ card?: string }>): string | null {
  for (const s of stages) {
    if (typeof s.card === 'string' && s.card !== '') return s.card
  }
  return null
}
