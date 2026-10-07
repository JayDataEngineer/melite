// Tier 2 — the melite-poser-nodes blocks (the 3D card consensus,
// anny/fit/skin). One place per multi-node consensus: the 8-view
// turnaround tail every poser card ends with, plus the row guard
// the schemas pin (positive amounts). Cards call blocks, never raw
// node chains, so the turnaround shape stays single-sourced.
import { GraphBuilder, OutputHandle, type NodeRef } from '../graph.ts'

/** The 8 named view slots (front..front_left), slot order IS the
 *  RayRenderGLBViews output order — the studio composes the sheet
 *  client-side. */
const VIEW_NAMES: readonly string[] = ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left']

export interface TurnaroundKnobs {
  resolution: number
  framing: number
  focal_length: number
  samples: number
  transparent: boolean
}

/** The 8-view render node itself — the consensus the three poser
 *  families share, for a card whose declared output is the ARTIFACT
 *  and whose renderer stays a terminal.
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @returns the render node's ref (its 8 outputs are the view slots) */
export function renderGLBViewsNode(g: GraphBuilder, glbPath: OutputHandle, k: TurnaroundKnobs): NodeRef {
  return g.node('RayRenderGLBViews', {
    glb_path: glbPath,
    resolution: k.resolution,
    framing: k.framing,
    focal_length: k.focal_length,
    samples: k.samples,
    transparent: k.transparent,
  })
}

/** The turnaround tail: the render node + one SaveImage per view
 *  under the `<prefix>_<view>` convention (creation order IS the
 *  node-id order).
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @param prefix the filename prefix each view saves under
 *  @returns the LAST view's handle — the sheet's terminal output */
export function renderGLBViews(g: GraphBuilder, glbPath: OutputHandle, k: TurnaroundKnobs, prefix: string): OutputHandle {
  const views = renderGLBViewsNode(g, glbPath, k)
  let last: OutputHandle = views.out(0)
  for (const [i, view] of VIEW_NAMES.entries()) {
    last = g.node('SaveImage', { images: views.out(i), filename_prefix: `${prefix}_${view}` }).out(0)
  }
  return last
}

/** Row guard: an inherent amount must be a positive finite number
 *  (zero or negative is nonsense, never a silently clamped render). */
export function positive(name: string, v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new Error(`${name} = ${show(v)}: a positive number is required (never silently clamped)`)
  }
  return v
}

function show(v: unknown): string {
  const s = JSON.stringify(v)
  return s === undefined ? String(v) : s
}
