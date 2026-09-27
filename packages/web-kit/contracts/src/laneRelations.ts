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

/** The four relation words — the DECL's relation declaration (the
 *  wire shape; the ModelDecl grammar in comfyui-cordis authors
 *  exactly this). Absent ≡ none (the absent-equals-empty law). */
export interface LaneRelations {
  readonly requires?: readonly LaneRequiresRow[];
  readonly conflicts?: readonly LaneConflictsRow[];
  readonly together?: readonly LaneTogetherRow[];
  readonly either_or?: readonly LaneEitherOrRow[];
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
        field: members.find(stated) ?? members[0],
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
      if (groups.length === 0) continue
      const everyMember = groups.flat()
      if (!everyMember.some(stated)) continue // blank = in progress, never a write refusal
      const complete = groups.filter((g) => g.every(stated))
      if (complete.length > 0) continue
      out.push({
        field: everyMember.find(stated) ?? everyMember[0],
        message:
          'this lane takes one of ' +
          groups.map((g) => '(' + quote(g) + ')').join(' or ') +
          ' — the stated combination completes none of them' +
          (row.cure !== undefined && row.cure !== ''
            ? ' — ' + row.cure
            : ' — state one complete source, or drop the stated half'),
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
