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
  that morphs cannot express it (then: game-kit/races/race_base_body.yaml ->
  base_human_texture.yaml, tens of minutes, say so in the report).
- Morphs are SPEC-DRIVEN (scripts/delivery/add_race_morphs_spec.py): one key
  per morph name Unity will tween; ops compose:
  limb_extend (ANY bone pair: Neck stretch = Spine2->Neck->Head chains,
  digitigrade = Leg->Foot, long arms = Arm->ForeArm), h_scale (widen/narrow
  about bone:mixamorig:Spine1), bone_push (hunch/brow along world dir).
  Verify EVERY output: check_morph_targets.py must PASS with sane spans
  (0.01-0.08 typical; >0.15 = suspicious, re-check spec).
- Attachments: game-kit/races/cat_ears.yaml is the template (z-image concept
  -> TRELLIS mesh). Socket with scripts/delivery/socket_to_bone.py
  (uniform 1.0 weight on ONE bone; Head for crest/ears/horns — the tool
  prints the bone it used). Verify: check_socket.py <glb> <bone>.
- Order is LAW: base -> morphs -> attachments -> normal pass (optional) ->
  pivot -> FBX. (Textures already on base; morphs ride shape keys; sockets
  parent new meshes.)
- Container discipline: docker cp in, run blender --background --python,
  docker cp out. NEVER rewrite a docker-cp'd file in place (overlayfs
  EACCES) — cp to a fresh name inside the container first.
- Gateway doors: POST localhost:33081/v1/pipelines/start {"yaml":"name.yaml"}
  or flat {"model":"z-image",...}; poll /v1/pipelines/status/<run_id>.

## The one-shot recipe

1. DESIGN (30s, no tools): decompose the request into (a) silhouette ops
   per morph key (1-3 keys, each meaningfully tweenable in Unity),
   (b) attachment list (0-3 items, each = TRELLIS-able prop + socket bone).
2. BASE: copy base_human_textured.glb to data/runs/race_<name>/base.glb.
3. MORPHS: write the spec JSON (ops per design), run add_race_morphs_spec.py
   in the container, check_morph_targets.py on the product. Red/yellow?
   Fix the spec (fractions, radii) and re-run — max 2 iterations, then
   honest-report.
4. ATTACHMENTS (per item): concept via z-image flat door (seed family 700+,
   "<object> only, plain gray background, flat even lighting, single object
   centered" + negative "text, watermark, multiple objects, busy background"),
   TRELLIS via a copied cat_ears.yaml lane (validate -> start -> poll),
   eyes-gate the turntable (gamekit-vision-gate law: neutral reads, views
   agree on one subject noun), socket_to_bone.py onto the bone.
5. ASSEMBLE: morphed base + socketed attachments in one GLB (socket_to_bone
   writes into the base file — order: morphs first, then sockets).
6. GATES: check_morph_targets + check_socket + check_materials (expect
   FULL-PBR-non or better; +N if you ran scripts/delivery/add_normal_map.py).
   Optional but recommended for hero races: add_normal_map.py (per-material).
7. PIVOT + FBX: blender_fix_pivots.py (Blender-eval law) then
   export_fbx_from_glb.py pattern (add_leaf_bones=False,
   bake_space_transform=True) — both container-side, fresh-name copies.
8. DELIVER: data/delivery/unity/humanoids/<race_name>/ (GLB + FBX),
   manifest row via manifest_add.py with the honest verdict + which gates
   passed. Append one section to docs/asset-pipelines/GAME-KIT-PROGRESS.md.

## Report format (§0)

Per step: claim + raw command + verbatim output (trimmed). End with a
verdict table (morph spans / socket bone / materials verdict / pivot / FBX
bytes) and the delivered path. If ANY gate is yellow/red, say it first.
