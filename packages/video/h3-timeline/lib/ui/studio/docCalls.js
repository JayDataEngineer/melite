import { CALL_KNOB_KEYS, GUIDE_KINDS, KIND_OF_TRACK, STARTER_CALLS } from "./docModel.js";
import { joinRefList, migrateCallKnobKey, splitRefList } from '@melite/models-h3/timelineContract';
/** An array-SHAPED string that will not parse (or parses to a
 * non-array) is a CORRUPT calls/beats document — the 2026-08-30 crime
 * class ("the persist effect wrote 1 call back, and the multi-call
 * plan was destroyed permanently"). The parseable case self-heals
 * (parse → the mount persist rewrites it as a real array); the
 * corrupt case must never fall to the starter SILENTLY. The studio
 * shows the starter as VIEW state, the corruption is named loudly
 * here, and useDocState's sentinel treats the field as PRESENT so no
 * mount-persist ever writes the starter back over the corrupt
 * source. Non-array-shaped strings ("not-json") are foreign values
 * the vocabulary has always tolerated — not this crime. */
export function corruptCallsField(raw) {
    for (const field of ["calls", "beats"]) {
        const v = raw[field];
        if (typeof v !== "string" || !v.trimStart().startsWith("["))
            continue;
        try {
            if (Array.isArray(JSON.parse(v)))
                continue;
        }
        catch {
            /* unparseable — corrupt */
        }
        return field;
    }
    return null;
}
export function hydrateCalls(raw) {
    // Layer B: `calls` is the vocabulary (2026-08-16, the B/C conflation
    // fix). Legacy docs wrote `beats` where every beat was a call in
    // disguise — map 1:1 (text, no inner segments; the family does the
    // same). Both present = a backend hard error (never a silent choice);
    // the studio renders `calls` — the compile refuses the ambiguous doc.
    //
    // STRING CALLS (2026-08-30 "it only shows the first gen"): legacy
    // docs stored `calls` as a JSON string (`"[{...}]"`). Array.isArray
    // on a string is false — the function fell through to STARTER_CALLS
    // (1 default call), the persist effect wrote 1 call back, and the
    // multi-call plan was destroyed permanently. Parse string-encoded
    // arrays before checking Array.isArray; reject everything else.
    const corrupt = corruptCallsField(raw);
    if (corrupt !== null) {
        // THE SILENT REPLACEMENT (the fallback audit's CRITICAL-1,
        // 2026-09-28): an unparseable array-shaped string used to fall
        // through to STARTER_CALLS with the persist effect armed — the
        // corrupt source was overwritten by a 1-call default and the
        // plan was destroyed with no trace. The starter is VIEW state
        // only now; the crime is named, and useDocState holds the source.
        console.error(`VideoTimelineStudio: params.${corrupt} is array-shaped but unparseable — the document is corrupt. ` +
            `The starter is shown as view state ONLY; nothing persists over the corrupt source until you edit.`);
    }
    let callsRaw = raw.calls;
    if (typeof callsRaw === "string" && callsRaw.trimStart().startsWith("[")) {
        try {
            const parsed = JSON.parse(callsRaw);
            if (Array.isArray(parsed))
                callsRaw = parsed;
        }
        catch { /* unparseable — fall through to beats / STARTER */ }
    }
    let beatsRaw = raw.beats;
    if (typeof beatsRaw === "string" && beatsRaw.trimStart().startsWith("[")) {
        try {
            const parsed = JSON.parse(beatsRaw);
            if (Array.isArray(parsed))
                beatsRaw = parsed;
        }
        catch { /* unparseable — fall through */ }
    }
    const list = Array.isArray(callsRaw) && callsRaw.length > 0
        ? callsRaw
        : Array.isArray(beatsRaw) && beatsRaw.length > 0
            ? beatsRaw
            : null;
    if (!list)
        return STARTER_CALLS;
    const calls = [];
    for (const c of list) {
        if (typeof c !== "object" || c === null)
            continue;
        const r = c;
        const start = Number(r.start_frame);
        const end = Number(r.end_frame);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            continue;
        const call = { text: "", start_frame: Math.round(start), end_frame: Math.round(end) };
        // The prompt: ONE textarea. (2026-09-15, the operator's cut: no
        // prompt segments, no prompt beats.) Old docs carrying per-call
        // `beats` hydrate by JOINING their texts into the prompt — no
        // word ever lost, one console warn; the wire still admits beats
        // (the compiler's vocabulary), the studio never authors them.
        const rawSegs = r.beats;
        if (Array.isArray(rawSegs) && rawSegs.length > 0) {
            const joined = [];
            for (const sg of rawSegs) {
                if (typeof sg === "object" && sg !== null) {
                    const t = sg.text;
                    if (typeof t === "string" && t.trim())
                        joined.push(t.trim());
                }
            }
            if (joined.length) {
                console.warn(`VideoTimelineStudio: call ${calls.length} carried prompt segments — their texts joined into the one prompt (segments were cut 2026-09-15; no words lost)`);
                call.text = joined.join(" ");
            }
        }
        // (call.text is always a string here: initialized "" above, only
        // ever reassigned the joined string — the `!` records the
        // definite-assignment proof; a `?? ""` default would be dead.)
        if (!call.text.trim() && typeof r.text === "string")
            call.text = r.text;
        // Call-attached guides: string sources only, blank trimmed away.
        for (const kind of GUIDE_KINDS) {
            const src = r[kind];
            if (typeof src === "string" && src.trim())
                call[kind] = src;
        }
        // Frame-conditioning: the prev-video opener survives (positive
        // number; foreign types drop — forgiving hydration, never a
        // re-send of an invalid doc). last_frame was CUT 2026-09-15 (the
        // PlagueKind gen lane owns no last-frame input — the control
        // wrote wire nothing reads): a legacy doc carrying it drops with
        // a LOUD warn, never a silent loss.
        if (typeof r.last_frame === "string" && r.last_frame.trim()) {
            console.warn(`VideoTimelineStudio: call ${calls.length} carried last_frame (${r.last_frame}) — dropped; the closing-still control was cut 2026-09-15 (the reference lane owns no last-frame input)`);
        }
        if (r.transition === "extend" || r.transition === "cut") {
            call.transition = r.transition;
        }
        const refs = {};
        const rr = r.refs !== null && typeof r.refs === "object" && !Array.isArray(r.refs)
            ? r.refs
            : {};
        const im = joinRefList(rr.images ?? r.ref_images);
        const vi = joinRefList(rr.videos ?? r.ref_videos);
        const au = joinRefList(rr.audios ?? r.ref_audios);
        if (im)
            refs.images = im;
        if (vi)
            refs.videos = vi;
        if (au)
            refs.audios = au;
        if (Object.keys(refs).length)
            call.refs = refs;
        // Per-call knobs: vocabulary-gated hydration — a foreign key is
        // dropped with a warning, NEVER re-sent (the card's compose
        // reads only its declared knobs; the UI must not author others).
        // Legacy retired spellings migrate through LEGACY_KNOB_KEY first
        // (2026-09-17: the wire names are the only vocabulary now).
        if (r.knobs !== null && typeof r.knobs === "object") {
            const knobs = {};
            for (const [rawK, v] of Object.entries(r.knobs)) {
                const k = migrateCallKnobKey(rawK);
                if (!CALL_KNOB_KEYS.has(k)) {
                    console.warn(`VideoTimelineStudio: dropping unknown call knob "${rawK}" (the card's knob vocabulary)`);
                    continue;
                }
                if (v === null || v === undefined || v === "")
                    continue;
                const target = knobs;
                if (k === "length" || k === "steps" || k === "denoise"
                    || k === "shift_video" || k === "shift_audio"
                    || k === "sla_sparsity" || k === "sla_min_seq_len"
                    || k === "sla_dense_last_steps" || k === "sharpen_strength"
                    || k === "sharpen_radius" || k === "sharpen_threshold"
                    || k === "sharpen_iterations" || k === "interp_multiplier") {
                    const n = Number(v);
                    if (Number.isFinite(n))
                        target[k] = n;
                }
                else if (k === "sampler_name" || k === "sched_name") {
                    if (typeof v === "string" && v.trim())
                        target[k] = v;
                }
                else if (k === "sla_block_size") {
                    if (v === "32" || v === "64" || v === "128")
                        target.sla_block_size = v;
                }
                else if (k === "sla_reference_protection") {
                    if (v === "Off" || v === "Light" || v === "Heavy Enforcement")
                        target.sla_reference_protection = v;
                }
                else if (k === "sla_dense_backend") {
                    if (v === "comfy_kitchen" || v === "pytorch" || v === "auto")
                        target.sla_dense_backend = v;
                }
                else if (k === "sla_dense_steps") {
                    if (typeof v === "string" && /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/.test(v.trim())) {
                        target.sla_dense_steps = v.trim();
                    }
                }
                else if (k === "sharpen_method") {
                    if (v === "rcas" || v === "adaptive_usm" || v === "high_pass" || v === "deconvolution") {
                        target.sharpen_method = v;
                    }
                }
                else if (k === "interp_model") {
                    if (v === "film_net_fp16.safetensors" || v === "rife47.pth")
                        target.interp_model = v;
                }
                else {
                    // the boolean-valued keys + stringified forms
                    const b = typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : undefined;
                    if (b !== undefined)
                        target[k] = b;
                }
            }
            if (Object.keys(knobs).length)
                call.knobs = knobs;
        }
        calls.push(call);
    }
    if (calls.length === 0)
        return STARTER_CALLS;
    // Sorted (plan_windows' vocabulary is sorted calls); NOT re-tiled — a
    // hand-authored gap stays visible and the compiler's refusal stays the
    // honest gate. The tenant's own writes always maintain contiguity.
    return calls.sort((a, b) => a.start_frame - b.start_frame);
}
export function hydrateKeyframes(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const k of raw) {
        if (typeof k !== "object" || k === null)
            continue;
        const r = k;
        const frame = Number(r.frame);
        const kind = KIND_OF_TRACK[String(r.kind)];
        if (!Number.isFinite(frame) || !kind)
            continue;
        out.push({ frame: Math.round(frame), kind, source: typeof r.source === "string" ? r.source : "" });
    }
    return out;
}
export const hasKnobs = (c) => !!c.knobs && Object.keys(c.knobs).length > 0;
/** Document → bar prompts. end_frame inclusive; uuid is the call's index
 * (index-derived ids are stable for the life of a gesture — no gesture
 * spans a structural change, and every render re-derives consistently).
 * `override` = the call carries per-call knobs → the cyan dot (Layer C
 * shows where a call departs from the run's globals). */
export function callsToPrompts(calls, fps) {
    return calls.map((c, i) => ({
        uuid: `call-${i}`,
        // Compact clip header: index + duration scan before the prompt text
        // (the strip truncates long prompts — the prefix survives the cut).
        text: `C${i + 1} · ${((c.end_frame - c.start_frame) / Math.max(1, fps)).toFixed(1)}s — ` +
            (c.text ?? ""),
        start_frame: c.start_frame,
        end_frame: c.end_frame - 1,
        color: null,
        override: hasKnobs(c),
        // (Layer B) this call carries a reference-audio guide — the violet
        // speaker dot; absent = no reference audio for this window.
        audio: !!(c.audio ?? "").trim(),
        // (Layer B) total reference-image count: the guide image + the
        // per-call refs.images extras. 0 = no badge on the clip.
        refImages: (() => {
            const extras = splitRefList(c.refs?.images).length;
            const guide = (c.image ?? "").trim() ? 1 : 0;
            return extras + guide;
        })(),
        // (F9) seam mode — rendered as a glyph at the clip's right edge so
        // the cut-vs-extend distinction is visible at a glance on the bar.
        // ABSENT = EXTEND (the stitching default — operator catch d
        // 2026-09-22: "the model chose hard cuts instead of our system
        // of stitching"; the card's spanOverlap law treats absent as
        // extend, the UI glyph must never disagree — only an explicit
        // "cut" reads as a cut).
        seam: c.transition === "cut" ? "cut" : "extend",
    }));
}
/** Document keyframes → bar diamonds. Same index-derived uuid contract.
 * Legacy/frame-exact keyframes only — beat-attached guides are NOT lane
 * diamonds (2026-08-15): the beat is one entity and its guides live in
 * the beat panel; the lanes render only when the document actually
 * carries hand keyframes. */
export function keyframesToLanes(kfs) {
    return kfs.map((k, i) => ({
        uuid: `kf-${i}`,
        track_id: k.kind,
        frame: k.frame < 0 ? 0 : k.frame, // negative (from-the-end) frames are
        // JSON-authoring vocabulary; the lane clamps them to 0 — the raw
        // value survives in the strip's frame field for exact editing.
        value: null,
    }));
}
/** Calls → the persisted document shape (the `calls` vocabulary, Layer
 * B): guide keys ride ONLY when non-blank (blank = none — the planner's
 * contract, kept here so the saved doc never carries "" noise); knobs
 * ride only when non-empty, and every knob value is written VERBATIM
 * (undefined was never stored — the setter deletes the key, so absent
 * IS inherit, never null). The prompt is ONE `text` — segments were
 * cut 2026-09-15 (hydration joins old beats' texts; the serializer
 * never writes beats). */
export function serializeCalls(calls) {
    return calls.map((c) => {
        const out = {
            text: c.text ?? "",
            start_frame: c.start_frame,
            end_frame: c.end_frame,
        };
        for (const kind of GUIDE_KINDS) {
            const src = c[kind];
            if (src && src.trim())
                out[kind] = src;
        }
        // first_frame_prev_sec is never written — cut 2026-09-20 (the
        // seam is automatic; last_frame — cut 2026-09-15).
        if (c.transition === "extend" || c.transition === "cut")
            out.transition = c.transition;
        // Per-call refs: the wire form is the COMMA STRING (the card's
        // wireList law — trimmed entries, empties absent). All three
        // buckets ride: images, videos, audios (video_audios died with
        // the run-level refs panel — the bundle never mounted it).
        // Data:-aware split (an inline upload carries its own comma).
        if (c.refs) {
            const images = joinRefList(splitRefList(c.refs.images));
            const videos = joinRefList(splitRefList(c.refs.videos));
            const audios = joinRefList(splitRefList(c.refs.audios));
            if (images || videos || audios) {
                out.refs = {
                    ...(images ? { images } : {}),
                    ...(videos ? { videos } : {}),
                    ...(audios ? { audios } : {}),
                };
            }
        }
        if (hasKnobs(c))
            out.knobs = { ...c.knobs };
        return out;
    });
}
export const callIndexOf = (id) => {
    const i = Number(id.replace(/^call-/, ""));
    return Number.isInteger(i) ? i : -1;
};
export const kfIndexOf = (id) => {
    const i = Number(id.replace(/^kf-/, ""));
    return Number.isInteger(i) ? i : -1;
};
//# sourceMappingURL=docCalls.js.map
