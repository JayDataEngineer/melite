# character-factory (flow mega-skill)

One photo + one action line: lift → rig → motion. No graph to build,
no card to compose — validate the flow, then drive its three stages
through the queue door and the user runs each press.

## Call shape

```
melite_flow {flow: "character-factory", params: {...}}
```

`add_stage` stages CARDS (`card <id>`), never a flow. To hand the user
an editable bench instead of the one-call door, stage the three cards
the flow composes (`card "img-to-mesh"`, `card "rig"`, `card
"motion"`); each press then runs at the user's Run press.

The compile gate rides the flow's own validate (`melite_construct`
`validate` — verbatim refusals, zero GPU) before any Run press.
Multi-stage drives at start (the curated-lane lift: named registry flows run multi-stage; the refusal is hand-authored inline only)
explicitly, and that refusal is the contract, not a gap.

## Knobs

- `photo` (required) — source photo. One clear subject, tight
  framing; background is removed automatically (birefnet). Bad
  extensions and browser-local refs refuse at the initial gate.
- `prompt` (required) — what the body DOES: verb-first, one
  continuous action per take (kimodo text-to-motion). Empty or
  missing refuses at the door, never on the GPU.

Stage knobs ride per-stage params at drive time (the registry row
is the template): lift `model=pixal3d` (repair ON); rig
`mode=auto`, `preserve_texture=true` (`file_format=fbx` for the
Unity door); motion `model=kimodo`, `preview_glb` wired from the
rigged mesh.

## What runs

One `lift` stage (comfyui): pixal3d photo → textured mesh with the
in-graph repair tail. One `rig` stage: SOMA-77 auto-rig
(BODY_TO_SOMAX's lane, chained — the lift's mesh feeds `mesh_glb`
directly). One `motion` stage: kimodo text→motion NPZ skinned onto
the rigged mesh (somax bake in-graph) — the stage returns the NPZ
AND the animated GLB. The done-stage skip makes re-takes cheap: a
done lift never re-executes when the motion prompt changes.

## MOTION phase (creatures — not a stage)

Kimodo moves SOMA bodies; a creature needs a dataset clip:

1. Pull a motion clip through the game profile's unimate MCPs
   (text→motion on the dataset skeletons — never melite code).
2. Bridge it: rig `copy` with the animated clip mesh as `donor_glb`
   transfers skeleton + weights onto the lift (the donor→copy
   bridge script in the playbook §8 payloads seats the bind).
3. Bake: `RaySomaxBake` skins the clip onto the bound mesh.

## EDITOR phase (Unity — not a stage)

The animated GLB (or the rig `fbx` arm's FBX) imports through the
game profile's Unity MCP. No Unity seats, servers, or proxy nodes
in melite.

## Craft notes (merged skills)

- Lift behavior/limits: `card:img-to-mesh` (pixal3d vs
  trellis2-native family rows; hero vs foundry budgets).
- Rig modes: `card:rig` (auto/copy/species; the copy bridge for
  MOTION-phase donors).
- Motion craft: `card:motion` (multi-segment `|` chaining,
  `motion_npz` continuation, joint constraints).
- One example that compiles:

```json
{
  "flow": "character-factory",
  "photo": "<estate photo ref>",
  "prompt": "a person waves hello"
}
```
