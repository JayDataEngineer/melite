# craft-loop

The agentic craft loop's flow leaf. ONE stage, engine `craft`:
the loop engine (packages/engines/craft) runs act → capture →
critique → decide inside the queue lane.

- The act leg rides any registered engine (comfyui graphs,
  `mcp:blender` tool calls) — the engine id grammar the door pins.
- Captures land in the run dir; the critic sees the image itself
  (the attachment service, the melite_view law).
- The critic route resolves at boot (first image-capable route,
  round-robin); a blind lane seats no craft engine and the door's
  membership arm says so.

The registry row (`flowsData.ts` CRAFT_LOOP) is the TEMPLATE —
drive it with a start doc whose stage carries the four fields:

```json
{
  "flow_inline": {
    "id": "craft-loop",
    "stages": [{
      "id": "loop",
      "engine": "craft",
      "params": {
        "agent_prompt": "a red cube on white, product-shot lighting",
        "inputs": { "command": { "engine": "comfyui", "params": { "workflow": { ... } } } },
        "max_iterations": 4
      }
    }]
  }
}
```

Agent brief: `agents/AGENT.md`.
