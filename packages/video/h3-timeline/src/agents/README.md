# H3 timeline agent surface

This directory contains the model-facing instructions for the current
`h3-timeline` card. They are documentation and skills, not the executable
renderer.

## Files

- `AGENT.md` — card-level composition and execution contract
- `prompts.yaml` — card prompt framing data
- `skills/directing/` — current human-like direction and seam guidance
- `skills/cinemadir/` — the camera grammar: shot sizes and moves mapped to
  calls, keyframe pins, reference-video transfer, and the re-shoot chain
- `skills/video-timeline/` — timeline-specific composition guidance
- `skills/grid-authoring/` — span/grid authoring details
- `skills/edit/` — the ONE masked-edit bag: the mask × anchors × denoise
  matrix, its preset cells, and the carry/measure law
- `skills/reshoot/` — the camera door: orbit/tilt/dolly/zoom/pan postures
- `skills/loras/` — the co-arming adapter bag: stacking, bands, the default row
- `skills/swap/` — the legacy `replace` spelling's alias leaf (a preset cell
  of the edit bag)
- `skills/repair/` — the legacy `repair` spelling's alias leaf
- `skills/refine/` — the legacy `refine` spelling's alias leaf
- `skills/upscale/` — the legacy `upscale` spelling's alias leaf
- `skills/second-pass/` — the schema-knob post chain behind the
  `second_pass_enabled` master
- `skills/recipe/` — the complaint router: the production recipe over the
  served arms

The executable sources are `../card.ts`, `@melite/h3`'s timelineContract (packages/models/h3/src/timelineContract.ts), and the
shared card kit. If prose disagrees with those files, the source wins and the
skill needs correction.

## Current contract

- Browser/chat agents call `melite_discover`, `melite_load`, and
  `melite_construct`; the user presses Run.
- The run always starts at the user's Run press — agent mode carries
  no run tool (the headless maker lane's doors are the maker runbook's
  law, not this tree's).
- A multi-call H3 document is one queue run and one film.
- `params.calls` and `params.audio_clips` are the declared array surface;
  malformed non-array containers refuse after the card's wire normalization,
  while the declared wrapper/empty-array compatibility forms are normalized.
- `transition` belongs on the incoming call: omitted means context carry
  (THE DEFAULT); `"carry+keyframe"` is the carry plus the previous window's
  final frame pinned as this window's first frame. NEVER author
  `transition: "cut"` — H3 hard-cuts on its own when a shot must start
  fresh; stock is the operator's manual escape hatch, never a parameter.
- The current film tail saves each window, places unload boundaries, and
  concatenates saved files in-graph. Historical Python graph paths are not
  instructions.

## Authoring discipline

Describe motion, sound, and continuity in prose. State only parameters that
the loaded card actually declares. Read the current `melite_load` bundle and
the focused skill; do not quote a model id, sampler, or hidden backend knob
as if it were a user parameter.

Maker lane only: for a live commission, follow the repository runbook and
inspect the final artifact. A window render or graph snapshot is not a film
receipt.
