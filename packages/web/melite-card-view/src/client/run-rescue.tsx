/**
 * run-rescue.tsx — the run-gate rescue's face (roadmap item 4): the
 * banner that renders under a failed run's error WHEN the miss is
 * rescueable — a missing extension pack or a missing model file —
 * offering ONE confirm that routes through the manage seat and
 * re-offers the run. THE LINKS-IN-CODE LAW: names only, the DECL
 * owns every URL server-side (run-rescue-core.ts's header).
 *
 * Mounts where the failure carry already lands (cards-tab-body's
 * runError faces); inert — renders null — for every non-rescueable
 * error. The user's run press stays the only run starter: the
 * banner offers the INSTALL, and the re-run rides the caller's own
 * onRun (never an automatic re-fire).
 */
import { createElement as h, useState } from 'react'
import { postManageAction } from '@melite/card-base/client'
import css from './card.module.css'
import { cardOfStages, familyOfStages, parseRescue, runRescueCall, type RescueResult } from './run-rescue-core.ts'
import { rejectionVoice } from './rejection-voice.ts'

export function RunRescue({ error, stages, onRun }: {
  error: string
  stages: Array<{ params?: Record<string, unknown>; card?: string }>
  /** the caller's own run press — offered again after a successful
   * install, never fired automatically */
  onRun: () => void
}): ReturnType<typeof h> | null {
  const rescue = parseRescue(error)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<RescueResult | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [note, setNote] = useState<string | null>(null)
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
  if (done !== null) {
    if (done.restartRequired) {
      if (restarted) {
        return h('div', { className: css.rescue },
          h('p', { className: css.rescueNote }, 'Restarting… waiting for the engine to become active. Reload the page or engine, then press Run.'),
        )
      }
      return h('div', { className: css.rescue },
        h('p', { className: css.rescueNote }, done.detail + ' — restart required before activation.'),
        h('button', {
          className: css.rescueBtn,
          type: 'button',
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
        }, restarting ? 'Restarting…' : 'Restart to activate'),
        restarting ? h('p', { className: css.rescueNote }, 'Restarting… waiting for the engine to become active.') : null,
        note !== null ? h('p', { className: css.rescueErr }, note) : null,
      )
    }
    return h('div', { className: css.rescue },
      h('p', { className: css.rescueNote }, done.detail + ' — run again when ready.'),
      h('button', { className: css.rescueRun, type: 'button', onClick: onRun }, 'Run again'),
    )
  }
  return h('div', { className: css.rescue },
    h('p', { className: css.rescueNote },
      'Missing ' + what + ' — install through the manage seat?'),
    h('button', {
      className: css.rescueBtn,
      type: 'button',
      disabled: busy || (rescue.kind === 'model' && target === ''),
      title: rescue.kind === 'model' && target === '' ? 'no stage names the owning family or card — provision via the agent door' : 'install via /v1/manage (the declaration owns the URL)',
      onClick: () => {
        setBusy(true)
        setNote(null)
        runRescueCall(rescue, target)
          .then((result) => { setBusy(false); setDone(result) })
          .catch((e: unknown) => { setBusy(false); setNote(rejectionVoice(e)) })
      },
    }, busy ? 'installing…' : 'Install & continue'),
    note !== null ? h('p', { className: css.rescueErr }, note) : null,
  )
}
