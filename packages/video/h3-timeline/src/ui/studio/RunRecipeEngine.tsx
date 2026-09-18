/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the Engine knob rows ride
 * the SHARED SpecPanel (the estate's parameter system: the served
 * form-spec → SpecFieldRow → wire names) — one mechanism every card
 * seats, never an h3 re-walk.
 *
 * RULE A — THE RECIPE LAW (operator, 2026-09-18): the family's
 * recipes render as PILLS NEXT TO THE MODEL ROUTE — the same
 * RecipePills every CardForm seats, stamped from the served spec
 * (the family's own DECL rows: the distill presets carry the LORA
 * BAG, the geometry rows carry the window keys — 1:1 with the
 * card's declared params). The card's hand preset select
 * (draft_02mp/final_hd + PRESET_GEOM) is DEAD: a card never
 * hand-authors presets, the family owns them. Route/FPS stay
 * document-local clock facts rendered as studio chrome.
 */
import { ControlRow, RecipePills, SectionLabel, SpecAtom, SpecPanel, useFormSpec } from "@melite/card-base"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"
import type { CardStage } from "@melite/contracts"

/** The family's geometry floor (the card schema's own defaults —
 * 1344×768; draft recipes stamp 768×448 over it). */
const FAMILY_GEOM = { w: 1344, h: 768 } as const

/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export function RunRecipeEngine({
  stage, layerA, setLayerAKey, isRef2va,
}: {
  stage: CardStage
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  isRef2va: boolean
}) {
  // THE SERVED SPEC — the family's Recipe rows ride it (Rule A):
  // the pills stamp through the same pick verb every axis rides.
  const { spec } = useFormSpec("h3-timeline")
  // THE WIRE VALUES: plain Layer A keys (fps/seed + wire-name
  // optionals + loras bag). SpecPanel reads them at the card's wire
  // names; edits flow back through setLayerAKey.
  const values = layerA as unknown as Record<string, unknown>
  const onSet = setLayerAKey as unknown as (n: string, v: unknown) => void
  return (
    <>
      <div className={s.group} data-testid="tl-recipe-chrome">
        <div className={s.groupTitle}>Recipe</div>
        <ControlRow label="Model route">
          <SpecAtom
            f={{
              name: "model", label: "Model route", type: "select",
              options: [
                { value: "h3-timeline", label: "FL2VA · First/Last" },
                { value: "h3-timeline-ref", label: "Ref2VA · Identity Refs" },
              ],
              tooltip: isRef2va ? "Ref2VA — identity refs (per-call override windows)" : "FL2VA — first/last-frame conditioning",
            }}
            value={isRef2va ? "h3-timeline-ref" : "h3-timeline"}
            // Dead-arm cut (kept): no ghost — the native select only
            // yields listed options, v is never '' here.
            onEdit={(_, v) => setLayerAKey("model", v as string)}
          />
        </ControlRow>
        {/* RULE A: the family's recipe pills, NEXT TO THE MODEL —
         * distill presets (lora bag) + geometry rows, stamped 1:1
         * onto the declared keys. The card never hand-authors these. */}
        {spec !== null ? <RecipePills spec={spec} onSet={onSet} /> : null}
        <ControlRow label="FPS">
          <SpecAtom
            f={{ name: "fps", label: "FPS", type: "number", min: 1, max: 60, step: 1 }}
            value={layerA.fps}
            placeholder=""
            onEdit={(_, v) => {
              const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined
              if (n !== undefined && n > 0) setLayerAKey("fps", n)
            }}
          />
        </ControlRow>
        <div className={s.recipeGeom} data-testid="tl-recipe-geom">
          {String(stage.params?.width ?? layerA.width ?? FAMILY_GEOM.w)}×{String(stage.params?.height ?? layerA.height ?? FAMILY_GEOM.h)} @ {layerA.fps} doc-fps
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
          tail={`window ${String(stage.params?.width ?? layerA.width ?? FAMILY_GEOM.w)}×${String(stage.params?.height ?? layerA.height ?? FAMILY_GEOM.h)} · steps ${layerA.steps ?? "auto"}`}
        >
          Engine (H3)
        </SectionLabel>
        <SpecAtom
          f={{ name: "width", label: "Window width (run)", type: "number", min: 256, max: 1920, step: 32, tooltip: `blank — the family default rides ${FAMILY_GEOM.w}×${FAMILY_GEOM.h}` }}
          value={layerA.width}
          placeholder={String(FAMILY_GEOM.w)}
          onEdit={(_, v) => setLayerAKey("width",
            typeof v === "string" && v.trim() !== "" ? Number(v) : undefined)}
        />
        <span className={s.times}>×</span>
        <SpecAtom
          f={{ name: "height", label: "Window height (run)", type: "number", min: 256, max: 1920, step: 32, tooltip: `blank — the family default rides ${FAMILY_GEOM.w}×${FAMILY_GEOM.h}` }}
          value={layerA.height}
          placeholder={String(FAMILY_GEOM.h)}
          onEdit={(_, v) => setLayerAKey("height",
            typeof v === "string" && v.trim() !== "" ? Number(v) : undefined)}
        />
      </div>
    </>
  )
}
