import { deriveFamilyLane } from '@melite/contracts/familyLane';
export const SEAM_OVERLAP_FRAMES = 22;
export const GRID_BASE_FRAMES = 22;
export const GRID_STEP_FRAMES = 17;
export const GRID_MAX_FRAMES = 362;
export const GRID_REMAINDER = 5;
export const IMAGE_BUS_SLOTS = 9;
export const REF_CAPS = {
    images: 8,
    videos: 3,
    audios: 3,
    // refmods (audit 010/R1, 2026-10-18): the RefMod pack's loader
    // owns MAX_SLOTS = 8 — one slot per mod; strength/copies ride
    // the loader row the compose fills.
    refmods: 8,
};
/** THE MEDIA-SHAPE PREDICATE (the guide seats' admission law, one
 *  owner for every door that judges it): a guide value names MEDIA —
 *  a $spell, a data: URI, a path/URL (slash), or an extension — never
 *  a bare word. A bare word is a stage/card label (the UI picker's
 *  run-899a8448 crime); it would compose a Load* the engine cannot
 *  resolve. The schema's per-call guide gate and the keyframe pin
 *  gate (actions.ts) share THIS predicate — one law, every guide
 *  spelling. */
export function isMediaRef(v) {
    return v.startsWith('$') || v.startsWith('data:') || v.includes('/') || /\.[A-Za-z0-9]+$/.test(v);
}
export function transitionOverlap(transition) {
    return transition === 'cut' ? 0 : SEAM_OVERLAP_FRAMES;
}
/** (2026-11-06, journey audit AUDIO-2 — the three-clock split; ONE
 *  HOME since audit 013 cure 5, 2026-11-12) THE DOC CLOCK'S DEFAULT,
 *  one owner: THIS const. The schema row fps derives it (schema.ts
 *  defaults the walk's fill from here), so the served default and
 *  every frames↔seconds seat agree by construction, never by
 *  matching literals. Before this const the estate spoke three clocks
 *  for one unstated-fps doc — the studio's readers fell to
 *  DEFAULT_SEGMENT_PARAMS.fps (16, the timeline vocabulary's own
 *  default), the schema walk filled 24, and the film mix's
 *  seconds math hardcoded /24 — so the UI booked a 64-frame clip
 *  at 4.0s while the compose stamped it at 2.67s (audio drift,
 *  the audit's worst burn). Every frames↔seconds seat falls to
 *  THIS value: the mix's stanzaSecs/owner map (filmMix.ts), the
 *  stamps' ms() (actions.ts), and the studio's readers
 *  (stemToClip, docCalls' clock, useViewSelection). The derived
 *  wall pins it to the walk's fill — h3schema({}).fps and the
 *  carrier row's declared default — so no second literal can
 *  drift beside it. */
export const DOC_FPS_DEFAULT = 24;
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
export const T4_ONLY_KEYS = [
    'sharpen_switch', 'sharpen_method', 'sharpen_strength', 'sharpen_radius',
    'sharpen_threshold', 'sharpen_iterations', 'interp_switch',
    'interp_multiplier', 'interp_model', 'sr_switch', 'sr_model', 'sr_resolution',
    'second_pass_enabled', 'sharpen_enabled', 'interpolate_enabled',
    'attention_backend',
];
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
export const FILM_ONLY_KEYS = ['duck_depth_db'];
/** THE FAMILY-LAW DATA (the ERROR g/h cure, 2026-11-08): the
 *  family-conditional key law in the SERVED spelling — the shape
 *  FormSpecDoc.familyLaw carries so the GENERIC seats (the
 *  composeValidate gate, the studio rail's omit) can judge the
 *  family WITHOUT importing this module. THE ONE-SEAT MIGRATION
 *  (2026-11-12): this const IS the derivation — deriveWindowFamily
 *  delegates to the shared evaluator over this data
 *  (@melite/contracts familyLane.ts), so a data copy CANNOT drift
 *  from the walk (the doc-level guide aliases image/image_name/
 *  ref_image are DECLARED here, closing the probe-cell gap where
 *  the walk read seats the data did not name). The lanes spell
 *  deriveWindowFamily's own derivation as data (minCalls →
 *  t4_chain, guideKeys → t4r, the trailing lane is the
 *  fallthrough); deadKeys names the keys whose PRESENCE each lane
 *  refuses. `guideKeys` reads the doc level (the keyframe pin
 *  channel, the last_frame string, the ref surface, the doc-level
 *  guide aliases — presence, never count: a non-empty-after-trim
 *  string or a non-empty array), `callGuideKeys` reads inside each
 *  calls row (the per-call guide fields the derivation's hasGuide
 *  arm names). The evaluator's presence grammar mirrors
 *  normalizeDeclaredRefs's counting law closely enough that the
 *  probe arm pins the agreement on the blank/empty edges (a
 *  whitespace ref_images is ZERO refs on both spellings). */
export const FAMILY_LAW = {
    lanes: [
        { lane: 't4_chain', minCalls: 2 },
        {
            lane: 't4r',
            guideKeys: ['keyframes', 'last_frame', 'ref_images', 'ref_videos', 'ref_audios', 'image', 'image_name', 'ref_image'],
            callGuideKeys: ['image', 'ref_images', 'ref_image', 'image_name'],
        },
        { lane: 't4_open' },
    ],
    deadKeys: { t4r: T4_ONLY_KEYS },
};
/** THE FAMILY-RESEAT MATH — DEAD SPINE, one spelling (the one-seat
 *  migration, 2026-11-12): the settlement math lives in
 *  @melite/contracts familyLane.ts (reseatDeadKeys), driven by the
 *  FAMILY_LAW data above. Every caller — the registry's reseat
 *  seat, the studio's pick settlement — rides that spelling. This
 *  module keeps only the family's own face: deriveWindowFamily
 *  (the typed derivation over the same data). */
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
export function deriveWindowFamily(raw) {
    // THE ONE-SEAT DERIVATION (2026-11-12): the family derives through
    // the SHARED evaluator over the FAMILY_LAW data above — the same
    // spelling the client compose mirror and the registry's reseat
    // seat ride. The doc-level guide seats the walk reads (actions.ts
    // guideImage = image ?? image_name; the render's guide0 = image,
    // image_name, ref_image) are DECLARED in the law's guideKeys, so
    // the private spelling below is dead — a seat missed in the data
    // is now a seat every judge misses together, never a split family
    // (the run-899a8448 disease).
    return deriveFamilyLane(FAMILY_LAW, raw);
}
export function spanOverlap(span) {
    return transitionOverlap(span.transition);
}
export function spanStanzaFrames(span, carry = 0) {
    const k = Math.round((span.end - span.start + carry - GRID_BASE_FRAMES) / GRID_STEP_FRAMES);
    return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k));
}
export function carriedSpanGrid(span, carry = SEAM_OVERLAP_FRAMES) {
    const generatedStart = span.start - carry;
    const requestedLength = span.end - span.start + carry;
    const length = spanStanzaFrames(span, carry);
    const rawIndex = (requestedLength - GRID_BASE_FRAMES) / GRID_STEP_FRAMES;
    const maxIndex = (GRID_MAX_FRAMES - GRID_BASE_FRAMES) / GRID_STEP_FRAMES;
    const lowerIndex = Math.max(0, Math.min(maxIndex, Math.floor(rawIndex)));
    const upperIndex = Math.max(0, Math.min(maxIndex, Math.ceil(rawIndex)));
    const endAt = (index) => generatedStart + GRID_BASE_FRAMES + GRID_STEP_FRAMES * index;
    return {
        generatedStart,
        generatedEnd: generatedStart + length,
        length,
        lowerEnd: endAt(lowerIndex),
        upperEnd: endAt(upperIndex),
    };
}
export function assertCarriedSpanGrid(span, where, carry = SEAM_OVERLAP_FRAMES) {
    const grid = carriedSpanGrid(span, carry);
    const requestedLength = span.end - span.start + carry;
    if (grid.length !== requestedLength) {
        const legal = grid.lowerEnd === grid.upperEnd
            ? `${grid.lowerEnd}`
            : `${grid.lowerEnd} and ${grid.upperEnd}`;
        throw new Error(`${where}: authored range ${span.start}→${span.end} cannot land on the 22+17k carried grid; ` +
            `generated snapped range ${grid.generatedStart}→${grid.generatedEnd}; ` +
            `legal neighboring end frames ${legal} ` +
            `(a carried window's span is 17f — its 22f seam is the generation head; ` +
            `a first or cut window is 22+17f)`);
    }
    return grid.length;
}
export function gridSnap(length) {
    const k = Math.round((length - GRID_BASE_FRAMES) / GRID_STEP_FRAMES);
    return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k));
}
/** THE GRID PREDICATE, one owner: a length the engine can render is
 *  22+17k inside [22,362]. Every refusal door asks this question, so
 *  knob pins, single windows, cut windows, and carried windows cannot
 *  drift into different laws. */
export function isGridLength(length) {
    return Number.isInteger(length) &&
        length >= GRID_BASE_FRAMES &&
        length <= GRID_MAX_FRAMES &&
        (length - GRID_BASE_FRAMES) % GRID_STEP_FRAMES === 0;
}
export function assertGridLength(length, where) {
    if (typeof length !== 'number' || !isGridLength(length)) {
        const nearest = typeof length === 'number' && Number.isFinite(length)
            ? gridSnap(Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, Math.round(length))))
            : 124;
        throw new Error(`${where}: length ${String(length)}f is off-grid — the engine renders ` +
            `22+17k frames in [22,362] (nearest legal: ${nearest}f); ` +
            `the doc-proven geometry is 0→124→243→362`);
    }
    return length;
}
/** The chain policy's masked_av context — the overlap every composed
 *  seam after the first carries (the swap's clip law, shared with the
 *  extend's window composition). */
export const CONTEXT_OVERLAP_FRAMES = 39;
/** The plan's scene cap (chain_nodes: a 32-scene cap refuses
 *  mis-authored loops) — the composition solver's window ceiling. */
export const MAX_COMPOSED_WINDOWS = 32;
/** The largest 22+17k grid length ≤ x (floored at 22, capped 362). */
const gridFloorFrames = (x) => Math.min(GRID_MAX_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * Math.floor((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES));
/** The smallest 22+17k grid length ≥ x (capped at 362); null when x
 *  exceeds the grid — that window count cannot carry the total. */
const gridCeilFrames = (x) => {
    const k = Math.ceil((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES);
    const length = Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k);
    return length > GRID_MAX_FRAMES ? null : length;
};
/** THE COMPOSITION SOLVER (pure; the door's whole law beyond one
 *  window): across every legal window count, the grid lengths on
 *  both sides of the exact requirement — the smallest that delivers
 *  ≥ stated (ceil) and the largest that delivers ≤ stated (floor) —
 *  looking for an EXACT delivery; else a loud refusal naming the
 *  neighboring compositions (max under, min over).
 *
 *  It lives HERE, on the client-safe contract face, because TWO
 *  consumers ask the same question: the extend renderer (what to
 *  compose) and the studio's commission rail (what to DRAW — the
 *  multiwindow unification audit's §9: the operator could not see
 *  the N windows an agent had strung together).
 * @param totalFrames the stated extension, frames at the film clock
 * @param where the refusal's voice ('h3-timeline extend')
 * @param overlap the per-seam context overlap (the policy's 39)
 * @returns the exact composition */
export function solveWindowComposition(totalFrames, where, overlap = CONTEXT_OVERLAP_FRAMES) {
    let bestUnder = null;
    let bestOver = null;
    for (let windows = 1; windows <= MAX_COMPOSED_WINDOWS; windows++) {
        const exact = (totalFrames + (windows - 1) * overlap) / windows;
        for (const windowFrames of [gridFloorFrames(exact), gridCeilFrames(exact)]) {
            if (windowFrames === null)
                continue;
            const delivered = windows * windowFrames - (windows - 1) * overlap;
            if (delivered === totalFrames)
                return { windows, windowFrames, deliveredFrames: delivered };
            const composition = { windows, windowFrames, deliveredFrames: delivered };
            if (delivered < totalFrames) {
                if (bestUnder === null || delivered > bestUnder.deliveredFrames)
                    bestUnder = composition;
            }
            else if (bestOver === null || delivered < bestOver.deliveredFrames) {
                bestOver = composition;
            }
        }
    }
    const neighbor = (c) => c === null ? '' :
        ` nearest: ${c.windows} windows of ${c.windowFrames}f deliver ${c.deliveredFrames}f (${(c.deliveredFrames / 24).toFixed(3)}s);`;
    throw new Error(`${where}: stated ${totalFrames}f composes nowhere exactly — ` +
        `N uniform 22+17k windows under the ${overlap}f context overlap compose exactly nowhere;` +
        `${neighbor(bestUnder)}${neighbor(bestOver)}` +
        ` re-state extend_seconds as a composition's delivered seconds ` +
        `(D frames round-trips D/24 exactly; a single window keeps the 22+17k grid door)`);
}
/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
 *  carried window generates span+carry frames, so its authored span
 *  must be 17k; a first or cut window generates its span verbatim, so
 *  it must be 22+17k. Both are the same engine grid — a carried span
 *  used to be the only shape that refused, while single/cut spans
 *  were silently snapped (the old two-law gap, closed 2026-09-25).
 *  `spanStanzaFrames` stays the render/film clock and is a no-op
 *  identity for admitted spans. */
export function assertSpanGrid(span, where, carry = 0) {
    if (carry > 0)
        return assertCarriedSpanGrid(span, where, carry);
    const length = span.end - span.start;
    if (!isGridLength(length)) {
        throw new Error(`${where}: authored range ${span.start}→${span.end} has length ${length}f, which cannot land on the 22+17k grid ` +
            `(nearest legal: ${gridSnap(length)}f); the doc-proven geometry is 0→124→243→362 ` +
            `(a first or cut window is 22+17f; a carried window's span is 17f — its 22f seam is the generation head)`);
    }
    return length;
}
export function deliveredFrames(call, index) {
    const span = call.end_frame - call.start_frame;
    if (index === 0 || call.transition === 'cut')
        return span;
    return Math.max(0, span - SEAM_OVERLAP_FRAMES);
}
export function imageReferenceCap(hasLastFrame) {
    return hasLastFrame ? REF_CAPS.images - 1 : REF_CAPS.images;
}
export function splitRefList(value) {
    if (!value)
        return [];
    const out = [];
    let i = 0;
    while (i < value.length) {
        while (i < value.length && (value[i] === ',' || value[i] === ' ' || value[i] === '\t'))
            i++;
        if (i >= value.length)
            break;
        const start = i;
        const isData = value.startsWith('data:', i);
        let mimeComma = false;
        while (i < value.length) {
            if (value[i] === ',') {
                if (isData && !mimeComma) {
                    mimeComma = true;
                    i++;
                    continue;
                }
                break;
            }
            i++;
        }
        let end = i;
        while (end > start && (value[end - 1] === ' ' || value[end - 1] === '\t'))
            end--;
        out.push(value.slice(start, end));
    }
    return out;
}
export function normalizeDeclaredRefs(value) {
    if (Array.isArray(value)) {
        return value.filter((entry) => typeof entry === 'string' && entry.trim() !== '');
    }
    if (typeof value === 'string')
        return splitRefList(value);
    return [];
}
export function joinRefList(value) {
    if (Array.isArray(value)) {
        const entries = value.map(String).map((entry) => entry.trim()).filter(Boolean);
        return entries.length > 0 ? entries.join(', ') : undefined;
    }
    if (typeof value === 'string' && value.trim())
        return value.trim();
    return undefined;
}
export function refGenreOf(name, url) {
    const lowerName = name.toLowerCase();
    if (/^video_w\d+_/.test(lowerName)) {
        if (lowerName.endsWith('_last_frame') || lowerName.includes('_prev'))
            return 'image';
        return 'video';
    }
    const source = `${lowerName} ${url ? url.toLowerCase().split('?')[0] : ''}`;
    const extension = source.split('.').pop().split(/[^a-z0-9]/)[0];
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(extension))
        return 'image';
    if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(extension))
        return 'video';
    if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus'].includes(extension))
        return 'audio';
    return 'other';
}
export const KNOB_ORDER = [
    'steps', 'denoise', 'sampler_name', 'sched_name',
    'shift_video', 'shift_audio',
    'sla_sparsity', 'sla_block_size',
    'sla_min_seq_len', 'sla_dense_last_steps',
    'sla_protect_audio', 'sla_stabilize_motion',
    'sla_reference_protection', 'sla_dense_backend',
    'sla_dense_steps', 'sla_disable_fp16_accum',
    'sharpen_enabled', 'sharpen_method', 'sharpen_strength',
    'sharpen_radius', 'sharpen_threshold', 'sharpen_iterations',
    'interpolate_enabled', 'interp_model', 'interp_multiplier',
    'length',
];
export const CALL_KNOB_KEYS = new Set(KNOB_ORDER);
/** The master-gated nine (calls-stanza audit #3, 2026-10-16): these
 *  knobs' ONLY read seats live inside the post chain, whose only
 *  door is the DOC-level second_pass_enabled master — a switch the
 *  call plane cannot state. With the master off (the default) a
 *  per-call pin here composes to nothing, silently; the UI fold
 *  gates its rows on this set so a dead knob is never offered. */
export const SECOND_PASS_KNOBS = new Set([
    'sharpen_enabled', 'sharpen_method', 'sharpen_strength',
    'sharpen_radius', 'sharpen_threshold', 'sharpen_iterations',
    'interpolate_enabled', 'interp_model', 'interp_multiplier',
]);
/** The per-call vocabulary the schema's call walk admits. `clip` and
 *  `audio` LEFT THIS SET (2026-10-16, audit 3f0b7c1a ui-truth-gap
 *  #3): no compose arm reads either — a per-call clip or audio guide
 *  was UI truth over an engine-deaf wire (the studio hydrated them
 *  and painted a speaker dot, the walk admitted them, no node ever
 *  consumed one). A doc stating them now refuses LOUD here
 *  ('unknown per-call key(s)') instead of round-tripping a phantom;
 *  the studio drops legacy rows at hydration with a named warn. */
export const CALL_KEYS = new Set([
    'text', 'start_frame', 'end_frame', 'image',
    'transition', 'knobs', 'refs',
    'ref_image', 'image_name', 'ref_images', 'ref_videos', 'ref_audios',
    'beats', 'last_frame', 'first_frame_prev_sec', 'seam_carry',
]);
export const LEGACY_KNOB_KEY = {
    sampling_steps: 'steps',
    sampler: 'sampler_name',
    scheduler: 'sched_name',
    h3_sla_sparsity: 'sla_sparsity',
    h3_sla_block_size: 'sla_block_size',
    h3_sla_min_seq_len: 'sla_min_seq_len',
    h3_sla_dense_last_steps: 'sla_dense_last_steps',
    h3_sla_protect_audio: 'sla_protect_audio',
    h3_sla_stabilize_motion: 'sla_stabilize_motion',
    h3_sla_reference_protection: 'sla_reference_protection',
    h3_sla_dense_backend: 'sla_dense_backend',
    h3_sla_dense_steps: 'sla_dense_steps',
    h3_sla_disable_fp16_accum: 'sla_disable_fp16_accum',
    interpolate_model: 'interp_model',
    interpolate_multiplier: 'interp_multiplier',
};
export function migrateCallKnobKey(key) {
    return LEGACY_KNOB_KEY[key] ?? key;
}
//# sourceMappingURL=timelineContract.js.map