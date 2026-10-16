/**
 * studio-contract-wall.spec.ts — THE LAYER A/B CONTRACT WALL (goal
 * part 3, 2026-09-17). The studio's serialization vocabulary is a
 * GUEST of the card's declared surface: every key serializeLayerA
 * can emit, and every CALL_KNOB_KEYS entry, must be a name the
 * card's params schema DECLARES (or an explicitly-admitted
 * non-knob carrier: the mod bag, the NLE clips, the doc-local
 * clock). A key the card never declared is a fiction the UI can
 * author and the run door would silently drop — this wall refuses
 * it at test time (the compose path bypasses the admission gate, so
 * the TEST is the wall).
 */
import { describe, expect, it } from "vitest"
import { carrier, BOARDED, VARIANT_ADDRESSES } from "../src/card.ts"
import { emitParamsSpec } from "@melite/comfyui-card-kit/params-emit"
import { serializeLayerA, hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import { CALL_KNOB_KEYS } from "../src/ui/studio/docModel.ts"

/** The card's declared surface: the params schema's own names (the
 * same walk the freshness gate trusts). The model knob rides the
 * TOOL's enum (BOARDED + the folded lanes' variant addresses — one
 * source of truth with tool.ts; a bare single-family board serves
 * no picker, but the studio doc still writes the model id and the
 * run door still consumes it). */
const SURFACE = new Set(Object.keys(emitParamsSpec(carrier as never, [...BOARDED, ...VARIANT_ADDRESSES])))

/** Non-knob carriers the card admits OUTSIDE the params schema — the
 * mod plane (params.loras, resolved against the family catalog at
 * compose), the NLE audio clips (stitch consumes), and the audio
 * stem (legacy round-trip only). Each is a deliberate admission,
 * listed once here, never a wildcard. */
const ADMITS = new Set(["loras", "audio_clips", "audio_stem"])

const LAYER_A_ALL_KEYS: string[] = [
  "seed", "shift_video", "shift_audio", "steps", "denoise", "width", "height",
  "sampler_name", "sched_name",
  "refine_lora", "refine_strength", "refine_steps",
  "second_pass_enabled",
  "attention_backend",
  "sla_enabled",
  "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps",
  "sla_dense_steps", "sla_dense_backend", "sla_reference_protection",
  "sla_protect_audio", "sla_stabilize_motion", "sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interp_model", "interp_multiplier",
  "sr_switch", "sr_model", "sr_resolution",
  "ref_image_size", "model", "audio_stem", "loras", "audio_clips",
  "ref_images", "ref_videos", "ref_audios", "ref_mods",
  "ref_video_trims", "duck_depth_db",
]

/** A maximally-populated Layer A (every value non-default, every
 * enum a lawful member) — the shared body of the presence walls:
 * the two-directional arm below and the served-surface arm. */
function populatedMax(): Record<string, unknown> {
  const populated: Record<string, unknown> = {}
  for (const key of LAYER_A_ALL_KEYS) {
    if (key === "loras") populated.loras = [{ id: "x", strength: 0.5 }]
    else if (key === "audio_clips") populated.audio_clips = [{ id: "a", name: "a", src: "data:audio/x", start_frame: 0, dur_frames: 24 }]
    // THE DECLARED REFERENCE SURFACE (2026-09-23): card-level refs
    // populate as the schema holds them (string arrays)
    else if (key === "ref_images" || key === "ref_videos" || key === "ref_audios" || key === "ref_mods") populated[key] = ["https://u/d.png"]
    else if (key === "ref_video_trims") populated.ref_video_trims = [{ start_time: 0, duration: 2 }]
    else if (key === "duck_depth_db") populated.duck_depth_db = -14
    else if (key === "seed") populated.seed = 7
    else if (key === "sharpen_enabled" || key === "interpolate_enabled" || key === "sr_switch" || key === "second_pass_enabled") populated[key] = true
    // pin-equals-default booleans: TRUE is the hydrated state (the
    // ride law emits the override when the state exists)
    else if (key === "sla_protect_audio" || key === "sla_stabilize_motion" || key === "sla_disable_fp16_accum") populated[key] = true
    // enum rows: a value OUTSIDE the hydrate's own grammar would
    // lawfully drop — populate every enum with a MEMBER so the
    // presence loop judges emission, not grammar
    else if (key === "ref_image_size") populated[key] = "match"
    // the SLA master switch rides the wire ONLY as false (absent =
    // on): the override is the lawful emitted state
    else if (key === "sla_enabled") populated[key] = false
    else if (key === "sla_block_size") populated[key] = "64"
    else if (key === "sla_reference_protection") populated[key] = "Light"
    else if (key === "sla_dense_backend") populated[key] = "auto"
    else if (key === "sla_dense_steps") populated[key] = "0,1"
    else if (key === "sharpen_method") populated[key] = "rcas"
    else if (key === "interp_model") populated[key] = "film_net_fp16.safetensors"
    else if (key === "sampler_name" || key === "sched_name" || key === "model") populated[key] = "euler"
    else if (key === "audio_stem") populated[key] = "legacy-stem.wav"
    else if (key === "refine_lora") populated[key] = "h3_taomate_3step"
    else if (key === "attention_backend") populated[key] = "pytorch attention"
    else if (key === "sr_model") populated[key] = "seedvr2_ema_3b_fp16.safetensors"
    else populated[key] = 1
  }
  populated.sr_resolution = 1080
  return populated
}

describe("the studio contract wall (Layer A writes only card truth)", () => {
  it("every key serializeLayerA can emit sits on the declared surface", () => {
    expect(SURFACE.size).toBeGreaterThan(20) // the walk answered
    for (const key of LAYER_A_ALL_KEYS) {
      expect(
        SURFACE.has(key) || ADMITS.has(key),
        `serializeLayerA key "${key}" is neither declared on the card nor admitted`,
      ).toBe(true)
    }
  })

  it("the emitted vocabulary is EXACTLY the truth (walk the serializer with everything set)", () => {
    // a maximally-populated Layer A — every value non-default so no
    // key can hide behind the undefined-means-absent law
    const populated = populatedMax()
    const out = serializeLayerA(hydrateLayerA(populated))
    for (const key of Object.keys(out)) {
      expect(
        SURFACE.has(key) || ADMITS.has(key),
        `serializeLayerA emitted "${key}" — neither declared nor admitted`,
      ).toBe(true)
    }
    // THE EXACT-STRENGTH HALF (2026-10-16, the Second Pass burn): the
    // loop above iterates EMITTED keys — one direction — so a key the
    // serializer FORGETS never entered it and its absence could not
    // fail. That is how second_pass_enabled: true sat in `populated`,
    // was dropped by the serializer, and this wall stayed green while
    // the operator's switch never persisted ("walled at both depths,"
    // 10-15 — both depths shallower than the save). The law is
    // two-directional: every populated non-default key MUST appear in
    // the emitted doc, by name.
    for (const key of Object.keys(populated)) {
      if (key === "seed" || key === "preset") continue // seed rides as the base row; preset is the dead key by law
      expect(
        key in out,
        `populate set "${key}" but serializeLayerA DROPPED it — a key the UI can state and the doc never carries is the silent-drop class (the operator's burn)`,
      ).toBe(true)
    }
    // THE SECOND-PASS RECEIPT at the save depth: the master arms and
    // the refine rider rides — the exact keys the service resolver
    // reads at the compose door
    expect(out.second_pass_enabled).toBe(true)
    expect(out.refine_lora).toBe("h3_taomate_3step")
    expect(out.refine_strength).toBe(1)
    expect(out.refine_steps).toBe(1)
    // THE DECLARED-SURFACE ROUND TRIP (2026-09-23): card-level refs
    // hydrate AND serialize back — a save never drops what the lanes show
    expect(out.ref_images).toEqual(["https://u/d.png"])
    expect(out.ref_videos).toEqual(["https://u/d.png"])
    expect(out.ref_audios).toEqual(["https://u/d.png"])
  })

  it("every CALL_KNOB_KEYS entry sits on the declared surface (the per-call stanza is card truth too)", () => {
    for (const key of CALL_KNOB_KEYS) {
      expect(
        SURFACE.has(key),
        `CALL_KNOB_KEYS entry "${key}" is not declared on the card`,
      ).toBe(true)
    }
  })

  it("the clock rides when STATED and never pins when absent (the pin law, R2); the DEAD preset key never resurrects", () => {
    // (Rule A, 2026-09-18) `preset` died with the hand select — a
    // stale document still carrying one hydrates to nothing and
    // never serializes it back.
    // (R2, 2026-10-27) fps is a card doc key (card.ts's own list) —
    // a STATED clock round-trips; an absent one never pins 24 (the
    // RunRecipe control's writes used to die silently: the control
    // wrote fps and the serializer dropped it).
    const stated = serializeLayerA(hydrateLayerA({ preset: "final", fps: 30, seed: 1 } as never))
    expect("preset" in stated).toBe(false)
    expect(stated.fps).toBe(30)
    const unstated = serializeLayerA(hydrateLayerA({ seed: 1 } as never))
    expect("preset" in unstated).toBe(false)
    expect("fps" in unstated).toBe(false)
  })

  // THE SERVED-SURFACE LAW (2026-10-16, journey audit 89d325c0
  // finding 1 — the second-pass class, third direction): the two
  // arms above iterate hand lists (LAYER_A_ALL_KEYS here,
  // LAYERA_KEY_UNIVERSE in docHydrate) — so a schema row the panel
  // SERVES that neither list carries was invisible to every wall:
  // `duck_depth_db` and `ref_video_trims` rendered, accepted writes
  // through the panel's cast seam, and died at save for the row's
  // whole life. THE DERIVED ALARM: walk the DECL's own surface (the
  // same emitParamsSpec the first arm trusts) and demand every
  // served row is carried by SOME serializer — Layer-A emit, the
  // call-knob plane, or a NAMED exemption with a reason. A new
  // schema row with no seat reds HERE, at test time, before any
  // operator drags it.
  it("every SERVED schema row is carried by a serializer or a named exemption (no orphan rows)", () => {
    const carried = serializeLayerA(hydrateLayerA(populatedMax() as never))
    const emitted = new Set(Object.keys(carried))
    // EXEMPTIONS, each with its law: rows the card declares but the
    // studio never authors on the Layer-A face.
    const EXEMPT = new Set([
      // THE TEXT PLANE (Layer B): the calls' prompt faces own these
      "prompt", "refs", "image", "last_frame",
      // THE STRUCT CARRIERS: other doc planes, never form rows
      "calls", "keyframes", "document", "k",
      // THE WALK-DERIVED SEATS: compose-side derivations, never authored
      "fps_seconds", "preset",
      // THE PER-CALL RECIPE ROW: recipe-level, the axis layer owns it
      "audio_mode",
      // length: CALL_KNOB_KEYS carries it (the span's per-call pin —
      // asserted by the arm below, listed here only for the error
      // message's clarity when reading failures)
    ])
    for (const key of SURFACE) {
      if (EXEMPT.has(key)) continue
      expect(
        emitted.has(key) || CALL_KNOB_KEYS.has(key),
        `served schema row "${key}" is carried by NO serializer — not serializeLayerA, not the call-knob plane, not exempt. This is the served-never-carried class: the panel renders it, writes die at save (the duck_depth_db / ref_video_trims burn, audit 89d325c0)`,
      ).toBe(true)
    }
  })
})
