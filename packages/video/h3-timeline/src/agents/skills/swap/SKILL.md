---
name: swap
description: "Person-swap on the h3-timeline: stage clip+still through the R0 cards, bind the replace mod seats, confirm with the user, user presses Run. The emission composes the masked-edit chain on the family's own model + lora plane."
genre: video
---

# Swap (person-swap) — SPEC

> The chain composes per the upstream
> reference map (`simple.api.json`, faces re-verified against the
> live /object_info). Prose never
> overrides `card.ts` or the loaded bundle: the entry fields below
> are quoted off the declared kind.

## What it is

A person-swap: source clip + identity still in, same clip with the
person replaced out. ONE PRESS, TILED WINDOWS — never one long
generation: the plan head slices the WHOLE source into
per-generation clips (`clip_seconds` is each window's budget, the
engine's own "Longest clip per H3 generation" — never the total),
each clip repeats `overlap_frames` from the previous one (the seam
carry), and the chain joins the windows itself (latent carry +
ChainAssemble at `<runId>/swap`). A 60 s source at the 6 s default
is ~10 windows in one press. BREAK IT UP: state the window budget
for the source's length and let the tiling carry the seams — do not
hunt for a way to make one long call; the seam control IS the arm's
own seats. A sub-range swap rides `trim` first (the flow's stage 1).

One-to-one with the upstream reference (`simple.api.json`): still +
mannequin condition the reference, source slice + mask gate the edit
latent. THE MODEL + LORA PLANE IS THE ESTATE'S
OWN: facts.unet + the SLA/lowvram/chunked chain + LTX_lora_loader
with the lora mod bag (absent bag = the family default row) — the
reference's DMAD/LoraLoaderModelOnly chain is NOT adopted, and the
wall refuses it. No in-graph describers (the agent composes prompt +
roles); the plan head (H3OneClickSwapPlan) derives geometry
engine-side from the entry scalars.

## The flow (three stages, one confirm, one press)

1. **Stage.** `trim` (if the swap covers a sub-range) →
   `frames` (staged frame folder in the run tree) →
   `track` (person track + mask + grey-mannequin clip + previews).
   Staged artifacts are review-visible in the run tree — surface them.
2. **Bind.** One `h3-timeline` stage with ONE `replace` entry
   (max_stack 1 — never a stack). The entry rides the bag
   container `params.replace = [entry]` on EVERY door (bench
   included — never flat; flat bag seats refuse as unknown
   param(s)). There is no swap recipe (the trio
   law: draft / standard / final only). The entry seats, verbatim
   off the declared kind:
   - `source_clip` — the source video (timeline + slice VHS load)
   - `still` — the replacement still (R2V ref_images + plan picture_1)
   - `mannequin` — the mannequin video from the track-card run
   - `mask` — ONE image from the track-card run, never its staged
     frames folder (folders never stage): the pixel-max UNION
     over the grown per-frame masks is recommended — per-frame
     motion rides the mannequin video, the static union gates
     the edit. There is no `mask_sequence` seat.
   - `swap_prompt` — the swap action text
   - `keep_audio` (true) — the source-audio switch: ON preserves
     the source clip's audio through the swap; OFF generates the
     soundtrack fresh (one boolean derives the engine's three audio
     seats)
   - plan scalars: `roles`, `seed` (0), `steps` (6),
     `clip_seconds` (6), `overlap_frames` (39), `resolution` ('736p')
   - Seat faces (picker law): `still`/`mask` are image
     squares; `source_clip`/`mannequin` are video pickers (media
     hint); `resolution` is a select over the plan's five tiers.
3. **Confirm.** Show the bound values — roles (who is swapped onto
   whom), seed, prompt, keep_audio — and wait. The run burns
   only after the user confirms what they saw. THE LANE CLAUSE:
   that wait is chat-lane law — on a headless commission the
   brief IS the confirmation (state the bound values in the run
   record, then execute; never stall a commission waiting for a
   watcher who isn't there). Geometry is
   source-driven (the chain resolves it); the entry stamps no WxH.
4. **Press.** The user presses Run. Browser/chat agents never execute;
   headless commissions ride `melite_flow` per the runbook.

## Laws

- BREAK IT UP, NEVER ONE LONG CALL: every mod on this card is
  windowed — the swap's unit is the generation window
  (`clip_seconds`), the seams ride the plan's own overlap carry,
  and a long source is N windows joined by the chain, not a longer
  generation. There is nothing to "make one long call" WITH: the
  engine's generation ceiling IS the window budget, and the seam
  control (overlap_frames) exists precisely so the windows join.
- REF vs REFMOD: mannequin and still are reference conditioning
  inputs (entry media seats). Baked adapter mods are a different
  door. Never conflate.
- THE LORA PLANE IS THE DOC'S: the swap renders under the card's
  own lora mod bag + SLA knobs, exactly like a film run — no swap
  fixed accelerator, no hidden stack (walled by the replace-mod
  spec; the DMAD toggle reds).
- The film path stays untouched: the replace branch fires ONLY on a
  non-empty bag; an empty/absent bag renders the film byte-identical
  (pinned by the replace-mod spec). A bound arm with an empty seat
  is refused loud naming the seat.
- ONE DOOR PER DOC: the SIX arm bags are mutually exclusive — any
  two of them armed REFUSE loud naming both. The 15 pairs:
  Replace↔Reshoot, Repair↔Reshoot, Extend↔Reshoot (each edit
  branch returns before the film action, so the reshoot would be
  silently dropped), Replace↔Refine / Repair↔Refine /
  Extend↔Refine / Reshoot↔Refine (the refine branch returns before
  the film action, so the reshoot would be silently dropped),
  Replace↔Upscale / Repair↔Upscale / Extend↔Upscale /
  Refine↔Upscale / Reshoot↔Upscale (the upscale branch — the
  whole-film deferred 2x loop over a prior chain run — also returns
  before the film action), and
  Replace↔Repair / Replace↔Extend / Repair↔Extend (two edit arms
  would race for one emission). Empty the other arms; the refusals
  are pinned by the replace-mod, extend-mod, and upscale-mod specs.
- THE LORA BAG IS NOT AN ARM: `loras` is the SEVENTH bag and it
  COEXISTS with any armed arm — every arm renders under the lora
  plane (the swap included, per the law above). Never tell a user to
  empty `loras` to disarm a pair; only the six arm bags refuse.
- State only parameters the loaded bundles declare. Entry field
  names above are quoted off `card.ts` (`REPLACE_MOD`); re-verify
  against the kind after any card edit.
