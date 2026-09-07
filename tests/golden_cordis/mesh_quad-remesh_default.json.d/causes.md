# causes — mesh_quad-remesh_default

2026-09-07: quad-remesh card golden (autoremesher lane, cpp→node
cutover), captured from the Cordis TS door
(`cli.ts compose --card quad-remesh --model autoremesher`).
Only the required `input` path is passed — the six numeric wire
values ride the schema defaults verbatim (target_quads 50000,
edge_scaling/sharp_edge/adaptivity/anisotropy per the py card
Sliders), preset is the compose literal "" (no budget class —
explicit knobs rule), filename_prefix is the compose-stamped
`<runId>/remeshed`. Single node, the pack node
(melite-autoremesher-nodes: AutoRemesher).

Pins cards/quad-remesh.ts: the input-required refusal, the
smooth_normal!=0.0 refusal (the node hardcodes --smooth-normal 0.0,
nodes.py), and the one-node wire shape.
