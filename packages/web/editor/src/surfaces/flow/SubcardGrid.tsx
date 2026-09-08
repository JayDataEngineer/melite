"use client"

// SubcardGrid — the mini-grid of modifier subcards (L2 in
// docs/design/modifier-subcards.md). Renders inside the drill-down's "add
// modifiers" region, mirroring the main view: mini tiles + an add tile;
// clicking a tile opens the leaf modal (L3 — SubcardModal) instead of an
// expansion.
//
// verified React 19 peer support. Apply order = array order (structural:
// apply_controlnets / apply_loras chain in array order), so reordering the
// tiles rewrites params.controlnets[] / params.loras[] and the composed
// ComfyUI graph follows. Cross-kind drops are no-ops — the wire keeps two
// arrays; a LoRA cannot swap places with a ControlNet.
//
// The grid is a pure pass-through: it reads stage.params, writes back via
// onSaveParams (the card's onEditSave → updateStageParams — the existing
// cache-key/stale machinery). Zero store changes (design doc §3).
import { useCallback, useState } from "react"
import {
 DndContext, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DraggableAttributes,
} from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import {
 SortableContext, useSortable, horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { loraIdOf, normalizeLoraEntry, type LoraWireInput } from "@melite/contracts"
import { CSS } from "@dnd-kit/utilities"
import { Plus, Power, Zap, Settings2, SlidersHorizontal, GripVertical, Layers } from "lucide-react"

import { cn } from "@melite/ui"
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@melite/ui/dialog"
import { Input } from "@melite/ui/input"
import { Switch } from "@melite/ui/switch"
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"
import type { LoRAEntry } from "@melite/contracts"
import type { CardStage } from "@melite/contracts"
import type { ModifierSubcard } from "@melite/contracts"
import { loraAdaptersOf } from "@melite/contracts"
import {
 subcardsFromParams, subcardId, applySubcardDrop, loraLabel,
 modifiersFeatureOf, kindSpecOf,
 type ControlNetEntry,
 type ModifierKindSpec, type ModifierFieldSpec, type SubcardKind,
} from "@melite/contracts"
import { optionValue, optionLabel } from "@melite/contracts"
import { SlotSquare } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { SubcardModal, type SubcardOpenState } from "./SubcardModal"

interface SubcardGridProps {
 stage: CardStage
 /** The card's form-spec (capability gate — rule 3). */
 formSpec: Record<string, any> | null
 /** Persist the whole params bag (the card's onEditSave path). */
 onSaveParams: (params: Record<string, unknown>) => void
 toast: (type: "error" | "success" | "info", msg: string) => void
 /** Prior flow stages (for the CN image "link to previous" picker). */
 priorStages?: CardStage[]
}

/** The unified "+ Mod" button -- ONE affordance for ALL modifier kinds.
 *
 * Replaces the per-kind "+ LoRA" / "+ ControlNet" add tiles (2026-08-08
 * policy: "this box need to be generic and provide a modal. For example
 * z-image can add lanpaint conditioning, controlnet, or lora. But all I see
 * is lora +. It should be a box to say + mod and not + lora").
 *
 * Clicking opens a kind-picker MODAL listing every declared kind whose
 * cardinality is "list" (scalar kinds edit inline via ScalarRow, so they
 * never appear in the picker). A modal — not an absolute-positioned
 * dropdown — because the "+ Mod" tile sits at the BOTTOM of the card
 * detail, inside the zoom overlay's ``overflow-hidden`` rounded container,
 * which clips a downward-opening menu at the bottom edge. The Dialog
 * portals to document.body and escapes every clipping ancestor (2026-08-09:
 * "I click the plus button for mod, it gets cut off at the bottom").
 *
 * Picking a kind hands off to the grid's setOpenState -> the SubcardModal
 * create flow. Stack limits are enforced downstream by that modal (it
 * toasts on overflow). */
function ModAddButton({ kinds, onPick }: {
 kinds: ModifierKindSpec[]
 onPick: (kind: string) => void
}) {
 const [open, setOpen] = useState(false)
 // Only list-kinds go in the picker; scalar kinds edit inline.
 // NO per-kind filters: every kind the spec declares is renderable by
 // construction. The backend's ModifierKind._no_silent_drops gate
 // refuses phantom kinds (controlnet with zero options) at catalog
 // load, so a declared kind here is REAL — hiding it again would be a
 // second procedural path around the declarative contract (2026-08-11).
 const addable = kinds.filter((k) => k.cardinality !== "scalar")
 if (addable.length === 0) return null
 return (
 <>
 <Tip tip="Add a modifier">
 <button
 type="button"
 data-subcard-add="mod"
 onClick={() => setOpen(true)}
 className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sidebar-border/50 text-muted-foreground/60 transition-colors hover:border-brand/50 hover:text-brand"
 >
 <Plus className="h-4 w-4" />
 <span className="text-[9px] font-medium">Mod</span>
 </button>
 </Tip>
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="sm:max-w-sm">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Plus className="h-4 w-4 text-brand/70" />
 Add a modifier
 </DialogTitle>
 <DialogDescription>
 Pick a kind to add to this card.
 </DialogDescription>
 </DialogHeader>
 <div data-mod-picker className="grid gap-1">
 {addable.map((k) => (
 <button
 key={k.kind}
 type="button"
 data-mod-pick={k.kind}
 onClick={() => { onPick(k.kind); setOpen(false) }}
 className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/90 transition-colors hover:bg-brand/10 hover:text-brand"
 >
 {k.kind === "lora" && <Zap className="h-3.5 w-3.5 text-brand/60" />}
 {k.kind === "controlnet" && <Layers className="h-3.5 w-3.5 text-brand/60" />}
 {k.kind !== "lora" && k.kind !== "controlnet" && (
 <SlidersHorizontal className="h-3.5 w-3.5 text-brand/60" />
 )}
 <span>{k.label}</span>
 </button>
 ))}
 </div>
 </DialogContent>
 </Dialog>
 </>
 )
}

export function SubcardGrid({ stage, formSpec, onSaveParams, toast, priorStages }: SubcardGridProps) {
 // The generic arbitrary-kind list — the ONE read that drives the whole
 // grid AND the leaf modal (the modal re-derives lora/CN views from the
 // kind specs via kindSpecOf — no parallel formSpec extractors, 2026-08-11).
 const kinds = modifiersFeatureOf(formSpec)

 const loras = (stage.params.loras as LoraWireInput[] | undefined) ?? []
 const controlnets = (stage.params.controlnets as ControlNetEntry[] | undefined) ?? []
 const subcards = subcardsFromParams(stage.params)

 // ── Leaf modal state ────────────────────────────────────────────────────
 const [openState, setOpenState] = useState<SubcardOpenState | null>(null)
 const editingSubcard = openState?.mode === "edit"
 ? subcards.find((s) => s.id === openState.id) ?? null
 : null
 // Generic-kind edit: resolve the wire entry at params[param_key][id].
 // subcardsFromParams only projects lora/CN (bespoke tiles); novel kinds
 // carry their own dict shape, resolved here + passed to the modal.
 const genericEditingEntry: Record<string, unknown> | null = (() => {
 if (!openState || openState.mode !== "edit") return null
 if (openState.kind === "lora" || openState.kind === "controlnet") return null
 const spec = kindSpecOf(formSpec, openState.kind)
 if (!spec) return null
 const arr = (stage.params[spec.param_key] as Array<Record<string, unknown>> | undefined) ?? []
 return arr.find((e) => String(e.id) === openState.id) ?? null
 })()
 // The open generic kind's current tile count — the modal's max_stack
 // gate (the mask's one-tile cap refuses LOUD on the second add).
 const genericOpenCount: number = (() => {
 if (!openState || openState.kind === "lora" || openState.kind === "controlnet") return 0
 const spec = kindSpecOf(formSpec, openState.kind)
 if (!spec) return 0
 const arr = (stage.params[spec.param_key] as Array<Record<string, unknown>> | undefined) ?? []
 return arr.length
 })()

 const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

 // ── Commit paths — the ONLY ways the param bag changes ─────────────────
 // Generic over arbitrary param_keys (clip_skip → "clip_skip", etc.).
 const commit = useCallback((key: string, next: unknown) => {
 onSaveParams({ ...stage.params, [key]: next })
 }, [onSaveParams, stage.params])

 const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
 if (!over || active.id === over.id) return
 const next = applySubcardDrop(
 stage.params,
 String(active.id),
 String(over.id),
 kinds,
 )
 if (next !== stage.params) onSaveParams(next)
 }, [stage.params, onSaveParams, kinds])

 // Modal commit: replace the edited entry (by id/name) or append (create).
 // Lora + ControlNet keep their bespoke shapes (LoRAEntry / ControlNetEntry);
 // any other kind writes a generic dict at params[kind.param_key].
 const onModalSave = useCallback((entry: LoRAEntry | ControlNetEntry | Record<string, unknown>) => {
 if (!openState) return
 if (openState.kind === "lora") {
 const next = [...loras]
 const id = loraIdOf(entry)
 const normalized = normalizeLoraEntry(entry)
 const idx = next.findIndex((l) => loraIdOf(l) === id)
 if (openState.mode === "edit" && idx >= 0) next[idx] = normalized
 else if (openState.mode === "create" && idx < 0) next.push(normalized)
 commit("loras", next)
 } else if (openState.kind === "controlnet") {
 const next = [...controlnets]
 const id = (entry as ControlNetEntry).id
 const idx = next.findIndex((c) => c.id === id)
 if (openState.mode === "edit" && idx >= 0) next[idx] = entry as ControlNetEntry
 else if (openState.mode === "create" && idx < 0) next.push(entry as ControlNetEntry)
 commit("controlnets", next)
 } else {
 // Generic novel-kind path. The entry is a dict; id at params[param_key][i].
 const spec = kindSpecOf(formSpec, openState.kind)
 if (!spec) return
 const arr = (stage.params[spec.param_key] as Array<Record<string, unknown>> | undefined) ?? []
 const id = (entry as Record<string, unknown>).id as string | undefined
 const idx = id != null ? arr.findIndex((e) => e.id === id) : -1
 let next: Array<Record<string, unknown>>
 if (openState.mode === "edit" && idx >= 0) {
 next = [...arr]; next[idx] = entry as Record<string, unknown>
 } else {
 next = [...arr, entry as Record<string, unknown>]
 }
 commit(spec.param_key, next)
 }
 }, [openState, loras, controlnets, commit, formSpec, stage.params])

 const onModalDelete = useCallback(() => {
 if (!openState || openState.mode !== "edit") return
 if (openState.kind === "lora") {
 commit("loras", loras.filter((l) => subcardId("lora", l) !== openState.id))
 } else if (openState.kind === "controlnet") {
 commit("controlnets", controlnets.filter((c) => subcardId("controlnet", c) !== openState.id))
 } else {
 const spec = kindSpecOf(formSpec, openState.kind)
 if (!spec) return
 const arr = (stage.params[spec.param_key] as Array<{ id?: string }> | undefined) ?? []
 commit(spec.param_key, arr.filter((e) => e.id !== openState.id))
 }
 }, [openState, loras, controlnets, commit, formSpec, stage.params])

 // ── Per-kind mini-tile rows ─────────────────────────────────────────────
 // Effective strength per tile (the recipe landing's {id}-only rows —
 // the adapter default_strength IS the strength the run uses).
 const loraAdapters = loraAdaptersOf(kindSpecOf(formSpec, "lora"))
 const effectiveLoraStrength = (sc: ModifierSubcard): number => {
 if (sc.strengthSet) return sc.strength
 const adapter = loraAdapters.find((a) => a.name === sc.name)
 return adapter?.default_strength ?? sc.strength ?? 1.0
 }
 const loraSubcards = subcards.filter((s) => s.kind === "lora")
 const cnSubcards = subcards.filter((s) => s.kind === "controlnet")

 return (
 // 2026-08-14: space-y-3 → space-y-2 — the heading-to-first-tile gap
 // matches the card's other section rhythms (label mb-1.5, grid gap-2);
 // empty kind rows now collapse (see below) so no phantom slots remain.
 <div className="mt-3 space-y-2" data-subcard-grid>
 <div className="flex items-center gap-2">
 <Settings2 className="h-3.5 w-3.5 text-brand/70" />
 <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Modifiers
 </label>
 <span className="ml-1 text-[9px] text-muted-foreground/50">
 drag to set apply order
 </span>
 </div>

  <DndContext sensors={sensors} onDragEnd={onDragEnd}>
  {/* ONE flowing row (2026-09-06, operator order: the + tile rides
  "right after the last [REDACTED 2026-11-05] card", never on its own vertical
  row). All tile kinds flow in a single flex-wrap line — per-kind
  SortableContexts stay (apply order is per-kind); generic-kind
  widgets keep their own block below. Empty kinds render nothing. */}
  <div className="flex flex-wrap gap-1.5" data-subcard-row="flow">
  {loraSubcards.length > 0 && (
  <SortableContext
  items={loras.map((l) => subcardId("lora", l))}
  strategy={horizontalListSortingStrategy}
  >
  {loraSubcards.map((s) => (
  <LoraTile
  key={s.id}
  subcard={s}
  strength={effectiveLoraStrength(s)}
  onOpen={() => setOpenState({ mode: "edit", kind: "lora", id: s.id })}
  />
  ))}
  </SortableContext>
  )}
  {cnSubcards.length > 0 && (
  <SortableContext
  items={controlnets.map((c) => subcardId("controlnet", c))}
  strategy={horizontalListSortingStrategy}
  >
  {cnSubcards.map((s) => (
  <ControlNetTile
  key={s.id}
  subcard={s}
  onOpen={() => setOpenState({ mode: "edit", kind: "controlnet", id: s.id })}
  onToggle={() => commit("controlnets", toggleCn(controlnets, s))}
  />
  ))}
  </SortableContext>
  )}
  {/* The unified "+ Mod" tile — INLINE, the last cell of the row
  (one affordance for ALL addable kinds; the picker opens the leaf
  SubcardModal). */}
  <ModAddButton
  kinds={kinds}
  onPick={(k) => setOpenState({ mode: "create", kind: k as SubcardKind })}
  />
  </div>
  {kinds.map((kind) => {
  // Generic kinds (clip_skip, sampler_override, …) keep their own
  // widgets — not SlotSquare tiles. The lora/controlnet tiles ride
  // the flowing row above.
  if (kind.kind === "lora" || kind.kind === "controlnet") return null
  return (
  <GenericModifierRow
  key={kind.kind}
  kind={kind}
  params={stage.params}
  onEdit={(id) => setOpenState({ mode: "edit", kind: kind.kind, id })}
  onScalarChange={(value) => commit(kind.param_key, value)}
  toast={toast}
  />
  )
  })}
  </DndContext>

 {/* ── Leaf modal — the ONLY subcard editor ─────────────────────── */}
 <SubcardModal
 openState={openState}
 subcard={editingSubcard}
 loras={loras}
 controlnets={controlnets}
 formSpec={formSpec}
 genericEntry={genericEditingEntry}
 genericCount={genericOpenCount}
 onSave={onModalSave}
 onDelete={onModalDelete}
 onClose={() => setOpenState(null)}
 toast={toast}
 priorStages={priorStages}
 />
 </div>
 )
}

// Modifier tiles are the SAME squares as the drilldown input slots
// (2026-08-08: "This horizontal card view can also be applied to the
// 'modifiers' — stay unified"): each tile is a SlotSquare (md, h-20) with
// the kind's content + a drag-handle in the actions overlay. The sortable
// wrapper owns dnd-kit's node (transform) + the click-to-edit; the handle
// carries the listeners (click vs drag separated by PointerSensor's 4px
// constraint; toggle/handle clicks stopPropagation so the modal never
// opens underneath them).

/** The drag handle for modifier tiles — dnd-kit listeners live on this
 * small grip, not the whole tile. */
function DragHandle({ attributes, listeners }: {
 attributes: DraggableAttributes
 listeners?: SyntheticListenerMap
}) {
 return (
 <Tip tip="Drag to reorder">
 <button
 type="button"
 {...attributes}
 {...listeners}
 onClick={(e) => e.stopPropagation()}
 aria-label="Drag to reorder"
 className="flex h-5 w-5 touch-none cursor-grab items-center justify-center rounded bg-background/90 text-muted-foreground/70 hover:text-brand active:cursor-grabbing"
 >
 <GripVertical className="h-3 w-3" />
 </button>
 </Tip>
 )
}

/** LoRA mini tile — SlotSquare with the adapter name + strength.
 * No enable toggle: the wire LoRAEntry has no `enabled` field (LoRAs are
 * always-on conditioners) — removal happens in the leaf modal. */
function LoraTile({ subcard, strength, onOpen }: {
 subcard: ModifierSubcard
 /** EFFECTIVE strength — the wire entry's own, else the adapter's
  * default_strength (what compose seeds server-side), else 1.0. A
  * landed recipe row carries {id} only; the tile must never see
  * undefined (the 2026-09-06 toFixed crash on card add). */
 strength: number
 onOpen: () => void
}) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
 useSortable({ id: subcard.id, data: { kind: "lora" } })
 return (
 <Tip tip="Drag to reorder · click to edit">
 <div
 ref={setNodeRef}
 data-subcard={subcard.id}
 style={{ transform: CSS.Transform.toString(transform), transition }}
 {...attributes}
 {...listeners}
 onClick={onOpen}
 className={cn(
 "cursor-grab touch-none rounded-md active:cursor-grabbing",
 isDragging && "z-20 opacity-90",
 )}
 aria-label="Drag to reorder · click to edit"
 >
 <SlotSquare
 size="md"
 label={loraLabel(subcard.label)}
 metric={strength.toFixed(2)}
 emptyIcon={<Zap className="h-5 w-5 text-brand/60" />}
 actions={<DragHandle attributes={attributes} listeners={listeners} />}
 />
 </div>
 </Tip>
 )
}

/** ControlNet mini tile — conditioning-image square + label + strength.
 * Disabled CNs dim (opacity-50); the power toggle lives in the square's
 * actions overlay next to the drag handle. */
function ControlNetTile({ subcard, onOpen, onToggle }: {
 subcard: ModifierSubcard
 onOpen: () => void
 onToggle: () => void
}) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
 useSortable({ id: subcard.id, data: { kind: "controlnet" } })
 // SlotSquare's value must be a renderable URL — normalize the wire's
 // raw base64 (image_b64 may arrive without the data: prefix).
 const value = subcard.image_b64
 ? (subcard.image_b64.startsWith("data:")
 ? subcard.image_b64
 : `data:image/png;base64,${subcard.image_b64}`)
 : undefined
 return (
 <Tip tip="Drag to reorder · click to edit">
 <div
 ref={setNodeRef}
 data-subcard={subcard.id}
 style={{ transform: CSS.Transform.toString(transform), transition }}
 {...attributes}
 {...listeners}
 onClick={onOpen}
 className={cn(
 "cursor-grab touch-none rounded-md active:cursor-grabbing",
 !subcard.enabled && "opacity-50",
 isDragging && "z-20 opacity-90",
 )}
 aria-label="Drag to reorder · click to edit"
 >
 <SlotSquare
 size="md"
 value={value}
 label={subcard.label}
 metric={subcard.strength.toFixed(2)}
 actions={
 <>
 {/* Enable/disable — click toggles without editing. */}
 <Tip tip={subcard.enabled ? "Disable (keep settings)" : "Enable"}>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); onToggle() }}
 aria-label={subcard.enabled ? "Disable (keep settings)" : "Enable"}
 className="flex h-5 w-5 items-center justify-center rounded bg-background/90 text-muted-foreground/70 hover:text-brand"
 >
 <Power className={cn("h-3 w-3", subcard.enabled ? "text-emerald-400" : "text-muted-foreground")} />
 </button>
 </Tip>
 <DragHandle attributes={attributes} listeners={listeners} />
 </>
 }
 />
 </div>
 </Tip>
 )
}


/** CN toggle — the wire entry has `enabled` (keep settings, skip apply). */
function toggleCn(controlnets: ControlNetEntry[], subcard: ModifierSubcard): ControlNetEntry[] {
 return controlnets.map((c) => c.id === subcard.id ? { ...c, enabled: !c.enabled } : c)
}

// ─── Generic modifier rows (novel kinds — clip_skip, sampler_override, …) ──
//
// The proof of arbitrary: ANY declared kind renders here with zero code
// change. Scalar kinds (clip_skip, cardinality=scalar) edit inline — one
// value at params[param_key], no modal. List kinds render tiles + an add
// tile; create/edit opens the generic SubcardModal path (SubcardModal reads
// kind.fields). Lora + ControlNet skip this path — they have graduated
// bespoke tile rows above.

interface GenericModifierRowProps {
 kind: ModifierKindSpec
 params: Record<string, unknown>
 onEdit: (id: string) => void
 onScalarChange: (value: unknown) => void
 toast: (type: "error" | "success" | "info", msg: string) => void
}

function GenericModifierRow({ kind, params, onEdit, onScalarChange }: GenericModifierRowProps) {
 if (kind.cardinality === "scalar") {
 return (
 <ScalarRow kind={kind} params={params} onChange={onScalarChange} />
 )
 }
 // List-kind generic tiles. Reads params[kind.param_key] (an array of
 // dicts). Each entry's label = its first scalar/select field's value.
 const arr = (params[kind.param_key] as Array<Record<string, unknown>> | undefined) ?? []
 // Empty list-kind rows collapse (2026-08-14, same rule as lora/CN):
 // zero tiles = 0px of content = no space-y slot. Scalar rows always
 // render — they carry a label + a live control, not just tiles.
 if (arr.length === 0) return null
 return (
 <SortableContext items={arr.map((e) => subcardId(kind.kind, e))} strategy={horizontalListSortingStrategy}>
 <div className="flex flex-wrap items-center gap-1.5" data-subcard-row={kind.kind}>
 {arr.map((entry) => {
 const id = subcardId(kind.kind, entry)
 return (
 <GenericTile
 key={id}
 kind={kind}
 entry={entry}
 id={id}
 onOpen={() => onEdit(String(entry.id ?? id))}
 />
 )
 })}
 </div>
 </SortableContext>
 )
}

/** Scalar-kind inline control — one value, edited in-place (no modal). */
function ScalarRow({ kind, params, onChange }: {
 kind: ModifierKindSpec
 params: Record<string, unknown>
 onChange: (value: unknown) => void
}) {
 // Scalar kinds store a dict {fieldname: value} at params[param_key] (the
 // shape kind.fields declares + the applier reads). A bare value (defensive
 // — a hand-authored flow YAML might use the bare scalar) is coerced
 // via the primary field.
 const field = kind.fields[0]
 const raw = params[kind.param_key]
 const dict = (raw != null && typeof raw === "object" && !Array.isArray(raw))
 ? raw as Record<string, unknown>
 : {}
 const value = dict[field?.name] ?? field?.default
 return (
 <div className="space-y-1" data-subcard-row={kind.kind} data-modifier-cardinality="scalar">
 <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 <SlidersHorizontal className="h-3 w-3 text-brand/60" />
 {kind.label}
 </label>
 <div className="flex items-center gap-2">
 {kind.fields.map((f) => (
 <GenericFieldControl
 key={f.name}
 field={f}
 value={f.name === field?.name ? value : dict[f.name]}
 onChange={(v) => onChange({ ...dict, [f.name]: v })}
 />
 ))}
 </div>
 {kind.tooltip && (
 <p className="text-[9px] leading-snug text-muted-foreground/60">{kind.tooltip}</p>
 )}
 </div>
 )
}

/** One generic list-kind tile — SlotSquare with the entry's label. */
function GenericTile({ kind, entry, id, onOpen }: {
 kind: ModifierKindSpec
 entry: Record<string, unknown>
 id: string
 onOpen: () => void
}) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
 useSortable({ id, data: { kind: kind.kind } })
 // Label = the value of the FIRST scalar/select field (image/file
 // fields are values, never names — a data-URL label is 30KB of
 // garbage), fallback to the KIND label ("Region Mask"), then id.
 const labelField = kind.fields.find((f) => f.type !== "image")
 const label = (labelField ? String(entry[labelField.name] ?? "") : "") || kind.label || id
 return (
 <Tip tip="Click to edit">
 <div
 ref={setNodeRef}
 data-subcard={id}
 style={{ transform: CSS.Transform.toString(transform), transition }}
 {...attributes}
 {...listeners}
 onClick={onOpen}
 className={cn(
 "cursor-grab touch-none rounded-md active:cursor-grabbing",
 isDragging && "z-20 opacity-90",
 )}
 aria-label="Click to edit"
 >
 <SlotSquare
 size="md"
 label={label}
 emptyIcon={<Zap className="h-5 w-5 text-brand/60" />}
 actions={<DragHandle attributes={attributes} listeners={listeners} />}
 />
 </div>
 </Tip>
 )
}

/**
 * GenericFieldControl — the type→component dispatch for ModifierFieldSpec.
 * Renders one field inline (scalar rows + future generic modal editor). The
 * type vocab is the ModifierField's (integer/float/string/select/image/
 * boolean), NOT SchemaField's (number/slider/text) — those are the main
 * form's primitives, a parallel renderer kept distinct to avoid an adapter.
 */
export function GenericFieldControl({ field, value, onChange }: {
 field: ModifierFieldSpec
 value: unknown
 onChange: (value: unknown) => void
}) {
 const label = field.label ?? field.name
 switch (field.type) {
 case "integer":
 case "float":
 return (
 <label className="flex items-center gap-1.5">
 <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
 <Input
 type="number"
 value={typeof value === "number" ? value : (field.default as number) ?? 0}
 min={field.min ?? undefined}
 max={field.max ?? undefined}
 step={field.step ?? (field.type === "integer" ? 1 : 0.01)}
 onChange={(e) => onChange(field.type === "integer" ? Math.round(Number(e.target.value)) : Number(e.target.value))}
 className="h-7 w-20 text-xs tabular-nums bg-input/30 border-input/60"
 />
 </label>
 )
 case "string":
 return (
 <label className="flex items-center gap-1.5">
 <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
 <Input
 type="text"
 value={typeof value === "string" ? value : (field.default as string) ?? ""}
 onChange={(e) => onChange(e.target.value)}
 className="h-7 w-32 text-xs bg-input/30 border-input/60"
 />
 </label>
 )
 case "select":
 return (
 <label className="flex items-center gap-1.5">
 <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
 <Select value={typeof value === "string" ? value : (field.default as string) ?? ""} onValueChange={onChange}>
 <SelectTrigger className="h-7 w-32 text-xs bg-input/30 border-input/60" aria-label={label}>
 <SelectValue placeholder="Choose…" />
 </SelectTrigger>
 <SelectContent>
 {(field.options ?? []).map((opt) => (
 <SelectItem key={optionValue(opt)} value={optionValue(opt)} className="text-xs">{optionLabel(opt)}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </label>
 )
 case "boolean":
 return (
 <label className="flex items-center gap-1.5">
 <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
 <Switch checked={Boolean(value)} onCheckedChange={onChange} />
 </label>
 )
 case "image":
 // Image fields are edited in the modal (the SubcardModal generic path);
 // the inline control is a presence indicator only.
 return (
 <span className="text-[10px] text-muted-foreground/60 italic">
 {value ? `${label}: set` : `${label}: none`}
 </span>
 )
 }
}
