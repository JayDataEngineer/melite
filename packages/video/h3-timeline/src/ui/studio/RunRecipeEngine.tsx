/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { CardStage } from "@melite/contracts"
import { CheckControl, ControlRow, NumberControl, SectionLabel, SelectControl, SliderControl } from "./kit"
import s from "./studio.module.css"
import { AUDIO_MODES, SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "./docModel"
import type { LayerA, SetLayerAKey } from "./docModel"

/** Layer A rail: Recipe + Engine folds (monolith lines 2687–2904). */
export function RunRecipeEngine({
  stage, layerA, setLayerAKey, isRef2va,
}: {
  stage: CardStage
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  isRef2va: boolean
}) {
  return (
    <>
    {/* Recipe — the document's clock + sampling base */}
    <div className={s.group}>
      <div className={s.groupTitle}>Recipe</div>
      <ControlRow label="Model route">
        <SelectControl
          ariaLabel="Model route"
          testId="tl-route-select"
          value={isRef2va ? "h3-timeline-ref" : "h3-timeline"}
          onChange={(v) => setLayerAKey("model", v ?? "h3-timeline")}
          title={isRef2va ? "Ref2VA — identity refs (per-call override windows)" : "FL2VA — first/last-frame conditioning"}
          options={[
            { value: "h3-timeline", label: "FL2VA · first/last" },
            { value: "h3-timeline-ref", label: "Ref2VA · identity refs" },
          ]}
          emptyLabel={false}
          width="w-40"
        />
      </ControlRow>
      <ControlRow label="Preset">
        <SelectControl
          ariaLabel="Preset"
          value={layerA.preset}
          onChange={(v) => setLayerAKey("preset", v ?? "draft_02mp")}
          options={["draft_02mp", "final_hd"]}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="FPS">
        <NumberControl
          ariaLabel="FPS"
          value={layerA.fps}
          onChange={(v) => { if (v !== undefined && v > 0) setLayerAKey("fps", v) }}
          min={1} max={60} step={1}
          placeholder=""
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Audio">
        <SelectControl
          ariaLabel="Audio mode"
          value={layerA.audio_mode}
          onChange={(v) => { if (v) setLayerAKey("audio_mode", v as LayerA["audio_mode"]) }}
          options={AUDIO_MODES}
          emptyLabel={false}
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Seam continuity" className={s.ctlGap3}>
        <CheckControl
          ariaLabel="Seam continuity"
          checked={layerA.continuity}
          onChange={(v) => setLayerAKey("continuity", v)}
        />
      </ControlRow>
      <ControlRow label="Seed">
        <NumberControl
          ariaLabel="Seed"
          value={layerA.seed}
          onChange={(v) => { if (v !== undefined) setLayerAKey("seed", v) }}
          min={0}
          step={1}
          placeholder=""
          width="w-32"
        />
      </ControlRow>
    </div>
    {/* Engine (H3) — the sampling knobs, forwarded verbatim to
        every window; a beat's Call knobs REPLACE these per
        window. */}
    <div className={s.group}>
      <SectionLabel
        tail={`window ${String(stage.params?.width ?? "preset")}×${String(stage.params?.height ?? "preset")} · steps ${layerA.sampling_steps ?? "preset"}`}
      >
        Engine (H3)
      </SectionLabel>
      <ControlRow label="Video sigma shift">
        <SliderControl
          ariaLabel="Video sigma shift"
          value={layerA.shift_video ?? 12}
          onChange={(v) => setLayerAKey("shift_video", v)}
          min={0.01} max={100} step={0.01}
        />
      </ControlRow>
      <ControlRow label="Audio sigma shift">
        <SliderControl
          ariaLabel="Audio sigma shift"
          value={layerA.shift_audio ?? 3}
          onChange={(v) => setLayerAKey("shift_audio", v)}
          min={0.01} max={100} step={0.01}
        />
      </ControlRow>
      <ControlRow label="Sampler">
        <SelectControl
          ariaLabel="Sampler (run)"
          value={layerA.sampler}
          onChange={(v) => setLayerAKey("sampler", v)}
          options={SAMPLER_OPTIONS}
          emptyLabel="engine default (euler)"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Scheduler">
        <SelectControl
          ariaLabel="Scheduler (run)"
          value={layerA.scheduler}
          onChange={(v) => setLayerAKey("scheduler", v)}
          options={SCHEDULER_OPTIONS}
          emptyLabel="engine default (simple)"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Sampling steps">
        <NumberControl
          ariaLabel="Sampling steps (run)"
          value={layerA.sampling_steps}
          onChange={(v) => setLayerAKey("sampling_steps", v)}
          min={1} max={100} step={1}
          placeholder="preset"
          width="w-32"
        />
      </ControlRow>
      {/* (knob-audit law) Scheduler.0.denoise is a real inject —
       * 1.0 = full-strength steps (the H3 default); lower = the
       * img2img-style partial repaint dial. */}
      <ControlRow label="Denoise">
        <NumberControl
          ariaLabel="Denoise (run)"
          value={layerA.denoise}
          onChange={(v) => setLayerAKey("denoise", v)}
          min={0} max={1} step={0.05}
          placeholder="1.0"
          width="w-32"
        />
      </ControlRow>
      {/* (knob-audit law) window width/height are real injects —
       * the header readout becomes editable. Blank = preset. */}
      <ControlRow label="Window size">
        <span className={s.winSize}>
          <NumberControl
            ariaLabel="Window width (run)"
            value={layerA.width}
            onChange={(v) => setLayerAKey("width", v)}
            min={256} max={1920} step={32}
            placeholder="preset W"
            width="w-[4.5rem]"
          />
          <span className={s.times}>×</span>
          <NumberControl
            ariaLabel="Window height (run)"
            value={layerA.height}
            onChange={(v) => setLayerAKey("height", v)}
            min={256} max={1920} step={32}
            placeholder="preset H"
            width="w-[4.5rem]"
          />
        </span>
      </ControlRow>
      <ControlRow label="Attention">
        <SelectControl
          ariaLabel="Attention (run)"
          value={layerA.h3_attention}
          onChange={(v) => setLayerAKey("h3_attention", v as LayerA["h3_attention"])}
          options={[
            { value: "kitchen", label: "comfyui-kitchen" },
            { value: "sol", label: "SOL" },
            { value: "sage", label: "SAGE" },
            { value: "sla", label: "SLA (block-sparse)" },
          ]}
          emptyLabel="engine default"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="FP16 accumulation">
        <CheckControl
          ariaLabel="FP16 accumulation (run)"
          checked={layerA.h3_fp16_accumulation}
          onChange={(v) => setLayerAKey("h3_fp16_accumulation", v)}
        />
      </ControlRow>
      <ControlRow label="Torch compile">
        <CheckControl
          ariaLabel="Torch compile (run)"
          checked={layerA.h3_torch_compile}
          onChange={(v) => setLayerAKey("h3_torch_compile", v)}
        />
      </ControlRow>
      <ControlRow label="CFG">
        <NumberControl
          ariaLabel="CFG (run)"
          value={layerA.cfg}
          onChange={(v) => setLayerAKey("cfg", v)}
          min={1} max={10} step={0.5}
          placeholder="4.0"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Motion context frames">
        <NumberControl
          ariaLabel="Motion context frames (run)"
          value={layerA.h3_context_steps}
          onChange={(v) => setLayerAKey("h3_context_steps", v)}
          min={0} max={8} step={1}
          placeholder="engine default"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Audio context steps">
        <NumberControl
          ariaLabel="Audio context steps (run)"
          value={layerA.h3_audio_context_steps}
          onChange={(v) => setLayerAKey("h3_audio_context_steps", v)}
          min={0} max={200} step={10}
          placeholder="engine default"
          width="w-32"
        />
      </ControlRow>
    </div>
    </>
  )
}
