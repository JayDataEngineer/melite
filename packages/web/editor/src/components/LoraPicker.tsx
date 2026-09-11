import { useState, useEffect } from "react"
import { Label } from "@melite/ui/label"
import { Tip } from "@melite/ui/tip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@melite/ui/select"
import { apiJson } from "@melite/catalog"
import type { LoRAEntry } from "@melite/contracts"

interface LoraPickerProps {
  model: string
  /** Selected LoRAs — the canonical primitive (see lib/loraTypes.ts). */
  value: LoRAEntry[]
  onChange: (v: LoRAEntry[]) => void
  /** Optional toast function — when provided, fetch failures surface as a
   *  toast instead of degrading silently. Pass through from parent. */
  onError?: (msg: string) => void
  /** Render variant: "dark" for video editor, "light" for assets tab */
  variant?: "dark" | "light"
  /** When true, the picker is rendered with a header row. */
  showHeader?: boolean
}

/** Catalog-declared per-LoRA metadata (keyed by filename stem). */
interface LoraMeta {
  label?: string
  category?: string
  default_strength?: number
  prompt_hint?: string
}

interface LoraListResponse {
  model: string
  loras: string[]
  note?: string | null
  meta?: Record<string, LoraMeta>
}

function stemOf(filename: string): string {
  return filename.replace(/\.(safetensors|pt|bin)$/, "")
}

export function LoraPicker({ model, value, onChange, onError, variant = "dark", showHeader = true }: LoraPickerProps) {
  const [available, setAvailable] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, LoraMeta>>({})
  const [loading, setLoading] = useState(true)

  // PRIMITIVE: `value` is already the wire format (LoRAEntry[]). No parsing.
  const entries = value
  const selectedNames = new Set(entries.map(e => e.id))

  useEffect(() => {
    setLoading(true)
    // Route through apiJson (not raw fetch) so we get:
    //   • retry/backoff on transient 5xx and network errors (the most
    //     common cause of the old "Unexpected end of JSON input" — a 5xx
    //     with empty body, which raw fetch's r.json() then choked on)
    //   • GET dedup (kills the React.StrictMode double-fire)
    //   • a real error message with the HTTP status, instead of the
    //     cryptic "Failed to execute 'json' on 'Response'" SyntaxError
    //     that hid the actual status code from the user.
    apiJson<LoraListResponse>(`/v1/loras?model=${encodeURIComponent(model)}`)
      .then((data) => {
        setAvailable(data.loras || [])
        setNote(data.note ?? null)
        setMeta(data.meta ?? {})
      })
      .catch((e: unknown) => {
        // NO SILENT SWALLOW: LoRAs vanishing from the picker is a real
        // failure (broken /v1/loras endpoint, model typo, backend down).
        // Surface via the optional onError toast if the parent wired one
        // through; always log so dev tools see it. The empty state is
        // honest — the user sees "No LoRAs installed" with a diagnostic,
        // not a silently blank picker.
        const msg = e instanceof Error ? e.message : String(e)
        console.error("[LoraPicker] failed to load LoRA list:", msg)
        onError?.(`LoRA list failed to load: ${msg}`)
        setAvailable([]); setNote(null); setMeta({})
      })
      .finally(() => setLoading(false))
  }, [model, onError])

  const metaFor = (filename: string): LoraMeta => meta[stemOf(filename)] ?? {}
  // Label resolution: /v1/loras meta → bare stem. No filename regex guessing
  // (the old fallbackLabel had hardcoded strips for ltx-2/22b-/19b-/id-lora-/
  // celebvhq- that were model-specific label cosmetics). A LoRA without a
  // meta label shows its stem — honest, no surprises. To label a LoRA
  // nicely, declare it on the family's mods/loras.ts row
  // (label/default_strength — family-owned data, served via /v1/loras).
  const labelFor = (filename: string): string => metaFor(filename).label ?? stemOf(filename)
  const defaultStrengthFor = (filename: string): number => metaFor(filename).default_strength ?? 1.0

  const addLora = (name: string) => {
    if (!name || selectedNames.has(name)) return
    onChange([...entries, { id: name, strength: defaultStrengthFor(name) }])
  }

  const removeLora = (name: string) => {
    onChange(entries.filter(e => e.id !== name))
  }

  const setStrength = (name: string, strength: number) => {
    onChange(entries.map(e =>
      e.id === name ? { ...e, strength: Math.round(strength * 100) / 100 } : e
    ))
  }

  const unselected = available.filter(n => !selectedNames.has(n))

  const isDark = variant === "dark"
  const textMuted = isDark ? "text-foreground/25" : "text-muted-foreground/50"
  const labelClass = isDark
    ? "text-[9px] font-medium text-foreground/30 uppercase tracking-wider"
    : "text-xs text-muted-foreground"

  return (
    <div className="space-y-1.5">
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <Label className={labelClass}>LoRA Adapters</Label>
          {entries.length > 0 && (
            <Tip tip="Clear all selected LoRAs">
            <button
              onClick={() => onChange([])}
              className={`text-[9px] underline ${textMuted} hover:text-foreground`}
            >
              clear
            </button>
            </Tip>
          )}
        </div>
      )}

      {loading ? (
        <div className={`text-[10px] ${textMuted} py-1`}>Loading…</div>
      ) : available.length === 0 ? (
        <div className={`text-[10px] ${textMuted} py-1`}>No LoRAs installed for this model.</div>
      ) : (
        <Select value="" onValueChange={addLora} disabled={unselected.length === 0}>
          <SelectTrigger className="h-7 text-[10px] w-full">
            <SelectValue placeholder={unselected.length === 0 ? "All adapters active" : "Add adapter…"} />
          </SelectTrigger>
          <SelectContent>
            {unselected.map(name => (
              <SelectItem key={name} value={name} className="text-[10px]">
                {labelFor(name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entries.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          {entries.map(({ id: name, strength }) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`truncate flex-1 text-[10px] font-medium ${isDark ? "text-foreground/70" : "text-foreground"}`}>
                {labelFor(name)}
              </span>
              <input
                type="range" min={0} max={5} step={0.05} value={strength}
                onChange={e => setStrength(name, Number(e.target.value))}
                className="w-20 shrink-0 h-4 cursor-pointer accent-primary"
              />
              <input
                type="number" min={0} max={5} step={0.05}
                value={strength}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) setStrength(name, Math.min(5, Math.max(0, v)))
                }}
                className={`w-12 shrink-0 text-[9px] font-mono tabular-nums text-center rounded border px-1 py-0.5 bg-transparent outline-none focus:ring-1 focus:ring-ring ${
                  isDark ? "border-white/15 text-foreground/50" : "border-border text-muted-foreground"
                }`}
              />
              <Tip tip={`Remove ${labelFor(name)}`}>
              <button
                onClick={() => removeLora(name)}
                aria-label={`Remove ${labelFor(name)}`}
                className={`shrink-0 text-[10px] leading-none ${textMuted} hover:text-foreground transition-colors`}
              >
                ✕
              </button>
              </Tip>
            </div>
          ))}
          {note && (
            <div className={`text-[9px] italic ${textMuted} pt-0.5`}>{note}</div>
          )}
        </div>
      )}
    </div>
  )
}
