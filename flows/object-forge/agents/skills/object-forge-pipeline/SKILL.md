# object-forge (flow mega-skill)

One prompt line: concept → lift → remesh. No graph to build, no card
to compose — validate the flow, then submit it as ONE merged run (all
three stages are card=; the `{flow:}` door composes them in-graph,
image-upscale's shape).

## Call shape

```
melite_construct add_stage  card "object-forge" — validate, then the
{flow:} door submits the merged run; the stages also drive
individually (image-gen + img-to-mesh + quad-remesh) through the
{model:} door for surgical re-takes.
```

The compile gate rides the flow's own validate (`melite_construct`
`validate` — verbatim refusals, zero GPU) before any submit.

## Knobs

- `prompt` (required) — the object: one clear subject, plain
  background. Empty or missing refuses at the door, never on the GPU.
- `target_quads` — the remesh budget (0-200000, default 50000).
- `image_model` — `z-image` (default) or `krea-2`.

Stage knobs ride per-stage params in the registry row: lift
`model=trellis2-native` (no pack; repair tail at card defaults —
`remesh_qef`/`drop_inverted`/`drop_enclosed`/`fix_poles`), remesh
`target_quads=50000`, `sharp_edge=90`.

## What runs

One `concept` stage (image-gen): the prompt renders as a single-subject
concept. One `lift` stage (img-to-mesh trellis2-native): the concept
lifts to a textured tri mesh, repair tail in-graph. One `remesh` stage
(quad-remesh): the lift remeshes to quad topology at the budget.
Output channels: `mesh` (textured tri) and `quad_mesh` (topology-only
— the AutoRemesher keeps textures out; re-bake downstream).

## Alternative lift family

`trellis2-native` is the default (general objects). `pixal3d` is the
single-object photo specialist (needs the ComfyUI-MoGe pack) — point
the lift stage's `model` at it when the input is a real photo instead
of a generated concept.

## EDITOR phase (Unity — not a stage)

Either mesh imports through the game profile's Unity MCP (GLB is the
card's native out). No Unity seats, servers, or proxy nodes in melite.

## Craft notes

- Concept craft: `card:image-gen` (z-image vs krea-2 palette
  strength; seed determinism).
- Lift behavior/limits: `card:img-to-mesh` (trellis2-native vs
  pixal3d family rows; hero vs foundry budgets).
- Remesh craft: `card:quad-remesh` (the textures-out limitation;
  target_quads budget law; sharp_edge 90 keeps bevels hard).
- One example that compiles:

```json
{
  "flow": "object-forge",
  "prompt": "a weathered wooden stool, plain background"
}
```
