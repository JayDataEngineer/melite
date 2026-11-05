---
name: loras
description: "LoRA stacking on the h3-timeline: seat entries on the loras mod bag (id + strength + steps); each entry loads on EVERY window's model in stack order, and the family's default row applies when the bag is empty. Mod-bag door — it stacks WITH an edit arm, it is not one of the one-door bags."
genre: video
---

# LoRAs (the model adapters this film stacks) — SPEC

> The bag rides `h3LoraStackOf` into `LTX_lora_loader` (mode minimax,
> `stack_data`) on the family plane, the same plane every masked-edit
> seat and the film render ride. Prose never overrides the loaded
> bundle: the fields below are quoted off the card's served loras kind.
>
> Live-proven on both doors: the graph door — patching
> `loras:[{id:'h3_lightx2v_turbo', strength:1}]` moves the composed
> distill seat 0.6 → 1 in the `LTX_lora_loader` stack — and the RENDER
> door (a film rendered under strength 1.0, the composed seat
> `"str": 1` verbatim; `steps` OMITTED rides the row's count 8).
> NOT yet verified live: a MULTI-ROW stack (2–4 rows) rendered under
> one film — single-row renders are proven, the deeper stack is owed.

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
   - `id` (select, 'h3_silver_dareties') — the adapter by its catalog
     id; the options ARE the family catalog (`H3_LORA_ROWS`), and the
     render loads the id verbatim (the provisioner downloads that file).
   - `strength` (0–2, 0.8) — the adapter weight.
   - `steps` (≤50, omit) — the step count to marry; the served face
      states NO default and NO floor (the row's domain owns both):
      OMIT the key and the row's own count rides — see THE STEPS LAW
      below before stating any number.
3. **Confirm.** Show each stacked row in words ("the Silveroxides
   DARE-TIES Merge at 0.8, 8 steps"
   / "CrossView warp at 0.8") and whether the default row is in play.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
4. **Press.** The user presses Run. Browser/chat agents never execute;
   headless commissions ride `melite_flow` per the maker runbook.

## Worked stacks (the shapes that ship)

The default row alone (the shape most film presses carry — an EMPTY
bag is the same thing: the family default rides):

    params.loras = [
      { id: 'h3_silver_dareties', strength: 0.8 },
    ]

Speed + accuracy together (two rows, stack order is load order):

    params.loras = [
      { id: 'h3_silver_dareties', strength: 0.8 },
      { id: 'h3_acc8_fl2va', strength: 0.5 },
    ]

THE STEPS LAW (the face prints no 0 default and
no 0 floor): OMIT `steps` — the entry then rides the catalog row's own
step count (the silver merge row composes 8). A STATED count outside the row's
declared domain REFUSES at the compose door ("outside the row's declared
domain [4, 8] — the row's own dial"): the served face carries only the
widget ceiling (max 50) while the row domain owns the floor and the
default, and the door wins. State a number only inside the row's
domain, when the schedule must bend.

## The default seat — SETTLED (the silveroxides merge)

An EMPTY bag applies the SILVEROXIDES MERGE: `h3_silver_dareties` —
silveroxides' OFFICIAL DARE-TIES merge
(`silver_official_releases/minimax_h3_fl2v_turbo_silver_dareties_comfy_pruned_v2.safetensors`,
the v2 attention-config build — his README: no attention backend
patcher needed), catalog strength 0.8, married 8 steps (designed
6–8, usable to 4). SILVEROXIDES IS THE MERGE, LIGHTX2V IS NOT: the
default chip reads "Silveroxides DARE-TIES Merge". The row IS the
absent-bag default (`H3_DEFAULT_LORA_ID`), the file the engine serves
(`h3/minimax_h3_fl2v_turbo_silver_dareties_comfy_pruned_v2.safetensors`),
and every fresh card is born with it (the recipe trio stamps it,
selection only). The old default's file — silveroxides' EXPERIMENTAL
LightX2V-turbo × dareties row (`h3_lightx2v_turbo`, labelled
"silveroxides experimental") — stays a PICK, never the default.
Relying on the default is safe: state a row only to
deviate, and record in the run what the graph composed when you deviate.

## A card with no bag shows the DEFAULT chip

Rows compose as `{id, strength}` against the SERVED catalog — raw
filenames refuse (`unknown-lora ... the entry carries neither 'name' nor
'id'`, and the gate lists the served rows). The catalog is narrower than
the engine's lora dir: a file present on the engine but without a catalog
row is unreachable by spelling — it needs a catalog row first. A two-row
stack (e.g. `{h3_turbo8_v1, 0.9}` + `{h3_taomate_3step, 0.5}`) composes
and renders clean. Companion rail law: `ref_audios[]` rows are BARE PATH
STRINGS — object rows refuse with a shape error.

An agent-authored card that never wrote a `loras` entry renders the
family default as ONE ghost chip — the card serves the resolved
default row, so the face shows the adapter the film will actually
run. An explicit empty bag (`[]`) is the operator's "off" and renders
nothing by design; do not confuse the two.

## Where it lands

`h3LoraStackOf(p)` serializes the bag into `LTX_lora_loader`'s
`stack_data` on the family plane — the ONE loader every h3 door rides
(the film render, the masked-edit chain, the refine pass, the upscale
loop). One stack per graph: a second loader is never composed, and the
emission walls pin the single seat.

## Companion surfaces

- `reshoot` NEEDS the CrossView row on every window's model — a re-shoot
  whose stack drops it stops following the moved camera;
- the studio rail surfaces one row per stacked entry, so
  what you state here is what the operator sees;
- `video-timeline` composes the film this bag renders under.
