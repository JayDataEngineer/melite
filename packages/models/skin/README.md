---
description: Skin (meld coat) family — the apply-skin verb's weightless backend grafting deterministic detail maps onto a SOMAX body GLB.
kind: package-library
---

# @melite/models-skin

`@melite/models-skin` is the model family package behind the apply-skin verb (`genre` 3d). It declares the `coat` action: `SkinPack` and `SkinSidecar` synthesize deterministic albedo/normal maps and a kind sidecar (no checkpoint loads, so the family is weightless), `SkinApply` grafts them onto a body GLB, and a 4-view proof sheet renders alongside. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The 2026-09-16 retirement order killed the skin CARD on purpose: flows' family-action stages are this family's only riders, and the package is the sanctioned seam, not a card revival.

## Declaration

One variant row, `standard` ("Native (weightless)"), no Recipe row — there is no card, so no default stamps. The `coat` action takes one param, `body` (the body GLB path, validated by the flow row's `glb` kind), and declares `laneIndependent: true` with a `mesh` output — the grafted body. The verb's framing is fixed here, not a bench surface: map size 512, kind `keeper`, seed 20260906, proof render at 768 / framing 1.2 / focal 50 / 64 samples / transparent. No seed-sentinel is declared on `coat`; the seed arrives as a `$` channel ref the merged worker resolves from the flow's own input.

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

- **body** — the path of the SOMAX body GLB the maps graft onto; everything else on `coat` is the verb's fixed vocabulary.

#### Token effect

Zero-direct token effect — the single field rides the composed ComfyUI graph.

#### KV Cache effect

Independent — each coat run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **No card face** — the 2026-09-16 retirement keeps the skin card dead; only meld flows' family-action stages reach `coat`.
- **Fixed vocabulary** — detail kind, map size, and seed are constants of this file; a new kind or size is a family change, and the engine refuses anything else by name.
- **Knobs never join the request** — a `$map_size`-style knob would be refused by name; the flow owns the one resolution it declares.
