// The h3 schema plane — the film card's declared knob surface,
// moved family-side with the atom-vocabulary video stroke (the
// family's action re-validates each film stanza against THIS
// carrier; the card's wrap + compose gate import the same object —
// ONE spelling, never a second copy).
import z from '@deepseek-ai/schemastery'
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@melite/comfyui-card-kit/vocab'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import { bag } from '@melite/contracts/extraKeys'
import { coerceWireArrays } from '@melite/comfyui-card-kit'
import { CALL_KEYS, FILM_ONLY_KEYS, GRID_BASE_FRAMES, GRID_MAX_FRAMES, GRID_STEP_FRAMES, REF_CAPS, T4_ONLY_KEYS, assertGridLength, assertSpanGrid, deriveWindowFamily, isMediaRef, normalizeDeclaredRefs, transitionOverlap } from './timelineContract.js'

// the window families this renderer builds (three shapes:
// t4r opener / t4_open window / t4_chain window).
export const FAMILIES = ['t4r', 't4_open', 't4_chain'] as const
export type Family = (typeof FAMILIES)[number]

export const wireList = normalizeDeclaredRefs

export const H3_RECOMMENDED_SAMPLERS = [
  "euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun",
  // THE TIER-1/2 WINNERS (arena + Comfy-Org's own t2v/i2v/r2v
  // templates; every name verified against the live engine's
  // object_info 2026-09-20 — ROADMAP item 1, ledger #30 §3(1)):
  // res_multistep is what the official templates run; er_sde +
  // the beta scheduler (already on sched_name) is Parasyte's
  // README rec (beta57); seeds_2/seeds_3 are the "dual clock"
  // family the arena's top i2v runs rode with larryvrh v4.
  "res_multistep", "res_multistep_cfg_pp", "er_sde", "seeds_2", "seeds_3",
] as const

export const JSON_ARRAY_PARAMS = ['calls', 'audio_clips'] as const

// ── the params schema — H3TimelineCard mirrored 1:1 ─────────────────────────
// the declared field order and defaults. Bare (defaultless) keys are the
// ABSENT / required surface (prompt required=True; image
// default=None): the image-gen precedent — optional at parse, refused
// loud at compose where the lane needs them, and every read below
// normalizes with ?? so the served shape stays byte-identical.
// DECLARED CONSTANTS (2026-09-07): the four rows
// below are the declared constants (width 1344, height 768,
// sharpen_enabled false, shift_video 8.0) and the served shape
// carries the same values. shift_video's declared .default(8.0)
// (historical shape); at runtime schema() normalizes an
// omitted key back to null so the body resolves the family's literal
// (t4 INT 8 / t4r 8.0 — the served structural values).
export const paramSchema = z.object({
  // (operator 2026-11-05: "I don't want a prompt for the Layer A
  // for the full model, remove that") — the film-level prompt field
  // is GONE: the calls own the prompts (the single-call lift composes
  // p.prompt from the call's text, card.ts; the merged film composes
  // one prompt from N windows, actions.ts). A textless call refuses
  // at compose — this field never substituted for one by its own
  // doc; it was dead weight on the global recipe's face.
  image: z.string().role('path').description("First frame image").extra('extra', bag({ order: null, wtype: 'image', tooltip: "Absolute path to the PNG the video must start on (first-frame anchoring). Optional for h3/h3-timeline." })),
  // THE INPUT SURFACE (the H3 architecture truth — two DIFFERENT
  // mechanics, the FL2VA latent anchors vs the Ref2VA conditioning
  // bus): first_frame/last_frame are PIXEL anchors (bundle inputs
  // 1-2, VAE-written into the latent ends — the i2v branch reads
  // them verbatim); references ride the REMAINING image bus (inputs
  // 3-9 → <Picture 3..9>) plus the video/audio lanes (<Video 1-3>,
  // <Audio 1-3>) as AdaLN/cross-attention conditioning. Typed
  // arrays, door-enforced: a non-string entry or an over-cap stack
  // refuses LOUD at the gate (the probe-proven law —
  // `expected array length <= 8`), never rides silent. The legacy
  // `refs` stanza bag keeps its compose-side wireList readers; the
  // declared fields are the primary surface.
  last_frame: z.string().role('path').description("Last frame (end anchor)").extra('extra', bag({ order: null, wtype: 'image', tooltip: "FL2VA end anchor — bundle input 2. Locks the final frame's pixels; H3 generates the motion between the two anchors." })),
  ref_images: z.array(z.string().role('path')).description("Reference images").max(REF_CAPS.images).extra('extra', bag({ order: null, wtype: 'image_list', max_stack: REF_CAPS.images, tooltip: "Loose references (identity, style, costume) → <Picture 3..9> via the bundle. 8 fills the bus; with a last frame set the cap is 7 (anchor + end + 7 = the 9-slot bus)." })),
  ref_videos: z.array(z.string().role('path')).description("Reference videos").max(REF_CAPS.videos).extra('extra', bag({ order: null, wtype: 'image_list', media: 'video', max_stack: REF_CAPS.videos, tooltip: "Motion guides → <Video 1-3>: camera moves, timing, choreography." })),
  // THE TRIM SEAT (audit 003/V4, 2026-10-22): per-video trim,
  // index-paired with ref_videos — entry i slices guide i through
  // the engine's own Video Slice node BEFORE GetVideoComponents
  // conditions on it (thread the motion guide to the span that
  // matters; a whole 3-minute clip as a guide wastes the window).
  // start_time/duration are SECONDS; duration 0 with start_time 0
  // (or an absent entry) = the whole clip, no slice node built.
  // strict_duration rides false: a duration past the clip's end
  // clamps at the engine, never refuses the film. The trims are
  // stage params, so the run body records them verbatim.
  ref_video_trims: z.array(z.object({
    start_time: z.number().min(0).default(0).description('Start (s)'),
    duration: z.number().min(0).default(0).description('Duration (s)'),
  })).max(REF_CAPS.videos).description("Reference video trims").extra('extra', bag({ order: null, tooltip: "Per-video trims, index-paired with Reference videos — entry i slices guide i (start seconds + duration seconds) before conditioning. duration 0 = to the clip's end; an absent entry = the whole clip." })),
  ref_audios: z.array(z.string().role('path')).description("Reference audios").max(REF_CAPS.audios).extra('extra', bag({ order: null, wtype: 'image_list', media: 'audio', max_stack: REF_CAPS.audios, tooltip: "Sound references → <Audio 1-3>: timbre, cadence, musical tone." })),
  // THE REFMOD SEAT (audit 010/R1, 2026-10-18): reusable reference
  // mods. The pack injects them as reference tokens through ALL
  // DiT blocks on the conditioning side: no bundle-bus slot is
  // spent, so a mod does NOT fire the refs-imply-r2v law (a
  // mod-only film stays open).
  // THE ANY-MEDIA LAW (operator, 2026-11-06): the seat takes ANY
  // media kind — stills, videos, audio — and the system bakes the
  // pack (the Create H3 RefMod node composes the conversion; audio
  // rides its own extractor). media 'mod' seats the mod family's
  // OWN upload face with NO accept filter (any media boards);
  // pre-baked .safetensors stems under models/refmods/ stay legal
  // REUSE currency through the loader.
  ref_mods: z.array(z.string().role('path')).description("RefMods (reusable reference mods)").max(REF_CAPS.refmods).extra('extra', bag({ order: null, wtype: 'image_list', media: 'mod', max_stack: REF_CAPS.refmods, tooltip: "RefMods — ANY media rides (images, videos, audio): the system bakes the pack and injects it as reference tokens while the video generates. Strength 1 per mod; uses none of the reference-image slots; its own mechanism — not another reference slot. 8 max. Pre-baked .safetensors packs under models/refmods/ stay legal (reuse through the loader). Pack-documented limits, never silent: attributes can still mix across mods (identity, clothing, background, composition); strength blends, it never replaces outright; voice transfer does not work reliably (music references carry, speaker identity does not). A picked path commits its stem." })),
  // THE BAKE'S STATED DIALS (study dev_docs/audits/refmod-deep-study-2026-10-19.md
  // §5/§7.2 — the engine executed identity 500 / pool 16×16 /
  // Compressed Reference / save-every-run as SILENT defaults while
  // the compose stated none of them; the dials did not exist on this
  // lane). Declared with today's values as the defaults: zero
  // behavior change, the same bake — STATED (the value-arms wall's
  // ARMs 13/14 judge the inputs present AND named at the node).
  refmod_mode: vocabulary(["Compressed Reference", "Full Reference"]).description("RefMod bake mode").default("Compressed Reference").extra('extra', bag({ order: null, group: 'refmod', wtype: 'select', tooltip: "How the bake stores the reference. Compressed Reference pools the latent on the grid below — fast, blending-friendly; the pack's own docs mark pooling lossy in exactly the way that destroys facial identity. Full Reference stores the full latent (identity-critical work; more tokens per frame). The extension's training/encode modes build packs offline — they never run when generating." })),
  refmod_pool: z.number().min(2).max(64).step(2).description("RefMod pool grid").default(16).extra('extra', bag({ order: null, group: 'refmod', wtype: 'number', tooltip: "Compressed mode: the pooled latent grid's long edge (even, 2–64). 16 = 64 tokens/frame (the concept sweet spot); 32 = 256 tokens; 64 = 1024, full-mode parity for identity. The grid auto-fits the source's aspect ratio around this edge." })),
  refmod_identity: z.number().min(0).max(2000).step(50).description("RefMod refinement steps").default(500).extra('extra', bag({ order: null, group: 'refmod', wtype: 'number', tooltip: "Compressed mode: optimization steps that reduce the pooled latent's reconstruction error (0 = pooling alone). Each step is a gradient pass — THE time dial: the bake runs this many steps PER REFERENCE PER WINDOW, so a film with N windows pays N × refs × this. The engine's silent 500 default was the 'refmod is slow' burn." })),
  refmod_save: z.boolean().description("Save baked RefMod").default(true).extra('extra', bag({ order: null, group: 'refmod', wtype: 'boolean', tooltip: "Re-write the baked pack into models/refmods/<name> every run so it lands in the loader's dropdown for reuse. Off = bake, inject, discard (no disk writes). The pack carries the stated dials in its metadata either way." })),
  // (THE BED IS GONE — operator 2026-09-22: "We have Audio Bed
  // input. We don't use that, that is a bug that is there." Film
  // music rides the D-M-E lanes' MUSIC clips, pinned per window;
  // reference timbre rides ref_audios. No film-wide bed, no cuts,
  // no MeliteAudioSlice in the graph.)
  // DUCK DEPTH (roadmap §14, was a pinned −14 literal): how far the
  // generated voice yields under a conditioned clip at its film
  // span. −14dB is the natural mix-desk default; deeper for dense
  // dialogue, shallower when the generated voice should hold.
  duck_depth_db: z.number().description("Duck depth (dB)").min(-48).max(0).step(1).default(-14).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1, tooltip: "How far the generated voice ducks under a dialogue clip (−14 is the mix-desk default)." })),
  seed: z.number().description("Seed").step(1).default(42).extra('extra', bag({ order: null, columns: 2, width: 1, tooltip: "Same seed across re-rolls = same world texture" })),
  width: z.number().description("Width").min(448).max(1344).step(32).default(1344).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1 })),
  height: z.number().description("Height").min(448).max(1344).step(32).default(768).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1 })),
  // length (the grid-law fix, 2026-09-13): the row's old validators
  // (min 21, step 5) contradicted the card's own declared law — the
  // 17k+5 frame grid (identity principle + tooltip: 56/90/124/362).
  // Schemastery step is offset-from-min, so step(5) from 21 admitted
  // {21, 26, ...} and REFUSED the documented values (90, 124, 362 —
  // the compose door's `expected number multiple of 5` on a user-set
  // Frames). min(22).step(17) admits exactly (L-5) % 17 === 0 — the
  // served stepper now walks the true grid 22/39/56/.../362 and the
  // explicit 90 passes the walk. 56 (the declared
  // default) is on-grid; the omitted-key path normalizes to null in
  // schema() so the body computes the family's frame budget.
  // FRAMES ARE LAYER B (operator 2026-10-16: "NUMBER OF FRAMES IS
  // ALWAYS LAYER B"): the timeline's calls own the window lengths —
  // the single-call lift derives this row from the call's span at
  // compose (a stated span outranks this default; a knob pin still
  // outranks both — the user's own word). The row is HIDDEN on the
  // served face (audit h3-frames-anima B1-1, 2026-10-20: it served
  // EDITABLE as the span's rival — a doc-level Frames only owns
  // span-less calls, which fresh cards never author); it STAYS
  // SCHEMA-DECLARED (the compose still reads p.length, CALL_KNOB_KEYS
  // pins length per call, and the studio carries it display-owned —
  // the round-trip seat wall) — the Layer-A face never shows it.
  length: z.number().description("Frames").min(GRID_BASE_FRAMES).max(GRID_MAX_FRAMES).step(GRID_STEP_FRAMES).default(56).extra('extra', bag({ hidden: true, order: null, columns: 2, width: 1, tooltip: "How long each clip runs. Durations snap to the engine's 17k+5 grid: 56 frames = 2.33s, 124 = 5.17s, 362 = 15s — the clip's length rounds to the nearest step." })),
  // FPS IS LAYER A (operator 2026-10-16, verbatim) — the project
  // clock, ONE owner: the doc's stated fps rides into every
  // CreateVideo container so the clip's seconds equal the bar's
  // seconds. Declared default 24 (the walk fills it — the lawful
  // declared kind, never a silent ?? in the compose). The old
  // hardcoded 24 in both render arms played a 90-frame window at
  // 3.75s under a 5.6s bar.
  fps: z.number().description("Playback fps").min(1).max(120).default(24).extra('extra', bag({ hidden: true })),
  steps: z.number().description("Steps").min(4).max(30).default(6).extra('extra', samplingExtra('steps', { tooltip: "6 for draft — the engine kernel's own calibrated count (its H3SLAAttention tooltip: use 6 steps rather than lowering sparsity; PARITY-pinned with plaguekind v7 — the 12 carried no receipt and matched neither his v7=6 nor v9=8; regolded by the 2026-10-16 upstream-parity audit); 30 standard; a boarded distill lora applies its own steps (edit them on the lora entry)" })),
  // THE SECOND-PASS MASTER (2026-09-22, operator: "Second Pass also
  // needs an on/off switch, it is very unclear if it is on or off"):
  // one boolean heads the tab. Off (default) = the whole post chain
  // is inert: the leaves hide AND the compose gates hard (sharpen,
  // interp, VSR, refine all read the master FIRST — a legacy doc
  // with leaves set but no master renders the plain pass).
  second_pass_enabled: z.boolean().description("Second pass").default(false).extra('extra', bag({ order: null, group: 'second_pass', wtype: 'boolean', tooltip: "Master switch for the entire post chain — FSR sharpening, FILM interpolation, SeedVR2 super-res, and the refine lora. Off (default) = the film lands straight from the sampler. On = the pass controls below arm." })),
  sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural." })),
  sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(0.05).default(0.3).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true", tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.", wtype: 'number' })),
  // interpolate_enabled: HONEST DEFAULT (hour 20): the card's
  // `bool = False` — `default(false)`, not the "false"-as-boolean
  // cast-lie. An absent key now fills the boolean NATIVELY (no
  // caller prefill — the old string default is what used to throw).
  // The wire-string tolerance (the bench add-door rides the served
  // literal "false"/"true" as an explicit key) is a DOC-level law —
  // coerceWireBoolean below — because schemastery field transforms
  // classify as type 'json' in the served taxonomy (the
  // knob-freshness wall pins the honest 'boolean').
  interpolate_enabled: z.boolean().description("FILM Interpolation").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'boolean', tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time." })),
  // ── THE ENGINE TRUTH ROWS (2026-09-17, the Layer A/B law stroke):
  // every key the compose READS rides the declared surface at its
  // exact wire name — the studio's historical spellings
  // (sampling_steps / sampler / scheduler / interpolate_model /
  // interpolate_multiplier / rtx_vsr_enabled) never matched these,
  // were never read, and die with the studio rework.
  // ANTI-DRY (operator catch, 2026-09-19: "why do normal forms have
  // sampler and scheduler next to each other but here they're on
  // different rows?"): the sampling layout truth (group/columns/
  // width/zone) is the KIT's — steps/sampler/scheduler ride
  // samplingExtra() like every normal card; h3-only knobs (denoise,
  // the shifts) declare the SAME layout facts inline (card-owned
  // kinds, one place each). The 2-column grid seats sampler +
  // scheduler side by side on EVERY face that honors the grammar.
  denoise: z.number().description("Denoise").min(0).max(1).step(0.05).default(1.0).extra('extra', bag({ order: 4, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "How much of the latent the sampler rewrites. 1.0 = full denoise (fresh windows); lower inherits structure." })),
  // CLOSED TYPES (hour 22 incident): these were
  // z.string() with a DECORATIVE extra options list — the gate accepted
  // any string (no membership refusal), the face showed the hand-stamped
  // six, the engine accepts the pin's 45: three truths for one key. The
  // union of consts is the ONE truth now — the face reads the members,
  // the gate refuses off-set values at the compose door (the kit's own
  // law: sampler/scheduler knobs ride vocabulary()), and the declared
  // default stays reachable (fill === walk by construction).
  // THE TIER WINNERS, TAKEN FROM THE KIT'S OWN 45 (the census's H2):
  // this list used to be eleven names retyped here, so a regen of the
  // engine vocabulary (regen-vocab.ts owns that file) left the film
  // card's menu stale — and a name the engine had dropped would still
  // be offered and then 400. The subset is NAMED here (a card's
  // recommendation is real curation) but every member is READ from
  // the SSOT, and a wall asserts the subset survives a regen.
  sampler_name: vocabulary([
    // the membership test widens the tuple's read view (a readonly
    // literal tuple's includes() demands the literal union — the
    // filter's n is string; the WALL, not the tuple's type, keeps
    // every member honest against the SSOT)
    ...SAMPLER_OPTIONS.filter((n) => (H3_RECOMMENDED_SAMPLERS as readonly string[]).includes(n)),
  ]).description("Sampler").default("euler").extra('extra', samplingExtra('sampler', { tooltip: "The KSampler solver. euler family pairs with turbo adapters; res_multistep is the official-template solver; er_sde+beta is the Parasyte rec; seeds_2/3 are the dual-clock family." })),
  // the same law for the scheduler: the kit's engine vocabulary,
  // read (the census's H2 — a retyped list is a second SSOT)
  sched_name: vocabulary([...SCHEDULER_OPTIONS]).description("Scheduler").default("simple").extra('extra', samplingExtra('scheduler', { tooltip: "The sigma schedule shape." })),
  // ── THE T3 REFINE RIDER (roadmap item 2; ledger #30 §3(2)) —
  // the crowd's third tier: a short CLOSING pass over each
  // window's output latent, the refiner lora on its OWN loader
  // (the primary stack never changes). Empty refine_lora = no
  // rider, the graph renders exactly as before. The instrument:
  // the catalog's refiner rows (h3_taomate_3step — 0.7 @ 3 steps,
  // the arena's refiner operating point). ONE OWNER PER KNOB:
  // refine_lora picks the instrument; strength/steps default from
  // THE ROW (no silent overrides); the pass rides the doc's own
  // sampler/scheduler.
  refine_lora: z.string().description("Refine lora").default("").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'select', optionsFrom: 'loras', tooltip: "Pick a refiner lora from your library (e.g. h3_taomate_3step). Empty = no refine pass. Strength/steps default from the row. LORAS ARE ONLY MODS — pick from the list; an unknown id is refused." })),
  refine_strength: z.number().description("Refine strength").min(0).max(2).step(0.05).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'number', tooltip: "Override the refiner row's strength. Rides only when refine_lora is set." })),
  refine_steps: z.number().description("Refine steps").min(1).max(10).step(1).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'number', tooltip: "Override the refiner row's step count (taomate: 3). Rides only when refine_lora is set." })),
  // THE REFINE WINDOW (SOTA plan limb 1, H3_TIMELINE_RESERACH Stage
  // 3; RE-TUNED by the P0 parameter audit, 2026-11-10): the DEFAULT
  // is 0.35 — the research's refinement window [0.30, 0.35] keeps
  // pass 1's structure and polishes texture, instead of the old
  // default 1.0 regenerating the whole window (the TaoMate
  // full-denoise mechanic). 1.0 stays STATEABLE for that mechanic;
  // the ARM 36 band arm outlaws an out-of-window default.
  // (0.05, 1]; 0 is a dead pass and refuses.
  refine_denoise: z.number().description("Refine denoise").min(0.05).max(1).step(0.05).default(0.35).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'number', tooltip: "The refinement window (the researched 0.30–0.35 band): pass 1's structure stays, the second pass polishes texture. Default 0.35. 1.0 = full re-denoise (the taomate full pass, opt-in). Rides on the refine rider when refine_lora is set — and as the handoff's own window when the latent-upscale route is on." })),
  // ── THE LATENT-UPSCALE ROUTE (SOTA plan Phase P2, 2026-11-10) —
  // the learned-latent alternative to the SeedVR2 pixel route: the
  // vendored xmarre pack's MinimaxH3LatentUpscaler3DRefineHandoff
  // rides IN-BAND on the pass-1 joint AV latent (upscale + the
  // low-sigma refinement inside the 3D-conv kernel, audio preserved
  // under lock_audio). The sub-gate: route latents halve the r2v head
  // (1344×768 → 672×384) so pass 1 composes the quarter the kernel
  // was distilled on; the rider (when set) mounts in-band on the
  // upscaled latent. Route off (default) = the graph is byte-stable
  // with the pre-route estate (ARM 41).
  upscale_route: vocabulary(["off", "latent_2x"]).description("Latent upscale route").default("off").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'select', tooltip: "Upscale between the passes: off (default — the second pass works at full size) or latent_2x (pass 1 renders at half size, the learned upscaler doubles the latent in-band before the second pass)." })),
  // CLOSED FILE SURFACE (the operator's dropdown law — the sr_model
  // precedent above): the ONE file the estate runs — the on-disk LBH
  // v1 3D-conv bf16 checkpoint (the h3 latent weight, verified
  // sha256 4f57821f). Single-member until the vendor ships a second
  // weight; the union owns the dropdown AND the membership refusal.
  upscale_model: vocabulary(["minimax_h3_latent_upscaler_3d_bf16.safetensors"]).description("Latent upscale model").default("minimax_h3_latent_upscaler_3d_bf16.safetensors").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'select', tooltip: "The learned latent-upscale weights (the 3D-conv bf16 checkpoint). Joins from the engine's latent-upscale shelf." })),
  // ── THE ATTENTION BACKEND (roadmap item 3; the h3_attention
  // "sage/sol" folklore was FICTION — no such knob, and the engine
  // enumerates only 'pytorch attention' on ModelAttentionBackend;
  // sage/sol are NOT served). This knob owns the ONE input the
  // non-SLA arm actually pins: 'comfy kitchen attention' is the
  // estate-proven literal (plaguekind's template value, silicon
  // receipts on the t4 arm); 'pytorch attention' is the engine's
  // own enumeration. Values the engine refuses are NOT offered.
  attention_backend: vocabulary(["comfy kitchen attention", "pytorch attention"]).description("Attention backend").default("comfy kitchen attention").extra('extra', bag({ order: null, group: 'sampling', wtype: 'select', tooltip: "The attention math the engine uses when the SLA sparse-attention switch (Sla group) is OFF. comfy-kitchen is the proven default; pytorch is the engine's fallback." })),
  interp_model: vocabulary(["film_net_fp16.safetensors", "rife47.pth"]).description("Interp model").default("film_net_fp16.safetensors").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&interpolate_enabled=true", wtype: 'select', tooltip: "FILM or RIFE frame-interpolation weights." })),
  interp_multiplier: z.number().description("Interp multiplier").min(2).max(4).step(1).default(2).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&interpolate_enabled=true", wtype: 'number', tooltip: "Frame multiple (2 = double the frame rate)." })),
  sr_switch: z.boolean().description("Super-Res (SeedVR2)").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", tooltip: "Upscale the final film through SeedVR2 before saving." })),
  sr_resolution: z.number().description("Super-Res target").min(720).max(2160).step(360).default(1080).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sr_switch=true", wtype: 'number', tooltip: "The SeedVR2 output height in px." })),
  // CLOSED FILE SURFACE (the operator's dropdown law — a free-text
  // weights row is a guess box): the two SeedVR2 DiT files the estate
  // actually runs (both proven in shipped _flow.json receipts: the fp16
  // 3B default + the fp8_e4m3fn 3B the lane walked). The union owns the
  // dropdown AND the membership refusal (an off-set value fails at the
  // schema door, never as a ComfyUI 400). Gated behind sr_switch like
  // every other post leaf.
  sr_model: vocabulary(["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"]).description("Super-Res model").default("seedvr2_ema_3b_fp16.safetensors").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sr_switch=true", wtype: 'select', tooltip: "SeedVR2 weights (models/upscale_models/): fp16 3B default, fp8_e4m3fn 3B leaner." })),
  // the R2V COMBO size mode — a literal OR a concrete WxH dimension
  // ("704x1280" rides in real runs; a number or a typo refuses LOUD at
  // the gate now, not as a ComfyUI 400). The select face serves the
  // literal; WxH stays reachable by patch, exactly as before.
  // NEVER MAX (spec-match cure 3, timeline audit 2026-10-27): the
  // spec's diagnostic matrix seats the aspect-distortion failure
  // mode on "Setting reference image scale to max" — the max edge
  // warps the reference's aspect into the output frame. The union
  // drops the max literal; a max doc refuses LOUD at the schema
  // gate in the spec's own voice.
  ref_image_size: z.union([z.const("match"), z.string().pattern(/^\d+x\d+$/).description("WxH")]).description("Ref size").default("match").extra('extra', bag({ order: null, group: 'sampling', wtype: 'select', tooltip: "How the bundle resizes ref images: match the anchor's aspect (the spec's law — never max, the max edge distorts aspect), or an explicit WxH." })),
  // NO SILENT RESOLUTION LAW (2026-09-20, the operator's order):
  // one truth, one owner. shift_video is a NUMBER, default 8, served
  // and walked identically. The old z.const(null) arm — the
  // "family-literal resolution path" that walked empty docs to null
  // so the renderer's ?? floor could silently pick the family's own
  // literal — is deleted. An explicit null in a draft now REFUSES
  // LOUD at the walk. The hour-22 double-default (same 8 spelled on
  // the union and the inner arm) never made the walk fill 8; it
  // bought the face a number while the call kept the body literal.
  shift_video: z.number().description("Video Shift").min(1).max(20).step(0.5).default(8).extra('extra', bag({ order: 5, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "Timestep shift for video attention. Higher = more coherent motion." })),
  shift_audio: z.number().description("Audio Shift").min(1).max(10).step(0.5).default(3).extra('extra', bag({ order: 6, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "Timestep shift for audio attention. Lower = more detailed sound.", })),
  // ── the SLA family (hour 16, item 3): compose-read knobs, now
  // EMITTED — the studio's advanced panel rides the served spec
  // (SpecFieldRow) instead of hand-rolled rows. Defaults are the
  // compose's own ?? fallbacks, byte-for-byte; the h3_ prefix is the
  // studio's LayerA spelling (docModel), never the card's.
  // THE MASTER SWITCH (operator order 2026-09-21: "is there a switch
  // to turn SLA on/off or is it always on" — it was always on): the
  // one boolean heads the sla group; every tuning leaf below rides
  // visible_when behind it. Default true = today's behavior for
  // every existing doc (absent = on at compose).
  sla_enabled: z.boolean().description("SLA sparse attention").default(true).extra('extra', bag({ order: null, group: "sla", tooltip: "Block-sparse attention on the DiT (the primary speed arm, ~1.75x). Off falls back to the Attention backend row." })),
  // SLA_SPARSITY (the P0 parameter audit, 2026-11-10 — plan
  // dev_docs/design/h3-sota-execution-plan-2026-11-10.md §2): default
  // 0.9 → 0.85. The research band is 0.75–0.85 (H3_TIMELINE_RESERACH
  // §3 summary matrix) and the kernel's own tooltip states 0.85 is
  // "the shipped default and what the SLA turbo LoRA was distilled
  // against" (object_info_prod H3SLAAttention) — the shipped 0.9 sat
  // OUTSIDE both (ROADMAP's old "no cure owed" row conflated
  // knobs-seated with values-matching). 0.90 stays a STATEABLE speed
  // preset; the band arm ARM 35 reds a default nudged past either
  // edge without the P3 arena's receipt.
  sla_sparsity: z.number().description("SLA sparsity").min(0).max(0.95).step(0.05).default(0.85).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'slider', tooltip: "Block-sparse attention density. Default 0.85 — what the speed turbo LoRA was distilled against, and the top of the researched 0.75–0.85 band. 0.90 is a stated speed preset (~15% faster, kept from earlier tuning); below ~0.60 the sparse kernel is slower than plain attention. Steps, not this dial, own audio cleanliness." })),
  // BLOCK SIZE — audited MATCH (the P0 audit's table verdict; no
  // retune): "32" IS the kernel's own default and its tooltip's
  // quality-best point ("Coming down to 32 has increased the quality
  // even further for marginal slowdown"). The old tooltip named only
  // 64/128 — a default its own copy never mentioned. Stated in full:
  sla_block_size: vocabulary(["32", "64", "128"]).description("SLA block size").default("32").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select', tooltip: "How many tokens share one key selection — it matters most for audio. 32 = the default, the finest routing and the kernel author's quality-best. 64 = clean audio, ~2% faster. 128 = robotic speech; audio-less generations only." })),
  sla_min_seq_len: z.number().description("SLA min seq length").min(512).step(512).default(12288).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'number', tooltip: "Sequences shorter than this skip sparsity." })),
  sla_dense_last_steps: z.number().description("SLA dense last steps").min(0).max(10).step(1).default(2).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'number', tooltip: "Final steps run dense for convergence." })),
  sla_dense_steps: z.string().description("SLA dense steps (explicit)").default("0").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "e.g. 0,1 or 0-2 — explicit dense step indices." })),
  sla_dense_backend: vocabulary(["comfy_kitchen", "pytorch", "auto"]).description("SLA dense backend").default("comfy_kitchen").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select' })),
  sla_reference_protection: vocabulary(["Off", "Light", "Heavy Enforcement"]).description("SLA ref protection").default("Heavy Enforcement").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select', tooltip: "Protects reference frames from sparse-attention drift." })),
  sla_protect_audio: z.boolean().description("SLA protect audio").default(true).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Keep the audio stream out of the sparse path." })),
  sla_stabilize_motion: z.boolean().description("SLA stabilize motion").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Untouched, this turns on for every model except the t4r openers — those run with it off." })),
  sla_disable_fp16_accum: z.boolean().description("SLA full-precision accum").default(true).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Full-precision accumulation inside the sparse kernel." })),
  // ── the sharpen leaves (compose: only EXPLICITLY-set leaves patch
  // ImageSharpenKJ's grouped dict — bare emission defaults do NOT
  // change a run that never sets them). VISIBILITY rides the
  // declaration's own visible_when grammar (&-ANDed guards, |-SET
  // values) — no hand-rolled predicates anywhere.
  sharpen_method: vocabulary(["rcas", "adaptive_usm", "high_pass", "deconvolution"]).default("rcas").description("Sharpen Method").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true", wtype: 'select' })),
  sharpen_radius: z.number().description("Sharpen Radius").min(0.5).max(5).step(0.5).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass|deconvolution", wtype: 'number', tooltip: "adaptive_usm / high_pass / deconvolution only." })),
  sharpen_threshold: z.number().description("Sharpen Noise Gate").min(0).max(1).step(0.05).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm", wtype: 'number', tooltip: "adaptive_usm only." })),
  sharpen_iterations: z.number().description("Sharpen Iterations").min(1).max(100).step(1).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=deconvolution", wtype: 'number', tooltip: "deconvolution only." })),
  // NOTE: the calls[] SHOTS surface is deliberately NOT a carrier
  // knob — the carrier feeds the studio's frozen form-spec (the
  // studio owns its own shots editor, ui/studio/docModel) and the
  // served manifests. The AGENT plane declares calls in the tool
  // face (src/tool.ts); the SHOT LAWS are the card gate's (schema()
  // below — the model_validator port), so every composer
  // agent tool, studio, any future caller — meets the same gate.
  // THE VOCABULARY DECLARATION (2026-09-19, the operator's order: the
  // schema enforces EVERY key the renderer reads — no blind casts, no
  // silent rides): the stanza/film vocabulary below was historically
  // undeclared (it rode `admits` and every walk passed it verbatim
  // while renderH3Window blind-cast it). Types mirror the renderer's
  // reads exactly; NO defaults — the renderer's ?? fallback chains
  // stay authoritative, the walk only REFUSES garbage. HIDDEN FROM
  // THE FACE (2026-09-21, the operator's catch — "WHAT IS WINDOW
  // INDEX, WHY IS IT BLANK"): validation-only keys never render; a
  // default-less blank row on the form is a lie.
  k: z.number().description("Window index (film vocabulary)").step(1).extra('extra', bag({ hidden: true })),
  noise_seed: z.number().description("Per-window noise seed").step(1).extra('extra', bag({ hidden: true })),
  // NO STALE fps_seconds (2026-10-16, the operator's law — "NO
  // STALE ANYWHERE"): this row is INTERNAL (the declared surface's
  // own words) and derives from the window's generation length at
  // compose, every compose. The old .default(10) seeded every
  // unstated doc with a 10-second clock that outlived every span
  // drag — the operator's burn: a 5-second span on the bar rendered
  // 10 seconds of mush. No default, no user face: hidden; the
  // compose owns the derivation (render loop restates it
  // unconditionally from the actual window length).
  fps_seconds: z.number().description("Clip seconds (fps rail — internal, derived from the window length at compose)").min(1).max(60).extra('extra', bag({ hidden: true })),
  // THE LEGACY ALIASES (renderer-era spellings of the mod switches)
  // — gate-admitted for old drafts, never user surface: the MODS
  // own the switches (the operator's law), one face each.
  interp_switch: z.boolean().description("Interpolate switch (legacy alias)").extra('extra', bag({ hidden: true })),
  sharpen_switch: z.boolean().description("Sharpen switch (legacy alias)").extra('extra', bag({ hidden: true })),
  sla_switch: z.boolean().description("SLA switch (legacy alias)").extra('extra', bag({ hidden: true })),
  // (no wtype: hidden fields never render — the kind mapping rides
  // flowKinds.legacyAliases, pinned in input-surface.spec.ts; a wtype
  // here is dead surface the estate wtype judge refuses.)
  image_name: z.string().role('path').description("Guide image (renderer alias)").extra('extra', bag({ hidden: true, tooltip: "The renderer's guide-image spelling — gate-admitted for old docs; the rail's First frame is the user face." })),
})

/** Schemastery objects are lenient (unknown/missing keys ride); the
 *  family-admission laws are the renderer's own validators, ported:
 *  unknown variant + family-conditional key admission on EXPLICIT
 *  params only (the python gate reads model_fields_set). The t4r
 *  staged-image law rides compose (it reads the merged value). The
 *  renderer-vocabulary keys (variant, k, ctx_*, sla_*, ...) are NOT
 *  declared knobs — old drafts keep working because the schema admits
 *  them and the compose door overlays explicit params last (the
 *  img-to-mesh filename_prefix precedent). */
// THE WIRE LAW (hour 20 — ONE definition, every door): a fresh stage
// from the bench add-door rides the served wire literal ("false"/"true")
// as an EXPLICIT key; coerce it to the runtime boolean before the
// boolean walk refuses it. Absent keys need nothing — default(false)
// fills natively. (A schemastery field transform would classify the
// served knob as type 'json' — the honest 'boolean' taxonomy wins,
// so the law lives here, shared by schema() and the compose gate.)
export const coerceWireBoolean = (raw: Record<string, unknown>): Record<string, unknown> => {
  if (typeof raw.interpolate_enabled === 'string') {
    // ENFORCEMENT (the wall's catch, 2026-09-19): the coercion admits
    // the TWO wire literals only — any other string refused LOUD
    // (silent garbage-to-false was a walk bypass, never the wire law).
    const v = raw.interpolate_enabled
    if (v !== 'true' && v !== 'false') {
      throw new Error(`interpolate_enabled must be a boolean or the wire literal "true"/"false" — got ${JSON.stringify(v).slice(0, 40)}`)
    }
    return { ...raw, interpolate_enabled: v === 'true' }
  }
  return raw
}

export function schema(v: unknown): Record<string, unknown> {
  const raw = (v ?? {}) as Record<string, unknown>
  if (raw.calls !== undefined && !Array.isArray(raw.calls)) {
    throw new Error('h3-timeline: calls must be an array of shot rows')
  }
  if (raw.audio_clips !== undefined && !Array.isArray(raw.audio_clips)) {
    throw new Error('h3-timeline: audio_clips must be an array of clip rows')
  }
  // length null SURVIVES this walk on purpose (the walk-shadow fix:
  // multi-call docs keep null — per-window spans compute at compose).
  // THE ARRAY WIRE GUARD (P2, 2026-09-24): the schema's own dict
  // names the array keys — a wire "" (the empty-array corruption)
  // fills to [], an {item:[…]} wrapper unwraps — same law as the
  // boolean wire tolerance above (receipts: commission 034's
  // run-9953f652410d-d365af74, `$.ref_images expected array but
  // got [object Object]` ×4 and `calls: ""`).
  const out: Record<string, unknown> = paramSchema(
    coerceWireArrays(paramSchema, coerceWireBoolean(raw)),
  )
  // THE AXIS FILTER (one truth, 2026-10-27 — the variant:'timeline'
  // break): `variant` on the wire carries TWO vocabularies — the
  // model axis ('timeline', the stamp the add door seeds onto every
  // fresh stage) and the window family (t4r/t4_open/t4_chain). A
  // stated FAMILY rides; an axis string is not a family claim — the
  // doc's seats derive the family, model metadata never picks a
  // render lane, and 'unknown window family' never fires on it.
  let variant = typeof raw.variant === 'string' && (FAMILIES as readonly string[]).includes(raw.variant)
    ? raw.variant : undefined
  // variant DERIVATION (opener_family/chain_family): the studio calls shape carries no variant; the card derives it.
  // An image-anchored opener rides t4r; a text-only single call is t4_open; multiple calls chain (t4_chain).
  // THE FRESH-PRESS STARTER (the operator's 2026-09-17 instant-fail:
  // a freshly added card holds params {} — calls is NOT a form knob,
  // so the bench tile's Run composed no shots and the door refused
  // "no calls to compose" before the studio ever persisted its doc).
  // ABSENT calls compose the card's own fresh-card document: ONE
  // window 0→90 — the t4_open fresh-card draft budget (
  // display = render, 3.8s). A user authoring a LONGER single window
  // gets it ungated — the operator's order 2026-09-17 ("don't add
  // gates; if a user wants a long window, they should get a long
  // window"); the span-vs-engine receipts live in the ledger as
  // knowledge, never enforcement. An
  // EXPLICIT empty array keeps the retired compose refusal verbatim
  // ("%s: no calls to compose"): a caller naming
  // zero shots is garbage; a caller naming none is a fresh card.
  if (variant === undefined) {
    let calls: unknown[] = []
    if (Array.isArray(raw.calls)) {
      calls = raw.calls
    } else {
      calls = [{ start_frame: 0, end_frame: 90 }]
      out['calls'] = calls
    }
    if (calls.length === 0) {
      throw new Error('h3-timeline: no calls to compose')
    }
    // THE ROW-LEVEL NUMERIC RESTORE (attempt-035/009's stop-law
    // receipt, 2026-09-24): `calls` and `audio_clips` are
    // DELIBERATELY undeclared on paramSchema (the agent plane owns
    // them) — the dict-driven wire fill has no license on undeclared
    // keys, so a stringified `start_frame: "0"` rode into the shot
    // laws and refused `start_frame is required (int frames — text
    // alone is not a shot)` EVEN THOUGH the caller sent the number.
    // The card OWNS the int law here — it restores the strict-grammar
    // int-string itself (same fill law as the kit's, scoped to the
    // row fields the shot laws read).
    const INT_STRING = /^[+-]?\d+$/
    const wireInt = (x: unknown): unknown =>
      (typeof x === 'string' && INT_STRING.test(x.trim()) ? Number(x.trim()) : x)
    for (let wi = 0; wi < calls.length; wi++) {
      const wc = (calls[wi] ?? {}) as Record<string, unknown>
      for (const wn of ['start_frame', 'end_frame'] as const) {
        const wv = wireInt(wc[wn])
        if (wv !== wc[wn]) {
          wc[wn] = wv
          calls[wi] = wc
        }
      }
    }
    // THE SHOT LAWS (the ranges are the card gate's, never a silent re-default: an out-of-range seam is refused and a reversed span is refused; both banned).
    // (the seam_carry law died with the MotionContext seam — the
    // drift-control continuation owns the chaining now, overlap is
    // automatic, never user-authored lane physics)
    for (let i = 0; i < calls.length; i++) {
      const c = (calls[i] ?? {}) as Record<string, unknown>
      const unknown = Object.keys(c).filter((key) => !CALL_KEYS.has(key)).sort()
      if (unknown.length > 0) {
        throw new Error(`calls[${i}]: unknown per-call key(s): ${unknown.join(', ')}`)
      }
      for (const name of ['start_frame', 'end_frame'] as const) {
        const v = c[name]
        if (v === undefined || v === null || typeof v !== 'number' || !Number.isInteger(v)) {
          throw new Error(`calls[${i}]: ${name} is required (int frames — text alone is not a shot)`)
        }
      }
      if ((c.end_frame as number) <= (c.start_frame as number)) {
        throw new Error(`calls[${i}]: end_frame ${c.end_frame} <= start_frame ${c.start_frame} — a reversed or empty span is not a shot`)
      }
      if (i > 0) {
        // the previous row was already validated as an int-span object
        // (a hole at i-1 refused at its own iteration), so no fallback
        const previous = calls[i - 1] as Record<string, unknown>
        if (c.start_frame !== previous.end_frame) {
          throw new Error(`calls[${i}]: start_frame ${String(c.start_frame)} must equal previous end_frame ${String(previous.end_frame)} — calls tile the film timeline; gaps and overlaps are refused`)
        }
      }
      const transition = typeof c.transition === 'string' ? c.transition : undefined
      // THE GRID GATE (§26, the walk arm): a call's knobs.length pin
      // bypasses every snap arm downstream — validate at the walk so
      // `validate` refuses what the engine would kill at GPU cost.
      const cknobs = (c.knobs ?? {}) as Record<string, unknown>
      if (cknobs.length !== undefined && cknobs.length !== null) {
        assertGridLength(cknobs.length, `calls[${i}].knobs.length`)
      }
      // THE UNIFORM SPAN GATE: one grid law for every window shape —
      // carried windows (i>0, non-cut) generate span+22, first/cut
      // windows generate their span, and an off-grid authored span is
      // refused at admission instead of silently snapped.
      assertSpanGrid({
        start: c.start_frame as number,
        end: c.end_frame as number,
      }, `calls[${i}]`, i > 0 ? transitionOverlap(transition) : 0)
      // THE GUIDE MEDIA GATE (2026-10-26, the dropped-anchor audit):
      // a guide seat must NAME MEDIA — a path, URL, data: URI, or
      // $spell. The UI's reference picker once wrote the SOURCE
      // STAGE's name ("image-gen") into the anchor seat and the run
      // rendered text-only (the compose read the guide, the engine
      // had no such file). A bare word with no slash, dot, or scheme
      // is a label, never media — refuse here, naming the value and
      // the cure, at admission (zero GPU) instead of the engine door.
      // (the predicate lives in timelineContract — the keyframe pin
      // gate judges the same law at its own door)
      for (const gkey of ['image', 'ref_image', 'image_name'] as const) {
        const gv = c[gkey]
        if (typeof gv === 'string' && gv.trim() !== '' && !isMediaRef(gv.trim())) {
          throw new Error(
            `calls[${i}].${gkey}: "${gv.trim()}" names no media — a stage/card name is not an image ` +
            `(pick the artifact: a file path, URL, or $spell rides; a label never does)`,
          )
        }
      }
      for (const garr of ['ref_images'] as const) {
        for (const entry of wireList(c[garr])) {
          if (!isMediaRef(entry.trim())) {
            throw new Error(
              `calls[${i}].${garr}: "${entry.trim()}" names no media — a stage/card name is not an image ` +
              `(pick the artifact: a file path, URL, or $spell rides; a label never does)`,
            )
          }
        }
      }
    }
    // (the shot-law loop above guarantees every row is a shaped
    // object with pinned int spans — no gap-arms needed here)
    // variant is a WINDOW property: a single-call doc's guide makes the
    // whole (one-window) graph t4r; a MULTI-call doc is a film — its
    // variant is t4_chain and each window derives its own family in
    // the merged renderer (a guide call renders as its own t4r window)
    // THE GUIDE-KEY UNION (2026-10-26, the dropped-anchor audit): the
    // compose reads FOUR guide spellings (call.image ?? call.ref_image
    // ?? call.image_name — actions.ts:268/:1635); the derivation must
    // know every spelling the compose knows, or a guide silently
    // derives a text-only window (run-899a8448: the UI wrote `image`,
    // the derivation checked the other three, variant fell t4_open and
    // the reference never became a node).
    // ONE spelling now — deriveWindowFamily above (the
    // family-reseat cure, 2026-11-06). The walk passes the
    // SYNTHESIZED calls (the fresh-card arm above), so the
    // fresh-press shape derives exactly as it composes; the guide
    // union, the pin channel, and the declared input surface live
    // in the export, never re-spelled here.
    variant = deriveWindowFamily({ ...raw, calls })
    out.variant = variant
  }
  // (2026-11-06, the family-reseat cure) the unknown-family throw is
  // DEAD by totality and deleted: variant is either a STATED family
  // (only ever assigned when it is a FAMILIES member) or a DERIVED
  // one (deriveWindowFamily returns exactly the three members), so
  // `includes(variant)` could never be false — the guard was
  // uncoverable code the per-file gate kept paying for.
  // THE ONE NULL LAW (the journey-FAIL reopen, 2026-11-08): null
  // is UNSTATED at every arrival door — the switch verbs' delete
  // mark (modelSwitchPatch null verdicts, mergeSwitchFrame,
  // seedUser), the drill null-set precedent, the 21 lane's
  // journey-PASSed null→200. An arrival door that reads explicit
  // null as stated re-opens ERROR g's gap (the gate promises []
  // while the walk refuses 400). So `explicit` is stated-and-
  // valued: a null-carried key never counts as stated — at the
  // dead-key gates AND the same `bad` reader's film-only sibling
  // below. (The merge already drops nulls; the schema never sees
  // a null it must type-check — unstated keys ride their honest
  // defaults.)
  const explicit = new Set(Object.keys(raw).filter((k) => (raw as Record<string, unknown>)[k] !== null))
  // NO SILENT RESOLUTION LAW (2026-09-20): shift_video's declared
  // default(8) is THE owner. The old nulling — "an omitted key
  // normalizes back to null so the body resolves the family's
  // literal (t4 INT 8 / t4r 8.0) and the frozen graphs stay
  // byte-identical" — was the two-owner disease in its purest form:
  // the declaration promised 8, the walk delivered null, the body
  // invented 8 back. JS serializes 8.0 and 8 identically, so the
  // nulling bought nothing but the lie. The no-cheat door refuses
  // this card shape on sight now.
  // length: the SAME law (the walk-shadow fix, 2026-09-13) — the
  // declared .default(56) is the declared default,
  // but the body computes the family's frame budget where the python
  // computes it (t4_open 90 / else 56 — "None = absent on wire").
  // Without this normalization the schemastery walk materializes 56 on
  // every doc that omits the key and the t4_open 90 branch is dead —
  // a hand-authored single text window silently rendered 56 frames.
  // NO SILENT RESOLUTION LAW, length arm (2026-09-20): a declared
  // default may never walk null. Single-call docs keep the span
  // rider (the window's grid-snapped span, EXPLICIT — the doc's span
  // IS the film). Multi-call docs let the walked default stand INERT
  // — the doc-level length is a WINDOW knob and multi-call films
  // have no doc-level window; the per-window stanza lengths own the
  // film (each call's span), and the studio's timeline readouts
  // compute off the calls, never this key. (An earlier arm of this
  // rework filled the FILM TOTAL here — wrong law: the 17k+5 grid
  // belongs to windows, a total is arbitrary span arithmetic, and
  // the walk's grid validation rightly refused off-grid totals.)
  if (!explicit.has('length')) {
    const rows = Array.isArray(out.calls) ? out.calls as Array<Record<string, unknown>> : []
    if (rows.length === 1) {
      // (the shot laws above guarantee valid int spans — direct
      // reads, no defensive re-validation)
      const sf = rows[0].start_frame as number
      const ef = rows[0].end_frame as number
      // (the shot laws above guarantee valid int spans — every
      // single-call doc rides the snap arm; no defensive else)
      out.length = (ef as number) - (sf as number)
    }
    // rows.length !== 1: the walked default stands (56 fresh-card,
    // inert for multi-call chains — spans own the film)
  }
  const bad = (keys: readonly string[]) => keys.filter((kk) => explicit.has(kk)).sort()
  if (variant === 't4r') {
    const b = bad(T4_ONLY_KEYS)
    if (b.length) {
      // (B8, journey-closure 2026-10-17 — h3-inject-keys-burn
      // §CURES-OWED 6 / timeline-calls-burn §CURES-OWED 7) THE
      // HONEST-VOICE RIDER, per the cured unknownQuantVoice precedent
      // (web-kit/contracts laneRelations: a refusal names the SEAM
      // and the repair, not just the fact). The spine
      // `h3_window(t4r): unsanctioned inject keys: <keys>` stays
      // byte-identical — the B5 admission clause and the pick verdict
      // quote it verbatim, the walls grep it — the tail only extends
      // it. The writer: the keys were staged lawfully on the doc's
      // Layer-A plane (the serializer's emit dialects or a recipe
      // stamp) and the guide seats re-derived t4r under them. The
      // repair is one gesture: a stating commit through the studio
      // re-derives the family and unstamps the residue in the same
      // save (the B2 flip writer), or the named keys null-delete at
      // the bench patch door. The film-only sibling below keeps its
      // own voice — its writer is a stale duck row, not this emit
      // (follow-up, not this scope).
      throw new Error(
        `h3_window(t4r): unsanctioned inject keys: ${b.join(', ')}`
        + ` — the studio's Layer-A emit carries lane-dead post keys (the family re-derived t4r under a legal stamp);`
        + ` the repair is one gesture: restate the doc through the studio`
        + ` (the commit re-derives the family and unstamps the residue)`
        + ` or null the named keys at the patch door`,
      )
    }
  }
  // (B6, timeline-calls-burn §CURES-OWED 5 / ui-truth-gap #4's walk
  // leg) THE FILM-ONLY GATE, the t4r gate's sibling: FILM_ONLY_KEYS
  // are read in exactly one seat — computeFilmMix's manifest, inside
  // the multi-window film tail (actions.ts) — so a single-window doc
  // (t4r, t4_open) stating one composed it into NO node: the operator
  // set a duck depth the mix desk never saw. The studio rail's omit
  // law (RunRecipeEngine.tsx) judges the SAME contract set — one
  // home, timelineContract.ts — so a row either door refuses is
  // refused at both.
  if (variant !== 't4_chain') {
    const b = bad(FILM_ONLY_KEYS)
    if (b.length) throw new Error(`h3_window(${variant}): film-only inject keys: ${b.join(', ')}`)
  }
  // THE STEPS-PIN STAMP (007-H3-LoRA-PLANE L3): whether the caller
  // pinned steps is a fact only this walk owns (the raw keys —
  // defaults materialize downstream and the film build can no
  // longer tell a pinned count from the walked default). The
  // single-window marriage reads it: an explicit count is the
  // user's word and the distill default never overwrites it. The
  // __-prefix internal channel (the film loop's
  // __iteration/__overlap precedent) — faces project the carrier's
  // declared knobs only, so no served surface changes.
  out.__steps_pinned = explicit.has('steps')
  // THE SHIFT-PIN STAMP (SOTA limb 2, the __steps_pinned heir):
  // whether the caller pinned shift_video is a fact only this walk
  // owns — the married shift (the distill row's own grid) applies
  // only to the UNSTATED doc; an explicit shift is the user's word.
  out.__shift_pinned = explicit.has('shift_video')
  return out
}

// THE TOOL-FACE EXPORTS: the carrier (paramSchema — the same object
// the registry's schemaCarrier hands the served-manifest projection;
// ONE spelling, two doors) + the identity rung (the ring's label/
// description prose, stated once).
export const carrier = paramSchema
