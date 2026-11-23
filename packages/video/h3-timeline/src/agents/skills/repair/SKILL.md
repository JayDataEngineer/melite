---
name: repair
description: "Region repair — the LEGACY `repair` spelling of the one Video edit bag (a preset cell: a RECEIVED mask, ONE staged PNG + self anchors + partial denoise; the rest of the frame and its audio are held). One entry composes the whole-film face (carry splits on the film's own timeline). The tiled face is the legacy bag with N entries: hand-tiled windows joined into ONE film. Old repair docs still resolve; new docs state params.edit with mask_source static-png."
genre: video
---

> THE COLLAPSE — THIS NAME IS A PRESET CELL, NOT A DOOR. The
> operator's ruling: repair and replace are the same operation;
> repair just uses the original. This leaf documents the LEGACY
> spelling so old docs keep composing: state the cell on the ONE
> Video edit bag (`params.edit`). `repair: [{...}]` resolves to
> `edit: [{ mask_source: "static-png", reference: "self", denoise: 0.32 }]`
> node for node (the arm's declared default 0.32; the edit bag's
> denoise band is 0.05–1) — and a repair RECEIVES its
> mask: ONE staged PNG (the track run's pixel-max union is the recommended
> bridge); a repair without one refuses loud. New docs state the
> edit bag directly.

## The pair + arm laws (ONE door per doc)

- ONE DOOR PER DOC: the legacy names - replace, repair, extend,
  refine, upscale - are PRESET CELLS of the ONE Video edit bag, not
  doors. A doc arming two of them, or a legacy name beside an armed
  `edit` bag, REFUSES loud naming both. Empty every arm but the one
  posture you want.
- THE LORA BAG IS NOT AN ARM: `loras` is the co-arming adapter bag
  and it COEXISTS with any armed arm - never tell a user to empty
  `loras` to disarm a pair.

## The cell, as it composes today

- `denoise` (0.05–1, 0.32) — the partial pole holds everything
  outside the tracked mask, and the source's audio with it.
- `mask_source: "static-png"` (the received mask) +
  `reference: "self"` — the translation's own dials; the free cells
  around them (whole-frame, region, still+mannequin) compose on the
  same bag.
- The full dial table, the named preset chips, the seam and window
  laws live in ONE place: the `edit` skill. Read that leaf — every
  number there is quoted off the served card.

## THE TILED FACE — `repair: [w0, w1, ...]` (N windows, one press, one film)

The ONE legacy name whose bag still tiles. N ≥ 2 entries compose the
TILED walk (GAPS-19's shape, the refine bag's grammar, repair
semantics): each entry is ONE window — its own masked-edit chain on
the same spine — and the carrier joins the windows into ONE film at
`<runId>/repair` (`repair_w0, repair_w1, …` are the window saves the
join stitches). Outside the tracked mask the pixels ARE the source's
own, so a window cut at its boundary splices clean.

The tiled grammar (every refusal fires at the compose door, zero GPU):

- EVERY ENTRY STATES ITS SPAN IN SECONDS: `window_seconds` — the
  carrier converts ×24 at the film clock and judges the engine grid
  (22+17k frames: 22, 39, 56, 73, 90, 107 …); an unstated, wrong-
  typed, or off-grid span refuses naming the nearest legal length.
  You never type frame seats — the frame seats are the door's
  internal arithmetic, never served.
- THE FILM IS THE WINDOWS, IN ORDER: window 0 opens at the film's
  head and every next window opens where the last ends — the carrier
  derives every start, so the windows always abut (no dropped
  seconds, no doubled render, nothing to misorder). List the windows
  in film order.
- ONE FILM: every entry states the SAME `source_clip`; differing
  sources are two films and refuse.
- THE CEILING: more than 32 entries (the film's composed-window
  ceiling) refuses naming the number.
- THE BUDGET: a window longer than the plan's own clip budget (the
  plan band tops at 15 s) refuses naming both numbers — the join
  consumes one window per entry.
- ONE entry per doc keeps the single-window emission byte-identical
  (the alias translation into the edit bag) — the tiled bag starts
  at two windows, and the tiled tail never rides a one-window doc.

Live-proven: the alias translation and the tiled bag's composition
are walled suite-side (`repair-mod.spec.ts`). NOT yet verified live:
a GPU render pressed through the tiled bag (N window chains in one
press) — the live multi-window repair press stays owed on the
roadmap row; the compose-side walls are the landed proof.
