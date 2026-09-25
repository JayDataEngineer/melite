# non-humanoid-flow — authoring notes

Status: **AUTHORING LEAF — not an executable named flow**. This directory
documents non-humanoid creature/prop intent. No row named
`non-humanoid-flow` is currently present in the authoritative TypeScript flow
registry. Discover the live cards/flows with `melite_discover`.

## Intended composition

Concept image → native mesh generation → asset-class cleanup/remesh →
optional creature rig → review views. For static objects prefer the prop
leaf; for rigged creatures use the creature leaf when its loaded contract
fits.

## Agent contract

Use `melite_discover` → `melite_load` → `melite_construct`. Browser sessions
compose; the user presses Run. Headless commissions may use `melite_flow` and
`run_status`. Never use a raw gateway endpoint or hand-built graph.

## Review rules

- The concept and declared budget define the shape target.
- Props and creatures follow the loaded card's actual stage list.
- Review the declared views and refuse to invent a missing engine or script.
