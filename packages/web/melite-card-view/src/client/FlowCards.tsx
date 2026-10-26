/**
 * The melite_flow toolview — THE ACTION CARDS, rendered NATIVE in the
 * DSH React tree (2026-09-10 Phase 1: the iframe died).
 *
 * Keyed into the shipped `tool.call.toolview` seat for the wire tool
 * name `melite_flow`. NOT an iframe, NOT a bridge: the cards are React
 * components IN the host document —
 *   (a) THEME — inherited. The cards sit in DSH's tree, so every
 *       --dsw-alias-* token applies directly; the embed-bridge token
 *       copy is gone with the frame (the deck canvas keeps its own
 *       until Phase 2).
 *   (b) HEIGHT — gone as a problem. In-tree flow lays out natively;
 *       no polling, no scrollHeight reads.
 *   (c) DRILLDOWN — the ui-primitives Modal (body portal, Escape/
 *       mask close, aria-modal): the split detail — params left,
 *       outputs right — per the operator's directive 2026-09-10
 *       ("our cards go inside the dsh modal for the split drill
 *       down and drill up"). No zoom-promotion machine; DSH's own
 *       overlay machinery is the only layer.
 *
 * The wire is the editor's wire, same-origin via the card-deck host's
 * /v1 proxy (draft.ts owns every fetch). The user reviews the rows,
 * edits params in the drilldown, and presses Run ON THE CARD — the run
 * door (runs/start over the wire frame) is a user gesture, never the model's.
 *
 * WATERFALL LEDGER (operator law 2026-09-10: ride DSH 1:1 → minimize
 * our code → DOCUMENT what can't be ridden; each entry is for review):
 *   (a-1) RIDEN 1:1 — Button, Input, Pill, StateDot, Modal from the
 *         INSTALLED @deepseek-ai/dsh-client-ui-primitives rc.8 (Pill
 *         replaced hand-rolled capsule badges; Modal replaced the zoom
 *         machine). The css module is LAYOUT ONLY, every color an
 *         inherited --dsw-alias-* token — the ui-model-selection idiom.
 *   (c-4) rc.8 SURFACE GAP: the reference catalog also ships Tag and
 *         Switch; installed rc.8 does NOT. Pill is the shipped capsule
 *         for both (static span, no onClick = read-only badge; with
 *         onClick = the boolean toggle). REVIEW at the next rc bump:
 *         swap to Tag/Switch when installed.
 *   (c-1) NO ATOM: the card ROW (a list row that opens a Modal).
 *         DisclosureRow is inline expansion — a different interaction;
 *         no shipped atom covers row→modal. Hand-rolled, layout-only.
 *   (a-2) THE LIVE RUN, post-kill: the gateway-era events WS died
 *         with the gateway app (nothing serves it, by design); the
 *         run tail rides the run resource's frames (runs/subscribe
 *         over the reconnecting RemoteStream — the entry hands the
 *         carrier down, cards-resource.ts's bindRunFramesRemote).
 *         The run press seeds the tail; the interval poll is gone.
 *   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
 *         package wraps the estate's remotes as a browser client; the
 *         thin wire caller (client-request frame, api-gateway.md) is
 *         the sanctioned shape for plugins outside the web kernel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import css from './card.module.css'
import { Button, IconCloseOutlineRegular, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { AudioStagePreview, ImageStagePreview, VideoStagePreview } from '@melite/card-base/client'
import { CardDrill } from './card-drill.tsx'
import { cardsDraftStageAddress, subscribeRunFrames } from './cards-resource.ts'
import { STATUS_DOT } from './bench-row.ts'
import { chatPreviewsFor } from './chat-preview.ts'
import type { ToolCallBlockView } from './types.ts'
import {
  cardRows, fetchDraft, paramFields, patchStageParams, refuseForUnlandedWrite, runFinished, startDraft,
} from './draft.ts'
import type { CardRow, DraftDoc, RunStatusDoc } from './draft.ts'
import { draftIdOf, type DraftId } from '@melite/contracts/benchStage'
import { rejectionVoice } from './rejection-voice.ts'
import { chromeCopy } from '../chromeCopy.ts'

export interface FlowCardsProps {
  block: ToolCallBlockView
  /** The shell's navigation face — the register site's inject share
   *  (the client contract's own channel for cross-surface callbacks;
   *  the entry captures ctx.sidebarRight.openResource there). Absent
   *  in headless harnesses/tests: the row degrades to the in-card
   *  drill, never throws. Returns false when the shell refused. */
  openSurface?: (address: string) => boolean
  /** Opens the shell's Media page (the archive the card's runs land
   *  in). The header affordance renders only when the register site
   *  provides it; a shell refusal returns false and the card stays. */
  openMedia?: () => boolean
}

/** Parse the melite_flow / card-tool call: the draft id + the model
 *  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
 *  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
 *  every card tool emits it; the handle is read from meta, never
 *  parsed out of prose. The render-text token ('card <draftId>') is
 *  the LEGACY fallback: sessions logged before a tool grew its
 *  projector still hydrate through the parse rule. */
export function parseCardsBlock(block: ToolCallBlockView): {
  draftId: DraftId | null
  model: string | null
  malformedArgs: boolean
  settled: boolean
  isError: boolean
} {
  const settled = block.kind === 'tool-result'
  const argsRaw = settled ? (block.call?.argsRaw ?? '') : (block.argsRaw ?? '')
  let model: string | null = null
  let malformedArgs = false
  if (argsRaw !== '') {
    try {
      const args = JSON.parse(argsRaw) as Record<string, unknown>
      if (typeof args['model'] === 'string' && args['model'] !== '') model = args['model']
    } catch {
      // L10 (the fallback audit): malformed args used to render
      // header-less — indistinguishable from a model-less call. The
      // flag carries the defect to the header, which badges it
      // visibly; the render still never throws.
      malformedArgs = true
    }
  }
  let draftId: DraftId | null = null
  if (settled && block.isError !== true) {
    // 1. NATIVE: the persisted presentationMeta payload.
    const meta = block.meta
    if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
      const id = (meta as Record<string, unknown>)['draft_id']
      if (typeof id === 'string' && id !== '') draftId = draftIdOf(id)
    }
    // 2. LEGACY: the render token (pre-projector logs; the rule this
    //    view parsed for years — the token after 'card ' or 'draft ').
    if (draftId === null && Array.isArray(block.content)) {
      for (const part of block.content) {
        if (part === null || typeof part !== 'object') continue
        const text = (part as { text?: unknown }).text
        if (typeof text !== 'string') continue
        const atCard = text.indexOf('card ')
        const atIdx = atCard >= 0 ? atCard : text.indexOf('draft ')
        if (atIdx < 0) continue
        const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6))
        const end = rest.indexOf(' ')
        const tok = end < 0 ? rest : rest.slice(0, end)
        if ((tok.startsWith('draft-') || tok.startsWith('p_')) && tok.length > 2) { draftId = draftIdOf(tok); break }
      }
    }
  }
  return { draftId, model, malformedArgs, settled, isError: block.isError === true }
}

/** Draft doc + live run status (all doors in draft.ts; the live tail
 *  rides the run resource's frames — cards-resource.ts). */
function useDraft(draftId: DraftId | null): {
  doc: DraftDoc | null
  live: RunStatusDoc | null
  error: string | null
  refresh: () => void
  startedRun: (runId: string) => void
} {
  const [doc, setDoc] = useState<DraftDoc | null>(null)
  const [live, setLive] = useState<RunStatusDoc | null>(null)
  const [liveRunId, setLiveRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => { setTick((t) => t + 1) }, [])

  /** Seed the live tail from the run press's own answer — the started
   *  run id is the only honest seed (the draft doc carries none). */
  const startedRun = useCallback((runId: string) => {
    setLive(null)
    setLiveRunId(runId)
  }, [])

  // PER-DRAFT RESET: the live tail and its doc die with the draft —
  // a refresh (tick) re-reads the doc but never kills a seeded tail
  // (the drill can close and reopen mid-run; the tail survives).
  useEffect(() => {
    if (draftId === null) return
    setDoc(null)
    setLive(null)
    setLiveRunId(null)
    setError(null)
  }, [draftId])

  // Hydrate the doc (one GET per draftId or manual refresh; never a storm).
  useEffect(() => {
    if (draftId === null) return
    let alive = true
    fetchDraft(draftId)
      .then((d) => { if (alive) setDoc(d) })
      .catch((e: unknown) => { if (alive) setError(rejectionVoice(e)) })
    return () => { alive = false }
  }, [draftId, tick])

  // THE LIVE RUN — the run tail rides the run resource's frames
  // (runs/subscribe over the reconnecting RemoteStream, the run view's
  // own carrier; handroll row 1.8's consumer tail CLOSED here — the
  // interval poll is gone). A failure frame changes nothing: the
  // stream's supervisor owns the retry, and the last live doc stays
  // (the poll's own silent-transient law). A terminal status ends the
  // tail and refreshes the draft doc (the runs seat stamps a fresh
  // createdAt on write-back); the tail ending without one keeps the
  // last live doc — the card's face never freezes pretending.
  useEffect(() => {
    if (liveRunId === null) return
    const controller = new AbortController()
    let alive = true
    void (async () => {
      try {
        for await (const frame of subscribeRunFrames(liveRunId, controller.signal)) {
          if (!alive) return
          if (!frame.ok) continue
          setLive({ run_id: frame.value.runId, status: frame.value.status, stages: frame.value.stages, error: frame.value.error })
          if (runFinished(frame.value.status)) {
            // the runs seat stamps a fresh createdAt on write-back; refetch
            setTick((t) => t + 1)
            return
          }
        }
      } catch {
        // an aborted tail is the unmount, not a failure; a dead
        // stream (supervisor gave up, carrier ended early) re-reads
        // the draft doc via the tick refresh — the card's face never
        // freezes pretending (the poll's own silent-transient law)
        if (alive && !controller.signal.aborted) setTick((t) => t + 1)
      }
    })()
    return () => { alive = false; controller.abort() }
  }, [liveRunId])

  return { doc, live, error, refresh, startedRun }
}

/** The chat-listed card row: kind tag, title, service, status dot, prompt.
 *  THE CLICK opens the AUTHORING SURFACE in the Cards tab (the old
 *  embed's law — timeline, video preview, per-gen splits, global
 *  audio) when the shell face is installed; without a shell (unit
 *  tests, headless harnesses) it falls back to the in-card drill.
 *  THE ROW ERROR DISMISS (operator 2026-11-05: the failure
 *  description under the card stuck FOREVER with no way out): the
 *  red × retires the row's error face for THIS text — the row keeps
 *  its truth (status dot stays failed), so a new refusal re-voices.
 *  The × consumes its click (the ToolRow file-link law: the row
 *  button underneath must not open). The voice itself is resolved
 *  by the owner (silenced entries never arrive here). */
function CardRowLine({ row, error, onOpen, onDismissError }: {
  row: CardRow
  /** The row's voiced error text, or undefined when silent (retired
   *  by the owner, or the row never failed). */
  error: string | undefined
  onOpen: () => void
  /** Retire the voiced error; absent when there is no voice (no dead control). */
  onDismissError?: (() => void) | undefined
}) {
  // ONE MAP, BOTH PLANES (2026-10-01): the dot is bench-row's
  // STATUS_DOT over the folded CardStatus — the inline five-word map
  // is gone, so the chat tile and the bench tile can no longer
  // disagree. pending (never ran or unrecognized) shows no dot at all,
  // never a fake state.
  const dot = STATUS_DOT[row.status]
  // (flow-link F7, 2026-11-06) the row stays a real <button> and the
  // dismiss × rides OUTSIDE it — a nested interactive child is an
  // invalid content model (React logs it; browsers may re-parent the
  // control out of the row). The wrap carries the relative frame and
  // the × is the row's absolutely positioned sibling.
  const dismiss = onDismissError !== undefined && error !== undefined ? (
    <Button
      size="sm"
      variant="ghost"
      className={css.errorDismiss}
      aria-label={chromeCopy.dismissError}
      onClick={(e: { stopPropagation(): void }) => { e.stopPropagation(); onDismissError() }}
    >
      <IconCloseOutlineRegular size={12} />
    </Button>
  ) : null
  return (
    <div className={css.rowWrap}>
      <button type="button" className={css.row} onClick={onOpen} data-stage={row.stageId} data-status={row.status}>
        {row.thumbUrl !== null
          ? <img className={css.thumb} src={row.thumbUrl} alt={row.title} loading="lazy" />
          : <Pill>{row.kind}</Pill>}
        <span className={css.rowTitle}>{row.title}</span>
        {row.service !== null && <Pill>{row.service}</Pill>}
        {dot !== null && <StateDot state={dot} />}
        {row.prompt !== null && <span className={css.prompt}>{row.prompt}</span>}
        {error !== undefined && <span className={css.rowError} role="alert">{error}</span>}
      </button>
      {dismiss}
    </div>
  )
}

/** One melite_flow call as the REAL action cards (native React, in-tree). */
export function FlowCards({ block, openSurface, openMedia }: FlowCardsProps) {
  const parsed = useMemo(() => parseCardsBlock(block), [block])
  const { doc, live, error, refresh, startedRun } = useDraft(parsed.draftId)
  const [openStage, setOpenStage] = useState<string | null>(null)

  // A settled, successful call whose result predates the draft contract
  // (render text without a draft token) is a LEGACY block — it can never
  // mount cards. Never show it an eternal "composing…" (2026-08-22
  // "GETS STUCK: composing" verdict); render the inert superseded note.
  const legacy = parsed.settled && !parsed.isError && parsed.draftId === null
  if (legacy) {
    return (
      <div className={css.card} data-dsh-part="melite-flow-card" data-legacy="1">
        <div className={css.head}>
          <Pill>{chromeCopy.brand}</Pill>
          <span className={css.model}>{parsed.model ?? chromeCopy.flowFallback}</span>
          <span className={css.state} data-state="legacy">{chromeCopy.cardsEarlierDraft}</span>
        </div>
      </div>
    )
  }

  if (parsed.draftId === null) {
    return (
      <div className={css.card} data-dsh-part="melite-flow-card">
        <div className={css.load}>{parsed.isError ? chromeCopy.draftFailed : chromeCopy.composing}</div>
      </div>
    )
  }

  const rows = doc !== null ? cardRows(doc, live) : []
  // Q3 (operator 2026-11-09) — THE FROZEN CHAT PREVIEWS: the settled
  // stages' own artifacts render INLINE in the thread (not only the
  // bench link). One hero per stage through the shared card-base
  // faces, derived off the already-fetched doc — the card opens no
  // live tail here (no hydrate, no subscribe), so the thread keeps a
  // replay-safe snapshot while the bench owns live progress.
  const previews = doc !== null ? chatPreviewsFor(doc.stages) : []
  const openRow = rows.find((r) => r.stageId === openStage) ?? null
  const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {}
  // THE ROW-ERROR SILENCE (the dismissal law's chat-card half):
  // stage id → retired error text. A row voices its error unless
  // THIS text was retired; a changed text, or any text after the
  // row went clean, re-voices. The prune below retires the
  // silence when the row goes clean — without it a repeated
  // failure would stay swallowed by a stale entry.
  const [silencedRowErrors, setSilencedRowErrors] = useState<Record<string, string>>({})
  // The voiced set, spelled stable (stage + error text): the prune
  // below runs only when membership or voices move, never per
  // render (rows is a fresh array every render).
  const voicedErrors = rows.map((r) => r.stageId + ':' + (r.error ?? '')).join('|')
  useEffect(() => {
    setSilencedRowErrors((prev) => {
      const ids = Object.keys(prev)
      if (ids.length === 0) return prev
      let next: Record<string, string> | null = null
      for (const id of ids) {
        const row = rows.find((r) => r.stageId === id)
        if (row === undefined || row.error !== prev[id]) {
          if (next === null) next = { ...prev }
          delete next[id]
        }
      }
      return next ?? prev
    })
  }, [voicedErrors])

  return (
    <div className={css.card} data-dsh-part="melite-flow-card" data-draft-id={parsed.draftId}>
      <div className={css.head}>
        <span className={css.badge}>{chromeCopy.brand}</span>
        <span className={css.model}>{doc?.intent ?? parsed.model ?? chromeCopy.flowFallback}</span>
        {/* L10: a corrupt args body badges — never a header-less
            render that reads as a model-less call */}
        {parsed.malformedArgs && <span className={css.state} data-state="error">{chromeCopy.argsUnparseable}</span>}
        {error !== null && <span className={css.state} data-state="error" role="button" tabIndex={0} onClick={refresh} onKeyDown={refresh}>{error}{chromeCopy.retrySuffix}</span>}
        {/* The media door: the card's runs land in the shell's Media
            page, and the header names that door. The ROW click stays
            the authoring open (the law above); this is the card-level
            archive affordance, rendered only when the register site
            provides the shell face. */}
        {openMedia !== undefined && <button type="button" className={css.media} onClick={() => { openMedia() }}>{chromeCopy.openMedia}</button>}
      </div>
      {doc === null && error === null && <div className={css.load}>{chromeCopy.cardsLoading}</div>}
      {rows.map((row) => {
        // The voiced error: the row's failure unless THIS text was
        // retired — the const narrowing carries the string into the
        // dismiss verb below (no cast: the check owns the type).
        const voice = row.error !== undefined && silencedRowErrors[row.stageId] !== row.error ? row.error : undefined
        return (
          <CardRowLine key={row.stageId} row={row}
            error={voice}
            onDismissError={voice !== undefined
              ? () => { setSilencedRowErrors((prev) => ({ ...prev, [row.stageId]: voice })) }
              : undefined}
            onOpen={() => {
            // THE OLD LAW: the chat card opens the authoring surface —
            // the studio (or the generic zoom card for studio-less
            // cards) in the shell's Cards tab, addressed to THIS stage.
            // No shell face → the in-card drill (the degraded path,
            // never a throw).
            const address = parsed.draftId === null ? null : cardsDraftStageAddress(parsed.draftId, row.stageId)
            if (address === null || openSurface?.(address) !== true) {
              setOpenStage(row.stageId)
            }
          }} />
        )
      })}
      {previews.map((preview) => {
        // THE FROZEN OWNER: the settled stage's own artifact through
        // the shared hero — history strip off (the thread shows the
        // settled output, not the bench's output history), runId
        // empty (no live run is bound in the chat card).
        const owner = {
          kind: preview.kind,
          artifacts: preview.artifacts,
          runStatus: preview.runStatus,
          stageId: preview.stageId,
          runId: '',
          historyStrip: false,
        }
        return (
          <div key={preview.stageId} className={css.chatPreview} data-chat-preview={preview.kind}>
            {preview.kind === 'video'
              ? <VideoStagePreview {...owner} />
              : preview.kind === 'audio'
                ? <AudioStagePreview {...owner} />
                : <ImageStagePreview {...owner} />}
          </div>
        )
      })}
      {openRow !== null && (
        <CardDrill
          title={chromeCopy.cardTitle({ name: openRow.title })}
          fields={paramFields(openParams)}
          thumbUrl={openRow.thumbUrl ?? null}
          running={false}
          stages={doc?.stages ?? []}
          onRun={async (patch) => {
            // The shared-state law: the patch lands in the domain
            // BEFORE the run reads it — the card runs what the user
            // SEES. A patch failure names itself and stops the run.
            // THE RUN GATE (the one-press/one-engine law, audit
            // 2026-09-23: this tile awaited its OWN patch but never
            // consulted the ledger — any other in-flight or failed
            // write for the stage ran past it). A refusal throws
            // into the drill's runError face, same as a patch
            // failure — never silent, never a run.
            const draftId = parsed.draftId
            if (draftId === null) throw new Error('draft id gone')
            if (patch !== null) await patchStageParams(draftId, openRow.stageId, patch)
            const gate = await refuseForUnlandedWrite(draftId, openRow.stageId)
            if (gate !== null) throw new Error(gate)
            startedRun(await startDraft(draftId))
            setOpenStage(null)
            refresh()
          }}
          onClose={() => { setOpenStage(null); refresh() }}
        />
      )}
    </div>
  )
}
