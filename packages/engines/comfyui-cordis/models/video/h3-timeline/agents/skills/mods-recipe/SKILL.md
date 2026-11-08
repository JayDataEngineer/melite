---
name: mods-recipe
description: The video-edit card's recipe grammar — use when composing or steering a video edit (repair, swap, restyle, refine, extend, upscale), choosing its ingredient slots (mask, still, mannequin), seeding its dials, or splitting a window into two halves.
---

# The mods recipe (one door, one bag)

A video edit is a RECIPE: one OPERATION over a source clip, its
INGREDIENT SLOTS (each takes a file kind — or nothing), and its
DIALS. There are no named routes, no pills, no posture menu: every
"preset" you may remember is a starting cell of the same schema,
and the card renders the recipe as CHECKABLE SECTIONS over the one
door. Check a box, the section's dials seed; uncheck, its
seed-only dials strip; hand-moved dials survive both. The wire is
the one bag — section ids never ride it.

## The six sections (the recipe card)

- `repair-region` — hold everything outside a region and its
  sound: identity anchors to the source itself, denoise 0.32.
- `identity-swap` — re-render the region whole: anchors to a
  replacement still + the track run's mannequin, denoise 1 (push
  toward 0.55 to keep source motion riding through).
- `whole-frame-restyle` — nothing held: self anchors, denoise 0.6
  (0.8 is the identity boil; the door refuses beyond it).
- `refine-2x` — the learned second pass rides this chain's own
  latents in the same run: blank mask, self anchors, denoise 0.32,
  refine on at 2x.
- `extend-continuation` — fresh seconds appended to the source's
  last frame and joined with the prior into one film: continuation
  on, blank mask, self anchors, denoise 1; state extend_seconds.
- `upscale-2x` — the deferred second pass of a PRIOR chain run:
  state chain_run; the run resumes its checkpointed scenes at
  denoise 0.24, steps 20.

Cells COMPOSE: repair + upscale in the same run is both cells'
dials in the one bag, never a combined route. The cells are dial
values an agent stages — the UI face is the bag's own field
grammar, the four axes' dynamic seats; no checkbox layer renders.

## The ingredient slots and their kinds

- `source_clip` — VIDEO, one staged leaf. The clip the edit rides;
  always stated.
- `mask` — PNG image, only under the static-png mask source. ONE
  staged file; the chain resizes it to the plan geometry in-graph,
  so the file's own resolution never has to match the clip.
  Prefer the track run's pixel-max union.
- `still` — PNG image, only under the still+mannequin anchors. The
  person WEARING the target look; a garment alone hallucinates the
  uncovered body.
- `mannequin` — VIDEO, only under the still+mannequin anchors. The
  track-card run's mannequin carries the motion the still cannot.
- `chain_run` — a chain-run name, not a file: the prior run the
  upscale section resumes; unknown names refuse loud at the
  execute door.

The mask SOURCE is a dial, not a slot: `region` (a free-text SAM3
track, per-frame — state region_prompt), `whole-frame`, or
`static-png` (which opens the mask image above). The identity
ANCHORS are a dial too: `self`, or `still+mannequin` (which opens
both slots above). Nothing-or-X is the grammar: a slot stays empty
until its dial names it, and an empty slot under a dial that needs
it refuses.

## The variant dial

Clothing vs identity is PROMPT WORDS on the same swap section,
never two sections: the still seeds the look, the edit prompt
names what changes, and denoise sets how much of the source
survives. "A slight variant of the operation" is a dial nudge, not
a new door.

## The split verb

A window on the timeline can be SPLIT into its own two halves:
press the split seat (✂) on a window, or call the split at a
frame. Identity — text, refs, knobs, guides, the last frame —
carries WHOLE into BOTH halves; the new seam states `cut`; each
half rides the original source clip. There is NO chaining between
the halves: no chain_run, no second-pass handoff, no context
carry across a cut — "glued together" is the timeline's read of
adjacency. The right half pays the 22-frame cut price (its own
17k content plus the seam), and a window too short to hold two
legal halves REFUSES — lengthen it first.

## The press journey

The plus box opens the kind picker; the kind's own tile reopens
the seated entry. Inside: the source clip, the bag's own field
grammar (the mask-source menu opening the region seats or the
staged-PNG mask slot, the anchors menu opening the still +
mannequin slots, the refine and continuation switches opening
their seats), and the prompt box (agent-composed, user-confirmed —
no in-graph describer rewrites your words). Add commits the
draft; the run starts at the user's Run press.

## It is NOT

- **a new camera** — that is the Reshoot door (a different chain);
  it refuses here naming its door.
- **a pill menu** — a named route is banned on this card; if a
  recipe needs a name, it is a section or a prompt word, never a
  chip.
- **a chained pair** — two windows after a split are two
  independent composes over the same source; nothing flows
  between them at run time.
