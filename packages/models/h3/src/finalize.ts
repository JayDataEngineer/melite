// finalize.ts — the h3 family's OWN t4 strip pass (`if not is_t4r`),
// re-homed family-side (the kit-arm retirement, 2026-09-30). The
// strip is this family's serialization law: the t4 templates OMIT
// these pin defaults, so the engine would auto-fill them at
// serialization, and the t4r branch carries all of them explicitly
// (it never strips). It lived in the card kit as `finalizeH3` while
// the lane itself moved here; a finalize pass with no lane beside it
// is a second home, so it came too.
import { stripAutofill } from "@melite/comfyui-card-kit/graph";
import type { PromptGraph, StripTable } from "@melite/comfyui-card-kit/graph";

/** H3-only video lanes (2026-09-21, operator order — "there is no
 *  wan-vace, there is only H3 in timeline studio"): the wan-vace
 *  and scail2-animate lanes are gone with their card and families. */
export const H3_T4_STRIP: StripTable = {
  CLIPLoader: ['device'],
  LTX_lora_loader: ['lora_ui'],
  SeedVR2LoadDiTModel: [
    'attention_mode', 'blocks_to_swap', 'cache_model', 'offload_device',
    'swap_io_components'],
  SeedVR2LoadVAEModel: [
    'cache_model', 'decode_tile_overlap', 'decode_tile_size',
    'decode_tiled', 'encode_tile_overlap', 'encode_tile_size',
    'encode_tiled', 'offload_device', 'tile_debug'],
  SeedVR2VideoUpscaler: [
    'enable_debug', 'input_noise_scale', 'latent_noise_scale',
    'offload_device', 'prepend_frames', 'temporal_overlap'],
}

/** The t4-family strip pass (`if not is_t4r`). The i2v dead-branch
 *  node exists ONLY on t4r — the serialized graph's family marker —
 *  so the strip stays stateless per compose. */
export function finalizeH3(graph: PromptGraph): PromptGraph {
  if ('MiniMaxH3ImageToVideo.0' in graph) return graph   // t4r strips nothing
  return stripAutofill(graph, H3_T4_STRIP)
}
