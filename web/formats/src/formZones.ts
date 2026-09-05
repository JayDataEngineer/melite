// formZones — the form-card anatomy (card-studio-pattern.md §4, extended
// 2026-08-16: "a) Outputs b) Inputs c) Parameters d) Mods").
//
// Every form card renders the same skeleton:
//
//     Outputs → Inputs → Model → Parameters → Mods
//
// The backend OWNS the vocabulary: each schema group carries a `zone`
// tag ("outputs" | "inputs" | "model" | "params" | "mods"). Outputs and
// Model are NOT schema groups by default — Outputs is the features-driven
// output CONTRACT (primary_output / outputs formats / optional_outputs
// from the family block + the produced artifacts; CardOutputs renders
// it), Model is the features-driven catalog-tree row (variant folders +
// quant cells from the yaml files). The frontend is the declared dumb
// renderer: it reads the zone off the wire and renders headers only
// when a zone has content (skip-empty).
//
// Slot-typed fields (image/video/audio/voice_file) always render in
// Inputs via SlotGrid REGARDLESS of their group's zone — the zone says
// where a group's NON-slot fields render (mixed groups like tts `voice`
// keep their selects in Parameters).

import type { SchemaGroupDef } from "@melite/contracts"

export const FORM_ZONES = ["outputs", "inputs", "model", "params", "mods"] as const
export type FormZone = (typeof FORM_ZONES)[number]

// Compile-time parity with the WIRE union (generated schema.d.ts —
// SchemaGroupDef.zone, itself derived from media.comfyui.schema ZONES).
// Both directions must be exact: a backend vocabulary change that isn't
// re-synced (or a hand-edit here) fails tsc on this line — the same
// cross-language drift-test pattern as WIRE_WIDGETS.
type _WireZone = NonNullable<SchemaGroupDef["zone"]>
type AssertNever<T extends never> = T
export type _ZoneParityWire = AssertNever<Exclude<_WireZone, FormZone>>
export type _ZoneParityFrontend = AssertNever<Exclude<FormZone, _WireZone>>

/** A group without a zone tag (or with an unknown one) is params —
 * the backend default, mirrored here so the frontend never guesses. */
export function zoneOfGroup(group: Pick<SchemaGroupDef, "zone">): FormZone {
  const z = group.zone ?? "params"
  return FORM_ZONES.includes(z as FormZone) ? (z as FormZone) : "params"
}

/** fieldName → its group's zone. The params flow (ParamEditor) uses this
 * as the backstop: non-params-zone fields are excluded from the flat
 * params flow — they belong to their zone's surface (Inputs via
 * SlotGrid, Mods via SubcardGrid). */
export function zoneByField(schemaGroups: SchemaGroupDef[]): Map<string, FormZone> {
  const map = new Map<string, FormZone>()
  for (const g of schemaGroups ?? []) {
    const zone = zoneOfGroup(g)
    for (const f of g.fields ?? []) {
      map.set(f.name, zone)
    }
  }
  return map
}
