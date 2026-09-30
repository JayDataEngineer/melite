// The h3 family's declared action (the atom vocabulary, stroke 3,
// the video leg — the LAST family): the film renderer, ported
// verbatim from the h3-timeline card's module scope. ONE family
// owns the whole surface (the one-model law): the multi-window
// film and the frozen single-window shape are both THIS action's
// build; the card keeps its own copy as the declared fallback
// until the final interlock retires it (the byte-oracle rides the
// two copies).
//
// THE SEAM (the stroke's law): the card's schema plane (paramSchema
// + the wire-law gate + the single-call lift + its overlay
// re-check) runs CARD-side before dispatch — the action receives
// the GATED, LIFTED doc and owns everything lane-true from there:
// the t4r guide admission, the film dispatch (the clips law, the
// lora steps), and both renderers. No seed mint rides this family
// (the schema's own default 42 fills; video is deterministic
// unless the operator words a seed).
//
// THE ONE DRIFT from the card's module-scope copies: both renderers
// RETURN their final SaveVideo handle (the card's void originals
// discard it — the card's compose is void; the action spec's build
// hands its caller the delivered artifact's wire). Graph bytes are
// untouched by the change.
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { ComfyActionSpec } from '@melite/comfyui-card-kit'
import { FAMILIES, paramSchema, wireList, H3_RECOMMENDED_SAMPLERS } from './schema.ts'
import type { Family } from './schema.ts'
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@melite/comfyui-card-kit/vocab'
import { computeFilmMix, parseFilmMixClips, stanzaSecs } from './filmMix.ts'
import type { FilmMixClip, FilmMixSpan } from './filmMix.ts'
import {
  GRID_REMAINDER,
  GRID_STEP_FRAMES,
  IMAGE_BUS_SLOTS,
  REF_CAPS,
  assertGridLength,
  assertSpanGrid,
  imageReferenceCap,
  mergeDeclaredRefs,
  spanStanzaFrames,
  transitionOverlap,
} from './timelineContract.ts'

const LORA_STACK_GOLD =
  '[{"on":true,"lora":"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors","str":0.6,"v":1,"a":1,"t":1}]'
// His 17k+5 grid, in-graph (ComfyMathExpression): snap latent steps to 2 mod 5
// (the card's own principles row: "Length snaps to the 17k+5 frame grid
// at 24fps" — the principles).
const MATH_STEPS_GOLD = `max(${GRID_REMAINDER}, round(a * 24)) + (${GRID_REMAINDER} - (max(${GRID_REMAINDER}, round(a * 24)) % ${GRID_STEP_FRAMES})) % ${GRID_STEP_FRAMES}`
// THE ORPHANED I2V MARKER NODE (roadmap 2026-09-26 — BRIEF14
// finding #4): MiniMaxH3ImageToVideo exists in the serialized graph
// ONLY as the t4r family marker (finalizeH3 keys on it to skip the
// t4 autofill strip). It is FULLY ORPHANED — no switch consumes it,
// so no switch can ever select it. The old dead branch carried a
// 700-char sprinting-city gold prompt through every request sidecar:
// an off-topic injection-shaped blob and a live hazard the day a
// switch flipped. Orphan + stub prompt = the marker law kept, the
// hazard structurally dead.
const I2V_MARKER_PROMPT = 'i2v marker branch — orphaned, never executed (r2v is the only lane)'
// ImageSharpenKJ's grouped-widget defaults (the rcas block the python
// builds when no sharpen leaf is injected; the card exposes only the
// strength leaf — sharpen_strength).
const SHARPEN_DEFAULTS = { method: 'rcas', strength: 0.3, radius: 1.0, threshold: 0.05, iterations: 10 }

/** The family's lane files that are NOT engine-general members
 * (the complexity floor's stroke 1): the encoder and the two VAEs
 * are invariants of THIS package's lane — no variant varies them,
 * so they live beside the parser that reads them, never in a row
 * a family could drift. The unet alone rides the DECL row: quants
 * and hybrids vary it per route. */
const LANE_FILES = {
  clip: 'qwen3vl_32b_minimax_h3_int8_convrot.safetensors',
  vae_video: 'minimax_h3_video_vae_int8_convrot.safetensors',
  vae_audio: 'minimax_h3_audio_vae_fp32.safetensors',
} as const

/** The h3 facts door: the resolved lane_inputs parsed into the
 * loader names the renderers read (the unet from the row; the
 * three invariants from the package's own LANE_FILES).
 *
 * @param raw the resolved lane_inputs (family ⊕ variant) */
export interface H3Facts {
  readonly unet: string
  readonly clip: string
  readonly vae_video: string
  readonly vae_audio: string
}

export function parseH3Facts(raw: unknown): H3Facts {
  const lane = (raw ?? {}) as Record<string, unknown>
  const unet = lane.unet
  if (typeof unet !== 'string' || unet.trim() === '') {
    throw new Error(`h3 film: lane_inputs.unet = ${JSON.stringify(unet)} — a non-empty string is required`)
  }
  return { unet, clip: LANE_FILES.clip, vae_video: LANE_FILES.vae_video, vae_audio: LANE_FILES.vae_audio }
}

/** The overlay re-check the film loop voices per stanza (the same
 * carrier the card's compose gate walks — ONE schema, imported). */
const assertOverlayGated = (doc: Record<string, unknown>, where: string): void => {
  try {
    paramSchema(doc)
  } catch (e) {
    throw new Error(`${where}: ${String(e)}`)
  }
}

export interface WindowHandles {
  latOut: OutputHandle
  vdec: OutputHandle
  vadec: OutputHandle
  /** the DELIVERED clip — post-trim, post-sharpen: exactly the
   *  streams that window's own SaveVideo plays; the film concat's
   *  currency (the film must not differ from its windows). */
  filmImages: OutputHandle
  filmAudio: OutputHandle
  /** the window's SaveVideo VIDEO passthrough — the film tail's
   *  ordering wire: the MeliteUnload boundary consumes it, so the
   *  file loaders provably wait for the saves (and the passthrough
   *  tensor dies at the boundary — the §20 law). Assigned by BOTH
   *  family arms (every family path saves); the film tail refuses
   *  loud if a future arm forgets. */
  savePassthrough?: OutputHandle
}

function renderH3Film(
  p: Record<string, unknown>,
  g: GraphBuilder,
  facts: H3Facts,
): OutputHandle {
  // (the compose dispatch guarantees calls is a non-empty array here)
  const calls = p.calls as Array<Record<string, unknown>>
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  let prev: WindowHandles | undefined
  // every window's SaveVideo passthrough, in film order — the film
  // tail's ordering wire needs ALL of them (2026-09-23: the
  // last-save-only boundary left cut windows' saves unordered)
  const windowSaves: OutputHandle[] = []
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
  const clips: FilmMixClip[] = parseFilmMixClips(
    Array.isArray(p.audio_clips) ? (p.audio_clips as Array<Record<string, unknown>>) : [],
  )
  // THE FILM DOC'S SPANS — the clock's own rows, one per call, doc
  // frames with the seam word (filmMix.ts owns the law). The stanza
  // snap rides these (spanStanzaFrames): the render loop below and
  // the film manifest at the tail read the SAME snap from the SAME
  // rows — the two-clocks law, one owner.
  const spans: FilmMixSpan[] = calls.map((c): FilmMixSpan => ({
    // the shot-law loop above pins every row's int spans (loud
    // refusals upstream) — no defensive fallback arms to keep alive
    start: c.start_frame as number,
    end: c.end_frame as number,
    // the seam word rides RAW — filmMix's spanOverlap owns the one
    // meaningful comparison ('cut' = overlap 0; every other spelling
    // including absent IS extend); no card-side re-encoding
    transition: str(c.transition),
  }))
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
  const loraRows = Array.isArray(p.loras) ? (p.loras as Array<Record<string, unknown>>) : []
  const loraStepsList = loraRows
    .map((r) => r.steps)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const loraStepsApplied = loraStepsList.length > 0 ? Math.max(...loraStepsList) : null
  calls.forEach((call, i) => {
    const k = i + 1
    const guide = str(call.image ?? call.ref_image ?? call.image_name)
    // A CALL OWNS ITS TEXT (the operator's no-fallbacks law, enforced
    // 2026-09-21: the film-level prompt silently rode textless calls —
    // a source substitution, the exact crime class the law bans). The
    // directing skill's own contract says it: "A call needs text (or
    // beats — prompt segments WITHIN the call)". The film-level prompt
    // is the single-window shape's text face (lifted there by the
    // single-call mapping) — NEVER a per-call substitute.
    let text = typeof call.text === 'string' ? call.text.trim() : ''
    if (text === '') {
      throw new Error(
        `calls[${i}]: a call needs its own text — the film-level prompt is not a fallback (write the shot's text on the call)`,
      )
    }
    // THE SEAM LAW (2026-09-20): ONE mechanic, automatic. A 'cut'
    // call is the director's overlap-0 arm (independent windows — no
    // continuation, no guidance, nothing carried); every other seam
    // rides the drift-control continuation at their proven default
    // (22 frames ≈ 0.92s). first_frame_prev_sec retired with the
    // MotionContext seam — cross-run continuity is the FL2VA anchor
    // (set the first-frame square to the previous film's last frame).
    const overlap = transitionOverlap(typeof call.transition === 'string' ? call.transition : undefined)
    const knobs = (call.knobs ?? {}) as Record<string, unknown>
    // refs are a LAYER B (per-call) property — the reference bundle
    // rides the stanza; a refs-carrying call is t4r EVEN without a
    // guide still (the bundle IS the r2v input). The DECLARED input
    // surface (ref_images/ref_videos/ref_audios — Layer A, the
    // card's own params) implies t4r by the same law.
    const rb = (call.refs ?? {}) as Record<string, unknown>
    const declaredRefCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length
    const hasRefs = declaredRefCount + wireList(rb.images).length + wireList(rb.videos).length + wireList(rb.audios).length > 0
    const chainLike = i > 0 && overlap > 0
    const sf = num(call.start_frame)
    const ef = num(call.end_frame)

    // THE AUDIO CONDITIONING STAMPS (2026-09-21, generalized
    // 2026-09-22 to the D-M-E lanes): every window whose generation
    // span a clip rides HEARS that clip — one lane per CLASS, the
    // FIRST clip in row order winning its class's lane when several
    // of one class overlap one window (the authored primary). A clip
    // with no dur (or a sub-0.1s overlap) cannot size a slice and
    // stays overlay-only. Computed BEFORE the stanza: a stamped
    // window is a REFERENCE window (t4r) — the audio lanes only
    // exist on that arm (the bed's own law: it too counts as a ref).
    // THE STAMP (corrected 2026-09-22 while composing the
    // proof film — the first cut sliced the source AT the timeline
    // offset, so a clip starting mid-window conditioned the WRONG
    // PART of the audio, immediately: window 1 of a seam-spanning
    // dialogue heard the line's TAIL). The true law: the window's
    // generation render starts at doc frame sf − carry (the carry
    // head included — the model hears the whole generation span);
    // the clip sounds at generation offset (clip.start − genStart)
    // from its own source offset (genStart − clip.start). The
    // stamp therefore carries BOTH: the SOURCE segment to slice
    // [slice_start, +slice_dur) and the head silence (delay) that
    // places it — the builder chains Slice → the pin at
    // frame_idx = delay×24, fitted to the window's own generation
    // length. ONE delay number feeds BOTH the pin and the prompt
    // tag's clock — they cannot disagree.
    type Stamp = { src: string, slice_start_seconds: number, slice_duration_seconds: number, delay_seconds: number, text: string }
    const stamps: { dialogue?: Stamp, sfx?: Stamp, music?: Stamp } = {}
    if (sf !== null && ef !== null && Number.isFinite(sf) && Number.isFinite(ef) && ef > sf) {
      const carry = i > 0 ? overlap : 0
      const genStart = sf - carry
      for (let ci = 0; ci < clips.length; ci++) {
        const clip = clips[ci]!
        if (clip.dur <= 0) continue
        if (stamps[clip.cls] !== undefined) continue // one lane per class per window
        const lo = Math.max(clip.start, genStart)
        const hi = Math.min(clip.start + clip.dur, ef)
        if (hi - lo < 2.4) continue // below the slice node's 0.1s floor
        const ms = (frames: number): number => Math.round((frames / 24) * 1000) / 1000
        stamps[clip.cls] = {
          src: clip.src,
          slice_start_seconds: ms(Math.max(0, genStart - clip.start)),
          slice_duration_seconds: ms(hi - lo),
          delay_seconds: ms(Math.max(0, clip.start - genStart)),
          text: clip.text,
        }
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
    const stampClock = (t: number): string => {
      const mm = String(Math.floor(t / 60)).padStart(2, '0')
      const ss = String(Math.floor(t % 60)).padStart(2, '0')
      const mmm = String(Math.round((t % 1) * 1000)).padStart(3, '0')
      return `${mm}:${ss}.${mmm}`
    }
    if (stamps.dialogue !== undefined && stamps.dialogue.text !== '') {
      const t = stampClock(stamps.dialogue.delay_seconds)
      // SPEAKER-NEUTRAL (attempt-019 maker finding): the stamp once
      // hard-coded "She says" — a plainly male harbourmaster got a
      // female pronoun in his own mouth. The speaker is whoever the
      // window shows; the stamp never genders them.
      text = text.replace(/\s+$/, '') +
        `\n\noverall_soundscape:\nAt ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${stamps.dialogue.text}</d>`
    }
    if (stamps.sfx !== undefined && stamps.sfx.text !== '') {
      // THE ONE-CLOCK LAW (2026-09-24): an authored sfx text that already
      // opens with its own "At MM:SS.mmm," clock must not carry two clocks —
      // the stamp's clock is canonical, the authored one is trimmed.
      const sfxText = stamps.sfx.text
        .replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, '')
      text = text.replace(/\s+$/, '') +
        `\n\noverall_soundscape:\nAt ${stampClock(stamps.sfx.delay_seconds)}, ${sfxText}`
    }
    if (stamps.music !== undefined && stamps.music.text !== '') {
      text = text.replace(/\s+$/, '') +
        `\n\nnon_diegetic_music:\n${stamps.music.text}`
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
    const voicePinnedHere = stamps.dialogue !== undefined || stamps.sfx !== undefined
    const hearsRefAudio = !voicePinnedHere
      && (wireList(p.ref_audios).length > 0 || wireList(rb.audios).length > 0)
    if (stamps.dialogue === undefined && !hearsRefAudio && !/\bno[\s_-]*(speech|dialogue|voice)/i.test(text)) {
      text = text.replace(/\s+$/, '') +
        '\n\noverall_soundscape:\nNo speech or dialogue in this shot — ambient and effects only; nobody speaks on screen and there is no voice-over.'
    }
    const stanza: Record<string, unknown> = { ...p, ...knobs, prompt: text, k }
    const anyStamp = stamps.dialogue !== undefined || stamps.sfx !== undefined || stamps.music !== undefined
    stanza.variant = (guide !== '' || hasRefs || anyStamp) ? 't4r' : chainLike ? 't4_chain' : 't4_open'
    // the distill's steps apply unless this call's knobs pinned steps
    if (knobs.steps === undefined && loraStepsApplied !== null) stanza.steps = loraStepsApplied
    // THE DOOR GUARD, voice arm: a dialogue/sfx-pinned window mutes
    // the user ref audios (film-level and per-call) — the pins own
    // that window's audio conditioning; the ref doors reopen on
    // unstamped windows.
    const voicePinned = stamps.dialogue !== undefined || stamps.sfx !== undefined
    if (voicePinned) delete stanza.ref_audios
    if (hasRefs) stanza.refs = voicePinned && Array.isArray((call.refs as Record<string, unknown> | undefined)?.audios)
      ? { ...(call.refs as Record<string, unknown>), audios: undefined }
      : call.refs
    if (guide !== '') stanza.image = guide
    else delete stanza.image
    if (sf !== null && ef !== null && ef > sf) {
      // THE UNIFORM SPAN GATE, second door: a stale or hand-built
      // document re-rides the same law the walk admitted under, so
      // the compose carrier refuses an off-grid span before any node
      // is built (zero GPU) instead of trusting the render snap.
      assertSpanGrid(spans[i]!, `h3-timeline window ${k}`, chainLike ? overlap : 0)
    }
    // per-window length: the span rider law, unless the call's knobs pin one
    if (sf !== null && ef !== null && ef > sf && knobs.length === undefined) {
      // THE CARRY IS GENERATION (fixed 2026-09-23): the stanza
      // covers carry + span — the finalize trims the carried head
      // off the SAVED clip, so the span's tail must exist inside
      // the generation. chainLike is the render's own carry law
      // (i>0 and a non-cut seam) — the same number filmMix's
      // stanzaSecs states (the two-clocks law, still one owner).
      stanza.length = spanStanzaFrames(spans[i]!, chainLike ? overlap : 0)
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
        stanza.fps_seconds = Math.round(((stanza.length as number) / 24) * 1000) / 1000
      }
    }
    // THE GRID GATE (§26): a knob-pinned length bypassed the snap
    // above — validate, never trust. Refuses at compose (zero GPU)
    // with the span, the nearest legal length, and the proven
    // geometry in the message.
    assertGridLength(
      stanza.length,
      `h3-timeline window ${k} (span ${sf}→${ef})`,
    )
    if (i > 0) {
      stanza.__iteration = k - 1
      stanza.__overlap = overlap
    }
    if (prev !== undefined) stanza.__prev = prev
    // THE DOOR GUARD (2026-09-22, the operator's overlap law; the
    // bed arm retired with the bed the same day): a pinned window
    // owns its audio conditioning — the normal inputs stand down for
    // THAT window so nothing double-feeds the same generation. The
    // dialogue/sfx arm strips the user's ref_audios on stamped
    // windows (the pins own those lanes); the music arm has nothing
    // left to guard since the bed left. Per-window, never film-wide.
    assertOverlayGated(stanza, `h3-timeline window ${k} knobs`)
    // WINDOWS REMAIN TENSORS-FREE (§20, 2026-09-22): no accumulation
    // nodes, nothing holds a prior window's tensors — each window
    // frees after its own SaveVideo. The film tail below assembles
    // from the SAVED FILES (decode after every save), never from
    // window tensors.
    // the conditioning stamps ride the stanza (what THIS window
    // hears at generation — the Slice → pin chain reads them).
    if (stamps.dialogue !== undefined) stanza.dialogue_slice = stamps.dialogue
    if (stamps.sfx !== undefined) stanza.sfx_slice = stamps.sfx
    if (stamps.music !== undefined) stanza.music_slice = stamps.music
    const h = g.scoped(`window${k}_`, (w): WindowHandles => renderH3Window(stanza, w, facts))
    prev = h
    /* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets is refused loud at the film tail */
    if (h.savePassthrough !== undefined) windowSaves.push(h.savePassthrough)
  })
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
    throw new Error('[h3-timeline] a family arm saved no clip to pass the film boundary — the film tail cannot order its loads')
  }
  const manifest = computeFilmMix({
    spans,
    clips,
    windowSecs: stanzaSecs(spans),
    // the knob's declared default (−14) walks through the schema
    // door; computeFilmMix owns the fallback for the absent key
    duckDb: p.duck_depth_db as number | undefined,
  })
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
  let boundaryAfter: OutputHandle | undefined
  for (const save of windowSaves) {
    boundaryAfter = g.node('MeliteUnload', {
      video: save, unload_models: false,
      ...(boundaryAfter !== undefined ? { after: boundaryAfter } : {}),
    }).out(0)
  }
  const after = boundaryAfter!
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
      videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
      after,
      // the manifest rendered verbatim: every placement's source,
      // film seat, duration, and class — doc order kept (the node's
      // two loops read the same order the retired tail did)
      clips_json: JSON.stringify(manifest.placements.map((pl) => {
        const clip = clips[pl.clip]!
        return { src: clip.src, start_sec: pl.filmSec, dur_sec: pl.durSec, class: pl.cls }
      })),
      duck_spans: manifest.duckSpanString,
      music_duck_spans: manifest.musicDuckSpanString,
      duck_db: manifest.duckDb,
      film_seconds: manifest.filmSec,
    })
    // THE LOUDNESS METER (§39's owed Layer C node, 2026-09-25): a
    // passthrough tap between the mix and its consumers — the film's
    // integrated loudness (BS.1770-4, K-weighted + gated) rides the
    // history UI dict as loudness_lufs, so every surface REPORTS the
    // number instead of re-deriving it from the encoded file. The
    // AUDIO dict rides out unchanged (meter taps, never transforms);
    // calibrated against ffmpeg's ebur128 to within 0.1 LU on tones,
    // noise, gating, and mono.
    const meter = g.node('MeliteLoudness', { audio: mix.out(0) })
    g.node('SaveAudio', {
      audio: meter.out(0), filename_prefix: 'h3_t4_film_audio',
    })
    // THE FILM MP4 (GAP 1): the same file-tail video join the
    // clips-free arm rides — container mux only (CreateVideo +
    // SaveVideo h264/mp4 on the decoded window files), never the
    // mix. The mix rides it: audio carries the node's output.
    const join = g.node('MeliteConcatVideos', {
      videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
      after,
    })
    const filmCreated = g.node('CreateVideo', {
      images: join.out(0), audio: meter.out(0), fps: join.out(2), bit_depth: 8,
    })
    return g.node('SaveVideo', {
      video: filmCreated.out(), filename_prefix: 'h3_t4_film',
      format: 'mp4', codec: 'h264',
    }).out()
  }
  const concat = g.node('MeliteConcatVideos', {
    videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
    after,
  })
  const filmCreated = g.node('CreateVideo', {
    images: concat.out(0), audio: concat.out(1), fps: concat.out(2), bit_depth: 8,
  })
  return g.node('SaveVideo', {
    video: filmCreated.out(), filename_prefix: 'h3_t4_film',
    format: 'mp4', codec: 'h264',
  }).out()
}

/** The seam's cross-window wires: the RAW decode + sampler handles
 *  of one rendered window (pre-trim, pre-sharpen — the true tail). */
export interface WindowHandles {
  latOut: OutputHandle
  vdec: OutputHandle
  vadec: OutputHandle
  /** the DELIVERED clip — post-trim, post-sharpen: exactly the
   *  streams that window's own SaveVideo plays; the film concat's
   *  currency (the film must not differ from its windows). */
  filmImages: OutputHandle
  filmAudio: OutputHandle
  /** the window's SaveVideo VIDEO passthrough — the film tail's
   *  ordering wire: the MeliteUnload boundary consumes it, so the
   *  file loaders provably wait for the saves (and the passthrough
   *  tensor dies at the boundary — the §20 law). Assigned by BOTH
   *  family arms (every family path saves); the film tail refuses
   *  loud if a future arm forgets. */
  savePassthrough?: OutputHandle
}

function renderH3Window(
  p: Record<string, unknown>,
  g: GraphBuilder,
  facts: H3Facts,
): WindowHandles {
  // REFS IMPLY THE R2V LANE (the bundle IS the r2v input): a
  // refs-carrying window is t4r even without a guide still — the
  // same law the film renderer applies per call. The DECLARED input
  // surface (ref_images/ref_videos/ref_audios — the typed fields)
  // implies t4r by the same law.
  const rb0 = (p.refs ?? {}) as Record<string, unknown>
  const declaredCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length
  const hasRefs = declaredCount + wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0
  if (hasRefs && p.variant !== 't4r') p = { ...p, variant: 't4r' }
  const family = p.variant as Family
  if (!(FAMILIES as readonly string[]).includes(family)) {
    throw new Error(`unknown window family '${String(p.variant)}' (known: ${[...FAMILIES].sort().join(', ')})`)
  }
  const k = (p.k ?? 1) as number
  // THE GRID GATE (§26, defense in depth): no window renders
  // off-grid — the film loop's pin check voices the call span, this
  // one catches the single-call path and any direct caller.
  assertGridLength(p.length, `h3-timeline window ${k}`)
  const isT4r = family === 't4r'
  const isChain = family === 't4_chain'
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
  const prompt = (p.prompt ?? '') as string
  // card knob first (image), renderer alias second.
  const guideImage = (p.image ?? p.image_name ?? '') as string

  // ── the model chain (family-conditional defaults;
  // absent = absent on wire) ──
  const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true)
  const unet = g.node('UNETLoader', { unet_name: facts.unet, weight_dtype: 'default' }).out()
  const sla = g.node('H3SLAAttention', {
    model: unet,
    sparsity_ratio: p.sla_sparsity as number,
    block_size: p.sla_block_size as string,
    min_seq_len: p.sla_min_seq_len as number,
    dense_last_steps: p.sla_dense_last_steps as number,
    protect_audio: p.sla_protect_audio as boolean,
    enabled: true,
    dense_steps: p.sla_dense_steps as string,
    dense_backend: p.sla_dense_backend as string,
    disable_fp16_accum: p.sla_disable_fp16_accum as boolean,
    stabilize_motion: stabilize,
    reference_protection: p.sla_reference_protection as string,
  }).out()
  const chunked = g.node('MiniMaxChunkFeedForward', {
    model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
    chunks: 2, seq_threshold: 4096,
  }).out()
  // THE LORAS MOD PLANE (the operator's law: "MOD SYSTEM IS CORE.
  // NEVER HARDCODED"; 2026-09-21: "LORAS ARE ONLY MODS" — the raw
  // `lora_stack` string field is DEAD): the studio/agent surface
  // writes the mod bag `loras` — [{id, strength}] rows the service
  // resolves to {name, strength} filenames against the family's
  // flavor catalog. Those rows build the upstream stack verbatim
  // ({on, lora, str, v:1, a:1, t:1}); an empty bag rides the frozen
  // gold solo (turbo 0.6 — plaguekind 1:1, the mod plane's own
  // default). ONE surface, one owner.
  const loraStack = Array.isArray(p.loras) && (p.loras as unknown[]).length > 0
    ? JSON.stringify((p.loras as Array<Record<string, unknown>>).map((r) => ({
        // the service resolves every row against the family catalog
        // (unknown ids refuse LOUD upstream) — {name, strength} is
        // the guaranteed wire shape, read directly
        on: true,
        lora: r.name as string,
        str: r.strength as number,
        v: 1, a: 1, t: 1,
      })))
    : LORA_STACK_GOLD
  // t4r templates carry shift_video 8.0; the t4 family carries the INT
  // NO SILENT RESOLUTION LAW: the walked shift_video IS the value
  // (declared default 8; the family literals retired with the
  // nulling that fed them — 8.0 and 8 serialize identically anyway)
  const shiftVideo = p.shift_video as number

  const clip = g.node('CLIPLoader', {
    clip_name: facts.clip, type: 'minimax',
    ...(isT4r ? { device: 'default' } : {}),   // t4 templates OMIT it
  }).out()
  const vaeVideo = g.node('VAELoader', { vae_name: facts.vae_video }).out()
  const vaeAudio = g.node('VAELoader', { vae_name: facts.vae_audio }).out()

  let cond: OutputHandle
  let latent: OutputHandle
  let sigmaModel: OutputHandle
  let fpsInput: OutputHandle | number

  if (isT4r) {
    // opener: switch(SLABool) picks SLA-direct vs chunked; lora rides
    // the switch; preview override wired to the in-graph step count.
    // Inject semantics: an injected SCALAR replaces the bool NODE
    // (template link severed, node orphaned) — mirrored by passing the
    // scalar straight when sla_switch is set. sla_enabled=false
    // forces the chunked (SLA-off) path; otherwise the legacy
    // sla_switch spelling rides untouched.
    const fpsNode = g.node('PrimitiveFloat', { value: 24.0 }).out()  // id .0 — CreateVideo.fps walks first
    let slaSel: OutputHandle | boolean | null = (p.sla_enabled as boolean | undefined) === false
      ? true
      : ((p.sla_switch as boolean | undefined) ?? null)
    if (slaSel === null) slaSel = g.node('PrimitiveBoolean', { value: false }).out()
    const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out()
    const loraModel = g.node('LTX_lora_loader', {
      model: picked, mode: 'minimax', stack_data: loraStack, lora_ui: '',
    }).out()
    const seconds = g.node('PrimitiveFloat', { value: p.fps_seconds as number }).out()  // id .1
    const lengthNode = g.node('ComfyMathExpression', {
      expression: MATH_STEPS_GOLD, 'values.a': seconds,
    }).out(1)
    const previewed = g.node('ModelPreviewOverrideKJ', {
      max_resolution: 512, jpeg_quality: 80,
      suppress_default_preview: true, preview_frames: lengthNode,
      preview_fps: 8, tiny_vae: 'none', model: loraModel,
    }).out()
    const adaln = g.node('H3AdaLNLoRAFix', { model: previewed, mode: 'port' }).out()
    sigmaModel = g.node('MiniMaxH3SigmaShift', {
      model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio as number,
    }).out()

    // THE ANCHOR + THE REFERENCE BUNDLE (the operator's distinction,
    // 2026-09-17): `image` is the call's FIRST FRAME anchor (input_1,
    // the frozen served shape); `refs` is the call's REFERENCE bundle
    // — the upstream "Extra References" subgraph's own vocabulary
    // (LoadImage → the ref resizer; LoadVideo → GetVideoComponents →
    // the image+audio component pair; LoadAudio). Bundle layout (the
    // slot map): inputs 1-9 images (anchor first), 10/12/14
    // video image streams, 11/13/15 video audio streams, 16-18
    // audios. RESIZER ORDER IS PINNED: the serialized walk reaches
    // the reference resizer (bundle → r2v refs) before the geometry
    // resizer (i2v) — creation mirrors the walk.
    const refBag = (p.refs ?? {}) as Record<string, unknown>
    // THE DECLARED-SURFACE MERGE (the input rail's law): the typed
    // fields (ref_images/ref_videos/ref_audios — Layer A, stamped
    // onto every stanza) are PRIMARY; the legacy stanza bag's
    // entries append, deduped. One wire form, one reader.
    const declaredImages = wireList(p.ref_images)
    const declaredVideos = wireList(p.ref_videos)
    const declaredAudios = wireList(p.ref_audios)
    // THE 9-SLOT IMAGE BUS (the bundle's own topology — the compose
    // and the UI agree or they lie): inputs 1-9 are IMAGE slots —
    // the anchor at 1, the FL2VA pair's END anchor at 2 when
    // last_frame is set, references at 3..9 (7 with an end anchor,
    // 8 riding input_2..9 without one); input_10 begins the video
    // lanes. A 9th ref would land ON input_10 — the first video's
    // image stream — and be silently clobbered; the law refuses
    // LOUD instead.
    const lastFrame = (p.last_frame ?? '') as string
    const refImagesAll = mergeDeclaredRefs(declaredImages, wireList(refBag.images))
    const imageCap = imageReferenceCap(lastFrame !== '')
    if (lastFrame !== '' && refImagesAll.length > imageCap) {
      throw new Error(`[h3-timeline] the image bus is full: a last frame (input 2) + ${String(refImagesAll.length)} references exceeds the ${IMAGE_BUS_SLOTS}-slot bus — keep references ≤ ${imageCap} with an end anchor (≤ ${REF_CAPS.images} without)`)
    }
    const refImages = refImagesAll.slice(0, imageCap)
    const refVideos = mergeDeclaredRefs(declaredVideos, wireList(refBag.videos)).slice(0, REF_CAPS.videos)
    const refAudios = mergeDeclaredRefs(declaredAudios, wireList(refBag.audios)).slice(0, REF_CAPS.audios)
    // a tensor carrier: a node's output handle, or the spell arm's
    // raw '$name' wire value (the lanes-image grammar, local)
    type TensorRef = OutputHandle | string
    const bundleInputs: Record<string, TensorRef> = {}
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
    const isSpell = (s: string): boolean => s.startsWith('$')
    const imageRef = (src: string): TensorRef =>
      isSpell(src) ? src : g.node('LoadImage', { image: src }).out()
    let anchorRaw: TensorRef | undefined
    if (guideImage !== '') {
      anchorRaw = imageRef(guideImage)
      bundleInputs.input_1 = g.node('UnifiedResizeImageMask', {
        image: anchorRaw, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    }
    // THE FL2VA END ANCHOR: input_2 is the pair's second seat — the
    // i2v branch reads out(0)/out(1) as first/last frame verbatim.
    // Without an end anchor, refs ride from input_2 (legacy shelf).
    const resizeRef = (src: string): OutputHandle => g.node('UnifiedResizeImageMask', {
      image: imageRef(src), scale_mode: 'Shorter Side',
      aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
      short_side_target: 2048.0, width: 1024.0, height: 1024.0,
      multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
      crop: 'center', divisible_by: 32.0, maintain_aspect: false,
    }).out()
    if (lastFrame !== '') bundleInputs.input_2 = resizeRef(lastFrame)
    const firstFreeSlot = lastFrame !== '' ? 3 : 2
    refImages.forEach((src, i) => {
      const img = imageRef(src)
      if (anchorRaw === undefined && i === 0) anchorRaw = img
      bundleInputs[`input_${firstFreeSlot + i}`] = g.node('UnifiedResizeImageMask', {
        image: img, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    })
    refVideos.forEach((src, i) => {
      // the spelled motion guide rides GetVideoComponents' tensor
      // input directly (the producer's pre-save video tensor); a
      // path keeps the LoadVideo disk handoff.
      const vid: TensorRef = isSpell(src) ? src : g.node('LoadVideo', { file: src }).out()
      const comp = g.node('GetVideoComponents', { video: vid })
      bundleInputs[`input_${10 + 2 * i}`] = comp.out(0)
      bundleInputs[`input_${11 + 2 * i}`] = comp.out(1)
    })
    refAudios.forEach((src, i) => {
      // the spelled sound reference rides the bundle's audio seat
      // directly (the producer's audio tensor); a path keeps
      // LoadAudio.
      bundleInputs[`input_${16 + i}`] = isSpell(src)
        ? src
        : g.node('LoadAudio', { audio: src }).out()
    })
    // the geometry resizer (i2v's dead branch): fed by the anchor, or
    // the first ref image, or — anchorless and imageless — pinned to
    // the literals the geo node's own defaults produce (the branch is
    // never selected; r2vBool pins true below).
    const geoSrc = anchorRaw ?? bundleInputs.input_2
    let geoW: OutputHandle | number = 768.0
    let geoH: OutputHandle | number = 1344.0
    if (geoSrc !== undefined) {
      const geo = g.node('UnifiedResizeImageMask', {
        image: geoSrc, scale_mode: 'Total Pixels (MP)',
        aspect_ratio: '3:4 (Portrait Standard)', long_side_target: 1280.0,
        short_side_target: 768.0, width: 768.0, height: 1344.0,
        multiplier: 1.0, megapixels: 0.98, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      })
      geoW = geo.out(2)
      geoH = geo.out(3)
    }
    const bundle = g.node('PlagueKindBundleIn', bundleInputs).out()
    const bout = g.node('PlagueKindBundleOut', { bundle })
    // declared knobs hoisted: the compose walk fills their defaults
    // (probe 2026-09-19) — the ?? literals are the pre-walk fence
    const refSize = p.ref_image_size as string

    const r2vInputs: Record<string, OutputHandle | string | number> = {
      prompt, width: p.width as number, height: p.height as number,
      length: lengthNode, ref_image_size: refSize,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    }
    for (let i = 0; i <= 8; i++) r2vInputs[`ref_images.ref_image_${i}`] = bout.out(i)
    for (let i = 0; i < 3; i++) {
      r2vInputs[`ref_videos.ref_video_${i}`] = bout.out(9 + 2 * i)
      r2vInputs[`ref_video_audios.ref_video_audio_${i}`] = bout.out(10 + 2 * i)
      r2vInputs[`ref_audios.ref_audio_${i}`] = bout.out(15 + i)
    }
    // (THE BED IS GONE, 2026-09-22: the user's three ref_audios ride
    // their natural lanes above — no slice, no shift, no fourth
    // anything.)
    let dialogueAudio: OutputHandle | undefined
    let dialogueFrameIdx = 0
    let sfxAudio: OutputHandle | undefined
    let sfxFrameIdx = 0
    let musicAudio: OutputHandle | undefined
    let musicFrameIdx = 0
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
      // THE D-M-E LANES (2026-09-22): one stamp per class — the
      // same slice law, the same pin law, three prompt fields. The
      // dialogue stamp keeps the measured shape (walls ride it);
      // sfx/music stamps are the same machinery on their lanes.
      type StampShape = { src: string, slice_start_seconds: number, slice_duration_seconds: number, delay_seconds: number, text?: string }
      const read = (key: string): StampShape | null => (p[key] ?? null) as StampShape | null
      const stamp = read('dialogue_slice')
      if (stamp !== null) {
        dialogueAudio = g.node('MeliteAudioSlice', {
          audio: stamp.src,
          start_seconds: stamp.slice_start_seconds,
          duration_seconds: stamp.slice_duration_seconds,
        }).out(0)
        dialogueFrameIdx = Math.round(stamp.delay_seconds * 24)
      }
      const sfxStamp = read('sfx_slice')
      if (sfxStamp !== null) {
        sfxAudio = g.node('MeliteAudioSlice', {
          audio: sfxStamp.src,
          start_seconds: sfxStamp.slice_start_seconds,
          duration_seconds: sfxStamp.slice_duration_seconds,
        }).out(0)
        sfxFrameIdx = Math.round(sfxStamp.delay_seconds * 24)
      }
      const musicStamp = read('music_slice')
      if (musicStamp !== null) {
        musicAudio = g.node('MeliteAudioSlice', {
          audio: musicStamp.src,
          start_seconds: musicStamp.slice_start_seconds,
          duration_seconds: musicStamp.slice_duration_seconds,
        }).out(0)
        musicFrameIdx = Math.round(musicStamp.delay_seconds * 24)
      }
    }
    const r2v = g.node('MiniMaxH3ReferenceToVideo', r2vInputs)
    // THE ORPHANED I2V MARKER (2026-09-26): registered so the
    // serialized graph carries the t4r family key (finalizeH3's
    // marker), wired to the geometry/anchor slots it always read —
    // but consumed by NOTHING. The old shape routed r2v through a
    // hardcoded-true ComfySwitchNode whose on_false arm was this
    // node: never selected, yet a flipped switch would have run the
    // gold prompt. Direct wiring + an orphan = one lane, one truth.
    g.node('MiniMaxH3ImageToVideo', {
      prompt: I2V_MARKER_PROMPT, width: geoW, height: geoH,
      length: lengthNode, context_steps: 1, audio_context_steps: 0,
      clip, vae: vaeVideo, first_frame: bout.out(0), last_frame: bout.out(1),
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    fpsInput = fpsNode
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
      }).out(0)
    }
    if (sfxAudio !== undefined) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: sfxFrameIdx,
        audio_vae: vaeAudio, audio: sfxAudio,
      }).out(0)
    }
    if (musicAudio !== undefined) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: musicFrameIdx,
        audio_vae: vaeAudio, audio: musicAudio,
      }).out(0)
    }
  } else {
    // t4 families: chunked chain rides lora, switch picks SLA-direct
    // vs ModelAttentionBackend. The pin autofills the builder adds
    // (lora_ui, the SeedVR2 tile/offload inputs) are stripped by the
    // finalize pass — the python's _T4_AUTOFILL_STRIP mirror.
    const loraModel = g.node('LTX_lora_loader', {
      model: chunked, mode: 'minimax', stack_data: loraStack,
    }).out()
    const mab = g.node('ModelAttentionBackend', {
      model: loraModel,
      // schema-defaulted knob (the vocabulary door guarantees the
      // field — 'comfy kitchen attention' when the caller stays
      // silent; no compose-side fallback arm to keep alive)
      attention: p.attention_backend as string,
    }).out()
    const picked = g.node('ComfySwitchNode', {
      // THE SLA MASTER SWITCH (2026-09-21): sla_enabled=false takes
      // the dense arm; absent = on (every existing doc). The legacy
      // `?? sla_switch ?? true` arms died 2026-09-22 by the
      // no-silent-resolution law: sla_enabled is DECLARED with
      // .default(true), so the walk always delivers a boolean and
      // the fallback arms were unreachable lies.
      switch: p.sla_enabled as boolean, on_true: sla, on_false: mab,
    }).out()
    const adaln = g.node('H3AdaLNLoRAFix', { model: picked, mode: 'port' }).out()
    sigmaModel = g.node('MiniMaxH3SigmaShift', {
      model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio as number,
    }).out()
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
  const length = p.length as number
    const r2v = g.node('MiniMaxH3ReferenceToVideo', {
      prompt, width: p.width as number,
      height: p.height as number, length: length as number,
      ref_image_size: p.ref_image_size as string,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    fpsInput = 24
  }

  // ── sampler stack ──────────────────────────────────────────────────
  // card knob first (seed), renderer alias second.
  const noise = g.node('RandomNoise', { noise_seed: (p.noise_seed ?? p.seed) as number }).out()
  const samplerSel = g.node('KSamplerSelect', { sampler_name: p.sampler_name as string }).out()
  let sampler: OutputHandle
  if (isT4r) {
    sampler = samplerSel
  } else {
    const ersde = g.node('SamplerER_SDE', {
      solver_type: 'ODE', max_stage: 3, eta: 0.0, s_noise: 1.0,
    }).out()
    // template carries switch=false as a LITERAL, not a bool node
    sampler = g.node('ComfySwitchNode', { switch: false, on_true: ersde, on_false: samplerSel }).out()
  }
  const schedName = p.sched_name as string
  const denoiseVal = p.denoise as number
  const sched = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: schedName,
    steps: p.steps as number, denoise: denoiseVal,
  }).out()
  let guider = g.node('BasicGuider', { model: sigmaModel, conditioning: cond }).out()
  let targetLatent = latent

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
    const prev = p.__prev as WindowHandles | undefined
    /* v8 ignore next 1 -- the film loop stamps __iteration on every window k≥2 before the render (the seam block mounts only when it did) */
    const iteration = (p.__iteration as number) ?? 0
    /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the seam block mounts only when it did) */
    const overlap = (p.__overlap as number) ?? 0
    if (prev !== undefined && overlap > 0) {
      const cont = g.node('MiniMaxH3FiniteLatentContinuation', {
        positive: cond, target_latent: targetLatent,
        iteration, overlap_frames: overlap,
        continue_audio_latent: true,
        model: sigmaModel, sigmas: sched,
        previous_latent: prev.latOut,
      })
      cond = cont.out(0)
      targetLatent = cont.out(1)
      guider = g.node('BasicGuider', { model: cont.out(3), conditioning: cont.out(0) }).out()
    }
  }
  const sampled = g.node('SamplerCustomAdvanced', {
    noise, guider, sampler, sigmas: sched, latent_image: targetLatent,
  })
  let latOut = sampled.out(0)

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
  const secondPassOn = p.second_pass_enabled === true
  const refine = secondPassOn ? (p.refine as { name: string, strength: number, steps: number } | undefined) : undefined
  if (refine !== undefined) {
    const refineModel = g.node('LTX_lora_loader', {
      model: sigmaModel, mode: 'minimax',
      stack_data: JSON.stringify([{ on: true, lora: refine.name, str: refine.strength, v: 1, a: 1, t: 1 }]),
      lora_ui: '',
    }).out()
    const refineSched = g.node('BasicScheduler', {
      model: refineModel, scheduler: schedName,
      steps: refine.steps, denoise: 1.0,
    }).out()
    const refineGuider = g.node('BasicGuider', { model: refineModel, conditioning: cond }).out()
    const refined = g.node('SamplerCustomAdvanced', {
      noise, guider: refineGuider, sampler: samplerSel, sigmas: refineSched, latent_image: latOut,
    })
    latOut = refined.out(0)
  }

  // ── decode + save ──────────────────────────────────────────────────
  let vdec = g.node('VAEDecode', { samples: latOut, vae: vaeVideo }).out()
  let vadec = g.node('VAEDecodeAudio', { samples: latOut, vae: vaeAudio }).out()
  // the RAW audio head is the soft seam's currency — the film's join
  // takes the incoming window's UNTRIMMED opening (it owns the seam);
  // captured BEFORE the clip finalize trims the overlap off
  let vadecRaw: OutputHandle | undefined
  // `delivered` fills at the save branches (both families save)
  let delivered: { images: OutputHandle, audio: OutputHandle } | null = null
  const rawHandles: WindowHandles = { latOut, vdec, vadec, filmImages: latOut, filmAudio: latOut }
  if (isChain || isT4r) {
    const prev = p.__prev as WindowHandles | undefined
    /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the block mounts only when it did) */
    const overlap = (p.__overlap as number) ?? 0
    if (prev !== undefined && overlap > 0) {
      vadecRaw = vadec
      // the window's OWN clip: the carried overlap leaves picture AND
      // sound by the same duration (their finalize, hard audio trim —
      // a clip never replays the seam it grew from)
      const fin = g.node('MiniMaxH3FiniteSegmentFinalize', {
        sampled_latent: latOut, images: vdec, audio: vadec,
        iteration: 1, overlap_frames: overlap, trim_audio_head: true,
      })
      vdec = fin.out(1)
      vadec = fin.out(2)
    }
  }
  if (isT4r) {
    const created = g.node('CreateVideo', {
      images: vdec, audio: vadec, fps: fpsInput, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    // ONE WINDOW-NAMING LAW (2026-09-22, the file-tail amendment):
    // every window saves under h3_t4_w<k> — the t4r arm's legacy
    // 'video/ComfyUI' prefix died (multi-window anchored films were
    // unaddressable: every window collided on one prefix, and the
    // file tail's loader could not name them).
    const saved = g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'auto', codec: 'h264',
      'codec.encoding': 're-encode', 'codec.encoding.crf': 10.0,
    })
    rawHandles.savePassthrough = saved.out(0)
    delivered = { images: vdec, audio: vadec }
  } else {
    // sharpen leaves: only the EXPLICITLY-set ones patch the grouped
    // dict (absent leaves keep ImageSharpenKJ's own defaults). The old
    // card knob (sharpen_strength) rides the leaf loop like
    // the renderer alias does.
    const method: Record<string, string | number> = { ...SHARPEN_DEFAULTS }
    const sharpenLeaves: ReadonlyArray<readonly [string, string]> = [
      ['sharpen_method', 'method'], ['sharpen_strength', 'strength'],
      ['sharpen_radius', 'radius'], ['sharpen_threshold', 'threshold'],
      ['sharpen_iterations', 'iterations'],
    ]
    for (const [src, dst] of sharpenLeaves) {
      const val = p[src]
      if (val !== null && val !== undefined) method[dst] = val as string | number
    }
    // ── V9 tail order (re-cut 2026-09-15, the operator's cause) ──
    // upstream moved sharpen LAST: interp → VSR → sharpen → CreateVideo
    // (V7/ours sharpened FIRST — before the upscaler could soften the
    // detail away). Sharpen rcas 0.3 after upscale "looks natural"
    // (his V9 notes). The switches stay ours; the ORDER is his.
    const film = g.node('FrameInterpolationModelLoader', {
      model_name: p.interp_model as string,
    }).out()
    const interpMultVal = p.interp_multiplier as number
    const interp = g.node('FrameInterpolate', {
      interp_model: film, images: vdec, multiplier: interpMultVal,
    }).out()
    // ONE OWNER (2026-09-20): interpolate_enabled owns the switch
    // (declared default false). The legacy interp_switch alias is
    // retired — post-declaration the walk materializes the primary,
    // so the alias arm was unreachable dead law.
    const interpSwOn = secondPassOn && (p.interpolate_enabled as boolean)
    const interpSw = g.node('ComfySwitchNode', {
      switch: interpSwOn, on_true: interp, on_false: vdec,
    }).out()
    const srRes = p.sr_resolution as number
    const sr = g.node('SeedVR2VideoUpscaler', {
      image: interpSw,
      dit: g.node('SeedVR2LoadDiTModel', {
        model: p.sr_model as string, device: 'cuda:0',
      }).out(),
      vae: g.node('SeedVR2LoadVAEModel', {
        model: 'ema_vae_fp16.safetensors', device: 'cuda:0',
      }).out(),
      seed: 42, resolution: srRes,
      max_resolution: 0, batch_size: 5, uniform_batch_size: false,
      color_correction: 'lab',
    }).out()
    const srSwOn = secondPassOn && (p.sr_switch as boolean)
    const srSw = g.node('ComfySwitchNode', {
      switch: srSwOn, on_true: sr, on_false: interpSw,
    }).out()
    // sharpen LAST (V9): the upscaler softens; rcas after it restores.
    // Renderer alias second (sharpen_* leaves above build the method).
    const sharpened = g.node('ImageSharpenKJ', { image: srSw, method }).out()
    const sharpSw = g.node('ComfySwitchNode', {
      switch: secondPassOn && (p.sharpen_enabled as boolean), on_true: sharpened, on_false: srSw,
    }).out()
    // fps compensation (V9, 2026-09-15): upstream wires
    // CreateVideo.fps = base × interp multiplier (his Enhancements:
    // PrimitiveFloat 24 → ComfyMathExpression "a * 2" → fps). Without
    // it every interp-on window plays at HALF speed — the frames
    // double, the fps doesn't. Byte-stable at defaults (interp off →
    // the served literal 24).
    const interpOn = secondPassOn && (p.interpolate_enabled as boolean)
    const interpMult = p.interp_multiplier as number
    const created = g.node('CreateVideo', {
      images: sharpSw, audio: vadec, fps: interpOn ? 24 * interpMult : 24, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    const saved = g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'mp4', codec: 'h264',
    })
    rawHandles.savePassthrough = saved.out(0)
    delivered = { images: sharpSw, audio: vadec }
  }

  // (every family path delivers — both arms save the window's clip;
  // no null arm: the family dispatch is exhaustive over FAMILIES.
  // The old MotionContextSaveLatent persistence died with the seam —
  // cross-run continuity is the FL2VA anchor: set the first-frame
  // square to the previous film's last frame, latent-true.)
  rawHandles.filmImages = (delivered as { images: OutputHandle, audio: OutputHandle }).images
  // THE FILM'S AUDIO SEAM CURRENCY: a carried window hands the film
  // its UNTRIMMED opening (the soft-released head owns the join);
  // every other window hands its delivered audio
  rawHandles.filmAudio = vadecRaw !== undefined
    ? vadecRaw
    : (delivered as { images: OutputHandle, audio: OutputHandle }).audio
  return rawHandles
}

/** The film action — the h3 family's whole compose segment. The
 * doc arrives gated + lifted from the card; the build owns the
 * lane admissions and both renderers, byte-identical to the card's
 * legacy fallback. */
/** The sampler row the h3 schema itself serves: the ONE engine
 * vocabulary read through the family's recommended subset (the
 * schema's own filter law — a retyped list would be a second
 * SSOT). */
const H3_SAMPLER_OPTIONS: readonly string[] = SAMPLER_OPTIONS.filter((n) =>
  (H3_RECOMMENDED_SAMPLERS as readonly string[]).includes(n));

export const film: ComfyActionSpec<Record<string, unknown>, H3Facts> = {
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
    { name: "sla_min_seq_len", type: "number" },
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
  build({ p: docIn, facts, g }): OutputHandle {
    const p = { ...(docIn as Record<string, unknown>) }
    const guideImage = (p.image ?? p.image_name ?? '') as string
    if (p.variant === 't4r' && !guideImage) {
      // (refs-implied t4r windows carry no anchor — the bundle IS
      // the r2v input; the guard admits them via the refs law — the
      // legacy stanza bag AND the declared input surface (the rail's
      // fields) count; the bed rides the audio lane guideless too)
      const rbRef = (p.refs ?? {}) as Record<string, unknown>
      const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
        + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
        || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '')
      if (!refsCarry) {
        throw new Error(
          'h3_window(t4r): image-anchored window without a staged guide image — ' +
          'compose always injects LoadImage.0.image on this family')
      }
    }
    // THE FILM DISPATCH: a multi-call chain doc with no per-window
    // stanza markers (k absent — the stanza vocabulary) composes
    // the MERGED film; everything else is the frozen single-window
    // shape (served byte-identical).
    const docCalls = Array.isArray(p.calls) ? p.calls : null
    const isFilm = docCalls !== null && (docCalls as unknown[]).length > 1
      && p.k === undefined && (p.variant === undefined || p.variant === 't4_chain')
    if (isFilm) return renderH3Film(p, g, facts)
    // THE CLIPS-STITCH LAW (2026-09-21): the Music row's mix is a
    // FILM-path consumer (it rides the accumulated film audio).
    // On the frozen single-window shape it would be a silent
    // skip — the crime class this estate refuses. Loud, with the
    // fix in the message (the studio's own doc always carries
    // calls; a second short call unlocks the film path).
    const clips = (p.audio_clips ?? []) as unknown[]
    if (clips.some((c) => c !== null && typeof c === 'object'
      && typeof (c as Record<string, unknown>).src === 'string' && ((c as Record<string, unknown>).src as string).trim() !== '')) {
      throw new Error(
        'h3-timeline: audio clips ride the FILM path — this single-window doc has clips but no film to mix over ' +
        '(add a second call to author a film, or clear the Music row)',
      )
    }
    // LORA STEPS APPLIED (2026-09-18): the single-window shape
    // honors the distill bag's steps the same way (no knob layer
    // here — the entry's steps IS the user's word).
    if (Array.isArray(p.loras)) {
      const rows = p.loras as Array<Record<string, unknown>>
      const applied = rows.map((r) => r.steps).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      if (applied.length > 0) p.steps = Math.max(...applied)
    }
    return renderH3Window(p, g, facts).savePassthrough!
  },
}
