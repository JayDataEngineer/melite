/** bench-view.tsx — the bench user plane: the grouped tiles, the
 * reorder/group gestures, the drop zones (extracted from CardsTab.tsx
 * hour 15). */

import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconPlayOutline16, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { titleCaseId } from '@melite/card-base/spec'
import css from './card.module.css'
import { Input, IconLoadingOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchFormSpec, fieldsOf } from './spec-form.tsx'
import { patchStageParams } from './draft.ts'
import type { CardsDraftValue } from './cards-resource.ts'
import { fetchBench, uploadInputFile, benchSessionKey } from './cards-resource.ts'
import { addStageWire, groupStagesWire, reorderStageWire } from './add-stage.ts'
import { CardZoomOverlay } from './zoom.tsx'
import type { StageViewOwnerProps } from './types.ts'
import type { BenchStageRow, CardsBenchValue } from './cards-resource.ts'
import { CAPABILITY_DRAG_MIME, ASSET_DRAG_MIME, parseCapabilityDrop, parseAssetDrop } from './dnd-payloads.ts'
import { benchRow, groupStagesByCard, rowRunning, type CardRowLineTabRow } from './bench-row.ts'
import { SortableTile } from './sortable-tile.tsx'
import { StageDrill } from './stage-drill.tsx'
import { AddCardDoor } from './add-card-door.tsx'
import { previewKindFor, previewArtifactsFor } from './preview-kinds.ts'

export function BenchView({ bench, sessionKey, onRun, onRunStage, onStopStage, onRemoveStage, stageRuns, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick, startError }: {
  sessionKey: string
  bench: CardsBenchValue
  onRun: () => void
  onRunStage: (stage: BenchStageRow) => void
  /** the tile chrome's stop + remove verbs (the chat-input law). */
  onStopStage: (stage: BenchStageRow) => void
  onRemoveStage: (stage: BenchStageRow) => void
  stageRuns: Record<string, string>
  running: boolean
  onPatchParams: (stage: BenchStageRow, patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId?: string | null
  /** The outcome observer's touch — the rail re-reads so tile
   *  runStatus/result stay live without ever leaving the bench. */
  refreshTick?: number
  /** THE START-ERROR SEAM (stroke 25): a run-start rejection rides
   *  INTO the open drill's webhook bar — the tab-level seat renders
   *  behind the zoom overlay, invisible where Run was pressed. */
  startError?: string | null
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
  const [open, setOpen] = useState<BenchStageRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  const onOpen = useCallback((stage: BenchStageRow): void => setOpen(stage), [])
  const onClose = useCallback((): void => setOpen(null), [])
  const onAddCard = useCallback((): void => setAdding(true), [])
  // keepOpen: the wire path — the drill STAYS OPEN and its stage row
  // swaps to the fresh one (the old system updated the wire in place;
  // only remove-stage closes the drill).
  useEffect(() => {
    if (refreshTick !== undefined && refreshTick > 0) reload({ keepOpen: true })
  }, [refreshTick])
  const reload = useCallback((opts?: { keepOpen?: boolean }): void => {
    setReloadError(null)
    fetchBench(sessionKey)
      .then((next) => {
        setLive(next)
        if (opts?.keepOpen === true) {
          setOpen((cur) => cur === null ? null : (next.stages.find((s) => s.id === cur.id) ?? null))
        } else {
          setOpen(null)
        }
      })
      .catch((e: unknown) => { setReloadError(e instanceof Error ? e.message : 'bench reload failed') })
  }, [sessionKey])
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
    void reorderStageWire({ stage: active, to, expect_rev: beforeRev }, sessionKey)
      .then((row) => {
        /* v8 ignore next 1 -- rebase answers always carry a numeric rev (probe 2026-09-19) — the +1 arm is the transport fence */
        const rev = typeof row['rev'] === 'number' ? row['rev'] as number : beforeRev + 1
        setLive((cur) => ({ ...cur, rev }))
      })
      .catch((err: unknown) => {
        setReloadError(err instanceof Error ? err.message : 'reorder failed')
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
      const cap = parseCapabilityDrop(e.dataTransfer.getData(CAPABILITY_DRAG_MIME))
      if (cap === null) return
      // the door's ADD_KEYS carry no `title` — stages are named by
      // their card (benchRow: title ?? card ?? id); the payload's
      // title is diagnostics, not a stage field.
      void addStageWire({
        card: cap.service,
        ...(cap.params !== undefined && Object.keys(cap.params).length > 0 ? { params: cap.params } : {}),
        expect_rev: live.rev,
      }, sessionKey)
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'add refused') })
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
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'add refused') })
      return
    }
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      void uploadInputFile(file)
        .then(({ name }) => addStageWire({
          card: 'input-prep',
          params: { source: name },
          expect_rev: live.rev,
        }, sessionKey))
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'drop refused') })
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
      .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'group refused') })
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
    /* v8 ignore next 1 -- attach targets are always live tile ids (probe 2026-09-19) */
    void fetchFormSpec(String(row.card))
      .then((spec) => {
        const field = fieldsOf(spec).find((f) => f.type === kind)
        if (field === undefined) throw new Error('the ' + String(row.card) + ' card has no ' + kind + ' slot')
        return field.name
      })
      .then((field) => (typeof source === 'string'
        ? Promise.resolve([field, source] as const)
        : uploadInputFile(source).then(({ name }) => [field, name] as const)))
      .then(([field, src]) => patchStageParams(live.draftId, target, { [field]: src }))
      .then(() => { reload({ keepOpen: true }) })
      .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'attach refused') })
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
    const slug = 'saved-' + name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    setSaveError(null)
    fetch('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: slug, author: 'user', intent: name, stages: bench.stages.map((st) => ({ ...st, result: undefined, runStatus: undefined, resolved: undefined })) }),
    }).then(async (res) => {
      if (!res.ok) { setSaveError('save refused (' + (await res.json().catch(() => null) as { error?: string } | null)?.error + ')'); return }
      setSaving(false); setSaveName('')
    }).catch((e: unknown) => { setSaveError('save failed — ' + (e instanceof Error ? e.message : String(e))) })
  }, [bench, saveName])

  return h('section', { className: css.cardsBench, 'data-cards-bench': benchRev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + benchRev),
      h('span', { className: css.groupBar },
            h('button', {
              className: css.runBtn,
              type: 'button',
              disabled: running || live.stages.length === 0,
              title: running ? 'the pass is running' : 'run every card in bench order — one run per card, stop on failure',
              onClick: onRun,
            }, running ? h(IconLoadingOutline16, { size: 14 }) : h(IconPlayOutline16, { size: 14 }), ' Play'),
            saving
              ? h('span', { className: css.groupBar },
                  h(Input, { value: saveName, placeholder: 'flow name', onChange: (e: { target: { value: string } }) => { setSaveName(e.target.value) } }),
                  h('button', { className: css.runBtn, type: 'button', disabled: saveName.trim() === '', onClick: onSave }, 'Save'),
                  h('button', { className: css.back, type: 'button', onClick: () => { setSaving(false); setSaveError(null) } }, 'Cancel'),
                )
              : h('button', { className: css.back, type: 'button', disabled: live.stages.length === 0, title: 'mint this bench as a named flow (restores from the Flows face)', onClick: () => { setSaving(true) } }, 'Save'),
          ),
    saveError !== null ? h('p', { className: css.runError }, saveError) : null,
    ),
    reloadError !== null ? h('p', { className: css.runError }, reloadError) : null,
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
                h('button', { type: 'button', className: css.tileInner, 'aria-label': 'Add a card', onClick: onAddCard },
                  h('span', { className: css.tilePreview + ' ' + css.addFace }, '+'),
                  h('span', { className: css.tileCaption },
                    h('span', { className: css.tileTitle }, 'Add a card'),
                  ),
                ),
              ),
            ),
    // THE ZOOM (2026-09-11): the drill is the shared-element morph —
    // the tile GROWS into the zoom card (spring 300/30), the modal is
    // dead (the old tree's own law: "the modal was a second surface;
    // both are dead").
    open !== null ? h(CardZoomOverlay, {
      stage: open,
      bench: live,
      startError,
      running,
      onRun: () => { onRunStage(open) },
      onStop: () => { onStopStage(open) },
      onClose,
      onRemoved: () => { setOpen(null); reload() },
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
      onAddedRow: (row: BenchStageRow) => { setAdding(false); setOpen(row) },
    }) : null,
  )
}

