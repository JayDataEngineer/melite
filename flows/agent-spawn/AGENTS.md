# agent-spawn

The spawner's flow leaf. ONE stage, engine `agent`: the loop
engine (packages/engines/agent) runs task → tool calls → answer
inside the queue lane — "craft without the fixed critic".

- The tools are the ALLOW-LISTED MCP servers (`mcps: ["blender"]`
  → `mcp__blender__*`), filtered from the host ToolRuntime's own
  census — never a static list, and every allow/deny/ask policy
  applies to each call.
- The named `skills` are SPAWN-INJECTED: the engine reads the
  leaves at stage start and inlines them into the brief (a
  different process than melite_load's constructor read — same
  storage, new serving path).
- `max_turns` defaults UNLIMITED (open-ended tool work is dozens–
  hundreds of turns); the hard circuit breaker is 1000 and lands
  LOUD. The stop door is live the whole time.
- Artifacts are the run dir's new files — view them after (the
  estate's artifact law).

The registry row (`flowsData.ts` AGENT_SPAWN) is the TEMPLATE —
drive it with a start doc whose stage carries the fields:

```json
{
  "flow_inline": {
    "id": "agent-spawn",
    "stages": [{
      "id": "agent",
      "engine": "agent",
      "params": {
        "task": "render a red cube on white into the run dir",
        "mcps": ["blender"],
        "max_turns": 6
      }
    }]
  }
}
```

Agents: the driving brief lives in `agents/AGENT.md`.
