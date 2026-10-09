---
description: The run-viewer composition — same-origin run proxy routes host-side and default run-card toolview claims client-side.
kind: package-library
---

# viewer

`@melite/viewer` composes the default run-card experience. Its host half registers one pair of run-scoped same-origin proxy routes on the optional `webServer` service; its client half claims a default run-card toolview for each composed card and threads the live gallery source through the gateway's runs stream. Cards ship their own client halves only to take over; all-defaults cards land here.

## Contract

- `.` (host) — `GET /melite-viewer/run/<run_id>` (status JSON) and `GET /melite-viewer/asset/<run>/<rel>` (bytes), built from `@melite/viewer-base/wire`. The `webServer` service is optional: a headless composition skips the registration and the claims' gallery simply cannot fetch. All gateway knowledge stays host-side in Config; the `gateway` field is a retiring, unused spelling — `proxyDoor` currently answers 502 `estate_killed` loud until the viewer rides named remotes. The manifest also declares the standard `./package.json` re-export.
- `./client` (browser) — claims default run-card rows (the image_gen card today), one claim per composed card. The gallery's live lane is `ctx.remote.runs.subscribe` over the gateway's `$stream` face: a frame yields only on a row change, a terminal row ends the source, and the holder's signal aborts it clean. The runs namespace is read inject-free through `ctx.get`, so a composition that never mounts the estate still claims its rows — it renders no gallery, not no row.

## Model Experience

### Request context and condition

#### What the model sees

None — the package renders run frames and proxies bytes; it contributes no field to a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **The proxy doors answer 502 `estate_killed`** — the gateway died with the estate collapse; the routes serve again only when the viewer rides named remotes, which is owed work, not a regression.
- **No `./invariant` companion** — the claims and route registrations are composition facts; independent observations cannot diverge around a runtime assertion here.
