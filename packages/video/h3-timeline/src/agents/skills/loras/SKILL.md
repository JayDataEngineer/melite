---
name: loras
description: "LoRA stacking on the h3-timeline: seat entries on the loras mod bag (id + strength + steps); each entry loads on EVERY window's model in stack order, and the family's default row applies when the bag is empty. Mod-bag door — it stacks WITH an edit arm, it is not one of the one-door bags."
genre: video
---

# LoRAs (the model adapters this film stacks) — SPEC

> STATUS: LANDED 2026-10-28 (the operator's lora law, verbatim: "WE SAID
> KEEP OUR CURRENT LORA SETUP FOR NOW"), surfaced in the studio
> 2026-10-30 (friction F29 — "I can't see or change the LORA at all").
> The bag rides `h3LoraStackOf` into `LTX_lora_loader` (mode minimax,
> `stack_data`) on the family plane, the same plane every masked-edit
> seat and the film render ride. Prose never overrides the loaded
> bundle: the fields below are quoted off the card's served loras kind.
>
> VERIFIED LIVE 2026-11-13 against the graph door (run
> run-d84acf548c10-8bc37e11 — patching `loras:[{id:'h3_lightx2v_turbo',
> strength:1}]` moved the composed distill seat 0.6 → 1 in the
> `LTX_lora_loader` stack) and against the tree's skill-coverage batch
> (receipt `contracts/receipts/2026-11-13-cards-bag-skills-coverage.md`).
> NOT yet verified live: a rendered film under a NON-default stack —
> the composed seat is proven, the render under it is owed.

## What it is (and is NOT)

Every h3 render loads one or more adapters on its model seat: the
acceleration/distill row that makes a 6-step schedule behave, and the
CrossView camera row the re-shoot chain needs. The `loras` bag states
which adapters this film stacks and at what strength.

It is NOT:
- **one of the edit bags** — replace/repair/extend/refine/reshoot/
  upscale are the six ONE-DOOR bags (arming any two refuses loud). The
  loras bag is a model-plane statement: it stacks on top of the film or
  of any single armed arm, and it never competes for the emission;
- **a prompt or an identity seat** — an adapter changes how the model
  samples, not what it is told (the prompt) or who is in frame (the
  subject art);
- **optional magic** — an EMPTY bag is not "no loras": the family
  default row still applies. Empty the bag to get the default, state
  entries to change it;
- **a free-strength knob** — each catalog row has a designed point
  (the distill rows run 0.6–1, the refiner 0.35) and a designed step
  count; the render reads the numbers you state, so state them
  deliberately.

## The flow (bind, confirm, press)

1. **Compose the film or the arm as usual** — `calls`, audio, windows,
   or one edit bag.
2. **Arm and bind.** Seat entries on the `loras` mod bag:
   `params.loras = [entry, …]` (max_stack 4 — a stack, not one row).
   Each entry states:
   - `id` (select, 'h3_lightx2v_turbo') — the adapter by its catalog
     id; the options ARE the family catalog (`H3_LORA_ROWS`), and the
     render loads the id verbatim (the provisioner downloads that file).
   - `strength` (0–2, 0.6) — the adapter weight.
   - `steps` (0–50, 0) — the step count to marry; 0 takes the catalog
     row's designed count (a distill adapter is married to its steps,
     never free).
3. **Confirm.** Show each stacked row in words ("turbo at 0.6, 6 steps"
   / "CrossView warp at 0.8") and whether the default row is in play.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
4. **Press.** The user presses Run. Browser/chat agents never execute;
   headless commissions ride `melite_flow` per the maker runbook.

## Where it lands

`h3LoraStackOf(p)` serializes the bag into `LTX_lora_loader`'s
`stack_data` on the family plane — the ONE loader every h3 door rides
(the film render, the masked-edit chain, the refine pass, the upscale
loop). One stack per graph: a second loader is never composed, and the
emission walls pin the single seat.

## Companion surfaces

- `reshoot` NEEDS the CrossView row on every window's model — a re-shoot
  whose stack drops it stops following the moved camera;
- the studio rail surfaces one row per stacked entry (the F29 cure), so
  what you state here is what the operator sees;
- `video-timeline` composes the film this bag renders under.
