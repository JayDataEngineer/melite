# causes — mesh_trellis2-native_default

2026-09-07: img-to-mesh card golden (trellis_t1 arm), captured from
the PRODUCTION python renderer (`render("trellis_t1", doc, Trellis2Native)`)
with the compose `_step_doc` shape: defaults (seed 42, resolution
1024, steps 12, cfg 7.5, bg_removal auto, the official per-stage
sampler table), prefix the family default "trellis2_native" (the
09-07 sweep dropped the filename_prefix field; the run owns names).

Pins the FIRST TS port of this arm (cards/img-to-mesh.ts). Two
capture facts the port must keep byte-stable:

- comfy-script numbers `<Class>.<index>` in POST-ORDER DFS from the
  output, so the SHAPE guided arm is CFGOverride.0/RescaleCFG.0
  (0.769/0.5) and the STRUCT arm is .1 (0.667/0.7) — the reverse of
  the python source's creation order.
- RemeshMesh rides three pin autofills python leaves in place
  (band 1.0, fix_poles false, project_back 0.0); LoadImage.upload
  and KSampler.control_after_generate are stripped empty autofills.
