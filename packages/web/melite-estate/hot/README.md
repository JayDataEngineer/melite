# hot/ — DSH live drop-ins

`hot/` contains experimental drop-in plugins for a running Melite DSH
composition. A drop-in is an ordinary Cordis plugin mounted by a profile patch
row; DSH owns watching, fiber disposal, and reload. The estate does not add a
second watcher.

## Contract

A drop-in should:

- export `apply(ctx)`;
- register only through an owning service and an effect/disposer;
- refresh the relevant live projection when its registration changes;
- refuse duplicate or invalid rows rather than partially serving them;
- live under this package or a declared workspace package so imports resolve
  through the package's dependencies.

Read the current examples and the DSH reference before adding a new service
dependency. A hot drop-in is an experiment surface, not a replacement for a
stable card/model package.

## Mounting

A rendered profile's `cordis.patch.yml` names the drop-in explicitly. The
patch file is the load list; no implicit directory glob mounts every file.
The profile renderer writes a user layer that is intentionally minimal, so
the operator can add a row without editing the provisioner.

## Live projection

Mods are projected from the owning service on the next form/spec read. Cards
may require an explicit definition refresh after registration and disposal.
The current implementation and examples under `examples/` are the source of
truth.

## When to graduate a drop-in

When a card or mod becomes stable, move it into its own package and explicit
composition table, then add the package's focused tests. Keep the hot door
for the next experiment; do not make a hot file a hidden production
dependency.
