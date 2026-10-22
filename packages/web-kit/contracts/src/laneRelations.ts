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

/** The sentence stem every unstated-required violation opens with
 *  (both the ALL and ANY_OF arms share it — see
 *  isUnstatedRequiredVoice for the seats that test it). */
const UNSTATED_REQUIRED_STEM: string = 'this lane requires ';

/** The unstated-required sentence stem — the opening words of every
 *  violation this judge emits for a required word that is simply
 *  UNSTATED (the incomplete-draft class). Exported as the ONE
 *  spelling every seat tests: the write door's filter (drop the
 *  class at the add seat), the run seat's refusal code (the class
 *  rides card_compose_incomplete, never a run face), and the drafts
 *  domain's one-time heal of rows the old carry poisoned. A text
 *  CARRIES the class when the stem appears anywhere in it — the
 *  judge's own messages open with it, and persisted composites
 *  embed it after the door's prefix.
 * @param text the refusal sentence to classify
 * @returns true when the sentence is the unstated-required voice */
export function isUnstatedRequiredVoice(text: string): boolean {
  return text.includes(UNSTATED_REQUIRED_STEM);
}

/** THE WRITE-SEAT SPELLING of the frictionless-authoring ruling
 *  (operator 2026-11-11: "The refusal is never one keystroke at a
 *  time … you are submitting a form, not hacking the mainframe"):
 *  the ONE function every write-side gate calls after the strict
 *  judge — it drops the authoring-incomplete class (the
 *  unstated-required word, a together half, an either_or half).
 *  The registry's write doors AND the form's inline gate BOTH drop
 *  through THIS function — attempt 12 (2026-11-11) was exactly this
 *  drift: the door filtered, the form's own copy of the judgment
 *  didn't, and the operator's keystroke refused while every wall
 *  was green because the walls drove the door, not the form. One
 *  spelling; a second copy of this class test anywhere is the
 *  multiple-seat disease.
 * @param violations the strict judge's violations (any seat)
 * @returns the violations a write-side gate may voice */
export function dropAuthoringIncomplete<T extends { message: string }>(violations: readonly T[]): T[] {
  return violations.filter((v) =>
    !isUnstatedRequiredVoice(v.message)
    && !isTogetherHalfVoice(v.message)
    && !isEitherOrHalfVoice(v.message))
}

/** The sentence stems of the two AUTHORING-HALF voices — a together
 *  group or an either_or alternative stated but not yet completed.
 *  THE FRICTIONLESS-AUTHORING RULING (operator 2026-11-11: "you are
 *  submitting a form, not hacking the mainframe" — reaffirming the
 *  2026-11-10 order): a doc mid-authoring holds halves. The write
 *  door drops the class exactly as it drops the unstated-required
 *  word; the run seat keeps judging it — a half pair never composes.
 *  Same export law as the unstated stem: the write door's filter and
 *  any seat that classifies these sentences spell the class through
 *  these tests, never a re-typed literal. */
const TOGETHER_HALF_STEM: string = ' ride together on this lane (state all or none)';
const EITHER_OR_HALF_STEM: string = ' — the stated combination completes none of them';

/** The together-half class test: the sentence names a together group
 *  whose members are not all stated yet.
 * @param text the refusal sentence to classify
 * @returns true when the sentence is the together-half voice */
export function isTogetherHalfVoice(text: string): boolean {
  return text.includes(TOGETHER_HALF_STEM);
}

/** The either_or-half class test: the sentence names an alternative
 *  none of whose groups the stated fields complete yet.
 * @param text the refusal sentence to classify
 * @returns true when the sentence is the either_or-half voice */
export function isEitherOrHalfVoice(text: string): boolean {
  return text.includes(EITHER_OR_HALF_STEM);
}

/** The heal's stricter twin: the text is the unstated-required class
 * AND NOTHING ELSE. A composite refusal (the judge joins multiple
 * violations with "; ") can carry the stem beside a stated-wrong
 * half — healing that row would erase a REAL failure. The drafts
 * domain's one-time heal runs on persisted rows and must fire only
 * on pure members of the class: every segment passes the stem test
 * or the row keeps its failed face.
 * @param text the persisted refusal sentence to classify
 * @returns true when every segment of the text is the
 *  unstated-required voice */
export function isPurelyUnstatedRequiredVoice(text: string): boolean {
  if (!isUnstatedRequiredVoice(text)) return false;
  return text
    .split(/;\s*|\n/)
    .filter((segment) => segment.trim() !== "")
    .every((segment) => isUnstatedRequiredVoice(segment));
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
export function judgeLaneSurface(  surface: readonly string[] | null | undefined,
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

/** THE LANE MIGRATION CARRY (operator 2026-10-12, the stuck-switch
 *  incident — live on :3088: a CustomVoice draft carrying `voice`,
 *  the variant switched to VoiceDesign, and the write REFUSED
 *  "field 'voice' fires nothing on this lane — drop it or switch
 *  lane" while the form HIDES the voice row on the new lane: the
 *  named cure is unclickable and the switch itself cannot land,
 *  wedging the studio between "the studio shows your edit; the
 *  bench does not").
 *
 *  THE LAW: a lane change is a MIGRATION, not a refusal. A stated
 *  member that the PRIOR lane's surface declared but the new lane's
 *  does not take is stale carry — it rides nothing at compose, so
 *  the write door DROPS it and lands the switch. The a priori
 *  refusal keeps its teeth exactly where they belong: a member
 *  stated on the CURRENT lane that no prior lane declared is
 *  authored state, refused in the field's voice as before. This is
 *  the same blank law judgeLaneSurface already runs — the stale set
 *  is precisely the refusal set ∩ the prior surface. The membership
 *  test rides the SURFACES (the DECL's own vocabulary), never the
 *  card schema walk: surfaces name members the card schema does not
 *  carry flat (voice_name is a mod rider — the schemaNames walk
 *  skipped it and the pair half-survived the first cut of this
 *  law).
 *
 *  @param prevSurface the prior (family × variant) lane's surface —
 *  the lane the state is leaving
 *  @param nextSurface the resolved lane's surface — the lane the
 *  write selects
 *  @param values the MERGED view the write door would judge
 *  @returns the stale member names to delete from the merged view
 *  (empty when the surfaces name no such members). */
export function laneStaleCarry(
  prevSurface: readonly string[] | null | undefined,
  nextSurface: readonly string[] | null | undefined,
  values: Record<string, unknown>,
): string[] {
  if (prevSurface === null || prevSurface === undefined) return []
  if (nextSurface === null || nextSurface === undefined) return []
  const prev = new Set(prevSurface)
  const next = new Set(nextSurface)
  const out: string[] = []
  for (const name of Object.keys(values)) {
    if (next.has(name)) continue
    if (!prev.has(name)) continue
    if (laneBlank(values[name])) continue
    out.push(name)
  }
  return out
}

/** The transitive together-closure of a stale set: a stale member
 *  takes its together-group with it, and a group-mate made stale by
 *  THAT pass takes its own group too — a FIXPOINT, never a single
 *  pass (overlapping groups in the wrong declaration order would
 *  strand a transitively-dropped sibling: [{together:[b,c]},
 *  {together:[a,b]}] with stale {a} closes to {a,b,c} in BOTH
 *  declaration orders; a single pass yields {a,b} when [b,c] is
 *  declared first). Siblings already blank are not carried state
 *  and stay put.
 *  @param rows the judged relations (family + resolved variant —
 *  the same rows the admission judges)
 *  @param stale the seed stale members (mutated in place to the
 *  closure; callers pass the seat's own set)
 *  @param values the merged view (a stated, non-blank sibling is
 *  carried state; a blank one is not)
 *  @returns the closed stale set (the same set instance). */
export function laneTogetherClosure(
  rows: readonly (LaneRelations | undefined)[],
  stale: Set<string>,
  values: Record<string, unknown>,
): Set<string> {
  let grew = true
  while (grew) {
    grew = false
    for (const rel of rows) {
      for (const group of rel?.together ?? []) {
        if (!group.fields.some((m) => stale.has(m))) continue
        for (const m of group.fields) {
          if (stale.has(m)) continue
          if (laneBlank(values[m])) continue
          stale.add(m)
          grew = true
        }
      }
    }
  }
  return stale
}

/** The effective surface for one (family × variant) lane: the
 *  family base plus the variant's additions (the cascade law —
 *  later layers add, never subtract). Null family params = the
 *  family declares no surface (the legacy card-authored truth). */
export function laneSurfaceOf(
  familyParams: readonly string[] | null | undefined,
  variantParams: readonly string[] | null | undefined,
  cellParams?: readonly string[] | null | undefined,
): readonly string[] | null {
  if (familyParams === undefined || familyParams === null) return null
  // A COPY, NEVER AN ALIAS (2026-10-10, the audit): returning the
  // caller's own array let a "pure" judge hold live state.
  //
  // THE CELL AXIS (operator 2026-10-26, "THEN QUANT, THAT IS WHERE
  // YOU CHOSE 1.7 OR .6"): a variant may span SIZE cells whose
  // surfaces differ — the qwen3-tts customvoice lane takes
  // style_instruction on its 1.7B cell only (upstream: the small
  // checkpoint's generate_custom_voice has no instruct input). The
  // cell's params add to family ∪ variant with the same
  // add-never-subtract cascade; absent ≡ the variant's own surface
  // holds for every cell of its ladder.
  if (
    (variantParams === undefined || variantParams === null) &&
    (cellParams === undefined || cellParams === null)
  ) return [...familyParams]
  return [...new Set([
    ...familyParams,
    ...(variantParams ?? []),
    ...(cellParams ?? []),
  ])]
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
 *  THE HONEST VOICE (the axis-unification cure, 2026-11-06 — the
 *  operator's anima burn: the served matrix carried zero Quant rows
 *  while the DECL declared two, and the old empty tail asserted the
 *  DECL's absence, which the caller's matrix cannot see). An empty
 *  `known` is a statement about the CALLER'S PROJECTION — the served
 *  matrix it was handed — so the tail names the projection and the
 *  sync break, never a DECL fact; the DECL's own cells, when the
 *  projection carries them, ride the known list.
 *
 * @param stated the quant the caller stated, verbatim.
 * @param model the model id the cells belong to.
 * @param variant the variant whose cells were searched.
 * @param known the variant's offered quants, door order; empty
 *  yields the projection-break tail.
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
    + (known.length > 0
      ? ' (known: ' + known.join(', ') + ')'
      : ' (the served matrix declares no cells for this variant — DECL/projection sync break)')
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
  /** THE CELL SURFACES (operator 2026-10-26, the size-at-quant
   *  reshape): per-quant additions over the variant's own surface —
   *  a size cell may take a member its sibling size does not
   *  (style_instruction on the 1.7B customvoice cell only). Keyed
   *  by cell quant; present only where a cell declares params. */
  cells?: Record<string, { params?: readonly string[] }>
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
    cells?: ReadonlyArray<{ quant: string; params?: readonly string[] }>
  }>
}

/** One family's declared lane surface + laws, verbatim. Absent
 *  members stay absent (the absent-equals-empty law: nothing is
 *  invented, and a family that declares nothing yields an empty
 *  base with no relations key). */
export function laneContractOf (decl: LaneContractDecl): LaneContractRow {
  const variants: Record<string, LaneContractVariantRow> = {}
  for (const v of decl.variants ?? []) {
    // THE CELL SURFACES ride the contract (the size-at-quant
    // reshape): a cell that declares params serves its additions so
    // the form's inline gate and the bench door judge ONE truth
    // per (variant × quant) cell.
    const cells: Record<string, { params?: readonly string[] }> = {}
    for (const c of v.cells ?? []) {
      if (c.params !== undefined) cells[c.quant] = { params: [...c.params] }
    }
    if (
      v.params === undefined &&
      v.relations === undefined &&
      v.bounds === undefined &&
      v.sampler_envelope === undefined &&
      Object.keys(cells).length === 0
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
      ...(Object.keys(cells).length > 0 ? { cells } : {}),
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

/** The marriage aggregation's inputs, structurally — the served
 *  modifier kind's members the math reads (formSpec's ModifierKind
 *  carries these verbatim; nothing narrower is invented).
 *  @see marriedKnobValues */
export interface MarriageKindInput {
  /** The bag field the kind counts (the loras array's param key). */
  param_key: string
  /** THE MARRIAGE DECLARATION: knob → aggregation ('max' — the only
   *  spelling compose layers). */
  marries?: Record<string, 'max'>
  /** The pack's catalog rows: a bag row names one by `id`; its
   *  declared knob defaults are the row's contribution. */
  options?: ReadonlyArray<{ value: unknown, defaults?: Record<string, unknown> }>
}

/** THE MARRIED-KNOB AGGREGATION (#36, the recipes rework — compose
 *  card.ts's own layering verbatim: "a call's own knobs > the lora
 *  entry's steps > this steps row"): when a served kind declares a
 *  knob marriage and a counting bag rides, the knob is the BAG's —
 *  stated on the row first, else the catalog row's default,
 *  Math.max across the bag ("8 on a 4-step distill is fine, 4 on an
 *  8-step is undercooked"). THE ONE SPELLING (axis-unification item
 *  6, D6 — the resolver-consolidation home, beside the voices): the
 *  face's resolver (card-base resolveValue) displays through this
 *  math instead of a private copy, so the display and the compose
 *  layering cannot drift. A bag id the catalog does not serve
 *  contributes nothing (the mod plane and the compose door refuse
 *  unknown ids loudly — the display never invents a refusal of its
 *  own). PURE, no I/O.
 *
 *  @param kind the served modifier kind (marries + catalog options).
 *  @param bag the doc's riding array for the kind's param_key —
 *  entries may be any shape; non-object rows contribute nothing.
 *  @returns the knob → married value map, only knobs with at least
 *  one finite count; absent keys are untouched by the caller. */
export function marriedKnobValues (
  kind: MarriageKindInput,
  bag: readonly unknown[],
): Record<string, number> {
  const out: Record<string, number> = {}
  if (kind.marries === undefined) return out
  const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]))
  for (const knob of Object.keys(kind.marries)) {
    const counts: number[] = []
    for (const row of bag) {
      if (row === null || typeof row !== 'object') continue
      const stated = (row as Record<string, unknown>)[knob]
      if (typeof stated === 'number' && Number.isFinite(stated)) {
        counts.push(stated)
        continue
      }
      const id = (row as Record<string, unknown>)['id']
      const fromCatalog = typeof id === 'string'
        ? (catalog.get(id)?.defaults as Record<string, unknown> | undefined)?.[knob]
        : undefined
      if (typeof fromCatalog === 'number' && Number.isFinite(fromCatalog)) counts.push(fromCatalog)
    }
    if (counts.length > 0) out[knob] = Math.max(...counts)
  }
  return out
}

// ── THE ONE VARIANT-CELL RESOLVER (axis-unification item 6 — the
//    P2 consolidation, D6 2026-10-17) ─────────────────────────────
// Five resolvers judged the same (model × variant × quant) coordinate
// with four shapes and three voices; the walls fed both sides from the
// same mirror and the seams between copies had no judge. This module
// now owns the coordinate law; the seats delegate and keep only their
// seat-bound decoration (the frame prefix, the phase, the address
// visibility refusals). The scope split is the honest one:
//   'declared' — the DECL walk's face (the engine resolver R1): every
//     declared row is searchable, id-only matching, first-declared
//     default, hide flags are data — never a pool.
//   'offered'  — the wire face (the door R2, the mirror R3): hidden
//     rows are not offered, Recipe rows never seed a default, the
//     compose address claims its own lane when the caller states
//     nothing.
// The refusal DATA (stated value + the caller's own matrix's ids) is
// computed here; the VOICE stays at the seat that frames it (the
// shared voices above, R1's prose — walled separately).

/** The minimal variant row the resolver reads — the DECL's variant,
 *  the facts row's variant, and the flat-matrix fold all carry this.
 *  Members ride `unknown` because the seats' shapes type them
 *  differently (string | null | absent); the resolver normalizes. */
export interface ResolverVariantRow {
  id: string
  route?: unknown
  group?: unknown
  hide_from_dropdown?: unknown
  cells?: readonly ResolverCellRow[]
}

/** The minimal cell row: the DECL cell, the facts cell, or a folded
 *  flat Quant row (quant coordinate + route + visibility). */
export interface ResolverCellRow {
  quant?: unknown
  route?: unknown
  hide_from_dropdown?: unknown
}

/** Which face the caller resolves for.
 *  - `'declared'`: the engine's coordinate law (id-only match, no
 *    visibility filtering, first-declared default).
 *  - `'offered'`: the wire's law (id-or-route, hidden rows not
 *    offered, Recipe excluded from the default pool, the address
 *    claims its lane). */
export type ResolverScope = 'declared' | 'offered'

/** One variant-axis miss: the stated value, its kind, and the ids of
 *  the matrix the caller handed (the honest known list — the caller's
 *  own projection, never a DECL fact the caller cannot see). */
export type VariantRowResolution<V extends ResolverVariantRow> =
  | { readonly status: 'resolved'; readonly variant: V }
  | { readonly status: 'hidden'; readonly variant: V }
  | { readonly status: 'missing'; readonly stated: string; readonly known: readonly string[] }
  | { readonly status: 'pool-empty'; readonly known: readonly string[] }

/** One quant-axis miss over the resolved variant's cells. */
export type CellRowResolution<C extends ResolverCellRow> =
  | { readonly status: 'resolved'; readonly cell: C | null; readonly quant: string }
  | { readonly status: 'missing'; readonly stated: string; readonly known: readonly string[] }

/** THE STATED MARK (both scopes): a string — INCLUDING the empty
 *  string — is a stated coordinate (the door's false-admit cure pins
 *  the empty selection's LOUD refusal: `unknown quant ""`, the
 *  operator's exact face); only null/undefined are the unstated
 *  mark. Non-string values read as unstated here — the seats that
 *  must name the type guard before calling. */
const statedOf = (stated: unknown): string | null =>
  typeof stated === 'string' ? stated : null

const visibleRows = <V extends ResolverVariantRow>(variants: readonly V[]): V[] =>
  variants.filter((v) => v.hide_from_dropdown !== true)

const visibleCells = <C extends ResolverCellRow>(cells: readonly C[]): C[] =>
  cells.filter((c) => c.hide_from_dropdown !== true)

const knownIds = <V extends ResolverVariantRow>(variants: readonly V[]): string[] =>
  variants.map((v) => v.id)

const knownQuants = <C extends ResolverCellRow>(cells: readonly C[]): string[] =>
  cells.map((c) => (typeof c.quant === 'string' ? c.quant : ''))

/** THE DEFAULT POOL (the wire face): offered rows minus the Recipe
 *  group; an all-Recipe family falls back to every offered row (the
 *  recipe-only family still resolves — the door's own
 *  configured.length gate). Exported for the seat that must refuse
 *  an all-hidden family BEFORE its stated search (the door's early
 *  check, order-pinned by its suite) — the pool itself has one
 *  spelling here. */
export function offeredPool<V extends ResolverVariantRow> (variants: readonly V[]): V[] {
  const offered = visibleRows(variants)
  const configured = offered.filter((v) => v.group !== 'Recipe')
  return configured.length > 0 ? configured : offered
}

/** THE VARIANT COORDINATE, one law per scope. Stated coordinates
 *  search the matrix the caller handed (its ids are the honest known
 *  list on a miss); unstated coordinates resolve through the scope's
 *  default (declared: first row; offered: the address claim, then
 *  the pool's first row).
 *
 *  @param variants the caller's variant matrix — DECL rows, facts
 *  rows, or the flat-matrix fold.
 *  @param stated the body's `variant` value verbatim: a string —
 *  including the empty string — is stated (the false-admit cure's
 *  loud refusal); null/undefined (and non-strings) are unstated.
 *  @param address the compose address (the family/route key the run
 *  addresses); '' when the seat has none — no claim is made.
 *  @param scope the face the caller resolves for. */
export function resolveVariantRow<V extends ResolverVariantRow> (
  variants: readonly V[],
  stated: unknown,
  address: string,
  scope: ResolverScope,
): VariantRowResolution<V> {
  if (scope === 'declared') {
    // THE ENGINE'S UNSTATED MARK IS NULL (the DECL walk: first
    // declared = the default); ANY other value — the empty string
    // included — is a stated coordinate and must miss loudly.
    if (stated === null || stated === undefined) {
      return { status: 'resolved', variant: variants[0] }
    }
    const want = typeof stated === 'string' ? stated : ''
    const hit = variants.find((v) => v.id === want)
    if (hit === undefined) {
      return { status: 'missing', stated: want, known: knownIds(variants) }
    }
    return { status: 'resolved', variant: hit }
  }
  const want = statedOf(stated)
  if (want !== null) {
    // THE STATED SEARCH runs over the whole handed matrix — a hidden
    // hit is a distinct status (the door spells its not-offered
    // voice; a served matrix never carries hidden rows, so the
    // mirror cannot produce this status), and a miss speaks the
    // caller's own ids. The empty string is stated here (the
    // false-admit cure): it matches nothing and misses loudly.
    const hit = variants.find((v) => v.id === want || v.route === want)
    if (hit === undefined) {
      return { status: 'missing', stated: want, known: knownIds(variants) }
    }
    if (hit.hide_from_dropdown === true) return { status: 'hidden', variant: hit }
    return { status: 'resolved', variant: hit }
  }
  const pool = offeredPool(variants)
  if (pool.length === 0) return { status: 'pool-empty', known: knownIds(variants) }
  if (address !== '') {
    // THE ADDRESS CLAIMS THE VARIANT (operator 2026-10-12, the
    // offered-cells wall's first firing): a doc pinned to a route
    // that names a VARIANT-level lane ('krea-2-raw',
    // 'z-image-base-int8') must compose THAT lane, never pool[0]'s
    // silent neighbor. The address's cell claim only searches the
    // chosen variant's cells — without this claim a route-addressed
    // draft landed pool[0] + cells[0] and composed the wrong weights
    // while every surface stayed green (variant switching "not
    // working" under an all-green suite).
    const claimed = pool.find((v) => v.route === address
      || visibleCells(v.cells ?? []).some((c) => c.route !== '' && c.route === address))
    if (claimed !== undefined) return { status: 'resolved', variant: claimed }
  }
  return { status: 'resolved', variant: pool[0] }
}

/** THE QUANT COORDINATE, one law per scope, over the RESOLVED
 *  variant's cells. Stated coordinates match the quant VALUE (never
 *  the flat row id — the axisStampOf vocabulary); unstated ones
 *  claim the address's cell, else the first (visible) cell. A
 *  variant with no cells resolves `cell: null, quant: ''` — the
 *  honest empty, the caller's voice names the sync break when it
 *  must.
 *
 *  @param variant the resolved variant row (its cells are searched).
 *  @param stated the body's `quant` value verbatim: a string —
 *  including '' — is stated; null/undefined and non-strings are
 *  unstated.
 *  @param address the compose address; '' makes no claim.
 *  @param scope the face the caller resolves for. */
export function resolveCellRow<C extends ResolverCellRow> (
  variant: ResolverVariantRow | undefined,
  stated: unknown,
  address: string,
  scope: ResolverScope,
): CellRowResolution<C> {
  const cells = (variant?.cells ?? []) as C[]
  const searched = scope === 'declared' ? cells : visibleCells(cells)
  const want = statedOf(stated)
  if (want !== null) {
    // The empty string is stated here too — the false-admit cure's
    // `unknown quant ""` voice rides this arm.
    const hit = searched.find((c) => c.quant === want)
    if (hit === undefined) {
      return { status: 'missing', stated: want, known: knownQuants(searched) }
    }
    return { status: 'resolved', cell: hit, quant: want }
  }
  const claimed = address !== ''
    ? searched.find((c) => c.route !== '' && c.route === address)
    : undefined
  const cell = claimed ?? searched[0] ?? null
  return {
    status: 'resolved',
    cell,
    quant: cell !== null && typeof cell.quant === 'string' ? cell.quant : '',
  }
}

/** A served flat-variant row as the fold reads it — the FormSpecDoc
 *  `variants` members (Variant rows + the serializer's expanded Quant
 *  cell rows with `owner` backrefs). Structural: the fold keeps the
 *  original row's every member, so the folded variant still serves as
 *  the wire row (the dragbar's envelope read, the pick verbs). */
export interface FlatVariantRowInput {
  id: unknown
  group?: unknown
  route?: unknown
  quant?: unknown
  owner?: unknown
  hide_from_dropdown?: unknown
}

/** THE FLAT-MATRIX FOLD (the mirror's P2 face of the one resolver):
 *  the served spec flattens cells into `group: 'Quant'` rows with
 *  `owner` backrefs; the resolver reads the nested matrix. This fold
 *  re-nests the wire rows — Variant/Recipe rows stay (a stated Recipe
 *  id searches like at the door; the POOL still excludes it from
 *  defaults), each row's cells become the Quant rows it OWNS, keyed
 *  by the quant COORDINATE (never the namespaced row id — D2's stamp
 *  plane: the address is the row's, the value is the cell's). Orphan
 *  Quant rows (no owner match) drop — the judge could never reach
 *  them either. The original members ride the spread verbatim.
 *
 *  @param rows the served spec's variants array (or any flat matrix).
 *  @returns the nested matrix: every non-Quant row with its folded
 *  cells attached. */
export function variantMatrixFromFlatRows<R extends FlatVariantRowInput> (
  rows: readonly R[],
): Array<R & { cells: ResolverCellRow[] }> {
  return rows
    .filter((r) => r.group !== 'Quant')
    .map((r) => ({
      ...r,
      cells: rows
        .filter((c) => c.group === 'Quant' && c.owner === r.id)
        .map((c) => ({
          // every member rides (params, weights, the row's own
          // vocabulary) — the fold re-nests, it never projects a copy
          ...c,
          id: typeof c.id === 'string' ? c.id : '',
          quant: typeof c.quant === 'string' ? c.quant : '',
          route: typeof c.route === 'string' ? c.route : '',
          ...(c.hide_from_dropdown === true ? { hide_from_dropdown: true as const } : {}),
        })),
    }))
}
