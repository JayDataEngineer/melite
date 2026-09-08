---
name: melite-prop-3d
description: Static 3D prop/weapon lane — z-image concept to TRELLIS mesh to turntable review views; seed control, background law, simplify targets.
---

Static (non-creature) 3D assets: weapons, props, tools, containers. Live-proven lane 2026-08-25.

## Lane shape (`flows/scrap_machete/flow.yaml` is the reference)
z-image (concept render) -> trellis (image->mesh) -> render_glb_views (turntable review).
Copy that YAML, swap prompt + seeds. (Lane YAML lives at the repo-root `flows/`, NOT `data/flows/` — that dir was never created.)

## Laws (all learned the hard way)
- `simplify_target: 60000` for props. Do not omit.
- `background_color` in the trellis step MUST match the z-image prompt background (gray on gray).
- Two seeds per attempt (e.g. 23/7) — TRELLIS reconstruction varies; gate before judging.
- Bolder/chunkier prompts survive meshing: "chunky scrap cleaver" > "slim katana". Thin blades fragment.
- Views land at `data/runs/<run_id>/render_glb_views_<run_id>_<view>_mesh.png` — NOTE the `_mesh` suffix; gate with the melite-agent-eyes skill.

## Run door
`curl -s -X POST localhost:33081/v1/flows/start -d '{"yaml":"<name>.yaml"}'`
Poll status; artifacts listed under the run. GLB goes to Unity delivery (FBX via blender headless or glTFast — the
unity-delivery lane lives at
`flows/humanoid-flow/agents/skills/gamekit-unity-delivery/`; the
legacy `docs/asset-flows/delivery-unity.md` path was retired with
the docs/plans consolidation 2026-09-04).
