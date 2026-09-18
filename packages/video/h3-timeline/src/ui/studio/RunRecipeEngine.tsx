/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the Engine knob rows ride
 * the SHARED SpecPanel (the estate's parameter system: the served
 * form-spec → SpecFieldRow → wire names) — one mechanism every card
 * seats, never an h3 re-walk.
 *
 * THE RECIPE STAYS EDITABLE (operator correction, 2026-09-18): the
 * Model route (FL2VA ↔ Ref2VA), the Preset (the plaguekind default
 * geometries: draft_02mp / final_hd), and the doc FPS are REAL
 * document controls — a static readout starved the operator of the
 * plaguekind defaults. Route/Preset/FPS are document-local clock
 * facts (route = the card's model id; preset/fps never serialize to
 * the card params), so they render as studio chrome beside the
 * panel — never as spec rows.
 */
import { SpecPanel } from "@melite/card-base"
import { ControlRow, NumberControl, SectionLabel, SelectControl } from "./kit"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"
import type { CardStage } from "@melite/contracts"

/** The preset geometry (identity.principles, stated once): draft
 * rides 768×448 @ 56f, final rides 1344×768 @ 124f. The engine
 * fold shows these RESOLVED. */
const PRESET_GEOM: Record<string, { w: number; h: number; f: number }> = {
  draft_02mp: { w: 768, h: 448, f: 56 },
  final_hd: { w: 1344, h: 768, f: 124 },
}

/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export function RunRecipeEngine({
  stage, layerA, setLayerAKey, isRef2va,
}: {
  stage: CardStage
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  isRef2va: boolean
}) {
  const geom = PRESET_GEOM[layerA.preset] ?? PRESET_GEOM.draft_02mp!
  // THE WIRE VALUES: plain Layer A keys (preset/fps/seed + wire-name
  // optionals + loras bag). SpecPanel reads them at the card's wire
  // names; edits flow back through setLayerAKey.
  const values = layerA as unknown as Record<string, unknown>
  return (
    <>
      <div className={s.group} data-testid="tl-recipe-chrome">
        <div className={s.groupTitle}>Recipe</div>
        <ControlRow label="Model route">
          <SelectControl
            ariaLabel="Model route"
            testId="tl-route-select"
            value={isRef2va ? "h3-timeline-ref" : "h3-timeline"}
            // Dead-arm cut: emptyLabel={false} means the native select
            // only yields listed options — v is never undefined here.
            onChange={(v) => setLayerAKey("model", v!)}
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
            testId="tl-preset-select"
            value={layerA.preset}
            // Dead-arm cut: emptyLabel={false} — v is always a preset.
            onChange={(v) => setLayerAKey("preset", v!)}
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
        <div className={s.recipeGeom} data-testid="tl-recipe-geom">
          {layerA.preset} · {String(stage.params?.width ?? geom.w)}×{String(stage.params?.height ?? geom.h)} @ {geom.f}f · {layerA.fps} doc-fps
        </div>
      </div>
      <SpecPanel
        model="h3-timeline"
        values={values}
        onEdit={setLayerAKey as unknown as (n: string, v: unknown) => void}
        sections={[
          {
            title: "Clock",
            testid: "tl-recipe-panel",
            rows: [{ name: "seed" }],
          },
          {
            title: "Engine (H3)",
            testid: "tl-engine-panel",
            rows: [
              { name: "shift_video" }, { name: "shift_audio" },
              { name: "sampler_name" }, { name: "sched_name" },
              { name: "steps" }, { name: "denoise" },
            ],
          },
        ]}
      />
      {/* (knob-audit law) window width/height are real injects —
       * blank = preset geometry → studio NumberControls (the hint
       * doesn't live in the spec row grammar). The engine tail
       * (resolved geometry + steps) rides the studio Label's tail. */}
      <div className={s.winSize}>
        <SectionLabel
          tail={`window ${String(stage.params?.width ?? geom.w)}×${String(stage.params?.height ?? geom.h)} · steps ${layerA.steps ?? "auto"}`}
        >
          Engine (H3)
        </SectionLabel>
        <NumberControl
          ariaLabel="Window width (run)"
          value={layerA.width}
          onChange={(v) => setLayerAKey("width", v)}
          min={256} max={1920} step={32}
          placeholder={String(geom.w)}
          title={`blank — the ${layerA.preset} preset rides ${geom.w}×${geom.h}`}
          width="w-[4.5rem]"
        />
        <span className={s.times}>×</span>
        <NumberControl
          ariaLabel="Window height (run)"
          value={layerA.height}
          onChange={(v) => setLayerAKey("height", v)}
          min={256} max={1920} step={32}
          placeholder={String(geom.h)}
          title={`blank — the ${layerA.preset} preset rides ${geom.w}×${geom.h}`}
          width="w-[4.5rem]"
        />
      </div>
    </>
  )
}
