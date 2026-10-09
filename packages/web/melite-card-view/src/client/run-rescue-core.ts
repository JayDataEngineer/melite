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
 * ("card 'x' requires 'PACK' …"); a model miss names a weight file
 * in a not-found context. Anything else is not ours to fix — null
 * (never a wrong install). */
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
  if (file !== null && /not found|does not exist|no such file|missing|absent on the models tree|404/i.test(error)) {
    return {
      kind: 'model',
      file: file[1]!,
      ...(target === undefined ? {} : { target }),
    }
  }
  return null
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
export async function acquireWeightStart(target: string, file?: string): Promise<WeightAcquireState> {
  const reply = await postManageAction('acquire_weight', {
    model: target,
    ...(file === undefined || file === '' ? {} : { file }),
  })
  if (!reply.ok) throw new Error(reply.detail ?? 'manage refused')
  return weightStateOf(reply)
}

/** Poll one weight fetch (the tracker's read): the SAME action with
 *  ONLY the operation id — no model, no second fetch. */
export async function acquireWeightPoll(operationId: string): Promise<WeightAcquireState> {
  const reply = await postManageAction('acquire_weight', { operation_id: operationId })
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
export async function runRescueCall(rescue: Rescue, target: string): Promise<RescueResult> {
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
  const first = await acquireWeightStart(provisionTarget, rescue.file)
  let current = first
  for (let attempt = 0; !ACQUIRE_TERMINAL.has(current.state) && attempt < 150; attempt += 1) {
    await new Promise((resolve) => { setTimeout(resolve, 200) })
    current = await acquireWeightPoll(current.operationId)
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
