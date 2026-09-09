# @melite/melite-3d-clothing-placement

The clothing-placement card as its own package — garment-on-body
placement through a persistent Blender MCP session (`MeliteBlenderMCPCall`
macro `place_garment`; the result JSON lands as a `SaveText`
provenance artifact beside the placed GLB).

A card is a plugin (receipt: `references/deepseek-harness/packages/shell/tool-bash`):
this package named-exports `name` / `inject` / `apply` and
self-registers via `ctx.effect(() => ctx.comfyui.registerCard(...))`.
It is composed by package list (the engine's composition root, and
the DSH profile when the web lane rides) — never glob-discovered.

- Pure Law-0 card: no model→family resolution (`requiresModel: false`,
  `boarded: []`); the card's own Schemastery parse is the real gate.
- The authored prose (`identity`) is declared inline — the card
  emits its tool row (name from the id, prose from identity, params
  from the schema; M1).
- Requires the `melite-blender-proxy-nodes` extension pack (Layer C).

## Model Experience

- Tool surface: `clothing_placement_card` (card-compose). Required:
  `body`, `garment`, `out_path` (estate-file contract: absolute
  paths must exist at compose time; `$spell` values name wired
  stage inputs and ride verbatim). Optional: placement offsets/
  rotation/scale/snap/mirror, session `mcp_addr`, `autoboot`,
  `timeout`.
- No model, no token stream, no KV-cache effect — one MCP macro
  call per run in the ComfyUI graph.

## Known Limitations and Deferred Work

- Transitional composition: the engine's `loadCardDefs` still globs
  `src/cards/**` for the other 19 cards and lists THIS package
  explicitly (named bridge, death date: the 20-card sweep — P48.1).
  When all cards are packages, the glob walk is deleted and the
  package list is the only composition.
- The tool face lives in-package (`src/tool.ts`): where the
  composing host provides a `tools` service (`ctx.get`, the optional
  service law), `apply` registers `clothing_placement_card` — the
  same schema/prose the registry serves, one spelling — whose
  execute rides the flow path (drafts mints, start queues; named
  refusals resolve canonically). The fetch-registrar never carried
  this card (`model: null` rows are filtered); the remaining 7
  model-card tools still ride it until their packages land.
- Live-host composition: the dev profile does not yet list this
  package, so no booted dsh session has shown the registered tool;
  the package tests prove registration + disposal against the
  documented lifecycle. The profile listing lands with the
  20-card sweep.
