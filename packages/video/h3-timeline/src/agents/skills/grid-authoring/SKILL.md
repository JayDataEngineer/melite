---
name: grid-authoring
description: "Current H3 frame-grid guidance with the card's unvalidated cross-call gaps made explicit"
genre: video
---

# H3 grid authoring

The source of truth for the grid is
`packages/video/h3-timeline/src/timelineContract.ts` and the card's
`schema()` implementation. Do not infer additional refusal rules from this
short guide.

## Current grid

The carried path uses the shared generated-frame grid (`22 + 17k` values such
as 56, 124, and 362 frames). The card has separate snapping/refusal paths
for other spans; a single off-grid value is not a promise of uniform
acceptance or refusal.

## Intended call layout

The intended film uses:

- call 0 at frame 0;
- an exclusive `end_frame` equal to the next call's `start_frame`;
- no gaps or overlaps;
- a call's own text and the declared transition on its incoming seam.

Admission enforces the tiling: `calls[i].start_frame` must equal
`calls[i-1].end_frame`, and a gap or overlap is refused, not absorbed.

## Continuation

Omit `transition` for the automatic carried continuation. Use
`transition: "cut"` when the new call must begin independently. A stable seed
helps preserve world texture across re-rolls; it does not replace visual
continuity or a valid timeline.
