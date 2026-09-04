---
name: gamekit-race-forge
description: ONE-SHOT novel humanoid race assembly - request to delivered, rigged, morphable, textured Unity asset in a single autonomous run (base + spec morphs + TRELLIS attachments + gates + delivery).
---

# race-forge — one-shot novel race assembly

Input: a natural-language race request (e.g. "crane-folk: tall, long neck,
thin limbs, feather crest"). Output: delivered GLB+FBX in
data/delivery/unity/humanoids/<race_name>/ with morph targets, socketed
attachments, green gates, manifest row. You do ALL steps autonomously;
ask nothing.

## Hard facts (read once)

- Base mesh: data/delivery/unity/humanoids/base_human_textured/base_human_textured.glb
  (FULL-PBR, 93 mixamorig joints, UVs, 240k verts). Reuse it — do NOT regen
  a base unless the request demands a different BODY PROPORTION SO radical
  that morphs cannot express it.
- Morphs are SPEC-DRIVEN (scripts/delivery/add_race_morphs_spec.py): one key
  per morph name Unity will tween; ops compose:
  limb_extend, h_scale, bone_push.
  Verify EVERY output: check_morph_targets.py must PASS with sane spans
  (0.01-0.08 typical; >0.15 = suspicious, re-check spec).
- Attachments: z-image concept -> TRELLIS mesh (trellis_native pipeline).
  Socket with scripts/delivery/socket_to_bone.py
  (uniform 1.0 weight on ONE bone; Head for crest/ears/horns).
  Verify: check_socket.py <glb> <bone>.
- Order is LAW: base -> morphs -> attachments -> normal pass (optional) ->
  pivot -> FBX.
- Container discipline: docker cp in, run blender --background --python,
  docker cp out. NEVER rewrite a docker-cp'd file in place (overlayfs
  EACCES) — cp to a fresh name inside the container first.
- Gateway: http://127.0.0.1:18090; start via POST /v1/pipelines/start,
  poll /v1/pipelines/status/<run_id>.

## The one-shot recipe

1. DESIGN (30s, no tools): decompose the request into (a) silhouette ops
   per morph key, (b) attachment list (0-3 items).
2. BASE: copy base_human_textured.glb to data/runs/race_<name>/base.glb.
3. MORPHS: write the spec JSON, run add_race_morphs_spec.py
   in the container, check_morph_targets.py on the product.
4. ATTACHMENTS (per item): concept via z-image (seed family 700+),
   TRELLIS via trellis_native pipeline, eyes-gate the turntable,
   socket_to_bone.py onto the bone.
5. ASSEMBLE: morphed base + socketed attachments in one GLB.
6. GATES: check_morph_targets + check_socket + check_materials.
7. PIVOT + FBX: blender_fix_pivots.py then export_fbx_from_glb.py.
8. DELIVER: data/delivery/unity/humanoids/<race_name>/ (GLB + FBX),
   manifest row via manifest_add.py.

## Report format

Per step: claim + raw command + verbatim output (trimmed). End with a
verdict table (morph spans / socket bone / materials verdict / pivot / FBX
bytes) and the delivered path.
