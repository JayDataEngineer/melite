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
import { LIVE_ACQUIRE_STATES as SERVER_LIVE_ACQUIRE_STATES, PROVISION_STATES } from '@melite/estate-provisioning/contracts'
import type { AcquirePhase } from '@melite/estate-provisioning/contracts'

/** What a failed run can offer to fix. `extension` names a pack id
 * (from the missing-extension refusal's own text); `model` names a
 * missing model FILE (from the engine's error) — the family rides
 * separately (the stage params own it; the DECL owns the file).
 * `runtime` names a missing ENGINE TOOL RUNTIME (E2-2: the venv the
 * engine's own node needs, e.g. anny-estimator) with the engine's
 * own provision command — the estate owns no runtime-provision
 * door, so the command IS the offer (never a fake install). */
export type Rescue =
  | { kind: 'extension', pack: string }
  | { kind: 'model', file: string, target?: string }
  | { kind: 'runtime', runtime: string, command: string, env?: string }

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
  // THE RUNTIME-MISS VOICE (E2-2, operator 2026-10-20 — when the
  // model is missing, a download prompt appears, never the raw
  // engine's noise): the engine's own sentence names the missing
  // tool runtime AND its provision command — `<name> runtime not
  // found at <path>. Provision it: <cmd>` — so the estate faces
  // the provision instead of the raw ComfyError. The anchor is the
  // engine's own "Provision it:" sentence (the anchored-pack
  // precedent): a bare "runtime not found" without it parses to
  // nothing — never a wrong install. The command runs where the
  // ENGINE lives (the estate owns no runtime-provision door); the
  // env override rides when the engine names one.
  const runtimeMiss = /([A-Za-z0-9_-]+) runtime not found at \S+/.exec(error)
  if (runtimeMiss !== null) {
    const provision = /Provision it:\s*([\s\S]+?)(?:\.\s+(?:Missing:|Or point)|$)/.exec(error)
    // without the engine's own Provision sentence the text falls
    // through to the generic arms below (which will almost surely
    // refuse it) — the anchor claims, never steals.
    if (provision !== null) {
      const env = /Or point ([A-Z][A-Z0-9_]*) at an existing runtime/.exec(error)?.[1]
      return {
        kind: 'runtime',
        runtime: runtimeMiss[1]!,
        command: provision[1]!.trim(),
        ...(env === undefined ? {} : { env }),
      }
    }
  }
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
  /** THE LEDGER'S LIVE PHASE (audit F2): the flow moving under the
   *  byte count — stream, queue, verify, recheck. The server's
   *  AcquirePhase rides the poll envelope; the face's only liveness
   *  window is a frozen count with a live phase. */
  phase?: AcquirePhase
}

/** THE LIVE ACQUIRE STATES — the SERVER's own set, not a client
 *  copy (audit F6b: the popup carried its own LIVE list beside the
 *  service's, and the two spellings drifted — the overshoot dropped
 *  'active' and every landed acquire rode the ceiling into the stuck
 *  face at 100%). One spelling, one home: the service's contracts.
 *  A poll in one of these states is a flight still moving under the
 *  engine's own stall watchdog — the client keeps polling, never
 *  invents a verdict from its own clock. */
export const LIVE_ACQUIRE_STATES: ReadonlySet<string> = new Set<string>([
  ...SERVER_LIVE_ACQUIRE_STATES,
])

/** Terminal acquire_weight states — DERIVED, never listed (audit
 *  F6b): every provision state except the unknowns (unknown/absent)
 *  and the live flights. The k2/m and F6b burns meet here: a
 *  verdict state (failed/blocked) settles at any byte count — the
 *  engine judged; a landed state (installed/restart_required/
 *  active) settles ONLY at the engine's own total (a landed word at
 *  partial bytes is live flight, the k2/m false-ready), judged by
 *  isAcquireSettled below. A total of 0 (a DECL with no declared
 *  size) settles on the landed word (acquiredDetailOf voices it,
 *  never the dead "0/0"). */
export const ACQUIRE_TERMINAL: ReadonlySet<string> = new Set<string>(
  PROVISION_STATES.filter((state) =>
    state !== 'unknown' && state !== 'absent' && !SERVER_LIVE_ACQUIRE_STATES.has(state)),
)

/** THE COMPLETION PREDICATE (one spelling, both seats — the k2/m and
 *  F6b burns reconciled): a verdict state (failed/blocked) is
 *  settled at any byte count — the engine judged. A landed state
 *  (installed/restart_required/active) settles ONLY when the bytes
 *  reach the engine's own total; a landed word at partial bytes is
 *  live flight (the k2/m false-ready: 'active' at 39%), and the
 *  tracker keeps polling. A total of 0 (a DECL with no declared
 *  size) settles on the landed word — the undeclared-total success
 *  face (acquiredDetailOf voices it; never the dead "0/0"). */
export function isAcquireSettled(row: WeightAcquireState): boolean {
  if (row.state === 'failed' || row.state === 'blocked') return true
  if (!ACQUIRE_TERMINAL.has(row.state)) return false
  return !(row.total > 0) || row.bytes >= row.total
}

/** THE HUMAN BYTE VOICE (operator 2026-10-20: "THE TRACKING OF
 *  BYTES ALONE IS INEXCUSABLE" — the popup showed
 *  "5196173399/7343591088 bytes (71%)", a wall of digits no
 *  operator can read at a glance). Binary-base sizes with one
 *  decimal: 7343591088 → "6.8 GB", 5196173399 → "4.8 GB".
 *  Non-finite or negative input voices "0 B" (never NaN on the
 *  face). */
export function formatByteSize(bytes: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return String(Math.floor(bytes)) + ' B'
  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return value.toFixed(1) + ' ' + units[unit]
}

/** THE HUMAN PROGRESS LINE (the same burn): "4.8/6.8 GB (71%)"
 *  — human sizes over the DECL total with the percent the bar
 *  already carries. A total=0 row has no line (the purge P5
 *  undeclared face owns it) — empty string, never "0/0". */
export function formatWeightProgress(bytes: number, total: number): string {
  if (!(total > 0)) return ''
  const pct = Math.min(100, Math.round((bytes / total) * 100))
  return formatByteSize(bytes) + '/' + formatByteSize(total) + ' (' + String(pct) + '%)'
}

/** THE HUMAN RATE LINE (the same burn's second sentence — no
 *  rate, no ETA): "247.6 MB/s · ~8 s left". Null ETA (unknown
 *  total, stalled flight) voices the rate alone; a zero rate
 *  voices "stalled", never "0.0 B/s" dressed as motion. */
export function formatRateLine(bytesPerSec: number, etaSec: number | null): string {
  if (!(bytesPerSec > 0)) return 'stalled — no bytes landing'
  const rate = formatByteSize(bytesPerSec) + '/s'
  if (etaSec === null || !Number.isFinite(etaSec) || etaSec < 0) return rate
  if (etaSec < 90) return rate + ' · ~' + String(Math.max(1, Math.round(etaSec))) + ' s left'
  const mins = Math.round(etaSec / 60)
  if (mins < 90) return rate + ' · ~' + String(mins) + ' min left'
  return rate + ' · ~' + String(Math.round(mins / 60)) + ' h left'
}

function weightStateOf(reply: { data?: unknown, detail?: string }): WeightAcquireState {
  const data = typeof reply.data === 'object' && reply.data !== null && !Array.isArray(reply.data)
    ? reply.data as Record<string, unknown>
    : {}
  const operationId = typeof data['operation_id'] === 'string'
    ? data['operation_id'] as string
    : typeof data['operationId'] === 'string' ? data['operationId'] as string : ''
  if (operationId === '') throw new Error('acquire_weight answered without an operation_id')
  // THE CAUSE WINS (operator 2026-10-20: "FIND OUT WHY DOWNLOADS
  // RANDOMLY CRASH" — the popup voiced the generic top-level
  // "acquire_weight … bytes (failed)" while the engine's own cause
  // rode data.detail, dropped on the floor). The engine's per-row
  // cause leads; the generic poll message is the fallback.
  const cause = typeof data['detail'] === 'string' && data['detail'] !== ''
    ? data['detail'] as string
    : undefined
  return {
    operationId,
    state: typeof data['state'] === 'string' ? data['state'] as string : 'acquiring',
    bytes: typeof data['bytes'] === 'number' ? data['bytes'] as number : 0,
    total: typeof data['total'] === 'number' ? data['total'] as number : 0,
    // THE LIVE PHASE RIDES THROUGH (audit F2): the door's phase
    // word (stream/queue/verify/recheck) survives onto the snapshot
    // — a phaseless snapshot is the silent freeze the burn died on
    ...(typeof data['phase'] === 'string' && data['phase'] !== ''
      ? { phase: data['phase'] as AcquirePhase }
      : {}),
    ...(cause !== undefined
      ? { detail: cause }
      : (typeof reply.detail === 'string' && reply.detail !== '' ? { detail: reply.detail as string } : {})),
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

/** ONE STUCK LAW, ONE SPELLING, BOTH SEATS (audit F8, 2026-10-20:
 *  the popup's inline loop and the agent seat's runRescueCall each
 *  carried their own poll loop with their own cadence and ceiling —
 *  the same frozen operation was "stuck" in one seat and "in
 *  flight" in the other. This helper is the one law: poll while the
 *  ledger is LIVE (the engine's own watchdog owns stall truth — the
 *  client never invents a verdict from its own clock), stop at the
 *  first settled state, and give up after `ceiling` polls. Returns
 *  the LAST snapshot whether settled or not — the CALLER owns the
 *  face (the popup paints stuck/failed/done; the agent seat throws
 *  on a non-settled return). Throws the abort reason when the
 *  caller's signal fires mid-loop.
 *  @param first — the opening snapshot from acquireWeightStart (the
 *   loop never re-polls what it already has)
 *  @param options.pollMs — the poll cadence in ms
 *  @param options.ceiling — the max poll count past the opening
 *   snapshot (the stuck bound: cadence x ceiling is the seat's
 *   patience window)
 *  @param options.signal — the caller's teardown; aborts sleep,
 *   polls, and the loop itself
 *  @param options.onPoll — the per-snapshot hook (the popup's rate
 *   and ETA face) */
export async function pollAcquireToSettled(
  first: WeightAcquireState,
  options: { pollMs: number, ceiling: number, signal?: AbortSignal, onPoll?: (state: WeightAcquireState) => void },
): Promise<WeightAcquireState> {
  let current = first
  for (let attempt = 0; !isAcquireSettled(current) && attempt < options.ceiling; attempt += 1) {
    await abortableSleep(options.pollMs, options.signal)
    if (options.signal?.aborted === true) throw options.signal.reason ?? new Error('aborted')
    current = await acquireWeightPoll(current.operationId, options.signal)
    options.onPoll?.({ ...current })
  }
  return current
}

/** The sleep that dies with the caller's signal (the poll law's own
 *  tick): resolves normally on elapsed, throws the signal's reason
 *  when aborted mid-sleep. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason ?? new Error('aborted'))
    }, { once: true })
  })
}

/** THE ACQUIRED VOICE (one home for the success line): the landed
 *  byte count over the DECL total. A report with no declared total
 *  (a DECL row without size_bytes seeds 0) voices the undeclared
 *  size — never the dead "0/0 bytes" success (the purge P5's
 *  total=0 face). */
export function acquiredDetailOf(target: string, current: { bytes: number, total: number }): string {
  if (!(current.total > 0)) {
    return target + ' acquired — the engine reported no declared total (size unknown; verify the file on disk)'
  }
  return target + ' acquired (' + formatByteSize(current.bytes) + ' of ' + formatByteSize(current.total) + ')'
}

/** Offer one rescue through the manage seat. Names only — the
 * server owns every URL (the declaration law above). The target
 * is the model family OR the card id (model-less tool cards carry
 * their own provision rows under the card id — the acquire_weight
 * door resolves both, as provision_model did before it). The model
 * arm rides acquire_weight (ONE door with the popup tracker and the
 * agent seat); the extension arm keeps install_extension. Resolves
 * with the reply's detail line, refuses with its own name, and
 * refuses STUCK when the ceiling expires non-terminal (the stuck
 * burn, ERRORS k2/m). */
export async function runRescueCall(rescue: Rescue, target: string, signal?: AbortSignal): Promise<RescueResult> {
  // THE RUNTIME DOOR (E2-2 Piece B, 2026-10-20): the estate owns
  // provision_runtime now — the press carries the runtime NAME only
  // (the family scan is server-side; names only, always). The verb
  // links the engine tree to the repo's healthy seed instantly: no
  // poll, no restart — the face retires on ok and the re-run rides
  // the caller's own press.
  if (rescue.kind === 'runtime') {
    const reply = signal !== undefined
      ? await postManageAction('provision_runtime', { runtime: rescue.runtime }, signal)
      : await postManageAction('provision_runtime', { runtime: rescue.runtime })
    if (!reply.ok) throw new Error(reply.detail ?? 'manage refused')
    return { detail: reply.detail ?? rescue.runtime + ' provisioned', restartRequired: false }
  }
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
  // SAME door to the terminal state — ONE STUCK LAW with the popup
  // tracker (pollAcquireToSettled, audit F8): the same live-state
  // spelling, the same ceiling-is-stuck law, this seat's own
  // cadence. The signal rides the whole loop (audit L-ERROR-3,
  // 2026-10-22): an aborted caller stops paying manage calls.
  const first = await acquireWeightStart(provisionTarget, rescue.file, signal)
  const current = await pollAcquireToSettled(first, { pollMs: 200, ceiling: 150, signal })
  // THE CEILING IS A FAILURE (the stuck burn, ERRORS k2/m): a fetch
  // still non-terminal after the whole poll ceiling is a STUCK
  // operation — bytes frozen is stuck, never success. The throw
  // voices the last engine truth (state + bytes/total) so the face
  // can offer Retry/Delete on it.
  if (!isAcquireSettled(current)) {
    throw new Error('weight acquisition stuck — no longer progressing: the engine last reported state "' + current.state + '" at ' + formatWeightProgress(current.bytes, current.total) + ' across the full 150-poll ceiling; retry the fetch or delete the stuck operation')
  }
  const restartRequired = current.state === 'restart_required' || current.state === 'installed'
  if (current.state === 'failed' || current.state === 'blocked') {
    throw new Error(current.detail ?? 'weight acquisition ' + current.state)
  }
  return {
    detail: current.detail ?? acquiredDetailOf(provisionTarget, current),
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
