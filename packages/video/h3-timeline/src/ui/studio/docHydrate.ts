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
import type { DocAudioClip, LayerA } from "./docModel"
import { LEGACY_LAYERA_KEY, stemToClip } from "./docModel"
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
    fps: num("fps", 24),
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
    ref_image_size: raw?.ref_image_size === "match" || raw?.ref_image_size === "max" ? raw.ref_image_size : undefined,
    loras: Array.isArray(raw?.loras)
      ? (raw.loras as Array<Record<string, unknown>>)
          .filter((r) => !!r && typeof r.id === "string")
          .map((r) => ({ id: r.id as string, strength: typeof r.strength === "number" ? r.strength : undefined }))
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
        return [stemToClip(stem, num("fps", 24))]
      }
      return parsed
    })(),
    // THE DECLARED REFERENCE SURFACE (2026-09-23): card-level refs
    // hydrate so the lanes can SHOW what the compose merges — the
    // schema holds string[]; the wire also admits the comma list.
    ref_images: optRefs(raw, "ref_images"),
    ref_videos: optRefs(raw, "ref_videos"),
    ref_audios: optRefs(raw, "ref_audios"),
  }
}

/** Layer A → the persisted doc shape: ONLY card wire keys, ONLY
 * non-undefined (undefined = absent = the family default rides — the
 * engine default must never be pinned by a control never touched).
 * THE CONTRACT (pinned by the studio-contract wall test): every key
 * here ∈ the h3-timeline card's declared surface and READ by
 * compose. fps is document-local and never serializes. */
export function serializeLayerA(a: LayerA): Record<string, unknown> {
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
  for (const k of ["shift_video", "shift_audio", "steps", "denoise", "width", "height",
                   "sampler_name", "sched_name",
                   "sla_sparsity", "sla_block_size",
                   "sla_min_seq_len", "sla_dense_last_steps",
                   "sla_reference_protection", "sla_dense_backend",
                   "sla_dense_steps",
                   "sharpen_method", "sharpen_strength",
                   "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
                   "interp_model", "interp_multiplier",
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
  // THE SLA MASTER SWITCH rides only when OFF (absent = on — the
  // family default; a false is the real override compose reads).
  if (a.sla_enabled === false) out.sla_enabled = false
  // (Layer A NLE) positioned audio clips — only when present (an empty
  // array = no clips = absent; the engine default is silence).
  if (a.audio_clips?.length) out.audio_clips = a.audio_clips
  // THE DECLARED REFERENCE SURFACE rides back only when present — a
  // save shows what the compose merges and never drops it (an empty
  // array = absent, same as today).
  if (a.ref_images?.length) out.ref_images = a.ref_images
  if (a.ref_videos?.length) out.ref_videos = a.ref_videos
  if (a.ref_audios?.length) out.ref_audios = a.ref_audios
  return out
}
