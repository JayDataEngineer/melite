---
description: Types and frozen vocabularies for the whole melite estate — the no-render, no-fetch floor every other package stands on.
kind: package-library
---

# contracts

`@melite/contracts` is the vocabulary floor: types, wire shapes, and frozen word-sets with no render and no fetch. Every other `@melite` package and every plugin stands on it, so two surfaces cannot spell one fact twice.

## Contract

The package root re-exports the leaves; each is also a declared subpath. The manifest also declares the standard `./package.json` re-export.

- Card and bench — `./card` (the card-stage view-model), `./studio` (the tenant props contract), `./stageView` (the bench stage-view currency, including the terminal vocabulary), `./stagePreview` (the preview-slot owner currency, keyed by media kind), `./modifierFaces` (the mods leaf-face owner props), `./benchStage`, `./benchSnapshot`, `./benchResult` (the bench-stage contract, its snapshot, and its result row), `./FlowTypes` (the flow-document model), `./formSpec` (the served form-spec contract).
- Media and pose — `./mediaTypes`, `./mediaKinds`, `./mediaRange` (the byte-range law), `./loraTypes`, `./character` (the body-param bag), `./timelineTypes`, and `./regions` (the region-slot props).
- Wire and storage — `./wire`, `./wire-types`, `./rootsManifest` (the cross-roots manifest), `./browserStorage` (localStorage becomes IndexedDB here), `./objectUrlCache`, `./extraKeys` (the extra-bag contract), `./laneRelations` (the relation words), `./modifierSubcards`, `./enhanceTypes`, and `./vocab` (frozen vocabularies).
- Family planes — `./planes` (the four-plane canon — model, variant, quant, recipe — judged at family registration).

## Model Experience

### Request context and condition

#### What the model sees

None — the package is types and constants; it contributes no model-visible input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — nothing here reaches a model request.

## Known Limitations and Deferred Work

- **Types are compile-time only** — a payload outside a vocabulary is caught by the owning door's validator at its boundary, never here; this package defines the words, not the walls.
- **No `./invariant` companion** — frozen vocabularies carry no runtime relationships to assert; the validators that consume them live at their own load funnels.
