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
drive it through the FLOW DOOR, never a hand-built start body (a raw
`{flow_inline}` body is a banned HTTP shape: no tool accepts it, and
the bench never sees it):

```
melite_flow {flow: "craft-loop", params: {
  agent_prompt: "a red cube on white, product-shot lighting",
  inputs: { command: { engine: "comfyui", params: { workflow: { ... } } } },
  max_iterations: 4
}}
```

Every param rides `params` (the door spreads them into the run's
start body): `agent_prompt` (the brief the critic judges against),
`inputs.command` (the first act — an `{engine, params}` object),
`max_iterations` (the hard cap 1000 lands LOUD).

Agent brief: `agents/AGENT.md`.
