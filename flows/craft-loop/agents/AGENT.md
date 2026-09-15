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
