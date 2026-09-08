// Tier 2 — the upscale-tools F-cluster fragments (consumed-only
// arms; the submittable seedvr2_t1 lane lives on the card). Each
// fragment returns the SaveImage node ref; node order mirrors the
// python renderer exactly.
import type { GraphBuilder, OutputHandle } from '../graph.ts'

export interface ResizeFragmentInput {
  image: string
  width?: number
  height?: number
  upscaleMethod?: string
  crop?: string
  scaleBy?: number
  filenamePrefix: string
}

/** basic_resize_t1 — ImageScale to exact W/H. */
export function basicResize(g: GraphBuilder, p: ResizeFragmentInput): OutputHandle {
  const img = g.node('LoadImage', { image: p.image }).out()
  const scaled = g.node('ImageScale', {
    image: img,
    upscale_method: p.upscaleMethod ?? 'lanczos',
    width: p.width ?? 1024,
    height: p.height ?? 1024,
    crop: p.crop ?? 'disabled',
  }).out()
  return g.node('SaveImage', { images: scaled, filename_prefix: p.filenamePrefix }).out()
}

/** pixel_upscale_t1 — ImageScaleBy multiplier. */
export function pixelUpscale(g: GraphBuilder, p: ResizeFragmentInput): OutputHandle {
  const img = g.node('LoadImage', { image: p.image }).out()
  const scaled = g.node('ImageScaleBy', {
    image: img,
    upscale_method: p.upscaleMethod ?? 'nearest-exact',
    scale_by: p.scaleBy ?? 2.0,
  }).out()
  return g.node('SaveImage', { images: scaled, filename_prefix: p.filenamePrefix }).out()
}

/** rtx_vsr_t1 — RTX Video Super Resolution (quality rail only; the
 *  dynamic resize_type combo stays at the node default — the
 *  offline pin cannot enumerate it). */
export function rtxVsr(g: GraphBuilder, p: ResizeFragmentInput): OutputHandle {
  const img = g.node('LoadImage', { image: p.image }).out()
  const up = g.node('RTXVideoSuperResolution', { images: img, quality: p.upscaleMethod ?? 'ULTRA' }).out()
  return g.node('SaveImage', { images: up, filename_prefix: p.filenamePrefix }).out()
}

export interface ConcatFragmentInput {
  imageA: string
  imageB: string
  direction?: string
  matchImageSize?: boolean
  filenamePrefix: string
}

/** concat_t1 — ImageConcatMulti side-by-side A/B compare rail. */
export function concatImages(g: GraphBuilder, p: ConcatFragmentInput): OutputHandle {
  const aImg = g.node('LoadImage', { image: p.imageA }).out()
  const bImg = g.node('LoadImage', { image: p.imageB }).out()
  const joined = g.node('ImageConcatMulti', {
    inputcount: 2,
    image_1: aImg,
    image_2: bImg,
    direction: p.direction ?? 'right',
    match_image_size: p.matchImageSize ?? false,
  }).out()
  return g.node('SaveImage', { images: joined, filename_prefix: p.filenamePrefix }).out()
}

/** input_t1 — restage an external file into the run output (no
 *  transform; the input-prep artifact lane). */
export function restageInput(g: GraphBuilder, image: string, filenamePrefix: string): OutputHandle {
  const img = g.node('LoadImage', { image }).out()
  return g.node('SaveImage', { images: img, filename_prefix: filenamePrefix }).out()
}
