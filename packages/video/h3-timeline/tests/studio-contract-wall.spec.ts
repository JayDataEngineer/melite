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
// THE HERMETIC ENGINE, FIRST IMPORT (the boot-models first-import
// law: the object_info mock registers before the estate barrel's
// first evaluation), then the lazy models boot — the R2 door arm
// below drives the studio's own emit through the REAL estate walk
// (CardRegistryService.phase1Card), and that boot never dials the
// live engine.
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts"
import "../../../../tests/helpers/boot-models.ts"
import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { carrier, BOARDED, VARIANT_ADDRESSES } from "../src/card.ts"
import { emitParamsSpec } from "@melite/comfyui-card-kit/params-emit"
import { serializeLayerA, hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import { CALL_KNOB_KEYS, mergeDocLayers } from "../src/ui/studio/docModel.ts"
import { film } from "@melite/models-h3/actions"
import { schema as h3schemaFn } from "@melite/models-h3/schema"
import { T4_ONLY_KEYS, deriveWindowFamily } from "@melite/models-h3/timelineContract"
import { DECL as h3Decl } from "@melite/models-h3"
import { GraphBuilder } from "@melite/comfyui-card-kit/graph"
import { instantiateAction } from "@melite/comfyui-card-kit"
import type { ModelFacts } from "@melite/comfyui-card-kit/facts"
import { Context } from "@deepseek-ai/cordis"
// TYPE-ONLY side-effect import: the registry's stateRoots() derefs
// Context.queue — the member is declared by estate-queue's service.ts
// module augmentation, one import downstream of cardsRegistry, so the
// client-face program needs this module for the deref to typecheck.
import type {} from "../../../../packages/harness/estate-queue/src/service.ts"
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts"
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts"
import { omitT4RecipeRow } from "../src/ui/studio/omitT4Recipe.ts"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** The card's declared surface: the params schema's own names (the
 * same walk the freshness gate trusts). The model knob rides the
 * TOOL's enum (BOARDED + the folded lanes' variant addresses — one
 * source of truth with tool.ts; a bare single-family board serves
 * no picker, but the studio doc still writes the model id and the
 * run door still consumes it). */
const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
}

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
  // THE REAL DOOR BOOT (the R2 arm's depth — the liveness wall's
  // hermetic precedent): prime the card registry over the boot
  // double (the first-import mock answered — the live engine socket
  // is never dialed), then overlay the lane store so the h3
  // family's declared lane rows stand hermetically at the presence
  // gate phase1Card runs before compose.
  let svc: CardRegistryService
  beforeAll(async () => {
    const ctx = new Context()
    // the dangling sweep reads the queue seat's manifest — a bare
    // Context makes the sweep vacuous (the lane-law boot precedent)
    ;(ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "studio-wall-boot-")),
      stateRoots: [] as string[],
    }
    svc = new CardRegistryService(ctx)
    await svc.prime()
    assertHermeticRode()
    installLaneStoreOverlay()
  }, 90_000)
  afterAll(() => {
    restoreLaneStoreOverlay()
  })

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
    // FAMILY-CONDITIONAL (B1, journey-closure 2026-11-06):
    // populatedMax carries the declared ref surface, so it derives
    // t4r — the lane that wires no post chain — and the family-aware
    // emit law OMITS every T4_ONLY member there. The skip below is
    // never vacuous: the family is asserted t4r first, and the
    // omission itself is asserted key by key after.
    const family = deriveWindowFamily(populated)
    expect(family).toBe("t4r")
    for (const key of Object.keys(populated)) {
      if (key === "seed" || key === "preset") continue // seed rides as the base row; preset is the dead key by law
      if ((T4_ONLY_KEYS as readonly string[]).includes(key)) continue // family-dead on this lane — asserted absent below
      expect(
        key in out,
        `populate set "${key}" but serializeLayerA DROPPED it — a key the UI can state and the doc never carries is the silent-drop class (the operator's burn)`,
      ).toBe(true)
    }
    // THE T4 ABSENCE RECEIPT at the save depth: every family-dead
    // member is omitted on the derived-t4r doc (never a re-stated
    // value — the walk would refuse it)
    for (const k of T4_ONLY_KEYS as readonly string[]) {
      expect(
        !(k in out) || (out as Record<string, unknown>)[k] === null,
        `derived-t4r doc states "${k}" — the family-aware emit law omits it`,
      ).toBe(true)
    }
    // THE SECOND-PASS RECEIPT at the save depth moves to the lane
    // that honors it: the same maximal doc WITHOUT the ref surface
    // derives t4_open, where the master arms and the refine rider
    // rides — the exact keys the service resolver reads at the
    // compose door
    const openPopulated = { ...populated }
    for (const k of ["ref_images", "ref_videos", "ref_audios", "ref_mods"] as const) delete openPopulated[k]
    expect(deriveWindowFamily(openPopulated)).toBe("t4_open")
    const openOut = serializeLayerA(hydrateLayerA(openPopulated))
    expect(openOut.second_pass_enabled).toBe(true)
    expect(openOut.refine_lora).toBe("h3_taomate_3step")
    expect(openOut.refine_strength).toBe(1)
    expect(openOut.refine_steps).toBe(1)
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

  // THE OFF POLE (2026-10-16, journey audit 6f80fa5a — the rank-1
  // green in every suite): the true-gated switches emit only their
  // true pole, so a flip to false wrote state the emit gate ignored
  // while `false` failed the cleared() test — the base's true
  // survived every save, the studio showed OFF, and the post chain
  // kept firing. The delete ride now treats false as the cleared
  // state for a true-gated key. This arm round-trips the NEGATIVE
  // doc: base true, state false → null (absent = off, the family
  // default); the false-pole and value-emitting booleans unaffected.
  it("THE OFF POLE persists: a true-gated switch flipped to false deletes the base's true (never silently stays on)", () => {
    const base = {
      seed: 1,
      second_pass_enabled: true, sr_switch: true,
      sharpen_enabled: true, interpolate_enabled: true,
      sla_enabled: false,
      sla_protect_audio: false, sla_stabilize_motion: false, sla_disable_fp16_accum: true,
    }
    // the OFF gesture: every true-gated switch now false in state
    const off = { ...hydrateLayerA(base as never),
      second_pass_enabled: false, sr_switch: false,
      sharpen_enabled: false, interpolate_enabled: false }
    const saved = serializeLayerA(off, base)
    // FAMILY-CONDITIONAL RE-PIN (B1, journey-closure 2026-11-06 —
    // J3, plan row 31): the false pole is lawful ONLY where the lane
    // sanctions the key. The wall was green over the burn when this
    // arm judged the poles family-blind; the doc below derives
    // t4_open (single text window, no ref lanes) — a lane that
    // honors the post chain — so the false assertions below are
    // real. On the reference lane the family-aware emit law omits
    // the key outright (the emit law arm's omit-∪-null row).
    expect(deriveWindowFamily(mergeDocLayers(base, off as Record<string, unknown>))).toBe("t4_open")
    // the `if (=== true)` arms (absent = off): the delete rides —
    // null lands, the family default is the truth
    expect(saved.second_pass_enabled).toBe(null)
    expect(saved.sr_switch).toBe(null)
    // the always-emitted booleans persist their false DIRECTLY
    // (explicit off — a second lawful dialect, same landing)
    expect(saved.sharpen_enabled).toBe(false)
    expect(saved.interpolate_enabled).toBe(false)
    // the false-pole rider keeps its own law: sla_enabled's false
    // EMITS (absent = on — the override is the off word)
    expect(saved.sla_enabled).toBe(false)
    // the value-emitting booleans ride their value, never a delete
    expect(saved.sla_protect_audio).toBe(false)
    expect(saved.sla_stabilize_motion).toBe(false)
    expect(saved.sla_disable_fp16_accum).toBe(true)
    // and the ON direction still rides true (the inverse-cheat arm)
    const on = { ...hydrateLayerA({ seed: 1 } as never), second_pass_enabled: true }
    const savedOn = serializeLayerA(on, base)
    expect(savedOn.second_pass_enabled).toBe(true)
  })

  // THE FAMILY-AWARE EMIT LAW (B1, journey-closure 2026-11-06): the
  // serializer — never a second emit path — derives the family over
  // mergeDocLayers(base, state) and OMITS every T4_ONLY member on a
  // derived-t4r doc. The always-emit booleans, the true-gated stamps,
  // every state-derived value dies here; only a base-carried stamp
  // the state explicitly cleared rides the merge-patch null ONCE (the
  // bench's null-delete settles it — one owner per key, never both,
  // never neither). The serialized output then composes GREEN through
  // the real walk + film action — the positive proof beside the Final
  // Cut refusal arm below (which proves the walk still refuses a
  // hand-stamped T4 key).
  it("derived-t4r serialization omits every T4_ONLY member and composes green (the emit law's positive proof)", () => {
    const t4rCalls = [{ text: "the courier steps in", start_frame: 0, end_frame: 90, image: "anchor.png" }]
    const base = { seed: 1, calls: t4rCalls, sr_switch: true, second_pass_enabled: true }
    // every T4 pole stated: masters, switches, methods, models, targets
    const stamped = { ...hydrateLayerA(base as never),
      second_pass_enabled: true, sharpen_enabled: true, interpolate_enabled: true,
      sharpen_method: "rcas" as const, sharpen_strength: 0.5, sharpen_radius: 2, sharpen_threshold: 0.1, sharpen_iterations: 1,
      interp_model: "film_net_fp16.safetensors" as const, interp_multiplier: 2,
      sr_switch: true, sr_model: "seedvr2_ema_3b_fp16.safetensors" as const, sr_resolution: 1080,
      attention_backend: "pytorch attention" as never,
    }
    const saved = serializeLayerA(stamped, base)
    for (const k of T4_ONLY_KEYS as readonly string[]) {
      expect(
        !(k in saved) || (saved as Record<string, unknown>)[k] === null,
        `derived-t4r doc states "${k}" — the walk would refuse it`,
      ).toBe(true)
    }
    // the genuinely non-T4 truth rides: the seed, the geometry, the clock
    expect(saved.seed).toBe(1)
    // the serialized output composes GREEN through the real door —
    // walk the serializer's own output with the doc's guided call
    const g = new GraphBuilder()
    expect(() => instantiateAction(
      film,
      h3schemaFn({ ...saved, calls: t4rCalls }),
      WINDOW_MODEL, g, "run_serializer_t4r_green",
    )).not.toThrow()
    // and the one-owner delete: a base-carried stamp the state
    // explicitly cleared rides the merge-patch null ONCE (never a
    // re-stated value, never dropped — the heal's gesture lands here)
    const cleared = serializeLayerA(
      { ...hydrateLayerA(base as never), sr_switch: undefined, second_pass_enabled: undefined }, base)
    expect(cleared.sr_switch).toBe(null)
    expect(cleared.second_pass_enabled).toBe(null)
  })

  // THE R2 DOOR ARM (B1, journey-closure 2026-11-06 — the felt hop).
  // ONE LINE: "the studio's own emit composes on every lane it can
  // derive — the emitted key set is family-legal." For each derived
  // family (t4r / t4_open / t4_chain) the arm serializes the studio's
  // OWN state (a real keyframe/film/text doc carrying the Final Cut
  // post stamps), settles the payload the way the bench door settles
  // it (bench.ts's merge-patch: per key, null deletes), and drives
  // the SETTLED doc through the REAL estate walk —
  // CardRegistryService.phase1Card → prepareCardParams → admission →
  // the card's own def.schema walk → compose. On t4r the emitted key
  // set carries no T4_ONLY member (values die in the serializer; a
  // base-carried stamp the state cleared rides the null once and the
  // settlement deletes it) — the doc composes on its own lane. On
  // t4_open / t4_chain the same stamps ride AS VALUES and compose —
  // the law is family-conditional, never a blanket omission. This is
  // the exact pipeline the run press executes; the Final Cut arm
  // below pins the door's refusal voice, this arm pins the cure.
  it("the studio's own emit composes on every lane it can derive — the emitted key set is family-legal (the R2 door arm)", async () => {
    expect(svc, "the estate boot rode — the door arm runs against the real registry").toBeDefined()
    // a compose-legal probe (the carrier's own bounds — never the
    // contract wall's maximal fixture, whose width/steps junk would
    // refuse on bounds, not on family): the Final Cut pick's post
    // stamps, complete per chain
    const PROBE: Record<string, unknown> = {
      seed: 7, width: 768, height: 448, steps: 12,
      second_pass_enabled: true,
      sharpen_enabled: true, sharpen_method: "rcas",
      interpolate_enabled: true, interp_model: "film_net_fp16.safetensors", interp_multiplier: 2,
      sr_switch: true, sr_model: "seedvr2_ema_3b_fp16.safetensors", sr_resolution: 1080,
    }
    const LANES: Array<{ family: string, seats: Record<string, unknown>, residue: Record<string, unknown> | null }> = [
      // family, the state's doc seats, the base's Final Cut residue
      // (residue null = the stamps are the STATE's own, never residue)
      {
        family: "t4r",
        seats: {
          keyframes: [{ image: "anchor.png", frame: 0 }],
          calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90 }],
        },
        residue: { sr_switch: true, second_pass_enabled: true },
      },
      { family: "t4_open", seats: { calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }] }, residue: null },
      {
        family: "t4_chain",
        seats: { calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }, { text: "the gulls turn east", start_frame: 90, end_frame: 158 }] },
        residue: null,
      },
    ]
    for (const { family, seats, residue } of LANES) {
      // the base: the saved doc (the seats + the Final Cut pick's
      // wire stamps where the doc was stamped before the family moved)
      const base: Record<string, unknown> = { ...seats, ...(residue ?? {}) }
      // the state: the probe's own post stamps + the doc seats; on the
      // t4r leg the D8 heal has already unstated the residue
      const state: Record<string, unknown> = {
        ...hydrateLayerA(base as never), ...PROBE, ...seats,
        ...(residue ? { sr_switch: undefined, second_pass_enabled: undefined } : {}),
      }
      const saved = serializeLayerA(state as never, base) as Record<string, unknown>
      if (family === "t4r") {
        // THE STRICT EMIT LAW AT THE PAYLOAD DEPTH: no T4_ONLY member
        // rides as a value; a member rides ONLY as the delete-ride
        // null (and only the residue the state cleared)
        for (const k of T4_ONLY_KEYS as readonly string[]) {
          expect(
            saved[k] === undefined || saved[k] === null,
            `${family}: the studio's own emit states "${k}" (${String(saved[k])}) — the walk refuses it on the reference lane`,
          ).toBe(true)
        }
        expect(saved.sr_switch).toBe(null)
        expect(saved.second_pass_enabled).toBe(null)
      } else {
        // the sanctioned lanes keep their post chain: the same stamps
        // ride AS VALUES (the law is conditional, never a blanket omit)
        expect(saved.second_pass_enabled).toBe(true)
        expect(saved.sr_switch).toBe(true)
      }
      // THE BENCH SETTLEMENT (bench.ts's merge-patch, verbatim law:
      // per key, null deletes) — the view the run press actually reads
      const settled: Record<string, unknown> = { ...base }
      for (const [k, v] of Object.entries(saved)) {
        if (v === null) delete settled[k]
        else settled[k] = v
      }
      if (family === "t4r") {
        for (const k of T4_ONLY_KEYS as readonly string[]) {
          expect(k in settled, `${family}: "${k}" survived the settlement — the door would refuse it`).toBe(false)
        }
      }
      // THE REAL DOOR: prepareCardParams → board → admission → lane
      // gates → the card's own walk → compose. The refusal this arm
      // kills is the operator's verbatim brick ("card_compose phase 1:
      // ... unsanctioned inject keys") — a red here is the burn again.
      await expect(
        svc.phase1Card({ ...settled, card: "h3-timeline", model: "h3" }, "h3"),
        `${family}: the studio's own settled emit refuses at the real door`,
      ).resolves.toBeDefined()
    }
  })

  // THE FINAL CUT BRICK (2026-10-16, journey audit 0be61df8 F1 —
  // the recipes audit's worst): the Final Cut recipe stamps
  // sr_switch; a one-call doc with a guide derives t4r; the walk
  // refuses the stamp. Two truths pinned at the seam: the DOOR
  // refuses (the compose's own voice — if the walk ever stops
  // refusing, this reds), and the STUDIO stops offering the row
  // (the omitRecipeRow gate — if the gate ever stops filtering,
  // this reds). A pick can never land what the compose refuses.
  it("the Final Cut stamp refuses at the t4r door (unsanctioned sr_switch) — pinned beside the studio's row gate", async () => {
    // the door's truth: a derived-t4r doc carrying the Final Cut
    // stamp's second_pass rail REFUSES at the walk
    const g = new GraphBuilder()
    let refused: string | null = null
    try {
      instantiateAction(
        film,
        h3schemaFn({
          variant: undefined,
          calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90, image: "anchor.png" }],
          second_pass_enabled: true, sr_switch: true,
          seed: 1,
        }),
        WINDOW_MODEL, g, "run_finalcut_t4r",
      )
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    expect(refused).not.toBe(null)
    expect(String(refused)).toMatch(/unsanctioned inject keys/)
    // THE NEGATIVE CONTROL (B1, journey-closure 2026-11-06 — the
    // hand literal retired): the studio's OWN row gate, driven by
    // the REAL served spec (formSpecArm — the exact body
    // /v1/form-spec?model=h3 serves) over the DECL's own Final Cut
    // row, omits the row on the reference lane. The gate judges the
    // row's stamp (never a hand id list): if the recipe ever drops
    // its sr_switch stamp, the gate's verdict flips and this reds —
    // the arm follows the DECL through the predicate, never a frozen
    // literal.
    const spec = await formSpecArm("h3")
    expect(spec, "the served form spec resolved (h3 boards the timeline card)").not.toBeNull()
    // the row AS SERVED — the exact object the studio's pill gate
    // judges (the served variant row carries the FULL stamp:
    // resolver knobs ∪ wire payloads)
    const servedRow = (spec as { variants?: Array<{ id: string }> }).variants
      ?.find((r) => r.id === "final")
    expect(servedRow, "the served spec carries the Final Cut variant row").not.toBeUndefined()
    expect(
      omitT4RecipeRow(spec, servedRow),
      "the studio's row gate offers the Final Cut row on the reference lane — the pick would land what the walk refuses",
    ).toBe(true)
    // the gate's OTHER faces, same served truth: a spec-less render
    // omits nothing (the caller's guard owns the lane condition —
    // the predicate never derefs a null it would never judge), and a
    // row whose stamp carries no family-dead key stays offered (the
    // filter is the stamp's judgment, never a blanket omit).
    expect(omitT4RecipeRow(null, servedRow)).toBe(false)
    const cleanRow = (spec as { variants?: Array<{ id: string }> }).variants
      ?.find((r) => r.id !== "final" && !omitT4RecipeRow(spec, r))
    expect(cleanRow, "the served spec carries a family-legal variant row").not.toBeUndefined()
    expect(omitT4RecipeRow(spec, cleanRow)).toBe(false)
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
    // FAMILY-CONDITIONAL (B1, journey-closure 2026-11-06):
    // populatedMax derives t4r, where the emit law omits every T4_ONLY
    // member — so the T4 lane's own rows are judged against the same
    // maximal doc WITHOUT the ref surface (t4_open, where the lane
    // honors them). A served row with NO family-legal carrier is the
    // orphan class, wherever it hides.
    const openPopulated = populatedMax()
    for (const k of ["ref_images", "ref_videos", "ref_audios", "ref_mods"]) delete openPopulated[k]
    const openEmitted = new Set(Object.keys(serializeLayerA(hydrateLayerA(openPopulated as never))))
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
      // T4_ONLY rows ride the t4_open carrier (their family-legal
      // lane); every other served row rides the t4r carrier — or the
      // call-knob plane, which this arm already trusts.
      const carrier = (T4_ONLY_KEYS as readonly string[]).includes(key) ? openEmitted : emitted
      expect(
        carrier.has(key) || CALL_KNOB_KEYS.has(key),
        `served schema row "${key}" is carried by NO serializer — not serializeLayerA, not the call-knob plane, not exempt. This is the served-never-carried class: the panel renders it, writes die at save (the duck_depth_db / ref_video_trims burn, audit 89d325c0)`,
      ).toBe(true)
    }
  })
})
