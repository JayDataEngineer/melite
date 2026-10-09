---
description: The melite viewer's seam layer — slot contracts, run-scoped URL builders, and the default run-card view, as a plain library.
kind: package-library
---

# viewer-base

`@melite/viewer-base` owns the viewer's seams and wiring only: it claims no slot and renders nothing on its own. It declares the three viewer slots into the DSH client SlotMap, spells the run-scoped route facts once, and provides the default run-card row the composition (`@melite/viewer`) claims for every card without a takeover view. A library, not a plugin: no host `apply`, no `dsh.client` manifest — the browser loads whatever the composition's client half imports from here.

## Contract

Four doors:

- `.` — re-exports the three below; the manifest also declares the standard `./package.json` re-export.
- `./slots` — the seam ids (`melite.viewer.timeline`, `melite.viewer.size`, `melite.viewer.window`) declared into the SlotMap by declaration merging, plus the owner-props contracts a claim receives.
- `./wire` — the run-scoped route prefixes (`/melite-viewer/run/`, `/melite-viewer/asset/`) and the same-origin URL builders; a run id is global on the gateway, so one route pair serves every run card.
- `./runCard` — the default run-card view plus `claimRunCardToolview`: the row derives from the frozen call block and the card's `presentationMeta` projection (replay-stable), and the gallery is its one live arm, fed by the composition's `runFrames` prop — the row fetches nothing itself.

## Model Experience

### Request context and condition

#### What the model sees

None — the package renders run state and builds URLs; it contributes no field to a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **Seams render only through a composition** — without `@melite/viewer`'s claims the contracts sit idle; the package intentionally ships no registration of its own.
- **No source, no gallery** — a composition without the estate's runs namespace renders the run card without the gallery arm; the retired poll's door answers 502 `estate_killed` by design.
- **No `./invariant` companion** — the seams are declaration-merging contracts and pure URL builders; there is no runtime relationship to assert.
