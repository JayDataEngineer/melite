// mods-schema.ts — THE DECLARED MOD-KIND SCHEMA GATE (hour 16, the
// operator's order: "ACTUAL SCHEMAS FOR THE CARDS AND CARDS UI —
// this is just fake schema validation validating nothing").
//
// The mod plane's three doors, before this gate:
//   registerPack   — validateFields (a schemastery z.object) ✓
//   registerFlavor — pack-existence + families predicates ✓
//   registerCard   — duplicate-id check ONLY; the card's DECLARED
//                    MOD KINDS (DeclaredModifierKind rows with
//                    hand-rolled fields/kindFields/options) rode
//                    UNVALIDATED — a number default on a boolean
//                    field, min>max, a select with no options: all
//                    booted silently. THE HOLE THIS FILE CLOSES.
//
// The registerFamily pattern, second verse: a STRICT schemastery
// resolve first (shape + unknown-key drift refusal — a carried key
// the strict resolve strips is drift and refuses loud), then the
// semantic predicates a shape cannot express (type-truth of
// defaults, min≤max, select-must-carry-options).
//
// The card's rows stay DATA (typed literals — the declaration
// face); this gate is the schema they answer to at registration.
import Schema, { default as z } from "@deepseek-ai/schemastery";
import type { DeclaredModifierKind } from "./service.ts";

/** One declared field row's shape (the JSON wire face the cards
 *  author). `default` is z.any at the shape layer — the TYPE-TRUTH
 *  of the default against the declared `type` is a semantic
 *  predicate below (a shape schema cannot express it). Optional
 *  keys are bare (the contract's spelling: absent → undefined). */
const FieldRow = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  default: z.any(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  tooltip: z.string(),
  // THE CONDITIONAL-REQUIRED (2026-10-12): the same grammar as
  // visible_when ("key=value" guards, `!=` negation, `|`-sets) —
  // the required star paints exactly when the guards hold against
  // the entry's sibling values (the sam3 prompt law: required
  // unless via_rtdetr). Served verbatim to the leaf.
  required_when: z.string(),
  wtype: z.string(),
  // THE SINGLE-FIELD MEDIA HINT (the operator's picker law, live
  // lane 2026-10-28: "media seats as FREEFORM TEXT when NOT ALL
  // SHOULD BE"): a `file` field carrying media 'video' narrows the
  // square's picker to the video library and the OS accept to the
  // video formats — SpecField.media's own vocabulary (MEDIA_SET),
  // the same hint the typed stacks ride.
  media: z.string(),
  // FACE-OWNED (stroke 95, the embedded leaf): the declared canvas
  // owns this field's value (the bbox quad) — the leaf hides it
  // when the canvas renders (the degrade law shows it otherwise).
  faceOwned: z.boolean(),
  options: z.array(z.object({ value: z.any(), label: z.string() })),
  // MULTI-SELECT (the YOLO-classes law, operator 2026-10-08: "why
  // is SAM2 selection a FREEFORM TEXT BOX?" — a closed vocabulary
  // the detector owns renders as toggle chips, the wire a
  // comma-joined string in the OPTIONS' declared order): select
  // fields only; the strict gate refuses it elsewhere.
  multi: z.boolean(),
});

const OptionRow = z.object({
  value: z.any(),
  label: z.string(),
});

/** The declared mod-kind master (the DeclaredModifierKind wire
 *  shape — strict: unknown keys refuse as drift). */
const ModKind = z.object({
  kind: z.string(),
  label: z.string(),
  param_key: z.string(),
  entry: z.string(),
  option_key: z.string(),
  scalar_key: z.string(),
  cardinality: z.string(),
  max_stack: z.number(),
  fields: z.array(FieldRow),
  kindFields: z.array(FieldRow),
  options: z.array(OptionRow),
  category: z.union([z.const("standalone"), z.const("ordered")]),
  leaf_face: z.union([z.const("paint-canvas"), z.const("bbox-canvas")]),
  // THE SECTION CAPTION (2026-10-08, the operator's filter demand —
  // "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): a one-line caption the
  // leaf seats ABOVE the field stack, naming what the stack IS (the
  // detector arms' class chips + confidence are the bbox filter; a
  // caption-less stack reads as loose inputs). Served verbatim.
  section: z.string(),
  // THE ARM-CONDITIONAL EXTENSION PACKS (service.ts): pack ids the
  // kind's arm needs live. Bare keys stay absent-able (the existing
  // rows omit entry/option_key the same way — the resolve fills
  // nothing, the drift check reads carried-vs-kept).
  requires: z.array(z.string()),
  // THE MENU ATTRIBUTION (the mod-liveness ARM 3 law, 2026-10-28,
  // the swap build): the card-declared kind's schema_key (its kind
  // name — the card IS the catalog). Bare like every optional row.
  schema_key: z.string(),
});

/** The field types the wire carries; each demands its own
 *  default's JS type (the type-truth law). image/file/text are the
 *  PRESENTATION vocabulary (the leaf's square gate claims type
 *  image|file|mesh — WTYPE_SET's atom spellings; the picker law,
 *  live lane 2026-10-28): an image or file seat renders the
 *  media square, never freeform text. */
const FIELD_TYPES: Record<string, "string" | "number" | "boolean"> = {
  string: "string",
  path: "string",
  select: "string",
  number: "number",
  boolean: "boolean",
  text: "string",
  image: "string",
  file: "string",
};

const typeofDefault = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** Type-truth for one field row: the declared type demands the
 *  default's JS type; bounds agree; a select carries options. */
function checkField(where: string, f: Record<string, unknown>): void {
  const want = FIELD_TYPES[String(f["type"])];
  if (want === undefined) {
    throw new Error(`${where}: field '${String(f["name"])}' declares type '${String(f["type"])}' — not a wire type (${Object.keys(FIELD_TYPES).join("|")})`);
  }
  if (f["default"] !== undefined && typeofDefault(f["default"]) !== want) {
    throw new Error(`${where}: field '${String(f["name"])}' declares type '${String(f["type"])}' but its default is ${typeofDefault(f["default"])} — the default must match the declared type`);
  }
  const min = f["min"], max = f["max"];
  if (min !== undefined && max !== undefined && (min as number) > (max as number)) {
    throw new Error(`${where}: field '${String(f["name"])}' declares min ${String(min)} > max ${String(max)} — bounds must agree`);
  }
  const step = f["step"];
  if (step !== undefined && (step as number) <= 0) {
    throw new Error(`${where}: field '${String(f["name"])}' declares step ${String(step)} — step must be positive`);
  }
  const opts = f["options"] as unknown[] | undefined;
  if (f["type"] === "select" && (opts === undefined || opts.length === 0)) {
    throw new Error(`${where}: field '${String(f["name"])}' is a select with no options — a select carries its vocabulary`);
  }
  if (f["multi"] === true && String(f["type"]) !== "select") {
    throw new Error(`${where}: field '${String(f["name"])}' declares multi on type '${String(f["type"])}' — multi is the select chips face only`);
  }
}

/** The gate registerCard calls for def.mods: strict schema resolve
 *  (drift refuses) + the type-truth predicates. */
export function validateDeclaredMods(cardId: string, mods: readonly DeclaredModifierKind[] | undefined): void {
  if (mods === undefined) return;
  for (const mod of mods) {
    const where = `card '${cardId}' mod '${String(mod["kind"])}'`;
    // STRICT resolve: an unknown key strips → drift refuses loud
    const row = (Schema.resolve(mod as unknown as Record<string, unknown>, ModKind, {}, true) as [Record<string, unknown>, unknown])[0];
    const carried = Object.keys(mod as unknown as Record<string, unknown>);
    const kept = Object.keys(row);
    const stripped = carried.filter((k) => !kept.includes(k));
    if (stripped.length > 0) {
      throw new Error(`${where}: schema refused — unknown key(s) ${stripped.join(", ")} (the declared mod-kind face is strict; drift refuses)`);
    }
    for (const f of [...(mod.fields ?? []), ...(mod.kindFields ?? [])] as Array<Record<string, unknown>>) {
      checkField(where, f);
    }
  }
}
