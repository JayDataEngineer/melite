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
 * GEOMETRY READOUT IS DEAD (operator 2026-09-21: "WHY DO I STILL
 * SEE THIS READOUT SKIN? 1344×768 @ 24 doc-fps" — a read-only text
 * row outside the generic seam's grid grammar; the Width/Height
 * injects own geometry, one surface).
 */
import { CardForm, ControlRow, SectionLabel, SpecAtom, useResolvedForm, type SquareWire } from "@melite/card-base/client"
import { axisUnset, composeValidate } from '@melite/card-base/client'
import { resolvePickVerdictDoc, pickFamilyRefusal } from "./pickVerdict.ts"
import { fetchMediaLibrary } from '@melite/card-base/client'
import { type Dispatch, type SetStateAction, useMemo, useState } from "react"
import s from "./studio.module.css"
import { DOC_FPS_DEFAULT } from '@melite/models-h3/timelineContract'
import { FILM_ONLY_KEYS, T4_ONLY_KEYS, deriveWindowFamily, reseatFamilyDead } from "@melite/models-h3/timelineContract"
import type { LayerA, SetLayerAKey } from "./docModel.ts"
import { mergeDocLayers } from "./docModel.ts"
import { parseSpecNumber } from "./docGrid.ts"
import { omitT4GateDead, omitT4RecipeRow } from "./omitT4Recipe.ts"
import { studioCopy } from "./studioCopy.ts"

/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
export function RunRecipeEngine({
  base, layerA, setLayerAKey, setLayerA, refArtifacts,
}: {
  /** The stage's SETTLED BASE layer (audit F2, 2026-11-05: the pane
   *  stops touching `stage` entirely — component.tsx, the spine owner,
   *  threads the params through; this pane reads the explicit prop at
   *  ONE boundary, like every sibling pane's hand-off). */
  base: Record<string, unknown> | undefined
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  /** The whole-doc setter (the ATOMIC PICK LAW's verb): a pick is
   * ONE contract — the axis key AND its chain's defaults land in
   * ONE commit, never key-by-key (the half-switch the drill's law
   * killed at the bench wire; the same law at the studio rail).
   * THE COLLAPSE: this is useShownDoc's updateLayerA — the commit
   * serializes, saves, and overlays in one gesture (no mirror to
   * rebase, no touched ledger — the shown layerA IS truth-in-hand). */
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
  const { spec, edit, resolved } = useResolvedForm(
    "h3-timeline",
    layerA as unknown as Record<string, unknown>,
    setLayerAKey as unknown as (n: string, v: unknown) => void,
    // THE BASE LAYER (the bench row's own params — stage geometry
    // wins over the document's, the persisted truth under the edit)
    base,
  )
  // THE PICKER WIRE (the bench drill's own law, threaded through the
  // studio seam): candidates = the artifact index in the wire's row
  // shape; loadMedia = the one media-library fetch. CardForm's input
  // rail hands BOTH to every SourceRow — absent, From media is the
  // honest-empty modal (the break this wire closes).
  // THE FAMILY GATE (2026-11-06, the family-reseat cure — the live
  // brick: "card 'h3-timeline' refused params: h3_window(t4r):
  // unsanctioned inject keys: sr_switch"). The t4r lane wires NO
  // post chain — the walk refuses the twelve T4_ONLY knobs on a
  // doc that derived t4r, so a rail that RENDERS them offers a
  // switch whose every flip refuses the compose (the "second-pass
  // switch does not switch" shape) and a Final Cut pill that
  // bricks the card. The rail derives the family from the SAME
  // seats the walk reads (one spelling: deriveWindowFamily, the
  // contract face) and stops serving what the family cannot
  // honor. Defined-wins merge — an undefined layer key never
  // erases the base's seats mid-derivation.
  const family = useMemo(
    () => deriveWindowFamily(mergeDocLayers(base, layerA as unknown as Record<string, unknown>)),
    [base, layerA],
  )
  // THE DEAD-ROW GATE (2026-10-16): the t4r lane's whole post-pass
  // vocabulary (T4_ONLY_KEYS — the twelve leaves plus the masters that
  // own them and the attention backend) AND the film-only knobs
  // (FILM_ONLY_KEYS: duck_depth_db is read only inside the multi-window
  // film boundary, so a single-window doc composes it into no node).
  // One predicate, one derivation (the same family spelling the walk
  // and the reseat heal read) — a row the run cannot honor is never
  // served. THE GATE-DEAD ARM (the ERROR h cure, 2026-11-08): a
  // field whose visible_when NAMES a family-dead key omits with the
  // key — the refine_* trio rode visible_when second_pass_enabled
  // while surviving the name filter, so the Second Pass tab
  // resurrected on the STALE stated gate as an orphan face (the
  // master row T4_ONLY-omitted, no off switch). Presence is a pure
  // function of the lane (omitT4GateDead, one spelling with the row
  // gate in omitT4Recipe.ts).
  const omitDead = family === "t4r"
    ? (name: string): boolean => (T4_ONLY_KEYS as readonly string[]).includes(name)
      || (FILM_ONLY_KEYS as readonly string[]).includes(name)
      || omitT4GateDead(spec, name)
    : family === "t4_chain"
      ? undefined
      : (name: string): boolean => (FILM_ONLY_KEYS as readonly string[]).includes(name)
  const omitT4 = omitDead
  // THE ROW GATE (2026-10-16, the Final Cut brick — audit 0be61df8
  // F1): the field gate above stopped serving the twelve t4r-dead
  // KNOBS, but the recipe PILLS stayed ungated — h3's Final Cut row
  // stamps sr_switch, a one-call guided doc derives t4r, and the
  // walk refuses the stamp ('unsanctioned inject keys: sr_switch'):
  // the pick landed, every later run bricked. Judged on the row's
  // OWN stamp (never a hand id list): any recipe whose stamp
  // intersects the family-dead keys is not offered on that lane.
  // (spec !== null in the guard narrows the const binding — the
  // gate is only ever handed to CardForm inside the spec'd render,
  // so it can never deref a null it would never judge). The row
  // judgment itself lives in omitT4Recipe.ts, ONE spelling the
  // contract wall drives against the served spec + the DECL's own
  // rows (the J4 negative control).
  const omitT4Recipe = family === "t4r" && spec !== null
    ? (row: unknown): boolean => omitT4RecipeRow(spec, row)
    : undefined
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
      {/* (operator 2026-11-05: "THE FPS DIDN'T GET MOVED TO THE
       * GENERAL SUBCATEGORY") — the chrome head ("Recipe", naming
       * nothing the panel doesn't) died; the studio-owned clock
       * (doc.fps — studio.writes, never a card param, so CardForm
       * cannot seat it) rides under the GENERAL head, above the
       * generic knobs: the GENERAL SUBCATEGORY. The value is the
       * RESOLVED clock (schema default <- the doc), never the raw
       * layer's hole — the null-default defect stays dead. */}
      <SectionLabel>{studioCopy.generalTitle}</SectionLabel>
      <ControlRow label={studioCopy.fps}>
        <SpecAtom
          f={{ name: "fps", label: studioCopy.fps, type: "number", min: 1, max: 60, step: 1 }}
          // (operator 2026-11-05: "FPS is blank again") — a doc
          // created before the clock default landed carries NO fps
          // key; the row still renders the clock the run composes.
          // THE CLOCK'S ONE OWNER (timeline-plane wave-2 R1): the
          // fallback was DEFAULT_SEGMENT_PARAMS.fps (16 — the VACE
          // SEGMENT calibration, a different truth), booking the UI
          // at a clock the compose never spoke. DOC_FPS_DEFAULT is
          // the film clock — the schema row's default, the same
          // value the walk fills and the mix divides by.
          value={(resolved.fps ?? DOC_FPS_DEFAULT) as number}
          onEdit={(_, v) => {
            if (typeof v !== "string") return
            const n = parseSpecNumber(v)
            if (n !== undefined && n > 0) setLayerAKey("fps", n)
          }}
        />
      </ControlRow>
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
          base={base}
          // (operator 2026-11-05: "GET RID OF THIS — TOO COMPLEX FOR
          // LAYER A, LEAVE IT TO LAYER B AND THE TIMELINE") — media
          // inputs ride the timeline's own surfaces: the keyframe
          // lane, the D-M-E audio lanes, the clips row, the call
          // editor's reference bundles. Knobs and axes only.
          omitInputRail
          omitFields={omitT4}
          omitRecipeRow={omitT4Recipe}
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
            // TRUTH-IN-HAND (the collapse): the verdict composes the
            // held row with the SHOWN layerA — stated-or-settled by
            // construction (doc + live ops), so no touched ledger and
            // no mount-time snapshot enter the judgment. A stale
            // value never refuses a legal pick; a stated value is
            // never rebased away (there is no mirror to rebase).
            const held = (base ?? {}) as Record<string, unknown>
            const candidate = resolvePickVerdictDoc(
              held,
              layerA as unknown as Record<string, unknown>,
              patch,
            )
            const violations = composeValidate(spec, candidate)
            // THE FAMILY CLAUSE (B5 — hop 3's first judge): the same
            // candidate judged through the walk's family clause
            // (pickVerdict.ts owns it; the one-owner ruling lives
            // there). The verdict doc is what the run composes — a
            // Final-Cut stamp on a keyframe doc refuses HERE, in the
            // door's own voice, before the write and before the run
            // press. The client frame stays phase-less (the door adds
            // the phase prefix); the gate face speaks the clause
            // verbatim like every other refused pick.
            const family = pickFamilyRefusal(candidate)
            if (family !== null) violations.push({ message: "card_compose: " + family })
            if (violations.length > 0) {
              // THE SETTLEMENT CLAUSE (h¹ — the flip-settlement law):
              // a refusal whose dead weight is ONLY the family-dead
              // strand is not a refusal — it is stranded state asking
              // to settle. The family can flip under carried stamps
              // with no field write authoring it (the keyframes pin);
              // the owning surface hides on the new lane, so no hand
              // can "fix the stated value" — the gang refusal bricks
              // the doc (the live burn: the four keys stranded under
              // a hidden tab until the pick gate refused them). Ask
              // the estate's ONE settlement spelling: reseat the
              // candidate, re-judge. Clean → the pick LANDS on the
              // reseated holdings, the dropped keys unstated (the
              // base's own stamps settle through the serializer's
              // null-ride), and the face NAMES the settlement —
              // voiced, never silent, never a bare refusal. Anything
              // the reseat does not clear keeps the full refusal: the
              // gate's teeth stay (the settlement never launders an
              // illegal pick).
              const reseated = reseatFamilyDead(candidate)
              if (reseated.dropped.length > 0) {
                const recheck = composeValidate(spec, reseated.doc)
                const reFam = pickFamilyRefusal(reseated.doc)
                if (reFam !== null) recheck.push({ message: "card_compose: " + reFam })
                if (recheck.length === 0) {
                  setLayerA((prev) => {
                    const next: Record<string, unknown> = { ...prev }
                    for (const k of reseated.dropped) next[k] = undefined
                    for (const [k, v] of Object.entries(patch)) {
                      if (axisUnset(k, v, spec)) next[k] = undefined
                      else next[k] = v
                    }
                    return next as unknown as LayerA
                  })
                  setGateFace(studioCopy.gateSettled(reseated.dropped))
                  return
                }
              }
              setGateFace(
                'THE COMPOSE GATE REFUSED — ' + violations[0].message
                  + ' — the write never left the studio. Fix the stated value, or pick a different route.',
              )
              return
            }
            setGateFace(null)
            // THE PICK COMMITS (the atomic pick law's second half):
            // ONE whole-doc commit — patch keys stamp ('' unstated),
            // every other key rides the shown value it already has.
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
