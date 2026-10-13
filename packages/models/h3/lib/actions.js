import { fireControlNets } from '@melite/comfyui-card-kit/guard';
import { saveAudio } from '@melite/comfyui-card-kit';
import { FAMILIES, paramSchema, wireList, H3_RECOMMENDED_SAMPLERS } from "./schema.js";
import { H3_LORA_ROWS } from '@melite/models-h3/mods/loras';
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@melite/comfyui-card-kit/vocab';
import { computeFilmMix, parseFilmMixClips, stanzaSecs } from "./filmMix.js";
import { GRID_REMAINDER, GRID_STEP_FRAMES, IMAGE_BUS_SLOTS, REF_CAPS, assertGridLength, assertSpanGrid, imageReferenceCap, spanStanzaFrames, transitionOverlap, } from "./timelineContract.js";
// THE ABSENT-BAG DEFAULT (h3-a, 2026-10-12; re-pointed 2026-10-11 to
// the ByteDance DMAD row — operator: "the one from bytedance" is the
// default): the DMAD 4-step row, built from the family lora
// CATALOG (mods/loras.ts — the one owner of every lora filename and
// default strength; the value was restated as a literal here, which
// is how a catalog edit would have silently missed the default).
// The wire shape matches a resolved bag row: on, lora (filename),
// str (default_strength), plus the four fixed mode flags. A missing
// catalog row refuses at load — the default would have no source.
const loraStackDefault = () => {
    const row = H3_LORA_ROWS.find((r) => r.id === 'h3_dmad_4step');
    if (row === undefined) {
        throw new Error("h3 action: the lora catalog has no 'h3_dmad_4step' row — the absent-bag default has no source; fix the catalog row id");
    }
    return JSON.stringify([{ on: true, lora: row.filename, str: row.default_strength, v: 1, a: 1, t: 1 }]);
};
// His 17k+5 grid, in-graph (ComfyMathExpression): snap latent steps to 2 mod 5
// (the card's own principles row: "Length snaps to the 17k+5 frame grid
// at 24fps" — the principles).
const MATH_STEPS_GOLD = `max(${GRID_REMAINDER}, round(a * 24)) + (${GRID_REMAINDER} - (max(${GRID_REMAINDER}, round(a * 24)) % ${GRID_STEP_FRAMES})) % ${GRID_STEP_FRAMES}`;
// THE ORPHANED I2V MARKER NODE (roadmap 2026-09-26 — BRIEF14
// finding #4): MiniMaxH3ImageToVideo exists in the serialized graph
// ONLY as the t4r family marker (finalizeH3 keys on it to skip the
// t4 autofill strip). It is FULLY ORPHANED — no switch consumes it,
// so no switch can ever select it. The old dead branch carried a
// 700-char sprinting-city gold prompt through every request sidecar:
// an off-topic injection-shaped blob and a live hazard the day a
// switch flipped. Orphan + stub prompt = the marker law kept, the
// hazard structurally dead.
const I2V_MARKER_PROMPT = 'i2v marker branch — orphaned, never executed (r2v is the only lane)';
// ImageSharpenKJ's grouped-widget defaults (the rcas block the python
// builds when no sharpen leaf is injected; the card exposes only the
// strength leaf — sharpen_strength).
const SHARPEN_DEFAULTS = { method: 'rcas', strength: 0.3, radius: 1.0, threshold: 0.05, iterations: 10 };
/** The family's lane files that are NOT engine-general members
 * (the complexity floor's stroke 1): the encoder and the two VAEs
 * are invariants of THIS package's lane — no variant varies them,
 * so they live beside the parser that reads them, never in a row
 * a family could drift. The unet alone rides the DECL row: quants
 * and hybrids vary it per route. sr_vae is the seedvr2_ema DECL's
 * own row (its lane_inputs.vae) duplicated HERE as the invariant
 * the super-resolution branch loads — the sr_model DiT rides the
 * param enum instead (joined to the engine combo), and this const
 * is the one home the VAE filename owns in this package (the
 * video drift audit, 2026-10-13: a bare literal at the node seat
 * was a second copy nobody owned). */
const LANE_FILES = {
    clip: 'qwen3vl_32b_minimax_h3_int8_convrot.safetensors',
    vae_video: 'minimax_h3_video_vae_int8_convrot.safetensors',
    vae_audio: 'minimax_h3_audio_vae_fp32.safetensors',
    sr_vae: 'ema_vae_fp16.safetensors',
};
/** The film mux's bit depth — ONE home for the CreateVideo literal
 * the four join seats wire (the video drift audit, 2026-10-13: a
 * bare 8 at each seat was four copies of one truth). The engine's
 * combo admits ["auto", 8, 10]; the estate always renders an exact
 * 8-bit mp4 (the h264 pipeline's own depth), never "auto" — a
 * deliberate pin, changed only here. */
const FILM_BIT_DEPTH = 8;
export function parseH3Facts(raw) {
    const lane = (raw ?? {});
    const unet = lane.unet;
    // CARVE (F4 verification D5): stricter than requireText on purpose —
    // this lane refuses whitespace-only unets (trim), the kit helper
    // refuses only ''. Consolidating onto the helper would silently
    // relax this law.
    if (typeof unet !== 'string' || unet.trim() === '') {
        throw new Error(`h3 film: lane_inputs.unet = ${JSON.stringify(unet)} — a non-empty string is required`);
    }
    return { unet, clip: LANE_FILES.clip, vae_video: LANE_FILES.vae_video, vae_audio: LANE_FILES.vae_audio };
}
/** The overlay re-check the film loop voices per stanza (the same
 *  carrier the card's compose gate walks — ONE schema, imported).
 *  Exported so the card's single-call lift judges through the same
 *  re-check (the h3-b duplicate is gone: one owner). */
export const assertOverlayGated = (doc, where) => {
    try {
        paramSchema(doc);
    }
    catch (e) {
        throw new Error(`${where}: ${String(e)}`);
    }
};
/** THE MERGED FILM: ONE prompt, N windows under `window${k}_`
 *  scopes (GraphBuilder.scoped), with real seam edges between scopes
 *  (the executor orders windows off the graph) and per-window
 *  stanzas in the renderer vocabulary (k, ctx_save_clip_index, the
 *  per-call knobs REPLACE, the span rider per window). The seam is
 *  the studio's document law (docModel): transition 'extend' (absent
 *  = extend) chains the previous LATENT; 'cut' is a fresh window, and
 *  'cut' + first_frame_prev_sec opens from the previous VIDEO tail
 *  (the node's context_frames arm). prev_sec scales the carry:
 *  picture snapped to the node's legal context lengths (5/22/39/56
 *  frames — only whole latent steps), audio at 24 frames/second. */
function renderH3Film(p, g, facts, model) {
    // (the compose dispatch guarantees calls is a non-empty array here)
    const calls = p.calls;
    const str = (v) => (typeof v === 'string' ? v : '');
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    let prev;
    // every window's SaveVideo passthrough, in film order — the film
    // tail's ordering wire needs ALL of them (2026-09-23: the
    // last-save-only boundary left cut windows' saves unordered)
    const windowSaves = [];
    // THE FILM RAIL (the operator's call, 2026-09-17: the film is media
    // composition — the ENGINE'S job, never a harness-side ffmpeg).
    // THE SEAM (2026-09-20, the operator's order: forget the
    // MotionContext seam exists): ONE mechanic, automatic — the
    // TimelineDirector drift-control continuation. Every window k≥2
    // carries the previous window's sampled latent through
    // MiniMaxH3FiniteLatentContinuation (schedule-matched prefix noise
    // + Soft AV audio release); a 'cut' call is their overlap-0 arm
    // (independent windows, no guidance). No seam vocabulary, no
    // modes — the film accumulates through their finalize chain
    // (video: the previous window owns the overlap; audio: the
    // incoming soft-released head owns the join). §20, THREE ACTS
    // (2026-09-22): (1) the ORIGINAL in-graph tail consumed every
    // window's tensors until the final CreateVideo — the OOM signature
    // that killed positioned-clips films 3× (a 43h engine); (2) the
    // one-day disk-side valve (estate ffmpeg) died of the operator's
    // provenance law — every artifact traces to a composition of
    // cards, never a harness side-effect; (3) the FILE FORM now below:
    // each window saves its own clip, an unload boundary orders +
    // flushes, and a file-decoding tail assembles the film IN-GRAPH —
    // no tensor ever spans the boundary. The mix math lives in
    // filmMix.ts — one owner, stamps and overlay both.
    // THE CONDITIONING stamps below stay in-graph per-window (what
    // each window HEARS at generation — lip sync lives here). The
    // overlay half (positions, duck spans, the music bus) rides the
    // post-generation MeliteFilmAudioMix for clips-carrying films
    // (the valve's second arm) and the clips-free file tail otherwise
    // — both driven by the same filmMix.ts manifest.
    // THE CLIPS, PARSED ONCE (2026-09-21, the dialogue half): the
    // per-window CONDITIONING stamps (the model hears the dialogue:
    // lip sync) read THIS list — parseFilmMixClips (filmMix.ts) is
    // the one law for what a clip IS, shared with the post-generation
    // mix node (its clips_json rows carry the parsed seats verbatim).
    // THE THREE AUDIO LANES (2026-09-22, the operator's D-M-E law): a
    // clip rides one CLASS — dialogue | sfx | music — one H3 audio
    // input each. Every class runs the SAME machinery (stamp → pin →
    // prompt field → overlay); only the prompt field and the duck
    // relationships differ. Default: a text-carrying row is dialogue
    // (the words law), a textless row is music (the historical
    // Music-row behavior, byte-identical for existing docs).
    const clips = parseFilmMixClips(Array.isArray(p.audio_clips) ? p.audio_clips : []);
    // THE FILM DOC'S SPANS — the clock's own rows, one per call, doc
    // frames with the seam word (filmMix.ts owns the law). The stanza
    // snap rides these (spanStanzaFrames): the render loop below and
    // the film manifest at the tail read the SAME snap from the SAME
    // rows — the two-clocks law, one owner.
    const spans = calls.map((c) => ({
        // the shot-law loop above pins every row's int spans (loud
        // refusals upstream) — no defensive fallback arms to keep alive
        start: c.start_frame,
        end: c.end_frame,
        // the seam word rides RAW — filmMix's spanOverlap owns the one
        // meaningful comparison ('cut' = overlap 0; every other spelling
        // including absent IS extend); no card-side re-encoding
        transition: str(c.transition),
    }));
    // (the clip text law lives where the text is consumed: THE
    // TRANSCRIPT — dialogue words ride the <d> prompt tag, sfx text
    // the soundscape field, music text non_diegetic_music. In every
    // class the text tells the model WHAT the audio is.)
    // LORA STEPS APPLIED (operator correction, 2026-09-18): a distill
    // adapter is married to its step count — one lora for four steps,
    // another for eight — so the resolved bag rows carry `steps` and
    // the windows honor it. LAYERING: a call's own knobs > the lora
    // entry's steps > this steps row (the row is the no-distill
    // default; a user-stacked pair runs at the HIGHER count — 8 steps
    // on a 4-step distill is fine, 4 on an 8-step is undercooked).
    const loraRows = Array.isArray(p.loras) ? p.loras : [];
    const loraStepsList = loraRows
        .map((r) => r.steps)
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
    const loraStepsApplied = loraStepsList.length > 0 ? Math.max(...loraStepsList) : null;
    calls.forEach((call, i) => {
        const k = i + 1;
        const guide = str(call.image ?? call.ref_image ?? call.image_name);
        // A CALL OWNS ITS TEXT (the operator's no-fallbacks law, enforced
        // 2026-09-21: the film-level prompt silently rode textless calls —
        // a source substitution, the exact crime class the law bans). The
        // directing skill's own contract says it: "A call needs text (or
        // beats — prompt segments WITHIN the call)". The film-level prompt
        // is the single-window shape's text face (lifted there by the
        // single-call mapping) — NEVER a per-call substitute.
        let text = typeof call.text === 'string' ? call.text.trim() : '';
        if (text === '') {
            throw new Error(`calls[${i}]: a call needs its own text — the film-level prompt is not a fallback (write the shot's text on the call)`);
        }
        // THE SEAM LAW (2026-09-20): ONE mechanic, automatic. A 'cut'
        // call is the director's overlap-0 arm (independent windows — no
        // continuation, no guidance, nothing carried); every other seam
        // rides the drift-control continuation at their proven default
        // (22 frames ≈ 0.92s). first_frame_prev_sec retired with the
        // MotionContext seam — cross-run continuity is the FL2VA anchor
        // (set the first-frame square to the previous film's last frame).
        const overlap = transitionOverlap(typeof call.transition === 'string' ? call.transition : undefined);
        const knobs = (call.knobs ?? {});
        // refs are a LAYER B (per-call) property — the reference bundle
        // rides the stanza; a refs-carrying call is t4r EVEN without a
        // guide still (the bundle IS the r2v input). The DECLARED input
        // surface (ref_images/ref_videos/ref_audios — Layer A, the
        // card's own params) implies t4r by the same law.
        const rb = (call.refs ?? {});
        const declaredRefCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length;
        const hasRefs = declaredRefCount + wireList(rb.images).length + wireList(rb.videos).length + wireList(rb.audios).length > 0;
        const chainLike = i > 0 && overlap > 0;
        const sf = num(call.start_frame);
        const ef = num(call.end_frame);
        const stamps = {};
        if (sf !== null && ef !== null && Number.isFinite(sf) && Number.isFinite(ef) && ef > sf) {
            const carry = i > 0 ? overlap : 0;
            const genStart = sf - carry;
            for (let ci = 0; ci < clips.length; ci++) {
                const clip = clips[ci];
                if (clip.dur <= 0)
                    continue;
                if (stamps[clip.cls] !== undefined)
                    continue; // one lane per class per window
                const lo = Math.max(clip.start, genStart);
                const hi = Math.min(clip.start + clip.dur, ef);
                if (hi - lo < 2.4)
                    continue; // below the slice node's 0.1s floor
                const ms = (frames) => Math.round((frames / 24) * 1000) / 1000;
                stamps[clip.cls] = {
                    src: clip.src,
                    slice_start_seconds: ms(Math.max(0, genStart - clip.start)),
                    slice_duration_seconds: ms(hi - lo),
                    delay_seconds: ms(Math.max(0, clip.start - genStart)),
                    text: clip.text,
                };
                // (§20: the conditioned set moved to filmMix.ts — the
                // post-generation mix node derives it from the same stamp
                // law. The stamps themselves stay: THIS window hears them.)
            }
        }
        // THE PROMPT FIELDS (the guide's law, one per lane): dialogue
        // rides <d> tags — the exact words at the stamp's LOCAL time
        // (MM:SS.mmm, the window's own clock), never translated or
        // rewritten; this is the half the audio-only conditioning
        // lacked: the audio pins the voice, the tag moves the mouth.
        // SFX rides the soundscape field at its onset time (the model
        // HEARS the blast and times the visual to it); music rides
        // non_diegetic_music. Same delay number, same clock.
        const stampClock = (t) => {
            const mm = String(Math.floor(t / 60)).padStart(2, '0');
            const ss = String(Math.floor(t % 60)).padStart(2, '0');
            const mmm = String(Math.round((t % 1) * 1000)).padStart(3, '0');
            return `${mm}:${ss}.${mmm}`;
        };
        // ONE overall_soundscape FIELD per window (finding 11,
        // Commission 17, 2026-10-13): a window carrying both a dialogue
        // stamp and an sfx stamp once composed TWO fields with separate
        // `At MM:SS.mmm` clocks in one prompt — the format admits one
        // field, and no authoring move avoided it short of dropping a
        // lane. The sentences collect in lane order (dialogue first,
        // then sfx — the historical append order) and ride a single
        // field; each sentence keeps its own lane clock (the one-clock
        // law trims a doubled clock off ONE text, never across lanes).
        const soundscapeSentences = [];
        if (stamps.dialogue !== undefined && stamps.dialogue.text !== '') {
            const t = stampClock(stamps.dialogue.delay_seconds);
            // SPEAKER-NEUTRAL (attempt-019 maker finding): the stamp once
            // hard-coded "She says" — a plainly male harbourmaster got a
            // female pronoun in his own mouth. The speaker is whoever the
            // window shows; the stamp never genders them.
            soundscapeSentences.push(`At ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${stamps.dialogue.text}</d>`);
        }
        if (stamps.sfx !== undefined && stamps.sfx.text !== '') {
            // THE ONE-CLOCK LAW (2026-09-24): an authored sfx text that already
            // opens with its own "At MM:SS.mmm," clock must not carry two clocks —
            // the stamp's clock is canonical, the authored one is trimmed.
            const sfxText = stamps.sfx.text
                .replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, '');
            soundscapeSentences.push(`At ${stampClock(stamps.sfx.delay_seconds)}, ${sfxText}`);
        }
        if (soundscapeSentences.length > 0) {
            text = text.replace(/\s+$/, '') + '\n\noverall_soundscape:\n' + soundscapeSentences.join('\n');
        }
        if (stamps.music !== undefined && stamps.music.text !== '') {
            text = text.replace(/\s+$/, '') +
                `\n\nnon_diegetic_music:\n${stamps.music.text}`;
        }
        // THE NO-SPEECH INDICATOR (2026-09-24, the operator's gibberish
        // law, paid for on the BRIEF9 films): unless the model is told
        // 'no speech' OR given speech-carrying audio, it INVENTS random
        // gibberish dialogue. A window with no dialogue stamp and no
        // live ref audios is exactly that window — an sfx/music bed does
        // NOT count (the first BRIEF9 window carried the bed on the sfx
        // lane and still gibberished; only the dialogue-conditioned
        // window came out clean). The card stamps the indicator itself:
        // model memory is not a seat. Ref audios count as audio input
        // only when the door guard leaves them live (an unstamped
        // window); an authored indication of any spelling ('no speech',
        // 'no dialogue', 'no voice') is honored, never doubled.
        const voicePinnedHere = stamps.dialogue !== undefined || stamps.sfx !== undefined;
        const hearsRefAudio = !voicePinnedHere
            && (wireList(p.ref_audios).length > 0 || wireList(rb.audios).length > 0);
        if (stamps.dialogue === undefined && !hearsRefAudio && !/\bno[\s_-]*(speech|dialogue|voice)/i.test(text)) {
            text = text.replace(/\s+$/, '') +
                '\n\noverall_soundscape:\nNo speech or dialogue in this shot — ambient and effects only; nobody speaks on screen and there is no voice-over.';
        }
        const stanza = { ...p, ...knobs, prompt: text, k };
        // THE SEAT UNION (2026-10-26, the no-drop law): a call may state
        // its media lanes DIRECTLY — last_frame / ref_images /
        // ref_videos / ref_audios on the call row — and the schema
        // admits them (the media gate walks them), so the compose MUST
        // read them or they die schema-green and engine-blind. A stated
        // lane REPLACES the declared (film) lane, an absent one
        // inherits — the same per-seat canon the refs bag rides.
        if (typeof call.last_frame === 'string' && call.last_frame.trim() !== '')
            stanza.last_frame = call.last_frame;
        if (wireList(call.ref_images).length > 0)
            stanza.ref_images = call.ref_images;
        if (wireList(call.ref_videos).length > 0)
            stanza.ref_videos = call.ref_videos;
        if (wireList(call.ref_audios).length > 0)
            stanza.ref_audios = call.ref_audios;
        const hasDirectRefs = wireList(call.ref_images).length + wireList(call.ref_videos).length + wireList(call.ref_audios).length > 0
            || (typeof call.last_frame === 'string' && call.last_frame.trim() !== '');
        const anyStamp = stamps.dialogue !== undefined || stamps.sfx !== undefined || stamps.music !== undefined;
        stanza.variant = (guide !== '' || hasRefs || hasDirectRefs || anyStamp) ? 't4r' : chainLike ? 't4_chain' : 't4_open';
        // the distill's steps apply unless this call's knobs pinned steps
        if (knobs.steps === undefined && loraStepsApplied !== null)
            stanza.steps = loraStepsApplied;
        // THE DOOR GUARD, voice arm: a dialogue/sfx-pinned window mutes
        // the user ref audios (film-level and per-call) — the pins own
        // that window's audio conditioning; the ref doors reopen on
        // unstamped windows.
        const voicePinned = stamps.dialogue !== undefined || stamps.sfx !== undefined;
        if (voicePinned)
            delete stanza.ref_audios;
        // THE BAG GATE (2026-10-24): the stanza carries the refs bag when
        // ANY lane rides it — refs (bundle bus) OR mods (conditioning
        // tokens). The operator caught the hole live: a mods-only call
        // lost its whole bag (hasRefs counted only the bus lanes, so the
        // reference packs silently died). Mods never flip the arm (the
        // refmod seam's own law below), so the gate widened here is the
        // one behavior change — a mods-only call stays FL2VA.
        const callMods = wireList(rb.mods);
        if (hasRefs || callMods.length > 0)
            stanza.refs = voicePinned && Array.isArray(call.refs?.audios)
                ? { ...call.refs, audios: undefined }
                : call.refs;
        if (guide !== '')
            stanza.image = guide;
        else
            delete stanza.image;
        if (sf !== null && ef !== null && ef > sf) {
            // THE UNIFORM SPAN GATE, second door: a stale or hand-built
            // document re-rides the same law the walk admitted under, so
            // the compose carrier refuses an off-grid span before any node
            // is built (zero GPU) instead of trusting the render snap.
            assertSpanGrid(spans[i], `h3-timeline window ${k}`, chainLike ? overlap : 0);
        }
        // per-window length: the span rider law, unless the call's knobs pin one
        if (sf !== null && ef !== null && ef > sf && knobs.length === undefined) {
            // THE CARRY IS GENERATION (fixed 2026-09-23): the stanza
            // covers carry + span — the finalize trims the carried head
            // off the SAVED clip, so the span's tail must exist inside
            // the generation. chainLike is the render's own carry law
            // (i>0 and a non-cut seam) — the same number filmMix's
            // stanzaSecs states (the two-clocks law, still one owner).
            stanza.length = spanStanzaFrames(spans[i], chainLike ? overlap : 0);
            // THE TWO CLOCKS LAW (fixed 2026-09-22 — the 20-second proof
            // film): the window's VIDEO length derives from fps_seconds
            // (the builder's ComfyMathExpression reads it; the length
            // param alone only feeds the film clock's accounting). A doc
            // whose spans disagree with the stale fps_seconds renders
            // uniform 10s windows while the clock books doc spans — the
            // film clock and the render MUST state the same window.
            // (The snap itself is filmMix's spanStanzaFrames — the ONE
            // law the render loop and the film manifest share; the old
            // inline 22+17k twin died here.)
            if (knobs.fps_seconds === undefined) {
                stanza.fps_seconds = Math.round((stanza.length / 24) * 1000) / 1000;
            }
        }
        // THE GRID GATE (§26): a knob-pinned length bypassed the snap
        // above — validate, never trust. Refuses at compose (zero GPU)
        // with the span, the nearest legal length, and the proven
        // geometry in the message.
        assertGridLength(stanza.length, `h3-timeline window ${k} (span ${sf}→${ef})`);
        if (i > 0) {
            stanza.__iteration = k - 1;
            stanza.__overlap = overlap;
        }
        if (prev !== undefined)
            stanza.__prev = prev;
        // THE DOOR GUARD (2026-09-22, the operator's overlap law; the
        // bed arm retired with the bed the same day): a pinned window
        // owns its audio conditioning — the normal inputs stand down for
        // THAT window so nothing double-feeds the same generation. The
        // dialogue/sfx arm strips the user's ref_audios on stamped
        // windows (the pins own those lanes); the music arm has nothing
        // left to guard since the bed left. Per-window, never film-wide.
        assertOverlayGated(stanza, `h3-timeline window ${k} knobs`);
        // WINDOWS REMAIN TENSORS-FREE (§20, 2026-09-22): no accumulation
        // nodes, nothing holds a prior window's tensors — each window
        // frees after its own SaveVideo. The film tail below assembles
        // from the SAVED FILES (decode after every save), never from
        // window tensors.
        // the conditioning stamps ride the stanza (what THIS window
        // hears at generation — the Slice → pin chain reads them).
        if (stamps.dialogue !== undefined)
            stanza.dialogue_slice = stamps.dialogue;
        if (stamps.sfx !== undefined)
            stanza.sfx_slice = stamps.sfx;
        if (stamps.music !== undefined)
            stanza.music_slice = stamps.music;
        const h = g.scoped(`window${k}_`, (w) => renderH3Window(stanza, w, facts, model));
        prev = h;
        /* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets is refused loud at the film tail */
        if (h.savePassthrough !== undefined)
            windowSaves.push(h.savePassthrough);
    });
    // ── THE FILM TAIL, FILE FORM (§20's amendment, 2026-09-22 — the
    // operator's provenance law: every artifact traces to a
    // composition of cards, never a harness side-effect) ──────────────
    //
    // The ORIGINAL tail consumed every window's tensors as graph data
    // (the scheduler kept the whole film's backlog alive while later
    // windows sampled — the 43h-OOM signature). The disk-side valve
    // that replaced it died the same day (out-of-band ffmpeg). THIS
    // tail inverts the memory law while staying in-graph, in TWO arms:
    //
    //   CLIPS-FREE films (the 27-film precedent — never OOM'd):
    //   1. every window SAVES its own clip (h3_t4_w<k>) — its tensors
    //      die at that SaveVideo (nothing downstream consumes them);
    //   2. ONE MeliteUnload boundary PER window save, token-chained
    //      through the optional 'after' input (2026-09-23: the old
    //      single boundary on the last save assumed "windows chain, so
    //      the last save is downstream of them all" — FALSE for cut
    //      films, which chain nothing; window 2's save was an unordered
    //      island and the loader could beat it) — every boundary flushes
    //      the allocator WITHOUT dropping model weights (the next run
    //      pays no reload), and the chain's final token provably waits
    //      for EVERY save;
    //   3. MeliteConcatVideos decodes the saved FILES back in
    //      (IMAGE+AUDIO+fps) — CPU-side, strictly after every save;
    //   4. CreateVideo → SaveVideo h3_t4_film. The film is a graph
    //      output; the estate's engineFilmName presents it first.
    //
    //   AUDIO-CARRYING films (the valve's SECOND ARM, 2026-09-24 — the
    //   VRAM-leak fix, operator law: WE USE COMFYUI, NEVER FFMPEG for
    //   the mix; GAP 1 CLOSED same night — the arm delivers the film
    //   mp4): the retired in-graph film stitch (film-time Delay/Mix/
    //   Duck over live window tensors) held every window resident
    //   until the final save — the accumulation that OOM'd a
    //   two-window BRIEF9 film at 20.57 GiB. These films take the valve
    //   path (windows save per-window and free behind the same chained
    //   boundaries — steps 1–2 above) PLUS one post-generation
    //   MeliteFilmAudioMix (Layer C, torch, the estate's own node):
    //   window audio files + the manifest's clips/duck law in,
    //   SaveAudio h3_t4_film_audio stem out — AND the same file-tail
    //   video join (MeliteConcatVideos → CreateVideo → SaveVideo
    //   h3_t4_film) with the MIXED audio wired in. No film-time
    //   Delay/Mix/Duck/LoadAudio — the graph holds windows only
    //   during generation.
    //
    // (Single-window docs never reach this tail — the compose
    // dispatch keeps the frozen single-window shape byte-identical;
    // the film is a MULTI-call property, and the single-call mapping
    // refuses clips loudly downstream of the dispatch.)
    /* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets refuses here, loudly */
    if (windowSaves.length === 0) {
        throw new Error('[h3-timeline] a family arm saved no clip to pass the film boundary — the film tail cannot order its loads');
    }
    const manifest = computeFilmMix({
        spans,
        clips,
        windowSecs: stanzaSecs(spans),
        // the knob's declared default (−14) walks through the schema
        // door; computeFilmMix owns the fallback for the absent key
        duckDb: p.duck_depth_db,
    });
    // ONE BOUNDARY PER WINDOW SAVE, token-chained (2026-09-23, the
    // cut-film ordering fix — receipts run-1057a53c4252 (stale-file
    // stitch: 960×576 leftovers globbed as windows) and
    // run-18ea8c810104 (loud no-match refusal on h3_t4_w2): cut
    // windows chain NOTHING and even chained windows' SAVE nodes are
    // not downstream of one another, so the old single boundary on
    // the LAST save rode a scheduler tie-break — window 2's save was
    // an unordered island the loader could beat). Every window's
    // SaveVideo passthrough feeds its OWN boundary; each boundary's
    // optional 'after' wires the prior boundary's token, so the final
    // token (the concat's 'after') transitively depends on EVERY
    // save — and each window's passthrough tensor still dies at its
    // own boundary (the §20 law; the flush is idempotent, weights
    // stay resident).
    let boundaryAfter;
    for (const save of windowSaves) {
        boundaryAfter = g.node('MeliteUnload', {
            video: save, unload_models: false,
            ...(boundaryAfter !== undefined ? { after: boundaryAfter } : {}),
        }).out(0);
    }
    const after = boundaryAfter;
    if (clips.length > 0) {
        // THE VALVE'S SECOND ARM (2026-09-24 — the film mix leaves the
        // graph's generation half; GAP 1 CLOSED 2026-09-24 — the arm
        // delivers the film mp4 too): ONE MeliteFilmAudioMix composes
        // the film's audio post-generation from the saved window files
        // + the manifest's clips/duck law (the SAME Delay/Mix/Duck
        // methods the retired tail called, in the SAME order — now
        // torch-side inside the estate's own node, never ffmpeg).
        // SaveAudio emits the stem; the VIDEO join is the clips-free
        // arm's own machinery (MeliteConcatVideos decodes the saved
        // files CPU-side strictly after every save — windows' tensors
        // died at their SaveVideos, so no accumulation returns) with
        // the MIXED audio wired into CreateVideo — the film mp4 carries
        // the mix, not the raw concat audio. Early return: the
        // clips-free arm below stays byte-frozen.
        const mix = g.node('MeliteFilmAudioMix', {
            videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(','),
            after,
            // the manifest rendered verbatim: every placement's source,
            // film seat, duration, and class — doc order kept (the node's
            // two loops read the same order the retired tail did)
            clips_json: JSON.stringify(manifest.placements.map((pl) => {
                const clip = clips[pl.clip];
                return { src: clip.src, start_sec: pl.filmSec, dur_sec: pl.durSec, class: pl.cls };
            })),
            duck_spans: manifest.duckSpanString,
            music_duck_spans: manifest.musicDuckSpanString,
            duck_db: manifest.duckDb,
            film_seconds: manifest.filmSec,
        });
        // THE LOUDNESS METER (§39's owed Layer C node, 2026-09-25): a
        // passthrough tap between the mix and its consumers — the film's
        // integrated loudness (BS.1770-4, K-weighted + gated) rides the
        // history UI dict as loudness_lufs, so every surface REPORTS the
        // number instead of re-deriving it from the encoded file. The
        // AUDIO dict rides out unchanged (meter taps, never transforms);
        // calibrated against ffmpeg's ebur128 to within 0.1 LU on tones,
        // noise, gating, and mono.
        const meter = g.node('MeliteLoudness', { audio: mix.out(0) });
        saveAudio(g, meter.out(0), 'h3_t4_film_audio');
        // THE FILM MP4 (GAP 1): the same file-tail video join the
        // clips-free arm rides — container mux only (CreateVideo +
        // SaveVideo h264/mp4 on the decoded window files), never the
        // mix. The mix rides it: audio carries the node's output.
        const join = g.node('MeliteConcatVideos', {
            videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(','),
            after,
        });
        const filmCreated = g.node('CreateVideo', {
            images: join.out(0), audio: meter.out(0), fps: join.out(2), bit_depth: FILM_BIT_DEPTH,
        });
        return g.node('SaveVideo', {
            video: filmCreated.out(), filename_prefix: 'h3_t4_film',
            format: 'mp4', codec: 'h264',
        }).out();
    }
    const concat = g.node('MeliteConcatVideos', {
        videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(','),
        after,
    });
    const filmCreated = g.node('CreateVideo', {
        images: concat.out(0), audio: concat.out(1), fps: concat.out(2), bit_depth: FILM_BIT_DEPTH,
    });
    return g.node('SaveVideo', {
        video: filmCreated.out(), filename_prefix: 'h3_t4_film',
        format: 'mp4', codec: 'h264',
    }).out();
}
/** THE FUN-CONTROLNET CHAIN (002 H2/H4 + 007 L7): family-owned,
 *  the LTX_lora_loader precedent — the node pair is the family's
 *  own (ModelPatchLoader + MiniMaxH3FunControlNetApply, the
 *  engine's model-patch spelling), spelled HERE, never swapped
 *  into the kit's still-image stackControlNets (whose node pair
 *  stays z-image's). One link per fired pick, array order = apply
 *  order, empty picks → the bare model (byte-stable). The control
 *  source rides the pick's clip channel (a staged video artifact —
 *  LoadVideo → GetVideoComponents' image stream) or its still
 *  image; the mask channel rides LoadImageMask (alpha; the node
 *  reads it with source_video unset — no presumption about the
 *  video behind the mask). The schedule window stamps verbatim:
 *  the row declares 'ranged' and the node carries the dials (the
 *  kit's schedule law already refused what the row forbids). */
function applyH3FunControlNets(g, model, vae, picks) {
    let cur = model;
    for (const pick of picks) {
        const hasClip = pick.clip !== undefined && pick.clip !== '';
        const control = hasClip
            ? g.node('GetVideoComponents', { video: g.node('LoadVideo', { file: pick.clip }).out() }).out(0)
            : pick.image !== ''
                ? g.node('LoadImage', { image: pick.image, upload: 'image' }).out(0)
                : undefined;
        const hasMask = pick.mask !== undefined && pick.mask !== '';
        const patch = g.node('ModelPatchLoader', { name: pick.model }).out();
        cur = g.node('MiniMaxH3FunControlNetApply', {
            model: cur, model_patch: patch, vae,
            strength: pick.strength,
            start_percent: pick.start_percent ?? 0,
            end_percent: pick.end_percent ?? 1,
            ...(control === undefined ? {} : { control_video: control }),
            ...(hasMask ? { mask: g.node('LoadImageMask', { image: pick.mask, channel: 'alpha' }).out(0) } : {}),
        }).out();
    }
    return cur;
}
function renderH3Window(p, g, facts, model) {
    // REFS IMPLY THE R2V LANE (the bundle IS the r2v input): a
    // refs-carrying window is t4r even without a guide still — the
    // same law the film renderer applies per call. The DECLARED input
    // surface (ref_images/ref_videos/ref_audios — the typed fields)
    // implies t4r by the same law.
    const rb0 = (p.refs ?? {});
    const declaredCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length;
    const hasRefs = declaredCount + wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0;
    if (hasRefs && p.variant !== 't4r')
        p = { ...p, variant: 't4r' };
    const family = p.variant;
    if (!FAMILIES.includes(family)) {
        throw new Error(`unknown window family '${String(p.variant)}' (known: ${[...FAMILIES].sort().join(', ')})`);
    }
    const k = (p.k ?? 1);
    // THE GRID GATE (§26, defense in depth): no window renders
    // off-grid — the film loop's pin check voices the call span, this
    // one catches the single-call path and any direct caller.
    assertGridLength(p.length, `h3-timeline window ${k}`);
    const isT4r = family === 't4r';
    const isChain = family === 't4_chain';
    // (M5, the fallback audit — judged LAWFUL and now documented: this
    // is the fresh-card admission, not a fallback crime. The window
    // shape's text face is p.prompt (declared required=True, "optional
    // at parse"); the FRESH-PRESS law (operator 2026-09-17, pinned in
    // card.spec.ts "a fresh press composes") admits an absent/blank
    // prompt as empty conditioning — the fresh-card one-shot document
    // renders. The film path refuses textless calls instead (the
    // no-fallbacks law at the calls walk); the single-call LIFT may
    // lawfully write p.prompt from call text because in the one-window
    // shape p.prompt IS the text owner — never a substitute.)
    const prompt = (p.prompt ?? '');
    // card knob first (image), renderer alias second.
    const guideImage = (p.image ?? p.image_name ?? '');
    // ── the model chain (family-conditional defaults;
    // absent = absent on wire) ──
    const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true);
    const unet = g.node('UNETLoader', { unet_name: facts.unet, weight_dtype: 'default' }).out();
    const sla = g.node('H3SLAAttention', {
        model: unet,
        sparsity_ratio: p.sla_sparsity,
        block_size: p.sla_block_size,
        min_seq_len: p.sla_min_seq_len,
        dense_last_steps: p.sla_dense_last_steps,
        protect_audio: p.sla_protect_audio,
        enabled: true,
        dense_steps: p.sla_dense_steps,
        dense_backend: p.sla_dense_backend,
        disable_fp16_accum: p.sla_disable_fp16_accum,
        stabilize_motion: stabilize,
        reference_protection: p.sla_reference_protection,
    }).out();
    const chunked = g.node('MiniMaxChunkFeedForward', {
        model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
        chunks: 2, seq_threshold: 4096,
    }).out();
    // THE LORAS MOD PLANE (the operator's law: "MOD SYSTEM IS CORE.
    // NEVER HARDCODED"; 2026-09-21: "LORAS ARE ONLY MODS" — the raw
    // `lora_stack` string field is DEAD): the studio/agent surface
    // writes the mod bag `loras` — [{id, strength}] rows the service
    // resolves to {name, strength} filenames against the family's
    // flavor catalog. Those rows build the upstream stack verbatim
    // ({on, lora, str, v:1, a:1, t:1}); an empty bag rides the
    // family catalog's turbo row (the mod plane's own default, built
    // from the catalog so the value has one owner). ONE surface, one
    // owner.
    const loraStack = Array.isArray(p.loras) && p.loras.length > 0
        ? JSON.stringify(p.loras.map((r) => ({
            // the service resolves every row against the family catalog
            // (unknown ids refuse LOUD upstream) — {name, strength} is
            // the guaranteed wire shape, read directly
            on: true,
            lora: r.name,
            str: r.strength,
            v: 1, a: 1, t: 1,
        })))
        : loraStackDefault();
    // t4r templates carry shift_video 8.0; the t4 family carries the INT
    // NO SILENT RESOLUTION LAW: the walked shift_video IS the value
    // (declared default 8; the family literals retired with the
    // nulling that fed them — 8.0 and 8 serialize identically anyway)
    const shiftVideo = p.shift_video;
    const clip = g.node('CLIPLoader', {
        clip_name: facts.clip, type: 'minimax',
        ...(isT4r ? { device: 'default' } : {}), // t4 templates OMIT it
    }).out();
    const vaeVideo = g.node('VAELoader', { vae_name: facts.vae_video }).out();
    const vaeAudio = g.node('VAELoader', { vae_name: facts.vae_audio }).out();
    let cond;
    let latent;
    let sigmaModel;
    let fpsInput;
    if (isT4r) {
        // opener: switch(SLABool) picks SLA-direct vs chunked; lora rides
        // the switch; preview override wired to the in-graph step count.
        // Inject semantics: an injected SCALAR replaces the bool NODE
        // (template link severed, node orphaned) — mirrored by passing the
        // scalar straight when sla_switch is set. sla_enabled=false
        // forces the chunked (SLA-off) path; otherwise the legacy
        // sla_switch spelling rides untouched.
        const fpsNode = g.node('PrimitiveFloat', { value: 24.0 }).out(); // id .0 — CreateVideo.fps walks first
        let slaSel = p.sla_enabled === false
            ? true
            : (p.sla_switch ?? null);
        if (slaSel === null)
            slaSel = g.node('PrimitiveBoolean', { value: false }).out();
        const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out();
        const loraModel = g.node('LTX_lora_loader', {
            model: picked, mode: 'minimax', stack_data: loraStack, lora_ui: '',
        }).out();
        const seconds = g.node('PrimitiveFloat', { value: p.fps_seconds }).out(); // id .1
        const lengthNode = g.node('ComfyMathExpression', {
            expression: MATH_STEPS_GOLD, 'values.a': seconds,
        }).out(1);
        const previewed = g.node('ModelPreviewOverrideKJ', {
            max_resolution: 512, jpeg_quality: 80,
            suppress_default_preview: true, preview_frames: lengthNode,
            preview_fps: 8, tiny_vae: 'none', model: loraModel,
        }).out();
        const adaln = g.node('H3AdaLNLoRAFix', { model: previewed, mode: 'port' }).out();
        sigmaModel = g.node('MiniMaxH3SigmaShift', {
            model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio,
        }).out();
        // THE ANCHOR + THE REFERENCE BUNDLE (the operator's distinction,
        // 2026-09-17): `image` is the call's ANCHOR REFERENCE (input_1,
        // the frozen served shape — ref_image_0 on the r2v node, the
        // strongest identity pull; the window's literal first frame
        // GENERATES under its guidance, it is never pinned — the i2v
        // first-frame input is the orphaned marker below); `refs` is the
        // call's REFERENCE bundle
        // — the upstream "Extra References" subgraph's own vocabulary
        // (LoadImage → the ref resizer; LoadVideo → GetVideoComponents →
        // the image+audio component pair; LoadAudio). Bundle layout (the
        // slot map): inputs 1-9 images (anchor first), 10/12/14
        // video image streams, 11/13/15 video audio streams, 16-18
        // audios. RESIZER ORDER IS PINNED: the serialized walk reaches
        // the reference resizer (bundle → r2v refs) before the geometry
        // resizer (i2v) — creation mirrors the walk.
        const refBag = (p.refs ?? {});
        // THE LAYER A/B OVERRIDE CANON (operator, 2026-10-24): Layer A
        // is the card's DEFAULTS; a call (Layer B) REPLACES a refs lane
        // it states — per lane, never per bag — and inherits the
        // declared lane when it states none. The pre-canon merge
        // (declared PRIMARY + bag appended, deduped) made a call unable
        // to override the run's references: the exact harm the operator
        // named. LoRAs own the opposite pole — CALL_KEYS admits no
        // loras key, so a call cannot even state one (film-level model
        // configuration is Layer A's alone). One canon, per seat:
        // replace (refs lanes), per-key replace (CALL_KNOB_KEYS), or
        // none (loras, geometry, the bed).
        const declaredImages = wireList(p.ref_images);
        const declaredVideos = wireList(p.ref_videos);
        const declaredAudios = wireList(p.ref_audios);
        // THE 9-SLOT IMAGE BUS (the bundle's own topology — the compose
        // and the UI agree or they lie): inputs 1-9 are IMAGE slots —
        // the anchor at 1, the FL2VA pair's END anchor at 2 when
        // last_frame is set, references at 3..9 (7 with an end anchor,
        // 8 riding input_2..9 without one); input_10 begins the video
        // lanes. A 9th ref would land ON input_10 — the first video's
        // image stream — and be silently clobbered; the law refuses
        // LOUD instead.
        const lastFrame = (p.last_frame ?? '');
        // THE CANON'S REPLACE ARM (per lane): a stated call lane rides
        // INSTEAD of the declared lane; an absent call lane inherits it.
        const bagImages = wireList(refBag.images);
        const refImagesAll = bagImages.length > 0 ? bagImages : declaredImages;
        const imageCap = imageReferenceCap(lastFrame !== '');
        if (lastFrame !== '' && refImagesAll.length > imageCap) {
            throw new Error(`[h3-timeline] the image bus is full: a last frame (input 2) + ${String(refImagesAll.length)} references exceeds the ${IMAGE_BUS_SLOTS}-slot bus — keep references ≤ ${imageCap} with an end anchor (≤ ${REF_CAPS.images} without)`);
        }
        const refImages = refImagesAll.slice(0, imageCap);
        const bagVideos = wireList(refBag.videos);
        const refVideos = (bagVideos.length > 0 ? bagVideos : declaredVideos).slice(0, REF_CAPS.videos);
        // THE TRIM SEAT'S READER (audit 003/V4): index-paired with
        // ref_videos — schema resolve fills each entry's start_time/
        // duration defaults, so a wire `{item:…}` or partial entry
        // normalizes before it reaches the slice. A non-object entry
        // refuses LOUD (the probe-proven law), never rides silent.
        const rawTrims = Array.isArray(p.ref_video_trims) ? p.ref_video_trims : [];
        if (rawTrims.length > REF_CAPS.videos) {
            throw new Error(`ref_video_trims: expected at most ${REF_CAPS.videos} entries (the video lane's cap) — got ${rawTrims.length}`);
        }
        const videoTrims = rawTrims.map((e, i) => {
            if (typeof e !== 'object' || e === null || Array.isArray(e)) {
                throw new Error(`ref_video_trims: entry ${i} must be an object { start_time, duration } — got ${JSON.stringify(e).slice(0, 40)}`);
            }
            const row = e;
            const start = row.start_time;
            const dur = row.duration;
            if (start !== undefined && typeof start !== 'number')
                throw new Error(`ref_video_trims: entry ${i} start_time must be a number — got ${JSON.stringify(start).slice(0, 40)}`);
            if (dur !== undefined && typeof dur !== 'number')
                throw new Error(`ref_video_trims: entry ${i} duration must be a number — got ${JSON.stringify(dur).slice(0, 40)}`);
            return { start_time: start ?? 0, duration: dur ?? 0 };
        });
        const bagAudios = wireList(refBag.audios);
        const refAudios = (bagAudios.length > 0 ? bagAudios : declaredAudios).slice(0, REF_CAPS.audios);
        const bundleInputs = {};
        // THE SPELL ARM (the naming law's merge half, 2026-10-09 — "fix
        // it all"): a '$name' value names a WIRED STAGE INPUT, never a
        // file on disk — the merge (rewriteSpells) lands the upstream
        // producer's tensor link wherever the spell rides, and ROW-4
        // refuses producer links in Load* file slots. So a spelled
        // anchor/last-frame/reference rides its TENSOR slot verbatim
        // and NEVER builds a loader; files/URLs/estate paths keep the
        // Load* disk handoff (the per-stage path owns those). Before
        // this arm the ports validated green at the lattice and died
        // at the merge — the validate-said-nothing disease.
        const isSpell = (s) => s.startsWith('$');
        const imageRef = (src) => isSpell(src) ? src : g.node('LoadImage', { image: src }).out();
        let anchorRaw;
        if (guideImage !== '') {
            anchorRaw = imageRef(guideImage);
            bundleInputs.input_1 = g.node('UnifiedResizeImageMask', {
                image: anchorRaw, scale_mode: 'Shorter Side',
                aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
                short_side_target: 2048.0, width: 1024.0, height: 1024.0,
                multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
                crop: 'center', divisible_by: 32.0, maintain_aspect: false,
            }).out();
        }
        // THE FL2VA END ANCHOR: input_2 is the pair's second seat — the
        // i2v branch reads out(0)/out(1) as first/last frame verbatim.
        // Without an end anchor, refs ride from input_2 (legacy shelf).
        const resizeRef = (src) => g.node('UnifiedResizeImageMask', {
            image: imageRef(src), scale_mode: 'Shorter Side',
            aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
            short_side_target: 2048.0, width: 1024.0, height: 1024.0,
            multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
            crop: 'center', divisible_by: 32.0, maintain_aspect: false,
        }).out();
        if (lastFrame !== '')
            bundleInputs.input_2 = resizeRef(lastFrame);
        const firstFreeSlot = lastFrame !== '' ? 3 : 2;
        refImages.forEach((src, i) => {
            const img = imageRef(src);
            if (anchorRaw === undefined && i === 0)
                anchorRaw = img;
            bundleInputs[`input_${firstFreeSlot + i}`] = g.node('UnifiedResizeImageMask', {
                image: img, scale_mode: 'Shorter Side',
                aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
                short_side_target: 2048.0, width: 1024.0, height: 1024.0,
                multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
                crop: 'center', divisible_by: 32.0, maintain_aspect: false,
            }).out();
        });
        refVideos.forEach((src, i) => {
            // the spelled motion guide rides GetVideoComponents' tensor
            // input directly (the producer's pre-save video tensor); a
            // path keeps the LoadVideo disk handoff.
            let vid = isSpell(src) ? src : g.node('LoadVideo', { file: src }).out();
            // THE TRIM THREAD (audit 003/V4): entry i slices guide i
            // through the engine's own Video Slice BEFORE conditioning —
            // both arms (spelled tensor and disk path) trim the same,
            // because the slice rides the VIDEO tensor either way. A
            // zero/zero or absent entry builds no node: the whole clip
            // stays the guide, byte-stable with the pre-trim graph.
            const trim = videoTrims[i];
            if (trim !== undefined && (trim.start_time > 0 || trim.duration > 0)) {
                vid = g.node('Video Slice', {
                    video: vid, start_time: trim.start_time,
                    duration: trim.duration, strict_duration: false,
                }).out();
            }
            const comp = g.node('GetVideoComponents', { video: vid });
            bundleInputs[`input_${10 + 2 * i}`] = comp.out(0);
            bundleInputs[`input_${11 + 2 * i}`] = comp.out(1);
        });
        refAudios.forEach((src, i) => {
            // the spelled sound reference rides the bundle's audio seat
            // directly (the producer's audio tensor); a path keeps
            // LoadAudio.
            bundleInputs[`input_${16 + i}`] = isSpell(src)
                ? src
                : g.node('LoadAudio', { audio: src }).out();
        });
        // the geometry resizer (i2v's dead branch): fed by the anchor, or
        // the first ref image, or — anchorless and imageless — pinned to
        // the literals the geo node's own defaults produce (the branch is
        // never selected; r2vBool pins true below).
        const geoSrc = anchorRaw ?? bundleInputs.input_2;
        let geoW = 768.0;
        let geoH = 1344.0;
        if (geoSrc !== undefined) {
            const geo = g.node('UnifiedResizeImageMask', {
                image: geoSrc, scale_mode: 'Total Pixels (MP)',
                aspect_ratio: '3:4 (Portrait Standard)', long_side_target: 1280.0,
                short_side_target: 768.0, width: 768.0, height: 1344.0,
                multiplier: 1.0, megapixels: 0.98, upscale_method: 'lanczos',
                crop: 'center', divisible_by: 32.0, maintain_aspect: false,
            });
            geoW = geo.out(2);
            geoH = geo.out(3);
        }
        const bundle = g.node('PlagueKindBundleIn', bundleInputs).out();
        const bout = g.node('PlagueKindBundleOut', { bundle });
        // declared knobs hoisted: the compose walk fills their defaults
        // (probe 2026-09-19) — the ?? literals are the pre-walk fence
        const refSize = p.ref_image_size;
        const r2vInputs = {
            prompt, width: p.width, height: p.height,
            length: lengthNode, ref_image_size: refSize,
            clip, vae: vaeVideo, audio_vae: vaeAudio,
        };
        for (let i = 0; i <= 8; i++)
            r2vInputs[`ref_images.ref_image_${i}`] = bout.out(i);
        for (let i = 0; i < 3; i++) {
            r2vInputs[`ref_videos.ref_video_${i}`] = bout.out(9 + 2 * i);
            r2vInputs[`ref_video_audios.ref_video_audio_${i}`] = bout.out(10 + 2 * i);
            r2vInputs[`ref_audios.ref_audio_${i}`] = bout.out(15 + i);
        }
        // (THE BED IS GONE, 2026-09-22: the user's three ref_audios ride
        // their natural lanes above — no slice, no shift, no fourth
        // anything.)
        let dialogueAudio;
        let dialogueFrameIdx = 0;
        let sfxAudio;
        let sfxFrameIdx = 0;
        let musicAudio;
        let musicFrameIdx = 0;
        // THE DIALOGUE LANE (2026-09-21, the second half): a clip the
        // film loop stamped on THIS window conditions it — the model
        // HEARS the dialogue (the lip-sync mechanism; the generated
        // voice tracks it, the overlay stays the audible authority and
        // the mix DUCKS the generated voice under the real clip at film
        // time). THE BUS LAW, TOLD LOUD: 3 audio lanes total. Bed +
        // THE PINNED DIALOGUE GUIDE (rewired 2026-09-22 after the
        // operator caught the dead lane): the bare ref_audios lane is a
        // soft prior this checkpoint ignores — measured zero correlation
        // on two rendered films. The PINNING lane is MiniMaxH3AddGuide
        // with an audio-only keyframe: the clip's true source segment is
        // anchored INTO the model's own timeline at its generation-frame
        // index (the audio latent rides pinned rows; the video around it
        // generates to match — the inpainting-grade prior). Dialogue no
        // longer consumes a ref lane: bed + user audios keep the full
        // 3-lane budget, and the guide is the dialogue's one owner.
        {
            const read = (key) => (p[key] ?? null);
            const stamp = read('dialogue_slice');
            if (stamp !== null) {
                dialogueAudio = g.node('MeliteAudioSlice', {
                    audio: stamp.src,
                    start_seconds: stamp.slice_start_seconds,
                    duration_seconds: stamp.slice_duration_seconds,
                }).out(0);
                dialogueFrameIdx = Math.round(stamp.delay_seconds * 24);
            }
            const sfxStamp = read('sfx_slice');
            if (sfxStamp !== null) {
                sfxAudio = g.node('MeliteAudioSlice', {
                    audio: sfxStamp.src,
                    start_seconds: sfxStamp.slice_start_seconds,
                    duration_seconds: sfxStamp.slice_duration_seconds,
                }).out(0);
                sfxFrameIdx = Math.round(sfxStamp.delay_seconds * 24);
            }
            const musicStamp = read('music_slice');
            if (musicStamp !== null) {
                musicAudio = g.node('MeliteAudioSlice', {
                    audio: musicStamp.src,
                    start_seconds: musicStamp.slice_start_seconds,
                    duration_seconds: musicStamp.slice_duration_seconds,
                }).out(0);
                musicFrameIdx = Math.round(musicStamp.delay_seconds * 24);
            }
        }
        const r2v = g.node('MiniMaxH3ReferenceToVideo', r2vInputs);
        // THE ORPHANED I2V MARKER (2026-09-26): registered so the
        // serialized graph carries the t4r family key (finalizeH3's
        // marker), wired to the geometry/anchor slots it always read —
        // but consumed by NOTHING. The old shape routed r2v through a
        // hardcoded-true ComfySwitchNode whose on_false arm was this
        // node: never selected, yet a flipped switch would have run the
        // gold prompt. Direct wiring + an orphan = one lane, one truth.
        g.node('MiniMaxH3ImageToVideo', {
            // Input census alignment (2026-10-12): the engine build's
            // node declares clip/first_frame/height/last_frame/length/
            // prompt/vae/width — context_steps and audio_context_steps
            // are gone from the declaration, and the input wall walks
            // orphans too, so wiring them refused the whole graph
            // (BRIEF15: card_compose unknown-input on this node).
            prompt: I2V_MARKER_PROMPT, width: geoW, height: geoH,
            length: lengthNode,
            clip, vae: vaeVideo, first_frame: bout.out(0), last_frame: bout.out(1),
        });
        cond = r2v.out(0);
        latent = r2v.out(1);
        fpsInput = fpsNode;
        // THE AUDIO-ONLY KEYFRAMES (2026-09-22, D-M-E): each lane pins
        // its slice into the window's own AV latent at its generation-
        // frame index — the model generates the video (and its own
        // sound) around the pinned audio instead of merely glancing at
        // a soft reference. Guides CHAIN (positive flows through): the
        // dialogue pin lands first (the measured law), then sfx (the
        // model times the blast to the heard transient), then music.
        if (dialogueAudio !== undefined) {
            cond = g.node('MiniMaxH3AddGuide', {
                positive: cond, latent,
                frame_idx: dialogueFrameIdx,
                audio_vae: vaeAudio, audio: dialogueAudio,
            }).out(0);
        }
        if (sfxAudio !== undefined) {
            cond = g.node('MiniMaxH3AddGuide', {
                positive: cond, latent,
                frame_idx: sfxFrameIdx,
                audio_vae: vaeAudio, audio: sfxAudio,
            }).out(0);
        }
        if (musicAudio !== undefined) {
            cond = g.node('MiniMaxH3AddGuide', {
                positive: cond, latent,
                frame_idx: musicFrameIdx,
                audio_vae: vaeAudio, audio: musicAudio,
            }).out(0);
        }
    }
    else {
        // t4 families: the SLA/attention switch rides ABOVE the LoRA
        // loader (the t4r mirror — L1: the old order stacked the loader
        // under the chunked branch only, so sla_enabled=true (the
        // default) picked the bare SLA model and every bagged LoRA
        // silently did nothing while the steps marriage still fired).
        // The switch picks the attention strategy — SLA-direct vs the
        // backend-pinned chunked chain — and ONE loader applies the bag
        // over the pick; the fix-up + shift ride the loaded model on
        // both arms, so no arm bypasses the loader. The backend node
        // stays on the dense branch (pre-switch): it configures that
        // branch's attention implementation, and routing the
        // SLA-patched model through it would risk clobbering the sparse
        // kernels — the switch selects the strategy, the loader samples
        // whichever won. The pin autofills the builder adds (lora_ui,
        // the SeedVR2 tile/offload inputs) are stripped by the finalize
        // pass — the python's _T4_AUTOFILL_STRIP mirror.
        const mab = g.node('ModelAttentionBackend', {
            model: chunked,
            // schema-defaulted knob (the vocabulary door guarantees the
            // field — 'comfy kitchen attention' when the caller stays
            // silent; no compose-side fallback arm to keep alive)
            attention: p.attention_backend,
        }).out();
        const picked = g.node('ComfySwitchNode', {
            // THE SLA MASTER SWITCH (2026-09-21): sla_enabled=false takes
            // the dense arm; absent = on (every existing doc). The legacy
            // `?? sla_switch ?? true` arms died 2026-09-22 by the
            // no-silent-resolution law: sla_enabled is DECLARED with
            // .default(true), so the walk always delivers a boolean and
            // the fallback arms were unreachable lies.
            switch: p.sla_enabled, on_true: sla, on_false: mab,
        }).out();
        const loraModel = g.node('LTX_lora_loader', {
            model: picked, mode: 'minimax', stack_data: loraStack,
        }).out();
        const adaln = g.node('H3AdaLNLoRAFix', { model: loraModel, mode: 'port' }).out();
        sigmaModel = g.node('MiniMaxH3SigmaShift', {
            model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio,
        }).out();
        // THE SPAN IS THE FILM (the operator's 2026-09-17 catch: the
        // readout said 7s — the doc's totalFrames, last end_frame @24 —
        // and the render came back 3, this hardcoded 90 budget). The
        // window's render length derives from the TIMELINE the calls
        // author: last end_frame − first start_frame, SNAPPED TO THE
        // 17k+5 GRID the engine's latent math lawfully renders (22+17k,
        // clamped [22,362] — the same set the length param's own
        // min/step admits; the first 168-span probe died inside
        // SamplerCustomAdvanced off-grid, live receipt 2026-09-17). The
        // retired 90/56 budgets remain the fallback ONLY for docs that
        // (the length source of truth is UPSTREAM of this renderer: the
        // schema's span rider serializes single-call spans as EXPLICIT
        // length, and the merged film computes per-window lengths — this
        // arm only falls back to the family budgets)
        // NO SILENT RESOLUTION LAW: the walked/stanza length IS the value
        // (single-call: the span rider's explicit span; multi-call: the
        // film total; fresh: the walked default; the 90/56 family budgets
        // retired with the nulling that fed them)
        const length = p.length;
        const r2v = g.node('MiniMaxH3ReferenceToVideo', {
            prompt, width: p.width,
            height: p.height, length: length,
            ref_image_size: p.ref_image_size,
            clip, vae: vaeVideo, audio_vae: vaeAudio,
        });
        cond = r2v.out(0);
        latent = r2v.out(1);
        fpsInput = 24;
    }
    // THE REFMOD SEAM (audit 010/R1, 2026-10-18): reusable reference
    // mods — .safetensors packs extracted under the engine's
    // models/refmods/ — appended to the conditioning's reference
    // tokens through ALL DiT blocks (the pack rides the model's
    // native ref2va path; it spends conditioning-side tokens, never a
    // bundle-bus slot, so the refs-imply-r2v law does not fire on a
    // mod and BOTH arms share this one seam — Apply accepts the core
    // CONDITIONING either r2v arm emits and returns the same type).
    // Paths in, stems out: the loader's combo enumerates
    // models/refmods/ stems, so a path arrives as its basename minus
    // .safetensors — anything the engine cannot resolve refuses HERE,
    // loud, instead of dying server-side as a combo miss (the I2V
    // census-alignment law).
    // THE PER-CALL MODS SEAT (2026-10-24): a call's refs.mods REPLACE
    // the run-level list — the canon's refs-lane arm (a stated call
    // lane rides INSTEAD of the declared lane; absent inherits).
    // Comma strings (the UI wire form) and arrays (the agent form)
    // both resolve through wireList; the cap check below guards the
    // EFFECTIVE list.
    const bagMods = wireList(rb0.mods);
    const refModsAll = bagMods.length > 0 ? bagMods : wireList(p.ref_mods);
    if (refModsAll.length > 0) {
        if (refModsAll.length > REF_CAPS.refmods) {
            throw new Error(`[h3-timeline] ref_mods exceeds the loader's ${String(REF_CAPS.refmods)} slots (saw ${String(refModsAll.length)})`);
        }
        const modStem = (src) => {
            // Trim, then query-strip (the estate precedent:
            // timelineContract's _kindOfFile splits '?' first), then split
            // on BOTH separators — a backslash-prefixed or padded entry
            // would otherwise pass the suffix check with junk baked into
            // the stem and die server-side as a combo miss. The two `as`
            // casts are total (split always yields a non-empty array), so
            // this adds no defensive branches to the coverage face.
            const query = src.trim().split('?')[0];
            const base = query.split(/[\\/]/).pop();
            if (!base.endsWith('.safetensors')) {
                throw new Error(`[h3-timeline] ref_mods entries are .safetensors mods under models/refmods/ (saw '${src}')`);
            }
            return base.slice(0, -'.safetensors'.length);
        };
        const loaderInputs = { show_info: false };
        for (let i = 0; i < REF_CAPS.refmods; i++) {
            const src = refModsAll[i];
            loaderInputs[`mod_${i + 1}`] = src === undefined ? '(none)' : modStem(src);
            loaderInputs[`strength_${i + 1}`] = 1;
            loaderInputs[`copies_${i + 1}`] = 1;
        }
        const mods = g.node('MiniMaxH3RefModsLoader', loaderInputs).out(0);
        cond = g.node('MiniMaxH3RefModApply', {
            conditioning: cond, mods, override: false, retention: 1,
            curve_direction: 'constant', scramble_seed: -1,
            curve_shape: 'linear', curve_value: 1,
        }).out(0);
    }
    // ── sampler stack ──────────────────────────────────────────────────
    // card knob first (seed), renderer alias second.
    const noise = g.node('RandomNoise', { noise_seed: (p.noise_seed ?? p.seed) }).out();
    const samplerSel = g.node('KSamplerSelect', { sampler_name: p.sampler_name }).out();
    let sampler;
    if (isT4r) {
        sampler = samplerSel;
    }
    else {
        const ersde = g.node('SamplerER_SDE', {
            solver_type: 'ODE', max_stage: 3, eta: 0.0, s_noise: 1.0,
        }).out();
        // template carries switch=false as a LITERAL, not a bool node
        sampler = g.node('ComfySwitchNode', { switch: false, on_true: ersde, on_false: samplerSel }).out();
    }
    // THE FUN-CONTROLNET SEAT (007 L7): one insertion past the sigma
    // shift, BOTH t4 arms by construction (each arm assigns sigmaModel
    // above; every downstream consumer — BasicScheduler, BasicGuider,
    // the continuation seam, the soft-AV release — rides the chain's
    // tail). Empty picks → sigmaModel verbatim (byte-stable); entries
    // fire only when the family boards the controlnet pack (the kit's
    // boarding gate — the rows are the operator's BENCH row, 002 H1)
    // and every row fact (schedule capability, strength ceiling, the
    // clip/mask channels) arrived stamped by the service resolution.
    sigmaModel = applyH3FunControlNets(g, sigmaModel, vaeVideo, fireControlNets(model, p));
    const schedName = p.sched_name;
    const denoiseVal = p.denoise;
    const sched = g.node('BasicScheduler', {
        model: sigmaModel, scheduler: schedName,
        steps: p.steps, denoise: denoiseVal,
    }).out();
    let guider = g.node('BasicGuider', { model: sigmaModel, conditioning: cond }).out();
    let targetLatent = latent;
    // THE SEAM (2026-09-20, the operator's order: the MotionContext
    // seam is FORGOTTEN — the TimelineDirector drift-control
    // continuation is the one way, automatic): window k≥2 with a
    // carried seam rides MiniMaxH3FiniteLatentContinuation — the
    // previous window's RAW sampled latent becomes this window's
    // drift-controlled opening (schedule-matched prefix noise: the
    // carried tail's noise level walks down the sampler's own sigma
    // schedule, so the model never fights the anchor — the anti-drift
    // core for unbounded chains), the audio latent rides the Soft AV
    // half-cosine release (no seam pops), and the MODEL comes back
    // PATCHED — the guider rebinds to it and the sampler's target is
    // the MASKED latent. A 'cut' call (overlap 0) and every opener
    // never mount this block: a true fresh window.
    // THE FAMILY-AGNOSTIC SEAM (fixed 2026-09-22): the gate was
    // t4_chain-only, and the dialogue stamp routes stamped windows to
    // t4r — a stamped film silently lost the continuation AND the
    // carried-head trim (two independent windows hard-concatenated:
    // the broken seam the operator caught on the proof film). The
    // continuation is latent-level (wraps the sampler's model and
    // conditioning — family-agnostic); the trim is decode-level.
    // Every film window k>=2 chains, t4r included. THE WALL: a
    // stamped window with no Continuation node is a broken seam —
    // card-gap pins it ("the stamped seam wall").
    if (isChain || isT4r) {
        const prev = p.__prev;
        /* v8 ignore next 1 -- the film loop stamps __iteration on every window k≥2 before the render (the seam block mounts only when it did) */
        const iteration = p.__iteration ?? 0;
        /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the seam block mounts only when it did) */
        const overlap = p.__overlap ?? 0;
        if (prev !== undefined && overlap > 0) {
            const cont = g.node('MiniMaxH3FiniteLatentContinuation', {
                positive: cond, target_latent: targetLatent,
                iteration, overlap_frames: overlap,
                continue_audio_latent: true,
                model: sigmaModel, sigmas: sched,
                previous_latent: prev.latOut,
            });
            cond = cont.out(0);
            targetLatent = cont.out(1);
            guider = g.node('BasicGuider', { model: cont.out(3), conditioning: cont.out(0) }).out();
        }
    }
    const sampled = g.node('SamplerCustomAdvanced', {
        noise, guider, sampler, sigmas: sched, latent_image: targetLatent,
    });
    let latOut = sampled.out(0);
    // ── THE T3 REFINE RIDER (roadmap item 2 — the crowd's third
    // tier, formalized): a short CLOSING pass over the window's
    // output latent — the refiner lora on its OWN loader (the
    // primary stack above NEVER changes), full-denoise short
    // schedule from the same noise seed, riding the doc's own
    // sampler/scheduler (the rider owns NO solver of its own — one
    // owner per knob). Mounted ONLY when the service resolved a
    // refine row; absent = the graph renders exactly as before.
    // The TaoMate refiner thread's mechanics: pass A full, pass B
    // closes. The rider sits UPSTREAM of decode AND of the film's
    // seam handles — the chained texture is the refined one.
    // THE MASTER GATE (2026-09-22): second_pass_enabled === true is
    // the only door to the whole post chain — sharpen, interp, VSR,
    // refine each AND it with their own switch (legacy docs with
    // leaves set but no master render the plain pass, byte-stable).
    const secondPassOn = p.second_pass_enabled === true;
    const refine = secondPassOn ? p.refine : undefined;
    if (refine !== undefined) {
        const refineModel = g.node('LTX_lora_loader', {
            model: sigmaModel, mode: 'minimax',
            stack_data: JSON.stringify([{ on: true, lora: refine.name, str: refine.strength, v: 1, a: 1, t: 1 }]),
            lora_ui: '',
        }).out();
        const refineSched = g.node('BasicScheduler', {
            model: refineModel, scheduler: schedName,
            steps: refine.steps, denoise: 1.0,
        }).out();
        const refineGuider = g.node('BasicGuider', { model: refineModel, conditioning: cond }).out();
        const refined = g.node('SamplerCustomAdvanced', {
            noise, guider: refineGuider, sampler: samplerSel, sigmas: refineSched, latent_image: latOut,
        });
        latOut = refined.out(0);
    }
    // ── decode + save ──────────────────────────────────────────────────
    let vdec = g.node('VAEDecode', { samples: latOut, vae: vaeVideo }).out();
    let vadec = g.node('VAEDecodeAudio', { samples: latOut, vae: vaeAudio }).out();
    // the RAW audio head is the soft seam's currency — the film's join
    // takes the incoming window's UNTRIMMED opening (it owns the seam);
    // captured BEFORE the clip finalize trims the overlap off
    let vadecRaw;
    // `delivered` fills at the save branches (both families save)
    let delivered = null;
    const rawHandles = { latOut, vdec, vadec, filmImages: latOut, filmAudio: latOut };
    if (isChain || isT4r) {
        const prev = p.__prev;
        /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the block mounts only when it did) */
        const overlap = p.__overlap ?? 0;
        if (prev !== undefined && overlap > 0) {
            vadecRaw = vadec;
            // the window's OWN clip: the carried overlap leaves picture AND
            // sound by the same duration (their finalize, hard audio trim —
            // a clip never replays the seam it grew from)
            const fin = g.node('MiniMaxH3FiniteSegmentFinalize', {
                sampled_latent: latOut, images: vdec, audio: vadec,
                iteration: 1, overlap_frames: overlap, trim_audio_head: true,
            });
            vdec = fin.out(1);
            vadec = fin.out(2);
        }
    }
    if (isT4r) {
        const created = g.node('CreateVideo', {
            images: vdec, audio: vadec, fps: fpsInput, bit_depth: FILM_BIT_DEPTH,
            // color_space: pin autofill "sRGB"
        });
        // ONE WINDOW-NAMING LAW (2026-09-22, the file-tail amendment):
        // every window saves under h3_t4_w<k> — the t4r arm's legacy
        // 'video/ComfyUI' prefix died (multi-window anchored films were
        // unaddressable: every window collided on one prefix, and the
        // file tail's loader could not name them).
        const saved = g.node('SaveVideo', {
            video: created.out(), filename_prefix: `h3_t4_w${k}`,
            format: 'auto', codec: 'h264',
            'codec.encoding': 're-encode', 'codec.encoding.crf': 10.0,
        });
        rawHandles.savePassthrough = saved.out(0);
        delivered = { images: vdec, audio: vadec };
    }
    else {
        // sharpen leaves: only the EXPLICITLY-set ones patch the grouped
        // dict (absent leaves keep ImageSharpenKJ's own defaults). The old
        // card knob (sharpen_strength) rides the leaf loop like
        // the renderer alias does.
        const method = { ...SHARPEN_DEFAULTS };
        const sharpenLeaves = [
            ['sharpen_method', 'method'], ['sharpen_strength', 'strength'],
            ['sharpen_radius', 'radius'], ['sharpen_threshold', 'threshold'],
            ['sharpen_iterations', 'iterations'],
        ];
        for (const [src, dst] of sharpenLeaves) {
            const val = p[src];
            if (val !== null && val !== undefined)
                method[dst] = val;
        }
        // ── V9 tail order (re-cut 2026-09-15, the operator's cause) ──
        // upstream moved sharpen LAST: interp → VSR → sharpen → CreateVideo
        // (V7/ours sharpened FIRST — before the upscaler could soften the
        // detail away). Sharpen rcas 0.3 after upscale "looks natural"
        // (his V9 notes). The switches stay ours; the ORDER is his.
        const film = g.node('FrameInterpolationModelLoader', {
            model_name: p.interp_model,
        }).out();
        const interpMultVal = p.interp_multiplier;
        const interp = g.node('FrameInterpolate', {
            interp_model: film, images: vdec, multiplier: interpMultVal,
        }).out();
        // ONE OWNER (2026-09-20): interpolate_enabled owns the switch
        // (declared default false). The legacy interp_switch alias is
        // retired — post-declaration the walk materializes the primary,
        // so the alias arm was unreachable dead law.
        const interpSwOn = secondPassOn && p.interpolate_enabled;
        const interpSw = g.node('ComfySwitchNode', {
            switch: interpSwOn, on_true: interp, on_false: vdec,
        }).out();
        const srRes = p.sr_resolution;
        const sr = g.node('SeedVR2VideoUpscaler', {
            image: interpSw,
            dit: g.node('SeedVR2LoadDiTModel', {
                model: p.sr_model, device: 'cuda:0',
            }).out(),
            vae: g.node('SeedVR2LoadVAEModel', {
                model: LANE_FILES.sr_vae, device: 'cuda:0',
            }).out(),
            seed: 42, resolution: srRes,
            max_resolution: 0, batch_size: 5, uniform_batch_size: false,
            color_correction: 'lab',
        }).out();
        const srSwOn = secondPassOn && p.sr_switch;
        const srSw = g.node('ComfySwitchNode', {
            switch: srSwOn, on_true: sr, on_false: interpSw,
        }).out();
        // sharpen LAST (V9): the upscaler softens; rcas after it restores.
        // Renderer alias second (sharpen_* leaves above build the method).
        const sharpened = g.node('ImageSharpenKJ', { image: srSw, method }).out();
        const sharpSw = g.node('ComfySwitchNode', {
            switch: secondPassOn && p.sharpen_enabled, on_true: sharpened, on_false: srSw,
        }).out();
        // fps compensation (V9, 2026-09-15): upstream wires
        // CreateVideo.fps = base × interp multiplier (his Enhancements:
        // PrimitiveFloat 24 → ComfyMathExpression "a * 2" → fps). Without
        // it every interp-on window plays at HALF speed — the frames
        // double, the fps doesn't. Byte-stable at defaults (interp off →
        // the served literal 24).
        const interpOn = secondPassOn && p.interpolate_enabled;
        const interpMult = p.interp_multiplier;
        const created = g.node('CreateVideo', {
            images: sharpSw, audio: vadec, fps: interpOn ? 24 * interpMult : 24, bit_depth: FILM_BIT_DEPTH,
            // color_space: pin autofill "sRGB"
        });
        const saved = g.node('SaveVideo', {
            video: created.out(), filename_prefix: `h3_t4_w${k}`,
            format: 'mp4', codec: 'h264',
        });
        rawHandles.savePassthrough = saved.out(0);
        delivered = { images: sharpSw, audio: vadec };
    }
    // (every family path delivers — both arms save the window's clip;
    // no null arm: the family dispatch is exhaustive over FAMILIES.
    // The old MotionContextSaveLatent persistence died with the seam —
    // cross-run continuity is the FL2VA anchor: set the first-frame
    // square to the previous film's last frame, latent-true.)
    rawHandles.filmImages = delivered.images;
    // THE FILM'S AUDIO SEAM CURRENCY: a carried window hands the film
    // its UNTRIMMED opening (the soft-released head owns the join);
    // every other window hands its delivered audio
    rawHandles.filmAudio = vadecRaw !== undefined
        ? vadecRaw
        : delivered.audio;
    return rawHandles;
}
/** The film action — the h3 family's whole compose segment. The
 * doc arrives gated + lifted from the card; the build owns the
 * lane admissions and both renderers (this module is their only
 * seat). */
/** The sampler row the h3 schema itself serves: the ONE engine
 * vocabulary read through the family's recommended subset (the
 * schema's own filter law — a retyped list would be a second
 * SSOT). */
const H3_SAMPLER_OPTIONS = SAMPLER_OPTIONS.filter((n) => H3_RECOMMENDED_SAMPLERS.includes(n));
export const film = {
    id: 'film',
    inputs: [],
    outputs: [{ name: 'video', kind: 'VIDEO' }],
    // GATE S (the seed sentinel — the estate's one-mint law): the
    // schema's default is 42 and explicit seeds ride verbatim; an
    // explicit -1 (the ComfyUI randomize idiom) mints CLIENT-SIDE
    // through the one helper instead of leaving the choice to the
    // server — the M12 replayability contract, adopted with the
    // family port (the card's legacy else still passes -1 through;
    // the action oracle pins that one deliberate divergence).
    // THE DECLARED SURFACE (the write plane, phase 2): the h3 card
    // schema's own types and bounds — the family door judges defaults
    // and variant presets against this row. The sampler row resolves
    // from the ONE engine vocabulary read through the family's
    // recommended subset (the schema's own filter); the scheduler row
    // reads the whole vocabulary. The timeline's own JSON row params
    // (calls, audio_clips) ride the timeline contract's validators,
    // not this surface; the per-window rows (k, noise_seed,
    // fps_seconds) are internal. ref_image_size is the schema's
    // const-or-WxH pattern tier — typed as its string spine.
    params: [
        { name: "prompt", type: "string" },
        { name: "image", type: "string" },
        { name: "last_frame", type: "string" },
        { name: "ref_images", type: "image_list" },
        { name: "ref_videos", type: "image_list" },
        { name: "ref_audios", type: "image_list" },
        { name: "ref_mods", type: "image_list" },
        { name: "duck_depth_db", type: "number", bounds: [-48, 0] },
        { name: "seed", type: "number", rule: "seed-sentinel" },
        { name: "width", type: "number", bounds: [448, 1344] },
        { name: "height", type: "number", bounds: [448, 768] },
        { name: "length", type: "number", bounds: [22, 362] },
        { name: "steps", type: "number", bounds: [4, 30] },
        { name: "second_pass_enabled", type: "boolean" },
        { name: "sharpen_enabled", type: "boolean" },
        { name: "sharpen_strength", type: "number", bounds: [0, 1] },
        { name: "sharpen_method", type: "enum", options: ["rcas", "adaptive_usm", "high_pass", "deconvolution"] },
        { name: "sharpen_radius", type: "number", bounds: [0.5, 5] },
        { name: "sharpen_threshold", type: "number", bounds: [0, 1] },
        { name: "sharpen_iterations", type: "number", bounds: [1, 100] },
        { name: "interpolate_enabled", type: "boolean" },
        { name: "interp_model", type: "enum", options: ["film_net_fp16.safetensors", "rife47.pth"] },
        { name: "interp_multiplier", type: "number", bounds: [2, 4] },
        { name: "denoise", type: "number", bounds: [0, 1] },
        { name: "sampler_name", type: "enum", options: H3_SAMPLER_OPTIONS },
        { name: "sched_name", type: "enum", options: SCHEDULER_OPTIONS },
        { name: "refine_lora", type: "string" },
        { name: "refine_strength", type: "number", bounds: [0, 2] },
        { name: "refine_steps", type: "number", bounds: [1, 10] },
        { name: "attention_backend", type: "enum", options: ["comfy kitchen attention", "pytorch attention"] },
        { name: "sr_switch", type: "boolean" },
        { name: "sr_resolution", type: "number", bounds: [720, 2160] },
        { name: "sr_model", type: "enum", options: ["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"] },
        { name: "ref_image_size", type: "string" },
        { name: "shift_video", type: "number", bounds: [1, 20] },
        { name: "shift_audio", type: "number", bounds: [1, 10] },
        { name: "sla_enabled", type: "boolean" },
        { name: "sla_sparsity", type: "number", bounds: [0, 0.95] },
        { name: "sla_block_size", type: "enum", options: ["32", "64", "128"] },
        { name: "sla_min_seq_len", type: "number", bounds: [512, Number.MAX_SAFE_INTEGER] },
        { name: "sla_dense_last_steps", type: "number", bounds: [0, 10] },
        { name: "sla_dense_steps", type: "string" },
        { name: "sla_dense_backend", type: "enum", options: ["comfy_kitchen", "pytorch", "auto"] },
        { name: "sla_reference_protection", type: "enum", options: ["Off", "Light", "Heavy Enforcement"] },
        { name: "sla_protect_audio", type: "boolean" },
        { name: "sla_stabilize_motion", type: "boolean" },
        { name: "sla_disable_fp16_accum", type: "boolean" },
        { name: "interp_switch", type: "boolean" },
        { name: "sharpen_switch", type: "boolean" },
        { name: "sla_switch", type: "boolean" },
        { name: "image_name", type: "string" },
    ],
    facts: parseH3Facts,
    build({ p: docIn, facts, g, model }) {
        const p = { ...docIn };
        // THE SOLE-CALL UNPACK (the Layer A/B canon, 2026-10-24): a
        // single-call doc rides the frozen single-window arm below —
        // which renders the DOC surface, never the row. Without this
        // unpack the sole call's Layer B seats (refs bag, anchor image,
        // text, render knobs) died silently on every single-call doc:
        // the split-brain twin of the film loop's bag gate. One stanza
        // law, both arms: the row REPLACES the refs bag / anchor / text
        // seats it states (per-lane, per-seat); knobs replace per key;
        // unstated seats inherit the doc.
        {
            const row = Array.isArray(p.calls) && p.calls.length === 1
                ? p.calls[0]
                : null;
            if (row !== null) {
                const rowText = typeof row.text === 'string' ? row.text.trim() : '';
                if (rowText !== '')
                    p.prompt = row.text;
                if (row.refs !== undefined && row.refs !== null)
                    p.refs = row.refs;
                const rowImage = typeof row.image === 'string' ? row.image.trim() : '';
                if (rowImage !== '')
                    p.image = row.image;
                // THE SEAT UNION, sole-call arm (2026-10-26, the no-drop
                // law): the row's DIRECT media lanes ride onto p — the same
                // per-seat replace canon the stanza arm carries; before this
                // lift a single-window doc's row-level refs died unread.
                if (typeof row.last_frame === 'string' && row.last_frame.trim() !== '')
                    p.last_frame = row.last_frame;
                if (wireList(row.ref_images).length > 0)
                    p.ref_images = row.ref_images;
                if (wireList(row.ref_videos).length > 0)
                    p.ref_videos = row.ref_videos;
                if (wireList(row.ref_audios).length > 0)
                    p.ref_audios = row.ref_audios;
                const rowKnobs = (row.knobs ?? null);
                if (rowKnobs !== null)
                    Object.assign(p, rowKnobs);
            }
        }
        const guideImage = (p.image ?? p.image_name ?? '');
        if (guideImage !== '' && p.variant !== 't4r') {
            const rbRef = (p.refs ?? {});
            const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
                + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
                || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '');
            if (!refsCarry) {
                throw new Error(`h3_window: a guide image ("${guideImage.trim()}") rides only the t4r reference lane — ` +
                    `this doc's variant is '${String(p.variant)}'. State no variant (the walk derives t4r from ` +
                    'the guide) or clear the guide; never a silent text-only render of a reference shot');
            }
        }
        // THE INVERSE ANCHOR GUARD (2026-10-26, the dropped-anchor audit):
        // the guard below polices "t4r without a guide" — but the
        // run-899a8448 rot was the INVERSE hole: a guide present while
        // variant derived t4_open (the schema derivation missed the
        // `image` spelling), so renderH3Window took the non-reference
        // arm, the anchor arm inside `if (isT4r)` never ran, and the
        // window rendered text-only with the user's reference silently
        // dead. A guide-bearing window that is not t4r and carries no
        // reference bus REFUSES here — one law, both directions.
        if (p.variant === 't4r' && !guideImage) {
            // (refs-implied t4r windows carry no anchor — the bundle IS
            // the r2v input; the guard admits them via the refs law — the
            // legacy stanza bag AND the declared input surface (the rail's
            // fields) count; the bed rides the audio lane guideless too)
            const rbRef = (p.refs ?? {});
            const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
                + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
                || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '');
            if (!refsCarry) {
                throw new Error('h3_window(t4r): image-anchored window without a staged guide image — ' +
                    'compose always injects LoadImage.0.image on this family');
            }
        }
        // THE FILM DISPATCH: a multi-call chain doc with no per-window
        // stanza markers (k absent — the stanza vocabulary) composes
        // the MERGED film; everything else is the frozen single-window
        // shape (served byte-identical).
        const docCalls = Array.isArray(p.calls) ? p.calls : null;
        const isFilm = docCalls !== null && docCalls.length > 1
            && p.k === undefined && (p.variant === undefined || p.variant === 't4_chain');
        if (isFilm)
            return renderH3Film(p, g, facts, model);
        // THE CLIPS-STITCH LAW (2026-09-21): the Music row's mix is a
        // FILM-path consumer (it rides the accumulated film audio).
        // On the frozen single-window shape it would be a silent
        // skip — the crime class this estate refuses. Loud, with the
        // fix in the message (the studio's own doc always carries
        // calls; a second short call unlocks the film path).
        const clips = (p.audio_clips ?? []);
        if (clips.some((c) => c !== null && typeof c === 'object'
            && typeof c.src === 'string' && c.src.trim() !== '')) {
            throw new Error('h3-timeline: audio clips ride the FILM path — this single-window doc has clips but no film to mix over ' +
                '(add a second call to author a film, or clear the Music row)');
        }
        // LORA STEPS APPLIED (2026-09-18): the single-window shape
        // honors the distill bag's steps — ONE STEPS LAW for both
        // window paths (007 L3, the film path's verbatim): the marriage
        // fires only when the caller pinned no steps of their own. The
        // doc face reads the schema's __steps_pinned stamp (a walked
        // default is not a pin); the call face reads the single call's
        // knobs (the film path's own `knobs.steps === undefined` arm).
        // An explicit count is the user's word — the distill default
        // never overwrites it.
        if (Array.isArray(p.loras)) {
            const rows = p.loras;
            const applied = rows.map((r) => r.steps).filter((v) => typeof v === 'number' && Number.isFinite(v));
            const singleKnobs = docCalls !== null && docCalls.length === 1
                ? (docCalls[0].knobs ?? {})
                : {};
            if (applied.length > 0 && p.__steps_pinned !== true && singleKnobs.steps === undefined) {
                p.steps = Math.max(...applied);
            }
        }
        return renderH3Window(p, g, facts, model).savePassthrough;
    },
};
//# sourceMappingURL=actions.js.map
