/**
 * run-rescue.tsx — the run-gate rescue's face (roadmap item 4): the
 * rescue that renders where a failed run's error lands WHEN the miss
 * is rescueable — a missing extension pack or a missing model file.
 * THE LINKS-IN-CODE LAW: names only, the DECL owns every URL
 * server-side (run-rescue-core.ts's header).
 *
 * TWO FACES: an extension miss keeps the inline banner (one confirm
 * through install_extension); a model miss opens the WEIGHT POPUP —
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
import { acquiredDetailOf, acquireWeightStart, cardOfStages, familyOfStages, formatByteSize, formatRateLine, formatWeightProgress, isAcquireSettled, parseRescue, pollAcquireToSettled, runRescueCall, type Rescue, type RescueResult, type WeightAcquireState } from './run-rescue-core.ts'
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
 *  human. */
function trackerFaces(acquire: WeightAcquireState | null, flow: { rateBps: number, etaSec: number | null } | null): Array<ReturnType<typeof h>> {
  if (acquire === null) return []
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
    ...(flow !== null ? [h('p', { 'data-testid': 'weight-rate', className: css.rescueNote },
      chromeCopy.weightRateLive({ status: formatRateLine(flow.rateBps, flow.etaSec) }),
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
  if (rescue.kind === 'model') return 'model:' + rescue.file + '@' + (rescue.target ?? '')
  if (rescue.kind === 'runtime') return 'runtime:' + rescue.runtime
  return 'extension:' + rescue.pack
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

  // THE EXTENSION BANNER (unchanged): one confirm through
  // install_extension, then the caller's own re-run.
  if (rescue.kind === 'extension') {
    if (done !== null) return doneFace(done)
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote },
        chromeCopy.missingInstall({ what })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        disabled: busy,
        title: chromeCopy.installViaManage,
        onClick: () => {
          setBusy(true)
          setNote(null)
          runRescueCall(rescue, target)
            .then((result) => { setBusy(false); setDone(result) })
            .catch((e: unknown) => { setBusy(false); setNote(rejectionVoice(e)) })
        },
      }, busy ? chromeCopy.installingWord : chromeCopy.installContinue),
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
    )
  }

  // THE RUNTIME BANNER (E2-2, operator 2026-10-20 — a download
  // prompt appears, never the raw engine's noise): the engine's own
  // sentence names the missing tool runtime AND its provision
  // command, so the estate faces the provision — never the raw
  // ComfyError. The estate owns no runtime-provision door, so the
  // face offers NO wire (never a fake install): the command IS the
  // offer, with the engine's env override beside it when one
  // exists. The × carries the same dismissal law as every rescue
  // face — the miss retires for this runtime until a new refusal.
  if (rescue.kind === 'runtime') {
    if (dismissed) return null
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.missingRuntime({ runtime: rescue.runtime })),
      h('p', { className: css.rescueNote }, chromeCopy.runtimeProvision({ command: rescue.command })),
      rescue.env !== undefined
        ? h('p', { className: css.rescueNote }, chromeCopy.runtimeEnvOverride({ env: rescue.env }))
        : null,
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
    void (async () => {
      try {
        const first = await acquireWeightStart(target, rescue.file, signal)
        setAcquire(first)
        // THE FLOW CLOCK: the opening report anchors the rate — each
        // poll's delta over the wall clock voices MB/s + ETA.
        const t0 = Date.now()
        const b0 = first.bytes
        // ONE STALL AUTHORITY — THE ENGINE (the 100-MBps-then-stuck
        // burn, 2026-10-20): the popup's own byte-freeze guess fired
        // the stuck face 800ms into a WAN hiccup the engine was
        // riding out (the direct arm seats 'verifying' for the WHOLE
        // fetch, so a frozen ledger during a hiccup is live flight,
        // not a stall). The engine's watchdog owns stall truth — it
        // kills a dead stream and the state lands 'failed' carrying
        // the cause; the client polls until a terminal state or the
        // ceiling, NEVER inventing a verdict from its own clock.
        // ONE STUCK LAW, ONE SPELLING, BOTH SEATS (audit F8): this
        // loop is pollAcquireToSettled — the same live-state
        // spelling and ceiling law the agent seat rides, this seat's
        // own cadence, with the rate/ETA face on the per-poll hook.
        // An aborted caller throws out of the helper; the catch
        // below owns the quiet teardown.
        const current = await pollAcquireToSettled(first, {
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
        setBusy(false)
        setFlow(null)
        if (!isAcquireSettled(current)) {
          // ceiling expiry with no terminal verdict: the stuck truth,
          // never the success face
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
              const healed = await pollAcquireToSettled(current, { pollMs: 2000, ceiling: 150, signal })
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
          setFailed({ ...current })
          setNote(current.detail ?? 'weight acquisition ' + current.state)
          return
        }
        setDone({
          detail: current.detail ?? acquiredDetailOf(target, current),
          restartRequired: current.state === 'restart_required' || current.state === 'installed',
        })
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
    title: stuck !== null || failed !== null ? chromeCopy.weightStuck : chromeCopy.missingWeight,
    closeLabel: chromeCopy.closeWeightPopup,
  },
    h('div', { 'data-testid': 'weight-popup', className: css.rescue },
      stuck !== null
        ? h('p', { className: css.rescueNote },
          chromeCopy.stuckNote({ state: stuck.state, progress: formatWeightProgress(stuck.bytes, stuck.total) }))
        : failed !== null
          ? null // the failed face's voice is the cause itself (note)
          : h('p', { className: css.rescueNote }, chromeCopy.missingDownload({ what })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        ...{ 'data-testid': 'weight-download' },
        disabled: busy || target === '',
        title: target === '' ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
        onClick: download,
      }, busy ? (acquire === null ? chromeCopy.startingWord : chromeCopy.downloadingWord) : chromeCopy.downloadWord),
      ...trackerFaces(acquire, downloading ? flow : null),
      stuck === null && downloading
        ? (flow !== null ? null : h('p', { className: css.rescueNote }, chromeCopy.downloadingLive))
        : null,
      stuck !== null ? exitsRow(stuck) : (failed !== null ? exitsRow(failed) : null),
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
    ),
  )
}
