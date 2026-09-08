/**
 * Generic schema-driven group renderer.
 *
 * Renders a labeled collapsible box containing a grid of fields. Each field
 * is rendered by <SchemaField>. Visibility is controlled by visible_when
 * expressions evaluated against the current param values.
 *
 * Uses the same theme tokens (border, bg-muted/20, text-muted-foreground)
 * and the shared FieldLabel/SpecLabel pattern as the rest of the editor —
 * schema-driven surfaces are visually indistinguishable from bespoke forms.
 * The collapse chevron is a lucide ChevronRight icon rotated via Tailwind
 * (replaces the old ▶ text glyph).
 */
import { useState, memo } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@melite/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@melite/ui/tooltip"
import { HelpCircle } from "lucide-react"
import type { SchemaGroupDef as TSchemaGroup, ConditionalContract } from "@melite/contracts"
import { evalVisibleWhen } from "@melite/contracts"
import { SchemaField, type FieldSlotProps, type FieldValueProps } from "./SchemaField"

export interface SchemaGroupProps {
 group: TSchemaGroup
 values: Record<string, unknown>
 onChange: (name: string, value: unknown) => void
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
 ideogram_canvas?: React.ComponentType<FieldSlotProps>
 }
 /** Field names to suppress (passed through from SchemaForm.hideFields). */
 hideFields?: Set<string>
 /** Per-field hint renderer (G5 speech-length preview under prompt). */
 renderFieldHint?: FieldValueProps["renderFieldHint"]
 /** The form's conditional contract (spec.contract) — threaded through to
 * each SchemaField for per-mode required/forbidden/violation indicators.
 * Undefined for forms without a contract (no-op). */
 contract?: ConditionalContract
}

/** Map the schema's ``columns`` int to a Tailwind grid-cols class.
 * Clamped to [1,4]; falls back to 2 when unspecified. */
function gridColsClass(columns: number | undefined): string {
 const n = Math.max(1, Math.min(4, columns ?? 2))
 // Tailwind requires literal class names for the JIT — emit the four
 // possibilities explicitly so the compiler sees them.
 switch (n) {
 case 1: return "grid-cols-1"
 case 2: return "grid-cols-2"
 case 3: return "grid-cols-3"
 case 4: return "grid-cols-4"
 default: return "grid-cols-2"
 }
}

function SchemaGroupBase({ group, values, onChange, slots, hideFields, renderFieldHint, contract }: SchemaGroupProps) {
 const [collapsed, setCollapsed] = useState(group.collapsed)
 const hide = hideFields ?? new Set<string>()

 // Check group-level visibility
 if (!evalVisibleWhen(group.visible_when, values)) return null

 // Filter hidden fields + invisible ones in one pass. When every field
 // is hidden the group renders nothing (no empty box).
 const visibleFields = group.fields.filter(
 (f) => !hide.has(f.name) && evalVisibleWhen(f.visible_when, values),
 )
 if (visibleFields.length === 0) return null

 // Body className derives from the schema-declared layout primitive.
 // ``grid`` (default) uses the columns count; ``row`` is a single flex
 // row; ``stacked`` is a vertical column. The Python schema is the
 // single source of truth for which groups use which.
 const layout = group.layout ?? "grid"
 const bodyClassName =
 layout === "row" ? "flex flex-row gap-1.5 flex-wrap px-2 pb-1.5 pt-0.5"
 : layout === "stacked" ? "flex flex-col gap-1.5 px-2 pb-1.5 pt-0.5"
 : `grid ${gridColsClass(group.columns)} gap-1.5 px-2 pb-1.5 pt-0.5`

 return (
 <div className="rounded-md border border-border/60 bg-muted/20">
  <Button
  type="button"
  variant="ghost"
  className="flex w-full items-center justify-between px-2 py-1 text-left font-normal hover:bg-muted/40 transition-colors rounded-md"
  onClick={() => setCollapsed(!collapsed)}
  aria-expanded={!collapsed}
  >
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
 {group.label}
 </span>
 {group.tooltip && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
 </TooltipTrigger>
 <TooltipContent className="max-w-xs text-xs">
 {group.tooltip}
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
  <ChevronRight
  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}
  />
  </Button>

 {!collapsed && (
 <div className={bodyClassName}>
 {visibleFields.map((field) => (
 <SchemaField
 key={field.name}
 field={field}
 value={values[field.name]}
 onChange={onChange}
 slots={slots}
 allValues={values}
 renderFieldHint={renderFieldHint}
 contract={contract}
 />
 ))}
 </div>
 )}
 </div>
 )
}

export const SchemaGroup = memo(SchemaGroupBase)
