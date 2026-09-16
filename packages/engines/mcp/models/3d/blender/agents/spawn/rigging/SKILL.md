# Rigging — seat props on bones (Blender MCP)

Attach a prop to a character's bone system — in Blender, whose
armature math this is. The retired 3d-fit card reimplemented this
as numpy matrix/quaternion surgery inside a ComfyUI node; this
skill does it with the DCC that owns the operations.

**Reader**: you are a spawned agent stage holding the
`mcp__blender__*` tools (the stage's `mcps` allow-list). This body
is inlined into your brief at spawn — the spawn shape is
`{"engine":"agent","params":{"task":"seat the sword in the right
hand, target width 0.04","mcps":["blender"],"skills":["model:blender:rigging"]}}`.
Every Blender call you make rides those tools; never shell out,
never hand-roll matrix math.

## When

Anything must be attached to, measured against, or scaled to a
rigged body: hats on heads, swords in hands, garment seats,
sockets.

## The three placement laws (the vocabulary survives; the solver is
Blender's now)

- **socket** — parent the prop to the named bone. Blender computes
  the bone matrix; you offset in bone-local space.
- **fit** — measure between two reference bones (Blender's own
  length/volume queries), scale the prop by the ratio, then seat.
- **grip** — align the prop between finger and thumb bones to a
  target width: measure the hand, scale the grip axis, parent to
  the hand bone with the local offset.

## Procedure

1. **Load body + prop** into the persistent session.
2. **Find the armature and the named bone** — read the actual bone
   names; never assume a convention (mixamorig: prefixes are
   common, not law). A typo must surface HERE, loudly.
3. **Apply the law** (socket/fit/grip above) with Blender's
   parenting and matrix ops. Keep the prop's local offset
   explicit; never bake a lucky global transform.
4. **Prove it**: render a capture of the seated prop from at least
   two angles. If a critic (agent vision or the operator) is in
   the loop, hand them the captures — "looks right" without a
   render is a lie.
5. **Adjust by critique** — nudge in bone-local space (one axis at
   a time), re-render, confirm.
6. **Export the placed GLB** (armature + prop, or prop alone with
   its parent transform baked — follow the task's ask).

## Laws

- Bone math belongs to Blender — no hand-rolled matrix code, no
  guessing rotations.
- One persistent session; every render under the run dir.
- The proof is a capture, never a claim.
