# @melite/models-krea-2

The krea-2 model family package. It owns model facts and declared resources;
it does not render a card or duplicate the image card's schema.

## Declaration

`src/index.ts` exports the family `DECL` and a Cordis provider that registers
it with the models service. The declaration contains the family's variants,
quant/resource rows, mods, lane inputs, defaults, and prompt guidance needed
by the owning card.

The model plugin is composed by the engine's family table and the card-kit
flavor table. A card boards the family id and resolves its model coordinates
through that declaration.

## Resource integrity

Every declared artifact retains its source, destination, digest, and size.
The provisioning service verifies the landed bytes. A directory or filename
alone is not a present model.

## Tests

The package's declaration and integration tests run under the root Vitest
configuration. Verify the family registration, card admission, mod interlock,
and no-silent-drop behavior with the package's focused tests and the engine
walls.

For the current card behavior, see
[`../../image/image-gen/README.md`](../../image/image-gen/README.md). For
resource acquisition, see
[`../../estate/provisioning/README.md`](../../estate/provisioning/README.md).
