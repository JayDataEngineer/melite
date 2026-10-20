import { GraphBuilder, OutputHandle, type NodeRef } from '../graph.js';
export interface TurnaroundKnobs {
    resolution: number;
    framing: number;
    focal_length: number;
    samples: number;
    transparent: boolean;
}
/** The 8-view render node itself — the consensus the three poser
 *  families share, for a card whose declared output is the ARTIFACT
 *  and whose renderer stays a terminal.
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @returns the render node's ref (its 8 outputs are the view slots) */
export declare function renderGLBViewsNode(g: GraphBuilder, glbPath: OutputHandle, k: TurnaroundKnobs): NodeRef;
/** The turnaround tail: the render node + one SaveImage per view
 *  under the `<prefix>_<view>` convention (creation order IS the
 *  node-id order).
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @param prefix the filename prefix each view saves under
 *  @returns the LAST view's handle — the sheet's terminal output */
export declare function renderGLBViews(g: GraphBuilder, glbPath: OutputHandle, k: TurnaroundKnobs, prefix: string): OutputHandle;
/** Row guard: an inherent amount must be a positive finite number
 *  (zero or negative is nonsense, never a silently clamped render). */
export declare function positive(name: string, v: unknown): number;
//# sourceMappingURL=poser-kit.d.ts.map
