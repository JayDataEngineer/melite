---
name: gamekit-races
description: race assembly lane — base humanoid + blendshape morphs + TRELLIS attachments socketed to bones
---

# races — assemble a playable race from a rigged humanoid

Deploy: `bash ../../sync.sh` (copies both YAML lanes into data/pipelines).

## The three pieces

1. **Base humanoid** — a rigged GLB on the Mixamo/SOMAX skeleton
   (mixamorig:Hips/Spine/Head/LeftForeArm/...). Today's shipped base:
   `data/delivery/unity/humanoids/base_human/` (keeper v2, source run
   pmt7vpqda2hylck). A FRESH base costs tens of minutes: run
   `race_base_body.yaml` (body-only trim of character_cards.yaml).
   Rig-quality warning: SOMAX weights currently FAIL the verify harness
   floors (ADR W23) — the rig drives fine for tween/preview use; do not
   ship hero close-ups without re-gating.
   TEXTURED base (2026-08-25, GREEN): `data/pipelines/base_human_texture.yaml` —
   step1x_texture identity-locked bake onto the keeper mesh
   (mesh_artifact + reference_artifact = the SAME concept front crop,
   texture_size 2048). Delivered: base_human_textured/ (GLB+FBX) +
   base_human_race_textured + race_cat_demo_textured — all FULL-PBR via
   check_materials.py, morphs/socket re-verified. Texture FIRST, then
   morphs/socket (they survive the bake; order matters only for the pivot
   pass).
2. **Race morphs** — blendshapes authored in container Blender by
   `scripts/delivery/add_race_morphs.py`:
   - `race_cat`: forearms + shins lengthened along their BONE axes
     (smoothstep ramp 0 at elbow/knee -> rigid distal chain — joints can
     never tear) + slight jaw narrowing.
   - `race_bulk`: uniform 1.05 horizontal scale about the vertical axis.
   - **Morph formula:** `V = V_base + w * dV` — a shape key stores only the
     delta dV; w is the 0-1 weight you tween.
   - Verify any GLB: `.venv/bin/python scripts/delivery/check_morph_targets.py <file.glb>`
3. **Attachments** — TRELLIS static props (cat ears, horns, crests) bound to
   ONE bone. Lane: `cat_ears.yaml`. Gate with agent eyes (all turntable views
   must agree on one subject noun).

## The socket law (non-negotiable)

An attachment is bound by `scripts/delivery/socket_to_bone.py`:
ONE vertex group named exactly after the target bone (`mixamorig:Head`),
EVERY vertex at weight 1.0, armature modifier pointing at the character's
armature. Uniform binding = nothing interpolates = seam-tear / F1-class
defects structurally impossible. NEVER transfer_rig a rigid attachment onto
the body skin. Verify:
`.venv/bin/python scripts/delivery/check_socket.py <demo.glb> mixamorig:Head`.

## DOTween blendshape driver recipe (Unity)

```csharp
int i = face.sharedMesh.GetBlendShapeIndex("race_cat"); // index, not name
DOTween.To(() => face.GetBlendShapeWeight(i),            // PERCENTS 0-100
           w => face.SetBlendShapeWeight(i, w),
           100f, 1.2f).SetEase(Ease.InOutSine);
```
Shipped driver: `Unity/BlendShapeTweenDriver.cs` (also in
`data/delivery/unity/Scripts/`, next to HumanoidTweenDriver.cs which drives
plain bone transforms the same zero-clip way).

## Run doors

```bash
curl -s -X POST localhost:33081/v1/pipelines/yaml/validate -d '{"yaml":"cat_ears.yaml"}'
curl -s -X POST localhost:33081/v1/pipelines/start -d '{"yaml":"cat_ears.yaml"}'
curl -s localhost:33081/v1/pipelines/status/<run_id>
```

## Assembly (container blender)

```bash
docker cp <base>.glb tech-noir-inference-comfyui-1:/tmp/race_work/
docker cp scripts/delivery/socket_to_bone.py tech-noir-inference-comfyui-1:/tmp/race_work/
docker exec tech-noir-inference-comfyui-1 blender --background --python /tmp/race_work/socket_to_bone.py
# reads /tmp/socket_items.json {armature_glb, prop_glb, out_glb, bone, ...}
docker cp tech-noir-inference-comfyui-1:/tmp/race_work/<out>.glb data/delivery/unity/humanoids/
```
FBX delivery: same container, `scripts/delivery/blender_glb_to_fbx.py`
(add_leaf_bones=False, bake_space_transform=True). Pivot law:
`scripts/delivery/blender_fix_pivots.py` first (skinned meshes: JSON audits
lie in bind space). Manifest rows: `scripts/delivery/manifest_add.py`.
