// laneRelations.ts — THE RELATION WORDS (2026-10-10, the
// YOU_ARE_A_LIAR fix shape: the operator's standing demand — "the
// form the user types into must not be able to build a state the
// run refuses" — needs words for WHAT A FIELD REQUIRES, WHAT IT
// CONFLICTS WITH, and WHICH EITHER/OR GROUPS A LANE ACCEPTS. Until
// this module those words did not exist anywhere in the tree; the
// law lived in imperative card code the form never read (grep
// receipt: `requires|conflicts` → 0 hits corpus-wide).
//
// THE GRAMMAR (four words, each a pure judgment over a stated
// state — no card code, no engine call):
//   requires   — field fires only with its needs: stated field +
//                blank need = violation (design_prompt without
//                voice_name).
//   conflicts  — two stated fields cannot ride together
//                (style_instruction on a Design export).
//   together   — an all-or-nothing group: ANY member stated demands
//                ALL of them (voice_name + design_prompt: the
//                export needs the pair).
//   either_or  — at least one FULL group must ride, ARMED when any
//                member of any group is stated (the clone lane:
//                ref_audio + ref_text, or a .qvoice). A fully blank
//                state is AUTHORING-IN-PROGRESS, not a violation —
//                missing-input refusals stay the run door's; a
//                HALF-stated group is the active contradiction this
//                word refuses.
//
// THE SEATS: the bench-write door (admitStageRelations — the a
// priori wall), the form (inline gating under the field — the same
// declaration, served), and the estate law suites. One spelling of
// the judgment, every face. This module is the floor: zero
// dependencies, no build step, engine tier and web tier both sit
// on it (the extraKeys precedent).

/** One requires row: `field` fires only when every `needs` member
 *  is stated non-blank. `cure` is the refusal's second half — the
 *  sentence that names the cure, authored with the declaration. */
export interface LaneRequiresRow {
  readonly field: string;
  readonly needs: readonly string[];
  readonly cure?: string;
}

/** One conflicts row: `a` and `b` cannot both be stated. */
export interface LaneConflictsRow {
  readonly a: string;
  readonly b: string;
  readonly cure?: string;
}

/** One together row: the all-or-nothing group. */
export interface LaneTogetherRow {
  readonly fields: readonly string[];
  readonly cure?: string;
}

/** One either_or row: at least one group fully stated. */
export interface LaneEitherOrRow {
  readonly groups: readonly (readonly string[])[];
  readonly cure?: string;
}

/** One at_most_one row: AT MOST one member of a slot family may be
 *  stated (the design audit's Q2 — the sharpest gap in the
 *  vocabulary: `either_or` says "one of these SOURCES, at least
 *  one", so a six-field slot family read as "any one of six sources"
 *  and let two ride together, which no card meant. The word is
 *  additive and purely local: the judge is a set intersection). */
export interface LaneAtMostOneRow {
  readonly fields: readonly string[];
  readonly cure?: string;
}

/** One required row: these fields must be STATED on this lane
 *  (the design audit's Q2 — "prompt is required" was unutterable:
 *  `requires` demands a SIBLING, and blank-always-admits is the
 *  authoring-in-progress law. This word is the one exception to that
 *  law, and only for the fields it names: a declaration that means
 *  "required" says so here, and every other field keeps its
 *  tolerance). */
export interface LaneRequiredRow {
  readonly fields: readonly string[];
  /** ONE-OF (2026-10-10, the DECL audit's row 2 — the vocabulary
   *  could not say "at least one of these must be stated": the
   *  image-edit anchor is ONE list OR any legacy key, and either_or
   *  holds the blank tolerance by law). any_of: true turns the
   *  fields into a one-of anchor: the refusal fires only when NONE
   *  is stated, and the voice names the alternatives. */
  readonly any_of?: boolean;
  readonly cure?: string;
}

/** THE DECLARED WORDS, DERIVED (2026-10-10, the four-agent contract
 *  audit): every seat that needs to ENUMERATE the vocabulary — the
 *  boot drift gate, the model-less intersection, the agent render —
 *  reads this list instead of retyping it. Three hand lists meant a
 *  seventh word could land in the grammar and bind in two seats. The
 *  keys are the interface's own, so the list cannot fall behind. */
export const RELATION_WORDS = {
  requires: true,
  conflicts: true,
  together: true,
  either_or: true,
  at_most_one: true,
  required: true,
} as const satisfies Record<string, true>
export type RelationWord = keyof typeof RELATION_WORDS

/** The four relation words — the DECL's relation declaration (the
 *  wire shape; the ModelDecl grammar in comfyui-cordis authors
 *  exactly this). Absent ≡ none (the absent-equals-empty law). */
export interface LaneRelations {
  readonly requires?: readonly LaneRequiresRow[];
  readonly conflicts?: readonly LaneConflictsRow[];
  readonly together?: readonly LaneTogetherRow[];
  readonly either_or?: readonly LaneEitherOrRow[];
  readonly at_most_one?: readonly LaneAtMostOneRow[];
  readonly required?: readonly LaneRequiredRow[];
}

/** One violation — the refusal in the field's voice: the field
 *  named, the law named, the cure stated. */
export interface LaneViolation {
  readonly field: string;
  readonly message: string;
}

/** THE BLANK LAW (the estate's own): undefined, null, empty or
 *  whitespace string, empty array, empty object = NOT stated. A
 *  number (0 included), a boolean, a non-empty array (mod bag) or
 *  object = stated. Pure, shared by every word. */
export function laneBlank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.every((entry) => laneBlank(entry));
  if (typeof v === 'object') {
    const proto: unknown = Object.getPrototypeOf(v);
    // A NON-PLAIN OBJECT IS A VALUE, NOT A BAG (2026-10-10, the audit):
    // a Date, a Map, a boxed Number — none of them is a statement
    // about a field, and calling them blank let a Map through as
    // "stated" while an empty {} read as unstated.
    if (proto !== null && proto !== Object.prototype) return false;
    return Object.values(v as Record<string, unknown>).every((entry) => laneBlank(entry));
  }
  return false;
}

const quote = (fields: readonly string[]): string =>
  fields.map((f) => "'" + f + "'").join(' + ');

/** Judge the four words over one stated state. PURE: no I/O, no
 *  card code — the same call the bench door refuses with and the
 *  form renders inline. Every row fires only on the STATED side of
 *  the law (blank fields never violate requires/together; either_or
 *  stays unarmed until a member is stated — authoring-in-progress
 *  is never a write refusal). */
export function judgeLaneRelations(
  relations: readonly LaneRelations[],
  values: Record<string, unknown>,
): LaneViolation[] {
  const out: LaneViolation[] = []
  const stated = (name: string): boolean =>
    Object.prototype.hasOwnProperty.call(values, name) && !laneBlank(values[name])

  for (const rel of relations) {
    // A MALFORMED ROW JUDGES NOTHING (2026-10-10, the audit): the
    // judge must REFUSE, never throw, on a declaration that lost a
    // member in transit (the frozen facts path is unvalidated, and a
    // throw here would surface as an estate crash, not a voice).
    if (rel === null || typeof rel !== 'object') continue;
    for (const row of rel.requires ?? []) {
      if (row === null || typeof row !== 'object' || typeof row.field !== 'string') continue
      if (!stated(row.field)) continue
      const missing = (row.needs ?? []).filter((n) => !stated(n))
      if (missing.length === 0) continue
      out.push({
        field: row.field,
        message:
          "field '" + row.field + "' requires " + quote(missing) +
          ' on this lane' +
          (row.cure !== undefined && row.cure !== '' ? ' — ' + row.cure
            : ' — state ' + quote(missing) + ' too, or drop ' + "'" + row.field + "'"),
      })
    }
    for (const row of rel.conflicts ?? []) {
      if (row === null || typeof row !== 'object') continue
      if (typeof row.a !== 'string' || typeof row.b !== 'string') continue
      if (!stated(row.a) || !stated(row.b)) continue
      out.push({
        field: row.a,
        message:
          "fields '" + row.a + "' + '" + row.b + "' conflict on this lane" +
          (row.cure !== undefined && row.cure !== '' ? ' — ' + row.cure : ' — drop one of them'),
      })
    }
    for (const row of rel.together ?? []) {
      if (row === null || typeof row !== 'object') continue
      const members = Array.isArray(row.fields) ? row.fields : []
      if (members.length === 0) continue
      if (!members.some(stated)) continue
      const missing = members.filter((m) => !stated(m))
      if (missing.length === 0) continue
      out.push({
        // the stated member always exists: this block is reached
        // only past the `some(stated)` guard above, which left at
        // least one member stated — the `?? members[0]` fallback was
        // a dead leg
        field: members.find(stated) as string,
        message:
          'fields ' + quote(members) + ' ride together on this lane (state all or none)' +
          (row.cure !== undefined && row.cure !== ''
            ? ' — ' + row.cure
            : ' — state ' + quote(members) + ' together, or drop ' + quote(members)),
      })
    }
    for (const row of rel.either_or ?? []) {
      if (row === null || typeof row !== 'object') continue
      const groups = Array.isArray(row.groups) ? row.groups.filter((g) => Array.isArray(g)) : []
      // A MALFORMED ROW JUDGES NOTHING (the estate's own defensive
      // law, pinned by this package's suite): a row that names no
      // alternatives is not a claim, and the judge never invents one.
      // The two-alternative FLOOR is therefore not the judge's job —
      // it is the REGISTRATION seat's (models service relationDrift:
      // a DECL row is refused where it is written, loudly, at boot,
      // not silently ignored at run time). The first cut put it here
      // and contradicted the pinned law; the registration gate is the
      // one admission per door.
      if (groups.length === 0) continue
      const everyMember = groups.flat()
      if (!everyMember.some(stated)) continue // blank = in progress, never a write refusal
      const complete = groups.filter((g) => g.every(stated))
      if (complete.length > 0) continue
      out.push({
        // same law as the together arm: the `everyMember.some(stated)`
        // guard above left at least one member stated, so the
        // `?? everyMember[0]` fallback was a dead leg
        field: everyMember.find(stated) as string,
        message:
          'this lane takes one of ' +
          groups.map((g) => '(' + quote(g) + ')').join(' or ') +
          ' — the stated combination completes none of them' +
          (row.cure !== undefined && row.cure !== ''
            ? ' — ' + row.cure
            : ' — state one complete source, or drop the stated half'),
      })
    }
    // AT MOST ONE (the design audit's Q2's sharpest gap): a slot
    // family — six interchangeable fields where two riding together is
    // a contradiction the card's own compose cannot express. The judge
    // is a set intersection; a malformed row judges nothing, as above.
    for (const row of rel.at_most_one ?? []) {
      if (row === null || typeof row !== 'object') continue
      const fields = Array.isArray(row.fields) ? row.fields.filter((f): f is string => typeof f === 'string') : []
      if (fields.length < 2) continue
      const present = fields.filter(stated)
      if (present.length <= 1) continue
      out.push({
        field: present[1] as string,
        message:
          'this lane takes at most one of ' + quote(fields) +
          ' — the state carries ' + present.length + ' (' + quote(present) + ')' +
          (row.cure !== undefined && row.cure !== '' ? ' — ' + row.cure : ' — one slot, one value'),
      })
    }
    // REQUIRED (the design audit's Q2): the ONE exception to
    // blank-always-admits. A declaration that means "required" says so
    // here; every other field keeps the authoring-in-progress
    // tolerance, which is why this is a word and not a flag.
    for (const row of rel.required ?? []) {
      if (row === null || typeof row !== 'object') continue
      const fields = Array.isArray(row.fields) ? row.fields.filter((f): f is string => typeof f === 'string') : []
      // ANY_OF (the anchor law): the row is a one-of — satisfied by
      // ANY member stated, refused only when NONE is. The fields are
      // alternatives, not a list to complete.
      if (row.any_of === true) {
        if (fields.length === 0) continue
        if (fields.some(stated)) continue
        out.push({
          field: fields[0] as string,
          message:
            'this lane requires one of ' + quote(fields) + ' — none is stated' +
            (row.cure !== undefined && row.cure !== '' ? ' — ' + row.cure : ' — state one of them'),
        })
        continue
      }
      const missing = fields.filter((f) => !stated(f))
      if (missing.length === 0) continue
      out.push({
        field: missing[0] as string,
        message:
          'this lane requires ' + quote(fields) +
          ' — ' + quote(missing) + ' is not stated' +
          (row.cure !== undefined && row.cure !== '' ? ' — ' + row.cure : ' — state it, or use a lane that does not need it'),
      })
    }
  }
  // THE DUPLICATE-FOLD RULE (2026-10-10, the audit): a family and one
  // of its variants may declare the SAME row; both layers fire and the
  // state heard it twice. One law, one sentence.
  const seen = new Set<string>()
  return out.filter((v) => {
    if (seen.has(v.message)) return false
    seen.add(v.message)
    return true
  })
}

/** Judge the LANE SURFACE (the parameter-surface half of the same
 *  declaration): a STATED card-schema field outside the lane's
 *  declared surface fires nothing at compose — refuse it here, in
 *  the field's voice, a priori. `schemaFields` are the card's own
 *  field names (the walk the claim law already owns); fields the
 *  surface declares but the card does not carry are the claim
 *  law's refusal, never this one. A null surface (the family
 *  declares none) judges nothing — legacy families keep the card's
 *  union table until they declare. */
export function judgeLaneSurface(
  surface: readonly string[] | null | undefined,
  schemaFields: readonly string[],
  values: Record<string, unknown>,
): LaneViolation[] {
  // undefined IS null here (2026-10-10, the audit): a served JSON
  // block with no `lanes` hands undefined, and a crash at the message
  // path would be an estate crash, never a refusal.
  if (surface === null || surface === undefined) return []
  const declared = new Set(surface)
  const out: LaneViolation[] = []
  for (const name of schemaFields) {
    if (declared.has(name)) continue
    if (!Object.prototype.hasOwnProperty.call(values, name)) continue
    if (laneBlank(values[name])) continue
    out.push({
      field: name,
      message:
        "field '" + name + "' fires nothing on this lane (the variant's declared surface is " +
        (surface.length > 0 ? surface.join(', ') : 'empty') + ') — drop it or switch lane',
    })
  }
  return out
}

/** The effective surface for one (family × variant) lane: the
 *  family base plus the variant's additions (the cascade law —
 *  later layers add, never subtract). Null family params = the
 *  family declares no surface (the legacy card-authored truth). */
export function laneSurfaceOf(
  familyParams: readonly string[] | null | undefined,
  variantParams: readonly string[] | null | undefined,
): readonly string[] | null {
  if (familyParams === undefined || familyParams === null) return null
  // A COPY, NEVER AN ALIAS (2026-10-10, the audit): returning the
  // caller's own array let a "pure" judge hold live state.
  if (variantParams === undefined || variantParams === null) return [...familyParams]
  return [...new Set([...familyParams, ...variantParams])]
}

/** One bounds row: the model's own floor/ceiling for ONE numeric
 *  param. At least one endpoint must be stated (a bound that names
 *  neither is a typo, not a law). THE RANGE RULE (the 2.1 width
 *  burn, 2026-10-10): whoever owns the default owns the floor —
 *  the card's schema may bound what the CARD author knows, but the
 *  resolution a LANE accepts is the MODEL's truth, and it lived
 *  nowhere (width -50 admitted at every door; the engine produced
 *  garbage). Declared on the DECL, judged at bench-write with the
 *  same voice as the relation words. */
export interface ParamBound {
  readonly min?: number;
  readonly max?: number;
}

/** Bounds for the lane: family-level rows, per-field REPLACED by
 *  the variant's own when the variant states one (a lane may
 *  tighten its own ceiling — the lightning recipe's step budget is
 *  not the standard's; two independent rows would contradict, so
 *  the nearer layer wins, the surface cascade's add-law does not
 *  apply to numbers). */
export type LaneBounds = Readonly<Record<string, ParamBound>>;

export function laneBoundsOf(
  familyBounds: LaneBounds | null | undefined,
  variantBounds: LaneBounds | null | undefined,
): LaneBounds | null {
  if (familyBounds === undefined || familyBounds === null) {
    return variantBounds === undefined || variantBounds === null
      ? null
      : { ...variantBounds };
  }
  if (variantBounds === undefined || variantBounds === null) return { ...familyBounds }
  // PER-ENDPOINT MERGE (the design audit's F9, 2026-10-10): a
  // variant row REPLACES the family row for the fields it states,
  // but WITHIN a stated field each endpoint (min/max) the variant
  // leaves out is HELD from the family's row — a variant that
  // tightens only the ceiling never silently drops the family's
  // floor. To remove an endpoint a variant states the field's row
  // whole; to inherit a field entirely it states nothing for it.
  const merged: Record<string, ParamBound> = { ...familyBounds }
  for (const [name, row] of Object.entries(variantBounds)) {
    merged[name] = { ...(familyBounds[name] ?? {}), ...row }
  }
  return merged
}

/** Judge the bounds over one stated state. PURE. Blank fields never
 *  violate (the blank law: unstated is the family default's
 *  business, not a refusal); non-numbers are the card schema's own
 *  refusal, never re-voiced here; a stated number outside its row
 *  refuses IN THE FIELD'S VOICE, cure included. */
export function judgeLaneBounds(
  bounds: LaneBounds | null,
  values: Record<string, unknown>,
): LaneViolation[] {
  if (bounds === null) return []
  const out: LaneViolation[] = []
  for (const [name, row] of Object.entries(bounds)) {
    if (!Object.prototype.hasOwnProperty.call(values, name)) continue
    const v = values[name]
    if (laneBlank(v) || typeof v !== 'number' || !Number.isFinite(v)) continue
    const floor = row.min;
    const ceiling = row.max;
    const under = floor !== undefined && v < floor;
    const over = ceiling !== undefined && v > ceiling;
    if (!under && !over) continue
    const span =
      floor !== undefined && ceiling !== undefined
        ? floor + '–' + ceiling
        : floor !== undefined
          ? 'at least ' + floor
          : 'at most ' + ceiling
    out.push({
      field: name,
      message:
        "'" + name + "': " + v + " is outside this lane's range (" + span + ') — ' +
        'the model owns the floor and the ceiling (the declaration, not the form)',
    })
  }
  return out
}

/* ── THE LANE CONTRACT — one construction, every face ─────────────
 *
 * The agent-facing faces (/v1/card-tools and the melite_load bundle)
 * and the form-facing face must serve the SAME projection of a
 * family DECL, or an agent composes against a contract the form
 * gates differently. 2026-10-10: the projection lived only in the
 * melite-tools discovery arm, so /v1/load's signature — the agent's
 * PRIMARY face, the one melite_load renders — carried no lanes at
 * all and the lane-line render was dead code. One implementation,
 * exported from the contracts floor where the judged shapes live.
 */
/** A variant's ROUTE ENVELOPE, the DECL's own spelling (the
 *  contract audit's row 3): closed steps/cfg domains, [min, max].
 *  Both members ride together — the DECL schema refuses a partial
 *  envelope, and every seat that reads one judges the same shape.
 *  The one home; the kit/facts read seats wrap it in Partial for
 *  their unknown-source rows. */
export interface SamplerEnvelope {
  steps: number[]
  cfg: number[]
}

/** The envelope as the JUDGE reads it: every member optional (a
 *  seat may know one bound — the kit/facts rows wrap it in
 *  Partial for the same reason), every bound a read-only span.
 *  DERIVED from the interface by map, never re-spelled: the door
 *  feeds it the rail's normalized `readonly [number, number]`
 *  tuples and the mirror feeds it the served mutable arrays —
 *  both are the same facts to the judge. */
export type SamplerEnvelopeInput = Readonly<{
  [K in keyof SamplerEnvelope]?: readonly number[]
}>

/** The variant rail's unknown-variant refusal body — the one
 *  spelling, composed by the door (cardsVariant) and the client
 *  mirror (card-base composeValidate) alike; the FRAME rides the
 *  caller (`card_compose phase N:` at the door, the phase-less
 *  `card_compose:` on the client).
 *
 * @param stated the variant the caller stated, verbatim.
 * @param model the model id the variant pool belongs to.
 * @param known the offered variant ids, door order.
 * @returns the refusal body, frame-free. */
export function unknownVariantVoice (
  stated: string,
  model: string,
  known: readonly string[],
): string {
  return 'unknown variant ' + JSON.stringify(stated)
    + ' for model ' + JSON.stringify(model)
    + ' (known: ' + known.join(', ') + ')'
}

/** The variant rail's unknown-quant refusal body — same contract as
 *  {@link unknownVariantVoice}: one spelling, frame at the caller.
 *
 * @param stated the quant the caller stated, verbatim.
 * @param model the model id the cells belong to.
 * @param variant the variant whose cells were searched.
 * @param known the variant's offered quants, door order; empty
 *  yields the declares-no-cells tail.
 * @returns the refusal body, frame-free. */
export function unknownQuantVoice (
  stated: string,
  model: string,
  variant: string,
  known: readonly string[],
): string {
  return 'unknown quant ' + JSON.stringify(stated)
    + ' for model ' + JSON.stringify(model)
    + ' variant ' + JSON.stringify(variant)
    + (known.length > 0 ? ' (known: ' + known.join(', ') + ')' : ' (the variant declares no cells)')
}

/** A stated knob the envelope gate refused.
 *
 *  - `voice` is the refusal BODY, frame-free: the frame rides the
 *    caller (the phase-consistent `card_compose phase N:` at the
 *    door, the phase-less `card_compose:` on the client mirror). */
export interface SamplerEnvelopeOffence {
  knob: 'steps' | 'cfg'
  stated: number
  lo: number
  hi: number
  voice: string
}

/** THE ROUTE ENVELOPE GATE'S ONE JUDGE (the voice audit, 2026-10-11:
 *  six hand-mirrored spellings, two frames): a stated numeric
 *  steps/cfg outside the selected variant's closed envelope is the
 *  one refusal — the door (cardsVariant's envelopeRefusal) and the
 *  client mirror (card-base composeValidate clause 3) both ask this
 *  judge, never a divergent copy. The skips ride verbatim: a null
 *  envelope, an absent bound, a non-numeric or non-finite statement
 *  never refuse; a stated value inside the closed interval is
 *  caller agency. The married clause and the lane-read tail are the
 *  DOOR's own decorations — callers append what their seat knows.
 *
 * @param stated the caller's raw body — only numeric steps/cfg ride.
 * @param envelope the selected variant's declared envelope, null
 *  when the variant declares none; each bound is the closed
 *  [min, max] pair the DECL law writes.
 * @param variant the selected variant's id and route.
 * @returns the first offending knob with its composed voice, or
 *  null when every stated value sits inside. */
export function judgeSamplerEnvelope (
  stated: Readonly<Record<string, unknown>>,
  envelope: SamplerEnvelopeInput | null,
  variant: Readonly<{ id: string, route?: string }>,
): SamplerEnvelopeOffence | null {
  if (envelope === null) return null
  for (const knob of ['steps', 'cfg'] as const) {
    const bound = envelope[knob]
    if (bound === undefined) continue
    const value = stated[knob]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const [lo, hi] = bound
    if (value >= lo && value <= hi) continue
    return {
      knob,
      stated: value,
      lo,
      hi,
      voice: 'stated ' + knob + ' ' + String(value)
        + ' is OUTSIDE the route envelope for variant ' + JSON.stringify(variant.id)
        + (variant.route !== undefined && variant.route !== '' ? ' (route ' + variant.route + ')' : '')
        + ' — the declared envelope is [' + String(lo) + ', ' + String(hi) + ']',
    }
  }
  return null
}

/** The envelope refusal's CURE — the sentence that tells the
 *  operator what to do about it. Both seats append it verbatim
 *  after the judge's voice (the door interleaves its marriage
 *  clause between); the cure is one spelling because it is the
 *  half the operator reads.
 *
 * @returns the cure sentence, unpunctuated at both ends. */
export function samplerEnvelopeCure (): string {
  return 'The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.'
}

export interface LaneContractVariantRow {
  params?: readonly string[]
  relations?: LaneRelations
  bounds?: Record<string, { min?: number; max?: number }>
  sampler_envelope?: SamplerEnvelope
}

export interface LaneContractRow {
  /** The declared surface — ABSENT when the family declares no
   *  params at all (2026-10-11, the envelope wall: a family may
   *  judge relations/bounds/envelopes while owning no surface —
   *  krea-2's shape. Absent base = the form falls back to the
   *  card's own visibility; `base: []` stays the explicit
   *  black-form statement). */
  base?: readonly string[]
  relations?: LaneRelations
  bounds?: Record<string, { min?: number; max?: number }>
  variants: Record<string, LaneContractVariantRow>
}

export interface LaneContractDecl {
  params?: readonly string[]
  relations?: LaneRelations
  bounds?: Record<string, { min?: number; max?: number }>
  variants?: ReadonlyArray<{
    id: string
    params?: readonly string[]
    relations?: LaneRelations
    bounds?: Record<string, { min?: number; max?: number }>
    sampler_envelope?: SamplerEnvelope
  }>
}

/** One family's declared lane surface + laws, verbatim. Absent
 *  members stay absent (the absent-equals-empty law: nothing is
 *  invented, and a family that declares nothing yields an empty
 *  base with no relations key). */
export function laneContractOf (decl: LaneContractDecl): LaneContractRow {
  const variants: Record<string, LaneContractVariantRow> = {}
  for (const v of decl.variants ?? []) {
    if (
      v.params === undefined &&
      v.relations === undefined &&
      v.bounds === undefined &&
      v.sampler_envelope === undefined
    ) continue
    variants[v.id] = {
      ...(v.params !== undefined ? { params: [...v.params] } : {}),
      ...(v.relations !== undefined ? { relations: v.relations } : {}),
      ...(v.bounds !== undefined || v.sampler_envelope !== undefined
        ? { bounds: envelopeBoundsOf(v.bounds, v.sampler_envelope) }
        : {}),
      // the variant's sampler domain rides the contract too — the
      // bench judges it, so the face that composes must state it
      ...(v.sampler_envelope !== undefined ? { sampler_envelope: v.sampler_envelope } : {}),
    }
  }
  return {
    // ABSENT when the family declares no surface at all (krea-2's
    // shape: relations + envelopes, params undeclared — the form
    // falls back to the card's own visibility while every law
    // still judges)
    ...(decl.params !== undefined ? { base: [...decl.params] } : {}),
    ...(decl.relations !== undefined ? { relations: decl.relations } : {}),
    ...(decl.bounds !== undefined ? { bounds: decl.bounds } : {}),
    variants,
  }
}

/** THE ROUTE ENVELOPE IS BOUNDS (2026-10-11, the operator's wall:
 * "the entire point of the schema rework was so this was impossible
 * by design"): a variant's sampler_envelope is the SAME closed
 * interval the bench's stamp gate refuses with (envelopeRefusal) —
 * project it into the variant's bounds rows so the form's inline
 * gate, the run gate, and the compose door judge ONE truth. The
 * envelope OWNS both endpoints for steps/cfg (the door is the
 * authority; a family bound that contradicts its own variant's
 * envelope is a DECL bug, and the door's voice wins). Before this,
 * a family that declared only envelopes (krea-2) served bounds
 * null — the form judged NOTHING while the door refused the write
 * 300ms after the press. */
function envelopeBoundsOf (
  bounds: Record<string, { min?: number; max?: number }> | undefined,
  envelope: SamplerEnvelope | undefined,
): Record<string, { min?: number; max?: number }> {
  const out: Record<string, { min?: number; max?: number }> = { ...(bounds ?? {}) }
  if (envelope === undefined) return out
  if (Array.isArray(envelope.steps) && envelope.steps.length === 2) {
    out.steps = { ...(out.steps ?? {}), min: envelope.steps[0], max: envelope.steps[1] }
  }
  if (Array.isArray(envelope.cfg) && envelope.cfg.length === 2) {
    out.cfg = { ...(out.cfg ?? {}), min: envelope.cfg[0], max: envelope.cfg[1] }
  }
  return out
}

/** THE CONTRACT MAP for a card's declared families: family id → its
 *  lane contract. Families that declare no params and no laws are
 *  omitted (legacy families judge nothing; serving an empty row
 *  would only cost the agent tokens). */
export function laneContractsFor (
  familyIds: Iterable<string>,
  declOf: (family: string) => LaneContractDecl | undefined,
): Record<string, LaneContractRow> {
  const out: Record<string, LaneContractRow> = {}
  for (const id of familyIds) {
    const decl = declOf(id)
    if (decl === undefined) continue
    const contract = laneContractOf(decl)
    // a family with no declared surface, no laws and no variant
    // additions has nothing to say (the legacy stand-down; an
    // ABSENT base is the no-surface truth, not an empty one)
    const silent =
      (contract.base ?? []).length === 0 &&
      contract.relations === undefined &&
      contract.bounds === undefined &&
      Object.keys(contract.variants).length === 0
    if (silent) continue
    out[id] = contract
  }
  return out
}
