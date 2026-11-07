---
name: repair
description: "Region repair — the LEGACY `repair` spelling of the one Video edit bag (a preset cell: per-frame SAM3 region mask + self anchors + partial denoise; the rest of the frame and its audio are held). Old repair docs still resolve; new docs state params.edit with mask_source region."
genre: video
---

> THE COLLAPSE — THIS NAME IS A PRESET CELL, NOT A DOOR. The
> operator's ruling: repair and replace are the same operation;
> repair just uses the original. This leaf documents the LEGACY
> spelling so old docs keep composing: state the cell on the ONE
> Video edit bag (`params.edit`). `repair: [{...}]` resolves to
> `edit: [{ mask_source: "region", reference: "self", denoise: 0.32 }]`
> node for node (the arm's declared default 0.32; the edit bag's
> denoise band is 0.05–1) — one entry per doc. New docs state the
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
- `mask_source: "region"` + `reference: "self"` — the translation's
  own dials; the free cells around them (whole-frame, static-png,
  still+mannequin) compose on the same bag.
- The full dial table, the named preset chips, the seam and window
  laws live in ONE place: the `edit` skill. Read that leaf — every
  number there is quoted off the served card.

Live-proven: the legacy spelling's translation into the edit cell is
walled suite-side (the alias resolves node for node, one entry per
doc). NOT yet verified live: a GPU render pressed through this alias
leaf's own example — the edit door's lane proof is the one that
counts.
