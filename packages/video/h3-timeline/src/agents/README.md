# H3 timeline agent surface

This directory contains the model-facing instructions for the current
`h3-timeline` card. They are documentation and skills, not the executable
renderer.

## Files

- `AGENT.md` — card-level composition and execution contract
- `prompts.yaml` — card prompt framing data
- `skills/directing/` — current human-like direction and seam guidance
- `skills/video-timeline/` — timeline-specific composition guidance
- `skills/grid-authoring/` — span/grid authoring details

The executable sources are `../card.ts`, `@melite/h3`'s timelineContract (packages/models/h3/src/timelineContract.ts), and the
shared card kit. If prose disagrees with those files, the source wins and the
skill needs correction.

## Current contract

- Browser/chat agents call `melite_discover`, `melite_load`, and
  `melite_construct`; the user presses Run.
- Headless commissions may call `melite_flow` and `run_status` through the
  runbook.
- A multi-call H3 document is one queue run and one film.
- `params.calls` and `params.audio_clips` are the declared array surface;
  malformed non-array containers refuse after the card's wire normalization,
  while the declared wrapper/empty-array compatibility forms are normalized.
- `transition` belongs on the incoming call: omitted means automatic carry;
  `"cut"` requests a fresh window.
- The current film tail saves each window, places unload boundaries, and
  concatenates saved files in-graph. Historical Python graph paths are not
  instructions.

## Authoring discipline

Describe motion, sound, and continuity in prose. State only parameters that
the loaded card actually declares. Read the current `melite_load` bundle and
the focused skill; do not quote a model id, sampler, or hidden backend knob
as if it were a user parameter.

For a live commission, follow the repository runbook and inspect the final
artifact. A window render or graph snapshot is not a film receipt.
