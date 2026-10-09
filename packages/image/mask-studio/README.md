---
description: Leaf-face carrier of the retired mask card's studio surfaces — paint and bbox canvases embedded in modifier leaves.
kind: package-library
---

# @melite/image-mask-studio

`@melite/image-mask-studio` carries the two studio surfaces the mask card's modifier leaves embed: the brush canvas (`./paint-canvas`) and the rectangle canvas (`./bbox-canvas`). The card itself is retired at parity (CONTRACT D — no cardPackages row remains); the package is DEMOTED to a leaf-face carrier and the takeover client is gone. The root door is dependency-free leaf data both canvases share.

## Contract

- `./paint-canvas` — `PaintLeafCanvas`, the brush canvas a paint mod leaf embeds. Strokes render on a transparent overlay so the saved PNG's alpha IS the stroke shape — the `LoadImageMask` lane reads exactly that alpha; the view fits at 640. Committed strokes report live through `onChange`, and a paint-over seeds from the existing payload. A commit-gate ref mirror keeps pointerup from committing a blank payload.
- `./bbox-canvas` — `BboxLeafCanvas`, the rectangle canvas a bbox mod leaf embeds. The drawn box reports image-pixel coordinates (naturals, not view pixels), stays clearable (`onChange(null)`), and still takes a rectangle over the blank fitted 1024 canvas when no image is staged.
- `.` — `paintInk.ts`, the shared leaf data (the stroke ink constants), importable under plain Node with no React.
- `./package.json` — the manifest.

Both canvases port from the retired modal; the leaf's own Add/Save/Cancel owns commit.

## Model Experience

### Request context and condition

The canvases author mask payloads for other cards' runs; they never run anything.

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **The card is retired (CONTRACT D)** — no cardPackages row exists; the package survives only as the leaf-face carrier.
- **No takeover client** — the former modal studio surface is gone; the leaves are the only remaining faces.
