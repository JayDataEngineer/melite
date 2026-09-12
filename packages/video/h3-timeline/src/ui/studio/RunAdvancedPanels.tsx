/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { CheckControl, ControlRow, NumberControl, SelectControl, SliderControl, TextControl } from "./kit"
import s from "./studio.module.css"
import { SPEED_LORA_OPTIONS } from "./docModel"
import type { LayerA, SetLayerAKey } from "./docModel"

/** Layer A rail: SLA lab + Speed LoRA + Post-processing (lines 2905–3188). */
export function RunAdvancedPanels({
  layerA, setLayerAKey,
}: {
  layerA: LayerA
  setLayerAKey: SetLayerAKey
}) {
  return (
    <>
    {/* SLA lab — only when Attention = SLA (block-sparse). */}
    {(layerA.h3_attention ?? "kitchen") === "sla" && (
    <div className={s.group} data-testid="tl-sla-panel">
      <div className={s.groupTitle}>
        SLA — block-sparse attention
      </div>
      <ControlRow label="Sparsity">
        <SliderControl
          ariaLabel="SLA sparsity (run)"
          value={layerA.h3_sla_sparsity ?? 0.9}
          onChange={(v) => setLayerAKey("h3_sla_sparsity", v)}
          min={0} max={0.95} step={0.05}
        />
      </ControlRow>
      <ControlRow label="Block size">
        <SelectControl
          ariaLabel="SLA block size (run)"
          value={layerA.h3_sla_block_size ?? "64"}
          onChange={(v) => setLayerAKey("h3_sla_block_size", v === "128" ? "128" : "64")}
          options={[
            { value: "64", label: "64 (clean audio)" },
            { value: "128", label: "128 (faster, robotic)" },
          ]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Min seq length">
        <NumberControl
          ariaLabel="SLA min seq length (run)"
          value={layerA.h3_sla_min_seq_len}
          onChange={(v) => setLayerAKey("h3_sla_min_seq_len", v)}
          min={512} step={512}
          placeholder="4096"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Dense last steps">
        <NumberControl
          ariaLabel="SLA dense last steps (run)"
          value={layerA.h3_sla_dense_last_steps}
          onChange={(v) => setLayerAKey("h3_sla_dense_last_steps", v)}
          min={0} max={10} step={1}
          placeholder="1"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Dense steps (explicit)">
        <TextControl
          ariaLabel="SLA dense steps (run)"
          value={layerA.h3_sla_dense_steps}
          onChange={(v) => setLayerAKey("h3_sla_dense_steps", v)}
          placeholder="e.g. 0,1 or 0-2"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Dense backend">
        <SelectControl
          ariaLabel="SLA dense backend (run)"
          value={layerA.h3_sla_dense_backend ?? "comfy_kitchen"}
          onChange={(v) => setLayerAKey("h3_sla_dense_backend",
            v === "pytorch" || v === "auto" ? v : "comfy_kitchen")}
          options={["comfy_kitchen", "pytorch", "auto"]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Ref protection">
        <SelectControl
          ariaLabel="SLA ref protection (run)"
          value={layerA.h3_sla_reference_protection ?? "Off"}
          onChange={(v) => setLayerAKey("h3_sla_reference_protection",
            v === "Light" || v === "Heavy Enforcement" ? v : "Off")}
          options={["Off", "Light", "Heavy Enforcement"]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Protect audio">
        <CheckControl
          ariaLabel="SLA protect audio (run)"
          checked={layerA.h3_sla_protect_audio}
          onChange={(v) => setLayerAKey("h3_sla_protect_audio", v)}
        />
      </ControlRow>
      <ControlRow label="Stabilize motion">
        <CheckControl
          ariaLabel="SLA stabilize motion (run)"
          checked={layerA.h3_sla_stabilize_motion}
          onChange={(v) => setLayerAKey("h3_sla_stabilize_motion", v)}
        />
      </ControlRow>
      <ControlRow label="Full-precision accum">
        <CheckControl
          ariaLabel="SLA full-precision accumulation (run)"
          checked={layerA.h3_sla_disable_fp16_accum}
          onChange={(v) => setLayerAKey("h3_sla_disable_fp16_accum", v)}
        />
      </ControlRow>
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
      <ControlRow label="Sharpening">
        <CheckControl
          ariaLabel="Sharpening (run)"
          checked={layerA.sharpen_enabled}
          onChange={(v) => setLayerAKey("sharpen_enabled", v)}
        />
      </ControlRow>
      {layerA.sharpen_enabled && (<>
      <ControlRow label="Method">
        <SelectControl
          ariaLabel="Sharpen method (run)"
          value={layerA.sharpen_method ?? "rcas"}
          onChange={(v) => setLayerAKey("sharpen_method",
            v === "adaptive_usm" || v === "high_pass" || v === "deconvolution" ? v : "rcas")}
          options={["rcas", "adaptive_usm", "high_pass", "deconvolution"]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Strength">
        <NumberControl
          ariaLabel="Sharpen strength (run)"
          value={layerA.sharpen_strength}
          onChange={(v) => setLayerAKey("sharpen_strength", v)}
          min={0} max={3} step={0.05}
          placeholder="0.5"
          width="w-32"
        />
      </ControlRow>
      {(layerA.sharpen_method ?? "rcas") !== "rcas" && (
      <ControlRow label="Radius">
        <NumberControl
          ariaLabel="Sharpen radius (run)"
          value={layerA.sharpen_radius}
          onChange={(v) => setLayerAKey("sharpen_radius", v)}
          min={0.5} max={5} step={0.5}
          placeholder="1.0"
          width="w-32"
        />
      </ControlRow>
      )}
      {layerA.sharpen_method === "adaptive_usm" && (
      <ControlRow label="Noise gate">
        <NumberControl
          ariaLabel="Sharpen threshold (run)"
          value={layerA.sharpen_threshold}
          onChange={(v) => setLayerAKey("sharpen_threshold", v)}
          min={0} max={1} step={0.05}
          placeholder="0.05"
          width="w-32"
        />
      </ControlRow>
      )}
      {layerA.sharpen_method === "deconvolution" && (
      <ControlRow label="Iterations">
        <NumberControl
          ariaLabel="Sharpen iterations (run)"
          value={layerA.sharpen_iterations}
          onChange={(v) => setLayerAKey("sharpen_iterations", v)}
          min={1} max={100} step={1}
          placeholder="10"
          width="w-32"
        />
      </ControlRow>
      )}
      </>)}
      <ControlRow label="Interpolation">
        <CheckControl
          ariaLabel="Interpolation (run)"
          checked={layerA.interpolate_enabled}
          onChange={(v) => setLayerAKey("interpolate_enabled", v)}
        />
      </ControlRow>
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
