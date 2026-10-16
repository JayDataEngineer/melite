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
    const calls = Array.isArray(raw.calls) ? raw.calls : [];
    const hasGuide = calls.some((c) => {
        const cc = (c ?? {});
        return Boolean(cc.image) || Boolean(cc.ref_images) || Boolean(cc.ref_image) || Boolean(cc.image_name);
    })
        // the keyframe pin channel + the declared input surface imply the
        // reference lane by the same law as a per-call guide
        || (Array.isArray(raw.keyframes) && raw.keyframes.length > 0)
        || refSurfaceCount(raw) > 0
        || (typeof raw.last_frame === 'string' && raw.last_frame.trim() !== '');
    return calls.length > 1 ? 't4_chain' : hasGuide ? 't4r' : 't4_open';
}
function refSurfaceCount(raw) {
    // wire-literal strings count too (normalizeDeclaredRefs owns the
    // spelling — a "a, b" ref_images is two refs, never zero)
    return ['ref_images', 'ref_videos', 'ref_audios']
        .reduce((n, k) => n + normalizeDeclaredRefs(raw[k]).length, 0);
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
export const CALL_KEYS = new Set([
    'text', 'start_frame', 'end_frame', 'image', 'clip', 'audio',
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