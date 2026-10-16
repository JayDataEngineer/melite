---
name: melite-prop-3d
description: Static 3D prop/weapon lane — z-image concept to TRELLIS mesh to turntable review views; seed control, background law, simplify targets.
---

Static (non-creature) 3D assets: weapons, props, tools, containers. Live-proven lane 2026-08-25.

## Lane shape (live card ids, NOT a YAML to copy)
z-image (concept render) -> trellis/pixal3d (image->mesh) -> quad remesh (prop preset) -> render_glb_views (turntable review).
There is NO single-shot YAML door and NO named prop-flow registry row: the prop lane is an
AGENT-DRIVEN card chain — drive each stage card through the queue door
(`melite_construct` `add_stage` with `card=` + `model=`, then `melite_flow`). The
card is `img-to-mesh` (model `trellis2-native` or `pixal3d`).
(2026-10-04: the prop-flow authoring leaf is GONE — it was never an
executable row and this skill is the only served statement of the lane.)
The old scrap-machete flow YAML this section used to name does not exist
in this checkout, and an agent that followed it burned a read chasing a file
that was never there (the 3D lane's first live commission, 2026-09-26).

## Laws (all learned the hard way)
- `simplify_target: 60000` for props. Do not omit.
- `background_color` in the trellis step MUST match the z-image prompt background (gray on gray).
- Two seeds per attempt (e.g. 23/7) — TRELLIS reconstruction varies; gate before judging.
- Bolder/chunkier prompts survive meshing: "chunky scrap cleaver" > "slim katana". Thin blades fragment.
- Views land at `data/runs/<run_id>/render_glb_views_<run_id>_<view>_mesh.png` — NOTE the `_mesh` suffix; gate with the melite-agent-eyes skill.

## Run door
Compose with `melite_construct` `add_stage`, `card="img-to-mesh",
model="trellis2-native"` + your prompt/views params (no curl); the run starts at the user's
Run press, the progress rides the card, artifacts listed under the
run. GLB goes to Unity delivery: the game-factory projects declare
`com.unity.cloud.gltfast`, so a `.glb` imports directly (measured 2026-10-04);
FBX is the fallback, not the rule. A melite run id is NOT delivery evidence —
the artifact and the project's own import receipt are.
