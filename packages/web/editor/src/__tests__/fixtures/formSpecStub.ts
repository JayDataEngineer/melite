// formSpecStub — the typed minimal FormSpec for store seeding in tests.
//
// SpecContractRecord.spec narrowed from Record<string, any> to FormSpec
// (2026-09-03): a seeded record now type-checks against the REAL wire
// shape, so a fixture that omits a required key is a compile error —
// not a runtime surprise in the fourth nested test.
//
// Runtime contract: the builder supplies the TOP-LEVEL required keys
// (model/form/genre/service/label/fields/schema_groups/features/
// defaults/guide) and leaves every seed-provided value untouched.
// Schema-group FIELD seeds are passed through verbatim — required keys
// the seed omits (type/label/default/order/width) stay ABSENT at
// runtime, because ParamEditor's documented fallback
// (schema ?? flat-field ?? name-derived) owns the completion at render
// time; restating "neutral" values here would override the flat fields
// (a fabricated type:"number" hides a select's chip row; a fabricated
// default:null mount-seeds a gated field). The casts mark exactly that
// seed-vs-wire gap — the one place tests under-specify the wire on
// purpose.
import type { FormSpec, SchemaFieldDef, SchemaGroupDef } from "@melite/contracts"

/** A schema field seed: everything optional except `name`. */
export type SchemaFieldSeed = Partial<SchemaFieldDef> & { name: string }

/** A schema group seed: fields may be seeds; group keys are optional. */
export type SchemaGroupSeed = Partial<Omit<SchemaGroupDef, "fields">> & {
  fields?: SchemaFieldSeed[]
}

/** What formSpecStub accepts — FormSpec partials except schema_groups
 * takes seeds. */
export type FormSpecSeed = Omit<Partial<FormSpec>, "schema_groups"> & {
  schema_groups?: SchemaGroupSeed[]
}

export function formSpecStub(overrides: FormSpecSeed = {}): FormSpec {
  const { schema_groups, ...rest } = overrides
  return {
    model: "test-model",
    form: "image-gen",
    genre: "image",
    service: "test-model",
    label: "Test",
    sidebar_key: null,
    fields: [],
    features: {},
    guide: null,
    enhance_prompt: null,
    enhance_prompts: null,
    defaults: {},
    loader_info: undefined,
    contract: null,
    ...rest,
    schema_groups: (schema_groups ?? []).map(
      (g) => ({ ...g, fields: g.fields ?? [] }) as unknown as SchemaGroupDef,
    ),
  }
}
