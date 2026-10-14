/** draft-run-views.tsx — the draft authoring face and the run's live
 * status view (extracted from CardsTab.tsx hour 15). */

import { createElement as h, useEffect, useState } from 'react'
import { Button, IconStopFillRegular, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StageViewOwnerProps } from './types.ts'
import css from './card.module.css'
import { useCallback } from 'react'
import { titleCaseId } from '@melite/card-base/client'
import { mediaUrl } from './draft.ts'
import { benchSessionKey, restoreRunToBench } from './cards-resource.ts'
import type { CardsDraftValue, CardsRunValue, BenchStageView, CardsBenchValue } from './cards-resource.ts'
import { cardsRunAddress } from './cards-resource.ts'
import { ScrollLockedDetail, StageDrill } from './stage-drill.tsx'
import { STATUS_DOT } from './bench-row.ts'
import { isLiveRunStatus, statusOf, RUN_STATUS_WORDS } from '@melite/contracts/stageView'
import { terminalRunStageErrorOf } from './run-rescue-core.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { chromeCopy } from '../chromeCopy.ts'

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
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh' | 'text', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId: string | null
  bindRun?: (run: () => void) => void
}): ReturnType<typeof h> {
  const found = value.stages.find((s) => s.id === value.stageId) ?? null
  if (found === null) {
    return h(ScrollLockedDetail, null,
      h('p', { className: css.groupNote },
        'Stage ' + value.stageId + ' is no longer on draft ' + value.draftId + '.'),
      h('div', { className: css.runRow },
        h(Button, { size: 'sm', variant: 'outline', onClick: onBack }, chromeCopy.backToBench),
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
  onStop: ((runId: string) => Promise<void>) | undefined
}): ReturnType<typeof h> {
  const [restoring, setRestoring] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)
  // the owner's live judgement (was a private set that never knew the
  // wire's `live` nor the estate's `stopping`)
  const live = isLiveRunStatus(run.status)
  // THE RUN FACE'S TERMINAL VOICE (the runface-error cure,
  // 2026-10-12): a failed RUN's stage error text used to render
  // nowhere — cards-tab-body's tab-level strip reads
  // terminalStageErrorOf (the DRAFT shape: { runStatus,
  // result.error }) and nulls the run branch, while the run wire
  // serves { status, error } rows the draft read folds to
  // not-failed. Only the per-tile status word showed, never WHY.
  // The voice rides INSIDE the panel's scroll content directly
  // below the header (the flow-sidebar scroll law: errors below the
  // header, never above the panel — the bench panel's
  // save→reload→grid order), in the draft face's own .runError
  // style (no new CSS: the class already owns the loud wrap law).
  // Null renders nothing, so the note's [HEADER, DIV, P, OL] order
  // below is untouched when there is no failure to voice.
  const stageError = terminalRunStageErrorOf(run.stages, run.error)
  /* v8 ignore next 3 -- the cancel button renders only when onStop is defined (line above — probe 2026-09-19): the undefined arm is a single-render-law contradiction; prod always passes onStop */
  const onCancel = (): void => {
    if (onStop === undefined) return
    setStopping(true)
    setNote(null)
    // the latch rides the outcome: a refused stop re-arms the button and
    // voices the refusal here, on the run face (runs F3) — it must never
    // latch at "cancelling…" forever
    void onStop(run.runId)
      .then(() => { setStopping(false) })
      .catch((e: unknown) => {
        setStopping(false)
        setNote(rejectionVoice(e))
      })
  }
  const onRestore = useCallback((): void => {
    setRestoring(true)
    setNote(null)
    restoreRunToBench(run, sessionKey).then((report) => {
      const extra = report.notes.length > 0 ? ' (' + report.notes.join('; ') + ')' : ''
      const skipped = report.skipped > 0 ? ', ' + String(report.skipped) + ' skipped' : ''
      // the carried count names the preview carry — the outcomes that
      // rode the restored rows (the resume law's run-view half)
      const carried = report.carried > 0 ? ', ' + String(report.carried) + ' outcome(s) carried' : ''
      setNote('restored ' + String(report.added) + ' stage(s) to the bench' + skipped + carried + extra)
      setRestoring(false)
      onRestored()
    }).catch((e: unknown) => {
      setNote(rejectionVoice(e))
      setRestoring(false)
    })
  }, [run, onRestored, sessionKey])
  return h('section', { className: css.runView, 'data-run-status': run.status },
    h('header', { className: css.runHead },
      h('span', { className: css.runId }, run.runId),
      h('span', { className: css.runStatus }, titleCaseId(run.status)),
    ),
    stageError !== null ? h('p', { className: css.runError, 'data-testid': 'run-stage-error' }, stageError) : null,
    h('div', { className: css.runActions },
      onBack !== undefined
        ? h(Button, { size: 'sm', variant: 'outline', onClick: onBack }, chromeCopy.backToBenchRun)
        : null,
      live && onStop !== undefined
        ? h(Button, {
            size: 'sm',
            variant: 'outline',
            className: css.dangerVerb,
            disabled: stopping,
            onClick: onCancel,
          }, stopping ? chromeCopy.cancellingWord : chromeCopy.cancelRunWord)
        : null,
      h(Button, {
        size: 'sm',
        variant: 'outline',
        disabled: restoring || run.draftId === null,
        title: run.draftId === null ? chromeCopy.restoreNoDraft : chromeCopy.restoreHint,
        onClick: onRestore,
      }, restoring ? chromeCopy.restoringWord : chromeCopy.restoreToBench),
    ),
    // THE NOTE SEAT (the flow-sidebar scroll cure, operator volley
    // 2026-10-24 items d+j): the restore/stop voice renders INSIDE
    // the run panel's scroll content, after the actions and before
    // the stage list — never above the panel, never outside it. The
    // testid pins the seat (order + containment), the stylesheet pins
    // its wrap law (css.restoreNote).
    note !== null ? h('p', { className: css.restoreNote, 'data-testid': 'run-note' }, note) : null,
    // ONE SURFACE (no states): the run's stage list renders at every
    // count — zero rows is an empty list, never a special paragraph.
    h('ol', { className: css.tileGrid }, run.stages.map((s) => {
          const thumb = s.url !== undefined ? mediaUrl(run.runId, s.url) : null
          // ONE MAP, ONE FOLD (2026-10-01): the raw word folds through
          // statusOf, so 'completed' — the word the estate settles
          // every finished stage with — lands on 'done' and shows its
          // dot; the old raw-word table never knew it.
          // A word outside the vocabulary rides BARE (no dot, no
          // lying color) — this seat's own law, kept explicit now that
          // the contract fold refuses rather than folding garbage to
          // 'pending' (operator decision 2026-10-12).
          const word = typeof s.status === 'string' ? s.status.toLowerCase() : ''
          // null (not undefined) is the map's own "no dot" value
          const dot = RUN_STATUS_WORDS.has(word) ? STATUS_DOT[statusOf(word)] : null
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
