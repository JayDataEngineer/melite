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
  type CardRecipeRow,
  type ModifierKind,
  type FormSpecDoc,
  type CatalogCard,
  type SpecValues,
  type VariantRow,
  type SchemaRef,
  type SchemaEnvelope,
  schemaEnvelope,
  fieldsOf,
  fieldsOfEnvelope,
  resolveValue,
  recipeKeyOf,
  recipeModStacks,
  seedUser,
  specDefaults,
  fieldVisible,
  groupFields,
  inputEdgeOf,
  variantRows,
  quantRowsFor,
  rowsFor,
  composingRows,
  modelChoices,
  modelSwitchPatch,
  activeVariantId,
  activeRowId,
  axisGroups,
  axisKey,
  axisPickPatch,
  cardOwnsRecipe,
  seedAxisValues,
  variantGroupsContract,
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

// THE MOD SYSTEM — core (the base package owns it; every surface
// renders it through the constructor, none wires it)
export { ModifiersSection } from '@melite/card-base/mods'
export type { ModifiersSectionProps } from '@melite/card-base/mods'
export { modOwnedFields, isOptionKind } from '@melite/card-base'
