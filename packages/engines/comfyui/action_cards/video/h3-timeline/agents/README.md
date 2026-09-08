# agents/ — the h3-timeline card's LLM-facing instruction surface.

- `AGENT.md` — the card agent. Compose via `h3_timeline_card` tool call.
- `prompts.yaml` — render-time prompt framing declaration (loaded by graph.py).
- `skills/timeline-craft/` — general timelines authoring skill.
- `skills/video-timeline/` — h3-timeline skill (draft→queue→fix loop, seam law, continuation).

## File diagram

```
agents/
├── AGENT.md                          # card agent
├── prompts.yaml                      # render-time prompt framing declaration
└── skills/
    ├── timeline-craft/SKILL.md       # general timeline authoring
    └── video-timeline/SKILL.md       # h3-timeline specific video skill
```

## What goes here

Instructions for the composing model. The card's utility bootstraps in `agent.card.ts` and reads all files in this folder automatically. No Python code lives here. Schema, data, and task flows live in `py/`.

## THE ACTION CARD LAW (2026-09-04)

Action cards produce ONE ComfyUI workflow — ONE skeleton node, ONE `native.execute` call, ONE queue submission. See docs/cards/h3-timeline.md (repo root) for the full picture.

The compose flow (`graph.py:emit_run_graph`) builds one massive workflow containing all windows chained in series. The skeleton has one node: `h3-film`. The gateway calls `native.execute` once. ComfyUI runs the multi-window film as one submission.
