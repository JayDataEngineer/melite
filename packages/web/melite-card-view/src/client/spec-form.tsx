/**
 * spec-form.tsx — COMPAT FACE: the card form now CONSTRUCTS from the
 * base (@melite/card-base, founded 2026-09-12 — operator order: "the
 * package to construct the card ui should see that the card package
 * emits an image input, then constructs the input component
 * automatically"). The emission contract, the pure projections, the
 * constructor, and the door fetchers live THERE; this module keeps
 * the view's import paths stable (SpecForm is CardForm's local name —
 * the drill's law unchanged) and adds nothing of its own.
 */
export {
  type SpecField,
  type InputEdge,
  type ModifierKind,
  type FormSpecDoc,
  type CatalogCard,
  type SpecValues,
  type VariantRow,
  specDefaults,
  fieldVisible,
  groupFields,
  inputEdgeOf,
  specPatch,
  variantRows,
  quantRowsFor,
  modelChoices,
  activeVariantId,
  axisPickPatch,
  seedAxisValues,
} from '@melite/card-base'
export { fetchCardCatalog, fetchFormSpec } from '@melite/card-base/wire'
export {
  type SquareHost,
  type SquareWire,
  useSquareProvider,
  type FieldAtomClaim,
  SpecAtom,
  ModelAxes,
  CardForm as SpecForm,
} from '@melite/card-base/form'
