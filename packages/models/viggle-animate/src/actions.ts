// actions.ts — the viggle-animate family's declared action (the
// atom vocabulary, stroke 3, the video leg): the single-shot
// Openjutsu swap. ONE segment owns the lane the upstream example
// workflow spells: ViggleTextCondLoader (the frozen 362-token text
// embed — the text encoder is never needed) → ViggleAnimateConditioning
// (the driving clip supplies motion/camera/background, the still
// supplies identity) → BasicGuider ← MiniMaxH3SigmaShift(3, 3) over
// the DMD-lora-stacked UNET → SamplerCustomAdvanced (RandomNoise +
// KSamplerSelect euler + ManualSigmas) → VAEDecode → VHS_VideoCombine
// with the source clip's own audio carried through.
//
// THE SAMPLING BASELINE (the pack README, verbatim): ManualSigmas
// `1.0, 0.8571428571428571, 0.6, 0.0`, euler, the DMD lora at
// strength 1.0, video/audio shift 3.0 — the shift does not
// re-transform a supplied ManualSigmas tensor. The schedule the
// segment emits is COMPUTED from the stated step count by the
// upstream formula (sigma = 3t / (1 + 2t), t evenly spaced 1→0), so
// steps 3 reproduces the baseline string exactly and steps 4 is its
// five-point sibling — never a frozen literal someone drifts.
import type { NodeInputs, OutputHandle } from '@melite/comfyui-card-kit/graph'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { ComfyActionSpec } from '@melite/comfyui-card-kit'
import type { LaneInputsFacts } from '@melite/comfyui-card-kit/facts'
import { requireText } from '@melite/comfyui-card-kit/facts'
import { fireLoras } from '@melite/comfyui-card-kit/guard'
import { VIGGLE_LORA_ROWS } from '@melite/models-viggle-animate/mods/loras'

/** The closed facts shape the animate segment reads. */
export type ViggleFacts = {
  readonly unet: string;
  readonly vae: string;
  readonly text_cond: string;
  readonly loras: string;
};

/** The gated params doc the animate segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule). */
export type ViggleParams = Record<string, unknown>;

/** The animate facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseViggleFacts(raw: LaneInputsFacts): ViggleFacts {
  const text = (key: "unet" | "vae" | "text_cond" | "loras"): string =>
    requireText(raw, key, "viggle-animate animate");
  return { unet: text("unet"), vae: text("vae"), text_cond: text("text_cond"), loras: text("loras") };
}

/** THE DMD2 SCHEDULE (the upstream distill's sigma grid): n Euler
 *  updates ride n+1 sigma points, t evenly spaced from 1 to 0,
 *  sigma = 3t / (1 + 2t). n=3 emits the upstream baseline string
 *  verbatim ("1.0, 0.8571428571428571, 0.6, 0.0").
 *  @param updates the stated Euler-update count (the `steps` knob)
 *  @returns the comma-joined sigma string ManualSigmas parses */
export function dmd2Sigmas(updates: number): string {
  const points: string[] = []
  for (let i = 0; i <= updates; i++) {
    const t = 1 - i / updates
    points.push(String((3 * t) / (1 + 2 * t)))
  }
  return points.join(", ")
}

/** THE MARRIED-KNOB CONSULT (the h3 steps marriage, one spelling):
 *  while a counting bag row rides, steps is the ROW'S — stated on
 *  the entry first, else the catalog row's declared column BY
 *  FILENAME (the wire's `name`; fictional filenames marry nothing),
 *  Math.max across the bag, else null (no counting row — the
 *  schema's default owns). The ACTION's layering is the h3 law: the
 *  doc's own stated steps > this consult > the schema default.
 *  PURE, no I/O.
 *  @param p the gated doc (the loras bag)
 *  @returns the bag's step count, or null when no counting row rides */
export function marriedSteps(p: Record<string, unknown>): number | null {
  if (!Array.isArray(p.loras)) return null
  const counts: number[] = []
  for (const row of p.loras as Array<Record<string, unknown>>) {
    if (row === null || typeof row !== "object") continue
    const stated = row.steps
    if (typeof stated === "number" && Number.isFinite(stated)) {
      counts.push(stated)
      continue
    }
    const name = row.name
    const fromCatalog = typeof name === "string"
      ? VIGGLE_LORA_ROWS.find((r) => r.filename === name)?.steps
      : undefined
    if (typeof fromCatalog === "number" && Number.isFinite(fromCatalog)) counts.push(fromCatalog)
  }
  return counts.length > 0 ? Math.max(...counts) : null
}

/** The animate action: the Openjutsu single-shot swap — the frozen
 * text embed, the driving clip + the identity still, the DMD
 * 3-4 step envelope, SaveVideo (VHS_VideoCombine) with the source
 * clip's audio. */
export const animate: ComfyActionSpec<ViggleParams, ViggleFacts> = {
  id: "animate",
  inputs: [],
  outputs: [{ name: "video", kind: "video" }],
  // THE DECLARED SURFACE (the write plane): exactly the knobs the
  // openjutsu card serves — every row rides a graph consumer
  // verbatim (the knob→seat law). No prompt seat: the frozen text
  // embed IS the lane's whole text surface (fixed_embed_fwd_anyframe
  // was computed once with Qwen3-VL; the node takes no text).
  params: [
    { name: "ref_image", type: "string" },
    { name: "clip", type: "string" },
    { name: "length", type: "number", bounds: [5, 3600] },
    { name: "width", type: "number", bounds: [0, 16384] },
    { name: "height", type: "number", bounds: [0, 16384] },
    { name: "steps", type: "number", bounds: [1, 8] },
    { name: "shift_video", type: "number", bounds: [0.1, 20] },
    { name: "shift_audio", type: "number", bounds: [0.1, 20] },
    { name: "seed", type: "number", rule: "seed-sentinel" },
  ],
  facts: parseViggleFacts,
  build({ p, facts, model, g, runId }) {
    const seed = p.seed as number;
    // THE TEXT SURFACE (the lane's own): the frozen embed loader —
    // absent on disk, the run gate's lane_homes probe refuses loud
    // at press with the fetch hint (the text_cond home).
    const textCond = g.node("ViggleTextCondLoader", { text_cond: facts.text_cond }).out();
    // THE DRIVING CLIP: a '$name' value names an upstream stage's
    // wired image stream (the spell IS the tensor — no loader node,
    // and no audio to carry); a path loads through ONE
    // VHS_LoadVideo at the lane's 24 fps contract, capped at the
    // stated length so the conditioning window and the frames
    // agree. The clip's audio rides the combine (out 2).
    // a '$' spell is a JsonValue input (the wire IS the tensor);
    // only a loaded clip needs the node handle's slots. The wire
    // narrows here so neither branch casts.
    const clipWire = typeof p.clip === "string" && p.clip.startsWith("$") ? p.clip : null
    let clipImage: NodeInputs[string]
    const clipAudio = (() => {
      if (clipWire !== null) {
        clipImage = clipWire
        return undefined
      }
      const loader = g.node("VHS_LoadVideo", {
        video: p.clip as string,
        force_rate: 24,
        custom_width: 0,
        custom_height: 0,
        frame_load_cap: p.length,
        skip_first_frames: 0,
        select_every_nth: 1,
      })
      clipImage = loader.out(0)
      return loader.out(2)
    })()
    // THE IDENTITY STILL: the same spell law — a '$' wire is a
    // tensor, a path loads from the input dir.
    const refImage: NodeInputs[string] = typeof p.ref_image === "string" && p.ref_image.startsWith("$")
      ? p.ref_image
      : g.node("LoadImage", { image: p.ref_image, upload: "image" }).out(0)
    // THE CONDITIONING (video-first nested references, the evaluated
    // configuration): width/height 0 = the clip's own geometry.
    const cond = g.node("ViggleAnimateConditioning", {
      cond_video: clipImage,
      ref_image: refImage,
      text_cond: textCond,
      vae: g.node("VAELoader", { vae_name: facts.vae }).out(),
      width: p.width,
      height: p.height,
      length: p.length,
    })
    const positive = cond.out(0)
    const latent = cond.out(1)
    // THE MODEL STACK: UNET → the loras bag (the DMD accelerator is
    // the default row; the bag fires ONE LoraLoaderModelOnly per
    // pick) → the sigma shift (3/3 upstream baseline).
    const bag = fireLoras(model, p)
    let cur = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out()
    for (const pick of bag) {
      cur = g.node("LoraLoaderModelOnly", {
        model: cur,
        lora_name: pick.name,
        strength_model: pick.strength,
      }).out()
    }
    const shifted = g.node("MiniMaxH3SigmaShift", {
      model: cur,
      shift_video: p.shift_video,
      shift_audio: p.shift_audio,
    }).out()
    // THE SAMPLER TAIL: the upstream baseline — euler, the DMD
    // schedule at the layered step count (the h3 marriage law: the
    // doc's own stated steps > the bag's counting row > the schema
    // default 3), CFG-free BasicGuider.
    const statedSteps = typeof p.steps === "number" && Number.isFinite(p.steps) ? p.steps : null
    const steps = statedSteps ?? marriedSteps(p) ?? 3
    const sampled = g.node("SamplerCustomAdvanced", {
      noise: g.node("RandomNoise", { noise_seed: seed }).out(),
      guider: g.node("BasicGuider", { model: shifted, conditioning: positive }).out(),
      sampler: g.node("KSamplerSelect", { sampler_name: "euler" }).out(),
      sigmas: g.node("ManualSigmas", { sigmas: dmd2Sigmas(steps) }).out(),
      latent_image: latent,
    }).out(0)
    const frames = g.node("VAEDecode", { samples: sampled, vae: g.node("VAELoader", { vae_name: facts.vae }).out() }).out()
    // THE COMBINE: h264 mp4 at the lane's 24 fps, the source clip's
    // own audio carried through when the clip loaded engine-side.
    // THE PINNED CLASS'S OWN KEY SET (object_info at the VHS pin):
    // no pix_fmt/crf/save_metadata seats — the h264-mp4 format
    // string owns the encode; extra keys die at /prompt.
    return g.node("VHS_VideoCombine", {
      images: frames,
      frame_rate: 24,
      loop_count: 0,
      filename_prefix: `${runId}/openjutsu`,
      format: "video/h264-mp4",
      pingpong: false,
      save_output: true,
      ...(clipAudio === undefined ? {} : { audio: clipAudio }),
    }).out()
  },
};
