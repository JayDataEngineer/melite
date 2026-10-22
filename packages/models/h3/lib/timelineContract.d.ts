export declare const SEAM_OVERLAP_FRAMES = 22;
export declare const GRID_BASE_FRAMES = 22;
export declare const GRID_STEP_FRAMES = 17;
export declare const GRID_MAX_FRAMES = 362;
export declare const GRID_REMAINDER = 5;
export declare const IMAGE_BUS_SLOTS = 9;
export declare const REF_CAPS: {
    readonly images: 8;
    readonly videos: 3;
    readonly audios: 3;
    readonly refmods: 8;
};
export interface TimelineSpan {
    readonly start: number;
    readonly end: number;
    readonly transition?: string;
}
export interface TimelineCallSpan {
    readonly start_frame: number;
    readonly end_frame: number;
    readonly transition?: string;
}
/** THE MEDIA-SHAPE PREDICATE (the guide seats' admission law, one
 *  owner for every door that judges it): a guide value names MEDIA —
 *  a $spell, a data: URI, a path/URL (slash), or an extension — never
 *  a bare word. A bare word is a stage/card label (the UI picker's
 *  run-899a8448 crime); it would compose a Load* the engine cannot
 *  resolve. The schema's per-call guide gate and the keyframe pin
 *  gate (actions.ts) share THIS predicate — one law, every guide
 *  spelling. */
export declare function isMediaRef(v: string): boolean;
export declare function transitionOverlap(transition?: string): number;
/** (2026-11-06, journey audit AUDIO-2 — the three-clock split) THE
 *  DOC CLOCK'S DEFAULT, one owner: the schema row fps's own
 *  .default(24). Before this const the estate spoke three clocks
 *  for one unstated-fps doc — the studio's readers fell to
 *  DEFAULT_SEGMENT_PARAMS.fps (16, the timeline vocabulary's own
 *  default), the schema walk filled 24, and the film mix's
 *  seconds math hardcoded /24 — so the UI booked a 64-frame clip
 *  at 4.0s while the compose stamped it at 2.67s (audio drift,
 *  the audit's worst burn). Every frames↔seconds seat falls to
 *  THIS value: the mix's stanzaSecs/owner map (filmMix.ts), the
 *  stamps' ms() (actions.ts), and the studio's readers
 *  (stemToClip, docCalls' clock, useViewSelection). The derived
 *  wall pins it to the walk's fill — h3schema({}).fps — so the
 *  const can never drift from the declared row. */
export declare const DOC_FPS_DEFAULT: 24;
/** (2026-11-06, the family-reseat cure) the post-pass knobs the t4r
 *  lane cannot honor — its renderer wires NO post chain (the graph
 *  goes straight to CreateVideo), so the schema walk REFUSES these
 *  keys on a derived-t4r doc rather than silently dropping them (the
 *  no-silent-resolution law). Shared with the studio so its rail and
 *  its heal judge the SAME set the walk refuses.
 *
 *  THE DEAD-LETTER MASTERS (2026-10-16, audit 3f0b7c1a layera-globals
 *  #3): the twelve leaves above are gated, but the three MASTERS that
 *  own them — second_pass_enabled, sharpen_enabled, interpolate_enabled
 *  — and attention_backend were not, and each is read ONLY inside the
 *  non-t4r branch of the compose (actions.ts: second_pass_enabled at
 *  the post gate, the two leaves in the post chain, attention_backend
 *  at the chunked ModelAttentionBackend). On a t4r doc they rendered,
 *  persisted, composed LEGAL, and landed in NO node: a switch the user
 *  sees ON while the run ignores it — the exact silent-drop the twelve
 *  leaves are gated against, one level up. Joined here so the field
 *  gate, the row gate and the reseat heal judge them together. */
export declare const T4_ONLY_KEYS: readonly ["sharpen_switch", "sharpen_method", "sharpen_strength", "sharpen_radius", "sharpen_threshold", "sharpen_iterations", "interp_switch", "interp_multiplier", "interp_model", "sr_switch", "sr_model", "sr_resolution", "second_pass_enabled", "sharpen_enabled", "interpolate_enabled", "attention_backend"];
/** The knobs only the FILM shape can honor (2026-10-16, audit
 *  3f0b7c1a ui-truth-gap #4; the walk leg closed B6,
 *  timeline-calls-burn §CURES-OWED 5). `duck_depth_db` is read in
 *  exactly one place — computeFilmMix's manifest, inside the
 *  multi-window film boundary (actions.ts) — so on a single-window doc
 *  (t4_open, t4r) the row rendered, persisted and composed into NO
 *  node: the operator set a duck depth the mix desk never saw. TWO
 *  judges read THIS set (one home): the schema walk refuses it loud
 *  on a non-film family (`film-only inject keys`, the t4r gate's
 *  sibling), and the studio's served surface omits it unless the doc
 *  derives t4_chain (the same one-spelling family derivation the t4r
 *  gate uses). */
export declare const FILM_ONLY_KEYS: readonly ["duck_depth_db"];
/** THE FAMILY-LAW DATA (the ERROR g/h cure, 2026-11-08): the
 *  family-conditional key law in the SERVED spelling — the shape
 *  FormSpecDoc.familyLaw carries so the GENERIC seats (the
 *  composeValidate gate, the studio rail's omit) can judge the
 *  family WITHOUT importing this module. The lanes spell
 *  deriveWindowFamily's own derivation as data (minCalls →
 *  t4_chain, guideKeys → t4r, the trailing lane is the
 *  fallthrough); deadKeys names the keys whose PRESENCE each lane
 *  refuses. ONE OWNER: this const IS the law — the served spec
 *  carries it verbatim and the contract wall pins the data to the
 *  module's behavior (the probe-cell arm), so a data copy cannot
 *  drift from the walk. Guide keys mirror the derivation's own
 *  seats: `guideKeys` reads the doc level (the keyframe pin
 *  channel, the last_frame string, the ref surface — presence,
 *  never count: a non-empty-after-trim string or a non-empty array),
 *  `callGuideKeys` reads inside each calls row (the per-call guide
 *  fields the derivation's hasGuide arm names). The evaluator's
 *  presence grammar mirrors normalizeDeclaredRefs's counting law
 *  closely enough that the probe arm pins the agreement on the
 *  blank/empty edges (a whitespace ref_images is ZERO refs on both
 *  spellings). */
export declare const FAMILY_LAW: {
    readonly lanes: readonly [{
        readonly lane: "t4_chain";
        readonly minCalls: 2;
    }, {
        readonly lane: "t4r";
        readonly guideKeys: readonly ["keyframes", "last_frame", "ref_images", "ref_videos", "ref_audios"];
        readonly callGuideKeys: readonly ["image", "ref_images", "ref_image", "image_name"];
    }, {
        readonly lane: "t4_open";
    }];
    readonly deadKeys: {
        readonly t4r: readonly ["sharpen_switch", "sharpen_method", "sharpen_strength", "sharpen_radius", "sharpen_threshold", "sharpen_iterations", "interp_switch", "interp_multiplier", "interp_model", "sr_switch", "sr_model", "sr_resolution", "second_pass_enabled", "sharpen_enabled", "interpolate_enabled", "attention_backend"];
    };
};
/** THE FAMILY-RESEAT SPINE (the ERROR g/h cure, 2026-11-08): the ONE
 *  reseat spelling for the settlement seam — the seat that lands an
 *  arrival whose family FLIPPED under carried stamps (the emit's
 *  legal t4_open era settling under a keyframe pin; the bench
 *  merge-patch landing a non-studio flip). Drops every PRESENT
 *  family-dead key and names them — the settlement lands the row
 *  the next run composes (the lane-migration law's own spelling:
 *  stale carry drops before the store, never a stored doc refusing
 *  later). The caller owns the voice (the drafts patch row, the
 *  studio's unstating op); this spine owns the MATH. A doc whose
 *  family honors the keys rides unchanged (dropped: []). */
/**
 * THE CARRY LINE (2026-11-11, the one-seat law's family-seam proof):
 * a T4-only key drops only when the PRIOR row stated it — the doc's
 * own carried past, stranded by the family flip this reseat settles.
 * A key the merged doc holds only because THIS write states it is
 * authored, stands untouched, and the write door's family judge
 * refuses it in the run door's own voice. Never a launderer.
 * @param doc the merged params view the write door would judge
 * @param prior the stored row's params BEFORE the merge
 */
export declare function reseatFamilyDead(doc: Record<string, unknown>, prior: Record<string, unknown>): {
    doc: Record<string, unknown>;
    dropped: string[];
};
/** (2026-11-06, the family-reseat cure) the doc-level window family
 *  derivation, ONE spelling for every door that needs the family
 *  BEFORE the walk refuses: the walk derives the composed doc's
 *  family; the studio rail gates the second-pass group on the t4r
 *  lane; the reseat heal unstated post keys a family edit stranded
 *  (the live brick: a film legally stamped sr_switch lost its
 *  second call, derived t4r, and EVERY compose refused). Reads
 *  exactly the seats the walk reads — the guide-key union, the pin
 *  channel, the declared input surface (a private spelling elsewhere
 *  is the run-899a8448 disease: one seat missed, the family lies).
 *  @param raw the doc-shaped record (calls/keyframes/ref surface)
 *  @returns the derived window family */
export declare function deriveWindowFamily(raw: Record<string, unknown>): 't4r' | 't4_open' | 't4_chain';
export declare function spanOverlap(span: TimelineSpan): number;
export declare function spanStanzaFrames(span: TimelineSpan, carry?: number): number;
export interface CarriedSpanGrid {
    readonly generatedStart: number;
    readonly generatedEnd: number;
    readonly length: number;
    readonly lowerEnd: number;
    readonly upperEnd: number;
}
export declare function carriedSpanGrid(span: TimelineSpan, carry?: number): CarriedSpanGrid;
export declare function assertCarriedSpanGrid(span: TimelineSpan, where: string, carry?: number): number;
export declare function gridSnap(length: number): number;
/** THE GRID PREDICATE, one owner: a length the engine can render is
 *  22+17k inside [22,362]. Every refusal door asks this question, so
 *  knob pins, single windows, cut windows, and carried windows cannot
 *  drift into different laws. */
export declare function isGridLength(length: number): boolean;
export declare function assertGridLength(length: unknown, where: string): number;
/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
 *  carried window generates span+carry frames, so its authored span
 *  must be 17k; a first or cut window generates its span verbatim, so
 *  it must be 22+17k. Both are the same engine grid — a carried span
 *  used to be the only shape that refused, while single/cut spans
 *  were silently snapped (the old two-law gap, closed 2026-09-25).
 *  `spanStanzaFrames` stays the render/film clock and is a no-op
 *  identity for admitted spans. */
export declare function assertSpanGrid(span: TimelineSpan, where: string, carry?: number): number;
export declare function deliveredFrames(call: TimelineCallSpan, index: number): number;
export declare function imageReferenceCap(hasLastFrame: boolean): number;
export declare function splitRefList(value: string | undefined): string[];
export declare function normalizeDeclaredRefs(value: unknown): string[];
export declare function joinRefList(value: unknown): string | undefined;
export declare function refGenreOf(name: string, url?: string): 'image' | 'video' | 'audio' | 'other';
export declare const KNOB_ORDER: readonly ["steps", "denoise", "sampler_name", "sched_name", "shift_video", "shift_audio", "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps", "sla_protect_audio", "sla_stabilize_motion", "sla_reference_protection", "sla_dense_backend", "sla_dense_steps", "sla_disable_fp16_accum", "sharpen_enabled", "sharpen_method", "sharpen_strength", "sharpen_radius", "sharpen_threshold", "sharpen_iterations", "interpolate_enabled", "interp_model", "interp_multiplier", "length"];
export type KnobKey = (typeof KNOB_ORDER)[number];
export declare const CALL_KNOB_KEYS: ReadonlySet<string>;
/** The master-gated nine (calls-stanza audit #3, 2026-10-16): these
 *  knobs' ONLY read seats live inside the post chain, whose only
 *  door is the DOC-level second_pass_enabled master — a switch the
 *  call plane cannot state. With the master off (the default) a
 *  per-call pin here composes to nothing, silently; the UI fold
 *  gates its rows on this set so a dead knob is never offered. */
export declare const SECOND_PASS_KNOBS: ReadonlySet<string>;
/** The per-call vocabulary the schema's call walk admits. `clip` and
 *  `audio` LEFT THIS SET (2026-10-16, audit 3f0b7c1a ui-truth-gap
 *  #3): no compose arm reads either — a per-call clip or audio guide
 *  was UI truth over an engine-deaf wire (the studio hydrated them
 *  and painted a speaker dot, the walk admitted them, no node ever
 *  consumed one). A doc stating them now refuses LOUD here
 *  ('unknown per-call key(s)') instead of round-tripping a phantom;
 *  the studio drops legacy rows at hydration with a named warn. */
export declare const CALL_KEYS: ReadonlySet<string>;
export declare const LEGACY_KNOB_KEY: {
    readonly sampling_steps: "steps";
    readonly sampler: "sampler_name";
    readonly scheduler: "sched_name";
    readonly h3_sla_sparsity: "sla_sparsity";
    readonly h3_sla_block_size: "sla_block_size";
    readonly h3_sla_min_seq_len: "sla_min_seq_len";
    readonly h3_sla_dense_last_steps: "sla_dense_last_steps";
    readonly h3_sla_protect_audio: "sla_protect_audio";
    readonly h3_sla_stabilize_motion: "sla_stabilize_motion";
    readonly h3_sla_reference_protection: "sla_reference_protection";
    readonly h3_sla_dense_backend: "sla_dense_backend";
    readonly h3_sla_dense_steps: "sla_dense_steps";
    readonly h3_sla_disable_fp16_accum: "sla_disable_fp16_accum";
    readonly interpolate_model: "interp_model";
    readonly interpolate_multiplier: "interp_multiplier";
};
export declare function migrateCallKnobKey(key: string): string;
//# sourceMappingURL=timelineContract.d.ts.map
