/** The closed upscale-method set (the dropdown law, 2026-10-24):
 *  ComfyUI core ImageScale's own combo values, grounded in the live
 *  engine's object_info (not memory). The input-prep card's
 *  scale_method vocabulary serves THIS export — one truth, two
 *  consumers, so a card-authored copy cannot drift from what the
 *  engine accepts. */
export declare const SCALE_METHODS: readonly ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"];
/** The minimum sane dimension (the blank-image law, 2026-10-24): a
 *  crop or scale side below 8px upscales to a blank — the live
 *  receipt is run-c5eb3f2ec512 (scale 2x1 → a 2x1 beige strip the
 *  lane served as the run's image). 8 is the universal latent
 *  divisor: no downstream model in the estate can process a side
 *  below 8px, so nothing legitimate composes smaller. The
 *  input-prep card's gate serves THIS export — one truth. */
export declare const MIN_DIM = 8;
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
export declare const UPSCALE_MODELS: readonly ["RealESRGAN_x4plus", "RealESRGAN_x2plus", "RealESRGANGeneral_x4v3", "4x-UltraSharp", "ESRGAN_x4"];
/** The scale_model dropdown: the roster led by the "" unstated
 *  sentinel. "" is a declared member because schemastery validates
 *  a schema default against its closed union — the unstated face
 *  must parse, not refuse. The card's vocabulary() and this
 *  action's enum options cite THIS export — one truth, two
 *  consumers (the SCALE_METHODS idiom). */
export declare const SCALE_MODEL_OPTIONS: readonly ["", "RealESRGAN_x4plus", "RealESRGAN_x2plus", "RealESRGANGeneral_x4v3", "4x-UltraSharp", "ESRGAN_x4"];
//# sourceMappingURL=scale-vocab.d.ts.map
