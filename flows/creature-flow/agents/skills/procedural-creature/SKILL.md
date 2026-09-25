# procedural-creature — current authoring guidance

Status: **CURRENT**. Use this guidance only when the live catalog exposes the
creature/anyCreature capability. The exact card, provider, model, and skill
are discovered at runtime.

## When it fits

Use for articulated non-humanoid creatures when the loaded contract supports
the requested rig or mesh. Humanoids belong to their own lane. Do not invent
an engine id or a local spec path from this file.

## Agent loop

```text
melite_discover → melite_load → melite_construct
```

In a browser session, stop after the user presses Run. In a headless
commission, use `melite_flow` and monitor with `run_status` under the 3088
runbook. Never shell out to a creature CLI or hand-build a graph as a
substitute for the loaded card.

## Authoring rules

- Carry the exact loaded parameter names; do not send an undeclared `spec`,
  script, or engine field.
- Preserve the declared review views and validation gates.
- If the loaded contract has no rig or review capability, report that fact
  instead of substituting another creature lane.
- Read the returned run artifacts and report the concrete structural or visual
  result.

A CPU helper or external delivery script may be part of a separately approved
operator workflow, but it is not automatically an estate card or a current
runtime door.
