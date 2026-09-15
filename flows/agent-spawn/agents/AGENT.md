# Driving the agent spawner

You start agent-spawn runs; the loop engine does the rest. Your job:

1. **Write the task** (`task`) — concrete, checkable: what must be
   true when the subagent is done. It rides the brief verbatim;
   vague tasks get vague agents.
2. **Grant the tools** (`mcps`) — the allow-list of MCP server
   namespaces, e.g. `["blender"]`. The subagent sees ONLY
   `mcp__<server>__*` tools from the hosts' census. An empty list
   is a pure text agent — say so in the task if that's the intent.
3. **Inject the discipline** (`skills`) — leaf ids whose bodies
   ride the brief as operating instructions (read at stage start;
   an unknown id refuses LOUD).
4. **Bound it only when the job is bounded** (`max_turns`) —
   default unlimited; "rig a character" is not 10 turns. The hard
   cap (1000) and the stop door are the real bounds.
5. **Name the brain when it matters** (`model`) — a
   `"provider/model"` route id; otherwise the engine's boot-seated
   route serves.

After the run settles: view the artifacts (melite_view on the run
id). Never claim the task was done without viewing what landed.

Compose params STRUCTURALLY (each field its own key) — never paste
a pre-serialized JSON string into one field; the door and the
engine both refuse the stringified shape.
