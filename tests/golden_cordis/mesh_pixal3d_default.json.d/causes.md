# causes — mesh_pixal3d_default

2026-09-07: img-to-mesh card golden (pixal_t1 arm, cluster P),
captured from the PRODUCTION python renderer
(`render("pixal_t1", doc, Pixal3d)`) with the compose `_step_doc`
shape: defaults + camera_fov "auto" (the MoGe pass), prefix the
family default "pixal3d".

Pins the pixal3d branch of cards/img-to-mesh.ts. Same numbering law
as the trellis golden (post-order DFS: shape arm .0, struct arm .1).
Extra autofills that survive the strip and must stay: ImageCropToMask
background "#000000" / grow_mask 0; MoGeInference apply_mask true /
batch_size 4 / force_projection true / fov_x_degrees 0.0. The MoGe
weight literal (moge_2_vitl_normal_fp16.safetensors) is the
documented one-model exception (LaneInputs is closed).
