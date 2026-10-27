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
export declare const RELATION_WORDS: {
    readonly requires: true;
    readonly conflicts: true;
    readonly together: true;
    readonly either_or: true;
    readonly at_most_one: true;
    readonly required: true;
};
export type RelationWord = keyof typeof RELATION_WORDS;
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
export declare function laneBlank(v: unknown): boolean;
/** Judge the four words over one stated state. PURE: no I/O, no
 *  card code — the same call the bench door refuses with and the
 *  form renders inline. Every row fires only on the STATED side of
 *  the law (blank fields never violate requires/together; either_or
 *  stays unarmed until a member is stated — authoring-in-progress
 *  is never a write refusal). */
export declare function judgeLaneRelations(relations: readonly LaneRelations[], values: Record<string, unknown>): LaneViolation[];
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
export declare function isUnstatedRequiredVoice(text: string): boolean;
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
export declare function dropAuthoringIncomplete<T extends {
    message: string;
}>(violations: readonly T[]): T[];
/** The together-half class test: the sentence names a together group
 *  whose members are not all stated yet.
 * @param text the refusal sentence to classify
 * @returns true when the sentence is the together-half voice */
export declare function isTogetherHalfVoice(text: string): boolean;
/** The either_or-half class test: the sentence names an alternative
 *  none of whose groups the stated fields complete yet.
 * @param text the refusal sentence to classify
 * @returns true when the sentence is the either_or-half voice */
export declare function isEitherOrHalfVoice(text: string): boolean;
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
export declare function isPurelyUnstatedRequiredVoice(text: string): boolean;
/** Judge the LANE SURFACE (the parameter-surface half of the same
 *  declaration): a STATED card-schema field outside the lane's
 *  declared surface fires nothing at compose — refuse it here, in
 *  the field's voice, a priori. `schemaFields` are the card's own
 *  field names (the walk the claim law already owns); fields the
 *  surface declares but the card does not carry are the claim
 *  law's refusal, never this one. A null surface (the family
 *  declares none) judges nothing — legacy families keep the card's
 *  union table until they declare. */
export declare function judgeLaneSurface(surface: readonly string[] | null | undefined, schemaFields: readonly string[], values: Record<string, unknown>): LaneViolation[];
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
export declare function laneStaleCarry(prevSurface: readonly string[] | null | undefined, nextSurface: readonly string[] | null | undefined, values: Record<string, unknown>): string[];
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
export declare function laneTogetherClosure(rows: readonly (LaneRelations | undefined)[], stale: Set<string>, values: Record<string, unknown>): Set<string>;
/** The effective surface for one (family × variant) lane: the
 *  family base plus the variant's additions (the cascade law —
 *  later layers add, never subtract). Null family params = the
 *  family declares no surface (the legacy card-authored truth). */
export declare function laneSurfaceOf(familyParams: readonly string[] | null | undefined, variantParams: readonly string[] | null | undefined, cellParams?: readonly string[] | null | undefined): readonly string[] | null;
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
export declare function laneBoundsOf(familyBounds: LaneBounds | null | undefined, variantBounds: LaneBounds | null | undefined): LaneBounds | null;
/** Judge the bounds over one stated state. PURE. Blank fields never
 *  violate (the blank law: unstated is the family default's
 *  business, not a refusal); non-numbers are the card schema's own
 *  refusal, never re-voiced here; a stated number outside its row
 *  refuses IN THE FIELD'S VOICE, cure included. */
export declare function judgeLaneBounds(bounds: LaneBounds | null, values: Record<string, unknown>): LaneViolation[];
/** A variant's ROUTE ENVELOPE, the DECL's own spelling (the
 *  contract audit's row 3): closed steps/cfg domains, [min, max].
 *  Both members ride together — the DECL schema refuses a partial
 *  envelope, and every seat that reads one judges the same shape.
 *  The one home; the kit/facts read seats wrap it in Partial for
 *  their unknown-source rows. */
export interface SamplerEnvelope {
    steps: number[];
    cfg: number[];
}
/** The envelope as the JUDGE reads it: every member optional (a
 *  seat may know one bound — the kit/facts rows wrap it in
 *  Partial for the same reason), every bound a read-only span.
 *  DERIVED from the interface by map, never re-spelled: the door
 *  feeds it the rail's normalized `readonly [number, number]`
 *  tuples and the mirror feeds it the served mutable arrays —
 *  both are the same facts to the judge. */
export type SamplerEnvelopeInput = Readonly<{
    [K in keyof SamplerEnvelope]?: readonly number[];
}>;
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
export declare function unknownVariantVoice(stated: string, model: string, known: readonly string[], familyLanes?: readonly string[]): string;
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
export declare function unknownQuantVoice(stated: string, model: string, variant: string, known: readonly string[]): string;
/** A stated knob the envelope gate refused.
 *
 *  - `voice` is the refusal BODY, frame-free: the frame rides the
 *    caller (the phase-consistent `card_compose phase N:` at the
 *    door, the phase-less `card_compose:` on the client mirror). */
export interface SamplerEnvelopeOffence {
    knob: 'steps' | 'cfg';
    stated: number;
    lo: number;
    hi: number;
    voice: string;
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
export declare function judgeSamplerEnvelope(stated: Readonly<Record<string, unknown>>, envelope: SamplerEnvelopeInput | null, variant: Readonly<{
    id: string;
    route?: string;
}>): SamplerEnvelopeOffence | null;
/** The envelope refusal's CURE — the sentence that tells the
 *  operator what to do about it. Both seats append it verbatim
 *  after the judge's voice (the door interleaves its marriage
 *  clause between); the cure is one spelling because it is the
 *  half the operator reads.
 *
 * @returns the cure sentence, unpunctuated at both ends. */
export declare function samplerEnvelopeCure(): string;
export interface LaneContractVariantRow {
    params?: readonly string[];
    relations?: LaneRelations;
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }>;
    sampler_envelope?: SamplerEnvelope;
    /** THE CELL SURFACES (operator 2026-10-26, the size-at-quant
     *  reshape): per-quant additions over the variant's own surface —
     *  a size cell may take a member its sibling size does not
     *  (style_instruction on the 1.7B customvoice cell only). Keyed
     *  by cell quant; present only where a cell declares params. */
    cells?: Record<string, {
        params?: readonly string[];
    }>;
}
export interface LaneContractRow {
    /** The declared surface — ABSENT when the family declares no
     *  params at all (2026-10-11, the envelope wall: a family may
     *  judge relations/bounds/envelopes while owning no surface —
     *  krea-2's shape. Absent base = the form falls back to the
     *  card's own visibility; `base: []` stays the explicit
     *  black-form statement). */
    base?: readonly string[];
    relations?: LaneRelations;
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }>;
    variants: Record<string, LaneContractVariantRow>;
}
export interface LaneContractDecl {
    params?: readonly string[];
    relations?: LaneRelations;
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }>;
    variants?: ReadonlyArray<{
        id: string;
        params?: readonly string[];
        relations?: LaneRelations;
        bounds?: Record<string, {
            min?: number;
            max?: number;
        }>;
        sampler_envelope?: SamplerEnvelope;
        cells?: ReadonlyArray<{
            quant: string;
            params?: readonly string[];
        }>;
    }>;
}
/** One family's declared lane surface + laws, verbatim. Absent
 *  members stay absent (the absent-equals-empty law: nothing is
 *  invented, and a family that declares nothing yields an empty
 *  base with no relations key). */
export declare function laneContractOf(decl: LaneContractDecl): LaneContractRow;
/** THE CONTRACT MAP for a card's declared families: family id → its
 *  lane contract. Families that declare no params and no laws are
 *  omitted (legacy families judge nothing; serving an empty row
 *  would only cost the agent tokens). */
export declare function laneContractsFor(familyIds: Iterable<string>, declOf: (family: string) => LaneContractDecl | undefined): Record<string, LaneContractRow>;
/** The marriage aggregation's inputs, structurally — the served
 *  modifier kind's members the math reads (formSpec's ModifierKind
 *  carries these verbatim; nothing narrower is invented).
 *  @see marriedKnobValues */
export interface MarriageKindInput {
    /** The bag field the kind counts (the loras array's param key). */
    param_key: string;
    /** THE MARRIAGE DECLARATION: knob → aggregation ('max' — the only
     *  spelling compose layers). */
    marries?: Record<string, 'max'>;
    /** The pack's catalog rows: a bag row names one by `id`; its
     *  declared knob defaults are the row's contribution. */
    options?: ReadonlyArray<{
        value: unknown;
        defaults?: Record<string, unknown>;
    }>;
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
export declare function marriedKnobValues(kind: MarriageKindInput, bag: readonly unknown[]): Record<string, number>;
/** The minimal variant row the resolver reads — the DECL's variant,
 *  the facts row's variant, and the flat-matrix fold all carry this.
 *  Members ride `unknown` because the seats' shapes type them
 *  differently (string | null | absent); the resolver normalizes. */
export interface ResolverVariantRow {
    id: string;
    route?: unknown;
    group?: unknown;
    hide_from_dropdown?: unknown;
    cells?: readonly ResolverCellRow[];
}
/** The minimal cell row: the DECL cell, the facts cell, or a folded
 *  flat Quant row (quant coordinate + route + visibility). */
export interface ResolverCellRow {
    quant?: unknown;
    route?: unknown;
    hide_from_dropdown?: unknown;
}
/** Which face the caller resolves for.
 *  - `'declared'`: the engine's coordinate law (id-only match, no
 *    visibility filtering, first-declared default).
 *  - `'offered'`: the wire's law (id-or-route, hidden rows not
 *    offered, Recipe excluded from the default pool, the address
 *    claims its lane). */
export type ResolverScope = 'declared' | 'offered';
/** One variant-axis miss: the stated value, its kind, and the ids of
 *  the matrix the caller handed (the honest known list — the caller's
 *  own projection, never a DECL fact the caller cannot see). */
export type VariantRowResolution<V extends ResolverVariantRow> = {
    readonly status: 'resolved';
    readonly variant: V;
} | {
    readonly status: 'hidden';
    readonly variant: V;
} | {
    readonly status: 'missing';
    readonly stated: string;
    readonly known: readonly string[];
} | {
    readonly status: 'pool-empty';
    readonly known: readonly string[];
};
/** One quant-axis miss over the resolved variant's cells. */
export type CellRowResolution<C extends ResolverCellRow> = {
    readonly status: 'resolved';
    readonly cell: C | null;
    readonly quant: string;
} | {
    readonly status: 'missing';
    readonly stated: string;
    readonly known: readonly string[];
};
/** THE DEFAULT POOL (the wire face): offered rows minus the Recipe
 *  group; an all-Recipe family falls back to every offered row (the
 *  recipe-only family still resolves — the door's own
 *  configured.length gate). Exported for the seat that must refuse
 *  an all-hidden family BEFORE its stated search (the door's early
 *  check, order-pinned by its suite) — the pool itself has one
 *  spelling here. */
export declare function offeredPool<V extends ResolverVariantRow>(variants: readonly V[]): V[];
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
export declare function resolveVariantRow<V extends ResolverVariantRow>(variants: readonly V[], stated: unknown, address: string, scope: ResolverScope): VariantRowResolution<V>;
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
export declare function resolveCellRow<C extends ResolverCellRow>(variant: ResolverVariantRow | undefined, stated: unknown, address: string, scope: ResolverScope): CellRowResolution<C>;
/** The coordinates one cell artifact resolves to: the variant id plus
 *  the cell's quant — the ref spelling a coordinate-scoped re-resolve
 *  rides (the provisioning key-coordinate law folds exactly these). */
export interface CellArtifactCoordinates {
    readonly variant: string;
    readonly quant: string;
}
/** THE CELL-ARTIFACT COORDINATES (the kroma fetch cure, 2026-11-12):
 *  a missing-weight filename IS the DECL's own identity of the file —
 *  the anchor-at-the-door law names the cell artifact's source_url
 *  basename "the lane file's name". A family plan resolves ONE
 *  coordinate (the stated one, else the family default), so the
 *  acquire door's filename filter matched no plan item for any
 *  NON-default lane's weights and refused them item-not-found — the
 *  refusal's anchor spoke the URL while the door's hands were empty.
 *  This read derives the (variant, quant) whose own cell artifact
 *  carries the filename, so the caller re-plans at the file's own
 *  coordinate. First declared match wins (the matrix walk's law);
 *  the query/fragment strip is the C5 basename law.
 *
 *  @param variants the DECL's variant matrix (any ResolverVariantRow
 *  rows whose cells may carry an `artifact` with a `source_url`).
 *  @param filename the requested weight file's basename, verbatim.
 *  @returns the artifact's coordinates, or null when no declared
 *  cell artifact carries the filename (the caller keeps its
 *  item-not-found refusal — never a guessed coordinate). */
export declare function cellArtifactCoordinates(variants: readonly ResolverVariantRow[], filename: string): CellArtifactCoordinates | null;
/** A served flat-variant row as the fold reads it — the FormSpecDoc
 *  `variants` members (Variant rows + the serializer's expanded Quant
 *  cell rows with `owner` backrefs). Structural: the fold keeps the
 *  original row's every member, so the folded variant still serves as
 *  the wire row (the dragbar's envelope read, the pick verbs). */
export interface FlatVariantRowInput {
    id: unknown;
    group?: unknown;
    route?: unknown;
    quant?: unknown;
    owner?: unknown;
    hide_from_dropdown?: unknown;
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
export declare function variantMatrixFromFlatRows<R extends FlatVariantRowInput>(rows: readonly R[]): Array<R & {
    cells: ResolverCellRow[];
}>;
//# sourceMappingURL=laneRelations.d.ts.map
