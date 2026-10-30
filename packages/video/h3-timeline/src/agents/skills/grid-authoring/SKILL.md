---
name: grid-authoring
description: "Current H3 frame-grid guidance: the 22+17k window grid and the card's cross-call tiling law — gaps and overlaps are refused, never absorbed"
genre: video
---

# H3 grid authoring

The source of truth for the grid is
`packages/models/h3/src/timelineContract.ts` and the card's
`schema()` implementation. Do not infer additional refusal rules from this
short guide.

## Current grid

Every window lands on the shared generated-frame grid — ONE uniform gate
(`assertSpanGrid`, `models/h3/src/timelineContract.ts`): a FIRST or CUT
window's authored span must be `22 + 17k` (e.g. 22, 39, 56, 73, … 124),
and a CARRIED window's span must be `17k` (its 22-frame seam is the
generation head the previous window carries). Both are the same engine
grid, both refuse at the compose door with the nearest legal value named,
and there is no snapping path that silently accepts an off-grid span —
the old separate-path behavior was closed 2026-09-25.

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
