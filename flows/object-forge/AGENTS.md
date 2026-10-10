# object-forge

Prompt → concept render → textured mesh → game quad mesh, estate-native.
THREE card stages on the `comfyui` card plane (concept → lift → remesh);
the registry row (`flowsRegistryRows.ts` OBJECT_FORGE) is the TEMPLATE,
this leaf is the agent face.

- **All three stages are card=, so the flow RUNS**: the `{flow:}` door
  submits one merged run (image-upscale's 2026-10-04 shape — card
  stages compose through the card plane in-graph). No
  validate-only stamp, no stage-by-stage presses needed. Stage-by-stage
  driving through the `{model:}` door or the bench stays available for
  surgical re-takes (a done stage never re-executes on re-run).
- **Two meshes leave the flow.** `mesh` is the lift's textured tri
  mesh (trellis2-native, repair tail at the card's defaults).
  `quad_mesh` is the remesher's quad topology — the AutoRemesher keeps
  textures OUT (known limitation, `packages/3d/quad-remesh/README.md`);
  re-bake is downstream work. Ship `quad_mesh` for engine topology, and
  `mesh` alongside it when the PBR set matters.
- **One subject per prompt.** A busy concept scene lifts into a
  fused blob; "a wooden stool, plain background" beats "a kitchen".
- **Creatures/people ride character-factory instead** (lift pixal3d →
  rig → motion). This flow makes OBJECTS and props — no rig, no
  motion.

Agent brief: `agents/AGENT.md`. Stage skill:
`agents/skills/object-forge-pipeline/SKILL.md`.
