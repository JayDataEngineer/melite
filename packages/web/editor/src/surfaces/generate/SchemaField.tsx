/**
 * Generic schema-driven field renderer — the ONE field primitive.
 *
 * Renders a single field based on its type. Standard types (number, slider,
 * select, boolean, text, textarea, seed) use shadcn/ui inputs themed via
 * the project's CSS variables (bg-input, border-input, text-muted-foreground)
 * so they match the rest of the editor in both light and dark mode. Complex
 * types (keyframes, camera, prompt_beats, loras, controlnet, image, audio,
 * video) delegate to registered component slots passed by the parent.
 *
 * This component is deliberately dumb — it reads the field definition and
 * the current value, renders the right input, and calls onChange. No
 * model-specific logic, no hardcoded defaults.
 *
 * Theme tokens used here MUST match assets-form-helpers.tsx (NUM_INPUT_CLS,
 * FieldLabel) so schema-driven surfaces are visually indistinguishable from
 * bespoke form surfaces — the user-flagged "two parallel styling systems"
 * problem is fixed at the primitive layer.
 */
import { memo } from "react"
import { Input } from "@melite/ui/input"
import { Textarea } from "@melite/ui/textarea"
import { Switch } from "@melite/ui/switch"
import { Slider } from "@melite/ui/slider"
import { Button } from "@melite/ui/button"
import { Dices } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"
import { FieldLabel } from "./assets-form-helpers"
import type { SchemaFieldDef as TSchemaField, ConditionalContract } from "@melite/contracts"
import {
  optionLabel,
  optionValue,
  fieldRequiredInMode,
  fieldForbiddenInMode,
  validateContract,
} from "@melite/contracts"
import { Tip } from "@melite/ui/tip"

export interface FieldValueProps {
  field: TSchemaField
  value: unknown
  onChange: (name: string, value: unknown) => void
  /** Full form values — for slots that need cross-field context
   *  (e.g. ideogram_canvas reads width/height for aspect ratio). */
  allValues?: Record<string, unknown>
  /** The form's conditional contract (spec.contract) — drives per-mode
   *  required asterisks, forbidden dimming, and inline violation
   *  messages. Undefined for forms whose family declares no contract
   *  (the common case) → all indicators are no-ops. */
  contract?: ConditionalContract
  /** Slot renderers for complex field types. */
  slots?: {
    keyframes?: React.ComponentType<FieldSlotProps>
    prompt_beats?: React.ComponentType<FieldSlotProps>
    camera?: React.ComponentType<FieldSlotProps>
    loras?: React.ComponentType<FieldSlotProps>
    controlnet?: React.ComponentType<FieldSlotProps>
    image?: React.ComponentType<FieldSlotProps>
    image_list?: React.ComponentType<FieldSlotProps>
    audio?: React.ComponentType<FieldSlotProps>
    video?: React.ComponentType<FieldSlotProps>
    /** Voice Studio VoiceID drop zone — accepts VoiceID + VoiceID-Large files (.qvoice on disk). */
    voice_file?: React.ComponentType<FieldSlotProps>
    ideogram_canvas?: React.ComponentType<FieldSlotProps>
  }
  /** Optional hint renderer fired UNDER a specific field. Keyed by field
   *  name. Used for cross-field context that doesn't fit the slot pattern
   *  (e.g. speech-length preview under the `prompt` textarea — G5). The
   *  callback receives the current value + allValues so it can fetch /
   *  debounce / cancel based on its own state. Returning null/undefined
   *  suppresses the hint entirely. */
  renderFieldHint?: (
    fieldName: string,
    value: unknown,
    allValues: Record<string, unknown>,
  ) => React.ReactNode | null
}

export interface FieldSlotProps {
  field: TSchemaField
  value: unknown
  onChange: (name: string, value: unknown) => void
  /** Full form values — for slots that need cross-field context
   *  (e.g. ideogram_canvas reads width/height for aspect ratio). */
  allValues?: Record<string, unknown>
}

function SchemaFieldBase({ field, value, onChange, slots, allValues, renderFieldHint, contract }: FieldValueProps) {
  const label = field.label || field.name.replace(/_/g, " ")
  const vals = allValues ?? {}
  // ── Contract indicators (Phase 3) ──
  // Per-mode required asterisk + forbidden dimming + inline violation
  // messages. All no-ops when contract is undefined (the 95% case).
  const required = fieldRequiredInMode(contract, field.name, vals)
  const forbidden = fieldForbiddenInMode(contract, field.name, vals)
  const violations = contract
    ? validateContract(contract, vals).filter(
        (v) => v.field === field.name || v.field.split("|").includes(field.name),
      )
    : []
  // Layout hint — Tailwind requires literal class names for JIT, so emit
  // the four span values explicitly. Default is span-2 (full row in a
  // 2-col grid, half row in a 4-col grid).
  const w = Math.max(1, Math.min(4, field.width ?? 2))
  const colSpan =
    w === 1 ? "col-span-1"
    : w === 2 ? "col-span-2"
    : w === 3 ? "col-span-3"
    : "col-span-4"

  // ── Complex types → delegate to slot components ──
  // Lookup mirrors the original explicit-per-type dispatch. Each slot is
  // optional; a missing slot falls through to the inline renderer below,
  // which renders a text input — so a missing slot is visible immediately
  // during development rather than silently hiding the field.
  const slotMap = {
    keyframes: slots?.keyframes,
    prompt_beats: slots?.prompt_beats,
    camera: slots?.camera,
    loras: slots?.loras,
    controlnet: slots?.controlnet,
    image: slots?.image,
    image_list: slots?.image_list,
    audio: slots?.audio,
    video: slots?.video,
    voice_file: slots?.voice_file,
    ideogram_canvas: slots?.ideogram_canvas,
  } as const
  const Slot = (slotMap as Record<string, React.ComponentType<FieldSlotProps> | undefined>)[field.type]
  if (Slot) {
    return (
      <div className={colSpan}>
        <Slot field={field} value={value} onChange={onChange} allValues={allValues} />
      </div>
    )
  }

  // ── Standard types → shadcn/ui inputs ──
  return (
    <div className={`flex flex-col gap-0.5 ${colSpan} ${forbidden ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-1">
        <FieldLabel label={label} tooltip={field.tooltip || undefined} />
        {required && (
          <Tip tip="required in this mode">
            <span className="text-[10px] font-semibold text-primary leading-none" aria-label="required in this mode">
              *
            </span>
          </Tip>
        )}
        {forbidden && (
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70 leading-none">
            n/a
          </span>
        )}
      </div>

      {field.type === "textarea" && (
        <>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.tooltip || ""}
            rows={2}
            className="text-xs min-h-[2rem] resize-y bg-input/25 border-input/70 focus-visible:bg-input/40 py-1"
          />
          {renderFieldHint?.(field.name, value, allValues ?? {})}
        </>
      )}

      {field.type === "text" && (
        <Input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.tooltip || ""}
          className="h-8 text-sm bg-input/25 border-input/70 focus-visible:bg-input/40"
        />
      )}

      {field.type === "number" && (
        <Input
          type="number"
          value={(value as number) ?? (field.default as number) ?? 0}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          step={field.step ?? undefined}
          onChange={(e) => onChange(field.name, Number(e.target.value))}
          className="h-8 text-sm bg-input/35 border-input/70 focus-visible:bg-input/55 tabular-nums text-right"
        />
      )}

      {field.type === "slider" && (
        <div className="flex items-center gap-2 pt-1.5">
          <Slider
            value={[(value as number) ?? (field.default as number) ?? 0]}
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.1}
            onValueChange={(v) => onChange(field.name, v[0])}
            className="flex-1"
          />
          <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
            {((value as number) ?? (field.default as number) ?? 0).toFixed(
              (field.step ?? 0.1) < 1 ? 2 : 0,
            )}
          </span>
        </div>
      )}

      {field.type === "select" && (
        <Select
          value={String((value as string) ?? field.default ?? "")}
          onValueChange={(v) => onChange(field.name, v)}
        >
          <SelectTrigger aria-label={label} className="h-8 text-sm bg-input/25 border-input/70">
            <SelectValue placeholder={field.tooltip || "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={optionValue(opt)} value={optionValue(opt)} className="text-sm">
                {optionLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "boolean" && (
        <div className="flex items-center justify-between rounded border border-border/50 bg-muted/20 px-2 py-0.5 h-7">
          <span className="text-[10px] text-muted-foreground">
            {Boolean(value) ? "On" : "Off"}
          </span>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(chk: boolean) => onChange(field.name, chk)}
          />
        </div>
      )}

      {field.type === "seed" && (
        <SeedInput
          value={(value as number) ?? (field.default as number) ?? -1}
          onChange={(v) => onChange(field.name, v)}
        />
      )}

      {/* Contract violations for this field (Phase 3) — the inline mirror
          of the backend's parse-time run_contract errors. Shows the user
          WHY the field is wrong before the POST 400s. */}
      {violations.map((v, i) => (
        <p key={i} className="text-[10px] text-destructive leading-snug">
          {v.message}
        </p>
      ))}
    </div>
  )
}

function SeedInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const isRandom = value === -1
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={isRandom ? "" : value}
        placeholder="random"
        onChange={(e) => onChange(e.target.value === "" ? -1 : Number(e.target.value))}
        className="h-8 text-sm bg-input/35 border-input/70 tabular-nums text-right"
      />
      <Tip tip="Randomize seed">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={() => onChange(Math.floor(Math.random() * 2_147_483_647))}
          aria-label="Randomize seed"
        >
          <Dices className="h-3.5 w-3.5" />
        </Button>
      </Tip>
    </div>
  )
}

export const SchemaField = memo(SchemaFieldBase)
