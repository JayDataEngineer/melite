/**
 * run-rescue.tsx — the run-gate rescue's face (roadmap item 4): the
 * rescue that renders where a failed run's error lands WHEN the miss
 * is rescueable — a missing extension pack or a missing model file.
 * THE LINKS-IN-CODE LAW: names only, the DECL owns every URL
 * server-side (run-rescue-core.ts's header).
 *
 * TWO FACES: an extension miss keeps the inline banner — the install
 * drive now mirrors the model face's seats (the parity cure, recon
 * 2026-11-11 round 22): a progress tracker over the SAME ledger the
 * weight popup polls, with Retry + Delete exits on a refused drive.
 * The install still rides install_extension (names only); a model
 * miss opens the WEIGHT POPUP —
 * the F9 run-press acquisition seat — with a Download button and a
 * live bytes/total tracker. The Download press rides acquire_weight
 * (ONE door with the agent's comfy_manage seat: one door, two
 * callers); the tracker polls the SAME action with the operation id.
 * The re-run rides the caller's own onRun (never an automatic
 * re-fire).
 *
 * THE HONESTY LAWS (the purge P5 rescue honesty, ERRORS k2/m):
 * completion is judged off engine truth — 'active' polls keep the
 * tracker on the door (never the ready face); bytes frozen across
 * polls, or a ceiling expiring non-terminal, land the STUCK face
 * (Retry + Delete/discard, a run press refused loudly); a report
 * with no declared total voices the undeclared size (no dead 0/0
 * meter). A dismissal of a failed/stuck popup outlives the mount
 * (the dismissal memory) — the tab's remounts never re-pop it.
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import { Button, IconCloseOutlineRegular, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { postManageAction } from '@melite/card-base/client'
import css from './card.module.css'
import { acquiredDetailOf, acquireWeightPoll, acquireWeightStart, cardOfStages, familyOfStages, formatByteSize, formatRateLine, formatWeightProgress, isAcquireSettled, parseRescue, pollAcquireToSettled, runRescueCall, type Rescue, type RescueResult, type WeightAcquireState } from './run-rescue-core.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { chromeCopy } from '../chromeCopy.ts'

function progressPercent(bytes: number, total: number): number {
  if (!(total > 0) || !(bytes >= 0)) return 0
  return Math.min(100, Math.round((bytes / total) * 100))
}

/** THE TRACKER FACES (the popup's download ledger): the HUMAN
 *  progress line ("4.8/6.8 GB (71%)" — never raw byte walls) plus
 *  the meter fill, rendered both mid-flight and on the done face —
 *  the terminal count stays visible, never unmounting at
 *  completion. A live flight additionally voices its rate + ETA on
 *  the weight-rate line (the operator's "TRACKING OF BYTES ALONE
 *  IS INEXCUSABLE" burn). Null when no fetch has started.
 *  THE UNDECLARED-TOTAL FACE (the purge P5): a report with no
 *  declared total (a DECL row without size seeds 0) renders no
 *  progress measure — no 0-of-0 meter dressed as 0%, no 0-valued
 *  maximum the engine never reported; the voice says the size is
 *  undeclared and the meter stays an unmeasured track (no role, no
 *  bounds) so the face keeps its place. The meter's aria bounds
 *  stay byte-exact (the machine truth); only the VISIBLE line is
 *  human.
 *  THE WAITING FACE (2026-10-21): a 'requested' row has no bytes to
 *  meter — this seat never opened the wire, the durable lane seat
 *  owes the fetch. The queued line names that seat; the
 *  undeclared-total voice would lie here (the size IS declared, the
 *  fetch has simply not started). */
function trackerFaces(acquire: WeightAcquireState | null, flow: { rateBps: number, etaSec: number | null } | null, hashing = false): Array<ReturnType<typeof h>> {
  if (acquire === null) return []
  if (acquire.state === 'requested') {
    return [h('p', { 'data-testid': 'weight-queued', className: css.rescueNote }, chromeCopy.weightQueued)]
  }
  const undeclared = !(acquire.total > 0)
  const pct = undeclared ? 0 : progressPercent(acquire.bytes, acquire.total)
  const progress = undeclared
    ? chromeCopy.undeclaredTotal({ bytes: formatByteSize(acquire.bytes), total: formatByteSize(acquire.total) })
    : formatWeightProgress(acquire.bytes, acquire.total)
  return [
    h('p', { 'data-testid': 'weight-progress', className: css.rescueNote }, progress),
    h('div', {
      ...(undeclared ? {} : {
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': acquire.total,
        'aria-valuenow': acquire.bytes,
      }),
      'data-testid': 'weight-meter',
      style: { height: '8px', borderRadius: '4px', background: 'rgba(127,127,127,.25)', overflow: 'hidden' },
    },
      h('span', {
        'data-testid': 'weight-meter-fill',
        style: {
          display: 'block', height: '100%',
          width: undeclared ? '100%' : String(pct) + '%',
          background: 'currentColor', ...(undeclared ? { opacity: 0.35 } : {}),
        },
      }),
    ),
    ...(flow !== null && !hashing ? [h('p', { 'data-testid': 'weight-rate', className: css.rescueNote },
      chromeCopy.weightRateLive({ status: formatRateLine(flow.rateBps, flow.etaSec) }),
    )] : []),
    ...(hashing ? [h('p', { 'data-testid': 'weight-phase', className: css.rescueNote },
      chromeCopy.weightVerifyLive,
    )] : []),
  ]
}

/** THE DISMISSAL MEMORY (the re-pop cure, ERRORS m): the popup's
 *  dismissal outlives the mount — the tab's error-strip retire/re-arm
 *  remounts this face with the same miss, and a mount-local flag
 *  re-popped the modal over and over with no new engine event. Keyed
 *  by the miss identity (the rescue's own file/target or pack). A
 *  dismissal is RECORDED only when the acquire ended failed or stuck
 *  — the re-pop burn; a live flight's close or a landed download's
 *  close stays mount-local (the miss is stale or the operator is
 *  mid-look). Cleared when the operator re-offers (the inline press)
 *  or starts a new fetch (the acquire state changed). */
const dismissedMisses = new Set<string>()

function dismissalKeyOf(rescue: Rescue): string {
  if (rescue.kind === 'model') {
    // THE WHOLE LIST IS THE IDENTITY (the reveal cure, 2026-11-09):
    // a dismissed two-file face and a dismissed single-file face of
    // the same lead weight are different misses — the key covers
    // every file the face offered.
    const files = [rescue.file, ...(rescue.more ?? []).map((f) => f.file)].join('+')
    return 'model:' + files + '@' + (rescue.target ?? '')
  }
  if (rescue.kind === 'runtime') return 'runtime:' + rescue.runtime
  return 'extension:' + rescue.pack
}

/** THE DOWNLOAD LIST (the reveal cure, 2026-11-09): every missing
 *  declared weight the face offers, lead first — the sequence the
 *  Download press fetches, one settled operation at a time. */
function weightFilesOf(rescue: Extract<Rescue, { kind: 'model' }>): Array<{ file: string, sizeBytes?: number }> {
  return [
    { file: rescue.file, ...(rescue.sizeBytes !== undefined ? { sizeBytes: rescue.sizeBytes } : {}) },
    ...(rescue.more ?? []).map((f) => ({ ...f })),
  ]
}

export function RunRescue({ error, stages, onRun, rescue: structured }: {
  error: string
  stages: Array<{ params?: Record<string, unknown>; card?: string }>
  /** the caller's own run press — offered again after a successful
   * install, never fired automatically */
  onRun: () => void
  /** the press site's structured rescue when the wire carried one
   * (the lane-miss details row — exact, no prose parsing; absent
   * for derived faces, which parse the pinned prose) */
  rescue?: Rescue
}): ReturnType<typeof h> | null {
  const rescue = structured ?? parseRescue(error)
  const dismissalKey = rescue === null ? '' : dismissalKeyOf(rescue)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<RescueResult | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [acquire, setAcquire] = useState<WeightAcquireState | null>(null)
  // THE FLOW TELEMETRY (operator 2026-10-20: rate + ETA belong on
  // the popup): timed off the flight's own polls — the opening
  // report anchors the clock, each poll re-rates it. Null until
  // the first poll lands (the downloadingLive line covers the
  // gap); cleared with the flight.
  const [flow, setFlow] = useState<{ rateBps: number, etaSec: number | null } | null>(null)
  // THE STUCK TRUTH (the purge P5): the last engine report when the
  // flight ended stuck (the ceiling expired non-terminal — the ONE
  // client-side backstop; stall truth itself is the engine's) — the
  // face offers Retry/Delete on it, and a run press on it refuses
  // loudly (never the success face).
  const [stuck, setStuck] = useState<WeightAcquireState | null>(null)
  // THE EXTENSION LEDGER SNAPSHOT (the parity cure, recon 2026-11-11
  // round 22): the install drive's own row off the SAME ledger the
  // weight tracker polls — seeded from the install answer, filled by
  // one acquire_weight poll. extFailed is the refused drive's row
  // (the face offers Retry/Delete on it); extAcquire renders the
  // tracker seats on every post-press face.
  const [extAcquire, setExtAcquire] = useState<WeightAcquireState | null>(null)
  const [extFailed, setExtFailed] = useState<WeightAcquireState | null>(null)
  // THE FAILED VERDICT (the one-authority law, 2026-10-20): the
  // engine's own failed/blocked terminal report — its cause rides
  // `note` (data.detail preferred), and the SAME exits serve as the
  // stuck face: retry re-issues, delete clears the settled row.
  const [failed, setFailed] = useState<WeightAcquireState | null>(null)
  const [dismissed, setDismissed] = useState(() => dismissedMisses.has(dismissalKey))
  // THE DOWNLOAD TELEMETRY (audit L-ERROR-3, 2026-10-22): the old
  // download loop polled 150×400ms with no teardown — a closed or
  // unmounted popup kept paying manage calls and kept setAcquire'ing
  // a dead tree for up to a minute. One controller per download
  // flight; the mount's cleanup and the close arm both abort it,
  // and the loop breaks quietly (a closed popup is not a failure).
  const downloadAbort = useRef<AbortController | null>(null)
  useEffect(() => () => { downloadAbort.current?.abort() }, [])
  if (rescue === null) return null
  // THE PROVISION TARGET (the mask SAM2 law): the model family
  // first (the run shot a family); the stage's card id second
  // (model-less tool cards carry their own DECL rows under it).
  const family = familyOfStages(stages) ?? ''
  const card = family !== '' ? '' : (cardOfStages(stages) ?? '')
  // THE RUNTIME OWNS NO TARGET (E2-2): the provision runs where
  // the engine lives — no family, card, or DECL owns it, so the
  // wire seats below never read it for this kind.
  const modelTarget = rescue.kind === 'model' && rescue.target !== undefined && rescue.target !== ''
    ? rescue.target
    : null
  const target = rescue.kind === 'runtime' ? '' : (modelTarget ?? (family !== '' ? family : card))
  const targetKind = rescue.kind === 'runtime'
    ? ''
    : modelTarget !== null ? 'declared target ' : family !== '' ? 'family ' : 'card '
  const what = rescue.kind === 'extension'
    ? 'extension pack "' + rescue.pack + '"'
    : rescue.kind === 'runtime'
      ? 'engine runtime "' + rescue.runtime + '"'
      : 'model file "' + rescue.file + '"' + (target !== '' ? ' (' + targetKind + target + ')' : '')

  const restartFace = (detail: string): ReturnType<typeof h> => {
    if (restarted) {
      return h('div', { className: css.rescue },
        h('p', { className: css.rescueNote }, chromeCopy.restartWaiting),
      )
    }
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.restartRequiredNote({ detail })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        disabled: restarting,
        onClick: () => {
          setRestarting(true)
          setNote(null)
          postManageAction('restart', {}).then((reply) => {
            if (!reply.ok) throw new Error(reply.detail ?? 'restart refused')
            setRestarting(false)
            setRestarted(true)
          }).catch((e: unknown) => {
            setRestarting(false)
            setNote(rejectionVoice(e))
          })
        },
      }, restarting ? chromeCopy.restartingWord : chromeCopy.restartToActivate),
      restarting ? h('p', { className: css.rescueNote }, chromeCopy.restartWaitingShort) : null,
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
    )
  }

  const doneFace = (result: RescueResult): ReturnType<typeof h> => {
    if (result.restartRequired) return restartFace(result.detail)
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.runAgainWhenReady({ detail: result.detail })),
      h(Button, { size: 'sm', variant: 'primary', onClick: onRun }, chromeCopy.runAgain),
    )
  }

  // THE EXTENSION DRIVE (the parity cure, recon 2026-11-11 round 22):
  // the bare banner showed no ledger and left a refused install with
  // no exits. The face now mirrors the model face's seats on the SAME
  // ledger and voices — no new download path, just the face:
  //   * the install still rides install_extension (names only — the
  //     pack id from the refusal's own text, the DECL owns the URL);
  //   * the answer's operation_id seeds a snapshot off the SAME
  //     ledger the weight tracker polls — one acquire_weight read
  //     with the operation id only (the blocking ensure seeds that
  //     row, the F9 ledger seed in service.ts, so the poll is the
  //     row's own truth, never a second fetch);
  //   * trackerFaces renders that snapshot in the SAME seats
  //     (weight-progress/meter-fill), indeterminate (installing…)
  //     while the blocking call holds the drive;
  //   * a refused install lands the failed face with the cause AND
  //     the exits row — Retry re-issues the install, Delete discards
  //     the failed row through the SAME acquire_discard door the
  //     model face rides (or clears locally when the door named no
  //     row — a 404-shaped refusal).
  if (rescue.kind === 'extension') {
    const installExtension = (): void => {
      setBusy(true)
      setNote(null)
      setExtFailed(null)
      setExtAcquire(null)
      postManageAction('install_extension', { nodes: [rescue.pack] }).then((reply) => {
        const data = typeof reply.data === 'object' && reply.data !== null
          ? reply.data as Record<string, unknown>
          : null
        const operationId = data !== null && typeof data['operation_id'] === 'string'
          ? data['operation_id']
          : ''
        const state = data !== null && typeof data['state'] === 'string'
          ? data['state']
          : (reply.ok ? 'active' : 'failed')
        const landed: WeightAcquireState = {
          operationId,
          state,
          bytes: 0,
          total: 0,
          ...(reply.detail ? { detail: reply.detail } : {}),
        }
        // THE SAME LEDGER READ (no new path): the blocking install
        // seeded the progress row under its operation id — one poll
        // fills the snapshot's bytes/total truth. A poll that misses
        // (an id the ledger never held) keeps the answer's own truth.
        const settle = (snapshot: WeightAcquireState): void => {
          setBusy(false)
          setExtAcquire(snapshot)
          if (!reply.ok) {
            setExtFailed(snapshot)
            setNote(snapshot.detail || reply.detail || 'install_extension refused')
            return
          }
          setDone({
            detail: reply.detail ?? rescue.pack + ' installed',
            restartRequired: (data !== null && data['restart_required'] === true) || state === 'restart_required',
          })
        }
        if (operationId === '') {
          settle(landed)
          return
        }
        acquireWeightPoll(operationId).then(
          (polled) => { settle(polled) },
          () => { settle(landed) },
        )
      }).catch((e: unknown) => {
        // a torn wire names no row — the note voices it and the offer
        // stays (the press itself is the retry, mirroring the model
        // face's poll-rejection voice with its press un-busied)
        setBusy(false)
        setExtFailed(null)
        setNote(rejectionVoice(e))
      })
    }
    // THE EXTENSION EXITS (the same row shape as the model exitsRow —
    // the k2 law: a terminal-bad drive must offer Retry + Delete, the
    // re-run riding the caller's own press, never an automatic
    // re-fire). Delete reaches the SAME acquire_discard door carrying
    // the failed row's id; with no id it clears locally (the door
    // named no row — nothing to discard, the face still re-arms).
    const extExitsRow = (row: WeightAcquireState): ReturnType<typeof h> =>
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
        h(Button, { size: 'sm', onClick: installExtension }, chromeCopy.retryDownload),
        h(Button, {
          size: 'sm',
          onClick: () => {
            const operationId = row.operationId
            setExtFailed(null)
            setExtAcquire(null)
            setNote(null)
            if (operationId !== '') {
              postManageAction('acquire_discard', { operation_id: operationId })
                .catch((e: unknown) => { setNote(rejectionVoice(e)) })
            }
          },
        }, chromeCopy.deleteStuck),
      )
    // THE IN-FLIGHT TRACKER (E1): the blocking install names no bytes
    // yet — the face answers the tracker seats at once with the
    // indeterminate voice (installing… over an unmeasured track, the
    // undeclared-total pattern: no role, no bounds, no fake bytes),
    // and the ledger snapshot replaces it when the door answers.
    const extInFlight = [
      h('p', { 'data-testid': 'weight-progress', className: css.rescueNote }, chromeCopy.installingWord),
      h('div', {
        'data-testid': 'weight-meter',
        style: { height: '8px', borderRadius: '4px', background: 'rgba(127,127,127,.25)', overflow: 'hidden' },
      },
        h('span', {
          'data-testid': 'weight-meter-fill',
          style: {
            display: 'block', height: '100%', width: '100%',
            background: 'currentColor', opacity: 0.35,
          },
        }),
      ),
    ]
    if (done !== null) {
      // trackerFaces tolerates a null snapshot (no fetch started —
      // no seats); the drive always seeds one before the done face,
      // so the terminal count stays mounted here.
      return h('div', { className: css.rescue },
        ...trackerFaces(extAcquire, null),
        doneFace(done),
      )
    }
    // THE × PARITY (the E2-2 law, re-fired 2026-11-05): every rescue
    // face carries the same dismissal — the extension face was
    // rebuilt (b2979ed38) with Retry/Delete exits but no ×, against
    // this file's own runtime-face law. The miss retires for this
    // pack until a new refusal; a dismissal mid-flight stays
    // mount-local only for the model popup's download law — here,
    // like the runtime face, the record is the miss identity.
    if (dismissed) return null
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote },
        chromeCopy.missingInstall({ what })),
      ...(extAcquire !== null ? trackerFaces(extAcquire, null) : (busy ? extInFlight : [])),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        disabled: busy,
        title: chromeCopy.installViaManage,
        onClick: installExtension,
      }, busy ? chromeCopy.installingWord : chromeCopy.installContinue),
      extFailed !== null ? extExitsRow(extFailed) : null,
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        className: css.errorDismiss,
        'aria-label': chromeCopy.closeExtensionFace,
        onClick: () => {
          dismissedMisses.add(dismissalKey)
          setDismissed(true)
        },
      }, h(IconCloseOutlineRegular, { size: 12 })),
    )
  }

  // THE RUNTIME BANNER (E2-2, operator 2026-10-20; PIECE B fired
  // 2026-11-10): the engine's own sentence names the missing tool
  // runtime AND its provision command, and the face grows the
  // FIRING offer — a Provision button through the estate's
  // provision_runtime door (ONE manage wire, the runtime NAME only;
  // the family scan is server-side). The verb links the engine tree
  // to the repo's healthy seed instantly: success retires the miss
  // face and voices "provisioned — press Run again", the re-run
  // rides the CALLER's press (never an automatic re-fire); a
  // refused link voices the returned detail (a named refusal, never
  // raw). The × carries the same dismissal law as every rescue face
  // — the miss retires for this runtime until a new refusal.
  if (rescue.kind === 'runtime') {
    if (done !== null) {
      return h('div', { className: css.rescue },
        h('p', { className: css.rescueNote }, chromeCopy.runtimeProvisioned({ runtime: rescue.runtime })),
        h(Button, { size: 'sm', variant: 'primary', onClick: onRun }, chromeCopy.runAgain),
      )
    }
    if (dismissed) return null
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.missingRuntime({ runtime: rescue.runtime })),
      h('p', { className: css.rescueNote }, chromeCopy.runtimeProvision({ command: rescue.command })),
      rescue.env !== undefined
        ? h('p', { className: css.rescueNote }, chromeCopy.runtimeEnvOverride({ env: rescue.env }))
        : null,
      h(Button, {
        size: 'sm',
        variant: 'primary',
        ...{ 'data-testid': 'runtime-provision' },
        disabled: busy,
        onClick: () => {
          setBusy(true)
          setNote(null)
          runRescueCall(rescue, '')
            .then((result) => { setBusy(false); setDone(result) })
            .catch((e: unknown) => { setBusy(false); setNote(rejectionVoice(e)) })
        },
      }, busy ? chromeCopy.runtimeProvisioningWord : chromeCopy.runtimeProvisionButton),
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        className: css.errorDismiss,
        'aria-label': chromeCopy.closeRuntimeFace,
        onClick: () => {
          dismissedMisses.add(dismissalKey)
          setDismissed(true)
        },
      }, h(IconCloseOutlineRegular, { size: 12 })),
    )
  }

  // THE WEIGHT POPUP (F9 run-press acquisition): the run failed on a
  // missing weight → a popup with a Download button + a live
  // bytes/total tracker. The press starts acquire_weight (ONE door
  // with the agent seat); the tracker polls the SAME door.
  if (done !== null) {
    if (dismissed) return null
    return h(Modal, {
      open: true,
      onClose: () => { setDismissed(true) },
      title: chromeCopy.weightReady,
      closeLabel: chromeCopy.closeWeightPopup,
    },
      h('div', { 'data-testid': 'weight-popup', className: css.rescue },
        trackerFaces(acquire, null),
        doneFace(done),
      ),
    )
  }

  const download = (): void => {
    // a new fetch re-arms the face: the dismissal memory clears (the
    // acquire state changed) and the stuck/failed faces retire
    dismissedMisses.delete(dismissalKey)
    setBusy(true)
    setNote(null)
    setStuck(null)
    setFailed(null)
    setFlow(null)
    // the tracker renders only reports of a LIVE flight
    setAcquire(null)
    downloadAbort.current?.abort()
    downloadAbort.current = new AbortController()
    const signal = downloadAbort.current.signal
    // THE SEQUENTIAL REVEAL (the cure, 2026-11-09): the press fetches
    // EVERY missing declared weight IN ORDER — one settled operation
    // at a time; only the last landing lands the done face. A
    // failed/stuck flight surfaces its own file's verdict and the
    // exits (the same one-authority law as the single-file face).
    // the extension (:extension) and runtime (:runtime) faces return
    // above — the download face is model-only by construction.
    const files = weightFilesOf(rescue)
    void (async () => {
      let last: WeightAcquireState | null = null
      try {
        for (const entry of files) {
          const first = await acquireWeightStart(target, entry.file, signal)
          setAcquire(first)
          // THE FLOW CLOCK: the opening report anchors the rate — each
          // poll's delta over the wall clock voices MB/s + ETA.
          const t0 = Date.now()
          const b0 = first.bytes
          // ONE STALL AUTHORITY — THE ENGINE (the 100-MBps-then-stuck
          // burn, 2026-10-20): stall truth is the engine's — its
          // watchdog kills a dead stream and the state lands 'failed'
          // carrying the cause. What the seat owns is the ONE STUCK
          // WATCH both seats share (pollAcquireToSettled, audit F8 fix
          // #7): a flight frozen AND silent (no live phase) for
          // STUCK_FROZEN_POLLS polls lands the stuck face at watch
          // speed — this seat's fast face, well inside the 60s
          // ceiling — while a live-phase flight (a healthy hash, a
          // draining queue) keeps polling. The ceiling stays the
          // backstop for a flight the watch can never judge.
          // An aborted caller throws out of the helper; the catch
          // below owns the quiet teardown.
          const flight = await pollAcquireToSettled(first, {
            pollMs: 400,
            ceiling: 150,
            signal,
            onPoll: (snapshot) => {
              setAcquire(snapshot)
              const elapsedSec = (Date.now() - t0) / 1000
              const rateBps = elapsedSec > 0 ? (snapshot.bytes - b0) / elapsedSec : 0
              setFlow({
                rateBps: rateBps > 0 ? rateBps : 0,
                etaSec: rateBps > 0 && snapshot.total > snapshot.bytes
                  ? (snapshot.total - snapshot.bytes) / rateBps
                  : null,
              })
            },
          })
          setFlow(null)
          const current = flight.snapshot
          if (flight.endedBy !== 'settled') {
            // the watch's trip (this seat's fast stuck face) and the
            // ceiling expiry land the same stuck truth — the last
            // engine report, never the success face
            setBusy(false)
            setStuck({ ...current })
            // THE STUCK HEAL (audit F6c): the ceiling is patience, not
            // a verdict — the engine may still land the fetch (a
            // multi-GB hash slower than this seat's ceiling). A
            // background poll keeps reading the ledger on the SAME
            // teardown signal (close/unmount or a fresh Download press
            // aborts it); when the engine settles, the stuck face heals
            // to done/failed instead of wedging on Retry. Still
            // unsettled at the heal ceiling: the stuck face stands with
            // its exits.
            void (async () => {
              try {
                const healedFlight = await pollAcquireToSettled(current, { pollMs: 2000, ceiling: 150, signal })
                const healed = healedFlight.snapshot
                if (signal.aborted) return
                if (!isAcquireSettled(healed)) return
                setStuck(null)
                if (healed.state === 'failed' || healed.state === 'blocked') {
                  setFailed({ ...healed })
                  setNote(healed.detail ?? 'weight acquisition ' + healed.state)
                  return
                }
                setDone({
                  detail: healed.detail ?? acquiredDetailOf(target, healed),
                  restartRequired: healed.state === 'restart_required' || healed.state === 'installed',
                })
              } catch {
                if (signal.aborted) return
                // a torn heal read leaves the stuck face with its exits
                // — the next Retry re-polls from the door
              }
            })()
            return
          }
          if (current.state === 'failed' || current.state === 'blocked') {
            // THE ENGINE'S OWN VERDICT lands with its cause AND the
            // exits — retry re-issues the fetch, delete clears the row
            setBusy(false)
            setFailed({ ...current })
            setNote(current.detail ?? 'weight acquisition ' + current.state)
            return
          }
          last = current
        }
        setBusy(false)
        if (last !== null) {
          setDone({
            detail: last.detail ?? acquiredDetailOf(target, last),
            restartRequired: last.state === 'restart_required' || last.state === 'installed',
          })
        }
      } catch (e: unknown) {
        if (signal.aborted) return // the close/unmount owns the face now
        setBusy(false)
        setFlow(null)
        setFailed(null)
        setNote(rejectionVoice(e))
      }
    })()
  }

  const downloading = acquire !== null && !isAcquireSettled(acquire)
  // THE VERIFY-PHASE VOICE (audit download-stack-audit-2026-10-20
  // F10, popup rows): a LIVE flight whose poll carries the hash
  // phase (verify, or a present-file recheck) voices the phase
  // INSTEAD of rate/ETA — the phase is the only movement a frozen
  // byte count has. A settled row never carries it (the phase
  // belongs to the flight, not the landing).
  const hashing = downloading && (acquire?.phase === 'verify' || acquire?.phase === 'recheck')

  // A dismissed popup falls back to the inline offer (the run error
  // still carries the miss — the popup is re-openable, never lost).
  // The re-offer press clears the dismissal memory: the operator
  // asked again.
  if (dismissed) {
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.missingDownload({ what })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        disabled: target === '',
        title: target === '' ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
        onClick: () => {
          dismissedMisses.delete(dismissalKey)
          setDismissed(false)
        },
      }, chromeCopy.downloadWeight),
    )
  }

  // THE DISMISS MEMORY (the re-pop cure): a dismissal is remembered
  // beyond this mount only when the acquire ended failed or stuck —
  // the re-pop burn; a live flight's close stays mount-local.
  const dismissPopup = (): void => {
    const endedBad = stuck !== null || failed !== null
      || (acquire !== null && (acquire.state === 'failed' || acquire.state === 'blocked'))
    if (endedBad) dismissedMisses.add(dismissalKey)
    // THE CLOSE ABORTS THE FLIGHT (audit L-ERROR-3, 2026-10-22):
    // the old busy-guard made mid-download dismissal a no-op, so a
    // closed popup kept polling for its whole ceiling. The flight
    // dies quietly here; the inline offer serves and re-opens. The
    // closed flight's ledger is not a live one — the held snapshot
    // clears with it.
    downloadAbort.current?.abort()
    setAcquire(null)
    setFlow(null)
    setDismissed(true)
  }

  // THE EXITS ROW (the k2 law: "there's no retry, there's no delete"
  // — and the failed face owed the same doors): whichever terminal
  // verdict the engine served, the operator can RETRY the fetch or
  // DELETE the settled row. The buttons spread with a gap — the
  // operator's paste showed them mashed edge-to-edge.
  const exitsRow = (row: WeightAcquireState): ReturnType<typeof h> =>
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
      h(Button, { size: 'sm', onClick: download }, chromeCopy.retryDownload),
      h(Button, {
        size: 'sm',
        // THE DELETE DOOR: the discard rides the manage seat carrying
        // the settled operation's id — names only, the plane owns
        // the verdict.
        onClick: () => {
          const operationId = row.operationId
          setStuck(null)
          setFailed(null)
          setAcquire(null)
          setFlow(null)
          setNote(null)
          postManageAction('acquire_discard', { operation_id: operationId })
            .catch((e: unknown) => { setNote(rejectionVoice(e)) })
        },
      }, chromeCopy.deleteStuck),
      h(Button, {
        size: 'sm',
        // a run press on an incomplete weight is refused loudly,
        // never fired silently (the purge P5)
        onClick: () => { setNote(chromeCopy.stuckRunRefusal) },
      }, chromeCopy.runAgain),
    )

  return h(Modal, {
    open: true,
    onClose: dismissPopup,
    // THE TERMINAL TITLES (audit download-stack-audit-2026-10-20
    // F10, the stuck column): each terminal state wears its own
    // word — the ceiling-expired wedge keeps "Weight stuck", the
    // engine's failed/blocked verdict gets its own title (the
    // cause rides the note beside it), and the live/missing face
    // keeps "Missing weight". No title umbrellas another state.
    title: stuck !== null
      ? chromeCopy.weightStuck
      : failed !== null ? chromeCopy.weightFailed : chromeCopy.missingWeight,
    closeLabel: chromeCopy.closeWeightPopup,
  },
    h('div', { 'data-testid': 'weight-popup', className: css.rescue },
      stuck !== null
        ? h('p', { className: css.rescueNote },
          chromeCopy.stuckNote({ state: stuck.state, progress: formatWeightProgress(stuck.bytes, stuck.total) }))
        : failed !== null
          ? null // the failed face's voice is the cause itself (note)
          : rescue.kind === 'model' && (rescue.handPlaced?.length ?? 0) > 0
            ? // THE WEIGHT-OFFER PARITY (operator 2026-10-22): a
              // hand-placed tree has no fetch — the face names the
              // placement and offers NOTHING. A Download press here
              // could only die on the door's item-not-found.
              h('p', { className: css.rescueNote },
                chromeCopy.weightHandPlaced({
                  files: rescue.handPlaced!.join(', '),
                  folders: (rescue.folders ?? []).join(', '),
                }))
            : h('p', { className: css.rescueNote }, chromeCopy.missingDownload({ what })),
      // THE ONE-FACE LIST (the reveal cure, 2026-11-09): every missing
      // declared weight, name + declared human size, with the count
      // line — the operator sees the whole fetch before pressing
      // Download, never one file per wedged run. Only on the missing
      // face (a stuck/failed face is one flight's verdict).
      stuck === null && failed === null && rescue.kind === 'model' && (rescue.more?.length ?? 0) > 0
        ? [
          h('ul', { key: 'weight-list', 'data-testid': 'weight-list', className: css.rescueNote, style: { margin: '4px 0 0', paddingLeft: '18px' } },
            weightFilesOf(rescue).map((entry) => h('li', { key: entry.file },
              entry.file + (entry.sizeBytes !== undefined ? ' · ' + formatByteSize(entry.sizeBytes) : '')),
            )),
          h('p', { key: 'weight-total', 'data-testid': 'weight-total', className: css.rescueNote },
            chromeCopy.missingWeightTotal({
              count: weightFilesOf(rescue).length,
              sizes: weightFilesOf(rescue)
                .map((entry) => (entry.sizeBytes !== undefined ? formatByteSize(entry.sizeBytes) : null))
                .filter((s): s is string => s !== null)
                .join(' + '),
            }),
          ),
        ]
        : null,
      // THE OFFER LAW (the weight-offer parity cure, operator
      // 2026-10-22): the press exists ONLY where every listed weight
      // is fetchable — a hand-only rescue renders the placement note
      // above and no button at all (the burn: the button was the lie).
      !(rescue.kind === 'model' && (rescue.handPlaced?.length ?? 0) > 0)
        ? h(Button, {
          size: 'sm',
          variant: 'primary',
          ...{ 'data-testid': 'weight-download' },
          disabled: busy || target === '',
          title: target === '' ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
          onClick: download,
        }, busy ? (acquire === null ? chromeCopy.startingWord : chromeCopy.downloadingWord) : chromeCopy.downloadWord)
        : null,
      ...trackerFaces(acquire, downloading ? flow : null, hashing),
      stuck === null && downloading && !hashing
        ? (flow !== null ? null : h('p', { className: css.rescueNote }, chromeCopy.downloadingLive))
        : null,
      stuck !== null ? exitsRow(stuck) : (failed !== null ? exitsRow(failed) : null),
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
    ),
  )
}
