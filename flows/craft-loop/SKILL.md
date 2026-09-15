---
name: craft-loop
description: The dream-loop discipline for the craft loop — target-first brief, the judge rubric, batches of 3, the time budget, and the exit criteria (distilled from github.com/achimala/dream-loop, MIT; minus its image-gen leg — the estate's engines own generation)
genre: image
---

# Craft Loop — the dream-loop discipline

Distilled from [dream-loop](https://github.com/achimala/dream-loop)
(MIT). Its image-generation orchestration is GONE here: the
estate's engines own generation, the craft loop's critic owns
judging. What carries is the DISCIPLINE.

## Target first

Lock the target BEFORE iterating. In the estate: the
`agent_prompt` brief is the contract every capture is held
against — concrete and checkable (composition, palette, lighting,
materials), never "make it nice". If the user supplied a
reference image, it rides `inputs` and the brief names it.
Prompt for the real thing, never "concept art": the capture must
be matchable, not interpretable.

## The judge rubric (the critic's eye)

Every critique scores the capture against the brief:

- **Composition (0–3)** — camera, framing, layout; position and
  scale of every major element.
- **Lighting (0–3)** — palette, exposure, shadows, contrast,
  atmosphere; reflections and glows; not too dark, not too light.
- **Materials (0–3)** — textures, roughness, translucency;
  nothing blocky, plasticky, or fake unless the brief asks.
- **Details (0–1)** — the fine-toothed comb; every speck.

Fractional scores allowed. Nitpicky and precise: a comprehensive,
actionable gap list another round could fix — never "this looks
fake" (name WHAT gives that impression and how to fix it). No
sugarcoating; regression scores worse. Total out of 10 rides the
`note`.

## Batches of 3

First run: `max_iterations: 3`. Then the user reviews the
captures before more rounds. Never silently unroll into a long
run.

## Time budget

If the user names one, record the start and check between
iterations — the loop honors it by stopping, NEVER by degrading
the brief. Hitting the limit with beautiful partial progress
beats finishing ugly. No budget: run to an exit criterion (warn
the user — iterations consume tokens).

## Exit criteria

- **Score ≥ 8**: done. Show the latest capture (melite_view);
  offer more rounds.
- **Stall approaching** — best score up less than a full point
  across 2 iterations, or the same gap named twice: stop
  tweaking. Rethink the act command itself (wrong engine graph,
  wrong camera, wrong lighting architecture) — aim for a
  dramatic improvement, not an incremental one.
- **Stalled** — the architectural rethink didn't move the score:
  stop and ask the user.
- **None of the above**: keep looping.
