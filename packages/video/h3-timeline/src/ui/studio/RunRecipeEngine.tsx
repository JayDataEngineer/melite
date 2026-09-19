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
import { CardForm, ControlRow, SpecAtom, useResolvedForm, type SquareWire } from "@melite/card-base"
import { fetchMediaLibrary } from "@melite/card-base/media-library"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"
import type { CardStage } from "@melite/contracts"

/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export function RunRecipeEngine({
  stage, layerA, setLayerAKey, refArtifacts,
}: {
  stage: CardStage
  layerA: LayerA
  setLayerAKey: SetLayerAKey
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
  return (
    <>
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
          wire={wire}
        />
      ) : null}
    </>
  )
}
