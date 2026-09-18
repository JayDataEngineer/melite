/**
 * BeatKnobControl — THE SCHEMA-DRIVEN KNOB FOLD (2026-09-15, the
 * operator's DOM conviction: three 'inherit' stylings, number knobs
 * as on/off selects, booleans as number inputs, two skins in one
 * grid). The fold now renders from THE CARD'S OWN CARRIER — the
 * same schemastery declaration the estate's served params-spec
 * walks (emitParamsSpec). No hand option lists, no name-prefix type
 * switches, no second skin: label = the schema's description,
 * control type = the schema's type/enum, options = the schema's
 * enum. ONE truth, the card's.
 *
 * REPLACE semantics unchanged (§10.3): unset → the key is absent
 * from the serialized call → the window inherits the Layer A value;
 * the ghost shows what it inherits (never a bare "inherit" wall).
 *
 * THE SUBSTRATE IS THE ESTATE'S ATOM (2026-09-18, the full-refactor
 * ruling): every face rides @melite/card-base's SpecAtom — number,
 * text and select-with-ghost. The bespoke controls died; the only
 * thing this file owns is the knob's GEOMETRY (a ControlRow) and
 * the replace-semantics adapter (raw-string atom edits coerced to
 * the knob's own type at the write).
 */
import { ControlRow, SpecAtom } from "@melite/card-base"
import type { SpecField } from "@melite/card-base"
import type { KnobKey, LayerA } from "./docModel"
import { KNOB_SPEC, type KnobFace } from "./knob-spec.gen"

/**
 * THE GENERATED SCHEMA FACE (2026-09-15, the operator's freehand
 * conviction: three 'inherit' stylings, number knobs as on/off
 * selects, booleans as number inputs, two skins in one grid). The
 * fold renders from knob-spec.gen — the BUILD-TIME walk of the
 * card's own carrier (scripts/gen-knob-spec.ts; freshness-gated by
 * tests/knob-spec-freshness.spec.ts; the client purity gate rightly
 * refuses runtime schemastery, so the walk ships as pure data).
 * label/type/options are the schema's. The five carrier-absent knobs
 * ride the generator's NAMED CARRIER_GAP — declared debt, not a
 * silent hand list. REPLACE semantics unchanged (§10.3): unset →
 * key absent from the serialized call → the window inherits Layer A;
 * the ghost shows what it inherits (never a bare "inherit" wall).
 */

/** The atom's raw-string edit → the knob's own type, at the write
 *  (the estate's coerce-once law; the adapters are the card's verb).
 *  NUMBER: '' → undefined (the unset mark), else Number(v) — a
 *  non-finite garbage keystroke drops, exactly the retired
 *  NumberControl's law. TEXT: trimmed, '' → undefined — the
 *  TextControl's law, kept verbatim (a trailing space dies at the
 *  write, so a knob value never carries blank ends). */
function numberEdit(
  knob: KnobKey,
  onChange: (key: string, v: number | string | boolean | undefined) => void,
): (name: string, v: unknown) => void {
  return (_name, v) => {
    if (typeof v !== 'string' || v.trim() === '') { onChange(knob, undefined); return }
    const n = Number(v)
    onChange(knob, Number.isFinite(n) ? n : undefined)
  }
}
function textEdit(
  knob: KnobKey,
  onChange: (key: string, v: number | string | boolean | undefined) => void,
): (name: string, v: unknown) => void {
  return (_name, v) => {
    const t = typeof v === 'string' ? v.trim() : ''
    onChange(knob, t === '' ? undefined : t)
  }
}

export function BeatKnobControl({
  callIndex,
  knob,
  value,
  layerA,
  onChange,
}: {
  callIndex: number
  knob: KnobKey
  value: number | string | boolean | undefined
  layerA?: LayerA
  onChange: (key: string, v: number | string | boolean | undefined) => void
}) {
  const meta: KnobFace | undefined = KNOB_SPEC[knob]
  const enumVals = meta?.enum
  const aria = `Call ${callIndex} knob: ${knob}`
  const rowLabel = meta?.label ?? knob
  // The inherited face: the Layer A value under the SAME key.
  const inheritedRaw = layerA ? (layerA as unknown as Record<string, unknown>)[knob] : undefined
  const ghost =
    inheritedRaw === undefined || inheritedRaw === null || inheritedRaw === "" ? undefined : String(inheritedRaw)
  // The select ghost's label: what the unset row inherits — '← on'
  // when known, the bare 'inherit' wall never.
  const ghostLabel = ghost === undefined ? "inherit" : `← ${ghost}`
  // The ghost's EXPLANATION (the declared tooltip — the atom renders
  // f.tooltip as the native title, the estate's existing law): what
  // unset inherits, named in prose.
  const ghostTip = ghost === undefined
    ? "unset — the engine default applies"
    : `unset — inherits ${ghost} from the run`
  const boolTip = ghost === undefined
    ? "unset — the engine default applies"
    : `unset — inherits ${ghost === "true" ? "on" : "off"} from the run`
  // NUMBER FACE facts: integer steps 1, reals step 0.1; the card gate
  // owns the validating floors (never client-side re-law).
  const step = meta?.type === "integer" ? 1 : 0.1

  // BOOLEAN FACE — on/off selects. (Only type:"boolean" routes here:
  // no KNOB_SPEC entry carries a ["true","false"] enum — all 25 enums
  // are multi-string or absent — so there is no second disjunct.)
  if (meta?.type === "boolean") {
    const f: SpecField = {
      name: knob, label: aria, type: "select",
      options: [{ value: "true", label: "on" }, { value: "false", label: "off" }],
      tooltip: boolTip,
    }
    return (
      <ControlRow label={rowLabel} density="sm">
        <SpecAtom
          f={f}
          ghost={ghost === undefined ? "inherit" : `← ${ghost === "true" ? "on" : "off"}`}
          value={value === true ? "true" : value === false ? "false" : undefined}
          onEdit={(_, v) => onChange(knob, v === undefined || v === "" ? undefined : v === "true")}
        />
      </ControlRow>
    )
  }

  // ENUM FACE — options ARE the schema's enum (declaration order).
  if (Array.isArray(enumVals) && enumVals.length > 0) {
    const f: SpecField = {
      name: knob, label: aria, type: "select",
      options: enumVals.map((v) => ({ value: String(v), label: String(v) })),
      tooltip: ghostTip,
    }
    return (
      <ControlRow label={rowLabel} density="sm">
        <SpecAtom
          f={f}
          ghost={ghostLabel}
          value={typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined}
          onEdit={(_, v) => onChange(knob, v === "" ? undefined : v as string)}
        />
      </ControlRow>
    )
  }

  // NUMBER FACE
  if (meta?.type === "number" || meta?.type === "integer") {
    const f: SpecField = { name: knob, label: aria, type: "number", step, tooltip: ghostTip }
    return (
      <ControlRow label={rowLabel} density="sm">
        <SpecAtom
          f={f}
          value={typeof value === "number" ? value : undefined}
          placeholder={ghost === undefined ? "inherit" : ghost}
          onEdit={numberEdit(knob, onChange)}
        />
      </ControlRow>
    )
  }

  // STRING FACE — free-text knobs (e.g. dense-steps interval).
  const f: SpecField = { name: knob, label: aria, type: "text", tooltip: ghostTip }
  return (
    <ControlRow label={rowLabel} density="sm">
      <SpecAtom
        f={f}
        value={typeof value === "string" ? value : undefined}
        placeholder={ghost === undefined ? "inherit" : ghost}
        onEdit={textEdit(knob, onChange)}
      />
    </ControlRow>
  )
}
