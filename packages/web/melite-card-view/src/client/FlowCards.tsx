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
 *         poll over the runs/status remote IS the live channel until
 *         the collapse plan's stream remote exists (@Remote
 *         ({mode:'stream'}) over the mux). The fold mapping
 *         (idempotent stage frames by INDEX — the estate mapping law)
 *         stays in draft.ts for that day.
 *   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
 *         package wraps the estate's remotes as a browser client; the
 *         thin wire caller (client-request frame, api-gateway.md) is
 *         the sanctioned shape for plugins outside the web kernel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import css from './card.module.css'
import { Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { cardsDraftStageAddress } from './cards-resource.ts'
import type { ToolCallBlockView } from './types.ts'
import {
  cardRows, fetchDraft, paramFields, patchStageParams, refuseForUnlandedWrite, runFinished, runStatus, startDraft,
} from './draft.ts'
import type { CardRow, DraftDoc, RunStatusDoc } from './draft.ts'

/** Run-status poll cadence (the editor's door, cheap same-host read). */
const POLL_MS = 1500

export interface FlowCardsProps {
  block: ToolCallBlockView
  /** The shell's navigation face — the register site's inject share
   *  (the client contract's own channel for cross-surface callbacks;
   *  the entry captures ctx.sidebarRight.openResource there). Absent
   *  in headless harnesses/tests: the row degrades to the in-card
   *  drill, never throws. Returns false when the shell refused. */
  openSurface?: (address: string) => boolean
}

/** Parse the melite_flow / card-tool call: the draft id + the model
 *  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
 *  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
 *  every card tool emits it; the handle is read from meta, never
 *  parsed out of prose. The render-text token ('card <draftId>') is
 *  the LEGACY fallback: sessions logged before a tool grew its
 *  projector still hydrate through the parse rule. */
export function parseCardsBlock(block: ToolCallBlockView): {
  draftId: string | null
  model: string | null
  settled: boolean
  isError: boolean
} {
  const settled = block.kind === 'tool-result'
  const argsRaw = settled ? (block.call?.argsRaw ?? '') : (block.argsRaw ?? '')
  let model: string | null = null
  if (argsRaw !== '') {
    try {
      const args = JSON.parse(argsRaw) as Record<string, unknown>
      if (typeof args['model'] === 'string' && args['model'] !== '') model = args['model']
    } catch {
      // malformed args render header-less; never throws
    }
  }
  let draftId: string | null = null
  if (settled && block.isError !== true) {
    // 1. NATIVE: the persisted presentationMeta payload.
    const meta = block.meta
    if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
      const id = (meta as Record<string, unknown>)['draft_id']
      if (typeof id === 'string' && id !== '') draftId = id
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
        if ((tok.startsWith('draft-') || tok.startsWith('p_')) && tok.length > 2) { draftId = tok; break }
      }
    }
  }
  return { draftId, model, settled, isError: block.isError === true }
}

/** Draft doc + live run status, fetched and polled (all doors in draft.ts). */
function useDraft(draftId: string | null): {
  doc: DraftDoc | null
  live: RunStatusDoc | null
  error: string | null
  refresh: () => void
} {
  const [doc, setDoc] = useState<DraftDoc | null>(null)
  const [live, setLive] = useState<RunStatusDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(() => { setTick((t) => t + 1) }, [])

  // Hydrate the doc (one GET per draftId or manual refresh; never a storm).
  useEffect(() => {
    if (draftId === null) return
    let alive = true
    setDoc(null)
    setLive(null)
    setError(null)
    fetchDraft(draftId)
      .then((d) => { if (alive) setDoc(d) })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'draft hydration failed') })
    return () => { alive = false }
  }, [draftId, tick])

  // THE LIVE RUN — the gateway-era events WS died with the gateway
  // app (nothing serves it, by design); until the collapse plan's
  // stream remote exists (@Remote({mode:'stream'}) over the mux),
  // the poll below IS the live channel — the runs/status remote over
  // the wire frame, terminal authority by construction.
  const runId = live?.run_id ?? null

  // The poll — stops on a terminal status, then refreshes the draft
  // doc (the runs seat stamps a fresh createdAt on write-back).
  useEffect(() => {
    if (runId === null) return
    let alive = true
    const step = (): void => {
      runStatus(runId)
        .then((s) => {
          if (!alive) return
          setLive(s)
          if (runFinished(s.status)) {
            if (pollRef.current !== null) window.clearInterval(pollRef.current)
            pollRef.current = null
            // the runs seat stamps a fresh createdAt on write-back; refetch
            setTick((t) => t + 1)
          }
        })
        .catch(() => { /* transient poll failure: keep the interval */ })
    }
    step()
    pollRef.current = window.setInterval(step, POLL_MS)
    return () => {
      alive = false
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [runId])

  return { doc, live, error, refresh }
}

/** The chat-listed card row: kind tag, title, service, status dot, prompt.
 *  THE CLICK opens the AUTHORING SURFACE in the Cards tab (the old
 *  embed's law — timeline, video preview, per-gen splits, global
 *  audio) when the shell face is installed; without a shell (unit
 *  tests, headless harnesses) it falls back to the in-card drill. */
function CardRowLine({ row, onOpen }: { row: CardRow; onOpen: () => void }) {
  // installed StateDot union: done | warning | ongoing | error — a
  // READY card (never run) shows no dot at all, not a fake state.
  const dot: Record<CardRow['status'], 'done' | 'ongoing' | 'error' | 'warning' | null> = {
    queued: 'warning', running: 'ongoing', done: 'done', failed: 'error', ready: null,
  }
  return (
    <button type="button" className={css.row} onClick={onOpen} data-stage={row.stageId} data-status={row.status}>
      {row.thumbUrl !== null
        ? <img className={css.thumb} src={row.thumbUrl} alt={row.title} loading="lazy" />
        : <Pill>{row.kind}</Pill>}
      <span className={css.rowTitle}>{row.title}</span>
      {row.service !== null && <Pill>{row.service}</Pill>}
      {dot[row.status] !== null && <StateDot state={dot[row.status] as 'done' | 'ongoing' | 'error' | 'warning'} />}
      {row.prompt !== null && <span className={css.prompt}>{row.prompt}</span>}
    </button>
  )
}

/** One melite_flow call as the REAL action cards (native React, in-tree). */
export function FlowCards({ block, openSurface }: FlowCardsProps) {
  const parsed = useMemo(() => parseCardsBlock(block), [block])
  const { doc, live, error, refresh } = useDraft(parsed.draftId)
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
          <Pill>melite</Pill>
          <span className={css.model}>{parsed.model ?? 'flow'}</span>
          <span className={css.state} data-state="legacy">cards · earlier draft</span>
        </div>
      </div>
    )
  }

  if (parsed.draftId === null) {
    return (
      <div className={css.card} data-dsh-part="melite-flow-card">
        <div className={css.load}>{parsed.isError ? 'draft failed' : 'composing…'}</div>
      </div>
    )
  }

  const rows = doc !== null ? cardRows(doc, live) : []
  const openRow = rows.find((r) => r.stageId === openStage) ?? null
  const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {}

  return (
    <div className={css.card} data-dsh-part="melite-flow-card" data-draft-id={parsed.draftId}>
      <div className={css.head}>
        <span className={css.badge}>melite</span>
        <span className={css.model}>{doc?.intent ?? parsed.model ?? 'flow'}</span>
        {error !== null && <span className={css.state} data-state="error" role="button" tabIndex={0} onClick={refresh} onKeyDown={refresh}>{error} · retry</span>}
      </div>
      {doc === null && error === null && <div className={css.load}>cards…</div>}
      {rows.map((row) => (
        <CardRowLine key={row.stageId} row={row} onOpen={() => {
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
      ))}
      {openRow !== null && (
        <CardDrill
          title={'Card ' + openRow.title}
          fields={paramFields(openParams)}
          thumbUrl={openRow.thumbUrl ?? null}
          running={false}
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
            await startDraft(draftId)
            setOpenStage(null)
            refresh()
          }}
          onClose={() => { setOpenStage(null); refresh() }}
        />
      )}
    </div>
  )
}
