---
description: The one compiled instance of three.js for the browser graph, mounted as a single module-table row.
kind: package-bundle
---

# three-client

`@melite/three-client` ends the multiple-three problem: three rode `dependencies` in every 3D-touching web package, each client bundle inlined its own compiled copy, and the page warned `Multiple instances of Three.js being imported`. This package is the cure's mount, in the shape card-base set for the studio atoms: one module-table row that every 3D consumer requires through `dsh.client.external`.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, inserting the `three-client` row.

- `.` — the host marker (`name`, `inject`, `apply`); registers nothing node-side and stays node-safe.
- `./client` — the one compiled instance of `three` plus the addon surface the estate consumes, re-exported so the addons' internal `three` imports resolve to this bundle: `DRACOLoader`, `GLTFExporter`, `GLTFLoader` (with the `GLTF` type), `OrbitControls`, `RoomEnvironment`, `TransformControls`. The face carries the same plugin marker as the host half, because the shell registers every boot row on both planes.

A new addon joins this row's re-export list; a consumer never imports `three/addons/…` beside the row.

The manifest also declares the standard `./package.json` re-export.

## Model Experience

### Request context and condition

#### What the model sees

None — the package is a runtime dependency row for the browser graph; it contributes no model-visible input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **The addon surface is closed here** — an addon the estate needs that is not on the list forces either a row edit (the path) or a consumer-side inline that re-splits three (the bug).
- **No `./invariant` companion** — the row's claim (a single compiled instance) is a bundler-graph property the loader enforces at require time, not a runtime observation.
