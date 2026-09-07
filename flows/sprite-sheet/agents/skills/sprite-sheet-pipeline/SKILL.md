---
name: sprite-sheet-flow
description: Author a sprite-sheet run — one prompt, one generate stage, queue-native
---

# Sprite-Sheet Flow Skill

> Door truth (2026-09-07): the `{"yaml": ...}` door RETIRED
> 2026-09-04 — a start naming it is a 4xx. The live doors are
> `{"flow": "<name>"}` (a `flows/<name>/flow.py` declaration),
> `{"flow_inline": {...}}`, or `{"model": "<card-id>"}` — and every
> start is compose-first: `POST /v1/flows/drafts` mints the card doc,
> the start rides its `draft_id` (CARD BIRTH LAW; draftless starts
> are 4xx). Gateway: `http://127.0.0.1:33081` (:18090 is retired —
> nothing may serve there).

## Run shape

```json
{
  "model": "image-gen",
  "prompt": "<subject and style>",
  "seed": 7
}
```

## Loop

1. Compose the card: `POST /v1/flows/drafts` with the run body
   verbatim → `{"draftId": "..."}`.
2. Start: `POST /v1/flows/start` with the SAME body plus
   `"draft_id": "<draftId>"`.
3. Poll the queue (`GET /v1/flows/status/<run_id>`) until terminal.
4. Fetch artifacts from the run directory — frames land as
   `generate_image_*.png` beside the sidecar.
