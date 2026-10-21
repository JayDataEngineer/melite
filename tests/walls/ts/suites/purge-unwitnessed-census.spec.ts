// purge-unwitnessed-census.spec.ts — P0 THE UNWITNESSED-HOP CENSUS (the class wall).
//
// THE LAW (purge §7 P0): every served knob × every hop, DERIVED (not
// listed) — UI seat ∃? serialize carries both directions? saved doc
// composes through the REAL door per derived family? graph carries the
// value AT THE CONSUMER? served lib fresh? Any UNWITNESSED cell reds.
// Landed precedent: spec-facts-sync, quant-pool-parity (derived
// rosters over hand counts).
//
// THE ROSTER IS DERIVED: the knob list is text-parsed from the five
// purge-lane DECLs' live `params` rows (the DRILL-a precedent —
// stage-drill-gates.spec.ts windowDocs paramsOf). No hand list: a knob
// added to a DECL appears in the census on the next run. A DECL whose
// params row stops parsing fails the roster arm (the derivation's own
// integrity gate).
//
// THE STATUSES ARE THE PRE-REGISTRATION: purge §2/§3's census cells,
// transferred once, each citing its SD finding. A cure flips its cell
// by editing that cell's row in the SAME commit (the census diff IS
// the receipt — "receipt by construction").
//
// THE WITNESS RULE (the toggle protocol, purge §7 P0): a WITNESSED
// cell names its witness as the EXACT `it`/`describe` title of a GREEN
// arm in a wall file, verified by substring over the working tree. Two
// flips, both automatic:
//   (a) delete the arm → the title leaves the file → the cell flips
//       to UNWITNESSED → this suite reds;
//   (b) the arm goes red → wall convention marks its title
//       "(RED TODAY)" → the registered title (without the marker) no
//       longer matches → the cell flips → this suite reds.
// Both witness today: the dead-knobs D1/D2 arms went green with the
// yue2 cure (markers "(CURED …)" — the base titles still register),
// and ARM 3's flow arms went green with 821475e43's flows seats.
//
// THIS SUITE REDS ON TODAY'S TREE — BY DESIGN. Fully-green CI that
// ships the class is the failure under judgment (purge §7 closing).
// Its first run IS the red-proof: the UNWITNESSED count below. The
// gate goes green when the last cell witnesses, not before.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/purge-unwitnessed-census.spec.ts

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const read = (rel: string): string =>
  readFileSync(join(ROOT, ...rel.split('/')), 'utf8')

// ── THE DERIVED ROSTER ──────────────────────────────────────────────
// The five purge-lane DECLs (image-edit 21/2511, music music3/yue2,
// h3-timeline h3). Params rows parsed live, never listed.
const DECL_FILES: Record<string, string> = {
  'qwen-img-edit-21': 'packages/models/qwen-img-edit-21/src/index.ts',
  'qwen-img-edit-2511': 'packages/models/qwen-img-edit-2511/src/index.ts',
  music3: 'packages/models/music3/src/index.ts',
  yue2: 'packages/models/yue2/src/index.ts',
  h3: 'packages/models/h3/src/index.ts',
}

function paramsOf(family: string): string[] {
  const text = read(DECL_FILES[family]!)
  const m = text.match(/"params": \[([\s\S]*?)\]/)
  if (m === null) throw new Error(`no params array parsed from ${family} DECL`)
  const out = [...m[1]!.matchAll(/"([^"]+)"/g)].map((g) => g[1]!)
  if (out.length === 0) throw new Error(`empty params parsed from ${family} DECL`)
  return out
}

// ── THE WALL FILES (read-only; this suite never writes) ────────────
const WALL = {
  musicValues: 'packages/audio/music/tests/value-roundtrip.spec.ts',
  deadKnobs: 'packages/audio/music/tests/value-roundtrip-yue2-dead-knobs.spec.ts',
  drillNullSet: 'packages/web/melite-card-view/tests/drill-departed-surface-null-set.spec.ts',
  arrivalWindow: 'packages/web/melite-card-view/tests/stage-drill-gates.spec.tsx',
  rescueHonesty: 'packages/web/melite-card-view/tests/run-rescue.honesty-arms.spec.tsx',
  stripPane: 'packages/video/h3-timeline/tests/studio-strip-pane.spec.tsx',
  editValues: 'packages/image/image-edit/tests/value-roundtrip.spec.ts',
  h3Values: 'packages/models/h3/tests/value-roundtrip.spec.ts',
  h3Oracle: 'packages/video/h3-timeline/tests/action-oracle.spec.ts',
  refmodValues: 'tests/walls/ts/suites/refmod-value-arms.spec.ts',
  injectKeysMatrix: 'tests/walls/ts/suites/h3-injectkeys-prevalidation-matrix.spec.ts',
  composeLiveness: 'tests/walls/ts/suites/card-compose-liveness.spec.ts',
}

// ── THE CELL TABLE ──────────────────────────────────────────────────
// status: 'W' (witnessed — anchor verified below) | 'U' (unwitnessed).
// Every U cites its SD finding; every W names its anchor.
type Cell = {
  id: string
  status: 'W' | 'U'
  sd: string
  note: string
  wall?: string
  anchor?: string
}

// Hop-[5] VALUE cells, one per derived knob (purge §7 P0's core
// question: the graph carries the value AT THE CONSUMER?).
// Family defaults + per-knob overrides — the OVERRIDES are the
// pre-registration, the ROSTER stays derived.
function valueCells(): Cell[] {
  const cells: Cell[] = []
  // Music: ARM 1 (prompt verbatim), ARM 3's card CONTROL (lyrics at
  // the text-encode), ARM 6 (all numerics verbatim), ARM 2 + 2c
  // (mode fires on yue2 / refuses loud on music3).
  const MUSIC_VALUE_ANCHOR =
    'ARM 6 — the stated numerics ride VERBATIM to their consumers (duration/steps/guidance/lm_cfg/seed)'
  const MUSIC_PROMPT_ANCHOR =
    'ARM 1 — the stated prompt rides VERBATIM to the text-encode consumer (hop [4]→[5])'
  const MUSIC_LYRICS_CONTROL =
    'CONTROL — the card face carries lyrics today (the drop is the FLOW face, not the card)'
  const MODE_FIRE_ANCHOR =
    'yue2: mode melody states the mode at BOTH consumers; mode off composes no planner'
  for (const family of ['music3', 'yue2'] as const) {
    for (const knob of paramsOf(family)) {
      if (knob === 'prompt') {
        cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.musicValues, anchor: MUSIC_PROMPT_ANCHOR, note: 'verbatim at the text-encode/style consumers' })
      } else if (knob === 'lyrics') {
        cells.push({ id: `${family}.${knob} hop[5]-card`, status: 'W', sd: 'SD-6', wall: WALL.musicValues, anchor: MUSIC_LYRICS_CONTROL, note: 'card face only — the FLOW face drop is SD-4 (below)' })
      } else if (knob === 'mode' && family === 'yue2') {
        cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-1', wall: WALL.musicValues, anchor: MODE_FIRE_ANCHOR, note: 'fires at both YuE2 consumers' })
      } else if (knob === 'mode') {
        // music3's mode cell: the arm's title carries "(RED TODAY:
        // D1)" — the convention marks it as THE D1 instance (the burn
        // it closes), not as red. The anchor registers the title
        // WITHOUT the marker: deleting the arm flips the cell; if the
        // arm ever burns again the wall convention re-marks the title
        // and the registration must follow (same commit as the fix).
        cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-1', wall: WALL.musicValues, anchor: 'music3: a stated NON-default mode FIRES (the graph answers) or REFUSES LOUD naming \'mode\' — never silence', note: 'refuses loud, naming the knob (mode precedent)' })
      } else if (knob === 'guidance_scale' && family === 'yue2') {
        cells.push({ id: `${family}.${knob} hop[5]-value`, status: 'W', sd: 'SD-6', wall: WALL.musicValues, anchor: MUSIC_VALUE_ANCHOR, note: 'value fires at KSampler — BUT the surface wedge (stated-on-yue2) is SD-1/U below' })
      } else if (knob === 'lm_cfg_scale' && family === 'yue2') {
        cells.push({ id: `${family}.${knob} hop[5]-value`, status: 'W', sd: 'SD-6', wall: WALL.musicValues, anchor: MUSIC_VALUE_ANCHOR, note: 'value fires at MiniMax cfg — BUT the surface wedge (stated-on-yue2) is SD-1/U below' })
      } else {
        cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.musicValues, anchor: MUSIC_VALUE_ANCHOR, note: 'ARM 6 numeric/string verbatim pin' })
      }
    }
  }
  // Image-edit (both): SD-6 — the card-path VALUE law is walled
  // (value-roundtrip.spec.ts E1–E4: text pair verbatim at the
  // encoder, seed/steps/cfg + stated solver verbatim at KSampler,
  // the stated anchor image1 in LoadImage + the encoder's
  // images.image_1 arm — the operator-(f) class pin). Reference and
  // mask knobs beyond the anchor stay U; the DOOR path (estate
  // params through the compose door) is the owed extension.
  const EDIT_TEXT_ANCHOR: Record<string, string> = {
    'qwen-img-edit-21': 'E1 (21): the LONG prompt + negative ride verbatim into TextEncodeQwenImage21',
    'qwen-img-edit-2511': 'E2 (2511): the LONG prompt + negative ride verbatim into the EditPlus pair',
  }
  const EDIT_NUMERIC_ANCHOR =
    'E3 (both): seed/steps/cfg + the stated solver ride verbatim into KSampler'
  const EDIT_ANCHOR_ANCHOR =
    'E4 (both, operator f): the stated anchor image1 lands in the graph, never into nothing'
  const EDIT_PINNED = new Set(['input_images', 'image1', 'prompt', 'negative_prompt', 'seed', 'steps', 'cfg', 'sampler', 'scheduler'])
  // THE CLASS MAP (round 81's witness extension): the alias/mask/
  // specialty seats, each pinned by its E-arm (anchors are
  // SUBSTRING-matched by the witness rule — keep them verbatim).
  const EDIT_CLASS_ARM: Record<string, { anchor: string, note: string }> = {
    image2: { anchor: 'E6 (both): the alias seats ride their encoder slots', note: 'LoadImage + the encoder numbered arm (21: images.image_2; 2511: image2)' },
    image3: { anchor: 'E6 (both): the alias seats ride their encoder slots', note: 'LoadImage + the encoder numbered arm (21: images.image_3; 2511 folds under the 3-slot cap)' },
    reference_images: { anchor: 'E6 (both): the alias seats ride their encoder slots', note: 'each stated ref at LoadImage + the encoder slots after the numbered aliases (the merge order)' },
    input_mask: { anchor: "E7 (operator's region seat): a stated input_mask reaches LoadImageMask on the 2511 lanpaint arm", note: 'LoadImageMask.image verbatim (2511); the 21 lane REFUSES loud naming the knob' },
    match_input_resolution: { anchor: 'E8 (documented inert): match_input_resolution switches NOTHING', note: 'structural-identity pin — stated true/false compose identical graphs (the tooltip\'s own law)' },
    use_stock_nodes: { anchor: 'E9 (single-plane law): use_stock_nodes takes no branch', note: 'structural-identity pin — both values compose the stock graph (the plane\'s only edit graph)' },
    double_reference: { anchor: 'E10 (unbuildable, honest): a stated double_reference=true REFUSES loud naming the knob', note: 'the refusal IS the witness — never a silent plain-edit' },
  }
  for (const family of ['qwen-img-edit-21', 'qwen-img-edit-2511'] as const) {
    for (const knob of paramsOf(family)) {
      if (EDIT_PINNED.has(knob)) {
        if (knob === 'prompt' || knob === 'negative_prompt') {
          cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.editValues, anchor: EDIT_TEXT_ANCHOR[family], note: 'verbatim at the text-encode consumer' })
        } else if (knob === 'input_images' || knob === 'image1') {
          cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.editValues, anchor: EDIT_ANCHOR_ANCHOR, note: 'the anchor reaches LoadImage + the encoder arm (operator-f class)' })
        } else {
          cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.editValues, anchor: EDIT_NUMERIC_ANCHOR, note: 'verbatim at KSampler' })
        }
      } else {
        const cls = EDIT_CLASS_ARM[knob]
        if (cls === undefined) {
          // An UNKNOWN knob stays UNWITNESSED (a new DECL row needs its
          // class arm first — the roster grows, the witnesses follow).
          cells.push({ id: `${family}.${knob} hop[5]`, status: 'U', sd: 'SD-6', note: `unclassed edit knob — write its class arm in ${WALL.editValues} and map it here` })
        } else {
          cells.push({ id: `${family}.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.editValues, anchor: cls.anchor, note: cls.note })
        }
      }
    }
  }
  // h3: FIVE sampler knobs WITNESSED (P2 h3 value law,
  // models-h3-sampler-value-law — ARM 1 single-window verbatim at the
  // three sampler consumers, ARM 2 film-path per-call override, ARM
  // 3a/3b liveness) + THREE refine knobs WITNESSED (the refine landing
  // 2026-11-08: ARM 4 stated-mount, ARM 7 row defaults, ARM 6/8
  // refusals, ARM 9 completeness lock). THE P0 WITNESS EXTENSION
  // (round 80): every remaining class knob WITNESSED by its class arm
  // (ARMs 13-23 — each arm composes the real door and pins the stated
  // value at the probed consumer; per-class-seam toggle-proofs in the
  // receipt).
  const H3_VALUE_ANCHOR =
    'ARM 1 — single-window: the five stated sampler knobs land at RandomNoise / KSamplerSelect / BasicScheduler'
  const H3_PINNED = new Set(['seed', 'sampler_name', 'sched_name', 'steps', 'denoise'])
  const H3_REFINE_ANCHOR =
    'ARM 4 — second_pass_enabled + refine seats mount the T3 refine rider (TWO SamplerCustomAdvanced; the LTX stack carries the catalog file + stated strength; the rider scheduler carries the stated steps)'
  const H3_REFINE = new Set(['refine_lora', 'refine_strength', 'refine_steps'])
  // THE CLASS MAP (round 80's witness extension, one arm per class;
  // anchors are SUBSTRING-matched against the wall file by the witness
  // rule, so the arm titles here must stay verbatim).
  const H3_CLASS_ARM: Record<string, { anchor: string, note: string }> = {
    width: { anchor: 'ARM 13 — the shape + clock pins', note: 'verbatim at the ReferenceToVideo head' },
    height: { anchor: 'ARM 13 — the shape + clock pins', note: 'verbatim at the ReferenceToVideo head' },
    length: { anchor: 'ARM 13 — the shape + clock pins', note: 'verbatim at the ReferenceToVideo head' },
    ref_image_size: { anchor: 'ARM 13 — the shape + clock pins', note: 'verbatim at the ReferenceToVideo head' },
    fps: { anchor: 'ARM 13 — the shape + clock pins', note: 'the container clock (single window) + the window clock node (film)' },
    fps_seconds: { anchor: 'ARM 13 — the shape + clock pins', note: 'the DERIVED seconds pinned at the window clock node (the no-stale law); the stated-pin stand-down firing at ARM 33' },
    noise_seed: { anchor: 'ARM 13 — the shape + clock pins', note: 'verbatim at RandomNoise; the per-window film pins (window1_/window2_ replace) at ARM 34' },
    shift_video: { anchor: 'ARM 14 — shift_video + shift_audio verbatim at MiniMaxH3SigmaShift', note: 'verbatim at the sigma shift' },
    shift_audio: { anchor: 'ARM 14 — shift_video + shift_audio verbatim at MiniMaxH3SigmaShift', note: 'verbatim at the sigma shift' },
    sla_enabled: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'topology-pinned switch owner' },
    sla_sparsity: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'sparsity_ratio at the kernel' },
    sla_block_size: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'block_size at the kernel' },
    sla_min_seq_len: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'min_seq_len at the kernel' },
    sla_dense_last_steps: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'dense_last_steps at the kernel' },
    sla_dense_steps: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'dense_steps at the kernel' },
    sla_dense_backend: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'dense_backend at the kernel' },
    sla_reference_protection: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: "the enum → boolean fold ('Light' composes true)" },
    sla_protect_audio: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'protect_audio at the kernel' },
    sla_stabilize_motion: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'stabilize_motion at the kernel' },
    sla_disable_fp16_accum: { anchor: 'ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch', note: 'disable_fp16_accum at the kernel' },
    attention_backend: { anchor: "ARM 16 — attention_backend verbatim at ModelAttentionBackend (the non-SLA arm's backend)", note: 'verbatim at the backend node' },
    interpolate_enabled: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'topology-pinned switch owner (ARM 23 pins the alias retirement)' },
    interp_model: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'model_name at the FILM loader' },
    interp_multiplier: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'multiplier at FrameInterpolate' },
    sr_switch: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'topology-pinned switch owner' },
    sr_model: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'model at SeedVR2LoadDiTModel' },
    sr_resolution: { anchor: 'ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master', note: 'resolution at SeedVR2VideoUpscaler' },
    sharpen_enabled: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'topology-pinned switch owner' },
    sharpen_method: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'method.method in the grouped dict' },
    sharpen_strength: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'method.strength in the grouped dict' },
    sharpen_radius: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'method.radius in the grouped dict' },
    sharpen_threshold: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'method.threshold in the grouped dict' },
    sharpen_iterations: { anchor: 'ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch', note: 'method.iterations in the grouped dict' },
    sharpen_switch: { anchor: 'ARM 32 — a stated sharpen_switch (the second retired alias) never rides the sharpen switch (the sharpen_enabled primary owns it)', note: 'retired alias — its OWN firing arm (ARM 23 exercises the interp alias)' },
    interp_switch: { anchor: 'ARM 23 — the legacy switch aliases are retired dead law: a stated interp_switch never rides the interp switch (the primary owns it)', note: 'retired alias — the arm pins the primary-owns-it law' },
    sla_switch: { anchor: 'ARM 31 — a stated sla_switch rides the t4r attention pick verbatim (both poles), the branches stay SLA-direct vs chunked by edge, and the unstated doc rides the PrimitiveBoolean-false default node', note: 'NOT retired — the t4r arm READS it at the attention pick (the census note that called it retired was the narration drift; corrected 2026-11-09)' },
    refine_denoise: { anchor: 'ARM 4b — a stated refine_denoise reaches the rider scheduler; unstated keeps 1.0 byte-stable', note: 'denoise at the RIDER BasicScheduler (the primary scheduler untouched); the [0.05,1] window law rides resolveRefineSeat (the refine-window cure 77ad9eee0 added the row without its class cell — the census reded until this mapping landed)' },
    image: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'the first frame at LoadImage' },
    last_frame: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'the end anchor at LoadImage' },
    ref_images: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'each stated path at its LoadImage' },
    ref_videos: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'file at LoadVideo' },
    ref_video_trims: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'start/duration at Video Slice' },
    ref_audios: { anchor: 'ARM 19 — the media lanes reach their load/trim consumers', note: 'audio at LoadAudio' },
    refmod_mode: { anchor: 'ARM 20 — the refmod dials verbatim at the bake head: mode/pool/identity/save ride MiniMaxH3RefModExtract', note: 'mode at the bake head' },
    refmod_pool: { anchor: 'ARM 20 — the refmod dials verbatim at the bake head: mode/pool/identity/save ride MiniMaxH3RefModExtract', note: 'pool_h AND pool_w at the bake head (the square fold)' },
    refmod_identity: { anchor: 'ARM 20 — the refmod dials verbatim at the bake head: mode/pool/identity/save ride MiniMaxH3RefModExtract', note: 'identity at the bake head' },
    refmod_save: { anchor: 'ARM 20 — the refmod dials verbatim at the bake head: mode/pool/identity/save ride MiniMaxH3RefModExtract', note: 'save at the bake head' },
    k: { anchor: "ARM 21 — the k pin: a two-window film's window ordinal reaches the graph as the save naming (w1 AND w2)", note: 'the window ordinal at SaveVideo.filename_prefix' },
    duck_depth_db: { anchor: 'ARM 22 — duck_depth_db verbatim at the film mix (duck_db) + the image_name alias reaches LoadImage', note: 'duck_db at MeliteFilmAudioMix' },
    image_name: { anchor: 'ARM 22 — duck_depth_db verbatim at the film mix (duck_db) + the image_name alias reaches LoadImage', note: "the call-level alias at LoadImage (the compose's documented read)" },
    second_pass_enabled: { anchor: 'ARM 4 — second_pass_enabled + refine seats mount the T3 refine rider (TWO SamplerCustomAdvanced; the LTX stack carries the catalog file + stated strength; the rider scheduler carries the stated steps)', note: "the master gate — ARM 4's mount + ARMs 5/10-12 the guards" },
  }
  for (const knob of paramsOf('h3')) {
    if (H3_PINNED.has(knob)) {
      cells.push({ id: `h3.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.h3Values, anchor: H3_VALUE_ANCHOR, note: 'verbatim at the sampler consumers (ARM 1 single-window; ARM 2 film-path override; ARM 3a/3b liveness)' })
    } else if (H3_REFINE.has(knob)) {
      cells.push({ id: `h3.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.h3Values, anchor: H3_REFINE_ANCHOR, note: 'the seats ride the rider (ARM 4 stated-mount; ARM 7 row defaults; ARM 6 unknown-id refusal; ARM 8 row-domain refusal; ARM 9 11/11 completeness lock)' })
    } else if (knob === 'ref_mods') {
      cells.push({ id: `h3.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.refmodValues, anchor: 'ARM 2 — the run-level declared seat (ref_mods, schema.ts:99 / DECL params / Layer A docModel.ts:339): the image value lands in EVERY window (hop 4→5)', note: 'the run-level seat rides every window (ARM 1 call-bucket wire form + ARM 3 data-chip currency alongside)' })
    } else {
      const cls = H3_CLASS_ARM[knob]
      if (cls === undefined) {
        // An UNKNOWN knob stays UNWITNESSED (a new DECL row needs its
        // class arm first — the roster grows, the witnesses follow).
        cells.push({ id: `h3.${knob} hop[5]`, status: 'U', sd: 'SD-6', note: `unclassed h3 knob — write its class arm in ${WALL.h3Values} and map it here` })
      } else {
        cells.push({ id: `h3.${knob} hop[5]`, status: 'W', sd: 'SD-6', wall: WALL.h3Values, anchor: cls.anchor, note: cls.note })
      }
    }
  }
  return cells
}

// Hop-[2]/[3] SWITCH cells (SD-1 instances) + the arrival window.
function switchCells(): Cell[] {
  return [
    {
      id: '2511→21 double_reference/use_stock_nodes departed-null', status: 'W', sd: 'SD-1',
      wall: WALL.drillNullSet,
      anchor: 'the drill null-set arms (ERRORS h; study §6; purge P4) — the switch verbs on the REAL 2511/21 DECLs',
      note: 'B8 loud at the door (in-tree; landing tracked by commit, the census judges the tree)',
    },
    {
      id: '2511→21 press-inside-arrival-window fences loud', status: 'W', sd: 'SD-1',
      wall: WALL.arrivalWindow,
      anchor: 'the arrival window (the gesture→settle one-round-trip gap, P4 remainder)',
      note: 'W1 fence + W2 post-settle start (in-tree; landing tracked by commit)',
    },
    {
      id: 'music mode switch (authored-A-fires-nothing-on-B)', status: 'W', sd: 'SD-1',
      wall: WALL.musicValues,
      anchor: 'music3 THROUGH THE DOOR: phase1Card+phase2Card REFUSE a mode-stated draft loud, naming \'mode\' (cured 2026-11-08; RE-REGISTERED — the original body was mechanically mis-registered, see the audit)',
      note: 'door refusal + build refusal (mode precedent, both directions)',
    },
    {
      id: 'yue2 guidance_scale stated (authored-music3→yue2) refuses loud', status: 'W', sd: 'SD-1',
      wall: WALL.deadKnobs,
      anchor: 'D1 CURED: a stated guidance_scale on yue2 REFUSES loud naming the knob (DECL surface dropped + build refuses legacy drafts, mode precedent)',
      note: 'D1 CURED with the yue2 cure (DECL drop + build refusal, mode precedent); JOURNEY verdict 0a83ab02 BLOCKED→fix (true root, both layers toggle-proven — the block was the two missing UNITY rows, same change)',
    },
    {
      id: 'yue2 lm_cfg_scale stated (authored-music3→yue2) refuses loud', status: 'W', sd: 'SD-1',
      wall: WALL.deadKnobs,
      anchor: 'D2 CURED: a stated lm_cfg_scale on yue2 REFUSES loud naming the knob (same cure as D1)',
      note: 'D2 CURED (same cure as D1)',
    },
    {
      id: 'h3 SPE/SR across re-derivation', status: 'W', sd: 'SD-1',
      wall: WALL.injectKeysMatrix,
      anchor: 'LAW C — THE TRANSACTION CELL (ERROR g, red): every single-write judge green at its gesture, the flip green, the product refused LIVE',
      note: 'the family flip reseats the SPE/SR four NAMED (reseatFamilyDead.dropped, sorted), the gesture gate names them, the walk refuses the raw view — loud at every seat',
    },
  ]
}

// The remaining SD cells (SD-2…SD-11 minus SD-1/SD-6, covered above).
function sdCells(): Cell[] {
  return [
    {
      id: 'SD-2 h3 call-mods + run-ref_mods (the merge law, G7 2026-11-08: a stated call lane MERGES with the declared lane — declared entries first, deduped by trimmed value, the cap loud on the UNION)', status: 'W', sd: 'SD-2',
      wall: WALL.refmodValues,
      anchor: 'ARM 5 — the merge canon, witnessed both sides: a stated call lane MERGES with the declared lane (the display tail\'s word and the graph agree)',
      note: 'the stated-seat drop closes here (the old either/or REPLACE died — both chains mount, the unstated window inherits; ARMs 15-17 witness the both-seats mount, the dedup, and the union cap); master/leaf + lift-overwrite legs witnessed below',
    },
    {
      id: 'SD-2 h3 master/leaf legs (stated-seat drops)', status: 'W', sd: 'SD-2',
      wall: WALL.h3Values,
      anchor: 'ARM 10 (SD-2 master/leaf, gate ON)',
      note: 'WITNESSED (ARM 10 gate-ON; ARM 11 gate-OFF: the stated leaf still rides the dict, the switch names the verdict; ARM 12 sub-gate-off; toggles: leaf-loop no-op reds 10+11, sharpen_enabled-term drop reds 12)',
    },
    {
      id: 'SD-2 h3 lift-overwrite leg (stated-seat drops)', status: 'W', sd: 'SD-2',
      wall: WALL.h3Oracle,
      anchor: 'SD-2 (lift overwrite)',
      note: 'WITNESSED — the per-window stanza last-wins arm (two-call doc, real values: doc 512×640 owns the knobless window, the call\'s 768×448 wins its own; toggle: stanza spread flip reds window2, window1 stays green)',
    },
    {
      id: 'SD-3 B1 t4r emit strip (the serializer deletes every T4_ONLY member a stamped state carries — the walk-refused emit never composes)', status: 'W', sd: 'SD-3',
      wall: WALL.composeLiveness,
      anchor: "THE PARAM-SEAT-PARITY ARM: every studio tenant's own persisted key set composes on its own derived lane",
      note: 'anchor owed at the audit, now named — the PARAM-SEAT-PARITY arm carries THE B1 EMIT LAW AT THE PAYLOAD DEPTH (:780): every tenant\'s own saved emit walks the real walk, and a t4r-derived doc carrying any T4_ONLY member is an offender by name',
    },
    { id: 'SD-3 the legal-key-set owner at the commit seam OUTSIDE studio commits (B4\'s mechanism, presence-at-door)', status: 'U', sd: 'SD-3', note: 'real owed cure — no single owner decides the legal key set at the commit seam outside studio commits; B4\'s presence-at-door mechanism is the audit\'s own cure row' },
    {
      id: 'SD-4 music lyrics unwireable on the flow face', status: 'W', sd: 'SD-4',
      wall: WALL.musicValues,
      anchor: 'every flow input the card declares is statable on the music-native flow row (CURED 821475e43: was RED — lyrics)',
      note: 'CURED 821475e43 (lyrics seat rides flowsRegistryRows :336/:372-375/:386); ARM 3 statability + value-landing arms green',
    },
    { id: 'SD-4 h3 post keys lack flowKinds.inputs/admits slots', status: 'U', sd: 'SD-4', note: 'compose-readable, no producible edge; cross-plane census STILL MISSING estate-wide' },
    { id: 'SD-5 census exemptions (ref_mods walked-never-judged; liveness WRITES_EXEMPT; KEY JUDGE lacks music classes; booleans/arrays skip numeric judge)', status: 'U', sd: 'SD-5', note: 'meta — exemptions wearing comments' },
    { id: 'SD-6 typo\'d NEW input keys green the KEY JUDGE (fixture-gated)', status: 'U', sd: 'SD-6', note: 'not in the derived roster (unserved spellings) — judge-gap cell' },
    { id: 'SD-6 goldens drive instantiateAction DIRECTLY (bypass gate)', status: 'U', sd: 'SD-6', note: 'mechanism-gap cell' },
    { id: 'SD-7 B8 banner names the unrendered field (refusal-without-cure)', status: 'W', sd: 'SD-7',
      wall: WALL.arrivalWindow, anchor: "a gate refusal naming a field the form does not render carries the field's UNSTAMP affordance — one click unstamps the ghost through the bench door (SD-7: the banner's words ACT)",
      note: 'CURED 2026-11-09: the structured field rides the violation (card-base ComposeViolation.field, both clauses) and the banner grows the UNSTAMP verb — one click writes the null through the bench door (JSON Merge Patch delete) and retires both faces (error strip + the write face the trailing write re-voiced on).' },
    { id: 'SD-7 h3 walk voice names the repair (no one-click unstamp verb)', status: 'W', sd: 'SD-7',
      wall: WALL.arrivalWindow, anchor: "the family clause's field-named refusal unstamps the same way (the h3 inject-keys class: one click per named key, the walk's own verdict)",
      note: 'CURED 2026-11-09 by the SAME cure: the family clause (the h3 inject-keys twin in card-base) names the key field-named and the same verb unstamps it — the departed-key class and the four-key walk class close in one contract.' },
    {
      id: 'SD-7 rescue failure exposes retry/delete (note-only → actable)', status: 'W', sd: 'SD-7',
      wall: WALL.rescueHonesty,
      anchor: 'CLASS 2 — STUCK + RETRY/DELETE: a stuck download must expose retry and delete affordances that act',
      note: 'undiscoverable-retry closed by affordance arms',
    },
    {
      id: 'SD-8a active∈terminal false-ready refused', status: 'W', sd: 'SD-8',
      wall: WALL.rescueHonesty,
      anchor: 'CLASS 1 — UNMOCKED ACTIVE: no face may report the download done on a non-terminal engine report',
      note: 'FALSE-READY #1 convicted in-tree',
    },
    {
      id: 'SD-8b ceiling-expiry→success false-ready refused', status: 'W', sd: 'SD-8',
      wall: WALL.rescueHonesty,
      anchor: 'ARM 9 — bytes advancing every poll rides the FULL ceiling; the expiry lands the stuck face, never Weight ready, and Run refuses loud',
      note: 'FALSE-READY #2 convicted in-tree (CLASS 6; toggle /tmp/sd8b-toggle-red.txt)',
    },
    {
      id: 'SD-8 total=0 dead meter ("0/0 bytes (0%)")', status: 'W', sd: 'SD-8',
      wall: WALL.rescueHonesty,
      anchor: 'ARM 6 — a report with no declared total renders no progress measure (the dead 0/0 meter)',
      note: 'the dead meter renders no measure (CLASS 4 meter honesty)',
    },
    {
      id: 'SD-8 scrubber cap-only pinned (grab never seeks)', status: 'W', sd: 'SD-8',
      wall: WALL.stripPane,
      anchor: 'scrub (the cap owns the gesture; seek pairs the interaction state)',
      note: 'CEMENTING re complaint — the pin holds the defect\'s face; line-click-to-seek stays U (next row)',
    },
    {
      id: 'SD-8 scrubber line-click-to-seek (single-click seeks its frame)', status: 'W', sd: 'SD-8',
      wall: WALL.stripPane,
      anchor: 'a ruler single-click seeks its frame (F-2 tenant integration — the bar\'s onFrameChange reaches the tenant\'s handleBarFrame; the click-away seat stays silent)',
      note: 'P6 gesture receipt landed (row cards-timeline-ruler-click-seek: chrome seek+voice + bar-seat pass-through + this tenant arm)',
    },
    {
      id: 'SD-8 keyframe-vs-audio lane asymmetry (diamonds on one thin lane vs 3 audio lanes)', status: 'W', sd: 'SD-8',
      wall: 'packages/web-kit/timeline/test/timelineLaneParity.spec.tsx',
      anchor: 'EVERY LANE HEAD RENDERS THE SAME SHELL — the gutter\'s four heads share one LaneHead anatomy (glyph/dot slot, label, door slot, height), no bespoke grammar survives',
      note: 'row cards-lane-parity (kit arms: same-shell / height-mirror derived / "AN EMPTY KEYFRAME LANE CARRIES ITS OWN HINT" / opt-out byte-identity; tenant studio-strip-pane: "THE KEYFRAMES LANE SPEAKS THE AUDIO LANES\' LANGUAGE" + "THE KEYFRAMES LANE\'S EMPTY FACE IS A WELL, NOT A WHISPER"; the h3 tenant opts into kfLaneCards — the audioClipCards precedent)',
    },
    { id: 'SD-8 B6 anonymous-stamp pill-state unshowable (G4)', status: 'U', sd: 'SD-8', note: 'recipe yields no key; post-pick doc anonymous' },
    { id: 'SD-9 trailing-window loss (300ms scheduleStageParam; tab-close half)', status: 'U', sd: 'SD-9', note: 'DECLARED-UNCOVERED — reds by declaration; run gate LOUD-when-unlanded holds the engine side' },
    { id: 'SD-10 overlay-vs-ledger clock split + arrival-only reseatEnvelopeKeys third reconciler + axisFps SUSPECT', status: 'U', sd: 'SD-10', note: 'no wall; music N/A correctly absent (no clocks — not counted)' },
    {
      id: 'SD-11 dead opinions (2511 lightning steps:4; ×6 hide_from_dropdown; blank-ref trim; alias pass-along)', status: 'W', sd: 'SD-11',
      wall: WALL.editValues,
      anchor: "E11 (SD-11, the dead opinions): the lightning lora row's steps:4 is DATA-only",
      note: 'WITNESSED — E11 pins the steps:4 opinion DATA-only (the stated pick mounts its loader, the sampler keeps its stated/recipe steps; TOGGLE I wired the marriage → red) and the blank alias as the DOCUMENTED trim (TOGGLE J dropped it → red); the alias pass-along quarter rides E6 (the merge-order arms); the hide_from_dropdown quarter rides the 2511 decl.spec soft-retire arm ("every variant is soft-retired — hidden from the dropdown, still declared")',
    },
  ]
}

describe('P0 THE UNWITNESSED-HOP CENSUS (purge §7 — the class wall)', () => {
  it('the roster derives from the live DECLs (non-empty params per purge lane)', () => {
    const roster: Record<string, number> = {}
    for (const family of Object.keys(DECL_FILES)) {
      const params = paramsOf(family)
      roster[family] = params.length
    }
    expect(roster['music3']).toBeGreaterThan(0)
    expect(roster['yue2']).toBeGreaterThan(0)
    expect(roster['qwen-img-edit-21']).toBeGreaterThan(0)
    expect(roster['qwen-img-edit-2511']).toBeGreaterThan(0)
    expect(roster['h3']).toBeGreaterThan(0)
    // The wedge's own precondition (DRILL-a precedent): the 2511→21
    // pair must differ exactly where B8 burned.
    expect(paramsOf('qwen-img-edit-2511')).toContain('double_reference')
    expect(paramsOf('qwen-img-edit-21')).not.toContain('double_reference')
  })

  it('hop-[5] VALUE census: every derived knob answers at its consumer or stands UNWITNESSED', () => {
    const texts: Record<string, string> = {}
    const textOf = (wall: string): string => (texts[wall] ??= read(wall))
    const unwitnessed: string[] = []
    for (const cell of valueCells()) {
      if (cell.status === 'U') {
        unwitnessed.push(`${cell.id} — ${cell.sd}: ${cell.note}`)
        continue
      }
      const hay = textOf(cell.wall!)
      expect(hay.includes(cell.anchor!), `WITNESS LOST for ${cell.id}: anchor no longer in ${cell.wall} — ` +
        `the arm was deleted or re-marked RED TODAY; the cell flips to UNWITNESSED`).toBe(true)
    }
    expect(
      unwitnessed,
      `UNWITNESSED hop-[5] cells (${unwitnessed.length}):\n` + unwitnessed.map((u) => `  • ${u}`).join('\n'),
    ).toEqual([])
  })

  it('hop-[2]/[3] SWITCH census: every SD-1 instance nulls-or-refuses or stands UNWITNESSED', () => {
    const texts: Record<string, string> = {}
    const textOf = (wall: string): string => (texts[wall] ??= read(wall))
    const unwitnessed: string[] = []
    for (const cell of switchCells()) {
      if (cell.status === 'U') {
        unwitnessed.push(`${cell.id} — ${cell.sd}: ${cell.note}`)
        continue
      }
      const hay = textOf(cell.wall!)
      expect(hay.includes(cell.anchor!), `WITNESS LOST for ${cell.id}: anchor no longer in ${cell.wall}`).toBe(true)
    }
    expect(
      unwitnessed,
      `UNWITNESSED switch cells (${unwitnessed.length}):\n` + unwitnessed.map((u) => `  • ${u}`).join('\n'),
    ).toEqual([])
  })

  it('SD-cell census: every remaining §2/§3 finding witnesses or stands UNWITNESSED', () => {
    const texts: Record<string, string> = {}
    const textOf = (wall: string): string => (texts[wall] ??= read(wall))
    const unwitnessed: string[] = []
    for (const cell of sdCells()) {
      if (cell.status === 'U') {
        unwitnessed.push(`${cell.id} — ${cell.sd}: ${cell.note}`)
        continue
      }
      const hay = textOf(cell.wall!)
      expect(hay.includes(cell.anchor!), `WITNESS LOST for ${cell.id}: anchor no longer in ${cell.wall}`).toBe(true)
    }
    expect(
      unwitnessed,
      `UNWITNESSED SD cells (${unwitnessed.length}):\n` + unwitnessed.map((u) => `  • ${u}`).join('\n'),
    ).toEqual([])
  })
})
