import { useEffect } from "react"
import { Label } from "@melite/ui/label"
import { Tip } from "@melite/ui/tip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@melite/ui/select"
import type { LoRAEntry, LoRAAdapter } from "@melite/contracts"
import { kindSpecOf, loraAdaptersOf } from "@melite/contracts"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

interface LoraPickerProps {
  model: string
  /** Selected LoRAs — the canonical primitive (see lib/loraTypes.ts). */
  value: LoRAEntry[]
  onChange: (v: LoRAEntry[]) => void
  /** Optional toast function — reserved for callers that surface store
   *  errors beyond the store's own toast (the spec store toasts fetch
   *  failures itself; the picker does not double-toast). */
  onError?: (msg: string) => void
  /** Render variant: "dark" for video editor, "light" for assets tab */
  variant?: "dark" | "light"
  /** When true, the picker is rendered with a header row. */
  showHeader?: boolean
}

/** ALL BUILT IN (operator order, 2026-09-10): there is NO loras remote.
 *  The lora list rides the SAME path every card surface rides — the
 *  served form spec's ``modifiers`` block (kind "lora"), whose options
 *  ARE the catalog (family-owned rows declared in the family package's
 *  mods/loras.ts, composed into the spec server-side). The spec
 *  contract store loads + validates it once per model; the picker
 *  derives its list through the ONE projection (loraAdaptersOf) —
 *  no private fetch, no parallel catalog, no second spelling. */
export function LoraPicker({ model, value, onChange, variant = "dark", showHeader = true }: LoraPickerProps) {
  const record = useSpecContractStore((s) => s.records[model])
  const loadFormSpec = useSpecContractStore((s) => s.loadFormSpec)

  // Passive mount → the store's loadFormSpec (deduped, validated,
  // toasted on failure by the store — the one error surface).
  useEffect(() => {
    void loadFormSpec(model)
  }, [model, loadFormSpec])

  const spec = record?.state === "loaded" ? record.spec : null
  const adapters: LoRAAdapter[] = loraAdaptersOf(kindSpecOf(spec, "lora"))
  const loading = record?.state !== "loaded"
  const byName = new Map(adapters.map((a) => [a.name, a]))

  // PRIMITIVE: `value` is already the wire format (LoRAEntry[]). No parsing.
  const entries = value
  const selectedNames = new Set(entries.map(e => e.id))

  // Label resolution: the adapter's declared label → its bare name. No
  // filename regex guessing (the old fallbackLabel had hardcoded strips
  // that were model-specific label cosmetics). A LoRA without a label
  // shows its name — honest, no surprises. To label a LoRA nicely,
  // declare it on the family's mods/loras.ts row (family-owned data,
  // composed into the served spec).
  const labelFor = (name: string): string => byName.get(name)?.label ?? name
  const defaultStrengthFor = (name: string): number => byName.get(name)?.default_strength ?? 1.0

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

  const unselected = adapters.map((a) => a.name).filter(n => !selectedNames.has(n))

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
      ) : adapters.length === 0 ? (
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
          {record?.state === "error" && (
            <div className={`text-[9px] italic ${textMuted} pt-0.5`}>
              LoRA list failed to load: {record.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
