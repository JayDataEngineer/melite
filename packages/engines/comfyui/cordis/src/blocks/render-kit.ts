// Tier 2 — the render-kit blocks (the compose/co_script/render_kit
// port). One place per multi-node consensus; cards call blocks,
// never raw node chains, so lane facts stay single-sourced.
import { GraphBuilder, OutputHandle } from '../graph.ts'
import type { LaneInputsFacts } from '../facts.ts'

/** The text-encode pair: CLIPLoader + VAELoader from lane rows.
 *  Returns OUTPUT HANDLES (never NodeRefs — a ref in an inputs bag
 *  serializes as a scalar and the wall goes red). */
export function loadTextPair(g: GraphBuilder, li: LaneInputsFacts): { clip: OutputHandle; vae: OutputHandle } {
  const clip = g.node('CLIPLoader', { clip_name: li.text_encoder, type: li.clip_type }).out()
  const vae = g.node('VAELoader', { vae_name: li.vae }).out()
  return { clip, vae }
}

/** The image-lane tail: VAEDecode + SaveImage under the prefix. */
export function decodeSave(g: GraphBuilder, sampled: OutputHandle, vae: OutputHandle, filenamePrefix: string): OutputHandle {
  const decoded = g.node('VAEDecode', { samples: sampled, vae })
  return g.node('SaveImage', { images: decoded.out(), filename_prefix: filenamePrefix })
}

/** The lora chain (empty picks → the bare unet, byte-stable).
 *  Every link returns an OUTPUT HANDLE — a NodeRef left in the
 *  chain serializes as {"id": ...} and the wall goes red (caught
 *  live by image_qwen-img-edit_loras, the first golden to pin a
 *  non-empty chain; empty-pick lanes never reached the bug). */
export function stackLoras(g: GraphBuilder, unet: OutputHandle, picks: Array<{ name: string; strength: number }>): OutputHandle {
  let cur = unet
  for (const p of picks) {
    cur = g.node('LoraLoaderModelOnly', { lora_name: p.name, strength_model: p.strength, model: cur }).out()
  }
  return cur
}
