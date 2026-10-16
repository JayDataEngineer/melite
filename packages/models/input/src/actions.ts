// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the prep action the input-prep card binds. The lane is
// WEIGHTLESS — no model ever loads — so the facts door is vacuous
// (nothing to parse, nothing to drift). The segment factory is the
// lane IS this file (the staged-source transform: passthrough audio,
// crop/scale images — the source admission stays on the card). Its
// graphs are pinned to committed goldens in tests/golden/ — the wire
// the port produced while the kit's twin still existed and the oracle
// compared them byte-for-byte. Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { saveAudio } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the prep segment reads: nothing — the
 * lane is weightless (every wire value comes from params). */
export type PrepFacts = Record<string, never>;

/** The staged-source row the prep segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * crop/scale rows are re-validated here because the node build reads
 * their members raw). */
interface CropRow { x: number; y: number; width: number; height: number }
interface ScaleRow { width: number; height: number; method?: string }
export type PrepParams = Record<string, unknown>;

/** The closed upscale-method set (the dropdown law, 2026-10-24):
 *  ComfyUI core ImageScale's own combo values, grounded in the live
 *  engine's object_info (not memory). The input-prep card's
 *  scale_method vocabulary serves THIS export — one truth, two
 *  consumers, so a card-authored copy cannot drift from what the
 *  engine accepts. */
export const SCALE_METHODS = ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"] as const;

/** The minimum sane dimension (the blank-image law, 2026-10-24): a
 *  crop or scale side below 8px upscales to a blank — the live
 *  receipt is run-c5eb3f2ec512 (scale 2x1 → a 2x1 beige strip the
 *  lane served as the run's image). 8 is the universal latent
 *  divisor: no downstream model in the estate can process a side
 *  below 8px, so nothing legitimate composes smaller. The
 *  input-prep card's gate serves THIS export — one truth. */
export const MIN_DIM = 8;

/** The standard ComfyUI upscale-model roster (operator directive,
 *  2026-11-08 — the studio card: "parameters to upscale / downscale
 *  optionally, letting you choose the model"): the model files a
 *  user installs into models/upscale_models. GROUNDED: the live
 *  engine's UpscaleModelLoader.model_name COMBO is EMPTY today
 *  (object_info serves options: [] — no model files installed), so
 *  there is no live roster to cite; this declared set is the
 *  standard set the node ships for, and the ENGINE refuses loud
 *  when a picked file is absent — that refusal is the honest face,
 *  never a silent drop. */
export const UPSCALE_MODELS = [
  "RealESRGAN_x4plus",
  "RealESRGAN_x2plus",
  "RealESRGANGeneral_x4v3",
  "4x-UltraSharp",
  "ESRGAN_x4",
] as const;

/** The scale_model dropdown: the roster led by the "" unstated
 *  sentinel. "" is a declared member because schemastery validates
 *  a schema default against its closed union — the unstated face
 *  must parse, not refuse. The card's vocabulary() and this
 *  action's enum options cite THIS export — one truth, two
 *  consumers (the SCALE_METHODS idiom). */
export const SCALE_MODEL_OPTIONS = ["", ...UPSCALE_MODELS] as const;

/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parsePrepFacts(_raw: LaneInputsFacts): PrepFacts {
  return {};
}

/** The staged-source transform action: audio passthrough
 * (LoadAudio→SaveAudio) or image LoadImage→[crop]→[model upscale]→
 * [scale]→SaveImage under <run>/input_prep. */
export const prep: ComfyActionSpec<PrepParams, PrepFacts> = {
  id: "prep",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the
  // input-prep card schema's own types and bounds — the family
  // door judges defaults and variant presets against this row. The
  // segment reads the crop and scale rows as the crop/scale
  // objects the card packs from these flat members; a value tier
  // cannot name an object, so the surface declares the members the
  // card's gate validates and packs. Each transform member's floor
  // is -1 (the unset sentinel) and its ceiling is the card's — none.
  params: [
    { name: "source", type: "string" },
    { name: "media_type", type: "enum", options: ["image", "audio"] },
    { name: "crop_x", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "crop_y", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "crop_width", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "crop_height", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "scale_width", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "scale_height", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
    { name: "scale_method", type: "enum", options: [...SCALE_METHODS] },
    { name: "scale_model", type: "enum", options: [...SCALE_MODEL_OPTIONS] },
  ],
  facts: parsePrepFacts,
  build({ p, g, runId }) {
    const prefix = `${runId}/input_prep`;

    // THE CLOSED-SET BACKSTOP (2026-10-12, the media_type three-plane
    // arm): the card's vocabulary gate refuses a bogus member at
    // schema parse, but a direct instantiateAction caller bypasses
    // that gate — and the `=== "audio"` branch below would serve a
    // bogus member down the IMAGE path silently. The family refuses
    // it here in its own voice (the scale-method membership backstop
    // below is the precedent).
    if (p.media_type !== undefined && p.media_type !== "image" && p.media_type !== "audio") {
      throw new Error(`media_type refused on the input-prep card: must be one of image | audio (got ${JSON.stringify(p.media_type)})`);
    }
    if (p.media_type === "audio") {
      const loaded = g.node("LoadAudio", { audio: p.source as string });
      return saveAudio(g, loaded.out(), prefix).out();
    }

    let img: OutputHandle = g.node("LoadImage", { image: p.source as string }).out(0);
    const crop = p.crop as CropRow | undefined;
    if (crop) {
      for (const k of ["x", "y", "width", "height"] as const) {
        if (typeof crop[k] !== "number") {
          throw new Error(`crop row refused on the input-prep card: '${k}' must be a number (got ${JSON.stringify(crop[k])})`);
        }
        // THE INTEGER LAW (2026-10-24, volley item g): ImageCrop
        // takes INT — a 1.5 that reaches the engine dies as a raw
        // engine error. The family refuses it here in its own voice.
        if (!Number.isInteger(crop[k])) {
          throw new Error(`crop row refused on the input-prep card: '${k}' must be an integer (got ${JSON.stringify(crop[k])})`);
        }
      }
      // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a crop side
      // below MIN_DIM upscales to a blank — refused here for the
      // legacy-object path that bypasses the card's gate.
      if (crop.width < MIN_DIM || crop.height < MIN_DIM) {
        throw new Error(`crop row refused on the input-prep card: 'width'/'height' must be at least ${MIN_DIM}px (got ${crop.width}x${crop.height}) — smaller crops upscale to a blank`);
      }
      img = g.node("ImageCrop", { image: img, x: crop.x, y: crop.y, width: crop.width, height: crop.height }).out(0);
    }
    // THE MODEL-UPSCALE CHAIN (operator directive, 2026-11-08 — the
    // studio card's own model choice, superseding the header ruling
    // that parked the diffusion upscaler on the upscale-tools card):
    // a stated scale_model rides UpscaleModelLoader →
    // ImageUpscaleWithModel FIRST, consuming the loader's OUTPUT
    // handle; the plain ImageScale (a stated downsize after the
    // model's xN) composes only after it. The "" sentinel (the
    // unstated face the card ships) keeps today's chain byte-for-byte.
    const scaleModel = typeof p.scale_model === "string" ? p.scale_model : "";
    if (scaleModel !== "") {
      // THE CLOSED SET (the dropdown law's backstop): the legacy
      // flat-params path bypasses the card's vocabulary gate, so a
      // bogus model string is refused here — the engine's combo
      // would 500 it raw (and an absent file dies at the engine,
      // loud, in the engine's own voice).
      if (!(UPSCALE_MODELS as readonly string[]).includes(scaleModel)) {
        throw new Error(`scale_model refused on the input-prep card: must be one of ${UPSCALE_MODELS.join(" | ")} (got ${JSON.stringify(p.scale_model)})`);
      }
      const loaded = g.node("UpscaleModelLoader", { model_name: scaleModel });
      img = g.node("ImageUpscaleWithModel", { upscale_model: loaded.out(0), image: img }).out(0);
    }
    const scale = p.scale as ScaleRow | undefined;
    if (scale) {
      if (typeof scale.width !== "number" || typeof scale.height !== "number") {
        throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be numbers (got ${JSON.stringify(scale)})`);
      }
      // THE INTEGER LAW (2026-10-24, volley item g): ImageScale
      // takes INT — `scale_width expected number multiple of 1 but
      // got 1.5` must fire HERE, naming the contract, never as a raw
      // engine refusal downstream.
      if (!Number.isInteger(scale.width) || !Number.isInteger(scale.height)) {
        throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be integers (got ${JSON.stringify(scale)})`);
      }
      const method = typeof scale.method === "string" ? scale.method : "lanczos";
      // THE CLOSED SET (the dropdown law's backstop): the legacy
      // scale-object path bypasses the card's vocabulary gate, so a
      // bogus method string is refused here — the engine's combo
      // would 500 it raw.
      if (!(SCALE_METHODS as readonly string[]).includes(method)) {
        throw new Error(`scale row refused on the input-prep card: 'method' must be one of ${SCALE_METHODS.join(" | ")} (got ${JSON.stringify(scale.method)})`);
      }
      // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a scale
      // target below MIN_DIM on a side IS the reported blank
      // (run-c5eb3f2ec512: 2x1 → a 2x1 beige strip) — refused here
      // for the legacy-object path that bypasses the card's gate.
      if (scale.width < MIN_DIM || scale.height < MIN_DIM) {
        throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be at least ${MIN_DIM}px (got ${scale.width}x${scale.height}) — smaller targets upscale to a blank`);
      }
      img = g.node("ImageScale", { image: img, upscale_method: method, width: scale.width, height: scale.height, crop: "disabled" }).out(0);
    }
    return g.node("SaveImage", { images: img, filename_prefix: prefix }).out();
  },
};
