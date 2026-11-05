---
name: melite-prop-3d
description: Static 3D prop/weapon lane — z-image concept to TRELLIS mesh to GLB; seed control, background law, simplify targets.
---

Static (non-creature) 3D assets: weapons, props, tools, containers.

## Lane shape (live card ids, NOT a YAML to copy)
z-image (concept render) -> trellis/pixal3d (image->mesh) -> quad remesh (prop preset).
There is NO single-shot YAML door and NO named prop-flow registry row: the prop lane is an
AGENT-DRIVEN card chain — drive each stage card through the queue door
(`melite_construct` `add_stage` with `card=` + `model=`, then `melite_flow`). The
card is `img-to-mesh` (model `trellis2-native` or `pixal3d`), and the mesh stage's
output artifact is the GLB — download it and inspect the mesh before judging.

## Laws (all learned the hard way)
- `simplify_target: 60000` for props. Do not omit.
- `background_color` in the trellis step MUST match the z-image prompt background (gray on gray).
- Two seeds per attempt (e.g. 23/7) — TRELLIS reconstruction varies; gate before judging.
- Bolder/chunkier prompts survive meshing: "chunky scrap cleaver" > "slim katana". Thin blades fragment.
- The GLB is the img-to-mesh verb's output — download it and inspect it (silhouette, thickness,
  fragments) before calling the prop done; a render sheet is not part of this lane.

## Run door
Compose with `melite_construct` `add_stage`, `card="img-to-mesh",
model="trellis2-native"` + your prompt params (no curl); the run starts at the user's
Run press, the progress rides the card, artifacts listed under the
run. GLB goes to Unity delivery: the game-factory projects declare
`com.unity.cloud.gltfast`, so a `.glb` imports directly;
FBX is the fallback, not the rule. A melite run id is NOT delivery evidence —
the artifact and the project's own import receipt are.
