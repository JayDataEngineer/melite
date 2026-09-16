# Skin unwrap (Blender MCP)

Give a body mesh real UVs and skin detail — in Blender, where this
work lives. The retired 3d-skin card could NOT do this: it refused
any mesh without existing UVs and muted its own normal map to zero;
this skill replaces it.

**Reader**: you are a spawned agent stage holding the
`mcp__blender__*` tools (the stage's `mcps` allow-list). This body
is inlined into your brief at spawn — the spawn shape is
`{"engine":"agent","params":{"task":"unwrap and skin this body
GLB","mcps":["blender"],"skills":["model:blender:skin-unwrap"]}}`.
Every Blender call rides those tools; never shell out.

## When

A body/character GLB needs UVs (or better UVs) and a skin texture
before export. Signs you are here: `TEXCOORD_0` missing, stretched
or mottled skin, "non-somax UVs" refusals, a normal map that does
nothing.

## Procedure

1. **Load the body** into the persistent session and clear the
   scene of anything stale first.
2. **Inspect what exists**: mesh primitives, existing UV layers,
   materials. Never assume — read the mesh's uv layers by name.
3. **Mark seams** where the topology wants them (or accept the
   operator's seam set if given). For organic bodies: neck,
   shoulders, inner limbs, spine midline.
4. **Unwrap** (Smart UV Project for speed on dense meshes; classic
   Unwrap for quality when seams are set). Target margin so islands
   do not bleed; resolution class from the task (512/1k/2k).
5. **Check the unwrap**: island count, overlap warnings, stretched
   faces. Fix seams and re-unwrap — do not ship a first-pass
   unwrap you have not looked at.
6. **Skin detail**: either paint/bake in-session (the session owns
   textures) or leave the UVs clean for the engine's own skin
   shader — follow the task's ask. When the downstream is Unity,
   prefer clean UVs + engine-side tinting over baked noise the
   engine will mute anyway.
7. **Export the GLB** and verify the unwrap survived: TEXCOORD_0 on
   every primitive, UV islands present, no zero-area islands.

## Laws

- One persistent session — no per-step reboot; state is the point.
- Every capture/render lands under the run dir.
- Never claim the unwrap is good without checking islands (render
  the UV grid or export and re-read).
