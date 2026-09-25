# sprite-sheet — authoring notes

Status: **AUTHORING LEAF — not an executable named flow**. This directory
documents sprite-sheet intent. No row named `sprite-sheet` is currently
present in the authoritative TypeScript flow registry. Discover the live
cards/flows with `melite_discover`.

## Intended composition

Generate the requested action frames → edit/remove backgrounds through the
declared image card → assemble the sheet through the declared card/flow stage.
The live loaded bundle owns the actual node and script names.

## Agent contract

Use `melite_discover` → `melite_load` → `melite_construct`. The user presses
Run in browser mode. A headless commission may use `melite_flow` and
`run_status`. Do not call raw estate endpoints, use a retired YAML lane, or
hand-build a ComfyUI graph.

## Review rules

- Keep frame order and action naming explicit in the card parameters.
- Verify every referenced frame is a real artifact before assembly.
- Inspect the final sheet dimensions, transparency, and pose order against the
  brief.
