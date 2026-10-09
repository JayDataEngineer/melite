---
description: The DSH web GUI's media sidebar — one Media tab over same-origin run-artifact and draft routes served by its host half.
kind: package-bundle
---

# infer-gallery

`@melite-plugin/dsh-gallery` is the studio's media surface. The host half registers same-origin routes on the `webServer` service; the browser half registers one `Media` tab in the right sidebar whose panel carries a Flows/Artifacts toggle — a draft pick loads onto the bench and opens the cards tab. It reads the estate's runs and drafts seats and the runs output tree; the media sidebar's deleted feature set returns here as one package.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, inserting the `infer-gallery` host row.

- `.` (host) — route registrations: `GET /infer-gallery/runs` (the 500-run window, artifact names rewritten to same-origin), `GET /infer-gallery/drafts`, `GET /infer-gallery/flow?run_id=…` (the `_flow.json` sidecar, a plain disk read), `GET /infer-gallery/artifact?path=…`, `POST /infer-gallery/artifact-delete`, and `POST /infer-gallery/artifact-rename`. Two postures resolve per request: a pinned `gatewayUrl` names the owning DSH and routes fetch it verbatim; without one, the estate's in-process seats answer and an absent seat answers loud 502. Artifact paths must be run-relative (`run-<id>/<file>`); `_`-prefixed sidecar names refuse; rename takes a bare segment and refuses existing targets with 409. Handlers own their response lifecycle; routes never throw.
- `./client` (browser) — registers the tab type and body in the right-sidebar registry, self-driving through `useFeed` against the routes above (the panel carries its own fetch caller), and wires the contract-toast seam to the card-base row's toast store. The entry stays JSX-free; the panels live beside it.

The manifest also declares the standard `./package.json` re-export.

## Model Experience

### Request context and condition

#### What the model sees

None — the package serves and renders run artifacts. Its delete and rename verbs mutate the artifact tree, not model input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **Runs list window is 500** — the runs route serves the newest 500 runs (the runs-window law); older runs are not browsable from the gallery.
- **In-tree posture needs the estate seats** — without a pinned `gatewayUrl`, a missing runs or drafts seat answers 502 naming the fix; nothing absorbs the absence.
- **No `./invariant` companion** — the routes read the runs output tree and the estate seats directly; independent observations of that tree are the seats' own contracts, so no runtime assertion lives here.
