/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { CheckControl, ControlRow, NumberControl, SelectControl } from "./kit"
import s from "./studio.module.css"
import { SPEED_LORA_OPTIONS } from "./docModel"
import type { LayerA, SetLayerAKey } from "./docModel"
import { useEffect, useState } from "react"
import type { ReactElement } from "react"
import { fetchFormSpec, SpecFieldRow, type FormSpecDoc, type SpecField } from "@melite/card-base"

/** The spec's name → LayerA's key (the h3_ prefix is the studio's
 * document spelling of the card's renderer vocabulary). */
function layerKey(name: string): string {
  return name.startsWith("sla_") ? "h3_" + name : name
}

/** Layer A rail: SLA lab + Speed LoRA + Post-processing (lines 2905–3188).
 *
 * Hour 16, item 3: the compose-read knobs (the SLA family + the
 * sharpen leaves) RIDE THE SERVED SPEC now — /v1/form-spec?model=
 * h3-timeline declares them; SpecFieldRow renders each with the
 * declaration's shape (slider/select/number ranges). The section
 * layout and the conditional leaves stay studio logic (visible_when
 * is single-equality — "method ≠ rcas" is not expressible). The
 * Speed LoRA + RTX + CRF rows are document-local vocabulary (not
 * card params; the compose never reads them) and stay hand-rolled. */
export function RunAdvancedPanels({
  layerA, setLayerAKey,
}: {
  layerA: LayerA
  setLayerAKey: SetLayerAKey
}) {
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  useEffect(() => {
    const ctl = new AbortController()
    void fetchFormSpec("h3-timeline", ctl.signal)
      .then((doc) => { setSpec(doc) })
      .catch(() => { /* spec door refused — hand-rolled rows below keep the rail alive */ })
    return () => { ctl.abort() }
  }, [])
  const byName = new Map((spec?.fields ?? []).map((f: SpecField) => [f.name, f]))
  const row = (name: string): ReactElement | null => {
    const f = byName.get(name)
    if (f === undefined) return null
    const key = layerKey(name)
    const values = layerA as unknown as Record<string, unknown>
    return (
      <SpecFieldRow
        f={f}
        value={values[key]}
        onEdit={(k, v) => {
          (setLayerAKey as unknown as (kk: string, vv: unknown) => void)(layerKey(k), v)
        }}
      />
    )
  }
  return (
    <>
    {/* SLA lab — only when Attention = SLA (block-sparse). */}
    {(layerA.h3_attention ?? "kitchen") === "sla" && (
    <div className={s.group} data-testid="tl-sla-panel">
      <div className={s.groupTitle}>
        SLA — block-sparse attention
      </div>
      {row("sla_sparsity")}
      {row("sla_block_size")}
      {row("sla_min_seq_len")}
      {row("sla_dense_last_steps")}
      {row("sla_dense_steps")}
      {row("sla_dense_backend")}
      {row("sla_reference_protection")}
      {row("sla_protect_audio")}
      {row("sla_stabilize_motion")}
      {row("sla_disable_fp16_accum")}
    </div>
    )}
    {/* Speed adapter (plaguekind parity: the lightx2v LoRA at
        0.8 riding the model). Serializes as the family's loras
        vocabulary [{name, strength?}]; empty = none. */}
    <div className={s.group} data-testid="tl-lora-panel">
      <div className={s.groupTitle}>
        Speed LoRA
      </div>
      <ControlRow label="Name">
        <SelectControl
          ariaLabel="Speed LoRA name (run)"
          value={layerA.lora_name}
          onChange={(v) => setLayerAKey("lora_name", v)}
          options={SPEED_LORA_OPTIONS}
          emptyLabel="none"
          width="w-40"
        />
      </ControlRow>
      <ControlRow label="Strength">
        <NumberControl
          ariaLabel="Speed LoRA strength (run)"
          value={layerA.lora_strength}
          onChange={(v) => setLayerAKey("lora_strength", v)}
          min={0} max={1.5} step={0.05}
          placeholder="0.8"
          width="w-32"
        />
      </ControlRow>
    </div>
    {/* Post-processing — sharpen + interpolation, post-decode. */}
    <div className={s.group} data-testid="tl-post-panel">
      <div className={s.groupTitle}>
        Post-processing
      </div>
      {row("sharpen_enabled")}
      {layerA.sharpen_enabled && (<>
      {row("sharpen_method")}
      {row("sharpen_strength")}
      {(layerA.sharpen_method ?? "rcas") !== "rcas" && row("sharpen_radius")}
      {layerA.sharpen_method === "adaptive_usm" && row("sharpen_threshold")}
      {layerA.sharpen_method === "deconvolution" && row("sharpen_iterations")}
      </>)}
      {row("interpolate_enabled")}
      {layerA.interpolate_enabled && (<>
      <ControlRow label="Model">
        <SelectControl
          ariaLabel="Interpolation model (run)"
          value={layerA.interpolate_model ?? "film_net_fp16.safetensors"}
          onChange={(v) => setLayerAKey("interpolate_model",
            v === "rife47.pth" ? v : "film_net_fp16.safetensors")}
          options={[
            { value: "film_net_fp16.safetensors", label: "FILM" },
            { value: "rife47.pth", label: "RIFE 4.7" },
          ]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Multiplier">
        <SelectControl
          ariaLabel="Interpolation multiplier (run)"
          value={String(layerA.interpolate_multiplier ?? 2)}
          onChange={(v) => setLayerAKey("interpolate_multiplier", Number(v))}
          options={[
            { value: "2", label: "2x" },
            { value: "4", label: "4x" },
          ]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      </>)}
      {/* RTX Video Super-Resolution (plaguekind parity): 2-4x
          hardware upscale, LAST in the post chain. Guarded at
          run time — missing node skips with a warning. */}
      <ControlRow label="RTX Super-Res">
        <CheckControl
          ariaLabel="RTX Super-Resolution (run)"
          checked={layerA.rtx_vsr_enabled === true}
          onChange={(v) => setLayerAKey("rtx_vsr_enabled", v)}
        />
      </ControlRow>
      {layerA.rtx_vsr_enabled === true && (<>
      <ControlRow label="Scale">
        <SelectControl
          ariaLabel="RTX Super-Res scale (run)"
          value={String(layerA.rtx_vsr_multiplier ?? 2)}
          onChange={(v) => setLayerAKey("rtx_vsr_multiplier", Number(v))}
          options={[
            { value: "2", label: "2x" },
            { value: "3", label: "3x" },
            { value: "4", label: "4x" },
          ]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Quality">
        <SelectControl
          ariaLabel="RTX Super-Res quality (run)"
          value={layerA.rtx_vsr_quality ?? "ULTRA"}
          onChange={(v) => setLayerAKey("rtx_vsr_quality", v)}
          options={["ULTRA", "HIGH", "MEDIUM", "LOW"]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      </>)}
      {/* Output CRF (plaguekind saves at 8; lower = better). */}
      <ControlRow label="Output CRF">
        <NumberControl
          ariaLabel="Output CRF (run)"
          value={layerA.crf}
          onChange={(v) => setLayerAKey("crf", v === undefined ? undefined : Math.round(v))}
          min={8} max={34} step={1}
          placeholder="19"
          width="w-32"
        />
      </ControlRow>
    </div>
    </>
  )
}
