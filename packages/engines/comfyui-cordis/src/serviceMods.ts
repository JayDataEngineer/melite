// serviceMods.ts — the mod/verb system (extracted from service.ts, the god-file cut): the TS mod/verb system owns this plane (ported from the RETIRED dsl.py).
// Mod-field validation, verb validation, and the ControlNet entry resolution live here.
// No Service state; the seat calls these.
import { ComposeRefusal } from "./service.ts";
import { assertControlNetSchedule } from "@melite/comfyui-card-kit/guard";
import { bag } from '@melite/contracts/extraKeys'
// ── THE MOD/VERB SYSTEM (ported from the RETIRED melite_cards dsl.py, 2026-09-08 — the TS mod/verb system owns this now) ──
//
// The interlock: Model classes declared mods (fields + catalog
// rows joining the OWNING CARD's surface, scoped to the declaring
// families); SubActionMods mounted as verbs (engine rows, never on
// the card surface). Ported under the PORT LAW: registration
// through this service, validation LOUD at registration (the
// metaclass's gates), absorption derives at read.

/** A mod's field contract: a Schemastery OBJECT schema (the
 *  dual-declaration pattern — the same z.object({...}) style the
 *  cards declare; UI meta rides .extra('extra', bag({group, zone,
 *  order, visible_when})) exactly like card fields). ONE meta path
 *  walks both card and mod surfaces; same-pack flavor merging is
 *  Schema.intersect semantics (constraints merge per key). */
export type ModFields = {
  (v: unknown): Record<string, unknown>
  dict?: Record<string, Record<string, unknown>>
}

/** A lora catalog row (grammar.LoraRow — no link, no row).
 *  The shape is the shared catalog-row shape for row-bearing packs
 *  (loras today, controlnet: its rows carry the served tooltip and
 *  the upstream-map preprocessor note — catalog facts, never
 *  execution: no preprocessor runs in this plane). */
export interface LoraRowDecl {
  readonly id: string
  readonly filename: string
  /** The upstream fetch source — REQUIRED on executable rows
   *  (the CN/LoRA law: no link, no row). A vocabulary-only row
   *  (ip_adapter's refused-fate catalog) carries NONE: no source
   *  exists, so none is claimed — nothing fetches, nothing lies. */
  readonly source_url?: string
  readonly label?: string
  readonly category?: string
  readonly default_strength?: number
  /** The scalar default under a pack whose dial is 'weight'
   *  (ip_adapter's retired wire) — discovery stamps it into the
   *  option defaults under the pack's scalar_key. */
  readonly default_weight?: number
  /** Steps applied (2026-09-18): a DISTILL adapter's married step
   *  count — one lora for four steps, another for eight. Served into
   *  the option defaults so boarding stamps it onto the entry; the
   *  compose honors it when the caller pins no steps of their own.
   *  RANGE FACTS (the 4-to-8 correction): `steps_min`/`steps_max`
   *  declare the adapter's valid domain when it is not a fixed
   *  point (Turbo 4-to-8: min 4, max 8; the married default stays
   *  `steps`). A bare `steps` implies the fixed point. */
  readonly steps?: number
  readonly steps_min?: number
  readonly steps_max?: number
  readonly tooltip?: string
  readonly preprocessor?: string
  /** ControlNet schedule capability (002 H3): 'ranged' when the
   *  row's apply node carries start/end inputs (H3's
   *  Fun-ControlNet Union dials); absent = full-schedule only
   *  (z-image's node). Stamped onto the resolved entry so the
   *  kit's schedule law reads the ROW's capability, never a
   *  foreign family's node. */
  readonly schedule?: 'full' | 'ranged'
  /** ControlNet strength ceiling (002 H5): the row's own maximum
   *  (H3's dial runs to 10; the pack default stays 2 for rows
   *  that declare none). Stamped onto the resolved entry; the
   *  bound and the doc live on the row, not the pack. */
  readonly strength_max?: number
}

// ── THE MOD MUTATION SYSTEM (corrected 2026-09-08, operator
// order): mods are a DISTINCT CATEGORY — packs (loras, controlnets,
// lan-inpaint, mask, qvoice in that vein). The PACK is the category
// contract (its field schema, the Mod parent — engine-owned, melite_cards role); the FLAVOR is a family's boarding of the pack (the Model.mods tuple entry + the family's mods/<pack>.ts flavor — FAMILY-owned data: rows, runtime door, or a bare boarding).
// Fields live ONLY on the pack; a flavor never re-declares them (inheritance — subclassing).
// Scope comes from the DECLARATION SITE: the flavor's families, cross-gated boot-loud against the model's own DECL.mods (the paper's satisfaction law).

/** A pack contract — the CATEGORY (the Mod parent: LorasMod,
 *  ControlNetMod, LanPaintMod, MaskMod, the qvoice pack). Fields
 *  are the pack's knob block, inherited by every boarding family. */
export interface PackContract {
  readonly pack: string
  readonly fields: ModFields
}

/** A flavor registration — ONE family's boarding of a pack (the
 *  Model.mods tuple entry): bare (fields-only boarding), row-bearing
 *  (the family's catalog rows), or the runtime-catalog door. The
 *  file lives in the family's own mods/ dir — the scope below IS
 *  the owning declaration, gated ≡ the model's DECL.mods at boot. */
export interface FlavorRegistration {
  readonly pack: string
  readonly families: readonly string[]
  readonly rows?: readonly LoraRowDecl[]
  /** The RUNTIME CATALOG door (estate qwen loras catalog): no own rows
   *  the union of every family's declared rows serves; family rows
   *  always win over the union. */
  readonly runtimeCatalog?: boolean
}

/** A verb engine row (dsl.VerbEngine — exactly one arm). */
export interface VerbEngineRow {
  readonly id: string
  readonly flow?: string
  readonly local?: string
  readonly refusal?: string
}

/** A verb registration (SubActionMod: knobs NEVER join the card
 *  surface; they ride the engine invocation). */
export interface VerbRegistration {
  readonly id: string
  readonly label: string
  readonly families: readonly string[]
  readonly engines: readonly VerbEngineRow[]
  readonly writes: readonly string[]
  readonly requires: readonly string[]
  readonly fields: ModFields
}

/** A mod's absorbed contract (the family scope attached — the
 *  emission filter). */
export interface AbsorbedMod {
  readonly pack: string
  readonly fields: ModFields
  readonly families: readonly string[]
}

/** The field gates (dsl._validate_field), on the
 *  Schemastery meta — loud at registration, never a silent drop. */
export function validateFields(where: string, fields: ModFields): void {
  const dict = fields.dict
  if (dict === undefined) {
    throw new ComposeRefusal('bad-field', `${where}: fields must be a z.object contract (no .dict to walk)`)
  }
  for (const [name, node] of Object.entries(dict)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      throw new ComposeRefusal('bad-field', `${where}: field name '${name}' is not a legal identifier`)
    }
    const meta = (node as { meta?: Record<string, unknown> }).meta ?? {}
    if (meta.min !== undefined && meta.max !== undefined && (meta.min as number) > (meta.max as number)) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: min ${String(meta.min)} > max ${String(meta.max)}`)
    }
    if (meta.step !== undefined && (meta.step as number) <= 0) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: step ${String(meta.step)} <= 0`)
    }
    const dv = meta.default
    if (
      typeof dv === 'number' &&
      ((meta.min !== undefined && dv < (meta.min as number)) || (meta.max !== undefined && dv > (meta.max as number)))
    ) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: default ${String(dv)} outside [${String(meta.min ?? '-∞')}, ${String(meta.max ?? '∞')}]`)
    }
  }
}

/** The verb plane law (dsl._validate_verbs): every engine row
 *  carries EXACTLY one arm. */
export function validateVerb(v: VerbRegistration): void {
  if (!v.id || !v.label) throw new ComposeRefusal('bad-verb', `verb needs id + label`)
  for (const e of v.engines) {
    const arms = [e.flow, e.local, e.refusal].filter((x) => x !== undefined && x !== null && x !== '')
    if (arms.length !== 1) {
      throw new ComposeRefusal('bad-verb', `verb '${v.id}' engine '${e.id}': exactly one of flow/local/refusal (got ${arms.length})`)
    }
  }
  validateFields(`verb ${v.id}`, v.fields)
}

/** A union-of-consts node's option list (declared order = serve
 *  order; null when the node is not a closed vocabulary). The
 *  alternatives live at .list, each const carrying .value; a null
 *  const is the nullable marker, never an enum option. */

/** One normalized ControlNet row (the lane's resolved shape — the
 *  kit's fireControlNets consumes this, never the raw bag). The
 *  three stamped fields (002 H3/H5) carry the catalog ROW's own
 *  law downstream: the schedule capability, the strength ceiling,
 *  and the video/mask channels resolved exactly like the still
 *  channel. */
export interface ResolvedControlNet {
  readonly type: string
  readonly model: string
  readonly preprocessor: string
  readonly image_b64: string
  readonly artifact: string
  /** The staged conditioning source — artifact won when set (the
   *  retired brick precedence), else image_b64. Empty when the
   *  entry's conditioning rides the clip or mask channel instead
   *  (002 H2/H4). */
  readonly image: string
  /** The staged VIDEO conditioning source (002 H2) — the clip
   *  artifact name, '' when absent. */
  readonly clip: string
  /** The staged MASK conditioning source (002 H4) — the mask
   *  artifact name, '' when absent. */
  readonly mask: string
  readonly strength: number
  readonly start_percent: number
  readonly end_percent: number
  readonly enabled: boolean
  /** The row's declared schedule capability, stamped (002 H3). */
  readonly schedule: 'full' | 'ranged'
  /** The row's declared strength ceiling, stamped (002 H5). */
  readonly strength_max: number
}

/**
 * Normalize one ControlNet bag row to the lane's resolved shape
 * (the compose-side half of the type/model split — the kit fires,
 * the service resolves, the LoRA law verbatim). Every malformed
 * row refuses LOUD with its entry named: unknown catalog types,
 * a model naming a different file than the catalog row, a
 * preprocessor disagreeing with the row's upstream-map note, an
 * off-bounds strength, a malformed step range, a map-less entry.
 * The step EXECUTABILITY refuses in the kit's schedule law (one
 * spelling — assertControlNetSchedule, shared); the range SHAPE
 * refuses here.
 */
export function resolveControlNetEntry(
  raw: unknown,
  rows: readonly LoraRowDecl[],
  cardId: string,
  modelId: string,
): ResolvedControlNet {
  const e = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const type = typeof e.type === "string" && e.type !== "" ? e.type : ""
  const row = rows.find((r) => r.id === type)
  if (row === undefined) {
    throw new ComposeRefusal('unknown-controlnet',
      `card '${cardId}' names controlnet type '${type}' with no '${modelId}' flavor row ` +
      `(registered: ${rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`)
  }
  const named = typeof e.model === "string" && e.model !== "" ? e.model : null
  if (named !== null && named !== row.filename) {
    throw new ComposeRefusal('controlnet-drift',
      `card '${cardId}' controlnet '${type}' names model '${named}' but the catalog row serves '${row.filename}' — the union file is the row's, never hand-spelled`)
  }
  const noted = typeof e.preprocessor === "string" && e.preprocessor !== "" ? e.preprocessor : null
  if (noted !== null && row.preprocessor !== undefined && noted !== row.preprocessor) {
    throw new ComposeRefusal('controlnet-drift',
      `card '${cardId}' controlnet '${type}' notes preprocessor '${noted}' but the catalog row notes '${row.preprocessor}' — the upstream-map note is the row's`)
  }
  // strength: the row's own default seeds an unstated entry (the
  // retired leaf's seed law); a stated off-bounds strength refuses
  // against the ROW'S declared ceiling (002 H5 — H3's dial runs
  // to 10; rows that declare none keep the pack default 2), never
  // a silent clamp — the floor below is the only clamp, and it
  // logs.
  const ceiling = row.strength_max ?? 2
  const seed = row.default_strength ?? 0.7
  const strength = e.strength === undefined ? seed : e.strength
  if (typeof strength !== "number" || !Number.isFinite(strength) || strength < 0 || strength > ceiling) {
    throw new ComposeRefusal('bad-controlnet',
      `card '${cardId}' controlnet '${type}' strength = ${String(e.strength)}: a number in [0, ${String(ceiling)}] is required (the row's declared ceiling)`)
  }
  const start = e.start_percent === undefined ? 0 : e.start_percent
  const end = e.end_percent === undefined ? 1 : e.end_percent
  if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || start > 1
    || typeof end !== "number" || !Number.isFinite(end) || end < 0 || end > 1 || start > end) {
    throw new ComposeRefusal('bad-controlnet',
      `card '${cardId}' controlnet '${type}' step range = ${String(e.start_percent)}–${String(e.end_percent)}: numbers in [0, 1] with start <= end are required`)
  }
  try {
    assertControlNetSchedule(type, start, end, row.schedule)
  } catch (err) {
    throw new ComposeRefusal('controlnet-schedule', (err as Error).message)
  }
  const artifact = typeof e.artifact === "string" ? e.artifact : ""
  const image_b64 = typeof e.image_b64 === "string" ? e.image_b64 : ""
  const clip = typeof e.clip === "string" ? e.clip : ""
  const mask = typeof e.mask === "string" ? e.mask : ""
  const image = artifact !== "" ? artifact : image_b64
  if (image === "" && clip === "" && mask === "") {
    throw new ComposeRefusal('bad-controlnet',
      `card '${cardId}' controlnet '${type}' carries no conditioning image (neither artifact nor image_b64) — a structure lock with no map is drift, not a skip`)
  }
  const enabled = e.enabled === undefined ? true : e.enabled
  if (typeof enabled !== "boolean") {
    throw new ComposeRefusal('bad-controlnet',
      `card '${cardId}' controlnet '${type}' enabled = ${String(e.enabled)}: a boolean is required`)
  }
  return {
    type, model: row.filename, preprocessor: row.preprocessor ?? noted ?? "",
    image_b64, artifact, image, clip, mask, strength, start_percent: start, end_percent: end, enabled,
    schedule: row.schedule ?? 'full', strength_max: ceiling,
  }
}
