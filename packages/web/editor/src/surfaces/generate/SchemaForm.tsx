/**
 * SchemaForm — renders a complete form from a FormSpec's schema_groups.
 *
 * This is the ONE form component. Given a form-spec (from /v1/form-spec),
 * it renders all groups in order, each with its fields. Complex field types
 * (keyframes, camera, loras, etc.) delegate to slot components passed by
 * the parent.
 *
 * Usage:
 *   <SchemaForm
 *     spec={formSpec}
 *     values={paramValues}
 *     onChange={(name, val) => updateParam(name, val)}
 *     slots={{ loras: MyLoraPicker, keyframes: MyKeyframeEditor }}
 *   />
 *
 * The form maintains NO state of its own — it's fully controlled.
 * The parent owns `values` and calls the API with the collected params.
 */
import { memo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@melite/ui/button"
import type { FormSpec } from "@melite/contracts"
import { SchemaGroup } from "./SchemaGroup"
import type { FieldSlotProps, FieldValueProps } from "./SchemaField"

export interface SchemaFormProps {
  spec: FormSpec
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
    // WDC LTX Director parity — within-clip timeline slots (G1-G4)
    audio_segments?: React.ComponentType<FieldSlotProps>
    video_segments?: React.ComponentType<FieldSlotProps>
    ic_lora_motion_videos?: React.ComponentType<FieldSlotProps>
    timeline_editor?: React.ComponentType<FieldSlotProps>
  }
  /** Field names to suppress in this render context. Used when the host
   *  surface renders a field explicitly outside the schema flow (e.g. the
   *  Director inspector renders the prompt textarea itself for storyboard
   *  sync; passing ``hideFields={["prompt"]}`` prevents the schema's
   *  prompt field appearing twice). */
  hideFields?: string[]
  /** When true, all groups with ``order >= advancedOrder`` (default 10)
   *  are wrapped in a single collapsible "Advanced" accordion rather than
   *  rendered inline. Collapsed by default. Use on dense inspector surfaces
   *  (Director Studio shot inspector) where the primary user flow only
   *  needs the top-of-form groups; the rest is one click away.
   *
   *  Groups with order < advancedOrder are always rendered inline.
   *  Default false (other surfaces render all groups inline, no change). */
  collapseAdvanced?: boolean
  /** Override the order threshold for what counts as "advanced".
   *  Default 10 — matches the schema convention where 0 is the main
   *  conditioning group and 10+ is sampling, keyframes, controlnet, etc. */
  advancedOrder?: number
  /** Per-field hint renderer (e.g. speech-length preview under prompt).
   *  Passed through to every SchemaField in every group. The callback
   *  decides what (if anything) to render under each field name. */
  renderFieldHint?: FieldValueProps["renderFieldHint"]
}

function SchemaFormBase({
  spec,
  values,
  onChange,
  slots,
  hideFields,
  collapseAdvanced = false,
  advancedOrder = 10,
  renderFieldHint,
}: SchemaFormProps) {
  const groups = spec.schema_groups ?? []
  const hide = new Set(hideFields ?? [])

  // Filter out groups whose visible fields are ALL suppressed via hideFields.
  // Without this, hiding every field in a group (e.g. when a parent surface
  // like DirectorStudio renders the field explicitly outside the schema flow)
  // leaves an orphan group header with no contents — visual noise that inflates
  // the form height for no benefit. The WaypointsSlot migration hid both
  // prompt_beats and keyframes; this filter retires their empty groups.
  // A group may be marked ``hidden`` in the builder schema (image.py's
  // LanPaint/Inpaint group is the first instance). Hidden groups stay in the
  // emitted schema_groups for validation + the uploader, but SchemaForm
  // SKIPS them so they never render (the default generate card must NOT
  // show inpaint: "I DONT WANT LAN PAINT FOR MOST GENS").
  const visibleGroups = [...groups]
    .sort((a, b) => a.order - b.order)
    .filter((group) => !group.hidden)
    .filter((group) => {
      const visibleFields = group.fields.filter((f) => !hide.has(f.name))
      return visibleFields.length > 0
    })

  const primaryGroups = collapseAdvanced
    ? visibleGroups.filter((g) => g.order < advancedOrder)
    : visibleGroups
  const advancedGroups = collapseAdvanced
    ? visibleGroups.filter((g) => g.order >= advancedOrder)
    : []

  return (
    <div className="flex flex-col gap-1.5">
      {primaryGroups.map((group) => (
        <SchemaGroup
          key={group.id}
          group={group}
          values={values}
          onChange={onChange}
          slots={slots}
          hideFields={hide}
          renderFieldHint={renderFieldHint}
          contract={spec.contract}
        />
      ))}
      {advancedGroups.length > 0 && (
        <AdvancedAccordion
          groups={advancedGroups}
          values={values}
          onChange={onChange}
          slots={slots}
          hide={hide}
          renderFieldHint={renderFieldHint}
          contract={spec.contract}
        />
      )}
    </div>
  )
}

/**
 * AdvancedAccordion — wraps the parade of collapsed advanced group headers
 * (Sampling / Prompt Relay / Keyframes / ControlNet / Speed / Camera / etc)
 * in ONE collapsible container. Collapsed by default; expanding reveals
 * each group's normal SchemaGroup renderer.
 *
 * On the Director shot inspector, this collapses ~10 group headers
 * (~300px of vertical space) into one ~24px row. The primary user flow
 * (prompt → moments → resolution) never touches these.
 */
const AdvancedAccordion = memo(function AdvancedAccordion({
  groups,
  values,
  onChange,
  slots,
  hide,
  renderFieldHint,
  contract,
}: {
  groups: NonEmptyGroups
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
  slots?: SchemaFormProps["slots"]
  hide: Set<string>
  renderFieldHint?: FieldValueProps["renderFieldHint"]
  contract?: import("@melite/contracts").ConditionalContract
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.01]">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-2 py-1 text-left font-normal hover:bg-white/[0.02] transition-colors rounded-md"
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/50">
          Advanced
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-foreground/30">
          <span>{groups.length} groups</span>
          <ChevronRight
            className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </span>
      </Button>
      {open && (
        <div className="flex flex-col gap-1.5 px-1.5 pb-1.5 pt-0.5">
          {groups.map((group) => (
            <SchemaGroup
              key={group.id}
              group={group}
              values={values}
              onChange={onChange}
              slots={slots}
              hideFields={hide}
              renderFieldHint={renderFieldHint}
              contract={contract}
            />
          ))}
        </div>
      )}
    </div>
  )
})

type NonEmptyGroups = readonly (import("@melite/contracts").SchemaGroupDef)[]

export const SchemaForm = memo(SchemaFormBase)

