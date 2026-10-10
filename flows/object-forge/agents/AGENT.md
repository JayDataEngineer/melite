# Driving object-forge

You drive one merged run — all three stages are card=, so the
`{flow:} object-forge` door submits the whole chain as one run. Your
job:

1. **Validate first**: `melite_construct validate` on a
   `card:object-forge` stage — verbatim refusals, zero GPU. A refusal
   here is the contract, not a setback; read it, fix the params,
   revalidate.
2. **Submit**: `{flow: object-forge, prompt: "<one clear subject>"}`.
   Optional knobs: `target_quads` (default 50000; 20-30k for hero
   density, 100k+ for detail props), `image_model` (`z-image` default,
   `krea-2` when the concept needs its palette strength).
3. **Judge with eyes**: after the run settles, view the artifacts
   (melite_view on the run id). Check BOTH stages of quality:
   - the concept render — one subject, clean background? A busy scene
     will fuse in the lift; re-take the prompt before blaming the mesh.
   - the lift mesh — does the silhouette read as the object, or did it
     melt?
   - the quad mesh — expect topology-only (the remesher keeps textures
     OUT); judge its wireframe regularity, never its color.

Never claim the take without viewing. A green gate is not a verdict —
the mesh is.

## Re-takes

Stage-by-stage through the `{model:}` door when only one stage is
wrong: `{model:} img-to-mesh, model=trellis2-native,
input_image=<concept render>` re-runs just the lift against a new
concept; the flow's done-stage skip makes full re-runs cheap anyway.
The remesh stage is deterministic — same lift, same quad mesh — so
never re-roll it hoping for variety.
