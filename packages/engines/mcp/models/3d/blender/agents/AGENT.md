# Blender — the MCP 3d door

`mcp:blender` is the registered engine row for every DCC 3d
operation: scene assembly, parenting, bone math, UV work, baking,
exports. The session is persistent and stateful — objects you load
stay until you clear or quit it.

**Procedures for spawned agent stages** live on the spawn plane
(`agents/spawn/` — subagent-only leaves, never listed to the
constructor): unwrap/skin and prop-seating/rigging bodies are
inlined into a spawned stage's brief via its `skills[]` param. An
agent stage that wants them carries
`{"engine":"agent","params":{"mcps":["blender"],"skills":["model:blender:<skill>"]}}`.
