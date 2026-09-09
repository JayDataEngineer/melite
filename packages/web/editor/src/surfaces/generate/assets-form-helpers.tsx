// Shared types, constants, and small UI components for the Library generate form.
// (Extracted from the former AssetsTab.tsx godfile, Phase 2b — the godfile was
// deleted 2026-08-06; these helpers now serve the Library canvas.)
import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { readAsDataURL } from "@melite/ui"
import { Label } from "@melite/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@melite/ui/tooltip"
import { listMedia, type MediaAsset } from "../library/media"
import { HelpCircle } from "lucide-react"

// Field declarations use FormField from "@melite/contracts" — the single
// canonical flat-field type. The form-spec is the ONE source of truth for
// which fields render: the Library canvas calls loadFormSpec(values.model) and
// SchemaForm renders the result. There is no MCP-inputSchema extraction
// path — that fallback was deleted (it never fired for edit-sidebar forms
// because specKey = values.model keeps the form-spec path active).

// ── Model labels / descriptions / hidden-variant sets ─────────────────────
// ALL catalog-driven. modelLabel, modelDescription, familyLabel, and
// hiddenFromDropdown in @/lib/modelCatalog are the single source of truth
// (backed by /v1/model-catalog, which joins registry label/description onto
// each model entry). The former parallel /v1/models?category=image cache
// (_imageModelMetas / _loadImageModelMetas / ModelMeta / modelMeta) and the
// MODEL_FAMILY_LABEL / VARIANT_TOGGLE_MODELS wrappers that lived here were
// pure indirection over the catalog — deleted.

// ── TTS: engine enum ─────────────────────────────────────────────────────
// PRIMITIVE: engine visibility is now expressed as `visible_when` rules on
// the backend BuilderSchema (media/audio_schemas.py), evaluated by the
// shared SchemaForm renderer. The per-engine field map that used to be
// fetched from the `tts_voices` MCP tool is gone — it was only ever read by
// the deleted `ttsVisibleFields`. What remains is the engine-name helper
// used by `firstEngineOrDefault` to seed the active engine on first render.
// (Step 5) ttsVisibleFields and voiceCreatorVisibleFields were removed —
// their filtering is now expressed as `visible_when` rules on the backend
// BuilderSchema, evaluated by the shared SchemaForm renderer. One source of
// truth, one rendering primitive.

// ── Music: genre presets + variant defaults ─────────────────────────────
// D3 (2026-08-06): the `music_meta` MCP tool (mcp/studio/src/tools/audio.py)
// is GONE — the MCP studio server was deleted, so loadMusicMeta /
// musicGenrePrompt / musicVariantDefaults were zombie calls that always
// failed against /v1/run (model required, run_id returned). Genre-preset
// OPTIONS and per-variant defaults now come through the form spec directly
// (the schema's select options / defaults) — the ONE declarative source.

// Small uppercase tracking label for spec-sheet rows.
export function SpecLabel({ children, tooltip }: { children: ReactNode; tooltip?: string }) {
  const content = (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{children}</span>
  )
  if (!tooltip) return content
  return (
    <div className="flex items-center gap-1">
      {content}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  if (!tooltip) {
    return <Label className="text-xs text-muted-foreground capitalize">{label}</Label>
  }
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs text-muted-foreground capitalize">{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ── VoiceAssetPicker: drop-down of saved voice artifacts for ref_audio_b64 ──
// Closes the "designed voice → TTS reference" loop. Any audio artifact in
// the run-protocol archive (TTS / voice / music runs all land in the music
// bucket with artifact type "audio") can be piped into moss_tts /
// voice_creator as the reference audio for cloning. Artifact URLs are real
// server files, so picking fetches the bytes and hands the bare base64 up —
// the ref_audio_b64 wire shape (the compile endpoint uploads data: URLs to
// ComfyUI). data: URLs pass through directly.
async function pickVoiceB64(a: MediaAsset): Promise<string> {
  if (a.url.startsWith("data:")) return a.url.split(",")[1] || a.url
  const res = await fetch(a.url)
  const blob = await res.blob()
  // Shared readAsDataURL — the ONE read path every slot-shaped attach uses.
  const dataUrl = await readAsDataURL(blob)
  return dataUrl.split(",")[1] ?? ""
}

export function VoiceAssetPicker({
  selectedUrl,
  onPick,
}: {
  selectedUrl: string
  onPick: (b64: string, asset?: { name: string; url: string; mediaType: string }) => void
}) {
  // The archive is the run protocol — fetched fresh whenever the slot mounts.
  const [voiceAssets, setVoiceAssets] = useState<MediaAsset[]>([])
  useEffect(() => {
    let alive = true
    listMedia()
      .then((all) => { if (alive) setVoiceAssets(all.filter((a) => a.type === "audio")) })
      .catch(() => { if (alive) setVoiceAssets([]) })
    return () => { alive = false }
  }, [])

  const [previewUrl, setPreviewUrl] = useState<string>("")
  useEffect(() => {
    if (!selectedUrl) { setPreviewUrl(""); return }
    setPreviewUrl(`data:audio/wav;base64,${selectedUrl}`)
  }, [selectedUrl])

  if (voiceAssets.length === 0 && !previewUrl) {
    return (
      <div className="text-[10px] text-muted-foreground/70 italic">
        No saved voices yet — voices you design in <strong>Voice Maker</strong> will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Select
          value=""
          onValueChange={(id) => {
            const a = voiceAssets.find((x) => x.id === id)
            if (!a) return
            void pickVoiceB64(a).then((b64) => {
              onPick(b64, { name: a.name, url: a.url, mediaType: "audio/wav" })
              setPreviewUrl(a.url)
            })
          }}
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="Pick a saved voice…" />
          </SelectTrigger>
          <SelectContent>
            {voiceAssets.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                <span className="truncate">{a.name}</span>
                <span className="ml-1 text-[9px] text-muted-foreground/70">· audio</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {previewUrl && (
        <audio src={previewUrl} controls className="w-full h-7" />
      )}
    </div>
  )
}
