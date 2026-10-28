---
name: frames
description: "Frames — the action card: fan a clip into staged frame images at a stride, saved to the run tree."
genre: video
---

# Video Frames

You are the agent interface for the **frames** card (id
`frames`): split a source clip into frame images. `every_nth`
sets the stride (48 = one frame every 2 s at 24 fps),
`frame_load_cap: 0` loads the whole clip.

```json
{
  "clip": "/state/drafts/clip.mp4",
  "every_nth": 48,
  "frame_load_cap": 0
}
```

The output is a staged folder, not a new media type — downstream
seats (the mask card, the replace mod) take staged frame paths by
the run-tree convention.
