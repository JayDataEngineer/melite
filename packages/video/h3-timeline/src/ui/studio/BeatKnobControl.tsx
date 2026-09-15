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
 */
import { ControlRow, NumberControl, SelectControl, TextControl } from "./kit"
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
  if (meta?.type === "boolean" || (Array.isArray(enumVals) && enumVals.length === 2
      && String(enumVals[0]) === "true" && String(enumVals[1]) === "false")) {
    return (
      <ControlRow label={rowLabel} density="sm">
        <SelectControl
          ariaLabel={aria}
          value={value === true ? "true" : value === false ? "false" : undefined}
          onChange={(v) => onChange(knob, v === undefined ? undefined : v === "true")}
          options={[{ value: "true", label: "on" }, { value: "false", label: "off" }]}
          emptyLabel={ghost === undefined ? "inherit" : `← ${ghost === "true" ? "on" : "off"}`}
          title={ghost === undefined ? "unset — the engine default applies" : `unset — inherits ${ghost === "true" ? "on" : "off"} from the run`}
        />
      </ControlRow>
    )
  }

  // ENUM FACE — options ARE the schema's enum (declaration order).
  if (Array.isArray(enumVals) && enumVals.length > 0) {
    return (
      <ControlRow label={rowLabel} density="sm">
        <SelectControl
          ariaLabel={aria}
          value={typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined}
          onChange={(v) => onChange(knob, v)}
          options={enumVals.map((v) => ({ value: String(v), label: String(v) }))}
          emptyLabel={ghost === undefined ? "inherit" : `← ${ghost}`}
          title={ghost === undefined ? "unset — the engine default applies" : `unset — inherits ${ghost} from the run`}
        />
      </ControlRow>
    )
  }

  // NUMBER FACE — integer steps 1, reals step 0.1; the card gate
  // owns the validating floors (never client-side re-law).
  if (meta?.type === "number" || meta?.type === "integer") {
    return (
      <ControlRow label={rowLabel} density="sm">
        <NumberControl
          ariaLabel={aria}
          value={typeof value === "number" ? value : undefined}
          onChange={(v) => onChange(knob, v)}
          step={meta.type === "integer" ? 1 : 0.1}
          placeholder={ghost === undefined ? "inherit" : ghost}
          title={ghost === undefined ? "unset — the engine default applies" : `unset — inherits ${ghost} from the run`}
        />
      </ControlRow>
    )
  }

  // STRING FACE — free-text knobs (e.g. dense-steps interval).
  return (
    <ControlRow label={rowLabel} density="sm">
      <TextControl
        ariaLabel={aria}
        value={typeof value === "string" ? value : undefined}
        onChange={(v) => onChange(knob, v)}
        placeholder={ghost === undefined ? "inherit" : ghost}
      />
    </ControlRow>
  )
}
