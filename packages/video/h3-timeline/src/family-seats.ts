// family-seats.ts — the plugin law's family seat (the L3 cure,
// 2026-11-16, card-without-family audit — the image/image-gen
// exemplar generalized to the estate's deepest coupling): THE CARD
// EXISTS WITHOUT ITS FAMILY. This module is the h3-timeline card's
// ONLY bridge to the family package, and it holds ZERO static
// imports — the family resolves through guarded dynamic imports,
// primed once at the card face's application and read synchronously
// by the card's post-boot seats (the compose gate's carrier walk,
// the mods roster's loras kind, the compose dispatch's film/edit/
// reshoot renderers, the agent tool's param surface).
//
// ONE PACKAGE, ONE SEAT: the h3 family ships several export faces
// (the main index, the loras flavor catalog, the schema carrier,
// the actions module) and the card reads them ALL — the seat is
// keyed ONCE by the DECL id and carries every face the card reads,
// so a pruned family package costs exactly its own seat, never a
// half-seated card.
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card still registers (the mods
// roster serves the card-local kinds; schemaCarrier is omitted and
// the envelope laws fail-open on the kit's documented pattern), and
// every door that NEEDS a family face refuses loud naming the
// package (requireSeat). A face that loads malformed skips the seat
// named at the same doors — never a half-seated card.
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import type { GraphBuilder, PromptGraph } from '@melite/comfyui-card-kit/graph'
import type { EditMaskDial, EditReferenceDial } from '@melite/models-h3'
import type { H3Facts } from '@melite/models-h3/actions'
import type { H3LoraRow } from '@melite/models-h3/mods/loras'
// The carrier's exact type rides the family's own export (type-only —
// compiles away; the runtime seat is built from the dynamic import's
// value). The kit's carrier seams (schemaCarrier, callableSchema)
// take the real schemastery instance, so the seat serves that type.
import type {
  paramSchema as familyParamSchema,
  schema as familySchema,
  coerceWireBoolean as familyCoerceWireBoolean,
} from '@melite/models-h3/schema'

/** The boarded family package — the id lives in card.ts's BOARDED
 *  literal (the family-coverage wall judges the binding on the dev
 *  tree; a typo'd id reds it there). */
const FAMILY = '@melite/models-h3'

/** The faces of the ONE package the card reads. Subpaths count as
 *  the same family: they load or fail together. */
const FAMILY_FACES = [
  FAMILY,
  `${FAMILY}/mods/loras`,
  `${FAMILY}/schema`,
  `${FAMILY}/actions`,
] as const

/** One family's runtime seat: its DECL plus every export face the
 *  card reads — the schema carrier + normalizer + wire law, the
 *  loras catalog, the compose renderers, and the constants the
 *  card's limits and prose interpolate. */
export type H3FamilySeat = {
  decl: ModelDecl
  /** The loras flavor's catalog rows (mods/loras — the served
   *  select options and the render-side marriage). */
  loraRows: readonly H3LoraRow[]
  /** The absent-bag ghost chip (actions.ts's resolved default). */
  defaultLoraEntry: () => { id: string; strength: number; steps: number }
  /** The finalize pass (the t4-family autofill strip). */
  finalize: (graph: PromptGraph) => PromptGraph
  /** The masked-edit matrix renderer (the edit bag's emission). */
  renderEdit: (
    entry: Record<string, unknown>,
    mask: EditMaskDial,
    reference: EditReferenceDial,
    p: Record<string, unknown>,
    facts: H3Facts,
    g: GraphBuilder,
    runId: string,
  ) => void
  reshootArmed: (p: Record<string, unknown>) => boolean
  /** The overlay-gate assert (the single-call lift's judge). */
  assertOverlayGated: (doc: Record<string, unknown>, where: string) => void
  /** The lane-inputs facts parser. */
  parseFacts: (raw: unknown) => H3Facts
  /** THE PARAM CARRIER (schema.ts's paramSchema — the strict
   *  resolve's walk AND the registered schemaCarrier). */
  paramSchema: typeof familyParamSchema
  /** The full normalizer (the registered schema — truly-explicit
   *  keys walk it at the compose door). */
  schema: typeof familySchema
  /** The wire law (schema.ts's coerceWireBoolean — the same
   *  definition schema() uses). */
  coerceWireBoolean: typeof familyCoerceWireBoolean
  /** The card's JSON-typed params (schema.ts's JSON_ARRAY_PARAMS). */
  jsonArrayParams: readonly string[]
  /** THE SEAM LAW constant (timelineContract's SEAM_OVERLAP_FRAMES,
   *  re-exported on the main face) — the tool face's calls prose. */
  seamOverlapFrames: number
  /** The legacy refine arm's declared design default window
   *  (refine.ts's REFINE_DEFAULT_CLIP_SECONDS) — read only when a
   *  legacy doc omits clip_seconds; a SAFETY-ADJACENT limit, so an
   *  absent family never defaults it (requireSeat refuses). */
  refineDefaultClipSeconds: number
}

type H3MainModule = {
  DECL?: ModelDecl
  h3DefaultLoraEntry?: H3FamilySeat['defaultLoraEntry']
  finalizeH3?: H3FamilySeat['finalize']
  renderH3Edit?: H3FamilySeat['renderEdit']
  reshootArmed?: H3FamilySeat['reshootArmed']
  assertOverlayGated?: H3FamilySeat['assertOverlayGated']
  SEAM_OVERLAP_FRAMES?: number
  REFINE_DEFAULT_CLIP_SECONDS?: number
}
type H3LorasModule = { H3_LORA_ROWS?: readonly H3LoraRow[] }
type H3SchemaModule = {
  paramSchema?: typeof familyParamSchema
  schema?: H3FamilySeat['schema']
  coerceWireBoolean?: H3FamilySeat['coerceWireBoolean']
  JSON_ARRAY_PARAMS?: readonly string[]
}
type H3ActionsModule = { parseH3Facts?: H3FamilySeat['parseFacts'] }

const seats = new Map<string, H3FamilySeat>()
let priming: Promise<void> | null = null

/** Prime every family seat (idempotent; an absent package degrades
 *  to its own absence — the card never dies for a family). A
 *  package whose faces fail to load (absent from the install) or
 *  whose faces load malformed leaves NO seat: the doors that need a
 *  face refuse loud naming the package. */
export const primeFamilySeats = (): Promise<void> => {
  priming ??= Promise.allSettled(FAMILY_FACES.map((spec) => import(spec)))
    .then((results) => {
      // ONE package, ONE seat: every face of the one family resolves
      // together — a failed face never seats a half-family.
      if (!results.every((result) => result.status === 'fulfilled')) return
      const [main, loras, schema, actions] = results.map(
        (result) => result.value as unknown,
      ) as [H3MainModule, H3LorasModule, H3SchemaModule, H3ActionsModule]
      const decl = main?.DECL
      if (decl?.id === undefined || typeof decl.id !== 'string') return
      if (
        typeof main.h3DefaultLoraEntry !== 'function' ||
        typeof main.finalizeH3 !== 'function' ||
        typeof main.renderH3Edit !== 'function' ||
        typeof main.reshootArmed !== 'function' ||
        typeof main.assertOverlayGated !== 'function' ||
        typeof main.SEAM_OVERLAP_FRAMES !== 'number' ||
        typeof main.REFINE_DEFAULT_CLIP_SECONDS !== 'number' ||
        !Array.isArray(loras?.H3_LORA_ROWS) ||
        typeof schema?.paramSchema !== 'function' ||
        typeof schema?.schema !== 'function' ||
        typeof schema?.coerceWireBoolean !== 'function' ||
        !Array.isArray(schema?.JSON_ARRAY_PARAMS) ||
        typeof actions?.parseH3Facts !== 'function'
      ) {
        return
      }
      seats.set(decl.id, {
        decl,
        loraRows: loras.H3_LORA_ROWS,
        defaultLoraEntry: main.h3DefaultLoraEntry,
        finalize: main.finalizeH3,
        renderEdit: main.renderH3Edit,
        reshootArmed: main.reshootArmed,
        assertOverlayGated: main.assertOverlayGated,
        parseFacts: actions.parseH3Facts,
        paramSchema: schema.paramSchema,
        schema: schema.schema,
        coerceWireBoolean: schema.coerceWireBoolean,
        jsonArrayParams: schema.JSON_ARRAY_PARAMS,
        seamOverlapFrames: main.SEAM_OVERLAP_FRAMES,
        refineDefaultClipSeconds: main.REFINE_DEFAULT_CLIP_SECONDS,
      })
    })
  return priming
}

/** A family's seat — undefined when the package is absent or its
 *  faces did not seat (the doors' own loud refusals name it). */
export const seatOf = (id: string): H3FamilySeat | undefined => seats.get(id)

/** The family seat, LOUD: every door that cannot serve without a
 *  family face refuses here, by name — the compose dispatch, the
 *  carrier walk, the tool face's param surface. The message shape
 *  is composeFamilyAction's (the image-gen exemplar): the family id
 *  on the card, the reason, and the by-name refusal clause. */
export const requireSeat = (cardId: string, face: string): H3FamilySeat => {
  const seat = seats.get('h3')
  if (seat === undefined) {
    throw new Error(
      `no seat for family 'h3' on the ${cardId} card — the card's ${face} rides the '${FAMILY}' family package, and that package is absent from the install (a family package absent from the install refuses here, by name)`)
  }
  return seat
}
