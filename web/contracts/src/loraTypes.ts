/** Canonical LoRA entry primitive — single wire format across every surface.
 *
 *  Used by:
 *    - LoraPicker component (video + image + inspector surfaces)
 *    - Segment params (timeline.ts::SegmentParams.loras)
 *    - GenerateFormBody (image form values)
 *    - Backend dispatch (ComfyUI image + video both accept this shape via
 *      media/image/comfyui.py and parse_loras_selected in
 *      media/inference/loras.py).
 *
 *  History: the video flow previously used a comma-separated string
 *  ("name:0.7, name2") while the image flow used
 *  {name, strength_model, strength_clip} dicts. With the video backend
 *  migrated to ComfyUI, both surfaces share one backend — and now share
 *  one frontend primitive. The image flow's strength_model/strength_clip
 *  split is a ComfyUI-internal concern; the frontend exposes a single
 *  `strength` and the dispatch layer duplicates it at the boundary.
 *
 *  No parsing in the frontend. No string encoding. This type IS the wire
 *  format — emit it directly, consume it verbatim.
 */
export interface LoRAEntry {
  name: string
  strength: number
}
