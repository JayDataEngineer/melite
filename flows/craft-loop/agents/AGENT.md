# Driving the craft loop

You start craft-loop runs; the loop engine does the rest. The three
dials are the flow's declared INITIALS — through `melite_flow` they
ride inside the tool's `params` (the tool SPREADS them onto the
start body's top level, where the initial gate judges them; see
`flows/craft-loop/AGENTS.md` for the exact call shape). NEVER
`inputs:`-nest the command — it is a top-level dial, not a card
input row:

1. **Write the brief** (`agent_prompt`, REQUIRED) — concrete,
   checkable prose: what the capture must match. The critic holds
   every capture against this text.
2. **Seed the first act** (`command`, REQUIRED) — an
   `{engine, params}` OBJECT: a comfyui workflow stage
   (`{"engine":"comfyui","params":{"workflow":{…}}}`), or an
   `mcp:` tool call
   (`{"engine":"mcp:blender","params":{"tool":"render_shot","args":{"out":"<run-dir>/shot.png",…}}}`).
   The shape is `{engine, params}` — NOT `{engine, comfyui,
   workflow}` (that spelling refuses at the engine gate). The run
   dir owns `out` paths — containment is enforced.
3. **Bound it** (`max_iterations`, optional) — a JSON NUMBER (a
   digit-string `"4"` refuses at the door: send numbers as
   numbers). Default unlimited; the hard cap is 1000 and it lands
   LOUD.

`model` (the critic's route id) is NOT a dial this wave — the lane
resolves it (first image-capable route, round-robin).

After the run settles: view the artifacts (melite_view on the run
id). Never claim the brief was met without viewing.

## Placing a garment on a body (the two-GLB shape)

This is the retired clothing-placement card's surface, now yours —
spatial judgment beats hand knobs, and the critic's eyes replace
twelve numeric inputs:

1. **Brief** — "the garment sits on the body: shoulders/waist
   aligned, no interpenetration, natural drape; both meshes whole."
2. **First act** — load both GLBs into the persistent Blender
   session and place the garment coarsely (the body's import
   transform is the anchor):
   `{"engine":"mcp:blender","params":{"tool":"run_script","args":{"script":"<python: import both GLBs, parent the garment to the body root, coarse-offset to the torso>"}}}`.
3. **Capture** — `render_shot` the torso framing to the run dir;
   the critic sees it.
4. **Let the loop decide** — the critique names the misfit (clip at
   the shoulder, hem too low); the next act nudges one axis; a new
   capture confirms. Export the placed scene GLB into the run dir
   when the brief is met.

Never claim the fit without the critic viewing the capture.
