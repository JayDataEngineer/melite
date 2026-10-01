/**
 * RunRecipeEngine — the Layer A rail.
 *
 * THE GENERIC SEAM LAW (operator, 2026-09-19: "h3 FORM SEAM = THE
 * GENERIC FORM SEAM — we added primitives to the default card UI
 * package to handle this"): the parameter surface IS CardForm —
 * the same component the bench drill seats. Groups, the sampling
 * 2-column grid (sampler + scheduler side by side, the kit's
 * columns/width facts), visible_when, the recipe pills on the
 * model axes, mod-owned exclusion — every layout law lands in
 * card-base ONCE and every card inherits it. The hand-rolled
 * SpecPanel sections and window SpecAtoms are DEAD (the anti-DRY
 * break: any law the generic seam learned, this surface silently
 * missed — the blank-steps and split-sampler crimes both lived
 * here).
 *
 * What stays STUDIO CHROME (never card params): the Model-route
 * pin (the sibling-family switch, a document concept) and the doc
 * FPS (a document-local clock fact, undeclared by design). THE
 * GEOMETRY READOUT IS DEAD (operator 2026-09-21: "WHY DO I STIL
 * SEE THIS [REDACTED 2026-11-05] SKIN? 1344×768 @ 24 doc-fps" — a read-only text
 * row outside the generic seam's grid grammar; the Width/Height
 * injects own geometry, one surface).
 */
import { CardForm, ControlRow, SpecAtom, useResolvedForm, type SquareWire } from "@melite/card-base/client"
import { axisUnset, composeCandidateDoc, composeValidate } from '@melite/card-base/client'
import { fetchMediaLibrary } from '@melite/card-base/client'
import { type Dispatch, type SetStateAction, useState } from "react"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"
import type { CardStage } from "@melite/contracts"

/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export function RunRecipeEngine({
  stage, layerA, setLayerAKey, setLayerA, refArtifacts,
}: {
  stage: CardStage
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  /** The whole-doc setter (the ATOMIC PICK LAW's verb): a pick is
   * ONE contract — the axis key AND its chain's defaults land in
   * ONE state write, never key-by-key (the half-switch the drill's
   * law killed at the bench wire; the same law at the studio rail). */
  setLayerA: Dispatch<SetStateAction<LayerA>>
  /** The pickers' artifact index (own run ∪ upstreams — the studio's
   * one candidate source, the same rows the call-card ref buckets
   * serve). Threaded to the form wire so the input rail's From-flow /
   * From-media verbs live HERE too (the 2026-09-21 break: the studio
   * mounted CardForm with NO wire — every rail row's From media
   * opened onto the honest-empty list; the bench drill always wired
   * this, the studio silently didn't). */
  refArtifacts: Array<{ name: string; url: string }>
}) {
  // THE STUDIO SEAM (one shared hook): the served spec, the
  // RESOLVED values (schema defaults <- model defaults <- Layer A —
  // a sparse document renders its declared defaults, NEVER blanks),
  // and the edit verb that coerces at the schema boundary.
  const { spec, edit } = useResolvedForm(
    "h3-timeline",
    layerA as unknown as Record<string, unknown>,
    setLayerAKey as unknown as (n: string, v: unknown) => void,
    // THE BASE LAYER (the bench row's own params — stage geometry
    // wins over the document's, the persisted truth under the edit)
    (stage.params ?? undefined) as Record<string, unknown> | undefined,
  )
  // THE PICKER WIRE (the bench drill's own law, threaded through the
  // studio seam): candidates = the artifact index in the wire's row
  // shape; loadMedia = the one media-library fetch. CardForm's input
  // rail hands BOTH to every SourceRow — absent, From media is the
  // honest-empty modal (the break this wire closes).
  const wire: SquareWire = {
    candidates: refArtifacts.map((a) => ({ id: a.name, label: a.name, url: a.url })),
    loadMedia: fetchMediaLibrary,
  }
  // THE GATE FACE (the drill's own voice): a refused compose never
  // writes, and the refusal SAYS so in the door's words — never a
  // silent drop, never a face that blames the operator.
  const [gateFace, setGateFace] = useState<string | null>(null)
  return (
    <>
      {gateFace !== null ? (
        <div role="alert" data-gate-face="1" className={s.gateFace}>{gateFace}</div>
      ) : null}
      <div className={s.group} data-testid="tl-recipe-chrome">
        <div className={s.groupTitle}>Recipe</div>
        {/* THE ROUTE ROW IS DEAD (operator 2026-09-20: "we use ONE
         * model"). The fused b30-49 checkpoint IS fl2va+ref2va —
         * the graph never branched on the id, and the registry's
         * own row calls the ref route Legacy ("standard variant
         * now handles this automatically"). No fake model switch,
         * no string-matching a legacy spelling. */}
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
      </div>
      {/* THE GENERIC SEAM: every card param, one component — the
       * recipe pills, the sampling grid (sampler + scheduler side
       * by side), window width/height, seed, the shifts, all of
       * it. Edits coerce at the schema boundary (useResolvedForm's
       * edit verb); unset (the reset path) un-overrides the doc
       * key so the resolved default shows again. */}
      {spec !== null ? (
        <CardForm
          spec={spec}
          user={layerA as unknown as Record<string, unknown>}
          base={(stage.params ?? undefined) as Record<string, unknown> | undefined}
          onSet={edit}
          onUnset={(n) => setLayerAKey(n as keyof LayerA, undefined)}
          // THE ATOMIC PICK LAW (the same arm the bench drill seats):
          // a model/variant pick rides ONE whole-doc write — the
          // per-key setter could never express "variant AND its
          // defaults" as one contract. The empty-selection law rides
          // it too: an axis key set to '' is UNSTATED — it leaves
          // the doc (undefined), never a held empty string.
          // THE COMPOSE GATE (law C, 2026-09-29 — the operator's
          // call: the schema is NOT thrown away when the seat gets
          // hard): the pick composes the FULL candidate doc and is
          // judged against the door's own clauses BEFORE any state
          // write. A refused pick never touches layerA — the schema
          // rides every arm, studio rail included, or it is gutter
          // trash.
          onPick={(patch) => {
            const candidate = composeCandidateDoc(
              (stage.params ?? {}) as Record<string, unknown>,
              layerA as unknown as Record<string, unknown>,
              patch,
            )
            const violations = composeValidate(spec, candidate)
            if (violations.length > 0) {
              setGateFace(
                'THE COMPOSE GATE REFUSED — ' + violations[0].message
                  + ' — the write never left the studio. Fix the stated value, or pick a different route.',
              )
              return
            }
            setGateFace(null)
            setLayerA((prev) => {
              const next: Record<string, unknown> = { ...prev }
              for (const [k, v] of Object.entries(patch)) {
                if (axisUnset(k, v, spec)) next[k] = undefined
                else next[k] = v
              }
              return next as unknown as LayerA
            })
          }}
          wire={wire}
        />
      ) : null}
    </>
  )
}
