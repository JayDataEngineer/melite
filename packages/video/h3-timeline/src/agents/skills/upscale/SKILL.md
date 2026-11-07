---
name: upscale
description: "Whole-film 2x upscale — the LEGACY `upscale` spelling of the one Video edit bag (a preset cell: chain_run names a PRIOR chain run; every scene resumes its checkpointed lineage, upscales through the learned 3D latent upscaler, re-renders at low denoise, assembles at <runId>/upscale). Old upscale docs still resolve; new docs state params.edit with chain_run."
genre: video
---

> THE COLLAPSE — THIS NAME IS A PRESET CELL, NOT A DOOR. This leaf
> documents the LEGACY spelling so old docs keep composing: state
> the cell on the ONE Video edit bag (`params.edit`).
> `upscale: [{ chain_run }]` resolves to `edit: [{ chain_run,
> denoise: 0.24 }]` — `chain_run` is the arming seat, the bare run
> name (the execute door resolves the per-scene lineage;
> `mode.scale` stays the engine's own validated child key). New
> docs state the edit bag.

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

- `denoise` (0.05–1, 0.24) — the pass-2 recipe's own pole.
- `chain_run` — the engine-side run name of a PRIOR chain run,
  stated bare; the execute door resolves the newest per-scene
  lineage and an unknown name refuses loud there. The served seat
  is the LIVE chain-run picker (type `chain-run`).
- Under this posture the refine and continuation switches stand
  down (`visible_when: chain_run=null` on both) — one second-pass
  mechanism.
- The full dial table and the posture's refusal laws live in ONE place: the `edit` skill.

THE DOOR REFUSES CLEANLY PAST VALIDATION: an unknown run name
refuses loud at the execute door, never a silent empty pass. Do not
Do not promise an upscale: NOT yet verified live: an END-TO-END upscaled render
(the loop's own resumption has not been pressed on the GPU lane).
Live-proven: the legacy spelling's translation into the edit cell is
walled suite-side, and the bare run name law rides the execute door. — the edit
door's lane proof is the one that counts.
