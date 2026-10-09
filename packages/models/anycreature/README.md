---
description: anyCreature family, text-spec creature assembly and skeleton binding for the rig card's species mode.
kind: package-library
---

# @melite/models-anycreature

The anyCreature family — text to game-ready 3D creature (a JSON spec rendered to a skinned GLB) on its own `anycreature` engine lane, genre 3d. The DECL declares no defaults: the dead keys (`smooth_angle`, the build/ao/role block) had no reader and were killed, so every consumer states its knobs explicitly.

The family's action is bind: the anyCreature skeleton bind the rig card uses for its `species` mode. The caller brings both files — the mesh GLB and the creature template GLB; the lane is weightless, since the skeletons ride in the caller's own GLB and nothing downloads. Params: `mesh_glb`, `creature_glb`, `height_ratio` (a fraction of the creature's bind height, 0.05–10), `max_influences` (1–8 nearest segments), `strip_body`. The build composes `RayCreatureRigBridge` and `SaveRiggedModel` from the vendored `melite-poser-nodes` pack and persists the bound mesh as a rigged GLB.

## Declaration

`src/index.ts` declares the DECL and the `family-anycreature` plugin; `src/actions.ts` owns the bind segment and its typed params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The `anycreature` engine lane is not the comfyui engine, so the catalog emission serves the family no row; the declaration registers in the models registry, where the rig card resolves it by route.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **No catalog row** — the `anycreature` engine lane is not the comfyui engine and catalog law serves only comfyui-engine families; the family resolves by route for the rig card, never as a picker row.
- **The caller brings both GLBs** — nothing downloads on the family's account; a missing mesh or creature path refuses at the door.
- **No resource rows** — the DECL carries no provisions or lane_inputs, so there is nothing for provisioning to verify on this family's account.
