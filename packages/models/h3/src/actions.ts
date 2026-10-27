// The h3 family's declared action (the atom vocabulary, stroke 3,
// the video leg — the LAST family): the film renderer. ONE family
// owns the whole surface (the one-model law): the multi-window
// film and the frozen single-window shape are both THIS action's
// build — the action is the SINGLE SEAT of the renderer body; the
// card dispatches here and refuses any undeclared family loud
// (card.ts: no declared action → throw, never a legacy fallback),
// so there is no second copy to keep true.
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
import { fireControlNets } from '@melite/comfyui-card-kit/guard'
import type { ModBoarding } from '@melite/comfyui-card-kit/guard'
import { saveAudio } from '@melite/comfyui-card-kit'
import { mediaKindOf } from '@melite/contracts/mediaKinds'
import { assertKeyframeRowShape, FAMILIES, paramSchema, wireList, H3_RECOMMENDED_SAMPLERS } from './schema.js'
import { H3_LORA_ROWS } from '@melite/models-h3/mods/loras'
import type { Family } from './schema.js'
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@melite/comfyui-card-kit/vocab'
import { computeFilmMix, parseFilmMixClips, stanzaSecs } from './filmMix.js'
import type { FilmMixClip, FilmMixSpan } from './filmMix.js'
import {
  GRID_REMAINDER,
  GRID_STEP_FRAMES,
  IMAGE_BUS_SLOTS,
  REF_CAPS,
  assertGridLength,
  assertSpanGrid,
  imageReferenceCap,
  isMediaRef,
  DOC_FPS_DEFAULT,
  spanStanzaFrames,
  transitionOverlap,
} from './timelineContract.js'

// THE ABSENT-BAG DEFAULT (h3-a, 2026-10-12; bytedance DMAD row
// 2026-10-11 → the LightX2V Turbo 8-Step v1.0 row 2026-11-07 —
// operator: the card's default lora is the 8-step light tricks): the
// h3_turbo8_v1 row, built from the family lora
// CATALOG (mods/loras.ts — the one owner of every lora filename and
// default strength; the value was restated as a literal here, which
// is how a catalog edit would have silently missed the default).
// The wire shape matches a resolved bag row: on, lora (filename),
// str (default_strength), plus the four fixed mode flags. A missing
// catalog row refuses at load — the default would have no source.
const loraStackDefault = (): string => {
  const row = H3_LORA_ROWS.find((r) => r.id === 'h3_turbo8_v1')
  if (row === undefined) {
    throw new Error("h3 action: the lora catalog has no 'h3_turbo8_v1' row — the absent-bag default has no source; fix the catalog row id")
  }
  return JSON.stringify([{ on: true, lora: row.filename, str: row.default_strength, v: 1, a: 1, t: 1 }])
}

// THE MARRIED-KNOB CONSULT (SOTA limb 2, 2026-10-20 — the steps
// marriage's own math, one spelling for both knobs): while a
// counting bag row rides, the married knob (steps, shift_video) is
// the ROW'S — stated on the entry first, else the catalog row's
// declared default, Math.max across the bag ("8 steps on a 4-step
// distill is fine, 4 on an 8-step is undercooked"; the shift grid
// follows the same highest-count-wins law — the 8-step member of a
// stacked pair owns the grid). The estate's resolver stamps the
// row's defaults onto resolved wire rows; hand-authored and
// agent-shaped bags fall back to the catalog row BY FILENAME (the
// wire's `name` — fictional filenames marry nothing, the
// door-spec's walk-default law). PURE, no I/O.
const marriedBagKnob = (
  p: Record<string, unknown>,
  knob: 'steps' | 'shift_video',
): number | null => {
  if (!Array.isArray(p.loras)) return null
  const counts: number[] = []
  for (const row of p.loras as Array<Record<string, unknown>>) {
    if (row === null || typeof row !== 'object') continue
    const stated = row[knob]
    if (typeof stated === 'number' && Number.isFinite(stated)) {
      counts.push(stated)
      continue
    }
    const name = row['name']
    const fromCatalog = typeof name === 'string'
      ? H3_LORA_ROWS.find((r) => r.filename === name)?.[knob]
      : undefined
    if (typeof fromCatalog === 'number' && Number.isFinite(fromCatalog)) counts.push(fromCatalog)
  }
  return counts.length > 0 ? Math.max(...counts) : null
}
// THE REFINE-SEAT ASSEMBLY (purge P2 h3 hop-5, 2026-11-08 — the
// refine seats were served-but-dead: the schema admits refine_lora /
// _strength / _steps and the film params row carries them, but
// nothing built the rider's {name, strength, steps} object, so the
// T3 rider never mounted and the plain pass rendered under stating
// seats). The assembly lives HERE — inside renderH3Window, the
// single choke point both the film loop and the single-window face
// call — so neither face can mount the rider without it (the G6
// two-face law). Unknown ids refuse LOUD naming refine_lora (the
// schema's LORAS-ARE-ONLY-MODS promise); master-off or empty id =
// no rider (the legacy byte-stable plain pass).
function resolveRefineSeat(p: Record<string, unknown>): { name: string; strength: number; steps: number; denoise: number } | undefined {
  if (p.second_pass_enabled !== true) return undefined
  const id = p.refine_lora
  if (typeof id !== "string" || id === "") return undefined
  const row = H3_LORA_ROWS.find((r) => r.id === id)
  if (row === undefined) {
    throw new Error(`h3 action: refine_lora '${id}' names no served loras row — pick from the flavor catalog, never a hand-spelled id (the compose door refuses unknown ids loud)`)
  }
  // THE ROW DOMAIN (purge F2 re-home, 2026-11-08 — the service's
  // refine-steps-range law moves here, its only assembler: a stated
  // count outside the named row's declared [min, max] refuses LOUD
  // naming the domain. The door carries NO steps-required or
  // strength-fallback branches: every served row declares steps +
  // default_strength (the wall's ARM 9 locks the 11/11), so those
  // branches would be dead code refusing coverage. The table is an
  // `as const` union where only domain rows carry steps_min/max, so
  // the bounds read through `in`-narrowing (no cast, no table touch).
  const steps = ((p.refine_steps as number | undefined) ?? row.steps)
  const lo = ('steps_min' in row) ? row.steps_min : undefined
  const hi = ('steps_max' in row) ? row.steps_max : undefined
  if ((lo !== undefined && steps < lo) || (hi !== undefined && steps > hi)) {
    throw new Error(`h3 action: refine_steps ${steps} for refine_lora '${id}' falls outside the row's declared domain [${lo ?? '…'}, ${hi ?? '…'}] — pick a count the instrument serves, never force one (the compose door enforces the row domain)`)
  }
  // THE REFINE WINDOW (SOTA plan limb 1, H3_TIMELINE_RESERACH Stage
  // 3; RE-TUNED by the P0 parameter audit, 2026-11-10): unstated
  // rides the DECLARED 0.35 default — the research's refinement
  // window (0.30–0.35: pass 1's structure stays, the rider polishes
  // texture); 1.0 stays stateable, the TaoMate full-denoise mechanic.
  // Domain [0.05, 1] — ONE law
  // with the schema row and the film.params row below (audit
  // 2026-10-20 F1/F4: the resolver's old (0, 1] and the walk's
  // [0.05, 1] disagreed at 0 < d < 0.05, and the walk owned every
  // real-doc refusal before compose — the resolver's voice had no
  // firing arm. Both seats now state the same bounds and ARM 4f
  // judges the resolver at the family plane, its own seat).
  // P2 SHARES THE SEAT (SOTA plan Phase P2): the latent-upscale
  // handoff reads the SAME refine_denoise as its own Stage-2 window
  // (rider or none — pass 1's structure stays either way), so the
  // assembly moves to resolveStage2Denoise below (one owner, two
  // consumers — the rider keeps its voice, the arm borrows it).
  const denoise = resolveStage2Denoise(p)
  return {
    name: row.filename,
    strength: (p.refine_strength as number | undefined) ?? row.default_strength,
    steps,
    denoise,
  }
}
// THE STAGE-2 DENOISE (SOTA plan Phase P2 — one owner, two
// consumers): the refine rider AND the latent-upscale handoff read the
// SAME refine_denoise seat. The rider's window over the pass-1 latent;
// the handoff's own partial-denoise inside the LBH kernel over the
// upscaled latent (rider or none — pass 1's structure stays either
// way). Unstated rides the DECLARED 0.35 (the SOTA refinement window);
// the voice is the rider's (ARM 4f judges it at the family plane),
// borrowed verbatim by the arm.
function resolveStage2Denoise(p: Record<string, unknown>): number {
  const denoise = (p.refine_denoise as number | undefined) ?? 0.35
  if (!(denoise >= 0.05 && denoise <= 1)) {
    throw new Error(`h3 action: refine_denoise ${String(p.refine_denoise)} falls outside the refinement window [0.05, 1] — 1 is the full-denoise taomate mechanic, 0.30–0.35 the SOTA refinement window; a dead or over-terminal second pass never composes`)
  }
  return denoise
}
// His 17k+5 grid, in-graph (ComfyMathExpression): snap latent steps to 2 mod 5
// (the card's own principles row: "Length snaps to the 17k+5 frame grid
// at 24fps" — the principles). The seconds→frames multiplier is the
// caller's DOC CLOCK (a hardcoded *24 scaled every non-24 window —
// AUDIO-2's fifth seat); the grid snap is clock-independent.
const mathStepsGold = (fps: number): string =>
  `max(${GRID_REMAINDER}, round(a * ${fps})) + (${GRID_REMAINDER} - (max(${GRID_REMAINDER}, round(a * ${fps})) % ${GRID_STEP_FRAMES})) % ${GRID_STEP_FRAMES}`
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
 * and hybrids vary it per route. sr_vae is the seedvr2-ema DECL's
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
} as const

/** The film mux's bit depth — ONE home for the CreateVideo literal
 * the four join seats wire (the video drift audit, 2026-10-13: a
 * bare 8 at each seat was four copies of one truth). The engine's
 * combo admits ["auto", 8, 10]; the estate always renders an exact
 * 8-bit mp4 (the h264 pipeline's own depth), never "auto" — a
 * deliberate pin, changed only here. */
const FILM_BIT_DEPTH = 8

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
  // CARVE (F4 verification D5): stricter than requireText on purpose —
  // this lane refuses whitespace-only unets (trim), the kit helper
  // refuses only ''. Consolidating onto the helper would silently
  // relax this law.
  if (typeof unet !== 'string' || unet.trim() === '') {
    throw new Error(`h3 film: lane_inputs.unet = ${JSON.stringify(unet)} — a non-empty string is required`)
  }
  return { unet, clip: LANE_FILES.clip, vae_video: LANE_FILES.vae_video, vae_audio: LANE_FILES.vae_audio }
}

/** The overlay re-check the film loop voices per stanza (the same
 *  carrier the card's compose gate walks — ONE schema, imported).
 *  Exported so the card's single-call lift judges through the same
 *  re-check (the h3-b duplicate is gone: one owner). */
export const assertOverlayGated = (doc: Record<string, unknown>, where: string): void => {
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
function renderH3Film(
  p: Record<string, unknown>,
  g: GraphBuilder,
  facts: H3Facts,
  model: ModBoarding,
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
  // THE MARRIED CONSULT (one spelling — marriedBagKnob): the
  // marriage consult goes through the shared helper so the catalog
  // fallback (a row's unstated count read from the family table by
  // filename) is the same math on every face.
  const loraStepsApplied = marriedBagKnob(p, 'steps')
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
        // ONE CLOCK (journey audit AUDIO-2): the stamps' seconds
        // speak the DOC CLOCK — p.fps when stated, the schema row's
        // default otherwise. The /24 literal stretched a 16fps
        // film's dialogue and sfx slices by 1.5x (lip-sync drift,
        // the audit's worst burn).
        const stampFps = typeof p.fps === 'number' && p.fps > 0 ? p.fps : DOC_FPS_DEFAULT
        const ms = (frames: number): number => Math.round((frames / stampFps) * 1000) / 1000
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
    // ONE overall_soundscape FIELD per window (finding 11,
    // Commission 17, 2026-10-13): a window carrying both a dialogue
    // stamp and an sfx stamp once composed TWO fields with separate
    // `At MM:SS.mmm` clocks in one prompt — the format admits one
    // field, and no authoring move avoided it short of dropping a
    // lane. The sentences collect in lane order (dialogue first,
    // then sfx — the historical append order) and ride a single
    // field; each sentence keeps its own lane clock (the one-clock
    // law trims a doubled clock off ONE text, never across lanes).
    const soundscapeSentences: string[] = []
    if (stamps.dialogue !== undefined && stamps.dialogue.text !== '') {
      const t = stampClock(stamps.dialogue.delay_seconds)
      // SPEAKER-NEUTRAL (attempt-019 maker finding): the stamp once
      // hard-coded "She says" — a plainly male harbourmaster got a
      // female pronoun in his own mouth. The speaker is whoever the
      // window shows; the stamp never genders them.
      soundscapeSentences.push(
        `At ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${stamps.dialogue.text}</d>`,
      )
    }
    if (stamps.sfx !== undefined && stamps.sfx.text !== '') {
      // THE ONE-CLOCK LAW (2026-09-24): an authored sfx text that already
      // opens with its own "At MM:SS.mmm," clock must not carry two clocks —
      // the stamp's clock is canonical, the authored one is trimmed.
      const sfxText = stamps.sfx.text
        .replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, '')
      soundscapeSentences.push(`At ${stampClock(stamps.sfx.delay_seconds)}, ${sfxText}`)
    }
    if (soundscapeSentences.length > 0) {
      text = text.replace(/\s+$/, '') + '\n\noverall_soundscape:\n' + soundscapeSentences.join('\n')
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
    // THE SEAT UNION (2026-10-26, the no-drop law): a call may state
    // its media lanes DIRECTLY — last_frame / ref_images /
    // ref_videos / ref_audios on the call row — and the schema
    // admits them (the media gate walks them), so the compose MUST
    // read them or they die schema-green and engine-blind. A stated
    // lane REPLACES the declared (film) lane, an absent one
    // inherits — the same per-seat canon the refs bag rides.
    if (typeof call.last_frame === 'string' && call.last_frame.trim() !== '') stanza.last_frame = call.last_frame
    if (wireList(call.ref_images).length > 0) stanza.ref_images = call.ref_images
    if (wireList(call.ref_videos).length > 0) stanza.ref_videos = call.ref_videos
    if (wireList(call.ref_audios).length > 0) stanza.ref_audios = call.ref_audios
    const hasDirectRefs = wireList(call.ref_images).length + wireList(call.ref_videos).length + wireList(call.ref_audios).length > 0
      || (typeof call.last_frame === 'string' && call.last_frame.trim() !== '')
    const anyStamp = stamps.dialogue !== undefined || stamps.sfx !== undefined || stamps.music !== undefined
    // THE KEYFRAME PIN CHANNEL'S WINDOW RIDES (slice 2): an interior
    // pin is an image guide — the window derives the reference lane by
    // the same seats-beat-stated law the guide spellings ride (the
    // derivation knows every seat the compose knows — one law here and
    // in renderH3Window's family line, never a window that claims
    // t4_open while its chain rides the reference arm).
    const winPins = ((p.__keyframe_pins ?? {}) as Record<string, Array<unknown>>)[String(k)] ?? []
    stanza.variant = (guide !== '' || hasRefs || hasDirectRefs || anyStamp || winPins.length > 0) ? 't4r' : chainLike ? 't4_chain' : 't4_open'
    // the distill's steps apply unless this call's knobs pinned steps
    // — or the DOC did (the __steps_pinned stamp, the walk's own
    // explicit-keys fact; the single-window marriage always consulted
    // it, the film loop did not — the split-brain that stomped a
    // user-stated doc steps with the bag's count on every multi-call
    // film, operator 2026-10-16: "I SET STEPS TO SIX. IT STILL DOES
    // ONLY FOUR STEPS"). One law, both arms: the user's stated steps
    // — doc-level or per-call knob — never loses to the bag.
    if (knobs.steps === undefined && loraStepsApplied !== null && p.__steps_pinned !== true) stanza.steps = loraStepsApplied
    // THE DOOR GUARD, voice arm: a dialogue/sfx-pinned window mutes
    // the user ref audios (film-level and per-call) — the pins own
    // that window's audio conditioning; the ref doors reopen on
    // unstamped windows.
    const voicePinned = stamps.dialogue !== undefined || stamps.sfx !== undefined
    if (voicePinned) delete stanza.ref_audios
    // THE BAG GATE (2026-10-24): the stanza carries the refs bag when
    // ANY lane rides it — refs (bundle bus) OR mods (conditioning
    // tokens). The operator caught the hole live: a mods-only call
    // lost its whole bag (hasRefs counted only the bus lanes, so the
    // reference packs silently died). Mods never flip the arm (the
    // refmod seam's own law below), so the gate widened here is the
    // one behavior change — a mods-only call stays FL2VA.
    const callMods = wireList(rb.mods)
    if (hasRefs || callMods.length > 0) stanza.refs = voicePinned && Array.isArray((call.refs as Record<string, unknown> | undefined)?.audios)
      ? { ...(call.refs as Record<string, unknown>), audios: undefined }
      : call.refs
    if (guide !== '') stanza.image = guide
    else delete stanza.image
    // THE STATED-FAMILY BYPASS'S LOUD FLOOR (calls-stanza audit #2,
    // 2026-10-16): a doc stating variant verbatim skips the walk's
    // whole shot-law sweep (schema.ts guards every row/span law on
    // variant === undefined) — the agent plane can state a family
    // and hand a reversed span past it. The old guard (ef > sf)
    // SILENTLY SKIPPED assertSpanGrid and the length lift for
    // exactly that shape: the window rendered at the doc length with
    // a span the manifest booked backwards. A stated pair that does
    // not advance refuses LOUD here — the walk's own law, stated at
    // the loop's floor, on the path the walk cannot see.
    if (sf !== null && ef !== null && ef <= sf) {
      throw new Error(`h3-timeline window ${k}: reversed span (end_frame ${String(ef)} <= start_frame ${String(sf)}) — a stated family bypasses the walk's span laws, never the compose's`)
    }
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
    }
    // NO STALE fps_seconds (2026-10-16, the operator's law — "NO
    // STALE ANYWHERE"): the row is INTERNAL (the declared surface's
    // own words — the per-window rows k, noise_seed, fps_seconds are
    // internal), and the old restatement skipped DEFINED knobs, so a
    // pin stated by an older span outlived every later drag — the
    // render clock (fps_seconds) and the bar clock (the span) then
    // disagreed forever: a 5-second span on the bar rendered a
    // 10-second mush. The compose OWNS internal rows unconditionally
    // — fps_seconds derives at renderH3Window's own head (the one
    // owner, both arms) from the window's actual generation length.
    // No pin survives. No fallback. No silent disagreement.
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
    const h = g.scoped(`window${k}_`, (w): WindowHandles => renderH3Window(stanza, w, facts, model))
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
  // ONE CLOCK (AUDIO-2): the stanza durations and the owner map's
  // joins speak the same doc clock as the stamps above and the
  // container's frame_rate — never a /24 literal beside a 16fps
  // film.
  const docFps = typeof p.fps === 'number' && p.fps > 0 ? p.fps : DOC_FPS_DEFAULT
  const manifest = computeFilmMix({
    spans,
    clips,
    windowSecs: stanzaSecs(spans, docFps),
    fps: docFps,
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
    saveAudio(g, meter.out(0), 'h3_t4_film_audio')
    // THE FILM MP4 (GAP 1): the same file-tail video join the
    // clips-free arm rides — container mux only (CreateVideo +
    // SaveVideo h264/mp4 on the decoded window files), never the
    // mix. The mix rides it: audio carries the node's output.
    const join = g.node('MeliteConcatVideos', {
      videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
      after,
    })
    const filmCreated = g.node('CreateVideo', {
      images: join.out(0), audio: meter.out(0), fps: join.out(2), bit_depth: FILM_BIT_DEPTH,
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
    images: concat.out(0), audio: concat.out(1), fps: concat.out(2), bit_depth: FILM_BIT_DEPTH,
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
function applyH3FunControlNets(
  g: GraphBuilder,
  model: OutputHandle,
  vae: OutputHandle,
  picks: Array<{ model: string; image: string; strength: number; clip?: string; mask?: string; start_percent?: number; end_percent?: number }>,
): OutputHandle {
  let cur = model
  for (const pick of picks) {
    const hasClip = pick.clip !== undefined && pick.clip !== ''
    const control = hasClip
      ? g.node('GetVideoComponents', { video: g.node('LoadVideo', { file: pick.clip }).out() }).out(0)
      : pick.image !== ''
        ? g.node('LoadImage', { image: pick.image, upload: 'image' }).out(0)
        : undefined
    const hasMask = pick.mask !== undefined && pick.mask !== ''
    const patch = g.node('ModelPatchLoader', { name: pick.model }).out()
    cur = g.node('MiniMaxH3FunControlNetApply', {
      model: cur, model_patch: patch, vae,
      strength: pick.strength,
      start_percent: pick.start_percent ?? 0,
      end_percent: pick.end_percent ?? 1,
      ...(control === undefined ? {} : { control_video: control }),
      ...(hasMask ? { mask: g.node('LoadImageMask', { image: pick.mask, channel: 'alpha' }).out(0) } : {}),
    }).out()
  }
  return cur
}

function renderH3Window(
  p: Record<string, unknown>,
  g: GraphBuilder,
  facts: H3Facts,
  model: ModBoarding,
): WindowHandles {
  // REFS IMPLY THE R2V LANE (the bundle IS the r2v input): a
  // refs-carrying window is t4r even without a guide still — the
  // same law the film renderer applies per call. The DECLARED input
  // surface (ref_images/ref_videos/ref_audios — the typed fields)
  // implies t4r by the same law.
  const rb0 = (p.refs ?? {}) as Record<string, unknown>
  const declaredCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length
  const hasRefs = declaredCount + wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0
  // THE FAMILY DERIVATION LAW (one truth, 2026-10-27 — the
  // variant:'timeline' break): the window family is DERIVED from
  // the window's own seats — a guide still or a reference bus makes
  // the reference lane; everything else is text. SEATS BEAT STATED:
  // refs coerce the lane even over a stated lawful family (the old
  // refs-imply-r2v coercion — a refs-carrying window is t4r even
  // without a guide still). A stated LAWFUL family rides only when
  // the seats are silent (the film loop derives per stanza before
  // calling here; the schema walk derives from the same seats); an
  // axis-seeded string ('timeline' — the model axis the add door
  // stamps onto every fresh stage) is not a family and never was:
  // the seats own the lane, model metadata never picks one.
  const statedFamily = typeof p.variant === 'string' && (FAMILIES as readonly string[]).includes(p.variant)
    ? (p.variant as Family) : undefined
  const guide0 = [p.image, p.image_name, p.ref_image].some((v) => typeof v === 'string' && v.trim() !== '')
  // THE KEYFRAME PIN CHANNEL (slice 2): this window's interior pins —
  // keyed by the 1-based window k (the mapping's channel). Pins are an
  // image-guide seat: a pin-carrying window derives the reference lane
  // (the AddGuide chain only exists on the t4r arm), seats beat stated.
  const k = (p.k ?? 1) as number
  const winPins = (p.__keyframe_pins ?? {}) as Record<string, Array<{ image: string; frame_idx: number }>>
  const pinsHere = winPins[String(k)] ?? []
  const family: Family = (hasRefs || guide0 || pinsHere.length > 0) ? 't4r' : (statedFamily ?? 't4_open')
  // THE GRID GATE (§26, defense in depth): no window renders
  // off-grid — the film loop's pin check voices the call span, this
  // one catches the single-call path and any direct caller.
  assertGridLength(p.length, `h3-timeline window ${k}`)
  // THE CLOCK DERIVES AT THE RENDER SEAT (operator 2026-10-16, "NO
  // STALE ANYWHERE"): fps_seconds is INTERNAL and derives from THIS
  // window's actual render length, every compose, BOTH arms — the
  // film loop's stanzas and the frozen single-window doc alike (one
  // owner: this seat; the film loop's old copy is deleted). The
  // removed .default(10) left this arm serializing
  // PrimitiveFloat{value: undefined} — the engine's 400 on every
  // keyframed single-call doc. No default, no doc pin, no fallback:
  // the length owns the clock. THE DIVISOR IS THE DOC'S OWN FPS
  // (audit f1cc1197, the bar-clock mismatch): /24 booked 3.75s while
  // a stated fps 16 container PLAYED 5.625s — the seconds seat and
  // the play seat must share one clock or the bar lies. The 24
  // mirror is the row's own declared default (schema.ts fps
  // .default(24) — the walk fills it on every real door; raw
  // walk-bypass callers get the declared default, never an invented
  // one).
  const fpsClock = typeof p.fps === 'number' && p.fps > 0 ? p.fps : DOC_FPS_DEFAULT
  p.fps_seconds = Math.round(((p.length as number) / fpsClock) * 1000) / 1000
  const isT4r = family === 't4r'
  const isChain = family === 't4_chain'
  // THE LATENT-UPSCALE ARM (SOTA plan Phase P2, 2026-11-10): behind
  // second_pass_enabled AND the upscale_route sub-gate — the vendored
  // xmarre pack's MinimaxH3LatentUpscaler3DRefineHandoff rides
  // in-band on the pass-1 joint AV latent (upscale + the low-sigma
  // refinement inside the 3D-conv kernel, lock_audio true — z_v
  // through the LBH kernel, z_a preserved).
  const upscaleOn = p.second_pass_enabled === true && p.upscale_route === "latent_2x"
  // THE HEAD HALVES UNDER THE ARM (both r2v seats below): pass 1
  // composes the quarter grid the kernel was distilled on
  // (1344×768 → 672×384); the handoff doubles the latent in-band
  // before the second pass. Route off = stated geometry (ARM 41's
  // byte-stable plain pass — the halving never touches the legacy
  // graph).
  const headW = upscaleOn ? (p.width as number) / 2 : (p.width as number)
  const headH = upscaleOn ? (p.height as number) / 2 : (p.height as number)
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
  // THE STABILIZE DEFAULT (spec-match cure 6b, audit 2026-10-27):
  // the spec's diagnostic matrix seats "SLA stabilize motion =
  // Enabled" as the flicker cure's own law — both arms get the true
  // fallback now (t4r rode false, the timeline's own reference lane
  // ran the flicker cure off); a doc's explicit false still wins.
  const stabilize = p.sla_stabilize_motion ?? true
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
    // THE BOOLEAN FLIP (2026-10-16, upstream parity F1 — PARITY's
    // predicted drift, verified LIVE at the engine door): the
    // upstream input turned BOOLEAN (its own tooltip: 'ON (Light)
    // uses fixed 0.85 reference sparsity...') while our schema row
    // still served the three-string enum — every default compose
    // (the walk fills 'Heavy Enforcement') fed a STRING into the
    // boolean input: phase-1 refusal, card dead on lane, every
    // suite green (no wall fixture carried H3SLAAttention). The
    // UI vocabulary STAYS the richer enum (saved docs ride
    // verbatim); the compose translates at the node seat — the
    // engine's binary is the truth the wire must speak. Only 'Off'
    // is false; Light and Heavy Enforcement both protect.
    reference_protection: p.sla_reference_protection !== 'Off',
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
  // ({on, lora, str, v:1, a:1, t:1}). THE EMPTY-BAG LAW (J1,
  // refs-mods journey audit 2026-10-16): an EXPLICIT `[]` is the
  // operator's "no loras" — the wire carries an EMPTY stack and
  // nothing loads; only an ABSENT bag (unset) rides the family
  // catalog's default row (the mod plane's own default, built
  // from the catalog so the value has one owner). ONE surface, one
  // owner, two honest poles.
  const loraStack = Array.isArray(p.loras)
    ? JSON.stringify((p.loras as Array<Record<string, unknown>>).map((r) => ({
        // the service resolves every row against the family catalog
        // (unknown ids refuse LOUD upstream) — {name, strength} is
        // the guaranteed wire shape, read directly
        on: true,
        lora: r.name as string,
        str: r.strength as number,
        v: 1, a: 1, t: 1,
      })))
    : loraStackDefault()
  // t4r templates carry shift_video 8.0; the t4 family carries the INT
  // NO SILENT RESOLUTION LAW: the walked shift_video IS the value
  // (declared default 8; the family literals retired with the
  // nulling that fed them — 8.0 and 8 serialize identically anyway)
  // THE MARRIED SHIFT (SOTA limb 2, the steps marriage's heir):
  // while a distill rides, the row's own sigma-shift grid wins over
  // the no-distill default (the 8-step turbos run 12, the 4-step
  // 6, native rows declare none and keep 8) — UNLESS the doc stated
  // its own shift (the __shift_pinned stamp: an explicit value is
  // the user's word, the marriage applies only to the unstated).
  const marriedShift = marriedBagKnob(p, 'shift_video')
  const shiftVideo = p.__shift_pinned === true || marriedShift === null
    ? p.shift_video as number
    : marriedShift

  const clip = g.node('CLIPLoader', {
    clip_name: facts.clip, type: 'minimax',
    ...(isT4r ? { device: 'default' } : {}),   // t4 templates OMIT it
  }).out()
  const vaeVideo = g.node('VAELoader', { vae_name: facts.vae_video }).out()
  const vaeAudio = g.node('VAELoader', { vae_name: facts.vae_audio }).out()

  let cond: OutputHandle
  let latent: OutputHandle
  let sigmaModel: OutputHandle
  // THE PRE-LORA EDGE (spec-match cure 1, audit 2026-10-27): the
  // picked UNET+switch output BEFORE the primary LTX_lora_loader —
  // the un-distilled base pass 2's Stage-3 law rides (assigned in
  // both t4 arms; consumed only when a distill rides pass 2 at a
  // sub-1 window, so the plain pass stays byte-stable).
  let preLoraModel: OutputHandle
  // ONE CLOCK FOR EVERY ARM (audit f1cc1197, 2026-10-16 — the
  // non-reference seat was a DEAD STORE: the only fpsInput read sat
  // inside if (isT4r), so the else-arm's CreateVideo kept its
  // hardcoded 24 while the cure line sat two blocks above it). The
  // initializer puts the DOC's clock under every arm; the t4r branch
  // upgrades it to the walk-first PrimitiveFloat node, and the
  // else-arm container reads it directly. p.fps is a declared row
  // (default 24, the walk fills it on every real door).
  let fpsInput: OutputHandle | number = p.fps as number

  if (isT4r) {
    // opener: switch(SLABool) picks SLA-direct vs chunked; lora rides
    // the switch; preview override wired to the in-graph step count.
    // Inject semantics: an injected SCALAR replaces the bool NODE
    // (template link severed, node orphaned) — mirrored by passing the
    // scalar straight when sla_switch is set. sla_enabled=false
    // forces the chunked (SLA-off) path; otherwise the legacy
    // sla_switch spelling rides untouched.
    // FPS IS LAYER A (operator 2026-10-16, verbatim): the container
    // clock rides the DOC's fps — the same clock the bar books — so
    // the clip's seconds equal the bar's seconds. The old hardcoded
    // 24 generated a 90-frame window that PLAYED 3.75s under a
    // 5.6s bar (frames right, seconds stolen by a third). p.fps is
    // a declared row (default 24, the walk fills it) — never a ??
    // fallback, never undefined on the wire.
    const fpsNode = g.node('PrimitiveFloat', { value: p.fps as number }).out()  // id .0 — CreateVideo.fps walks first
    let slaSel: OutputHandle | boolean | null = (p.sla_enabled as boolean | undefined) === false
      ? true
      : ((p.sla_switch as boolean | undefined) ?? null)
    if (slaSel === null) slaSel = g.node('PrimitiveBoolean', { value: false }).out()
    const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out()
    preLoraModel = picked
    const loraModel = g.node('LTX_lora_loader', {
      model: picked, mode: 'minimax', stack_data: loraStack, lora_ui: '',
    }).out()
    const seconds = g.node('PrimitiveFloat', { value: p.fps_seconds as number }).out()  // id .1
    // ONE CLOCK (AUDIO-2): the seconds→frames inverse rides the doc
    // clock — fps_seconds was BOOKED at fpsClock (:length/fps), so a
    // hardcoded *24 here scaled a 16fps window's length by 1.5x. The
    // grid snap itself is clock-independent (frames are frames).
    const lengthNode = g.node('ComfyMathExpression', {
      expression: mathStepsGold(fpsClock), 'values.a': seconds,
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
    const refBag = (p.refs ?? {}) as Record<string, unknown>
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
    // THE CANON'S REPLACE ARM (per lane): a stated call lane rides
    // INSTEAD of the declared lane; an absent call lane inherits it.
    const bagImages = wireList(refBag.images)
    const refImagesAll = bagImages.length > 0 ? bagImages : declaredImages
    const imageCap = imageReferenceCap(lastFrame !== '')
    if (lastFrame !== '' && refImagesAll.length > imageCap) {
      throw new Error(`[h3-timeline] the image bus is full: a last frame (input 2) + ${String(refImagesAll.length)} references exceeds the ${IMAGE_BUS_SLOTS}-slot bus — keep references ≤ ${imageCap} with an end anchor (≤ ${REF_CAPS.images} without)`)
    }
    const refImages = refImagesAll.slice(0, imageCap)
    const bagVideos = wireList(refBag.videos)
    const refVideos = (bagVideos.length > 0 ? bagVideos : declaredVideos).slice(0, REF_CAPS.videos)
    // THE TRIM SEAT'S READER (audit 003/V4): index-paired with
    // ref_videos — schema resolve fills each entry's start_time/
    // duration defaults, so a wire `{item:…}` or partial entry
    // normalizes before it reaches the slice. A non-object entry
    // refuses LOUD (the probe-proven law), never rides silent.
    const rawTrims = Array.isArray(p.ref_video_trims) ? p.ref_video_trims : []
    if (rawTrims.length > REF_CAPS.videos) {
      throw new Error(`ref_video_trims: expected at most ${REF_CAPS.videos} entries (the video lane's cap) — got ${rawTrims.length}`)
    }
    const videoTrims: Array<{ start_time: number; duration: number }> = rawTrims.map((e, i) => {
      if (typeof e !== 'object' || e === null || Array.isArray(e)) {
        throw new Error(`ref_video_trims: entry ${i} must be an object { start_time, duration } — got ${JSON.stringify(e).slice(0, 40)}`)
      }
      const row = e as Record<string, unknown>
      const start = row.start_time
      const dur = row.duration
      if (start !== undefined && typeof start !== 'number') throw new Error(`ref_video_trims: entry ${i} start_time must be a number — got ${JSON.stringify(start).slice(0, 40)}`)
      if (dur !== undefined && typeof dur !== 'number') throw new Error(`ref_video_trims: entry ${i} duration must be a number — got ${JSON.stringify(dur).slice(0, 40)}`)
      return { start_time: start ?? 0, duration: dur ?? 0 }
    })
    // THE MIS-SLICE REFUSAL (J3, refs-mods journey audit 2026-10-16):
    // trims index-pair with the EFFECTIVE video lane — the call's
    // replaced bag when it states one, else the declared lane. A doc
    // authored against a longer declared list ([A,B,C] + [tA,tB,tC])
    // plus a call replacing with [X] used to ride SILENT: tA (authored
    // for A) sliced X, tB/tC fell off — the wrong video's trim, never
    // a word. A trim row with no video to pair is the mis-slice's
    // signature; the compose refuses it LOUD, naming both counts.
    if (videoTrims.length > refVideos.length) {
      const lane = bagVideos.length > 0 ? 'the call replaced the lane' : 'the declared lane'
      throw new Error(`ref_video_trims: ${String(videoTrims.length)} trim rows pair with ${String(refVideos.length)} effective videos (${lane}) — a trim row with no video is the silent mis-slice; re-trim against the lane's videos`)
    }
    const bagAudios = wireList(refBag.audios)
    const refAudios = (bagAudios.length > 0 ? bagAudios : declaredAudios).slice(0, REF_CAPS.audios)
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
      let vid: TensorRef = isSpell(src) ? src : g.node('LoadVideo', { file: src }).out()
      // THE TRIM THREAD (audit 003/V4): entry i slices guide i
      // through the engine's own Video Slice BEFORE conditioning —
      // both arms (spelled tensor and disk path) trim the same,
      // because the slice rides the VIDEO tensor either way. A
      // zero/zero or absent entry builds no node: the whole clip
      // stays the guide, byte-stable with the pre-trim graph.
      const trim = videoTrims[i]
      if (trim !== undefined && (trim.start_time > 0 || trim.duration > 0)) {
        vid = g.node('Video Slice', {
          video: vid, start_time: trim.start_time,
          duration: trim.duration, strict_duration: false,
        }).out()
      }
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
      prompt, width: headW, height: headH,
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
      // ONE CLOCK (AUDIO-2): the delay's seconds→frame reconverts
      // speak the doc clock — the stamps were booked at it in the
      // film loop; a /24 literal here pins a 16fps film's guide rows
      // late by 1.5x (lip-sync drift at the very pin the model
      // hears).
      const pinFps = typeof p.fps === 'number' && p.fps > 0 ? p.fps : DOC_FPS_DEFAULT
      type StampShape = { src: string, slice_start_seconds: number, slice_duration_seconds: number, delay_seconds: number, text?: string }
      const read = (key: string): StampShape | null => (p[key] ?? null) as StampShape | null
      const stamp = read('dialogue_slice')
      if (stamp !== null) {
        dialogueAudio = g.node('MeliteAudioSlice', {
          audio: stamp.src,
          start_seconds: stamp.slice_start_seconds,
          duration_seconds: stamp.slice_duration_seconds,
        }).out(0)
        dialogueFrameIdx = Math.round(stamp.delay_seconds * pinFps)
      }
      const sfxStamp = read('sfx_slice')
      if (sfxStamp !== null) {
        sfxAudio = g.node('MeliteAudioSlice', {
          audio: sfxStamp.src,
          start_seconds: sfxStamp.slice_start_seconds,
          duration_seconds: sfxStamp.slice_duration_seconds,
        }).out(0)
        sfxFrameIdx = Math.round(sfxStamp.delay_seconds * pinFps)
      }
      const musicStamp = read('music_slice')
      if (musicStamp !== null) {
        musicAudio = g.node('MeliteAudioSlice', {
          audio: musicStamp.src,
          start_seconds: musicStamp.slice_start_seconds,
          duration_seconds: musicStamp.slice_duration_seconds,
        }).out(0)
        musicFrameIdx = Math.round(musicStamp.delay_seconds * pinFps)
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
      // Input census alignment (2026-10-12): the engine build's
      // node declares clip/first_frame/height/last_frame/length/
      // prompt/vae/width — context_steps and audio_context_steps
      // are gone from the declaration, and the input wall walks
      // orphans too, so wiring them refused the whole graph
      // (BRIEF15: card_compose unknown-input on this node).
      prompt: I2V_MARKER_PROMPT, width: geoW, height: geoH,
      length: lengthNode,
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
    // THE KEYFRAME IMAGE PINS (the keyframe lane, slice 2 — 2026-11-05):
    // this window's interior pins chain AFTER the audio pins — the
    // dialogue-measured order (audio first, image guides after; the
    // chain is positive-flows-through, so order is wiring, visible in
    // the graph). THE 17K+5 LEGALITY: a single-frame image guide is
    // lawful at EVERY row of the window's own grid (the engine's
    // 1-or-17k+5 batch rule — MiniMaxH3AddGuide treats a sub-5-frame
    // batch as one frame; the latent renders exactly p.length frames,
    // the 22+17k length law), so the only unlawful row is PAST the
    // generated tail — reachable only through a knob-pinned length
    // shorter than the authored span — and that pin SNAPS to the
    // nearest lawful row (loud comment, silent snap — the length
    // law's own idiom). The image rides the spell law's own helper:
    // a $spell rides its tensor slot verbatim, a path keeps the
    // LoadImage disk handoff (the anchor seat's exact grammar).
    for (const pin of pinsHere) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: Math.min(pin.frame_idx, (p.length as number) - 1),
        vae: vaeVideo, image: imageRef(pin.image),
      }).out(0)
    }
  } else {
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
    preLoraModel = picked
    const loraModel = g.node('LTX_lora_loader', {
      model: picked, mode: 'minimax', stack_data: loraStack,
    }).out()
    const adaln = g.node('H3AdaLNLoRAFix', { model: loraModel, mode: 'port' }).out()
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
      prompt, width: headW,
      height: headH, length: length as number,
      ref_image_size: p.ref_image_size as string,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    // FPS IS LAYER A, this arm too: the non-reference arm's container
    // clock rides the doc's declared fps — same law as the t4r arm's
    // fpsNode, no arm may hardcode a clock the bar disagrees with.
    fpsInput = p.fps as number
  }

  // THE REFMOD SEAM (audit 010/R1, 2026-10-18): reusable reference
  // mods appended to the conditioning's reference tokens through ALL
  // DiT blocks (the pack rides the model's native ref2va path; it
  // spends conditioning-side tokens, never a bundle-bus slot, so the
  // refs-imply-r2v law does not fire on a mod and BOTH arms share
  // this one seam — Apply accepts the core CONDITIONING either r2v
  // arm emits and returns the same type).
  // THE ANY-MEDIA LAW (operator, 2026-11-06): the mod seat takes ANY
  // media kind — stills, videos, audio — and THE SYSTEM HANDLES THE
  // CONVERSION: the pack's own creator node (Create H3 RefMod /
  // MiniMaxH3RefModExtract) bakes the media into a mod at run time
  // (refs_image.ref_image_N stills ≤16, refs_video.ref_video_N frame
  // batches ≤8 — dotted autogrow addressing; audio
  // rides MiniMaxH3RefModAudioExtract). Forcing operators to
  // hand-place .safetensors packs was the regression (4f2342f46 →
  // ce79f052a), not the law. Pre-baked .safetensors stems under
  // models/refmods/ stay legal currency through the loader (the
  // listing door's rows) — a REUSE arm, never the only door.
  // REFMOD IS NOT REFERENCE (operator, 2026-11-06): the mod seat is
  // its own concept — identity/style/voice packs riding the ref2va
  // conditioning of every DiT block — never a fourth reference lane.
  // THE PER-CALL MODS SEAT — THE MERGE LAW (2026-11-08, study §2b /
  // G7: the old either/or REPLACED the declared list whenever a
  // window stated its own — a stated seat silently dropped, the
  // purge's kill class): the two spellings of the seat — the
  // run-level `ref_mods` (declared, rides EVERY window) and the
  // window's `refs.mods` (the per-call bag) — MERGE: declared
  // entries first, then the window's own not already present
  // (deduped by trimmed value), so a stated pack never drops and a
  // double-stated pack never double-spends a loader slot. Comma
  // strings (the UI wire form) and arrays (the agent form) both
  // resolve through wireList; the cap check below guards the UNION.
  // (The refs-lane REPLACE canon governs the image/video/audio BUS
  // lanes only — REFMOD IS NOT REFERENCE.)
  const bagMods = wireList(rb0.mods)
  const declaredMods = wireList(p.ref_mods)
  const seenMods = new Set(declaredMods.map((m) => m.trim()))
  const refModsAll = [...declaredMods, ...bagMods.filter((m) => !seenMods.has(m.trim()))]
  if (refModsAll.length > 0) {
    if (refModsAll.length > REF_CAPS.refmods) {
      throw new Error(`[h3-timeline] ref_mods exceeds the loader's ${String(REF_CAPS.refmods)} slots (saw ${String(refModsAll.length)})`)
    }
    const modStems: string[] = []
    const modImages: string[] = []
    const modVideos: string[] = []
    const modAudios: string[] = []
    for (const src of refModsAll) {
      // Trim, then query-strip (the estate precedent:
      // timelineContract's _kindOfFile splits '?' first), then split
      // on BOTH separators — a backslash-prefixed or padded entry
      // would otherwise pass the suffix check with junk baked into
      // the stem and die server-side as a combo miss. The two `as`
      // casts are total (split always yields a non-empty array), so
      // this adds no defensive branches to the coverage face.
      // A data: URL rides VERBATIM past the split (the studio's
      // upload chips commit data URLs; the run's staging walk
      // uploads them into the engine's input tree and rewrites the
      // load nodes' slots — the family reads off the MIME here).
      const raw = src.trim()
      const query = raw.split('?')[0] as string
      const base = query.split(/[\\/]/).pop() as string
      if (raw.startsWith('data:')) {
        const mime = /^data:([^;,]+)[;,]/.exec(raw)?.[1] ?? ''
        if (mime.startsWith('image/')) modImages.push(raw)
        else if (mime.startsWith('video/')) modVideos.push(raw)
        else if (mime.startsWith('audio/')) modAudios.push(raw)
        else {
          throw new Error(`[h3-timeline] ref_mods entries are ANY media (image/video/audio — the system bakes the pack) or pre-baked .safetensors stems under models/refmods/ (saw '${src.slice(0, 60)}')`)
        }
        continue
      }
      if (base.endsWith('.safetensors')) {
        modStems.push(base.slice(0, -'.safetensors'.length))
        continue
      }
      // ANY media kind boards (mediaKindOf — the contracts SSOT):
      // image → the creator's refs_image.ref_image_N, video →
      // refs_video.ref_video_N via the component split, audio → the
      // audio extractor. Anything
      // the estate does not recognize as media refuses HERE, loud,
      // instead of dying server-side (the I2V census-alignment law).
      const kind = mediaKindOf(base)
      if (kind === 'image') modImages.push(query)
      else if (kind === 'video') modVideos.push(query)
      else if (kind === 'audio') modAudios.push(query)
      else {
        throw new Error(`[h3-timeline] ref_mods entries are ANY media (image/video/audio — the system bakes the pack) or pre-baked .safetensors stems under models/refmods/ (saw '${src}')`)
      }
    }
    // The chain's law: each mods source appends through its own
    // Apply (Apply passes conditioning through, one mods input), in
    // fixed order — pre-baked stems, the baked visual pack, then
    // each baked audio pack.
    const applyMods = (mods: OutputHandle): void => {
      cond = g.node('MiniMaxH3RefModApply', {
        conditioning: cond, mods, override: false, retention: 1,
        curve_direction: 'constant', scramble_seed: -1,
        curve_shape: 'linear', curve_value: 1,
      }).out(0)
    }
    if (modStems.length > 0) {
      const loaderInputs: Record<string, string | number | boolean> = { show_info: false }
      for (let i = 0; i < REF_CAPS.refmods; i++) {
        const stem = modStems[i]
        loaderInputs[`mod_${i + 1}`] = stem === undefined ? '(none)' : stem
        loaderInputs[`strength_${i + 1}`] = 1
        loaderInputs[`copies_${i + 1}`] = 1
      }
      applyMods(g.node('MiniMaxH3RefModsLoader', loaderInputs).out(0))
    }
    if (modImages.length > 0 || modVideos.length > 0) {
      // One creator node stacks every visual ref of the seat into a
      // single video-kind mod (the node's own grammar: stills into
      // the refs_image autogrow container's grown slots, frame
      // batches into refs_video's — DOTTED container.slot addressing,
      // the r2v ref_images.ref_image_0 receipt; a BARE ref_image_1
      // key is an undeclared input and phase 1 refuses it, the
      // 2026-10-16 boot-death live burn). name = the first PATH
      // ref's basename, sanitized node-side — a data: upload chip
      // has no basename, so a data-only seat names the generic
      // 'mod'. save rides the node default (true) so the baked pack
      // lands in the loader's dropdown for later reuse.
      const firstVisual = (modImages[0] ?? modVideos[0]) as string
      const nameBase = firstVisual.startsWith('data:') ? 'mod' : firstVisual.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'mod'
      // THE STATED BAKE (study §5/§7.2; value-arms ARMs 13/14): the
      // fidelity dials are DECLARED params (schema.ts, the refmod
      // group) and ride the node verbatim. Before this, pool and
      // identity were SILENT engine defaults (nothing named them)
      // and mode/save were pinned constants — the dials did not
      // exist on this lane. The fallbacks are the declared defaults
      // verbatim — one owner, the schema.
      const bakeMode = typeof p.refmod_mode === 'string' ? p.refmod_mode : 'Compressed Reference'
      const bakePool = typeof p.refmod_pool === 'number' && Number.isFinite(p.refmod_pool) ? p.refmod_pool : 16
      const bakeIdentity = typeof p.refmod_identity === 'number' && Number.isFinite(p.refmod_identity) ? p.refmod_identity : 500
      const extractInputs: Record<string, string | number | boolean | OutputHandle> = {
        name: nameBase,
        mode: bakeMode, concept_type: 'generic',
        save: p.refmod_save !== false,
        pool_h: bakePool, pool_w: bakePool, identity: bakeIdentity,
        // THE VAE EDGE (2026-11-06 live burn: 'connect an av_encoder
        // (MiniMax-H3 VAE loader) or a standard VAE' — the engine
        // refuses the extract at run time without one; both inputs
        // are schema-optional, so no phase-1 judge can catch it).
        // The family's own optimized H3 VAE rides (the int8-convrot
        // video VAE, the same handle the film lane loads); no
        // MINIMAX_H3_AV_ENCODER loader node exists in this engine's
        // /object_info, so the standard-VAE input is THE wire.
        vae: vaeVideo,
      }
      modImages.forEach((img, i) => {
        extractInputs[`refs_image.ref_image_${i}`] = g.node('LoadImage', { image: img, upload: 'image' }).out(0)
      })
      modVideos.forEach((vid, i) => {
        extractInputs[`refs_video.ref_video_${i}`] = g.node('GetVideoComponents', {
          video: g.node('LoadVideo', { file: vid }).out(),
        }).out(0)
      })
      applyMods(g.node('MiniMaxH3RefModExtract', extractInputs).out(0))
    }
    for (const src of modAudios) {
      // Audio mods are their own extractor (AUDIO in, one mod out);
      // one node per entry, voice-grade defaults, saved for reuse
      // (a data: upload chip names the generic 'audio_mod').
      // budget_policy + concept_type are REQUIRED bare combos in the
      // engine's /object_info — no declared default, so no primed
      // builder autofills them (the B7 wall refuses at compose) — the
      // graph states the pack's own signature defaults
      // (vendor/ComfyUI-MiniMaxH3Mod/nodes.py:2143: budget_policy
      // 'error', concept_type 'voice').
      applyMods(g.node('MiniMaxH3RefModAudioExtract', {
        audio: g.node('LoadAudio', { audio: src }).out(),
        audio_vae: vaeAudio,
        name: src.startsWith('data:') ? 'audio_mod' : src.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'audio_mod',
        budget_policy: 'error', concept_type: 'voice',
        save: true,
      }).out(0))
    }
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
  // THE FUN-CONTROLNET SEAT (007 L7): one insertion past the sigma
  // shift, BOTH t4 arms by construction (each arm assigns sigmaModel
  // above; every downstream consumer — BasicScheduler, BasicGuider,
  // the continuation seam, the soft-AV release — rides the chain's
  // tail). Empty picks → sigmaModel verbatim (byte-stable); entries
  // fire only when the family boards the controlnet pack (the kit's
  // boarding gate — the rows are the operator's BENCH row, 002 H1)
  // and every row fact (schedule capability, strength ceiling, the
  // clip/mask channels) arrived stamped by the service resolution.
  sigmaModel = applyH3FunControlNets(g, sigmaModel, vaeVideo, fireControlNets(model, p))
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
  // owner per knob). Mounted ONLY when resolveRefineSeat above
  // assembles the rider (the door's single owner — the engine
  // service carries no refine assembly of its own); absent = the
  // graph renders exactly as before.
  // The TaoMate refiner thread's mechanics: pass A full, pass B
  // closes. The rider sits UPSTREAM of decode AND of the film's
  // seam handles — the chained texture is the refined one.
  // THE MASTER GATE (2026-09-22): second_pass_enabled === true is
  // the only door to the whole post chain — sharpen, interp, VSR,
  // refine each AND it with their own switch (legacy docs with
  // leaves set but no master render the plain pass, byte-stable).
  const secondPassOn = p.second_pass_enabled === true
  const refine = resolveRefineSeat(p)
  // ── THE P2 LATENT-UPSCALE HANDOFF (SOTA plan Phase P2 — mounts
  // BEFORE the rider: the rider goes in-band on the UPSCALED
  // latent, ARM 43): the handoff's latent edge names the pass-1
  // sampler's output (the sampled joint AV — 24 video ch, ARM 38),
  // lock_audio true preserves pass-1 audio exactly, and the decode
  // below rides latOut so it decodes the upscaled latent (ARM 39).
  // THE STAGE-3 MODEL LAW (spec-match cure 1, audit 2026-10-27): the
  // spec's diagnostic matrix names the mechanism — "Distilled LoRAs
  // at low denoise predict invalid noise fields" (the plastic/waxy
  // skin face); its cure row seats "Un-distilled b30-49 Base
  // Checkpoint" for pass 2. So whenever the primary bag carries a
  // counting distill AND the pass-2 window is sub-1 (the handoff's
  // window is ALWAYS sub-1 — its sigmas law below refuses 1.0), the
  // refine rider and the latent handoff mount on the PRE-LORA chain
  // instead of sigmaModel: the picked UNET+switch edge + the AdaLN
  // fix + the doc's own shift grid + the same fun-controlnet wrap —
  // every conditioning a pass needs, minus the distill. At denoise
  // 1.0 the rider keeps the primary stack (the TaoMate full mechanic
  // — pass A full, pass B closes — unchanged); with no counting row
  // the primary stack already IS the un-distilled base.
  // the bag's own truth: absent p.loras = the default h3_turbo8_v1
  // row rides (loraStackDefault — a counting distill); a stated bag
  // rides a counting row iff the marriage sees one.
  const distillRides = Array.isArray(p.loras) ? marriedBagKnob(p, 'steps') !== null : true
  const riderSubOne = refine !== undefined && refine.denoise < 1
  let pass2Model = sigmaModel
  if (distillRides && (upscaleOn || riderSubOne)) {
    const pass2Adaln = g.node('H3AdaLNLoRAFix', { model: preLoraModel, mode: 'port' }).out()
    const pass2Shift = g.node('MiniMaxH3SigmaShift', {
      model: pass2Adaln, shift_video: shiftVideo, shift_audio: p.shift_audio as number,
    }).out()
    pass2Model = applyH3FunControlNets(g, pass2Shift, vaeVideo, fireControlNets(model, p))
  }
  if (upscaleOn) {
    // THE STAGE-2 SCHEDULE: the married steps AT THIS SEAT — the
    // rider's own count when it mounts (the in-band marriage), else
    // the doc steps (a riderless stated refine_steps is a cross-gate
    // leaf, ARM 45's ARM-5 heir — it never reaches this schedule);
    // the denoise is the shared Stage-2 seat (resolveStage2Denoise
    // above — rides with or without the rider, the P2 verdict's
    // core). THE PARTIAL-DENOISE LAW (the vendored sequence node's
    // own contract — nodes/minimax_h3_refine.py run_h3_refinement:
    // sigmas must be 1-dim, ≥2 finite entries, and
    // 0 <= sigmas[0] < 1 STRICT; a full-noise sigma discards the
    // learned upscaled latent and the node throws at the engine).
    // A BasicScheduler full schedule (denoise 1.0) opens AT sigma_max
    // — so denoise 1.0 is ILLEGAL on this arm and refuses HERE, in
    // the handoff's own voice naming the sigmas law (ARM 46 fires
    // it). Off-arm 1.0 stays legal (the rider's taomate full-denoise
    // mechanic never crosses this node).
    const stage2Denoise = resolveStage2Denoise(p)
    if (stage2Denoise >= 1) {
      throw new Error(`h3 action: refine_denoise 1 composes no partial-denoise window — the latent-upscale handoff requires 0 <= sigmas[0] < 1 (vendored MinimaxH3LatentUpscaler3DRefineHandoff, run_h3_refinement: a full-noise sigma discards the upscaled latent); state a window below 1 (the researched 0.30–0.35) or turn upscale_route off for the taomate full-denoise mechanic`)
    }
    const stage2Sched = g.node('BasicScheduler', {
      model: pass2Model, scheduler: schedName,
      steps: refine !== undefined ? refine.steps : (p.steps as number),
      denoise: stage2Denoise,
    }).out()
    const upscaled = g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
      model: pass2Model, noise, sampler: samplerSel, positive: cond,
      sigmas: stage2Sched, latent: latOut,
      model_name: p.upscale_model as string,
      mode: "scale by multiplier", scale: 2.0,
      lock_audio: true, precision: "bf16", device: "cuda", cfg: 1.0,
      // THE MISSING REQUIRED SIX (timeline audit follow-up, 2026-10-27:
      // the corpus stage-2+3 member's wiring pass reds — the node
      // composed estate-side without the engine's declared-required
      // inputs, and the engine refuses the prompt on any of them).
      // Multiplier mode ignores width/height/megapixels/keep_proportion
      // — they ride the pass-2 target (full size, aspect kept) and the
      // engine's own defaults; align is the kernel's latent-alignment
      // grain (32 = its default, every 3D-conv frame boundary).
      width: p.width as number, height: p.height as number,
      keep_proportion: true, megapixels: 1,
      align: 32, offload_after_upscale: false,
    })
    latOut = upscaled.out(0)
  }
  if (refine !== undefined) {
    const refineModel = g.node('LTX_lora_loader', {
      model: pass2Model, mode: 'minimax',
      stack_data: JSON.stringify([{ on: true, lora: refine.name, str: refine.strength, v: 1, a: 1, t: 1 }]),
      lora_ui: '',
    }).out()
    const refineSched = g.node('BasicScheduler', {
      model: refineModel, scheduler: schedName,
      // THE REFINE WINDOW (SOTA limb 1): 1.0 = the full-denoise
      // TaoMate mechanic (unstated, byte-stable); a stated window
      // (0.30–0.35) keeps pass 1's structure and polishes texture.
      steps: refine.steps, denoise: refine.denoise,
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
      images: vdec, audio: vadec, fps: fpsInput, bit_depth: FILM_BIT_DEPTH,
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
    //
    // ── THE GRAPH-MIRROR BUILD (burn b, 2026-10-26 — operator: "H3
    // VIDEO UI LIE… IT WILL ALWAYS UPSCALE") ── each limb mounts
    // IFF its own doc gate is on; an off limb composes NO node at
    // all. The pre-burn shape built every limb unconditionally and
    // routed a lazy ComfySwitchNode around each — the serialized
    // graph (a face the operator and the engine queue both read)
    // carried SeedVR2 + interp + sharpen on EVERY doc, switches or
    // not: the graph itself said "always upscale". The TS build now
    // picks the wire at compose time — the same mount-behind-the-
    // gate law the latent-upscale handoff and the refine rider
    // already ride — and the V9 ORDER is preserved by threading one
    // `postImage` handle down the chain.
    let postImage = vdec
    const interpOn = secondPassOn && (p.interpolate_enabled as boolean)
    if (interpOn) {
      const film = g.node('FrameInterpolationModelLoader', {
        model_name: p.interp_model as string,
      }).out()
      const interpMultVal = p.interp_multiplier as number
      const interp = g.node('FrameInterpolate', {
        interp_model: film, images: postImage, multiplier: interpMultVal,
      }).out()
      postImage = interp
    }
    const srSwOn = secondPassOn && (p.sr_switch as boolean)
    if (srSwOn) {
      const srRes = p.sr_resolution as number
      const sr = g.node('SeedVR2VideoUpscaler', {
        image: postImage,
        dit: g.node('SeedVR2LoadDiTModel', {
          model: p.sr_model as string, device: 'cuda:0',
        }).out(),
        vae: g.node('SeedVR2LoadVAEModel', {
          model: LANE_FILES.sr_vae, device: 'cuda:0',
        }).out(),
        seed: 42, resolution: srRes,
        max_resolution: 0, batch_size: 5, uniform_batch_size: false,
        color_correction: 'lab',
      }).out()
      postImage = sr
    }
    // sharpen LAST (V9): the upscaler softens; rcas after it restores.
    // Renderer alias second (sharpen_* leaves above build the method).
    if (secondPassOn && (p.sharpen_enabled as boolean)) {
      const sharpened = g.node('ImageSharpenKJ', { image: postImage, method }).out()
      postImage = sharpened
    }
    // fps compensation (V9, 2026-09-15): upstream wires
    // CreateVideo.fps = base × interp multiplier (his Enhancements:
    // PrimitiveFloat 24 → ComfyMathExpression "a * 2" → fps). Without
    // it every interp-on window plays at HALF speed — the frames
    // double, the fps doesn't. THE BASE IS THE DOC'S CLOCK, never a
    // hardcoded 24 (audit f1cc1197: this seat rode a literal while
    // the fpsInput "cure" above sat dead — the exact dead-store
    // class: a line that looks like a fix and never fires).
    const created = g.node('CreateVideo', {
      images: postImage, audio: vadec, fps: interpOn ? (fpsInput as number) * (p.interp_multiplier as number) : fpsInput, bit_depth: FILM_BIT_DEPTH,
      // color_space: pin autofill "sRGB"
    })
    const saved = g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'mp4', codec: 'h264',
    })
    rawHandles.savePassthrough = saved.out(0)
    delivered = { images: postImage, audio: vadec }
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
 * lane admissions and both renderers (this module is their only
 * seat). */
/** The sampler row the h3 schema itself serves: the ONE engine
 * vocabulary read through the family's recommended subset (the
 * schema's own filter law — a retyped list would be a second
 * SSOT). */
const H3_SAMPLER_OPTIONS: readonly string[] = SAMPLER_OPTIONS.filter((n) =>
  (H3_RECOMMENDED_SAMPLERS as readonly string[]).includes(n));

/** ONE WINDOW'S KEYFRAME RIDES (the keyframe lane, slice 2 — the
 *  design §A compose rules as data): `anchor`/`endAnchor` are the
 *  endpoint pins' seat values (bundle input_1 / the FL2VA end anchor
 *  input_2 — the existing first/last-frame pulls, no graph change),
 *  `pins` are the strictly-interior pins in film order, each carrying
 *  its GENERATION-LOCAL frame index (the film frame minus the
 *  window's generation head — the same clock the D-M-E audio stamps
 *  ride, so a carried window's 22-frame seam is already subtracted). */
interface KeyframeRides {
  anchor?: string
  endAnchor?: string
  pins: Array<{ image: string; frame_idx: number }>
}

/** THE KEYFRAME→SEAT MAPPING (the keyframe lane, slice 2 — 2026-11-05):
 *  turns the doc's FILM-absolute `keyframes` pins into per-window
 *  rides. Runs at the build door AFTER the plan gate (placement is
 *  judged there; every pin here has exactly one covering window) and
 *  BEFORE the sole-call unpack, so both window shapes consume the
 *  mapped seats through their EXISTING doors — the film loop reads
 *  them off the rewritten call rows (guide/seat-union/variant derive
 *  with no pin awareness), the single-window shape lifts them through
 *  the unpack. Per the seat canon (Layer B replaces Layer A), a pin
 *  fills only a SILENT seat: a stated call guide/last_frame (or, on
 *  the single-window shape, the doc-level seat) wins and the pin
 *  rides the interior arm instead — at a boundary frame that is the
 *  AddGuide pin at the window's first/last generated row, so BOTH
 *  images reach the graph (the no-drop law: a pin never vanishes).
 *  Writes `p.calls` (new row objects; the caller's doc is untouched)
 *  and `p.__keyframe_pins` — the interior channel keyed by the 1-based
 *  window k the renderers already carry (the `__` internal-channel
 *  precedent: __iteration/__overlap). */
function applyKeyframeCompose(p: Record<string, unknown>): void {
  const kfRows = Array.isArray(p.keyframes) ? (p.keyframes as Array<Record<string, unknown>>) : []
  if (kfRows.length === 0) return
  const calls = Array.isArray(p.calls) ? (p.calls as Array<Record<string, unknown>>) : []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  // Per-window window metadata: the span, the generation head (the
  // film loop's own carry law — i>0 non-cut windows generate from
  // sf − overlap), and the MAPPED row (lazily forked so untouched
  // rows keep their identity).
  type Win = { sf: number; ef: number; genStart: number; rides: KeyframeRides; row: Record<string, unknown>; forked: boolean }
  const wins: Array<Win | null> = calls.map((row, i) => {
    const sf = num(row.start_frame)
    const ef = num(row.end_frame)
    if (sf === null || ef === null || ef <= sf) return null
    const carry = i > 0 ? transitionOverlap(typeof row.transition === 'string' ? row.transition : undefined) : 0
    return { sf, ef, genStart: sf - carry, rides: { pins: [] }, row, forked: false }
  })
  const ridesByK = new Map<number, KeyframeRides>()
  const fork = (w: Win): Record<string, unknown> => {
    if (!w.forked) {
      w.row = { ...w.row }
      w.forked = true
    }
    return w.row
  }
  for (const kf of kfRows) {
    // (the gate above guarantees a finite frame and a covering window)
    const f = kf.frame as number
    const image = str(kf.image)
    const w = wins.find((win) => win !== null && f >= win.sf && f <= win.ef - 1) as Win | undefined
    if (w === undefined) continue // unreachable post-gate; the gate owns the refusal
    if (f === w.sf && w.rides.anchor === undefined && !isSeatStated(w, 'anchor')) {
      fork(w).image = image
      w.rides.anchor = image
      continue
    }
    if (f === w.ef - 1 && w.rides.endAnchor === undefined && !isSeatStated(w, 'end')) {
      fork(w).last_frame = image
      w.rides.endAnchor = image
      continue
    }
    // strictly interior — or a boundary seat already claimed (the first
    // pin won it): the interior arm, so the image still reaches the graph
    w.rides.pins.push({ image, frame_idx: f - w.genStart })
  }
  for (const [i, w] of wins.entries()) {
    if (w === null) continue
    if (w.forked) calls[i] = w.row
    if (w.rides.pins.length > 0) {
      w.rides.pins.sort((a, b) => a.frame_idx - b.frame_idx)
      ridesByK.set(i + 1, w.rides)
    }
  }
  if (ridesByK.size > 0) {
    const channel: Record<string, Array<{ image: string; frame_idx: number }>> = {}
    for (const [k, rides] of ridesByK) channel[String(k)] = rides.pins
    p.__keyframe_pins = channel
  }

  /** A window's own stated seat (the canon's Layer B claim): the row's
   *  guide spellings (the film loop's exact union) or its end anchor;
   *  on the single-window shape the DOC-level seat is the same seat —
   *  a stated one wins over the pin there too. */
  function isSeatStated(w: Win, seat: 'anchor' | 'end'): boolean {
    if (seat === 'anchor') {
      if (str(w.row.image) !== '' || str(w.row.ref_image) !== '' || str(w.row.image_name) !== '') return true
      if (calls.length === 1 && str(p.image) !== '') return true
      return false
    }
    if (str(w.row.last_frame) !== '') return true
    if (calls.length === 1 && str(p.last_frame) !== '') return true
    return false
  }
}

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
    // THE `prompt` ROW IS GONE (2026-10-16, audit 3f0b7c1a
    // ui-truth-gap #5): this face advertised a key the card's door
    // REFUSES — `prompt` rides neither the h3-timeline rider list nor
    // its admits, and the single-call LIFT writes p.prompt from the
    // call's own text (card.ts, "if (typeof single.text === ...)").
    // An agent that trusted this row got 'unknown-param' at the door.
    // The compose still reads p.prompt (the lift's write); the
    // ADVERTISED surface is what changed.
    // THE SCALAR MEDIA SEATS (the NO-DROP law's write half, D8 /
    // CONTRACTS §4 debt 16 — run-899a8448's burn: the seats declared
    // plain "string", so the declared plane offered freehand text for
    // a media seat and the UI wrote a stage name into one). They are
    // IMAGE seats: a media path at the wire, the form's picker +
    // upload face — the carrier schema's own `wtype: 'image'` rows
    // (schema.ts) are the same truth on the serve plane.
    { name: "image", type: "image" },
    { name: "last_frame", type: "image" },
    { name: "ref_images", type: "image_list" },
    { name: "ref_videos", type: "image_list" },
    { name: "ref_audios", type: "image_list" },
    { name: "ref_mods", type: "image_list" },
    { name: "duck_depth_db", type: "number", bounds: [-48, 0] },
    { name: "seed", type: "number", rule: "seed-sentinel" },
    { name: "width", type: "number", bounds: [448, 1344] },
    { name: "height", type: "number", bounds: [448, 1344] },
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
    // THE REFINE WINDOW (SOTA limb 1): [0.05, 1] — ONE domain with
    // the schema row and the resolver above (parity walled by ARM
    // 4f); 1 is the full-denoise taomate mechanic (the default)
    { name: "refine_denoise", type: "number", bounds: [0.05, 1] },
    // THE LATENT-UPSCALE ROUTE (SOTA plan Phase P2 — the P2 verdict's
    // own seats on the family door): the sub-gate + its closed file
    // surface ride the door like every knob — h3-window-parity's
    // undeclaredServed arm names them, the census witnesses them at
    // ARM 37. The route is the OFF-latched union (off default,
    // byte-stable); the model is the on-disk LBH v1 3D-conv bf16
    // checkpoint (single-member vocabulary, the sr_model precedent).
    { name: "upscale_route", type: "enum", options: ["off", "latent_2x"] },
    { name: "upscale_model", type: "enum", options: ["minimax_h3_latent_upscaler_3d_bf16.safetensors"] },
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
    // THE BAKE'S STATED DIALS (study §5/§7.2; value-arms ARMs 13/14):
    // the RefMod extract's fidelity dials, declared on the serve plane
    // (schema.ts, the refmod group) and stated at the node (the
    // extract inputs). The family door judges them like every knob.
    { name: "refmod_mode", type: "enum", options: ["Compressed Reference", "Full Reference"] },
    { name: "refmod_pool", type: "number", bounds: [2, 64] },
    { name: "refmod_identity", type: "number", bounds: [0, 2000] },
    { name: "refmod_save", type: "boolean" },
    { name: "image_name", type: "string" },
  ],
  facts: parseH3Facts,
  build({ p: docIn, facts, g, model }): OutputHandle {
    const p = { ...(docIn as Record<string, unknown>) }
    // THE KEYFRAME PLAN GATE (the keyframe lane, slice 1 — 2026-11-05):
    // a pin's frame is FILM-absolute and must fall INSIDE some call's
    // [start_frame, end_frame) span; a pin in a gap has no window to
    // ride (the lane's whole truth is per-window compose), so it
    // refuses HERE — the same plan door that refuses a textless call —
    // never a silent unplaced pin (the no-drop law). Both window
    // shapes pass through this door (the film plan and the frozen
    // single-window doc), so one gate owns both. Slice 2 adds the pin
    // SHAPE arms — a pin must CARRY an image that names media (a
    // frameless or stage-named row anchors nothing and would silently
    // vanish or die at the engine door) — and then the pin→seat/
    // pin-node MAPPING lands below: an endpoint pin rides the window's
    // existing anchor/end-anchor seats, an interior pin rides the
    // AddGuide image chain.
    const kfRows = Array.isArray(p.keyframes) ? (p.keyframes as Array<Record<string, unknown>>) : []
    if (kfRows.length > 0) {
      const windows = (Array.isArray(p.calls) ? (p.calls as Array<Record<string, unknown>>) : [])
        .map((c) => ({ start: c.start_frame, end: c.end_frame }))
        .filter((w): w is { start: number; end: number } =>
          typeof w.start === 'number' && Number.isFinite(w.start)
          && typeof w.end === 'number' && Number.isFinite(w.end))
      // Row SHAPE is the walk's literal too (assertKeyframeRowShape) —
      // called here so a doc that skipped the walk (a raw run body)
      // still speaks the same vocabulary; placement/media stay below.
      assertKeyframeRowShape(kfRows)
      for (let ki = 0; ki < kfRows.length; ki++) {
        const kf = (kfRows[ki] ?? {}) as Record<string, unknown>
        const f = kf.frame as number
        const image = (kf.image as string).trim()
        if (!isMediaRef(image)) {
          throw new Error(
            `keyframes[${ki}]: "${image}" names no media — a stage/card name is not an image ` +
            '(pick the artifact: a file path, URL, or $spell rides; a label never does)',
          )
        }
        const covered = windows.some((w) => f >= w.start && f <= w.end - 1)
        if (!covered) {
          const plan = windows.length > 0
            ? `[${windows[0]!.start}, ${windows[windows.length - 1]!.end})`
            : 'no windows at all (the doc names no calls)'
          throw new Error(
            `keyframes[${ki}]: frame ${f} falls outside every window — the plan covers ${plan}; ` +
            'a keyframe in a gap has no window to ride (move the pin inside a window)',
          )
        }
      }
      // THE KEYFRAME→SEAT MAPPING (slice 2): endpoint pins ride the
      // windows' existing anchor/end-anchor seats (rewritten call rows —
      // the byte-identical probe: a boundary-pin doc composes the graph
      // of the same doc stating the seats directly), interior pins ride
      // the `__keyframe_pins` channel into the AddGuide image chain.
      applyKeyframeCompose(p)
    }
    // THE SOLE-CALL UNPACK (the Layer A/B canon, 2026-10-24): a
    // single-call doc rides the frozen single-window arm below —
    // which renders the DOC surface, never the row. Without this
    // unpack the sole call's Layer B seats (refs bag, anchor image,
    // text, render knobs) died silently on every single-call doc:
    // the split-brain twin of the film loop's bag gate. One stanza
    // law, both arms: the row REPLACES the refs bag / anchor / text
    // seats it states (per-lane, per-seat); knobs replace per key;
    // unstated seats inherit the doc. (Runs AFTER the keyframe
    // mapping so the lift carries the mapped anchor/end-anchor seats
    // onto the doc surface — the single-window shape's byte-identical
    // endpoint probe rides this order.)
    // ONE STANZA LAW, ALL ARMS (journey audit 72b1d88a finding 1,
    // 2026-10-16 — the second-burn rule binds): the k-marked frozen
    // shape (p.k set, calls > 1) renders window k on the DOC surface
    // — its row is calls[p.k - 1] (1-based, the film loop's own
    // window${k} naming). Before this arm the row's span, text,
    // refs and knobs died unread on every frozen multi-window doc,
    // and the lora bag stomped a knob-pinned steps: the split-brain
    // twin of the sole-call lift, unwalled only because no studio
    // gesture authors it — the agent plane and hand-built docs do.
    const stanzaRow = Array.isArray(p.calls) && p.calls.length === 1
      ? (p.calls[0] as Record<string, unknown>)
      : Array.isArray(p.calls) && p.calls.length > 1
        && typeof p.k === 'number' && Number.isInteger(p.k) && p.k >= 1 && p.k <= p.calls.length
        ? (p.calls[p.k - 1] as Record<string, unknown>)
        : null
    {
      const row = stanzaRow
      if (row !== null) {
        // FRAMES ARE LAYER B (operator 2026-10-16: "NUMBER OF FRAMES
        // IS ALWAYS LAYER B"): the single call's span OWNS the window
        // length — lifted here through the same snap the film loop's
        // span rider uses, BEFORE the knobs assign (a deliberate
        // knob pin still wins; the walk's declared default and any
        // stale doc-level length NEVER do). Before this lift the
        // frozen arm rendered the doc's Layer-A length — a knob tied
        // to nothing the bar updates — and a 90-frame call generated
        // whatever the stale row said.
        const rowSf = typeof row.start_frame === 'number' && Number.isFinite(row.start_frame) ? row.start_frame : null
        const rowEf = typeof row.end_frame === 'number' && Number.isFinite(row.end_frame) ? row.end_frame : null
        if (rowSf !== null && rowEf !== null && rowEf > rowSf) {
          p.length = spanStanzaFrames({ start: rowSf, end: rowEf }, 0)
        }
        const rowText = typeof row.text === 'string' ? row.text.trim() : ''
        if (rowText !== '') p.prompt = row.text
        if (row.refs !== undefined && row.refs !== null) p.refs = row.refs
        const rowImage = typeof row.image === 'string' ? row.image.trim() : ''
        if (rowImage !== '') p.image = row.image
        // THE SEAT UNION, sole-call arm (2026-10-26, the no-drop
        // law): the row's DIRECT media lanes ride onto p — the same
        // per-seat replace canon the stanza arm carries; before this
        // lift a single-window doc's row-level refs died unread.
        if (typeof row.last_frame === 'string' && row.last_frame.trim() !== '') p.last_frame = row.last_frame
        if (wireList(row.ref_images).length > 0) p.ref_images = row.ref_images
        if (wireList(row.ref_videos).length > 0) p.ref_videos = row.ref_videos
        if (wireList(row.ref_audios).length > 0) p.ref_audios = row.ref_audios
        const rowKnobs = (row.knobs ?? null) as Record<string, unknown> | null
        if (rowKnobs !== null) Object.assign(p, rowKnobs)
      }
    }
    const guideImage = (p.image ?? p.image_name ?? '') as string
    // THE STATED-FAMILY CONFLICT GUARD (one truth, 2026-10-27): a
    // LAWFUL stated family in conflict with a guide still refuses
    // loud — an explicit t4_open/t4_chain pin over an anchored doc
    // is a contract conflict, named at build. An axis-seeded string
    // ('timeline' — model metadata, not a family claim) never
    // reaches this guard: the seats derive the family and the
    // guide owns the reference lane.
    const statedFamily = typeof p.variant === 'string' && (FAMILIES as readonly string[]).includes(p.variant)
      ? (p.variant as Family) : undefined
    // THE KEYFRAME PIN CHANNEL CARRIES THE LANE (slice 2): a doc with
    // pins claims the reference lane wherever its pins land — an
    // endpoint pin maps onto the anchor/end-anchor seats below, an
    // interior pin composes the AddGuide image arm. Both guards below
    // count it: the conflict guard refuses a stated non-t4r family
    // over a pin-carrying doc exactly as over an anchor (the explicit
    // contract conflict is named, never silently overridden), and the
    // inverse guard admits a t4r doc whose guides ride the pin channel
    // alone (an interior pin is an image guide — the window is not
    // anchorless). (The conflict arm rides the SINGLE-WINDOW shape
    // only: a film doc's walked variant is t4_chain — the DERIVED film
    // family, never a stated conflict — and the film loop derives each
    // window's own family from its seats.)
    const kfLane = kfRows.length > 0 && Array.isArray(p.calls) && (p.calls as unknown[]).length === 1
    if ((guideImage !== '' || kfLane) && statedFamily !== undefined && statedFamily !== 't4r') {
      const rbRef = (p.refs ?? {}) as Record<string, unknown>
      const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
        + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
        || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '')
      if (!refsCarry) {
        throw new Error(
          guideImage !== ''
            ? `h3_window: a guide image ("${guideImage.trim()}") rides only the t4r reference lane — ` +
              `this doc's variant is '${String(p.variant)}'. State no variant (the walk derives t4r from ` +
              'the guide) or clear the guide; never a silent text-only render of a reference shot'
            : `h3_window: keyframe pins ride only the t4r reference lane — this doc's variant is ` +
              `'${String(p.variant)}'. State no variant (the walk derives t4r from the pins) or clear ` +
              'the keyframes; never a silent text-only render of a pinned shot',
        )
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
    if (statedFamily === 't4r' && !guideImage) {
      // (refs-implied t4r windows carry no anchor — the bundle IS
      // the r2v input; the guard admits them via the refs law — the
      // legacy stanza bag AND the declared input surface (the rail's
      // fields) count; the bed rides the audio lane guideless too;
      // slice 2: so do keyframe pins — an interior pin is an image
      // guide on the window's conditioning chain)
      const rbRef = (p.refs ?? {}) as Record<string, unknown>
      const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
        + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
        || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '')
        || kfLane
      if (!refsCarry) {
        throw new Error(
          'h3_window(t4r): image-anchored window without a staged guide image — ' +
          'compose always injects LoadImage.0.image on this family')
      }
    }
    // THE FILM DISPATCH (the grammar law, 2026-10-27): the doc's
    // calls ARE the grammar — more than one call with no per-window
    // stanza markers (k absent) composes the MERGED film; everything
    // else is the frozen single-window shape. The variant string
    // NEVER gates this seat: it is axis metadata ('timeline') or a
    // schema stamp derived from these same calls — reading it here
    // demoted multi-window docs to one window and burned the
    // operator's timing (bench-session-2d6af763, variant:'timeline').
    const docCalls = Array.isArray(p.calls) ? p.calls : null
    const isFilm = docCalls !== null && (docCalls as unknown[]).length > 1 && p.k === undefined
    if (isFilm) return renderH3Film(p, g, facts, model)
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
    // honors the distill bag's steps — ONE STEPS LAW for both
    // window paths (007 L3, the film path's verbatim): the marriage
    // fires only when the caller pinned no steps of their own. The
    // doc face reads the schema's __steps_pinned stamp (a walked
    // default is not a pin); the call face reads the single call's
    // knobs (the film path's own `knobs.steps === undefined` arm).
    // An explicit count is the user's word — the distill default
    // never overwrites it.
    if (Array.isArray(p.loras)) {
      const rows = p.loras as Array<Record<string, unknown>>
      const married = marriedBagKnob(p, 'steps')
      // THE MARRIAGE'S ROW FACE: the sole call's knobs — and, since
      // the k-marked cure (journey audit 72b1d88a), the FROZEN
      // window's own row knobs too. One consult, both shapes: the
      // row the window renders is the row whose steps are the
      // user's word. The consult rides the shared helper — the
      // catalog fallback (a row's unstated count by filename) is
      // the same math here as on the film loop.
      const singleKnobs = stanzaRow !== null
        ? ((stanzaRow.knobs ?? {}) as Record<string, unknown>)
        : {}
      if (married !== null && p.__steps_pinned !== true && singleKnobs.steps === undefined) {
        p.steps = married
      }
    }
    // THE POST-MARRIAGE RE-WALK (the single-window face's arm of the
    // film loop's per-window walk — ERROR d, the ~100 burn): the
    // marriage lands the bag's stated count AFTER the card's one
    // walk, and without this judgment the mutated count rode into
    // the returned graph unjudged (the G6 TOCTOU — the estate's
    // faces let 100 in, the served bound packs.ts:34 is
    // min(1).max(100), the recipe row declares no steps domain). It
    // sits AFTER the render's own hand-checked seats so their pinned
    // voices fire first (the loader cap, the trim-entry shape); the
    // marriage's mutation is the only delta this re-check can add —
    // card.ts walked the same doc pre-marriage, so every other
    // refusal here was already refused upstream. The film loop
    // judges its stanza post-marriage; this face closes the same
    // TOCTOU — one schema, one voice.
    const handles = renderH3Window(p, g, facts, model)
    assertOverlayGated(p, 'h3-timeline single-window knobs')
    return handles.savePassthrough!
  },
}
