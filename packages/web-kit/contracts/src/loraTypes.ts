/** Canonical LoRA entry primitive — single wire format across every surface.
 *
 *  Used by:
 *    - LoraPicker component (video + image + inspector surfaces)
 *    - Segment params (timeline.ts::SegmentParams.loras)
 *    - GenerateFormBody (image form values)
 *    - Backend dispatch (ComfyUI image + video both accept this shape; the TS parse seat is normalizeLoraEntry in ./modifierSubcards.ts).
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
  /** The adapter's CATALOG id (form-spec modifiers.lora options .value —
   *  the same key compose resolves against the model's loras rows). The
   *  pre-2026-09-06 `name` key was a wire drift: the editor emitted it,
   *  compose read `id` — every editor-authored lora died at compile with
   *  "lora '' is not in the catalog". ONE key, the catalog's own. */
  id: string
  strength: number
  /** The distill's married step count — an override of the catalog
   *  row's own `steps`. The service's step-claiming distinction
   *  (comfyui-cordis service.ts, 007 L2) reads exactly this key:
   *  ONLY a row that declares steps may claim a non-catalog count.
   *  Absent = the catalog row's steps (or the family default). A
   *  declared service read with no type seat is a wire lie — the
   *  h3 studio's hydrate dropped the key silently (R2, 2026-10-27). */
  steps?: number
}
