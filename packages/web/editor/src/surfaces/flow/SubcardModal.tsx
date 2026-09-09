"use client"

// SubcardModal — the leaf editor for modifier subcards (L3 in
// docs/design/modifier-subcards.md). ONE editor for both kinds and both
// modes: create (pick the entry from the catalog) and edit (strength, step
// range, conditioning image). This is the ONLY way a subcard is edited —
// the ModifiersModal stack UI it replaces is deleted (rule 4).
//
// Schema-driven (rule 3): every option renders from the form-spec features
// (adapters, cn entries, max_stack, strength bounds) — a YAML edit in the
// catalog changes the options here, no code.
//
// Values write through to the param bag (params.loras[] /
// params.controlnets[]) via the grid's onSave — the same wire shapes the
// families consume; apply order = array order.
import { useEffect, useRef, useState } from "react"
import {
 X, Upload, ZoomIn, Zap, GitCommitHorizontal, Trash2, ImageIcon, Layers,
 Check, Link2,
} from "lucide-react"

import { Button } from "@melite/ui/button"
import { Badge } from "@melite/ui/badge"
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@melite/ui/dialog"
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"
import { cn } from "@melite/ui"
import type { LoRAEntry, LoraWireInput, LoRAAdapter } from "@melite/contracts"
import type {
 ControlNetEntry, SubcardKind,
 ModifierSubcard, ModifierKindSpec,
} from "@melite/contracts"
import {
 newControlnetEntry, newLoraEntry, newGenericEntry, loraLabel, kindSpecOf,
 normalizeLoraEntry,
 cnEntriesOf, loraAdaptersOf, loraStrengthBoundsOf,
 type ControlNetSchemaEntry, loraIdOf } from "@melite/contracts"
import { GenericFieldControl } from "./SubcardGrid"
import { ASSET_DRAG_MIME, readAsDataURL } from "@melite/ui"
import type { CardStage } from "@melite/contracts"
import { Tip } from "@melite/ui/tip"

/** Fetch a URL → convert to a base64 data URL (for sidebar-asset drags
 * and flow-link picks). Returns null on failure — the caller toasts.
 * Reads through the shared readAsDataURL (the ONE read path). */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
 try {
  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()
  return await readAsDataURL(blob)
 } catch {
  return null
 }
}

/** What the grid opened: create a subcard of a kind, or edit one by id. */
export type SubcardOpenState =
 | { mode: "create"; kind: SubcardKind }
 | { mode: "edit"; kind: SubcardKind; id: string }

interface SubcardModalProps {
 openState: SubcardOpenState | null
 /** The subcard being edited (edit mode) — the grid resolves it by id. */
 subcard: ModifierSubcard | null
 /** Current param-bag entries (create mode filters existing ones out). */
 loras: LoraWireInput[]
 controlnets: ControlNetEntry[]
 /** The card's form-spec — the ONE contract. Every view in this modal
 * (lora adapters, CN entries, strength bounds, tooltips) derives from
 * kindSpecOf(formSpec, kind) — no parallel feature shapes (2026-08-11). */
 formSpec: Record<string, any> | null
 /** For generic-kind edit mode: the resolved wire entry at
 * params[param_key][id]. Lora/CN resolve via ``subcard``; novel kinds
 * carry dict shapes the bespoke view model doesn't project. */
 genericEntry?: Record<string, unknown> | null
 /** For generic-kind create mode: how many tiles the kind already
 * has (the grid reads params[kind.param_key].length). Drives the
 * max_stack gate LOUDLY — a second mask tile refuses with the
 * stack-limit toast instead of silently appending (2026-09-05). */
 genericCount?: number
 /** Commit the full entry — grid replaces by id or appends (create). */
 onSave: (entry: LoRAEntry | ControlNetEntry | Record<string, unknown>) => void
 /** Delete the edited subcard (edit mode only). */
 onDelete: () => void
 onClose: () => void
 toast: (type: "error" | "success" | "info", msg: string) => void
 /** Prior flow stages (for the CN image "link to previous" picker).
 * Stages with image outputs (result.assetUrls[0]) are offered. */
 priorStages?: CardStage[]
}

// Fallback for schema lookups — keeps sites typed (see NO_CN_SCHEMA).
const NO_CN_SCHEMA: ControlNetSchemaEntry = { type: "", label: "" }

export function SubcardModal({
 openState, subcard, loras, controlnets, formSpec,
 genericEntry, genericCount,
 onSave, onDelete, onClose, toast,
 priorStages,
}: SubcardModalProps) {
 const isEdit = openState?.mode === "edit"
 const kind = openState?.kind ?? null

 // The ONE contract read: kindSpecOf(formSpec, kind). Every view below
 // (adapters, entries, bounds, note, disk_subdir) derives from these two
 // kind specs — no parallel formSpec extractors (2026-08-11).
 const loraKind = kindSpecOf(formSpec, "lora")
 const cnKind = kindSpecOf(formSpec, "controlnet")
 const cnEntries = cnEntriesOf(cnKind)
 const adapters = loraAdaptersOf(loraKind)
 const loraBounds = loraStrengthBoundsOf(loraKind)
 const loraMin = loraBounds.min
 const loraMax = loraBounds.max
 const loraStep = loraBounds.step

 // ── Kind dispatch — lora/controlnet keep bespoke editors; any other kind
 // (clip_skip, sampler_override, …) falls into the generic field renderer.
 // The discriminator is the OPEN kind string; this is the ONE branch that
 // stays per-kind in the modal (the bespoke editors are rich UIs a generic
 // renderer can't replicate yet — the graduated-kinds split).
 const isLora = kind === "lora"
 const isControlNet = kind === "controlnet"
 const isGeneric = kind !== null && !isLora && !isControlNet
 const genericKind: ModifierKindSpec | null = isGeneric ? kindSpecOf(formSpec, kind) : null

 // ── Draft entry (edit mode) + create-mode selection ────────────────────
 const [draft, setDraft] = useState<LoRAEntry | ControlNetEntry | null>(null)
 // Generic-kind draft (a dict) — kept separate from the bespoke drafts so
 // the lora/CN TypeScript shapes stay precise. The generic path reads this
 // only when isGeneric.
 const [draftGeneric, setDraftGeneric] = useState<Record<string, unknown> | null>(null)
 const [selType, setSelType] = useState("")
 const [selLora, setSelLora] = useState("")
 const [selGeneric, setSelGeneric] = useState("")
 // Full-resolution conditioning-image preview (sibling dialog — see below).
 const [preview, setPreview] = useState<ControlNetEntry | null>(null)
 const fileRef = useRef<HTMLInputElement | null>(null)
 const pendingUploadRef = useRef<string | null>(null)
 const [dragOver, setDragOver] = useState(false)
 const [linkOpen, setLinkOpen] = useState(false)

 // Reset local state whenever the modal opens (create or a new subcard).
 useEffect(() => {
 if (isEdit && subcard && (isLora || isControlNet)) {
 setDraft(buildDraft(subcard, loras, controlnets, adapters))
 setDraftGeneric(null)
 } else if (isEdit && isGeneric && genericKind) {
 // Generic edit: seed from the resolved wire entry (the grid passes
 // it via genericEntry). Falls back to the first option's defaults
 // when the entry can't be found (defensive — shouldn't happen).
 setDraftGeneric(
 genericEntry ? { ...genericEntry } : buildGenericDraft(genericKind),
 )
 setDraft(null)
 } else if (!isEdit && isGeneric && genericKind &&
 !(genericKind.options && genericKind.options.length > 0)) {
 // Optionless-kind create (the mask tile): no picker to choose
 // from, so the bare field defaults ARE the draft — Add commits
 // immediately (canSave reads draftGeneric). Without this the Add
 // button sits disabled on a dialog with nothing to pick.
 setDraft(null)
 setDraftGeneric(buildGenericDraft(genericKind))
 } else {
 setDraft(null)
 setDraftGeneric(null)
 }
 setSelType("")
 setSelLora("")
 setSelGeneric("")
 setPreview(null)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [openState?.mode, isEdit ? subcard?.id : null, kind])

 const cnSchema = (t: string): ControlNetSchemaEntry =>
 cnEntries.find((e) => e.type === t) ?? NO_CN_SCHEMA

 if (!openState || !kind) return null

 const draftCn = draft as ControlNetEntry | null
 const draftLora = draft as LoRAEntry | null

 /** The type/name of the entry being authored (create selection or draft). */
 const entryKey = isLora ? (draftLora?.id ?? selLora) : (draftCn?.type ?? selType)
 const existingTypes = controlnets.map((c) => c.type)
 const existingNames = loras.map((l) => loraIdOf(l))
 // No-silent-drops (2026-08-11): a card that already carries every
 // declared adapter must not present a silently-empty popup. Compute the
 // intersection once — the popup renders a LOUD "all already added" row
 // when it empties (the old filter-only path rendered zero items with
 // zero signal).
 const availableAdapters = adapters.filter((a) => !existingNames.includes(a.name))
 const availableCn = cnEntries.filter((e) => !existingTypes.includes(e.type))

 const canSave = isGeneric
 ? Boolean(genericKind && (draftGeneric || selGeneric || (genericKind.cardinality === "scalar")))
 : Boolean(entryKey)

 const save = () => {
 if (!canSave) return
 if (isLora) {
 if (draftLora) { onSave(draftLora); onClose(); return }
 // The adapter's declared default_strength seeds the entry (the
 // catalog row knows its own house strength; 1.0 is only the
 // fallback for undeclared rows).
 const adapter = adapters.find((a) => a.name === selLora)
 onSave(newLoraEntry(selLora, adapter?.default_strength ?? 1.0))
 } else if (isControlNet) {
 if (draftCn) { onSave(draftCn); onClose(); return }
 const entry = newControlnetEntry(controlnets, selType, cnKind)
 if (!entry) {
 toast("error", `ControlNet stack limit reached (${cnKind?.max_stack ?? 3}). Remove one to add another.`)
 return
 }
 onSave(entry)
 } else if (isGeneric && genericKind) {
 // Generic-kind commit. Edit mode → draftGeneric (the edited dict).
 // Create mode → newGenericEntry from the selected option (or the bare
 // field defaults when the kind has no option picker).
 if (draftGeneric) { onSave(draftGeneric); onClose(); return }
 const entry = newGenericEntry(
 genericKind,
 // the REAL tile count (genericCount): max_stack refuses LOUD
 // here with the stack-limit toast below (the mask's one-tile
 // cap lives or dies on this number — never hardcode 0).
 genericCount ?? 0,
 selGeneric || undefined,
 )
 if (!entry) {
 toast("error", `${genericKind.label} stack limit reached. Remove one to add another.`)
 return
 }
 onSave(entry)
 }
 onClose()
 }

 const patchDraft = (patch: Partial<ControlNetEntry>) => {
 setDraft((d) => (d ? { ...(d as ControlNetEntry), ...patch } : d))
 }

 const patchGenericDraft = (patch: Record<string, unknown>) => {
 setDraftGeneric((d) => (d ? { ...d, ...patch } : d))
 }

 const onUploadImage = (file: File) => {
 if (!file.type.startsWith("image/")) {
 toast("error", `ControlNet image must be an image file (got ${file.type || "unknown"})`)
 return
 }
 if (file.size > 20 * 1024 * 1024) {
 toast("error", "ControlNet image too large (max 20 MB).")
 return
 }
 // Shared readAsDataURL — the ONE read path every slot-shaped attach uses.
 void readAsDataURL(file).then((dataUrl) => {
 patchDraft({ image_b64: dataUrl, source: "user" })
 }).catch(() => toast("error", "Failed to read image file."))
 }

 // ── Drag from sidebar / OS file drop onto the CN image well ──────────
 // The same contract SlotSquare honors (ASSET_DRAG_MIME = sidebar asset
 // JSON with {url}; Files = OS file drop). The sidebar tile carries the
 // URL directly — fetch it → base64 → patchDraft. An OS file drop reuses
 // onUploadImage (same validation + shared read path as the file picker).
 const handleImageDrop = async (e: React.DragEvent) => {
 e.preventDefault()
 e.stopPropagation()
 setDragOver(false)
 const asset = e.dataTransfer.getData(ASSET_DRAG_MIME)
 if (asset) {
 try {
 const payload = JSON.parse(asset) as { url?: string }
 if (payload.url) {
 toast("info", "Loading image from sidebar…")
 const dataUrl = await fetchImageAsDataUrl(payload.url)
 if (dataUrl) {
 patchDraft({ image_b64: dataUrl, source: "user" })
 } else {
 toast("error", "Failed to load image from the sidebar asset.")
 }
 return
 }
 } catch { /* malformed — fall through to file drop */ }
 }
 const file = e.dataTransfer.files?.[0]
 if (file) onUploadImage(file)
 }

 // ── Link to a previous flow stage's output ──────────────────────
 // The user picks an upstream card; the frontend fetches its first
 // assetUrl → base64 → patches image_b64. This is a snapshot (not a live
 // wire — the backend CN builder reads base64, not step refs), but it
 // matches the upload pattern and gives instant reuse of prior outputs.
 const linkableStages = (priorStages ?? []).filter(
 (s) => s.result?.assetUrls && s.result.assetUrls.length > 0,
 )

 const handleLinkPick = async (stage: CardStage) => {
 setLinkOpen(false)
 const url = stage.result?.assetUrls?.[0]
 if (!url) return
 toast("info", `Linking to "${stage.title}"…`)
 const dataUrl = await fetchImageAsDataUrl(url)
 if (dataUrl) {
 patchDraft({ image_b64: dataUrl, source: "user" })
 toast("success", `Linked to "${stage.title}".`)
 } else {
 toast("error", `Failed to load image from "${stage.title}".`)
 }
 }

 return (
 <>
 {/* Hidden file input — clicked programmatically per image well. */}
 <input
 ref={fileRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0]
 if (f) onUploadImage(f)
 e.target.value = "" // allow re-uploading the same file
 pendingUploadRef.current = null
 }}
 />

 <Dialog open={Boolean(openState) && !preview} onOpenChange={(o) => !o && onClose()}>
 <DialogContent className="sm:max-w-2xl">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Layers className="h-4 w-4 text-brand" />
 {isEdit ? (
 <>Edit {isGeneric ? (genericKind?.label ?? kind) : isLora ? "LoRA" : "ControlNet"}</>
 ) : (
 <>Add {isGeneric ? (genericKind?.label ?? kind) : isLora ? "LoRA" : "ControlNet"}</>
 )}
 </DialogTitle>
 <DialogDescription>
 {isGeneric
 ? (genericKind?.tooltip ?? `A ${genericKind?.label ?? kind} modifier. Rendered from the catalog declaration.`)
 : isLora
 ? "A LoRA conditions the model's style. Apply order = drag order on the card."
 : "A ControlNet locks structure via a conditioning image. Apply order = drag order on the card."}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 {/* ── Create mode: pick the entry from the catalog ─────────── */}
 {!isEdit && isLora && (
 <div className="space-y-1.5">
 <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Adapter
 </label>
 {adapters.length > 0 ? (
 <Select value={selLora} onValueChange={setSelLora}>
 {/* aria-label: combobox has no name-from-content (ARIA) —
 without it screen readers + role queries get "". */}
 <SelectTrigger aria-label="Choose a LoRA" className="h-9 text-xs w-full">
 <SelectValue placeholder="Choose a LoRA…" />
 </SelectTrigger>
 <SelectContent className="min-w-72">
 {availableAdapters.length > 0 ? (
 availableAdapters.map((a) => (
 <SelectItem key={a.name} value={a.name} className="py-1.5">
 <span className="flex items-center gap-2">
 {loraLabel(a.name)}
 <span className="text-[10px] text-muted-foreground">({a.name.split("/").pop()?.split(".").pop()})</span>
 </span>
 </SelectItem>
 ))
 ) : (
 <div className="px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
 Every declared LoRA is already on this card ({adapters.length} of{" "}
 {adapters.length}). Remove one to add it again.
 </div>
 )}
 </SelectContent>
 </Select>
 ) : (
 <div className="rounded-md border border-dashed px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
 No LoRAs declared for this model. Drop a{" "}
 <code className="rounded bg-muted px-1 py-0.5">.safetensors</code>{" "}
 into{" "}
 <code className="rounded bg-muted px-1 py-0.5">
 /opt/ComfyUI/models/loras/{loraKind?.disk_subdir ?? "your-model-subdir"}/
 </code>{" "}
 and it will appear here.
 </div>
 )}
 </div>
 )}

 {!isEdit && isControlNet && (
 <div className="space-y-1.5">
 <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Type
 </label>
 <Select value={selType} onValueChange={setSelType}>
 <SelectTrigger aria-label="Choose a ControlNet type" className="h-9 text-xs w-full">
 <SelectValue placeholder="Choose a ControlNet type…" />
 </SelectTrigger>
 <SelectContent className="min-w-72">
 {availableCn.length > 0 ? (
 availableCn.map((e) => (
 <SelectItem
 key={e.type}
 value={e.type}
 disabled={e.installed === false}
 className="py-2"
 >
 <div className="flex flex-col">
 <span className="font-medium flex items-center gap-2">
 {e.label}
 {e.installed === false && (
 <Badge variant="outline" className="text-[9px]">not installed</Badge>
 )}
 </span>
 {e.tooltip && (
 <span className="text-[10px] text-muted-foreground line-clamp-1">
 {e.tooltip}
 </span>
 )}
 </div>
 </SelectItem>
 ))
 ) : (
 <div className="px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
 Every declared ControlNet type is already on this card ({cnEntries.length}{" "}
 of {cnEntries.length}). Remove one to add it again.
 </div>
 )}
 </SelectContent>
 </Select>
 {cnEntries.length === 0 && (
 <div className="rounded-md border border-dashed px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
 No ControlNet types declared for this model.
 </div>
 )}
 </div>
 )}

 {/* ── Edit mode: the entry's fields ────────────────────────── */}
 {isEdit && isLora && draftLora && (
 <>
 <div className="flex items-center justify-between">
 <span className="truncate font-mono text-xs text-brand">
 {loraLabel(draftLora.id)}
 </span>
 <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
 <Check className="h-2.5 w-2.5" /> active
 </span>
 </div>
 <StrengthSlider
 value={draftLora.strength}
 min={loraMin}
 max={loraMax}
 step={loraStep}
 onChange={(v) => patchDraft({ strength: v })}
 />
 {loraKind?.tooltip && (
 <p className="text-[10px] leading-snug text-muted-foreground">{loraKind.tooltip}</p>
 )}
 </>
 )}

 {isEdit && isControlNet && draftCn && (
 <>
 {/* Type switcher — changing type re-derives the schema
 defaults (model, preprocessor, strength) — same
 semantics as the deleted ModifiersModal. */}
 <Select
 value={draftCn.type}
 onValueChange={(t) => {
 const ns = cnSchema(t)
 patchDraft({
 type: t,
 model: ns.model,
 preprocessor: ns.preprocessor,
 strength: ns.default_strength ?? draftCn.strength,
 })
 }}
 >
 <SelectTrigger aria-label="ControlNet type" className="h-8 text-xs w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="min-w-72">
 {cnEntries.map((e) => (
 <SelectItem key={e.type} value={e.type} disabled={e.installed === false} className="py-2">
 <div className="flex flex-col">
 <span className="font-medium">{e.label}</span>
 {e.tooltip && (
 <span className="text-[10px] text-muted-foreground line-clamp-1">{e.tooltip}</span>
 )}
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 {/* Conditioning image well — upload / swap / clear.
 CRITICAL (carried from ModifiersModal): the swap/clear
 overlay MUST be hover-only (opacity-0 group-hover:
 opacity-100) — an always-visible bottom overlay occludes
 ~30px of the image, exactly where feet render for
 full-body SOMA conditioning. Click the image for the
 full-resolution preview (what the CN actually sees). */}
 <div className="flex gap-3">
 <div
 className="w-36 shrink-0 relative"
 onDragOver={(e) => {
 if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
 e.preventDefault()
 setDragOver(true)
 }
 }}
 onDragLeave={() => setDragOver(false)}
 onDrop={handleImageDrop}
 >
 {draftCn.image_b64 ? (
 <div className="group/image relative overflow-hidden rounded-md border bg-muted/30 aspect-[3/4]"
 style={dragOver ? { borderColor: "hsl(var(--brand))", boxShadow: "0 0 0 2px hsl(var(--brand) / 0.4)" } : undefined}
 >
 <Tip tip="Click to view full size">
 <button
 type="button"
 onClick={() => setPreview(draftCn)}
 className="absolute inset-0 h-full w-full cursor-zoom-in"
 aria-label="Click to view full size"
 >
 <img
 src={draftCn.image_b64.startsWith("data:")
 ? draftCn.image_b64
 : `data:image/png;base64,${draftCn.image_b64}`}
 alt={`${cnSchema(draftCn.type).label} conditioning (click to zoom)`}
 className="h-full w-full object-contain"
 />
 </button>
 </Tip>
 <div className="pointer-events-none absolute right-1 top-1 rounded bg-background/70 p-0.5">
 <ZoomIn className="h-3 w-3 text-muted-foreground" />
 </div>
 {dragOver && (
 <div className="absolute inset-0 flex items-center justify-center bg-brand/20 backdrop-blur-sm rounded-md">
 <span className="text-[10px] font-medium text-brand">Drop image</span>
 </div>
 )}
 <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-background/80 p-1.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/image:opacity-100">
 <Button
 type="button"
 variant="secondary"
 size="sm"
 className="h-6 px-2 text-[10px]"
 onClick={() => fileRef.current?.click()}
 >
 <Upload className="mr-1 h-3 w-3" />
 Swap
 </Button>
 <div className="flex gap-1">
 {linkableStages.length > 0 && (
 <Tip tip="Link to a previous card's output">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="h-6 px-2 text-[10px]"
 onClick={() => setLinkOpen(true)}
 aria-label="Link to a previous card's output"
 >
 <Link2 className="h-3 w-3" />
 </Button>
 </Tip>
 )}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="h-6 px-2 text-[10px] hover:text-destructive"
 onClick={() => patchDraft({ image_b64: "" })}
 >
 Clear
 </Button>
 </div>
 </div>
 </div>
 ) : (
 <div
 className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-2 text-xs text-muted-foreground transition-colors"
 style={dragOver
 ? { borderColor: "hsl(var(--brand))", backgroundColor: "hsl(var(--brand) / 0.08)" }
 : { borderColor: "hsl(var(--input) / 0.6)" }}
 >
 <button
 type="button"
 onClick={() => fileRef.current?.click()}
 className="flex flex-col items-center gap-1 hover:text-brand transition-colors"
 >
 <ImageIcon className="h-6 w-6 opacity-50" />
 <span className="text-center leading-tight">
 Click to upload<br />
 <span className="text-[10px] opacity-80">{cnSchema(draftCn.type).label}</span>
 </span>
 </button>
 {dragOver && (
 <span className="text-[10px] font-medium text-brand">Drop image here</span>
 )}
 {linkableStages.length > 0 && (
 <button
 type="button"
 onClick={() => setLinkOpen(true)}
 className="flex items-center gap-1 rounded border border-input/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-brand hover:border-brand/40 transition-colors"
 >
 <Link2 className="h-3 w-3" />
 Link to previous
 </button>
 )}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1 space-y-2.5">
 <StrengthSlider
 value={draftCn.strength}
 min={0}
 max={2}
 step={0.05}
 onChange={(v) => patchDraft({ strength: v })}
 />

 {/* Step Range (ControlNetApplyAdvanced) — typed number inputs, not a
 range slider knob. The CN applies between start_percent and end_percent
 of the sampling steps. Default [0.0, 1.0] = full schedule. The user's
 directive: "the pattern of the filled up / typed numbers". */}
 <div className="space-y-1.5 border-t border-border/40 pt-2.5">
 <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
 <GitCommitHorizontal className="h-2.5 w-2.5" />
 Step Range
 </span>
 <div className="flex items-center gap-2">
 <input
 type="number"
 aria-label="Start percent"
 value={Math.round((draftCn.start_percent ?? 0) * 100)}
 min={0}
 max={100}
 step={5}
 onChange={(e) => {
 const v = parseFloat(e.target.value)
 if (!isNaN(v)) patchDraft({ start_percent: Math.min(v / 100, (draftCn.end_percent ?? 1) - 0.05) })
 }}
 className="w-16 rounded border bg-transparent px-2 py-1 text-right font-mono text-xs tabular-nums outline-none focus:ring-1 focus:ring-ring"
 />
 <span className="text-[10px] text-muted-foreground">%</span>
 <span className="text-muted-foreground">–</span>
 <input
 type="number"
 aria-label="End percent"
 value={Math.round((draftCn.end_percent ?? 1) * 100)}
 min={0}
 max={100}
 step={5}
 onChange={(e) => {
 const v = parseFloat(e.target.value)
 if (!isNaN(v)) patchDraft({ end_percent: Math.max(v / 100, (draftCn.start_percent ?? 0) + 0.05) })
 }}
 className="w-16 rounded border bg-transparent px-2 py-1 text-right font-mono text-xs tabular-nums outline-none focus:ring-1 focus:ring-ring"
 />
 <span className="text-[10px] text-muted-foreground">%</span>
 </div>
 </div>

 {draftCn.model && (
 <Tip tip={draftCn.model}>
 <div className="truncate text-[10px] text-muted-foreground">
 <span className="opacity-70">weights:</span>{" "}
 <code className="rounded bg-muted/60 px-1 py-0.5">
 {draftCn.model.split("/").pop()}
 </code>
 </div>
 </Tip>
 )}
 {cnSchema(draftCn.type).tooltip && (
 <p className="text-[10px] leading-snug text-muted-foreground">
 {cnSchema(draftCn.type).tooltip}
 </p>
 )}
 </div>
 </div>

 {/* ── Flow link picker (inline panel over prior stages) ─────── */}
 {linkOpen && (
 <div className="relative rounded-lg border bg-popover p-1 shadow-sm max-h-48 overflow-y-auto">
 <div className="flex items-center justify-between px-2 py-1">
 <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
 Link to previous output
 </span>
 <button
 type="button"
 onClick={() => setLinkOpen(false)}
 className="text-muted-foreground hover:text-foreground"
 >
 <X className="h-3 w-3" />
 </button>
 </div>
 {linkableStages.map((s) => (
 <button
 key={s.id}
 type="button"
 onClick={() => handleLinkPick(s)}
 className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors"
 >
 {s.result?.assetUrls?.[0] ? (
 <img src={s.result.assetUrls[0]} alt="" className="h-8 w-8 rounded object-cover border" />
 ) : null}
 <div className="min-w-0 flex-1">
 <div className="truncate font-medium">{s.title}</div>
 {s.subtitle && (
 <div className="truncate text-[10px] text-muted-foreground">{s.subtitle}</div>
 )}
 </div>
 </button>
 ))}
 </div>
 )}
 </>
 )}

 {/* ── Generic-kind editor (novel kinds — clip_skip, …) ──────
 Renders purely from kind.fields (data-driven). Create mode =
 option picker (when the kind declares options) or bare field
 defaults; edit mode = the field controls over the draft dict.
 This is the proof of arbitrary: a new YAML kind gets a working
 editor with zero per-kind code. */}
 {isGeneric && genericKind && !isEdit && genericKind.options && genericKind.options.length > 0 && (
 <div className="space-y-1.5">
 <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 {genericKind.fields.find((f) => f.type === "select")?.label ?? "Option"}
 </label>
 <Select value={selGeneric} onValueChange={setSelGeneric}>
 <SelectTrigger aria-label={`Choose a ${genericKind.label}`} className="h-9 text-xs w-full">
 <SelectValue placeholder={`Choose a ${genericKind.label}…`} />
 </SelectTrigger>
 <SelectContent className="min-w-72">
 {genericKind.options.map((opt) => (
 <SelectItem key={opt.value} value={opt.value} disabled={opt.installed === false} className="py-2">
 <div className="flex flex-col">
 <span className="font-medium flex items-center gap-2">
 {opt.label}
 {opt.installed === false && (
 <Badge variant="outline" className="text-[9px]">not installed</Badge>
 )}
 </span>
 {opt.tooltip && (
 <span className="text-[10px] text-muted-foreground line-clamp-1">{opt.tooltip}</span>
 )}
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 {isGeneric && genericKind && isEdit && draftGeneric && (
 <div className="space-y-3">
 {genericKind.fields.map((f) => (
 f.type === "image" ? (
 <GenericImageWell
 key={f.name}
 field={f}
 value={draftGeneric[f.name]}
 onChange={(v) => patchGenericDraft({ [f.name]: v })}
 linkableStages={linkableStages}
 toast={toast}
 />
 ) : (
 <GenericFieldControl
 key={f.name}
 field={f}
 value={draftGeneric[f.name]}
 onChange={(v) => patchGenericDraft({ [f.name]: v })}
 />
 )
 ))}
 </div>
 )}
 </div>

 {/* ── Footer ──────────────────────────────────────────────── */}
 <div className="flex items-center gap-2">
 {isEdit && (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="text-destructive hover:bg-destructive/10 hover:text-destructive"
 onClick={() => { onDelete(); onClose() }}
 >
 <Trash2 className="h-3.5 w-3.5" />
 Remove
 </Button>
 )}
 <span className="ml-auto" />
 <Button type="button" variant="outline" size="sm" onClick={onClose}>
 Cancel
 </Button>
 <Button type="button" size="sm" onClick={save} disabled={!canSave}>
 {isEdit ? "Save" : "Add"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* ── Full-resolution conditioning preview (sibling dialog — the
 editor hides while it's open; Base UI's portal z-indexing is
 unreliable with overlapping backdrops, and two-layer Esc/click-
 outside semantics confuse users). The GROUND TRUTH view — verify
 feet / hands / head framing before generating. */}
 <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
 <DialogContent className="max-w-4xl">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <ZoomIn className="h-4 w-4" />
 {preview ? `${cnSchema(preview.type).label} conditioning — full resolution` : "Conditioning preview"}
 </DialogTitle>
 <DialogDescription>
 The exact image passed to the ControlNet. Nothing cropped, nothing
 hidden — this is what the model sees.
 </DialogDescription>
 </DialogHeader>
 {preview?.image_b64 && (
 <div className="flex items-center justify-center">
 <img
 src={preview.image_b64.startsWith("data:")
 ? preview.image_b64
 : `data:image/png;base64,${preview.image_b64}`}
 alt={`${cnSchema(preview.type).label} conditioning — full resolution`}
 className="max-h-[80vh] max-w-full rounded-md border border-border/60 object-contain"
 />
 </div>
 )}
 </DialogContent>
 </Dialog>
 </>
 )
}

/** Seed the edit draft from the wire entry — a COPY, so patches apply to the
 * draft, never to the param bag until Save (which replaces the entry). */
function buildDraft(
 subcard: ModifierSubcard,
 loras: LoraWireInput[],
 controlnets: ControlNetEntry[],
 adapters: LoRAAdapter[],
): LoRAEntry | ControlNetEntry | null {
 if (subcard.kind === "lora") {
 const id = subcard.name ?? subcard.id.slice("lora-".length)
 const entry = loras.find((l) => loraIdOf(l) === id)
 // A strength-less wire row (the recipe landing's {id} stamps) seeds
 // from the ADAPTER's default_strength — the effective value compose
 // uses server-side. normalizeLoraEntry's 1.0 is only the adapter-less
 // floor (the same ladder the tile displays).
 const adapterDefault = adapters.find((a) => a.name === id)?.default_strength
 if (entry) {
 const n = normalizeLoraEntry(entry)
 return typeof entry.strength === "number"
 ? n
 : { ...n, strength: adapterDefault ?? n.strength }
 }
 return { id, strength: subcard.strengthSet ? subcard.strength : adapterDefault ?? subcard.strength }
 }
 const entry = controlnets.find((c) => c.id === subcard.id)
 return entry ? { ...entry } : null
}

/**
 * Seed the generic-kind edit draft (defensive fallback). The grid passes the
 * resolved wire entry via ``genericEntry``; this helper is only reached when
 * that entry is missing — it seeds from the first option's defaults so the
 * field controls render non-empty. In practice the generic SCALAR path edits
 * inline (ScalarRow) and never opens this modal; this seeds the rare list-
 * kind generic edit case when the id lookup misses.
 */
function buildGenericDraft(kind: ModifierKindSpec): Record<string, unknown> | null {
 if (!kind) return null
 const firstOption = kind.options?.[0]
 const draft: Record<string, unknown> = {}
 for (const field of kind.fields) {
 const fromOption = firstOption?.defaults?.[field.name]
 if (fromOption !== undefined) draft[field.name] = fromOption
 else if (field.default !== undefined && field.default !== null) draft[field.name] = field.default
 }
 return draft
}

/** Strength field — typed number input (the card-param pattern), not a
 * knob. Bounds come from the schema (loras: spec min/max/step, CN: 0–2).
 * The input is full-width with min/max hints so the user TYPES the value
 * (the user's directive: "the pattern of the filled up / typed numbers"). */
/** The generic-kind image well — the mask mod's Region Mask square
 * inside the add-mod drawer (2026-09-05 button order: the mask is
 * added through the Mods button like every other mod). File pick
 * (data URL, the slot wire vocabulary) / link to a prior stage's
 * output / clear — the same three verbs as the main slot squares,
 * compact for the drawer. Writes a plain string into the draft
 * dict; the compose door stages it like any slot value. */
function GenericImageWell({ field, value, onChange, linkableStages, toast }: {
 field: { name: string; label?: string | null }
 value: unknown
 onChange: (v: unknown) => void
 linkableStages: Array<{ id: string; title: string; result?: { assetUrls?: string[] } | null }>
 toast: (type: "error" | "success" | "info", msg: string) => void
}) {
 const label = field.label ?? field.name
 const str = typeof value === "string" ? value : ""
 const inputRef = useRef<HTMLInputElement | null>(null)
 const pick = async (f: File) => {
 try {
 onChange(await readAsDataURL(f))
 } catch {
 toast("error", "Could not read that file — try a different one.")
 }
 }
 const link = async (assetUrl: string, title: string) => {
 toast("info", `Linking to "${title}"…`)
 const dataUrl = await fetchImageAsDataUrl(assetUrl)
 if (dataUrl) {
 onChange(dataUrl)
 toast("success", `Linked to "${title}".`)
 } else {
 toast("error", `Failed to load image from "${title}".`)
 }
 }
 return (
 <div className="space-y-1.5">
 <input
 ref={inputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0]
 if (f) void pick(f)
 e.target.value = ""
 }}
 />
 <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
 {str ? (
 <div className="flex items-center gap-2">
 <img src={str} alt={`${label} — attached`} className="h-16 w-16 shrink-0 rounded-md border border-border/60 object-cover" />
 <div className="flex flex-wrap items-center gap-1.5">
 <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[10px]" onClick={() => inputRef.current?.click()}>
 Swap
 </Button>
 <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onChange("")}>
 Clear
 </Button>
 {linkableStages.map((s) => {
 const url = s.result?.assetUrls?.[0]
 if (!url) return null
 return (
 <Button key={s.id} type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => void link(url, s.title)}>
 <Link2 className="mr-1 h-3 w-3" />
 {s.title.length > 14 ? `${s.title.slice(0, 13)}…` : s.title}
 </Button>
 )
 })}
 </div>
 </div>
 ) : (
 <div className="flex flex-wrap items-center gap-1.5">
 <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => inputRef.current?.click()}>
 <Upload className="mr-1 h-3 w-3" />
 Pick {label}…
 </Button>
 {linkableStages.map((s) => {
 const url = s.result?.assetUrls?.[0]
 if (!url) return null
 return (
 <Button key={s.id} type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => void link(url, s.title)}>
 <Link2 className="mr-1 h-3 w-3" />
 {s.title.length > 14 ? `${s.title.slice(0, 13)}…` : s.title}
 </Button>
 )
 })}
 </div>
 )}
 </div>
 )
}

function StrengthSlider({ value, min, max, step, onChange }: {
 value: number
 min: number
 max: number
 step: number
 onChange: (v: number) => void
}) {
 return (
 <div className="space-y-1">
 <div className="flex items-center justify-between gap-2">
 <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
 <Zap className="h-2.5 w-2.5" />
 Strength
 </span>
 <div className="flex items-center gap-1.5">
 <input
 type="number"
 aria-label="Strength"
 value={value}
 min={min}
 max={max}
 step={step}
 onChange={(e) => {
 const v = parseFloat(e.target.value)
 if (!isNaN(v)) onChange(v)
 }}
 className={cn(
 "w-20 rounded border bg-transparent px-2 py-1 text-right font-mono text-xs tabular-nums",
 "outline-none focus:ring-1 focus:ring-ring",
 )}
 />
 <span className="text-[9px] text-muted-foreground tabular-nums">
 {min}–{max}
 </span>
 </div>
 </div>
 </div>
 )
}
