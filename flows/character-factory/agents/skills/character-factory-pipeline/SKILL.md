# character-factory (flow mega-skill)

One body GLB path + one action line: rig → motion. No graph to
build, no card to compose — validate the flow, then drive its two
stages through the queue door and the user runs each press.

## Call shape

```
melite_flow {flow: "character-factory", params: {...}}
```

`add_stage` stages CARDS (`card <id>`), never a flow. To hand the user
an editable bench instead of the one-call door, stage the two cards
the flow composes (`card "rig"`, `card "motion"`); each press then
runs at the user's Run press.

The compile gate rides the flow's own validate (`melite_construct`
`validate` — verbatim refusals, zero GPU) before any Run press.
Multi-stage drives at start (the curated-lane lift: named registry
flows run multi-stage; the refusal is hand-authored inline only)
explicitly, and that refusal is the contract, not a gap.

## Knobs

- `mesh` (required) — the body to rig, a GLB path: an anny bake, a
  TRELLIS/img-to-mesh lift artifact, an estimator body, any bare
  human mesh. Bad extensions and browser-local refs refuse at the
  initial gate.
- `prompt` (required) — what the body DOES: verb-first, one
  continuous action per take (kimodo text-to-motion). Empty or
  missing refuses at the door, never on the GPU.

Stage knobs ride per-stage params at drive time (the registry row
is the template): rig `mode=auto`, `preserve_texture=true` (the
historic `file_format=fbx` arm is gone with the blender lane — GLB
is the only rig output); motion `model=kimodo`, `preview_glb`
wired from the rigged mesh in-graph.

## What runs

One `rig` stage: SOMA-77 auto-rig on the supplied body
(BODY_TO_SOMAX's lane — the `mesh` initial substitutes as the path
value). One `motion` stage: kimodo text→motion NPZ skinned onto the
rigged mesh (somax bake in-graph; the rigged-path link is
STRING→STRING) — the stage returns the NPZ AND the animated GLB.
The done-stage skip makes re-takes cheap: a done rig never
re-executes when the motion prompt changes.

## The lift leg (upstream — not a stage)

The photo→mesh lift rides its own press: the img-to-mesh card door
or the object-forge row. The lift's served producer
(Save3DAdvanced) is a terminal FILE_3D save — no served node
consumes FILE_3D, so no in-graph hop can carry it — and the
artifact path feeds this row's `mesh` initial (the run-chain).

## MOTION phase (creatures — not a stage)

Kimodo moves SOMA bodies; a creature needs a dataset clip:

1. Pull a motion clip through the game profile's unimate MCPs
   (text→motion on the dataset skeletons — never melite code).
2. Bridge it: rig `copy` with the animated clip mesh as `donor_glb`
   transfers skeleton + weights onto the body (the donor→copy
   bridge script in the playbook §8 payloads seats the bind).
3. Bake: `RaySomaxBake` skins the clip onto the bound mesh.

## EDITOR phase (Unity — not a stage)

The animated GLB imports through the game profile's Unity MCP.
(The rig `fbx` arm is gone with the blender lane.) No Unity seats,
servers, or proxy nodes in melite.

## Craft notes (merged skills)

- Lift behavior/limits: `card:img-to-mesh` (pixal3d vs
  trellis2-native family rows; hero vs foundry budgets) — the
  upstream press that produces this row's body.
- Rig modes: card "rig" (auto/copy/species; the copy bridge for
  MOTION-phase donors).
- Motion craft: `card:motion` (multi-segment `|` chaining,
  `motion_npz` continuation, joint constraints).
- One example that compiles:

```json
{
  "flow": "character-factory",
  "mesh": "<estate body glb ref>",
  "prompt": "a person waves hello"
}
```
