---
name: craft-loop
description: The dream-loop discipline for the craft loop — target-first brief, the critic's verdict contract (no scores), batches of 3, the time budget, and the exit criteria (distilled from github.com/achimala/dream-loop, MIT; minus its image-gen leg — the estate's engines own generation)
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
reference image, land it as a staged asset and let the brief name
its path — the flow takes THREE initials only (agent_prompt,
command, max_iterations); `inputs` is not a door arg. Prompt for
the real thing, never "concept art": the capture must be
matchable, not interpretable.

## The judge contract (the critic's whole eye)

The critic answers ONE JSON object — that IS its entire contract:

```json
{"verdict": "done", "note": "..."}
```

or

```json
{"verdict": "refine", "note": "...", "command": { "engine": "...", "params": { ... } }}
```

JSON only — no scores, no rubric numbers arrive from it. The
`note` is a comprehensive, actionable gap list another round
could fix — never "this looks fake" (name WHAT gives that
impression and how to fix it). No sugarcoating; a capture that
regressed reads worse in the note. Gate nothing on a score: it
never comes.

## Batches of 3

First run: `max_iterations: 3` (a JSON NUMBER — digit-strings
refuse at the door). Then the user reviews the captures before
more rounds. Never silently unroll into a long run.

## Time budget

If the user names one, record the start and check between
iterations — the loop honors it by stopping, NEVER by degrading
the brief. Hitting the limit with beautiful partial progress
beats finishing ugly. No budget: run to an exit criterion (warn
the user — iterations consume tokens).

## Exit criteria

- **Verdict `done`**: show the latest capture (melite_view); offer
  more rounds.
- **Stall approaching** — the same named gap twice: stop tweaking.
  Rethink the act command itself (wrong engine graph, wrong
  camera, wrong lighting architecture) — aim for a dramatic
  improvement, not an incremental one.
- **Stalled** — the architectural rethink returned the same gap:
  stop and ask the user.
- **`max_iterations` reached**: the hard stop (the cap lands loud).
- **None of the above**: keep looping.
