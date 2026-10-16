/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): hydration + serialization
 * speak the CARD's wire names only. Legacy retired spellings migrate
 * through LEGACY_LAYERA_KEY / LEGACY_KNOB_KEY (a legacy lora knob
 * pair maps into the mod bag when its filename matches the family
 * catalog, else drops — it was never read). Serialization writes
 * ONLY keys the compose reads: fps is document-local and
 * never ride the wire.
 */
import type { DocAudioClip, LayerA } from "./docModel.ts"
import { LEGACY_LAYERA_KEY, stemToClip } from "./docModel.ts"
import { normalizeDeclaredRefs } from '@melite/models-h3/timelineContract'
import { parseFilmMixClips } from '@melite/models-h3/filmMix'

/** Card-level ref lists hydrate to arrays; absent/empty stays absent
 * (undefined = the compose sees no declared surface — same as today). */
function optRefs(raw: Record<string, unknown> | undefined, k: string): string[] | undefined {
  const list = normalizeDeclaredRefs(raw?.[k])
  return list.length > 0 ? list : undefined
}

function arrayValue(value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trimStart().startsWith('[')) return []
  try {
    // HIGH-4 (the fallback audit, 2026-09-28) named the parseable
    // non-array — dead by JSON GRAMMAR (the re-audit, 2026-10-16):
    // the guard above admits only strings opening with '[', and
    // every string the '[' production accepts parses to an ARRAY.
    // The non-array branch was unreachable from any input; the
    // catch below owns the corrupt-string voice.
    const parsed: unknown[] = JSON.parse(value)
    return parsed
  } catch {
    console.error(
      `VideoTimelineStudio: params.${field} is array-shaped but unparseable — the audio timeline is corrupt; the film composes WITHOUT it. Fix or re-author the clips.`,
    )
    return []
  }
}

function hydrateAudioClips(value: unknown): DocAudioClip[] | undefined {
  const clips: DocAudioClip[] = []
  for (const [index, raw] of arrayValue(value, 'audio_clips').entries()) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      // HIGH-4: every dropped clip row is NAMED — a corrupt row used
      // to `continue` silently and the film lost its audio timing.
      console.warn(`VideoTimelineStudio: audio_clips[${index}] is not a clip row — dropped.`)
      continue
    }
    const row = raw as Record<string, unknown>
    let parsed: ReturnType<typeof parseFilmMixClips>[number] | undefined
    try {
      parsed = parseFilmMixClips([{ ...row }])[0]
    } catch (e) {
      console.warn(
        `VideoTimelineStudio: audio_clips[${index}] failed to hydrate (${String(e).slice(0, 120)}) — dropped; the film composes without this clip.`,
      )
      continue
    }
    if (parsed === undefined) continue
    const id = typeof row.id === 'string' && row.id.trim() !== '' ? row.id.trim() : `aclip-${index}`
    const fallbackName = parsed.src.startsWith('data:') ? `clip-${index}` : parsed.src.split('/').pop()!
    const name = typeof row.name === 'string' && row.name.trim() !== '' ? row.name.trim() : fallbackName
    const gain = typeof row.gain === 'number' && Number.isFinite(row.gain) ? row.gain : undefined
    clips.push({
      id,
      name,
      src: parsed.src,
      start_frame: parsed.start,
      dur_frames: parsed.dur,
      ...(gain !== undefined ? { gain } : {}),
      ...(typeof row.class === 'string' && row.class.trim() !== '' ? { class: parsed.cls } : {}),
      ...(parsed.text !== '' ? { text: parsed.text } : {}),
    })
  }
  return clips.length > 0 ? clips : undefined
}

// ── Hydration (params → tenant state) + serialization (state → params) ────

/** The family's loras flavor catalog (id by filename) — the mod bag
 * resolves legacy lora knob picks; rows without a catalog match were
 * decorative (compose never read the knob pair) and drop. */
const LORA_FILENAME_TO_ID: Record<string, string> = {
  "h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors": "h3_lightx2v_dareties",
  "h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors": "h3_lightx2v_turbo",
}

function migrateLayerARaw(raw: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (raw === undefined) return raw
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const mapped = LEGACY_LAYERA_KEY[k] ?? k
    out[mapped] = v
  }
  // the legacy lora knob pair → the mod bag (when the filename serves)
  const legacyName = typeof raw.lora_name === "string" ? raw.lora_name.trim() : ""
  if (legacyName !== "" && LORA_FILENAME_TO_ID[legacyName] !== undefined) {
    const bag = Array.isArray(out.loras) ? out.loras as Array<Record<string, unknown>> : []
    bag.push({ id: LORA_FILENAME_TO_ID[legacyName]!, strength: typeof raw.lora_strength === "number" ? raw.lora_strength : 1 })
    out.loras = bag
  }
  return out
}

export function hydrateLayerA(rawDoc: Record<string, unknown> | undefined): LayerA {
  const raw = migrateLayerARaw(rawDoc)
  const num = (k: string, d: number) => {
    const v = raw?.[k]
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) && n > 0 ? n : d
  }
  const optNum = (k: string): number | undefined => {
    const v = raw?.[k]
    if (v == null || v === "") return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const optStr = (k: string): string | undefined =>
    typeof raw?.[k] === "string" && (raw[k] as string).trim() !== "" ? (raw[k] as string) : undefined
  return {
    // THE PIN LAW (R2, 2026-10-27): fps hydrates OPTIONAL — a doc that
    // never stated a clock must never pin one. The card's doc-keys
    // list (card.ts) declares fps a card wire key and the RunRecipe
    // control writes it, so it serializes when stated; readers that
    // need a concrete clock default at read (stemToClip and
    // callsToPrompts own the DEFAULT_SEGMENT_PARAMS fallback). A
    // non-positive clock is junk (num()'s old n > 0 law) → absent.
    fps: (() => { const f = optNum("fps"); return f !== undefined && f > 0 ? f : undefined })(),
    seed: num("seed", 42),
    shift_video: optNum("shift_video"),
    shift_audio: optNum("shift_audio"),
    steps: optNum("steps"),
    denoise: optNum("denoise"),
    width: optNum("width"),
    height: optNum("height"),
    sampler_name: optStr("sampler_name"),
    sched_name: optStr("sched_name"),
    // THE SLA MASTER SWITCH: absent = on (every pre-switch doc);
    // only an explicit false turns the arm off.
    sla_enabled: raw?.sla_enabled !== false,
    sla_sparsity: optNum("sla_sparsity"),
    sla_block_size: raw?.sla_block_size === "32" || raw?.sla_block_size === "64" || raw?.sla_block_size === "128"
      ? raw.sla_block_size : undefined,
    sla_min_seq_len: optNum("sla_min_seq_len"),
    sla_dense_last_steps: optNum("sla_dense_last_steps"),
    sla_protect_audio: raw?.sla_protect_audio !== false,
    sla_stabilize_motion: raw?.sla_stabilize_motion !== false,
    sla_reference_protection: raw?.sla_reference_protection === "Off" || raw?.sla_reference_protection === "Light" || raw?.sla_reference_protection === "Heavy Enforcement"
      ? raw.sla_reference_protection : undefined,
    sla_dense_backend: raw?.sla_dense_backend === "comfy_kitchen" || raw?.sla_dense_backend === "pytorch" || raw?.sla_dense_backend === "auto"
      ? raw.sla_dense_backend : undefined,
    sla_dense_steps: typeof raw?.sla_dense_steps === "string" && /^\s*[0-9]+(-[0-9]+)?(\s*,\s*[0-9]+(-[0-9]+)?)*\s*$/.test(raw.sla_dense_steps)
      ? raw.sla_dense_steps.trim() : undefined,
    sla_disable_fp16_accum: raw?.sla_disable_fp16_accum === true,
    sharpen_enabled: raw?.sharpen_enabled === true,
    sharpen_method: raw?.sharpen_method === "rcas" || raw?.sharpen_method === "adaptive_usm" || raw?.sharpen_method === "high_pass" || raw?.sharpen_method === "deconvolution"
      ? raw.sharpen_method : undefined,
    sharpen_strength: optNum("sharpen_strength"),
    sharpen_radius: optNum("sharpen_radius"),
    sharpen_threshold: optNum("sharpen_threshold"),
    sharpen_iterations: optNum("sharpen_iterations"),
    interpolate_enabled: raw?.interpolate_enabled === true,
    interp_model: raw?.interp_model === "film_net_fp16.safetensors" || raw?.interp_model === "rife47.pth"
      ? raw.interp_model : undefined,
    interp_multiplier: optNum("interp_multiplier"),
    sr_switch: raw?.sr_switch === true,
    sr_model: raw?.sr_model === "seedvr2_ema_3b_fp16.safetensors" || raw?.sr_model === "seedvr2_ema_3b_fp8_e4m3fn.safetensors"
      ? raw.sr_model : undefined,
    sr_resolution: optNum("sr_resolution"),
    // THE ATTENTION BACKEND (2026-10-16: caught by the contract
    // wall's new two-directional law — the pick had a schema row and
    // a compose read but NO studio seat: a UI state the doc never
    // carried, the same silent-drop class as the Second Pass switch)
    attention_backend: raw?.attention_backend === "pytorch attention" || raw?.attention_backend === "comfy kitchen attention"
      ? raw.attention_backend : undefined,
    // THE SECOND-PASS MASTER + refine rider (2026-10-16: the switch
    // had NO studio seat — the 10-15 cure walled the form component,
    // never the saved doc, so ON never persisted and the post chain
    // never fired). Absent = off, the family default.
    second_pass_enabled: raw?.second_pass_enabled === true,
    refine_lora: typeof raw?.refine_lora === "string" && raw.refine_lora !== "" ? raw.refine_lora : undefined,
    refine_strength: optNum("refine_strength"),
    refine_steps: optNum("refine_steps"),
    ref_image_size: raw?.ref_image_size === "match" || raw?.ref_image_size === "max" ? raw.ref_image_size : undefined,
    loras: Array.isArray(raw?.loras)
      ? (raw.loras as Array<Record<string, unknown>>)
          .filter((r) => !!r && typeof r.id === "string")
          // `steps` rides verbatim when finite — the service's
          // step-claiming distinction (007 L2) honors a row that
          // declares it; the hydrate map dropping it deleted the
          // override on every save (R2, 2026-10-27).
          .map((r) => {
            const steps = typeof r.steps === "number" && Number.isFinite(r.steps) ? r.steps : undefined
            return {
              id: r.id as string,
              strength: typeof r.strength === "number" ? r.strength : undefined,
              // the key rides only when stated (a row that never
              // claimed a count carries no steps key — the service's
              // step-claiming distinction reads absence as catalog).
              ...(steps !== undefined ? { steps } : {}),
            }
          })
      : undefined,
    variant: optStr("variant"),
    model: optStr("model"),
    // audio_stem: kept for round-trip serialization of legacy docs; it is
    // NO LONGER a user-facing control. When a doc has audio_stem but no
    // audio_clips, the stem is converted to a positioned clip at frame 0.
    audio_stem: optStr("audio_stem"),
    audio_clips: (() => {
      const parsed = hydrateAudioClips(raw?.audio_clips)
      const stem = optStr("audio_stem")
      if (stem !== undefined && parsed === undefined) {
        // optNum: an unstated clock hands stemToClip undefined, whose
        // own guard falls to DEFAULT_SEGMENT_PARAMS.fps (docModel).
        return [stemToClip(stem, optNum("fps"))]
      }
      return parsed
    })(),
    // THE DECLARED REFERENCE SURFACE (2026-09-23): card-level refs
    // hydrate so the lanes can SHOW what the compose merges — the
    // schema holds string[]; the wire also admits the comma list.
    ref_images: optRefs(raw, "ref_images"),
    ref_videos: optRefs(raw, "ref_videos"),
    ref_audios: optRefs(raw, "ref_audios"),
    // ref_mods — the fourth declared lane (docModel LayerA declares
    // it; CallCard renders it). The hydrate gap left the chip lane
    // forever empty (R2, 2026-10-27).
    ref_mods: optRefs(raw, "ref_mods"),
    // THE SERVED-ROW SEATS (journey audit 89d325c0 finding 1): both
    // rows were served + rendered + writable while Layer A carried
    // no field — every drag died at save, the second-pass class.
    // Trims: pairs of finite numbers, non-conforming rows drop
    // (the schema's own law: an absent entry = the whole clip).
    ref_video_trims: Array.isArray(raw?.ref_video_trims)
      ? (raw.ref_video_trims as Array<Record<string, unknown>>)
          .filter((t) => !!t && typeof t === "object"
            && Number.isFinite(Number(t.start_time)) && Number.isFinite(Number(t.duration)))
          .map((t) => ({ start_time: Number(t.start_time), duration: Number(t.duration) }))
      : undefined,
    duck_depth_db: optNum("duck_depth_db"),
  }
}

/** Layer A → the persisted doc shape: ONLY card wire keys, ONLY
 * non-undefined (undefined = absent = the family default rides — the
 * engine default must never be pinned by a control never touched).
 * THE CONTRACT (pinned by the studio-contract wall test): every key
 * here ∈ the h3-timeline card's declared surface and READ by
 * compose. fps and variant ARE card doc keys (card.ts's own list)
 * and the RunRecipe control writes fps — they ride when stated.
 *
 * THE DELETE RIDE (R2, 2026-10-27): the save door is per-key JSON
 * Merge Patch — an absent key leaves the persisted value standing.
 * A gesture that CLEARS a field (state → undefined, or "" / an
 * emptied array) therefore rode nothing and the old value survived
 * every save: silent-wrong-data on reload. With `base` (the
 * persisted doc's raw layer-A record) the serializer emits an
 * explicit `null` for exactly the keys the base carries whose
 * state is now cleared — the door's own delete. Keys whose state
 * exists but the serializer gates (sr_* under a false switch) ride
 * nothing and delete nothing: their state survives a refresh. */
/** The layer-A serializer's whole key universe — the loop list plus
 * every special-cased emission. The DELETE RIDE gates on this set:
 * a base key outside the universe (calls, keyframes, document —
 * other doc planes) never deletes, whatever the state says. */
const LAYERA_KEY_UNIVERSE: ReadonlySet<string> = new Set([
  "seed", "fps", "variant", "shift_video", "shift_audio", "steps", "denoise", "width", "height",
  "sampler_name", "sched_name",
  "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps",
  "sla_reference_protection", "sla_dense_backend", "sla_dense_steps", "sla_enabled",
  "sla_protect_audio", "sla_stabilize_motion", "sla_disable_fp16_accum",
  "attention_backend",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interp_model", "interp_multiplier",
  "sr_switch", "sr_model", "sr_resolution", "ref_image_size", "model", "audio_stem",
  "second_pass_enabled", "refine_lora", "refine_strength", "refine_steps",
  "loras", "audio_clips", "ref_images", "ref_videos", "ref_audios", "ref_mods",
  "ref_video_trims", "duck_depth_db",
])

export function serializeLayerA(a: LayerA, base?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    seed: a.seed,
    // pin-equals-default booleans: serialize when the state exists
    // (false = real override; true/undefined = the node default)
    sla_protect_audio: a.sla_protect_audio,
    sla_stabilize_motion: a.sla_stabilize_motion,
    sla_disable_fp16_accum: a.sla_disable_fp16_accum,
    sharpen_enabled: a.sharpen_enabled === true,
    interpolate_enabled: a.interpolate_enabled === true,
  }
  for (const k of ["fps", "variant", "shift_video", "shift_audio", "steps", "denoise", "width", "height",
                   "sampler_name", "sched_name",
                   "sla_sparsity", "sla_block_size",
                   "sla_min_seq_len", "sla_dense_last_steps",
                   "sla_reference_protection", "sla_dense_backend",
                   "sla_dense_steps",
                   "sharpen_method", "sharpen_strength",
                   "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
                   "interp_model", "interp_multiplier",
                   "attention_backend",
                   "duck_depth_db",
                   "ref_image_size", "model", "audio_stem"] as const) {
    const v = (a as unknown as Record<string, unknown>)[k]
    if (v !== undefined && v !== "") out[k] = v
  }
  // the loras MOD BAG rides when non-empty (the mod plane resolves
  // ids against the family catalog at compose)
  if (a.loras !== undefined && a.loras.length > 0) out.loras = a.loras
  // Super-Res rides only when ON (absent = off — the family default);
  // the model + target resolution ride only when the switch is on.
  if (a.sr_switch === true) {
    out.sr_switch = true
    if (a.sr_model != null) out.sr_model = a.sr_model
    if (a.sr_resolution != null) out.sr_resolution = a.sr_resolution
  }
  // THE SECOND-PASS MASTER rides only when ON (absent = off — the
  // family default false; the same ride law as sr_switch). The
  // refine rider's keys ride when stated — the resolver reads them
  // at the compose door and refuses unknown ids loud. Before this
  // seat the switch never persisted from the studio at all: the
  // post chain was unreachable from the panel (operator 2026-10-16).
  if (a.second_pass_enabled === true) {
    out.second_pass_enabled = true
    if (a.refine_lora != null && a.refine_lora !== "") out.refine_lora = a.refine_lora
    if (a.refine_strength != null) out.refine_strength = a.refine_strength
    if (a.refine_steps != null) out.refine_steps = a.refine_steps
  }
  // THE SLA MASTER SWITCH rides only when OFF (absent = on — the
  // family default; a false is the real override compose reads).
  if (a.sla_enabled === false) out.sla_enabled = false
  // (Layer A NLE) positioned audio clips — only when present (an empty
  // array = no clips = absent; the engine default is silence).
  if (a.audio_clips?.length) out.audio_clips = a.audio_clips
  // THE DECLARED REFERENCE SURFACE rides back only when present — a
  // save shows what the compose merges and never drops it (an empty
  // array = absent, same as today). ref_mods rides with its siblings
  // (the fourth declared lane, R2 2026-10-27).
  if (a.ref_images?.length) out.ref_images = a.ref_images
  if (a.ref_videos?.length) out.ref_videos = a.ref_videos
  if (a.ref_audios?.length) out.ref_audios = a.ref_audios
  if (a.ref_mods?.length) out.ref_mods = a.ref_mods
  // THE SERVED-ROW SEAT: per-video trims ride when non-empty (the
  // schema's index-paired law — an absent entry = the whole clip,
  // so an empty array = no trims = absent, same as the ref lanes)
  if (a.ref_video_trims !== undefined && a.ref_video_trims.length > 0) out.ref_video_trims = a.ref_video_trims
  // THE DELETE RIDE (see the doc comment): with the persisted base,
  // a CLEARED key that the base still carries emits the door's
  // explicit null — the merge-patch delete. The universe is every
  // layer-A key this serializer can emit; keys the base never
  // carried delete nothing (absent = already gone).
  if (base !== undefined) {
    // THE OFF POLE (2026-10-16, journey audit 6f80fa5a — the rank-1
    // that sat green in every suite): the true-gated switches
    // (second_pass_enabled, sr_switch, sharpen_enabled,
    // interpolate_enabled — absent = off, the family default) EMIT
    // only their true pole, so a flip to false wrote state false,
    // the emit gate ignored it, and `false` was not CLEARED — the
    // base's true survived every save while the studio showed OFF
    // and the post chain kept firing. False IS the cleared state
    // for a true-gated key: the delete rides, absent lands, the
    // family default (off) is the truth. The false-pole riders are
    // unaffected (sla_enabled emits its false directly; the
    // pin-equals-default booleans emit their value unconditionally
    // — neither arm reaches this branch).
    const cleared = (v: unknown): boolean =>
      v === undefined || v === "" || v === false || (Array.isArray(v) && v.length === 0)
    const state = a as unknown as Record<string, unknown>
    for (const k of Object.keys(base)) {
      if (LAYERA_KEY_UNIVERSE.has(k) && !(k in out) && base[k] !== undefined && base[k] !== null && cleared(state[k])) {
        out[k] = null
      }
    }
  }
  return out
}
