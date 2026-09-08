// InputCardEditor — the FIXED-field editor for kind:"input" stages.
//
// The input family's params shape is FIXED by the family signature. This
// editor renders that fixed set, gated by the DECLARED applicability
// matrix (familyTransformMatrix — the same input_prep.yaml `transforms:`
// block the backend _validate_params_for_media raises from) so the user
// can NEVER submit a transform the family rejects:
//
// source: data: URL or ComfyUI input filename (REQUIRED)
// crop: {x, y, width, height} px — IMAGE only (declared)
// scale: {width, height, method?} — IMAGE + VIDEO
// trim: {start, end} seconds — VIDEO + AUDIO
// volume: linear gain (1.0 = unity) — AUDIO only
//
// MASK REMOVED (2026-08-14): the mask painting feature (MaskEditor + the
// ``mask`` param + the ``mask`` optional output) was removed per user
// directive — the card's only output is the primary ``media``. Masked
// editing lives with the dedicated mask_studio family.
//
// The matrix is the SSOT: which fields RENDER + which params get STRIPPED
// on a source-type change are both driven by the declaration — no
// hardcoded image/video/audio branches in this file. The family validates
// the same matrix at the boundary and raises on mismatch (refusing to
// silently drop a stale transform). One declaration, two consumers, zero
// drift. (2026-08-09)
//
// The source picker is the shared SlotSquare (Phase B, 2026-08-08 — the
// design-system square every slot-shaped value uses): file picker + asset
// drag-drop, NO wire affordance — the input stage is a SOURCE, not a
// consumer (other cards' input slots wire through SlotGrid).
import { useEffect, useState } from "react"
import { Image as ImageIcon, Film, Music } from "lucide-react"

function readAsDataURLCompat(file: File): Promise<string | null> {
 return new Promise((resolve) => {
  const fr = new FileReader()
  fr.onload = () => resolve(String(fr.result))
  fr.onerror = () => resolve(null)
  fr.readAsDataURL(file)
 })
}
import type { CardStage } from "@melite/contracts"
import { SlotSquare } from "@melite/ui"
import { familyTransformMatrix, uploadToEstate } from "@melite/catalog"
import { useToastStore } from "@melite/ui"

export type MediaType = "image" | "video" | "audio" | null

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tga"])
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"])
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"])

/** Detect the media type of a source string. Pure (no side effects), so
 * the editor + tests can drive it. Returns null for unknown / missing. */
export function detectMediaType(source: unknown): MediaType {
 if (typeof source !== "string" || !source) return null
 if (source.startsWith("data:image/")) return "image"
 if (source.startsWith("data:video/")) return "video"
 if (source.startsWith("data:audio/")) return "audio"
 // ComfyUI input filenames + bare URLs — sniff by extension.
 const clean = source.split("?")[0].split("#")[0]
 const ext = clean.split(".").pop()?.toLowerCase() ?? ""
 if (IMAGE_EXT.has(ext)) return "image"
 if (VIDEO_EXT.has(ext)) return "video"
 if (AUDIO_EXT.has(ext)) return "audio"
 return null
}

interface CropParams { x?: number; y?: number; width?: number; height?: number }
interface ScaleParams { width?: number; height?: number; method?: string }
interface TrimParams { start?: number; end?: number }

/** Shape of the input family's transform params. null = absent (the
 * family treats null as "skip this transform"). */
export interface InputParams {
 source: string | null
 crop: CropParams | null
 scale: ScaleParams | null
 trim: TrimParams | null
 volume: number | null
}

/** Read the stage's current input params, defaulting missing keys to
 * null. The stage may have a partial shape (just-seeded {source: null})
 * — this normalizes it so the editor renders consistently. */
export function readInputParams(params: Record<string, unknown>): InputParams {
 return {
 source: typeof params.source === "string" ? params.source : null,
 crop: (params.crop && typeof params.crop === "object" ? params.crop : null) as CropParams | null,
 scale: (params.scale && typeof params.scale === "object" ? params.scale : null) as ScaleParams | null,
 trim: (params.trim && typeof params.trim === "object" ? params.trim : null) as TrimParams | null,
 volume: typeof params.volume === "number" ? params.volume : null,
 }
}

// Exported for the contract test (inputCardContract.test.ts) — the
// method list MUST match the family's IMAGE_SCALE_METHODS validation list
// (builders/input_prep.py); the pin is on the export, not a copy.
export const SCALE_METHODS = ["lanczos", "bicubic", "bilinear", "nearest-exact", "area"] as const

export function InputCardEditor({
 stage,
 onSave,
}: {
 stage: CardStage
 onSave: (params: Record<string, unknown>) => void
}) {
 const p = readInputParams(stage.params)
 const mediaType = detectMediaType(p.source)
 // The DECLARED media-type→param applicability matrix (catalog SSOT — the
 // same input_prep.yaml transforms: block the backend
 // _validate_params_for_media raises from). Each gated field renders iff
 // the matrix says it applies to the detected type — no hardcoded
 // image/video/audio branches. (2026-08-09)
 const matrix = familyTransformMatrix("input")
 const showField = (name: string): boolean =>
 !!mediaType && !!matrix[name]?.includes(mediaType)

 function patchCrop(part: Partial<CropParams>) {
 onSave({ crop: { ...(p.crop ?? {}), ...part } })
 }
 function patchScale(part: Partial<ScaleParams>) {
 onSave({ scale: { ...(p.scale ?? {}), ...part } })
 }
 function patchTrim(part: Partial<TrimParams>) {
 onSave({ trim: { ...(p.trim ?? {}), ...part } })
 }

 // THE UPLOAD RAIL (2026-09-06): image Files go through POST
 // /v1/uploads — the ESTATE PATH lands in the bag (the compose door
 // refuses data: refs). Video/audio keep the legacy data: URL (the
 // upload door is image-only today — a recorded gap, never silent:
 // the toast says so).
 const toast = useToastStore((s) => s.addToast)
 const [preview, setPreview] = useState<string | null>(null)
 useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
 async function handleFile(f: File) {
  if (f.type.startsWith("image/")) {
   try {
    const path = await uploadToEstate(f)
    setPreview(URL.createObjectURL(f))
    applySource(path)
    toast("success", `Uploaded ${f.name}`)
   } catch (e) {
    toast("error", (e as Error).message)
   }
   return
  }
  const url = await readAsDataURLCompat(f)
  if (url) applySource(url)
 }

 /** Attach a source URL (file-read or asset drop). Media type may have
 * changed — strip incompatible transforms so the family never sees a
 * stale payload. The patch is partial; updateStageParams merges it. */
 function applySource(url: string) {
 const patch: Record<string, unknown> = { source: url }
 const next = detectMediaType(url)
 // Strip every gated param whose DECLARED applies_to no longer includes
 // the new media type. Driven ENTIRELY by the catalog declaration (the
 // same matrix the backend raises on) — no hardcoded image/video/audio
 // branches. (2026-08-09)
 for (const [name, types] of Object.entries(matrix)) {
 if (next && !types.includes(next)) patch[name] = null
 }
 onSave(patch)
 }

 /** Clear-source wipes ALL transforms (full reset) — the stage is empty
 * again, no stale crop/scale/trim/volume. */
 function resetSource() {
 onSave({ source: null, crop: null, scale: null, trim: null, volume: null })
 }

 return (
 <div className="space-y-3" data-input-editor>
 {/* ── Source square (shared SlotSquare — file picker + asset drop;
 no wire affordance because the input stage is a SOURCE, not a
 consumer). Accepts every media type — the family auto-detects
 the type from the source bytes. ─────────────────────────── */}
 <div>
 <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Source
 </label>
 <SlotSquare
 label="source"
 value={preview ?? p.source}
 onPickFile={handleFile}
 onDropFile={handleFile}
 onDropAsset={applySource}
 onClear={resetSource}
 />
 {p.source && (
 <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
 {mediaType === "image" && <ImageIcon className="h-3 w-3" />}
 {mediaType === "video" && <Film className="h-3 w-3" />}
 {mediaType === "audio" && <Music className="h-3 w-3" />}
 <span>Detected: {mediaType ?? "unknown"}</span>
 </div>
 )}
 {!p.source && (
 <p className="mt-1 text-[10px] text-muted-foreground/60">
 Attach an image, video, or audio file (file picker or asset drop).
 </p>
 )}
 </div>

 {/* ── Transforms — gated by the DECLARED applicability matrix ──
 Each field renders iff familyTransformMatrix says it applies to
 the detected media type. No hardcoded image/video/audio blocks:
 the matrix (input_prep.yaml transforms:) is the single source,
 read by BOTH this editor and the backend _validate_params_for_media.
 Adding a gated param = a YAML line + a Literal in schema.py + a
 field renderer clause here. (2026-08-09) */}
 {mediaType && (
 <div className="space-y-2 rounded-md border border-sidebar-border/40 bg-sidebar/20 p-2.5" data-fields={mediaType}>
 {showField("crop") && (
 <CropRow crop={p.crop} onChange={patchCrop} onClear={() => onSave({ crop: null })} />
 )}
 {showField("scale") && (
 <ScaleRow scale={p.scale} onChange={patchScale} onClear={() => onSave({ scale: null })} />
 )}
 {showField("trim") && (
 <TrimRow trim={p.trim} onChange={patchTrim} onClear={() => onSave({ trim: null })} />
 )}
 {showField("volume") && (
 <div>
 <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Volume (linear gain · 1.0 = unity)
 </label>
 <input
 type="number"
 step="0.1"
 min="0"
 value={p.volume ?? ""}
 onChange={(e) => onSave({ volume: e.target.value === "" ? null : Number(e.target.value) })}
 placeholder="1.0"
 className="h-7 w-24 rounded border border-sidebar-border/60 bg-background/60 px-2 font-mono text-[11px] outline-none focus:border-brand/50"
 />
 {p.volume !== null && (
 <button
 type="button"
 onClick={() => onSave({ volume: null })}
 className="ml-2 text-[10px] text-muted-foreground/60 hover:text-foreground"
 >
 reset
 </button>
 )}
 </div>
 )}
 </div>
 )}

 {/* ── Unknown type — show a hint ──────────────────────────── */}
 {p.source && mediaType === null && (
 <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
 Unknown media type — the family could not detect the format. Try a
 different file (png/jpg, mp4/webm, mp3/wav).
 </p>
 )}
 </div>
 )
}

// ── Field rows (shared between media types) ───────────────────────────────

function CropRow({ crop, onChange, onClear }: { crop: CropParams | null; onChange: (p: Partial<CropParams>) => void; onClear: () => void }) {
 const c = crop ?? {}
 return (
 <div>
 <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Crop (px) — optional
 </label>
 <div className="grid grid-cols-4 gap-2">
 <NumberField label="x" value={c.x} onChange={(v) => onChange({ x: v })} />
 <NumberField label="y" value={c.y} onChange={(v) => onChange({ y: v })} />
 <NumberField label="width" value={c.width} onChange={(v) => onChange({ width: v })} />
 <NumberField label="height" value={c.height} onChange={(v) => onChange({ height: v })} />
 </div>
 {crop && (
 <button
 type="button"
 onClick={onClear}
 className="mt-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
 >
 clear crop
 </button>
 )}
 </div>
 )
}

function ScaleRow({ scale, onChange, onClear }: { scale: ScaleParams | null; onChange: (p: Partial<ScaleParams>) => void; onClear: () => void }) {
 const s = scale ?? {}
 return (
 <div>
 <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Scale — optional
 </label>
 <div className="flex items-end gap-2">
 <NumberField label="width" value={s.width} onChange={(v) => onChange({ width: v })} />
 <NumberField label="height" value={s.height} onChange={(v) => onChange({ height: v })} />
 <div className="flex flex-col">
 <span className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">method</span>
 <select
 value={s.method ?? "lanczos"}
 onChange={(e) => onChange({ method: e.target.value })}
 className="h-7 rounded border border-sidebar-border/60 bg-background/60 px-1 font-mono text-[10px] outline-none focus:border-brand/50"
 >
 {SCALE_METHODS.map((m) => (
 <option key={m} value={m}>{m}</option>
 ))}
 </select>
 </div>
 {scale && (
 <button
 type="button"
 onClick={onClear}
 className="ml-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
 >
 clear
 </button>
 )}
 </div>
 </div>
 )
}

function TrimRow({ trim, onChange, onClear }: { trim: TrimParams | null; onChange: (p: Partial<TrimParams>) => void; onClear: () => void }) {
 const t = trim ?? {}
 return (
 <div>
 <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Trim (seconds) — optional
 </label>
 <div className="grid grid-cols-2 gap-2">
 <NumberField label="start" value={t.start} onChange={(v) => onChange({ start: v })} step="0.1" min="0" />
 <NumberField label="end" value={t.end} onChange={(v) => onChange({ end: v })} step="0.1" min="0" />
 </div>
 {trim && (
 <button
 type="button"
 onClick={onClear}
 className="mt-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
 >
 clear trim
 </button>
 )}
 </div>
 )
}

/** A compact numeric input with a label. Empty value = undefined (the
 * family treats absent fields as "skip"). The label wraps the input so
 * screen readers + getByLabelText associate them without an explicit id. */
function NumberField({
 label,
 value,
 onChange,
 step = "1",
 min,
}: {
 label: string
 value: number | undefined
 onChange: (v: number | undefined) => void
 step?: string
 min?: string
}) {
 return (
 <label className="flex flex-col">
 <span className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">{label}</span>
 <input
 type="number"
 step={step}
 min={min}
 value={value ?? ""}
 onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
 className="h-7 rounded border border-sidebar-border/60 bg-background/60 px-2 font-mono text-[11px] outline-none focus:border-brand/50"
 />
 </label>
 )
}
