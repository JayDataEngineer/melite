// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the music card binds. The DECL's
// lane_inputs are the ONE facts door (unet + text_encoder +
// clip_type + vae — the MiniMax trio rail); the segment factory is
// the lane IS this file, pinned to committed goldens in tests/golden/
// — the wire the port produced while the kit's twin still existed and
// the oracle compared them byte-for-byte. Creation order IS node-id
// order (the recipe law). Keys the segment never reads (checkpoint,
// texture_vae, … the strip shape) ride unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { requireText, type LaneInputsFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
import { assertMusic3StepsInTier, music3StepTier } from "./tier.ts";
import { TILED_DECODE_SEATS, deriveDecodeTier, type DecodeTier } from "./decode.ts";

/** The closed facts shape the compose segment reads. */
export type MusicFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly clip_type: string;
  readonly vae: string;
};

/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported mint below is a pass-through). */
export type MusicParams = Record<string, unknown>;

/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseMusicFacts(raw: LaneInputsFacts): MusicFacts {
  const text = (key: keyof MusicFacts): string => requireText(raw, key, "music3 compose");
  return { unet: text("unet"), text_encoder: text("text_encoder"), clip_type: text("clip_type"), vae: text("vae") };
}

/** The compose action: MiniMax Music 3 — UNET/CLIP/VAE loaders from
 * the family's own weights, MiniMaxMusic3TextEncode on the caption
 * + lyrics, KSampler euler/simple over the empty music latent,
 * VAEDecodeAudio, SaveAudioAdvanced mp3 under <run>/music. */
export const compose: ComfyActionSpec<MusicParams, MusicFacts> = {
  id: "compose",
  inputs: [],
  outputs: [{ name: "audio", kind: "AUDIO" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the music
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row.
  params: [
    { name: "prompt", type: "string" },
    { name: "lyrics", type: "string" },
    { name: "duration", type: "number", bounds: [5, 360] },
    { name: "guidance_scale", type: "number", bounds: [0.1, 10] },
    { name: "lm_cfg_scale", type: "number", bounds: [0.1, 10] },
    { name: "n_diffusion_steps", type: "number", bounds: [1, 200] },
    { name: "seed", type: "number", rule: "seed-sentinel" },
    // THE DECODE TIER KNOB (audit 014 C3): NO default row — absence
    // IS the derivation's seat. A stamped literal here would be the
    // second default home the seed cure died killing; the derivation
    // (decode.ts deriveDecodeTier) owns the unstated compose.
    { name: "tiled_decode", type: "boolean" },
  ],
  facts: parseMusicFacts,
  build({ p, facts, model, g, runId }) {
    // THE DEAD-KNOB REFUSAL (value-arm cure, 2026-11-08): mode is the
    // YuE2 ABC-planning vocabulary (card.ts mode tooltip; the YuE2
    // nodes read it) — the MiniMax lane plans no symbolic score and
    // MiniMaxMusic3TextEncode declares no mode input (the engine
    // node's schema: clip, caption, lyrics, seed, max_duration,
    // cfg_scale, top_k). A stated non-default mode used to cross
    // every gate and die unread at compose — the silent drop the
    // value arms pre-registered. Refuse loud in the knob's own
    // voice; "full" rides because the card schema's walk fills it as
    // the stated default (the stated default IS the unstated
    // compose), and an absent mode (direct action callers) rides.
    const mode = p.mode as string | undefined;
    if (mode !== undefined && mode !== "full") {
      throw new Error(
        `music3 compose: mode '${String(mode)}' fires nothing on this lane — ` +
          "mode is the YuE2 ABC-planning vocabulary (full/melody drive YuE2's symbolic score); " +
          "the MiniMax lane's engine node reads caption+lyrics only, no mode input. " +
          "Drop mode, or switch lane (model=yue2) to plan a score",
      );
    }
    const seed = p.seed as number;
    // THE STEP↔CHECKPOINT TIER (audit 014 C4): the steps and the
    // checkpoint share ONE derivation — the resolved unet derives the
    // tier, a stated steps must sit inside its domain (outside
    // refuses loud, naming the pairing), and an unstated steps rides
    // the tier's own default. The card schema's served default is the
    // full tier's default (one home, tier.ts).
    const statedSteps = p.n_diffusion_steps;
    const steps =
      typeof statedSteps === "number"
        ? (assertMusic3StepsInTier(facts.unet, statedSteps), statedSteps)
        : music3StepTier(facts.unet).default;
    const unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    const clip = g.node("CLIPLoader", { clip_name: facts.text_encoder, model_options: "default", type: facts.clip_type }).out();
    const vae = g.node("VAELoader", { vae_name: facts.vae }).out();
    const cond = g.node("MiniMaxMusic3TextEncode", {
      clip,
      caption: p.prompt,
      lyrics: p.lyrics ?? "",
      seed,
      max_duration: p.duration,
      cfg_scale: p.lm_cfg_scale,
      top_k: 50,
    });
    const zeroed = g.node("ConditioningZeroOut", { conditioning: cond.out(0) });
    // The latent's length is DERIVED from the AR, never addressed twice: slot 1
    // of MiniMaxMusic3TextEncode is the realized AR length in seconds, and the
    // official template wires exactly this link. Stamping the duration literal
    // here lets the seats diverge when the AR ends the song early — the DiT
    // zero-pads the conditioning (dit.py:197-198) and the latent tail generates
    // unconditioned noise (audit 014, D1). max_duration above is the user's
    // only duration seat.
    const latent = g.node("EmptyMiniMaxMusic3LatentAudio", { batch_size: 1, seconds: cond.out(1) });
    const sampled = g.node("KSampler", {
      seed,
      steps,
      cfg: p.guidance_scale,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1.0,
      latent_image: latent.out(),
      model: unet,
      positive: cond.out(0),
      negative: zeroed.out(),
    });
    // THE VRAM-AWARE DECODE TIER (audit 014 C3): the strategy derives
    // from the lane's own signal — the resolved variant cell's
    // DECL-declared vram_peak_gb (the resolver's coordinate law: the
    // address's own cell claim, else the matrix's default cell) and
    // the track's duration cap. A stated knob overrides; absent, the
    // derivation decides. The tiled seats are the template's own
    // (1536/64).
    const decodeTier: DecodeTier =
      p.tiled_decode === undefined
        ? deriveDecodeTier(resolvedCellVramPeakGb(model), typeof p.duration === "number" ? p.duration : 0)
        : p.tiled_decode
          ? "tiled"
          : "plain";
    const audio =
      decodeTier === "tiled"
        ? g.node("VAEDecodeAudioTiled", { samples: sampled.out(), vae, ...TILED_DECODE_SEATS })
        : g.node("VAEDecodeAudio", { samples: sampled.out(), vae });
    return g.node("SaveAudioAdvanced", { audio: audio.out(), filename_prefix: `${runId}/music`, format: "mp3", "format.quality": "V0" }).out();
  },
};

/** The resolved variant cell's DECL-declared VRAM peak — the mirror
 *  of the resolver's own coordinate law (resolveCellRow: the
 *  address's own cell claim wins, else the first offered cell of the
 *  first offered Variant row). Reads the facts row the action build
 *  receives; a matrix-less facts row (hand fixtures) reads null —
 *  unmeasured, never called low-VRAM.
 *  @param model the resolved model facts row (id, family, variants)
 *  @returns the resolved cell's declared peak, or null */
function resolvedCellVramPeakGb(model: ModelFacts): number | null {
  const rows = model.variants ?? [];
  const address = model.id;
  for (const v of rows) {
    for (const c of v.cells ?? []) {
      if (c.route === address) return c.vram_peak_gb;
    }
  }
  for (const v of rows) {
    if (v.group !== "Variant" || v.hide_from_dropdown === true) continue;
    const cell = (v.cells ?? []).find((c) => c.hide_from_dropdown !== true);
    if (cell !== undefined) return cell.vram_peak_gb;
  }
  return null;
}
