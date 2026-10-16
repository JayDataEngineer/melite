# Driving object-forge

You drive one merged run — both stages are card=, so the
`{flow:} object-forge` door submits the whole chain as one run. Your
job:

1. **Validate first**: `melite_construct validate` on a
   `card:object-forge` stage — verbatim refusals, zero GPU. A refusal
   here is the contract, not a setback; read it, fix the params,
   revalidate.
2. **Submit**: `{flow: object-forge, prompt: "<one clear subject>"}`.
   Optional knob: `image_model` (`z-image` default, `krea-2` when the
   concept needs its palette strength).
3. **Judge with eyes**: after the run settles, view the artifacts
   (melite_view on the run id). Check both stages of quality:
   - the concept render — one subject, clean background? A busy scene
     will fuse in the lift; re-take the prompt before blaming the mesh.
   - the lift mesh — does the silhouette read as the object, or did it
     melt?

Never claim the take without viewing. A green gate is not a verdict —
the mesh is.

## Re-takes

Stage-by-stage through the `{model:}` door when only one stage is
wrong: `{model:} img-to-mesh, model=trellis2-native,
