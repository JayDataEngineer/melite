/** draft-run-views.tsx — the draft authoring face and the run's live
 * status view (extracted from CardsTab.tsx hour 15). */

import { createElement as h, useEffect, useState } from 'react'
import { Button, IconStopFill16, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StageViewOwnerProps } from './types.ts'
import css from './card.module.css'
import { useCallback } from 'react'
import { titleCaseId } from '@melite/card-base/spec'
import { mediaUrl } from './draft.ts'
import { benchSessionKey, restoreRunToBench } from './cards-resource.ts'
import type { CardsDraftValue, CardsRunValue, BenchStageRow, CardsBenchValue } from './cards-resource.ts'
import { cardsRunAddress } from './cards-resource.ts'
import { ScrollLockedDetail, StageDrill } from './stage-drill.tsx'

/**
 * THE DRAFT VIEW (the conversation card's target, 2026-09-12 — the
 * old embed's law restored): one flow draft's stage on the authoring
 * surface. The studio claims `cards.stage.view` exactly as the bench's
 * zoom does — same slot, same owner currency, same run/patch doors —
 * so the chat card opens the timeline/video/splits/audio surface, and
 * a card with no registered studio falls back to the generic zoom
 * card (params + Run), the bench's own fallback.
 *
 * Removal is NOT offered (the draft's shape belongs to its authoring
 * surface — the bench CAS door has no business here); the back affordance
 * returns to the shared bench, the tab's home address.
 */
export function DraftView({ value, running, onRun, onStop, onBack, onPatchParams, renderStageView, renderPreview, runId, bindRun }: {
  value: CardsDraftValue
  running: boolean
  onRun: () => void
  /** THE STOP DOOR (2026-09-13): the draft drill's run button flips
   *  to stop mid-run, same gesture as the bench faces. */
  onStop: () => void
  onBack: () => void
  onPatchParams: (patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId: string | null
  bindRun?: (run: () => void) => void
}): ReturnType<typeof h> {
  const found = value.stages.find((s) => s.id === value.stageId) ?? null
  if (found === null) {
    return h(ScrollLockedDetail, null,
      h('p', { className: css.groupNote },
        'Stage ' + value.stageId + ' is no longer on draft ' + value.draftId + '.'),
      h('div', { className: css.runRow },
        h('button', { className: css.back, type: 'button', onClick: onBack }, 'Back to the bench'),
      ),
    )
  }
  // CARD BIRTH LAW (the runs door's own text: "every run is born from
  // an action card"): a card tool's draft is born with the card id as
  // its intent and ONE stage — the estate's bench normalization keeps
  // only the engine row (service/title discarded), so the card
  // identity survives on the DRAFT INTENT alone. The studio consult
  // keys on cardName; re-attach it from the intent for the
  // single-stage card-born draft only (user-authored benches carry
  // card on the row itself and never take this arm). Live-lane
  // receipt 2026-09-12: the chat-born bench-default/s_0 rendered the
  // generic drill because the consult saw cardName ''.
  let stage = found
  if ((stage['card'] === undefined || stage['card'] === '') && value.intent !== '' && value.stages.length === 1) {
    stage = { ...found, card: value.intent }
  }
  // The synthetic bench: siblings for the input picker (the
  // slot-is-the-wire law), the draft id for the patch door. rev -1 is
  // the no-CAS marker — removal is absent (canRemove false), so the
  // marker is never spent.
  // sessionKey: the chat-plane owner props carry no session id
  // (the slot contract's face — the scope is session-keyed but the
  // props don't spell it), so the synthetic bench carries the
  // address-grammar root's unattributed spelling. The key is never
  // spent (canRemove false below — rev -1 is the no-CAS marker).
  const bench: CardsBenchValue = { kind: 'bench', draftId: value.draftId, rev: -1, stages: value.stages, log: [], sessionKey: benchSessionKey(undefined) }
  return h(StageDrill, {
    stage,
    bench,
    running,
    onRun,
    onStop,
    onClose: onBack,
    onRemoved: onBack,
    onPatchParams,
    renderStageView,
    renderPreview,
    runId,
    canRemove: false,
    bindRun,
  })
}

export function RunView({ run, sessionKey, onBack, onRestored, onStop }: {
  sessionKey: string
  run: CardsRunValue
  onBack: (() => void) | undefined
  onRestored: () => void
  onStop: ((runId: string) => void) | undefined
}): ReturnType<typeof h> {
  const [restoring, setRestoring] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)
  const live = run.status === 'queued' || run.status === 'pending' || run.status === 'running'
  /* v8 ignore next 3 -- the cancel button renders only when onStop is defined (line above — probe 2026-09-19): the undefined arm is a single-render-law contradiction; prod always passes onStop */
  const onCancel = (): void => {
    if (onStop === undefined) return
    setStopping(true)
    onStop(run.runId)
  }
  const onRestore = useCallback((): void => {
    setRestoring(true)
    setNote(null)
    restoreRunToBench(run, sessionKey).then((report) => {
      const extra = report.notes.length > 0 ? ' (' + report.notes.join('; ') + ')' : ''
      const skipped = report.skipped > 0 ? ', ' + String(report.skipped) + ' skipped' : ''
      setNote('restored ' + String(report.added) + ' stage(s) to the bench' + skipped + extra)
      setRestoring(false)
      onRestored()
    }).catch((e: unknown) => {
      setNote(e instanceof Error ? e.message : String(e))
      setRestoring(false)
    })
  }, [run, onRestored, sessionKey])
  return h('section', { className: css.runView, 'data-run-status': run.status },
    h('header', { className: css.runHead },
      h('span', { className: css.runId }, run.runId),
      h('span', { className: css.runStatus }, titleCaseId(run.status)),
    ),
    h('div', { className: css.runActions },
      onBack !== undefined
        ? h('button', { className: css.back, type: 'button', onClick: onBack }, 'Back to bench')
        : null,
      live && onStop !== undefined
        ? h('button', {
            className: css.cancelBtn,
            type: 'button',
            disabled: stopping,
            onClick: onCancel,
          }, stopping ? 'cancelling…' : 'Cancel run')
        : null,
      h('button', {
        className: css.restore,
        type: 'button',
        disabled: restoring || run.draftId === null,
        title: run.draftId === null ? 'this run names no draft — nothing to restore' : 'copy this run\u2019s stages back onto the bench as your own',
        onClick: onRestore,
      }, restoring ? 'Restoring…' : 'Restore to bench'),
    ),
    note !== null ? h('p', { className: css.restoreNote }, note) : null,
    // ONE SURFACE (no states): the run's stage list renders at every
    // count — zero rows is an empty list, never a special paragraph.
    h('ol', { className: css.tileGrid }, run.stages.map((s) => {
          const thumb = s.url !== undefined ? mediaUrl(run.runId, s.url) : null
          const dot: 'done' | 'ongoing' | 'error' | 'warning' | null
            = s.status === 'done' ? 'done'
            : s.status === 'running' ? 'ongoing'
            : s.status === 'failed' ? 'error'
            : s.status === 'queued' || s.status === 'pending' ? 'warning' : null
          const face = thumb !== null
            ? h('a', { href: thumb, target: '_blank', rel: 'noreferrer', className: css.tileImgLink },
                h('img', { className: css.tileImg, src: thumb, alt: s.id, loading: 'lazy' }))
            : h('span', { className: css.kindFace, 'data-kind': s.id },
                h('span', { className: css.kindInitial }, s.id.slice(0, 1).toUpperCase()),
                h('span', { className: css.kindName }, s.id),
              )
          return h('li', { key: s.id, className: css.tile, 'data-stage-status': s.status },
            h('div', { className: css.tileInner, 'data-status': s.status },
              h('span', { className: css.tilePreview },
                face,
                dot !== null ? h('span', { className: css.tileDot }, h(StateDot, { state: dot })) : null,
              ),
              h('span', { className: css.tileCaption },
                h('span', { className: css.tileTitle }, s.id),
                h('span', { className: css.tileMeta }, s.status),
              ),
            ),
          )
        })),
  )
}
