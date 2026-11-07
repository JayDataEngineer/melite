---
name: refine
description: "Second-pass refine — the LEGACY `refine` spelling of the one Video edit bag (a preset cell: the refine switch ON adds the learned 2x handoff riding the edit's own latents, same run, partial denoise only). Old refine docs still resolve to ONE window on params.edit; the retired multi-entry tiling refuses. Not a re-render and not the upscale posture."
genre: video
---

> THE COLLAPSE — THIS NAME IS A PRESET CELL, NOT A DOOR. The
> operator's ruling: refine is just flipping a knob that slightly
> changes some nodes. This leaf documents the LEGACY spelling so old
> docs keep composing: state the cell on the ONE Video edit bag
> (`params.edit`). `refine: [{...}]` resolves to
> `edit: [{ refine: true, mask_source: "whole-frame", reference:
> "self", denoise: 0.32 }]` — ONE window per doc. The multi-entry
> tiling the old leaf taught is the RETIRED refine arm and refuses
> at this card today: name the window's start and length on the
> edit bag instead. New docs state the edit bag directly.

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

- `refine: true` — the fourth dial on the edit bag; `scale` rides
  only under it (the GUI opens the scale submenu under the switch,
  `visible_when: refine=true` on the served field).
- `whole-frame` (the blank mask) + `reference: "self"` + partial
  denoise at 0.32 — the classic refine posture; the handoff rides
  the edit's OWN latents in the same run.
- The design window (2.33s = 56f), the 141 f measured OOM ceiling,
  and the `22+17k` engine grid live in ONE place: the `edit` skill.

Live-proven: the legacy spelling's translation into the edit cell is
walled suite-side (the alias resolves node for node, one window per
doc). NOT yet verified live: a GPU render pressed through this alias
leaf's own example — the edit door's lane proof is the one that
counts.
