/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { ControlRow, NumberControl, SelectControl, TextControl, TriControl } from "./kit"
import { KNOB_LABELS, SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "./docModel"
import type { KnobKey } from "./docModel"

/** One per-call knob control (the "Call knobs" fold). Every control has
 * an explicit "inherit" empty state: unset → the key is absent from the
 * serialized call → the window inherits the Layer A value (REPLACE
 * semantics, §10.3: absent = inherit, present = override). */
export function BeatKnobControl({
  callIndex,
  knob,
  value,
  onChange,
}: {
  callIndex: number
  knob: KnobKey
  value: number | string | boolean | undefined
  onChange: (key: string, v: number | string | boolean | undefined) => void
}) {
  const label = `Call ${callIndex} knob: ${knob}`
  // Enum knobs — the fixed option lists (same lists the engine fold
  // serves; one vocabulary, two surfaces).
  const KNOB_OPTIONS: Partial<Record<KnobKey, readonly string[]>> = {
    sampler: SAMPLER_OPTIONS,
    scheduler: SCHEDULER_OPTIONS,
    h3_sla_block_size: ["64", "128"],
    h3_sla_reference_protection: ["Off", "Light", "True"],
    h3_sla_dense_backend: ["comfy_kitchen", "pytorch", "auto"],
    sharpen_method: ["rcas", "adaptive_usm", "high_pass", "deconvolution"],
    // (2026-09-02 truth) film_net_fp32.pt is the ONLY FILM ckpt on
    // this machine (object_info-verified) — rife47.pth belongs to the
    // RIFE VFI node class, not FILMVFI.
    interpolate_model: ["film_net_fp32.pt"],
  }
  const opts = KNOB_OPTIONS[knob]
  if (opts) {
    return (
      <ControlRow label={KNOB_LABELS[knob]} density="sm">
        <SelectControl
          ariaLabel={label}
          value={typeof value === "string" ? value : undefined}
          onChange={(v) => onChange(knob, v)}
          options={opts}
        />
      </ControlRow>
    )
  }
  if (knob === "h3_sla_dense_steps") {
    return (
      <ControlRow label={KNOB_LABELS[knob]} density="sm">
        <TextControl
          ariaLabel={label}
          value={typeof value === "string" ? value : undefined}
          onChange={(v) => onChange(knob, v)}
          placeholder="inherit (0,1)"
        />
      </ControlRow>
    )
  }
  if (knob.startsWith("h3_")) {
    return (
      <ControlRow label={KNOB_LABELS[knob]} density="sm">
        <TriControl
          ariaLabel={label}
          value={typeof value === "boolean" ? value : undefined}
          onChange={(v) => onChange(knob, v)}
        />
      </ControlRow>
    )
  }
  return (
    <ControlRow label={KNOB_LABELS[knob]} density="sm">
      <NumberControl
        ariaLabel={label}
        value={typeof value === "number" ? value : undefined}
        onChange={(v) => onChange(knob, v)}
        step={knob === "sampling_steps" ? 1 : 0.1}
        min={knob === "sampling_steps" ? 1 : 0.01}
      />
    </ControlRow>
  )
}
