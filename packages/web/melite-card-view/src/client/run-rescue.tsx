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
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { abortableSleep, postManageAction } from '@melite/card-base/client'
import css from './card.module.css'
import { ACQUIRE_TERMINAL, acquireWeightPoll, acquireWeightStart, cardOfStages, familyOfStages, parseRescue, runRescueCall, type Rescue, type RescueResult, type WeightAcquireState } from './run-rescue-core.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { chromeCopy } from '../chromeCopy.ts'

function progressPercent(bytes: number, total: number): number {
  if (!(total > 0) || !(bytes >= 0)) return 0
  return Math.min(100, Math.round((bytes / total) * 100))
}

/** THE TRACKER FACES (the popup's download ledger): the live
 *  bytes/total line plus the meter fill, rendered both mid-flight
 *  and on the done face — the terminal count stays visible, never
 *  unmounting at completion. Null when no fetch has started. */
function trackerFaces(acquire: WeightAcquireState | null): Array<ReturnType<typeof h>> {
  if (acquire === null) return []
  const pct = progressPercent(acquire.bytes, acquire.total)
  return [
    h('p', { 'data-testid': 'weight-progress', className: css.rescueNote },
      String(acquire.bytes) + '/' + String(acquire.total) + ' bytes (' + String(pct) + '%)',
    ),
    h('div', {
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': acquire.total,
      'aria-valuenow': acquire.bytes,
      'data-testid': 'weight-meter',
      style: { height: '8px', borderRadius: '4px', background: 'rgba(127,127,127,.25)', overflow: 'hidden' },
    },
      h('span', {
        'data-testid': 'weight-meter-fill',
        style: { display: 'block', height: '100%', width: String(pct) + '%', background: 'currentColor' },
      }),
    ),
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
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<RescueResult | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [acquire, setAcquire] = useState<WeightAcquireState | null>(null)
  const [dismissed, setDismissed] = useState(false)
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
  const target = rescue.kind === 'model' && rescue.target !== undefined && rescue.target !== ''
    ? rescue.target
    : family !== '' ? family : card
  const targetKind = rescue.kind === 'model' && rescue.target !== undefined && rescue.target !== ''
    ? 'declared target '
    : family !== '' ? 'family ' : 'card '
  const what = rescue.kind === 'extension'
    ? 'extension pack "' + rescue.pack + '"'
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
        trackerFaces(acquire),
        doneFace(done),
      ),
    )
  }

  const download = (): void => {
    setBusy(true)
    setNote(null)
    downloadAbort.current?.abort()
    downloadAbort.current = new AbortController()
    const signal = downloadAbort.current.signal
    void (async () => {
      try {
        const first = await acquireWeightStart(target, rescue.file, signal)
        setAcquire(first)
        let current = first
        for (let attempt = 0; !ACQUIRE_TERMINAL.has(current.state) && attempt < 150; attempt += 1) {
          await abortableSleep(400, signal)
          if (signal.aborted) return
          current = await acquireWeightPoll(current.operationId, signal)
          setAcquire({ ...current })
        }
        setBusy(false)
        if (current.state === 'failed' || current.state === 'blocked') {
          setNote(current.detail ?? 'weight acquisition ' + current.state)
          return
        }
        setDone({
          detail: current.detail ?? target + ' acquired (' + String(current.bytes) + '/' + String(current.total) + ' bytes)',
          restartRequired: current.state === 'restart_required' || current.state === 'installed',
        })
      } catch (e: unknown) {
        if (signal.aborted) return // the close/unmount owns the face now
        setBusy(false)
        setNote(rejectionVoice(e))
      }
    })()
  }

  const downloading = acquire !== null && !ACQUIRE_TERMINAL.has(acquire.state)

  // A dismissed popup falls back to the inline offer (the run error
  // still carries the miss — the popup is re-openable, never lost).
  if (dismissed) {
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.missingDownload({ what })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        disabled: target === '',
        title: target === '' ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
        onClick: () => { setDismissed(false) },
      }, chromeCopy.downloadWeight),
    )
  }

  return h(Modal, {
    open: true,
    onClose: () => {
      // THE CLOSE ABORTS THE FLIGHT (audit L-ERROR-3, 2026-10-22):
      // the old busy-guard made mid-download dismissal a no-op, so a
      // closed popup kept polling for its whole ceiling. The flight
      // dies quietly here; the inline offer serves and re-opens.
      downloadAbort.current?.abort()
      setDismissed(true)
    },
    title: chromeCopy.missingWeight,
    closeLabel: chromeCopy.closeWeightPopup,
  },
    h('div', { 'data-testid': 'weight-popup', className: css.rescue },
      h('p', { className: css.rescueNote }, chromeCopy.missingDownload({ what })),
      h(Button, {
        size: 'sm',
        variant: 'primary',
        ...{ 'data-testid': 'weight-download' },
        disabled: busy || target === '',
        title: target === '' ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
        onClick: download,
      }, busy ? (acquire === null ? chromeCopy.startingWord : chromeCopy.downloadingWord) : chromeCopy.downloadWord),
      ...trackerFaces(acquire),
      downloading ? h('p', { className: css.rescueNote }, chromeCopy.downloadingLive) : null,
      note !== null ? h('p', { className: css.rescueErr }, note) : null,
    ),
  )
}
