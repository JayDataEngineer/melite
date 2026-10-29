// filmMix.ts — the film's audio mix, ONE math owner (roadmap §20).
//
// History: the original in-graph film tail died of its own backlog —
// every window's tensors stayed resident until the final CreateVideo
// (the OOM signature that killed attempt 002's film 3×, a 43h
// engine). The mix moved disk-side (estate filmMux, ffmpeg) for one
// day; that died too (2026-09-22, the operator's provenance law —
// every artifact traces to a composition of cards, never a harness
// side-effect). The tail returned IN-GRAPH in FILE form: windows
// save their own clips, an unload boundary orders + flushes, and the
// file tail decodes the saves back in — no tensor ever spans the
// boundary. This module stays the ONE placement-math owner both
// halves drive (the card's conditioning stamps and the film-time
// overlay read the same manifest), and now owns the CLOCK too
// (stanzaSecs — the compose-time windowSecs law).
//
// The two wrongs in the card's history (the +22f carry original,
// the start/24 first correction) stay dead in one place.
import { DOC_FPS_DEFAULT, spanOverlap, spanStanzaFrames } from './timelineContract.js';
export { spanOverlap, spanStanzaFrames } from './timelineContract.js';
/** Parse raw audio_clips rows — the card's one law for what a clip
 *  IS: a src without a numeric start_frame refuses loud (never a
 *  silent misplacement); a row without src is junk and skips; the
 *  class auto law (text → dialogue, textless → music) rides here. */
export function parseFilmMixClips(rows) {
    const clips = [];
    // THE ROW-LEVEL NUMERIC RESTORE (attempt-035's wire family, the
    // card-owed arm): audio_clips is undeclared on paramSchema (the
    // agent plane owns it), so the dict-driven fill has no license —
    // a stringified start_frame rode in and refused. The parse owns
    // the int law, the parse restores the strict int-string (same
    // grammar as the kit's numeric fill; scoped to these two rows).
    const INT_STRING = /^[+-]?\d+$/;
    const wireInt = (x) => (typeof x === 'string' && INT_STRING.test(x.trim()) ? Number(x.trim()) : x);
    for (const c of rows) {
        if (c === null || typeof c !== 'object')
            continue;
        const row = c;
        row['start_frame'] = wireInt(row['start_frame']);
        row['dur_frames'] = wireInt(row['dur_frames']);
        const src = typeof row.src === 'string' ? row.src.trim() : '';
        if (src === '') {
            const positioned = row.start_frame !== undefined ||
                row.dur_frames !== undefined ||
                (typeof row.text === 'string' && row.text.trim() !== '') ||
                (typeof row.class === 'string' && row.class.trim() !== '') ||
                (typeof row.id === 'string' && row.id.trim() !== '') ||
                (typeof row.name === 'string' && row.name.trim() !== '');
            if (positioned) {
                throw new Error('audio_clips: a positioned clip row has no src — the film mix cannot place a source-less row');
            }
            continue;
        }
        if (typeof row.start_frame !== 'number' || !Number.isFinite(row.start_frame)) {
            throw new Error(`audio_clips: a clip with src but no numeric start_frame — the audio lanes own placement (re-add the clip)`);
        }
        const dur = typeof row.dur_frames === 'number' && Number.isFinite(row.dur_frames) && row.dur_frames > 0
            ? row.dur_frames
            : 0;
        const text = typeof row.text === 'string' ? row.text.trim() : '';
        const clsRaw = typeof row.class === 'string' ? row.class.trim().toLowerCase() : '';
        if (clsRaw !== '' && clsRaw !== 'dialogue' && clsRaw !== 'sfx' && clsRaw !== 'music') {
            throw new Error(`audio_clips: unknown class "${clsRaw}" — dialogue | sfx | music (omit for auto: text → dialogue, else music)`);
        }
        const cls = (clsRaw !== '' ? clsRaw : text !== '' ? 'dialogue' : 'music');
        clips.push({ src, start: row.start_frame, dur, text, cls });
    }
    return clips;
}
const round3 = (v) => Math.round(v * 1000) / 1000;
/** The duck span string — "start:end" at ms precision, ';'-joined. */
export function formatDuckSpan(start, end) {
    return `${round3(start)}:${round3(end)}`;
}
/** Per-window stanza seconds — THE compose-time windowSecs
 *  (computeFilmMix's ground truth): the render grid's own promise,
 *  the deliverer's contract — SaveVideo hands back exactly stanza
 *  frames at the DOC CLOCK (fps, unstated = DOC_FPS_DEFAULT; the
 *  three-clock cure, journey audit AUDIO-2: this divisor hardcoded
 *  /24 while the container played p.fps — a 16fps film's manifest
 *  overbooked every window by 1.5x). No probe, no disk: the clock
 *  is pure at compose. RAW fractions (frames/fps, unrounded): the
 *  manifest sums these into film starts, and rounding a SUM of
 *  rounded parts compounds drift (the 3-window seat 7.416 ≠ 7.417
 *  proof) — only the final seats/spans round (ms,
 *  computeFilmMix's own law).
 *
 *  @param spans the film windows, doc frames
 *  @param fps the DOC CLOCK (unstated docs pass DOC_FPS_DEFAULT —
 *  never a foreign default; the walk fills the same value) */
export function stanzaSecs(spans, fps = DOC_FPS_DEFAULT) {
    // INDEX-AWARE CARRY (the render's chainLike law, stated here so
    // the clock and the stanza can never disagree): window 1 renders
    // fresh; k≥2 carries spanOverlap — the same 22 the finalize
    // trims off the saved clip. The stanza covers carry + span, the
    // contribution to the film is stanza − carry, so the clock's
    // window seats land where the saved frames actually are.
    return spans.map((s, i) => spanStanzaFrames(s, i > 0 ? spanOverlap(s) : 0) / fps);
}
export function computeFilmMix(input) {
    const { spans, clips, windowSecs } = input;
    // ONE CLOCK (journey audit AUDIO-2): the owner map's frames→seconds
    // joins ride the doc clock the windowSecs were booked at — the
    // overlap trims and the stanza durations must speak the same fps or
    // the film seats drift window by window.
    const fps = input.fps ?? DOC_FPS_DEFAULT;
    if (windowSecs.length !== spans.length) {
        throw new Error(`film mix: ${windowSecs.length} window duration(s) for ${spans.length} span(s) — the owner map needs one duration per window (never a guess)`);
    }
    const overlaps = spans.map(spanOverlap);
    // THE OWNER MAP (the fixed point — see module header): the film
    // seat of doc frame f owned by window w is
    // w.filmStartSec + (f − w.docStart)/fps, NO carry term (the trim
    // already lives inside filmStartSec — each extend join trims the
    // overlap off the film). Owning window: the LAST whose docStart ≤ f.
    const filmStarts = [];
    let elapsed = 0;
    for (let i = 0; i < spans.length; i++) {
        filmStarts.push(elapsed);
        elapsed += windowSecs[i] - (i > 0 ? overlaps[i] : 0) / fps;
    }
    const filmSec = round3(elapsed);
    // CONDITIONED clips (the stamp law's overlay half): every window
    // whose generation span a clip rides HEARD that clip — one lane
    // per CLASS, the FIRST clip in row order winning its class's lane
    // when several of one class overlap one window. A clip with no
    // dur (or a sub-0.1s overlap) cannot size a slice and stays
    // overlay-only. The generation render starts at doc frame
    // sf − carry (the carry head included).
    const conditioned = new Set();
    spans.forEach((span, i) => {
        if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.end <= span.start)
            return;
        const carry = i > 0 ? overlaps[i] : 0;
        const genStart = span.start - carry;
        const won = {};
        for (let ci = 0; ci < clips.length; ci++) {
            const clip = clips[ci];
            if (clip.dur <= 0)
                continue;
            if (won[clip.cls] !== undefined)
                continue;
            const lo = Math.max(clip.start, genStart);
            const hi = Math.min(clip.start + clip.dur, span.end);
            if (hi - lo < 2.4)
                continue;
            won[clip.cls] = true;
            conditioned.add(ci);
        }
    });
    // PLACEMENTS: doc frame → film seat through the owner map — the
    // SAME doc clock the windows spoke (AUDIO-2's placements half: the
    // /24 literal here outlived the window cure and drifted every clip
    // seat against its own fps-cut window).
    const placements = clips.map((clip, ci) => {
        let owner = 0;
        for (let w = 0; w < spans.length; w++) {
            if (clip.start >= spans[w].start)
                owner = w;
        }
        const filmSeat = Math.max(0, filmStarts[owner] + (clip.start - spans[owner].start) / fps);
        return {
            clip: ci,
            cls: clip.cls,
            filmSec: round3(filmSeat),
            durSec: clip.dur > 0 ? round3(clip.dur / fps) : 0,
        };
    });
    // THE DUCK MATRIX (D-M-E): the film's generated audio yields
    // during every conditioned span; the MUSIC bus ducks under the
    // dialogue and sfx spans; dialogue and sfx ride at unity.
    const spanOf = (ci) => {
        const pl = placements[ci];
        if (!conditioned.has(ci) || pl.durSec <= 0)
            return null;
        return { start: pl.filmSec, end: round3(pl.filmSec + pl.durSec) };
    };
    const duckSpans = [];
    const musicDuckSpans = [];
    for (let ci = 0; ci < clips.length; ci++) {
        const s = spanOf(ci);
        if (s === null)
            continue;
        duckSpans.push(s);
        if (clips[ci].cls !== 'music')
            musicDuckSpans.push(s);
    }
    const duckDb = typeof input.duckDb === 'number' && Number.isFinite(input.duckDb) ? input.duckDb : -14;
    return {
        placements,
        duckSpans,
        musicDuckSpans,
        duckSpanString: duckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(';'),
        musicDuckSpanString: musicDuckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(';'),
        duckDb,
        filmSec,
    };
}
//# sourceMappingURL=filmMix.js.map