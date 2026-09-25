# humanoid-flow — authoring notes

Status: **AUTHORING LEAF — not an executable named flow**. This directory
documents humanoid intent. No row named `humanoid-flow` is currently present
in the authoritative TypeScript flow registry. Discover the live
cards/flows with `melite_discover`; do not assume this leaf is loadable by
name.

## Intended composition

Humanoid body/asset construction → rig → texture projection → review views.
The exact cards, MCP or ComfyUI providers, and parameters are discovered from
the live catalog.

## Agent contract

Use `melite_discover` → `melite_load` → `melite_construct`. Browser sessions
compose only and the user presses Run. Headless commissions may use
`melite_flow` and `run_status` through the sanctioned runbook. Do not use a
retired YAML flow, a direct gateway call, or a hand-built graph.

## Review rules

- Start from the declared character/preset contract.
- Finalize the body before a rig stage when the loaded schema requires it.
- Keep parameter order and identity data owned by the card/model declaration.
- Inspect the declared review views before delivery.
