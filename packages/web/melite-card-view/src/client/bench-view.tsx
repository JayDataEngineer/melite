/** bench-view.tsx — the bench user plane: the grouped tiles, the
 * reorder/group gestures, the drop zones (extracted from CardsTab.tsx
 * hour 15). */

import { BIRTH_STRIP_KEYS } from '@melite/contracts/benchStage'
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconLoadingOutlineRegular, IconPlayOutlineRegular, Input, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import { fetchFormSpec, fieldsOf } from '@melite/card-base/client'
import { forgetDraftWrites, patchStageParams } from './draft.ts'
import type { CardsDraftValue } from './cards-resource.ts'
import { fetchBench, benchSessionKey } from './cards-resource.ts'
import { uploadInputFile } from '@melite/card-base/client'
import { addStageWire, clearBenchWire, groupStagesWire, reorderStageWire, undoBenchWire } from './add-stage.ts'
import { CardZoomOverlay } from './zoom.tsx'

/** THE SAVE DIAL (audit V-E7): the ensure door wait is bounded —
 *  a hung bench door releases the busy fence instead of holding the
 *  save spinner forever. */
const SAVE_DIAL_MS = 20_000
import type { StageViewOwnerProps } from './types.ts'
import type { BenchStageView, CardsBenchValue } from './cards-resource.ts'
import { CAPABILITY_DRAG_MIME, ASSET_DRAG_MIME, parseCapabilityDrop, parseAssetDrop, isMalformedCapabilityDrop } from './dnd-payloads.ts'
import { benchRow, groupStagesByCard, rowRunning, type CardRowLineTabRow } from './bench-row.ts'
import { SortableTile } from './sortable-tile.tsx'
import { StageDrill } from './stage-drill.tsx'
import { AddCardDoor } from './add-card-door.tsx'
import { previewKindFor, previewArtifactsFor } from './preview-kinds.ts'
import { rejectionVoice, refusalVoice } from './rejection-voice.ts'
import { CAS_CONFLICT_CODE } from '@melite/card-base/client'
import { chromeCopy } from '../chromeCopy.ts'

export function BenchView({ bench, sessionKey, onRun, onRunStage, onStopStage, onRemoveStage, stageRuns, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick, startError, onDrillClose }: {
  sessionKey: string
  bench: CardsBenchValue
  onRun: () => void
  onRunStage: (stage: BenchStageView) => void
  /** the tile chrome's stop + remove verbs (the chat-input law). */
  onStopStage: (stage: BenchStageView) => void
  onRemoveStage: (stage: BenchStageView) => void
  stageRuns: Record<string, string>
  running: boolean
  onPatchParams: (stage: BenchStageView, patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh' | 'text', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId?: string | null
  /** The outcome observer's touch — the rail re-reads so tile
   *  runStatus/result stay live without ever leaving the bench. */
  refreshTick?: number
  /** THE START-ERROR SEAM (stroke 25): a run-start rejection rides
   *  INTO the open drill's webhook bar — the tab-level seat renders
   *  behind the zoom overlay, invisible where Run was pressed. */
  startError?: string | null
  /** THE CLAIM-RETIREMENT SEAM (2026-10-18, the fresh-open law):
   *  closing the drill is the operator dismissing the refusal's
   *  face — the start claim retires with it, so reopening a card
   *  never re-shows a refusal the operator already closed. */
  onDrillClose?: () => void
}): ReturnType<typeof h> {
  // The LIVE bench: the resource snapshot is the first frame only (the
  // provider's bench stream ends after one snapshot), so the view owns
  // its copy and reloads after its own edits — same-address navigation
  // does not re-run the stream.
  const [live, setLive] = useState<CardsBenchValue>(bench)
  useEffect(() => { setLive(bench) }, [bench.draftId, bench.rev])
  // TILE-POP (the old tree's animate-tile-pop): a tile whose id was not
  // in the previous render's set lands with the soft pop — fresh adds,
  // not reloads of the same bench.
  const knownIds = useRef<Set<string>>(new Set(bench.stages.map((s) => s.id)))
  const [entered, setEntered] = useState<Set<string>>(new Set())
  useEffect(() => {
    const fresh: string[] = []
    for (const s of live.stages) {
      if (!knownIds.current.has(s.id)) { knownIds.current.add(s.id); fresh.push(s.id) }
    }
    if (fresh.length > 0) {
      setEntered((prev) => { const next = new Set(prev); for (const id of fresh) next.add(id); return next })
    }
  }, [live.stages])
  const [open, setOpen] = useState<BenchStageView | null>(null)
  const [adding, setAdding] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  // THE MOUNT TELEMETRY (audit L-ERROR-4, 2026-10-22): the reload,
  // attach, and save chains used to run unabortable and
  // unguarded — a dead view kept setLive'ing, concurrent reloads
  // raced last-settler-wins, and Save double-click twin-ensured.
  // The mount controller scopes the abortable reads; the in-flight
  // flags scope the verbs.
  const mountAbort = useRef<AbortController | null>(null)
  if (mountAbort.current === null) mountAbort.current = new AbortController()
  useEffect(() => () => { mountAbort.current?.abort() }, [])
  const attachingRef = useRef(false)
  const saveBusyRef = useRef(false)
  // THE CLEAR ALL (2026-10-10, the operator's demand, two-step like
  // every destructive control here): the button arms, the second
  // press clears. No native confirm() (it is a blocking dialog with
  // no voice of ours and no testable shape) — the chrome states the
  // consequence and the door is one click away.
  const [clearing, setClearing] = useState(false)
  // THE IN-FLIGHT FENCE (card-view F4): while a clear wire is in
  // flight the whole gesture is inert — a press during the flight
  // must neither re-arm (a stale-rev second wire would refuse) nor
  // double-fire (a landed clear's second call appends a no-op undo
  // entry that makes Undo look broken)
  const clearFlight = useRef(false)
  const onOpen = useCallback((stage: BenchStageView): void => setOpen(stage), [])
  const onDrillCloseRef = useRef(onDrillClose)
  onDrillCloseRef.current = onDrillClose
  const closeDrill = useCallback((): void => {
    setOpen(null)
    onDrillCloseRef.current?.()
  }, [])
  const onClose = closeDrill
  const onAddCard = useCallback((): void => setAdding(true), [])
  // keepOpen: the wire path — the drill STAYS OPEN and its stage row
  // swaps to the fresh one (the old system updated the wire in place;
  // only remove-stage closes the drill).
  useEffect(() => {
    if (refreshTick !== undefined && refreshTick > 0) reload({ keepOpen: true })
  }, [refreshTick])
  const reload = useCallback((opts?: { keepOpen?: boolean }): void => {
    setReloadError(null)
    // the abortable read + the single-flight law: a newer reload
    // supersedes an older flight's landing (last-press-wins, not
    // last-settler-wins — the abort makes the loser quiet)
    fetchBench(sessionKey, mountAbort.current?.signal)
      .then((next) => {
        setLive(next)
        if (opts?.keepOpen === true) {
          setOpen((cur) => cur === null ? null : (next.stages.find((s) => s.id === cur.id) ?? null))
        } else {
          closeDrill()
        }
      })
      .catch((e: unknown) => {
        if (mountAbort.current?.signal.aborted === true) return // the unmount owns the face
        setReloadError(rejectionVoice(e))
      })
  }, [sessionKey])
  const onClear = useCallback((): void => {
    if (clearFlight.current) return
    if (!clearing) { setClearing(true); return }
    setClearing(false)
    clearFlight.current = true
    setReloadError(null)
    clearBenchWire({ expect_rev: live.rev }, sessionKey)
      // THE LEDGER'S INVALIDATION (audit V-S5): the clear killed every
      // stage — no row's write memory survives it
      .then(() => { forgetDraftWrites(live.draftId); closeDrill(); reload() })
      .catch((e: unknown) => { setReloadError('clear refused — ' + (rejectionVoice(e))) })
      .finally(() => { clearFlight.current = false })
  }, [clearing, live.rev, live.draftId, sessionKey, reload])
  // THE WALKABLE REVISION LOG (2026-10-13): one press reverts the
  // log tail's newest action — no confirm step (undo RESTORES; the
  // two-step law arms only destructive controls). The gate is the
  // streamed log heads themselves: an ACTION entry (any kind but
  // 'undo') is a candidate; a log of undos alone offers no drag.
  const canUndo = live.log.some((e) => typeof e.kind === 'string' && e.kind !== 'undo')
  const [undoing, setUndoing] = useState(false)
  const onUndo = useCallback((): void => {
    if (undoing) return
    setUndoing(true)
    setReloadError(null)
    undoBenchWire({ expect_rev: live.rev }, sessionKey)
      // THE LEDGER'S INVALIDATION (audit V-S5): the undo rewound the
      // log — the ledger's memory of every stage this bench rendered
      // is stale truth, so the whole draft's rows go
      .then(() => { forgetDraftWrites(live.draftId); closeDrill(); reload() })
      .catch((e: unknown) => { setReloadError('undo refused — ' + (rejectionVoice(e))) })
      .finally(() => { setUndoing(false) })
  }, [undoing, live.rev, live.draftId, sessionKey, reload])

  const onAdded = useCallback((): void => {
    setAdding(false)
    reload()
  }, [reload])
  // ── DRAG REORDER (native HTML5 sortable — the dnd-kit purge; DSH
  //    ships no drag library): optimistic splice, then the door; a
  //    refusal reloads the truth. The verb is the old one verbatim.
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const onReorderStart = useCallback((id: string | null): void => {
    setDragId(id)
    if (id === null) setOverId(null)
  }, [])
  const onReorderOver = useCallback((id: string): void => { setOverId(id) }, [])
  const onReorderDrop = useCallback((active: string, over: string): void => {
    setDragId(null)
    setOverId(null)
    if (over === active || over === 'add') return
    const from = live.stages.findIndex((s) => s.id === active)
    const to = live.stages.findIndex((s) => s.id === over)
    if (from < 0 || to < 0) return
    const next = live.stages.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const beforeRev = live.rev
    setLive((cur) => ({ ...cur, stages: next }))
    // `after` is the drop's anchor (the F1-residue cure, round 25):
    // the id the press targeted in THIS list. A second author's write
    // between the press and its answer (or inside the rebase retry)
    // re-derives the slot from the anchor server-side, so the intent
    // — "this card, after that one" — survives the shift instead of
    // silently landing at a stale numeric slot.
    void reorderStageWire({ stage: active, to, after: over, expect_rev: beforeRev }, sessionKey)
      .then((row) => {
        /* v8 ignore next 1 -- rebase answers always carry a numeric rev (probe 2026-09-19) — the +1 arm is the transport fence */
        const rev = typeof row['rev'] === 'number' ? row['rev'] as number : beforeRev + 1
        /* v8 ignore next 1 -- reorder answers always carry the clamped `to` (probe 2026-10-10) — the fallback arm is the transport fence */
        const wireTo = typeof row['to'] === 'number' ? row['to'] as number : to
        // THE CLAMP REACHES THE TILES (the round-19 reorder audit's F1):
        // the door clamps `to` against the list IT holds, so a second
        // author's write between this drop and its answer can land the
        // stage at a slot the optimistic splice never showed. Re-place
        // the stage by id at the slot the door reports — the wire's
        // answer is the order; the pre-flight guess is not.
        setLive((cur) => {
          const stages = cur.stages.slice()
          const at = stages.findIndex((s) => s.id === active)
          if (at < 0) return { ...cur, rev }
          const [moved] = stages.splice(at, 1)
          if (moved === undefined) return { ...cur, rev }
          stages.splice(Math.max(0, Math.min(wireTo, stages.length)), 0, moved)
          return { ...cur, stages, rev }
        })
      })
      .catch((err: unknown) => {
        setReloadError(rejectionVoice(err))
        reload()
      })
  }, [live, reload])
  // ── TILE-ON-TILE WIRE, click form (2026-09-11): the ⛓ button arms a
  // ── CAPABILITY / ASSET / FILE DROP SURFACE (slice 3): the grid is
  //    the old onCardsDrop target reborn — capability tile lands a new
  //    stage; asset tile lands an input-prep card; OS image file rides
  //    the /v1/uploads door then lands the same way.
  const [capOver, setCapOver] = useState(false)
  const dropInterested = (e: React.DragEvent): boolean =>
    e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)
    || e.dataTransfer.types.includes(ASSET_DRAG_MIME)
    || e.dataTransfer.types.includes('Files')
  const onGridDragOver = useCallback((e: React.DragEvent): void => {
    if (!dropInterested(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setCapOver(true)
  }, [])
  const onGridDragLeave = useCallback((e: React.DragEvent): void => {
    if (e.relatedTarget === null) setCapOver(false)
  }, [])
  const onGridDrop = useCallback((e: React.DragEvent): void => {
    if (!dropInterested(e)) return
    e.preventDefault()
    setCapOver(false)
    if (e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)) {
      const raw = e.dataTransfer.getData(CAPABILITY_DRAG_MIME)
      const cap = parseCapabilityDrop(raw)
      if (cap === null) {
        // L9: a PRESENT-but-corrupt capability body badges — the drag
        // was ours, so a silent no-op reads as breakage. Foreign/empty
        // data stays quiet (that is the fall-through contract).
        if (isMalformedCapabilityDrop(raw)) {
          setReloadError('That capability drag is malformed \u2014 reload the tab and drag the tile again')
        }
        return
      }
      // the door's ADD_KEYS carry no `title` — stages are named by
      // their card (benchRow: title ?? card ?? id); the payload's
      // title is diagnostics, not a stage field.
      void addStageWire({
        card: cap.service,
        ...(cap.params !== undefined && Object.keys(cap.params).length > 0 ? { params: cap.params } : {}),
        expect_rev: live.rev,
      }, sessionKey)
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(rejectionVoice(err)) })
      return
    }
    if (e.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
      const payload = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME))
      if ((payload.url ?? '') === '') return
      const t = payload.type ?? ''
      const ok = t.startsWith('image/') || t.startsWith('audio/')
      if (!ok) {
        setReloadError(t !== '' ? 'Input cards don\u2019t accept ' + t + ' assets' : 'That asset isn\u2019t supported \u2014 drop an image or audio asset')
        return
      }
      void addStageWire({
        card: 'input-prep',
        params: { source: payload.url },
        expect_rev: live.rev,
      }, sessionKey)
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(rejectionVoice(err)) })
      return
    }
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      void uploadInputFile(file, mountAbort.current?.signal)
        .then(({ name }) => addStageWire({
          card: 'input-prep',
          params: { source: name },
          expect_rev: live.rev,
        }, sessionKey))
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(rejectionVoice(err)) })
    }
  }, [live, reload])
  // ── GROUP CARDS SUB-VIEW (2026-09-11, the old 2026-08-12 law):
  //    the header's Group action flips the grid into selection mode —
  //    check circles on tiles, clicks toggle selection (no zoom, no
  //    reorder), the floating bar carries Group N cards / Cancel, Esc
  //    clears. Group → bench/group with the bench-ordered ids.
  const [grouping, setGrouping] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
    /* v8 ignore next 9 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
  const onToggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
    /* v8 ignore next 5 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
  const exitGrouping = useCallback((): void => {
    setGrouping(false)
    setSelectedIds(new Set())
  }, [])
    /* v8 ignore next 12 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
  useEffect(() => {
    if (!grouping) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement | null
      if (t !== null && typeof t.closest === 'function'
          && t.closest('input, textarea, select, [contenteditable]') !== null) return
      exitGrouping()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [grouping, exitGrouping])
  // drop selections whose stages vanished (grouped away / removed)
    /* v8 ignore next 11 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
  useEffect(() => {
    if (selectedIds.size === 0) return
    const present = new Set(live.stages.map((s) => s.id))
    const stale = [...selectedIds].filter((id) => !present.has(id))
    if (stale.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of stale) next.delete(id)
      return next
    })
  }, [live.stages, selectedIds])
    /* v8 ignore next 9 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
  const onGroup = useCallback((): void => {
    const ordered = live.stages.map((s) => s.id).filter((id) => selectedIds.has(id))
    if (ordered.length < 2) return
    void groupStagesWire({ stages: ordered, expect_rev: live.rev }, sessionKey)
      .then(() => { exitGrouping(); reload() })
      .catch((err: unknown) => { setReloadError(rejectionVoice(err)) })
  }, [live, selectedIds, exitGrouping, reload])
  // ── DROP-ON-CARD ATTACHES TO SLOT: the asset URL (or the uploaded
  //    file's input-dir name) patches the TARGET stage's OWN image
  //    field — the card's form-spec names it ('source' on input-prep,
  //    'input_image' on img-to-mesh); a card without an image slot
  //    refuses honestly. Never a foreign key: undeclared params refuse
  //    at compose admission (the old SlotSquare's onDropAsset law).
  const onAssetAttach = useCallback((target: string, source: string | File, kind: 'image' | 'audio'): void => {
    /* v8 ignore next 1 -- attach targets are always live tile ids (the drop lane resolves them — probe 2026-09-19) */
    const row = live.stages.find((s) => s.id === target)
    /* v8 ignore next 3 -- attach targets are always live tile ids: SortableTile passes its own row.id from the same live.stages render (probe 2026-09-19); the dead-id arm is the stale-render fence */
    if (row === undefined) return
    // THE ATTACH FENCE (audit L-ERROR-4, 2026-10-22): one attach in
    // flight — a second drop during the spec/upload chain would twin
    // the patch. The dead view refuses silently (the unmount owns
    // the face); the live one re-arms at settle.
    if (mountAbort.current?.signal.aborted === true || attachingRef.current) return
    attachingRef.current = true
    /* v8 ignore next 1 -- attach targets are always live tile ids (probe 2026-09-19) */
    void fetchFormSpec(String(row.card))
      .then((spec) => {
        const field = fieldsOf(spec).find((f) => f.type === kind)
        if (field === undefined) throw new Error('the ' + String(row.card) + ' card has no ' + kind + ' slot')
        return field.name
      })
      .then((field) => (typeof source === 'string'
        ? Promise.resolve([field, source] as const)
        : uploadInputFile(source, mountAbort.current?.signal).then(({ name }) => [field, name] as const)))
      .then(async ([field, src]) => {
        // THE SETTLE RE-READ (audit 2026-10-22): the spec fetch and
        // the upload can outlive the row — re-read before the patch
        // so a removed row or a rebound draft refuses quiet, never
        // lands on a wrong row or a stale draft id.
        const fresh = await fetchBench(sessionKey, mountAbort.current?.signal)
        if (!fresh.stages.some((s) => s.id === target)) {
          throw new Error('the stage the file was dropped on is gone — attach again')
        }
        return patchStageParams(fresh.draftId, target, { [field]: src })
      })
      .then(() => {
        attachingRef.current = false
        reload({ keepOpen: true })
      })
      .catch((err: unknown) => {
        attachingRef.current = false
        if (mountAbort.current?.signal.aborted === true) return // the unmount owns the face
        setReloadError(rejectionVoice(err))
      })
  }, [live, reload])
  const benchRev = live.rev
  // SAVE (operator, stroke 46): mint the bench's stages as a NAMED
  // doc on the drafts domain — it lists in the gallery's Flows face
  // and restores onto any conversation's bench by click. The same
  // ensure door every bench write rides; the name slugs to the key.
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const onSave = useCallback((): void => {
    const name = saveName.trim()
    if (bench.kind !== 'bench' || name === '') return
    // THE SAVE FENCE (audit L-ERROR-4, 2026-10-22): the mint press
    // had no flight fence — a double-press twin-ensured. The ref is
    // the same-tick truth; `saving` stays the panel-open state it
    // always was (a refused or thrown mint leaves the door open for
    // retry), and every exit releases the mirror.
    if (saveBusyRef.current) return
    saveBusyRef.current = true
    const slug = 'saved-' + name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    setSaveError(null)
    // THE SAVE RIDES THE REBASE + STRIP LAWS (2026-10-10, the wire
    // audit's H3): this was a one-shot ensure with no expect_rev and
    // a hand-rolled strip of three keys — so saving the same name
    // twice answered a raw bench/cas-conflict (or overwrite-required)
    // at the operator, and the strip could miss a key the birth arm
    // strips. Both laws have owners now: the rebase add-stage rides,
    // and the strip is the CONTRACT's list, not three literals.
    const stages = bench.stages.map((st) => {
      const row: Record<string, unknown> = { ...st }
      for (const key of BIRTH_STRIP_KEYS) delete row[key]
      delete row['provenance']
      return row
    })
    const attempt = (expectRev: number | null, signal: AbortSignal): Promise<Response> =>
      fetch('/v1/bench/ensure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session: slug, author: 'user', intent: name, stages, overwrite: true,
          ...(expectRev === null ? {} : { expect_rev: expectRev }),
        }),
        signal,
      })
    // THE SAVE DIAL + THE CAS-ONLY REBASE (audit V-E7): the door
    // wait is bounded — a hung bench door lifts the busy fence
    // instead of holding it forever — and the fresh-doc re-assert
    // fires ONLY on the door's own 409 (bench/cas-conflict): the old
    // blind transport retry ate the first arm's voice and could
    // double-mint a write that had already landed. stages mint from
    // the press-time bench PROP on purpose: save what the operator
    // saw, not what live drifted to.
    const run = async (): Promise<void> => {
      const dial = AbortSignal.timeout(SAVE_DIAL_MS)
      try {
        let res = await attempt(null, dial)
        if (!res.ok) {
          // ONLY the door's own cas-conflict CODE earns the fresh-doc
          // re-assert — a slug-taken or validation 409 is a refusal to
          // surface, never to retry. The door's body carries the code
          // BESIDE the human voice (failEstate: the details ride, then
          // error = the message, code = the stable code) and
          // current_rev is the rev the re-assert re-mints against —
          // never 0, never the message text (audit W-E1: the first
          // cut compared the message to the code and the arm was dead
          // behind a fake that served the code as the error).
          const raw = await res.text()
          let body: Record<string, unknown> = {}
          try {
            const parsed: unknown = JSON.parse(raw)
            if (typeof parsed === 'object' && parsed !== null) body = parsed as Record<string, unknown>
          } catch (syntaxError) {
            // SyntaxError: a non-JSON refusal body — the raw text IS
            // the voice below, nothing to re-mint from
          }
          if (body['code'] !== CAS_CONFLICT_CODE || typeof body['current_rev'] !== 'number') {
            saveBusyRef.current = false
            // the named voice when the body carries one; the opaque
            // one keeps the status prefix (refusalVoice's convention)
            const voice = typeof body['error'] === 'string'
              ? body['error']
              : 'HTTP ' + String(res.status) + ': ' + raw
            setSaveError('save refused (' + voice + ')')
            return
          }
          res = await attempt(body['current_rev'], dial)
        }
        saveBusyRef.current = false
        if (!res.ok) { setSaveError('save refused (' + (await refusalVoice(res)) + ')'); return }
        setSaving(false); setSaveName('')
      } catch (e: unknown) {
        // the dial's own expiry lands here too: the fence lifts and
        // the voice names the bound, never a spinner forever
        saveBusyRef.current = false
        setSaveError('save failed — ' + (rejectionVoice(e)))
      }
    }
    void run()
  }, [bench, saveName])

  // THE PANEL OWNS ITS SCROLL (operator volley 2026-10-24, items
  // d+j — the flow-sidebar cure: the sibling tabScroll seat scrolls
  // the TAB, but the bench panel's own error rows must ride INSIDE
  // the panel's scroll content in order — the first error at its top,
  // never trapped above it). The save error used to render as a flex
  // item INSIDE the header's space-between row: a long refusal could
  // never take its own line, squeezed between the rev tag and the
  // button bar and overflowing the row box in a narrow sidebar — the
  // error flowed above the visible content and the top cut off. The
  // header carries chrome only (rev + buttons); every error row rides
  // below it, save first, reload second, the grid last.
  return h('section', { className: css.cardsBench, 'data-cards-bench': benchRev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + benchRev),
      h('span', { className: css.groupBar },
            h(Button, {
              size: 'sm',
              variant: 'outline',
              disabled: running || live.stages.length === 0,
              title: running ? chromeCopy.passRunning : chromeCopy.runAllHint,
              onClick: onRun,
            }, running ? h(IconLoadingOutlineRegular, { size: 14 }) : h(IconPlayOutlineRegular, { size: 14 }), chromeCopy.playLabel),
            // THE CLEAR ALL (2026-10-10): every stage out, one rev,
            // undo restores all. The wedge cure — a bench whose wiring
            // no repair verb could reach clears here.
            h(Button, {
              size: 'sm',
              variant: 'outline',
              disabled: running || live.stages.length === 0,
              ...{ 'data-bench-clear': clearing ? 'confirm' : 'idle' },
              title: clearing
                ? chromeCopy.clearConfirm
                : chromeCopy.clearHint,
              onClick: onClear,
            }, clearing ? 'Confirm clear' : 'Clear'),
            // THE UNDO (the walkable revision log): reverts the
            // newest action by rev — the streamed log head's own
            // candidate gate, one entry per press, agent or user.
            h(Button, {
              size: 'sm',
              variant: 'outline',
              disabled: running || !canUndo,
              ...{ 'data-bench-undo': '1' },
              title: canUndo
                ? chromeCopy.undoHint
                : chromeCopy.nothingToUndo,
              onClick: onUndo,
            }, undoing ? 'Undoing…' : 'Undo'),
            saving
              ? h('span', { className: css.groupBar },
                  h(Input, { value: saveName, placeholder: chromeCopy.flowNamePlaceholder, onChange: (e: { target: { value: string } }) => { setSaveName(e.target.value) } }),
                  h(Button, { size: 'sm', variant: 'outline', disabled: saveName.trim() === '', onClick: onSave }, chromeCopy.saveButton),
                  h(Button, { size: 'sm', variant: 'outline', onClick: () => { setSaving(false); setSaveError(null) } }, chromeCopy.cancelButton),
                )
              : h(Button, { size: 'sm', variant: 'outline', disabled: live.stages.length === 0, title: chromeCopy.saveFlowHint, onClick: () => { setSaving(true) } }, chromeCopy.saveButton),
          ),
    ),
    saveError !== null ? h('p', { className: css.runError, 'data-testid': 'bench-save-error' }, saveError) : null,
    reloadError !== null ? h('p', { className: css.runError, 'data-testid': 'bench-reload-error' }, reloadError) : null,
    // ONE SURFACE, NO STATES (operator, 2026-09-12: "Why is there an
    // empty state? Why does the sidebar have multiple states? That is
    // insane."): the tile grid is THE bench at every stage count —
    // zero stages shows exactly one thing, the standing Add tile (the
    // entry), because the grid ALWAYS carries it. No empty branch, no
    // special-cased render, no dead-end paragraph exists.
    h('ol', {
              className: css.tileGrid + (capOver ? ' ' + css.capOver : ''),
              onDragOver: onGridDragOver,
              onDragLeave: onGridDragLeave,
              onDrop: onGridDrop,
              'data-drop-surface': 'cards',
            },
              live.stages.map((s) => {
                const row = benchRow(s, live)
                return h(SortableTile, {
                  key: s.id, row, entered: entered.has(s.id),
                  onOpen: (r) => onOpen(r.stage),
                  grouping, selected: selectedIds.has(s.id), onToggleSelect, onAssetAttach,
                  dragging: dragId === s.id, dragOver: overId === s.id && dragId !== null && dragId !== s.id,
                  onReorderStart, onReorderOver, onReorderDrop,
                  onRun: (r) => onRunStage(r.stage),
                  onStop: (r) => onStopStage(r.stage),
                  onRemove: (r) => onRemoveStage(r.stage),
                  activeRunId: stageRuns[s.id] ?? null,
                })
              }),
              h('li', { className: css.tile + ' ' + css.tileAdd },
                h('button', { type: 'button', className: css.tileInner, 'aria-label': chromeCopy.addCard, onClick: onAddCard },
                  h('span', { className: css.tilePreview + ' ' + css.addFace }, '+'),
                  h('span', { className: css.tileCaption },
                    h('span', { className: css.tileTitle }, chromeCopy.addCard),
                  ),
                ),
              ),
            ),
    // THE ZOOM (2026-09-11): the drill is the shared-element morph —
    // the tile GROWS into the zoom card (spring 300/30), the modal is
    // dead (the old tree's own law: "the modal was a second surface;
    // both are dead").
    open !== null ? h(CardZoomOverlay, {
      key: 'zoom',
      stage: open,
      bench: live,
      startError,
      running,
      onRun: () => { onRunStage(open) },
      onStop: () => { onStopStage(open) },
      onClose,
      onRemoved: () => { closeDrill(); reload() },
      onPatchParams: (patch: Record<string, unknown>) => { onPatchParams(open, patch) },
      renderStageView,
      renderPreview,
      runId,
      detail: StageDrill,
    }) : null,
    adding ? h(AddCardDoor, {
      sessionKey,
      bench: live, onAdded, onClose: () => { setAdding(false) },
      // THE OPEN-ON-ADD (the old tree's law verbatim): the fresh
      // row's zoom (the drilldown; for a studio card the studio IS
      // its drilldown face — the real-card law) opens the moment
      // the door lands it.
      onAddedRow: (row: BenchStageView) => { setAdding(false); setOpen(row) },
    }) : null,
  )
}
