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
(`assertSpanGrid` / `assertGridLength`, `models/h3/src/timelineContract.ts`):
a FIRST or CUT window's authored span must be `22 + 17k` (e.g. 22, 39, 56,
73, … 124), and a CARRIED window's span must be `17k` (its 22-frame seam is
the generation head the previous window carries). Both are the same engine
grid, both refuse at the compose door with the nearest legal value named,
and there is no snapping path that silently accepts an off-grid span —
the old separate-path behavior was closed 2026-09-25.

THE CAP: `GRID_MAX_FRAMES = 362` (22 + 17 × 20) — the largest single window.
A longer film is joined from uniform windows under the 39 f context overlap,
never one oversized window.

THE CARRY ARITHMETIC (why a carried window authors `17k`, not `22+17k`):
window 1 renders fresh; every window from k = 2 CARRIES the 22 f head that
the previous window's seam already generated, and the saved clip is trimmed
by that carry. So a carried window's authored span is `17k`, and its
CONTRIBUTION to the film is `span − 22` frames. Author `90` for a carried
window and you get a 22 f seam you never asked for.

THE REFUSAL, verbatim (`assertGridLength`):

```
length <N>f is off-grid — the engine renders 22+17k frames in [22,362]
(nearest legal: <M>f); the doc-proven geometry is 0→124→243→362
```

It names the nearest legal value; there is no silent snap. Read the number
and re-author the span — never retry the same value hoping the door absorbs
it.

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
