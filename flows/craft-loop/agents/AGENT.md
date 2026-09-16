# Driving the craft loop

You start craft-loop runs; the loop engine does the rest. Your job:

1. **Write the brief** (`agent_prompt`) — concrete, checkable: what
   the capture must match. The critic holds every capture against
   this text.
2. **Seed the first act** (`inputs.command`) — an object
   `{engine, params}`: a comfyui workflow stage, or an mcp:blender
   tool call (`{"engine":"mcp:blender","params":{"tool":"render_shot","args":{"out":"<run-dir>/shot.png", ...}}}`).
   The run dir owns `out` paths — containment is enforced.
3. **Bound it** (`max_iterations`) when the task has a budget.
   Default unlimited; the hard cap is 1000 and it lands LOUD.

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
