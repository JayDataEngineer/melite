---
description: The studio's card surfaces bundle — mounts the estate remotes into the browser graph and hosts the right-sidebar cards tab.
kind: package-bundle
---

# melite-card-view

`@melite-plugin/dsh-card-view` is the browser bundle row the estate's patch layer mounts. Its host half logs the mount line; its client half mounts every estate contribution — the drafts, bench, runs, and manage Typert remotes — and hosts the native right-sidebar cards tab, opened by resource address `dsh-resource://cards/bench|run/<id>`. Every card surface rides the estate remotes over `/api`; the gallery, timeline, and run-wire surfaces compose beneath it.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml` and a `dsh.client` face whose `external` list pins `@deepseek-ai/dsh-api-gateway/client`, `@melite/card-base/client`, and `@melite/three-client/client` — the one-row atoms this package requires from the loader instead of inlining.

- `.` (host) — the composition marker: it logs the mount; the served API stays the estate remotes' own.
- `./client` (browser) — injects the connection and the api-gateway client, mounts each estate namespace once, and registers the cards tab (kind `cards`) with its body. Media planes open the tab through the standard resource-address action; the retired window seam is gone — opening is `openResource`, one call.

The manifest also declares the standard `./package.json` re-export.

## Model Experience

### Request context and condition

#### What the model sees

None — the tab derives everything it shows from estate remote responses and persisted result metadata; no field of a model request originates here.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — the package contributes no content to model requests.

## Known Limitations and Deferred Work

- **No `./invariant` companion** — the surfaces derive everything from estate remote responses and hold no cross-package claims a runtime assertion could check; the empty installer that stood here until 2026-10-18 asserted nothing and was deleted (conformance sweep F20).
- **The tab needs the mounted remotes** — the deck's manager panel gates its transport on this package's mount of the estate namespaces; a bundle that ships the tab without the estate rows renders surfaces that cannot fetch.
