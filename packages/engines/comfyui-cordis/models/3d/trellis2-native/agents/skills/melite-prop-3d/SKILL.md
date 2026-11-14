---
name: melite-prop-3d
description: Static 3D prop/weapon lane — z-image concept to TRELLIS mesh to GLB; seed control, real simplify knobs, the named object-forge row.
---

Static (non-creature) 3D assets: weapons, props, tools, containers.

## Lane shape (live card ids, NOT a YAML to copy)
z-image (concept render) -> img-to-mesh (image->mesh, the GLB's own verb).
The quad-remesh lane is DEAD — the chain ENDS at img-to-mesh. The
named row `object-forge` IS the prop flow (concept + lift stages with
`remesh_resolution`/`decimate_faces` params) — drive it through
`melite_flow {flow: "object-forge"}`; the per-stage card chain
(`melite_construct` `add_stage` with `card=`, then the user's Run press)
is the fallback for hand-tuned stages. The card is `img-to-mesh`
(model `trellis2-native` or `pixal3d`), and the mesh stage's
output artifact is the GLB — download it and inspect the mesh before judging.

## Laws (all learned the hard way)
- Real simplify knobs: `decimate_faces` (calibration 700000, band
  10000–2000000) and `remesh_resolution` (128–2048). `simplify_target`
  exists nowhere — never state it.
- No background seat exists on the mesh stage — bake the plain
  background into the z-image CONCEPT prompt (gray-on-gray survives
  reconstruction); there is no knob to match.
- Two seeds per attempt (e.g. 23/7) — TRELLIS reconstruction varies; gate before judging.
- Bolder/chunkier prompts survive meshing: "chunky scrap cleaver" > "slim katana". Thin blades fragment.
- The GLB is the img-to-mesh verb's output — download it and inspect it (silhouette, thickness,
  fragments) before calling the prop done; a render sheet is not part of this lane.

## Run door
Compose with `melite_construct` `add_stage`, `card="img-to-mesh",
model="trellis2-native"` + your prompt params (no curl); the run starts at the user's
Run press, the progress rides the card, artifacts listed under the
run. GLB goes to Unity delivery: the game-factory projects declare
`com.unity.cloud.gltfast`, so a `.glb` imports directly.
FBX is the fallback, not the rule. A melite run id is NOT delivery evidence —
the artifact and the project's own import receipt are.
