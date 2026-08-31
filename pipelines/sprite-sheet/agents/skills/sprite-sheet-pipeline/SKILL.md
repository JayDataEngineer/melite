---
name: sprite-sheet-pipeline
description: Author a sprite-sheet card — one prompt, one generate stage, queue-native
---

# Sprite-Sheet Pipeline Skill

## Card shape

```json
{
  "yaml": "sprite-sheet",
  "prompt": "<subject and style>",
  "seed": 7
}
```

## Loop

1. Compose the card (draft door) or post the flat shape above.
2. Poll the queue until the run is terminal.
3. Fetch artifacts from the run directory — frames land as
   `generate_image_*.png` beside the sidecar.
