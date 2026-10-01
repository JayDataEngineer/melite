/**
 * estate-harness.ts — the ONE fake for every card-view wall (stroke
 * 81's one-lane law): bindEstateRemote fakes over the four mounted
 * namespaces, recorded like the old fetch router recorded envelope
 * frames ({method, args}) so call-order and arg-shape walls survive
 * verbatim. NO fetch stub may answer an estate verb — the /v1
 * discovery doors (form-spec, model-catalog) are the only fetches a
 * spec stubs from now on.
 *
 * The semantic laws the fakes keep (each mirrors the estate's own
 * server seat, 2026-09-13 incident):
 *  - drafts/patch APPLIES into the served draft — the next
 *    drafts/get sees what the patch wrote (params, runStatus,
 *    result);
 *  - bench/add-stage APPENDS a fresh row and bench/remove-stage
 *    REMOVES it — the post-add bench/get diff finds the fresh id
 *    (the open-on-add law);
 *  - runs/status serves the queued runDocs in order, last one
 *    lingers (poll loops terminate); without runDocs it serves a
 *    live row that runs/stop flips to stopped;
 *  - patchFailures serve as OK-arm values carrying `reason` (the
 *    client's CAS matcher reads that text — the real door's
 *    cas-conflict voice);
 *  - refusals serve REAL RemoteError failures on the error branch
 *    (runs/start compose refusals land verbatim through
 *    EstateRefusedError — never a paraphrase); wired on EVERY verb
 *    (throw queue first, then refusal — transport before domain);
 *    `onCall` scripts the Nth call to a verb (success-then-refusal
 *    sequences on one door);
 *  - throws serve TRANSPORT failures (the promise itself rejects —
 *    the wire is down, not the domain refusing): every verb honors
 *    the throw queue before the refusal queue, so the policy's
 *    rethrow arms (the gone-verdict, the file-era fallback) pin
 *    against the real shape; `value` entries throw the VALUE
 *    verbatim (foreign throws — strings, numbers — for the client's
 *    non-Error fallback voices); `onCall` scripts the Nth call;
 *  - listRows serve the runs/list tail (the completed runs' SSOT —
 *    the gone-verdict's file-era arm and the newest-run bridge
 *    read here);
 *  - startDocs serve the runs/start answers in order (the missing
 *    run_id refusal arm); unset, the start mints run-1 queued;
 *  - draftIntent serves the draft's intent; draftBench serves the
 *    drafts/get bench block verbatim (garbage included) while
 *    draftOmitBench omits it (the missing-bench reader arm);
 *    addStageRevs script bench/add-stage revs in order (the managed
 *    bench agrees after each).
 */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteErrorCode, RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base/client'
// The generated namespace row types (type-only — the fakes serve
// intentionally-partial rows against them, cast at each verb below).
import type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchReorderRow,
  BenchRewireRow,
  BenchClearRow,
  BenchStageRow,
  BenchUndoRow,
  DraftGetRow,
  DraftPatchRow,
} from '@melite/estate-drafts/types'
import type { RunRow } from '@melite/estate-runs'
import type { MediaListRow } from '@melite/estate-media'

export interface EstateCall {
  method: string
  args: Record<string, unknown>
}

export interface EstateRefusal {
  method: string
  message: string
  /** The door's refusal CODE (the RemoteResult error branch's own
   *  discriminator; policy code matches codes, never message
   *  text). Unset = gateway/bad-request (an unnamed refusal). */
  code?: string
  /** 1-based call index this refusal fires on (the Nth call to the
   *  method). Unset = the FIRST matching call (legacy shape) — set
   *  it to script success-then-refusal sequences on one verb. */
  onCall?: number
}

export interface EstateThrow {
  method: string
  /** The transport-failure message (an Error throw). Optional when
   *  `value` is set (a foreign throw). */
  message?: string
  /** FOREIGN THROW ARM: throw this VALUE verbatim (a string, a
   *  number — never wrapped in Error) so the client's
   *  non-Error-throw fallback voices stay pinnable. */
  value?: unknown
  /** 1-based call index (same law as EstateRefusal.onCall). */
  onCall?: number
}

export interface EstateFakesOptions {
  benchDoc?: Record<string, unknown>
  draftStages?: Array<Record<string, unknown>>
  draftBenchRev?: number
  /** The drafts/get doc's `intent`, served verbatim (default ''). */
  draftIntent?: string
  /** The drafts/get bench block served VERBATIM (a garbage shape is
   *  the estate misbehaving — the wall must see it). */
  draftBench?: unknown
  /** OMIT the drafts/get bench block entirely (the missing-bench
   *  reader arm — a doc the estate never stamped). */
  draftOmitBench?: boolean
  /** Scripted revs for bench/add-stage answers, served in order
   *  (each also becomes the managed bench rev — the next bench/get
   *  agrees). Unset = the answer carries no rev (the live minimum
   *  the client tolerates). */
  addStageRevs?: number[]
  runDocs?: Array<Record<string, unknown>>
  patchFailures?: Array<Record<string, unknown>>
  /** Revs the drafts/patch ok arms ANSWER, in call order (the real
   *  door names the rev each landing write produced — THE
   *  CONFIRMED-WRITE LAW's currency; the fake's omission hid the
   *  CAS-storm shape the write-seat audit found). */
  patchAnswerRevs?: Array<number>
  /** Fires SYNCHRONOUSLY at drafts/patch CALL time — while the
   *  caller still awaits the answer. The mid-force pins schedule a
   *  write inside it: "a keystroke registered DURING the force's
   *  await" (draft.ts's flush-loop law), a state no post-hoc await
   *  can reconstruct. */
  onPatchCall?: (stageId: string, patch: Record<string, unknown>) => void
  /** Holds every drafts/patch answer OPEN until the promise resolves
   *  (awaited BEFORE the scripted answer is served). The send-chain
   *  pins use it to hold a write in flight at a chosen instant — a
   *  natural trailing timer firing MID-FORCE, the exact race the
   *  chain exists to serialize. */
  patchGate?: () => Promise<void>
  refusals?: EstateRefusal[]
  throws?: EstateThrow[]
  listRows?: Array<Record<string, unknown>>
  startDocs?: Array<Record<string, unknown>>
  mediaItems?: Array<Record<string, unknown>>
  /** Scripted manage/act answers, served per call in doc order (the
   *  envelope row the seat resolves; unset = {ok:true, detail:
   *  'queued'} — the download-prompt arm's default truth). */
  manageDocs?: Array<Record<string, unknown>>
}

export interface EstateFakes {
  calls: EstateCall[]
  setRunStatus: (status: string) => void
  /** Move the served drafts/get doc between polls (the draft-tail pins). */
  setDraftDoc: (doc: { rev?: number; stages?: Array<Record<string, unknown>> }) => void
  unmount: () => void
}

const ok = <T,>(value: T): { ok: true; value: T } => ({ ok: true, value })

export function mountEstateFakes(opts: EstateFakesOptions = {}): EstateFakes {
  const calls: EstateCall[] = []
  const liveParams: Record<string, unknown> = { prompt: '', steps: 8, turbo: false }
  const benchSource = opts.benchDoc ?? { session: 's1', rev: 7, log: [] }
  // THE RELOAD-CONSISTENCY LAW: BenchView owns a live copy and
  // re-reads bench/get after its own edits (touchBench → reload with
  // keepOpen: the drill STAYS OPEN only if the fresh bench still
  // carries the row). A default bench with NO stages would wipe the
  // tiles and close the drill on the first touch — the reloaded bench
  // must agree with the served draft (the same s_0 the drafts door
  // serves), the way the real estate's two doors agree.
  const benchStages: Array<Record<string, unknown>> = Array.isArray(benchSource['stages'])
    ? (benchSource['stages'] as Array<Record<string, unknown>>)
    : [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { ...liveParams } }]
  // MALFORMED-DOC FIDELITY (see bench/get below): an explicitly
  // provided benchDoc serves VERBATIM for non-managed shapes.
  let benchRevValue = typeof benchSource['rev'] === 'number' ? (benchSource['rev'] as number) : 7
  let freshSeq = 0
  const runDocs = [...(opts.runDocs ?? [])]
  const liveRun: Record<string, unknown> = { run_id: 'run-1', status: 'queued', draft_id: 'bench-s1', stages: [] }
  const draftStages = opts.draftStages ?? [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: liveParams }]
  // THE DRAFT TAIL'S MUTABLE DOC (HOLE 1's pins): setDraftDoc moves
  // the served rev/stages between polls — a foreign-landed
  // generation landing through another hand mid-watch.
  let liveDraftRev: number | undefined
  let liveDraftStages: Array<Record<string, unknown>> | undefined
  const refusalQueue = [...(opts.refusals ?? [])]
  const throwQueue = [...(opts.throws ?? [])]
  const listRows = [...(opts.listRows ?? [])]
  const startDocs = [...(opts.startDocs ?? [])]
  const addStageRevs = [...(opts.addStageRevs ?? [])]
  const defaultOk = { ok: true }
  // Per-method call counters (the onCall scripting clock): the Nth
  // call to a method sees counter N. Bumped BEFORE queue matching so
  // onCall:1 hits the first call, onCall:2 the second.
  const callCounts = new Map<string, number>()
  const tickCall = (method: string): number => {
    const next = (callCounts.get(method) ?? 0) + 1
    callCounts.set(method, next)
    return next
  }

  /** Transport failure first (the wire is down — the promise rejects,
   *  never an error branch): one-shot per queued entry. `value`
   *  entries throw the VALUE verbatim (the foreign-throw arm); `onCall`
   *  entries wait for their call index; an exact-index match always
   *  beats an any-call entry. */
  const takeThrow = (method: string): void => {
    const index = tickCall(method)
    let hit = throwQueue.findIndex((thrown) => thrown.method === method && thrown.onCall === index)
    if (hit === -1) hit = throwQueue.findIndex((thrown) => thrown.method === method && thrown.onCall === undefined)
    if (hit === -1) return
    const thrown = throwQueue.splice(hit, 1)[0]!
    if ('value' in thrown) throw thrown.value
    throw new Error(thrown.message ?? method + ' wire down')
  }

  /** Reads the CURRENT call index (no tick — takeThrow already
   *  advanced the clock for this verb call; every verb runs the
   *  throw queue before the refusal queue). */
  const takeRefusal = (method: string): { ok: false; error: RemoteFailure } | undefined => {
    const index = callCounts.get(method) ?? 1
    let hit = refusalQueue.findIndex((refusal) => refusal.method === method && refusal.onCall === index)
    if (hit === -1) hit = refusalQueue.findIndex((refusal) => refusal.method === method && refusal.onCall === undefined)
    if (hit === -1) return undefined
    const refusal = refusalQueue.splice(hit, 1)[0]!
    // The code rides the error branch the way the door's own throw
    // does (the protocol's structural law: cross-owner codes reach a
    // consumer's compilation unmerged, so the constructor takes the
    // widened key — remoteErrorOf does the same cast at the seam).
    return { ok: false, error: new RemoteError(refusal.code as RemoteErrorCode, refusal.message, {} as never) as RemoteFailure }
  }

  const applyDraftPatch = (stageId: string, patch: Record<string, unknown>): string[] => {
    const stage = draftStages.find((row) => row['id'] === stageId) ?? draftStages[0]
    if (stage === undefined) return []
    const patched: string[] = []
    const params = (patch as { params?: Record<string, unknown> }).params
    if (params !== undefined && typeof params === 'object' && params !== null && !Array.isArray(params)) {
      const current = stage['params']
      if (current !== undefined && typeof current === 'object' && current !== null && !Array.isArray(current)) {
        Object.assign(current as Record<string, unknown>, params)
      } else {
        stage['params'] = { ...params }
      }
      patched.push('params')
    }
    if (patch['runStatus'] !== undefined) {
      stage['runStatus'] = patch['runStatus']
      patched.push('runStatus')
    }
    if (patch['result'] !== undefined) {
      stage['result'] = patch['result']
      patched.push('result')
    }
    return patched
  }

  const benchDocVerb = async (method: string, sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => {
    void signal
    calls.push({ method, args: { sessionKey, doc } })
    takeThrow(method)
    const benchRefused = takeRefusal(method)
    if (benchRefused !== undefined) return benchRefused
    if (method === 'bench/add-stage') {
      freshSeq += 1
      const card = typeof doc['card'] === 'string' ? (doc['card'] as string) : 'card'
      const fresh: Record<string, unknown> = {
        id: 'fresh_' + String(freshSeq),
        card,
        title: typeof doc['title'] === 'string' ? doc['title'] : card,
        engine: typeof doc['engine'] === 'string' ? doc['engine'] : 'comfyui',
        params: typeof doc['params'] === 'object' && doc['params'] !== null && !Array.isArray(doc['params'])
          ? { ...(doc['params'] as Record<string, unknown>) }
          : {},
      }
      benchStages.push(fresh)
      benchRevValue += 1
      // SCRIPTED REVS (addStageRevs): the answer names the rev the
      // estate stamped (and the managed bench agrees from here on).
      const scriptedRev = addStageRevs.shift()
      if (scriptedRev !== undefined) benchRevValue = scriptedRev
      return ok(scriptedRev !== undefined ? { ...defaultOk, rev: scriptedRev, stage: fresh } : { ...defaultOk, stage: fresh })
    }
    // THE CLEAR ALL (2026-10-10): the fake mirrors the verb — every
    // stage out, one rev.
    if (method === 'bench/clear') {
      benchStages.length = 0
      benchRevValue += 1
      return ok({ ...defaultOk, ...doc, cleared: benchStages.length })
    }
    if (method === 'bench/remove-stage') {
      const stageId = doc['stage']
      const index = benchStages.findIndex((row) => row['id'] === stageId)
      if (index !== -1) benchStages.splice(index, 1)
      benchRevValue += 1
      return ok({ ...defaultOk, ...doc })
    }
    return ok({ ...defaultOk, ...doc })
  }

  bindEstateRemote({
    bench: {
      get: async (sessionKey: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'bench/get', args: { sessionKey } })
        takeThrow('bench/get')
        const benchGetRefused = takeRefusal('bench/get')
        if (benchGetRefused !== undefined) return benchGetRefused
        // MALFORMED-DOC FIDELITY: an explicitly provided benchDoc
        // serves VERBATIM for non-managed shapes (a garbage rev or
        // non-array stages is the estate misbehaving — the client's
        // readers must refuse, and the wall must see the garbage,
        // not a sanitized fake). The default bench (and well-formed
        // explicit docs) serve the MANAGED rows so add/remove side
        // effects stay visible.
        const servedStages: unknown = opts.benchDoc !== undefined && !Array.isArray(benchSource['stages'])
          ? benchSource['stages']
          : benchStages
        const servedRev: unknown = opts.benchDoc !== undefined && typeof benchSource['rev'] !== 'number'
          ? benchSource['rev']
          : benchRevValue
        // THE PARTIAL-ROW LAW: the served doc is intentionally partial
        // (malformed-doc fidelity above serves verbatim garbage, and
        // the default bench carries no draft_id/session/intent) — the
        // cast pins the served bytes against the wire row without
        // sanitizing what the misbehavior walls must see.
        return ok({ ...benchSource, rev: servedRev, stages: servedStages } as BenchGetRow)
      },
      // THE VERB-ROW CASTS (same law): each verb's answer is the
      // scripted minimum the walls pin (ok flags, revs, fresh rows —
      // never full wire rows), cast to its namespace row at the
      // property so the bind satisfies the generated client types.
      // Served bytes are unchanged: the client reads these answers
      // as open records (addStageWire returns Record<string, unknown>).
      ensure: (doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/ensure', '', doc, signal) as unknown as Promise<RemoteResult<BenchEnsureRow>>,
      patch: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/patch', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchPatchRow>>,
      rewire: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/rewire', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchRewireRow>>,
      undo: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/undo', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchUndoRow>>,
      'add-stage': (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/add-stage', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchStageRow>>,
      'remove-stage': (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/remove-stage', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchStageRow>>,
      clear: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/clear', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchClearRow>>,
      reorder: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/reorder', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchReorderRow>>,
      group: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/group', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchStageRow>>,
      ungroup: (sessionKey: string, doc: Record<string, unknown>, signal?: AbortSignal) => benchDocVerb('bench/ungroup', sessionKey, doc, signal) as unknown as Promise<RemoteResult<BenchStageRow>>,
      subscribe: () => { throw new Error('estate-harness: bench/subscribe not faked') },
    },
    drafts: {
      get: async (draftId: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'drafts/get', args: { draftId } })
        takeThrow('drafts/get')
        const draftGetRefused = takeRefusal('drafts/get')
        if (draftGetRefused !== undefined) return draftGetRefused
        // MALFORMED-DOC FIDELITY (same law as bench/get): explicitly
        // provided non-array stages serve verbatim.
        const servedStages: unknown = opts.draftStages !== undefined && !Array.isArray(opts.draftStages)
          ? opts.draftStages
          : draftStages
        // The bench block: draftBench serves VERBATIM, draftOmitBench
        // omits the key entirely (the missing-bench reader arm), else
        // the managed default.
        const servedBench: Record<string, unknown> = opts.draftBench !== undefined
          ? { bench: opts.draftBench }
          : opts.draftOmitBench === true ? {} : { bench: { rev: opts.draftBenchRev ?? 7, log: [] } }
        // THE PARTIAL-ROW LAW (same law as bench/get): explicitly
        // served garbage stages ride verbatim — the cast pins the
        // served bytes against the wire row without sanitizing them.
        return ok({
          draft_id: 'bench-s1',
          rev: liveDraftRev ?? 7,
          intent: opts.draftIntent ?? '',
          ...servedBench,
          stages: liveDraftStages ?? servedStages,
        } as DraftGetRow)
      },
      patch: async (draftId: string, stageId: string, patch: Record<string, unknown>, expectRev: number | null, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'drafts/patch', args: { draftId, stageId, patch, expectRev } })
        opts.onPatchCall?.(stageId, patch)
        if (opts.patchGate !== undefined) await opts.patchGate()
        takeThrow('drafts/patch')
        const patchRefused = takeRefusal('drafts/patch')
        if (patchRefused !== undefined) return patchRefused
        if (opts.patchFailures !== undefined && opts.patchFailures.length > 0) {
          // Scripted failure arms carry reason-only envelopes (never
          // full rows) — the cast pins them against the wire row.
          return ok(opts.patchFailures.shift()! as unknown as DraftPatchRow)
        }
        const answeredRev = opts.patchAnswerRevs !== undefined && opts.patchAnswerRevs.length > 0
          ? opts.patchAnswerRevs.shift()!
          : undefined
        return ok({
          draftId: 'bench-s1', stageId, delivered: true,
          ...(answeredRev !== undefined ? { rev: answeredRev } : {}),
          patched: applyDraftPatch(stageId, patch),
        })
      },
      // THE INDEX DOOR (drafts/list rides the same namespace — the
      // bind requires it; no wall scripts it, so it serves the empty
      // index, recorded like every other call).
      list: async (signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'drafts/list', args: {} })
        takeThrow('drafts/list')
        return takeRefusal('drafts/list') ?? ok({ count: 0, drafts: [] })
      },
    },
    runs: {
      start: async (doc: Record<string, unknown>, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'runs/start', args: { doc } })
        takeThrow('runs/start')
        // Scripted start docs are test-authored verbatim rows — the
        // cast pins them against the wire row (same partial-row law).
        if (startDocs.length > 0) return ok(startDocs.shift()! as { run_id: string; status: string; queue_position: number })
        return takeRefusal('runs/start') ?? ok({ run_id: 'run-1', status: 'queued', queue_position: 0 })
      },
      status: async (runId: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'runs/status', args: { runId } })
        takeThrow('runs/status')
        const refused = takeRefusal('runs/status')
        if (refused !== undefined) return refused
        // Scripted run docs serve verbatim (the lingers-last law) —
        // pinned against the wire row, bytes unchanged.
        if (runDocs.length > 1) return ok(runDocs.shift()! as RunRow)
        if (runDocs.length === 1) return ok(runDocs[0]! as RunRow)
        return ok({ ...liveRun } as RunRow)
      },
      stop: async (runId: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'runs/stop', args: { runId } })
        takeThrow('runs/stop')
        const refused = takeRefusal('runs/stop')
        if (refused !== undefined) return refused
        if (runDocs.length === 0) liveRun['status'] = 'stopped'
        return ok({ run_id: runId, status: 'stopped' })
      },
      list: async (rawLimit: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'runs/list', args: { rawLimit } })
        takeThrow('runs/list')
        const listRefused = takeRefusal('runs/list')
        if (listRefused !== undefined) return listRefused
        // Scripted list rows are test-authored verbatim rows (same law).
        return ok({ count: listRows.length, runs: listRows as RunRow[] })
      },
      validate: async (doc: Record<string, unknown>, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'runs/validate', args: { doc } })
        takeThrow('runs/validate')
        return takeRefusal('runs/validate') ?? ok({})
      },
    },
    media: {
      list: async (kind: string, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'media/list', args: { kind } })
        takeThrow('media/list')
        const mediaRefused = takeRefusal('media/list')
        if (mediaRefused !== undefined) return mediaRefused
        const items = opts.mediaItems ?? []
        // Scripted media rows are test-authored verbatim rows (same law).
        return ok({ count: items.length, items: items as unknown as MediaListRow[] })
      },
    },
    // The manage lane (the download-prompt verbs' door): the fifth
    // namespace, bound like the other four — every call records
    // {method:'manage/act', args:{doc}} so call-order and doc-shape
    // walls read one stream.
    manage: {
      act: async (doc: { action: string }, signal?: AbortSignal) => {
        void signal
        calls.push({ method: 'manage/act', args: { doc } })
        const scripted = opts.manageDocs?.shift?.() ?? {}
        return ok({ action: doc.action, ok: true, detail: 'queued', ...scripted })
      },
    },
  })

  return {
    calls,
    setRunStatus: (status: string) => { liveRun['status'] = status },
    setDraftDoc: (doc: { rev?: number; stages?: Array<Record<string, unknown>> }) => {
      if (doc.rev !== undefined) liveDraftRev = doc.rev
      if (doc.stages !== undefined) liveDraftStages = doc.stages
    },
    unmount: () => { unbindEstateRemote() },
  }
}
