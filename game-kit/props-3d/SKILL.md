---
name: gamekit-props-3d
description: Static prop/weapon/statue lane - z-image concept to TRELLIS mesh to turntable review; includes the path-a bridge pairing example.
---

Templates in this folder: scrap_machete.yaml (weapon),
stone_wolf_statue_v2.yaml (statue), wolf_statue_bridge_v2.yaml (bridge pair).

## Laws
- simplify_target: 60000. background_color MUST match the z-image prompt
  background. Two seeds per attempt; gate before judging.
- BOLD shapes survive meshing: "chunky scrap cleaver" > "slim katana";
  level quadruped stance > upright howl (v1 statue read humanoid).
- Views: data/runs/<run_id>/render_glb_views_<run_id>_<view>_mesh.png
  (8 views exist; front/left/back are canonical for gating).

## Bridge pairing (path a)
To give a static mesh a skeleton + animations: see wolf_statue_bridge_v2.yaml
(creature_path = anyCreature GLB, mesh_path = TRELLIS GLB). The bridge node
is live: /object_info/RayCreatureRigBridge.

Params law (proven 2026-08-25, wolf_statue_bridged_v4): weight_falloff
inv_power + weight_power 3.0 + weight_window smoothstep + yaw_align true.
yaw_align rotates the mesh spine onto the rig forward axis (TRELLIS meshes
are long-axis-X; rigs are spine-Z — without it the statue binds ~90deg
yawed and locomotion plays sideways). Dominance 0.8605 / dual_bound 0.168
with alignment vs 0.8022/0.268 without.

## Run + gate
Standard start door; then vision-gate per vision-gate/SKILL.md.

## Deliver
GLB + FBX into data/delivery/unity/<category>/<name>/ (FBX via the container
blender pattern in docs/asset-pipelines/delivery-unity.md), manifest rows.