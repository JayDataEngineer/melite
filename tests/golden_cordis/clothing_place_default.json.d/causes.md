# causes.md — clothing_place_default golden (2026-09-08)

New card, no drift: the first golden for the `clothing-placement`
card (the Blender MCP card — pure LAW-0: no card.py, no
card-decls.json row). Graph composed model-less
(`requiresModel: false` skips the {model:} demand in cardGate,
service.compose, and the CLI) against the MCP engine-pin fixture
(`fixtures/object_info_mcp.json`, which carries
`MeliteBlenderMCPCall` for the EXTENSION-LAW gate — the repo pin
predates the pack's engine install). Eyeballed: one
MeliteBlenderMCPCall node (macro=place_garment, JSON args envelope
with position [0,0,0.9]) wired into a SaveText provenance tail
(`testrun/placement`). Fixtures `cube.glb`/`sphere.glb` are real
Blender-exported GLBs (headless 3.3.1, 2026-09-08).
