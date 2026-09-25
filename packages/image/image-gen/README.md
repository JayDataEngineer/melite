# @melite/image-image-gen

The image-generation card package. It owns the card declaration, image
composition recipe, and optional agent/tool projections for the image lane.

## Card surface

- `src/card.ts` — schema, identity, boarded model coordinates, and card
  registration.
- `src/tool.ts` — the card's DSH tool projection.
- `src/client/` — the optional card/studio client face.
- `tests/` — schema, composition, tool, and parity coverage.

The card is composed explicitly by
`packages/engines/comfyui-cordis/src/cardDefs.ts`. It obtains model facts and
resource declarations from the model packages; it does not maintain a second
model list or a Python recipe registry.

## Composition

The shared image recipe comes from `@melite/comfyui-card-kit`. Card-specific
defaults, prompts, and modifiers remain in this package. Model/variant/quant
selection is resolved through the card registry and model declarations.

Admission refuses unknown parameters, missing model resources, and missing
required packs before graph emission. The tool projection must preserve the
same admitted parameter and result contract.

## Gates

Run the package tests and the relevant engine/registry walls under the root
Vitest configuration:

```sh
pnpm --filter @melite/image-image-gen exec vitest run
pnpm run lint
```

When the user-visible schema or tool output changes, update the package
snapshot/wall and the relevant recorded-session fixture.
