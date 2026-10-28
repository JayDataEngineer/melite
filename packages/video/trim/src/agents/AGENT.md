---
name: trim
description: "Trim — the action card: cut a clip to a timestamp window at 24 fps, audio carried through."
genre: video
---

# Trim Video

You are the agent interface for the **trim** card (id
`trim`): cut a source clip to a `[start_seconds, end_seconds)`
window. `end_seconds: -1` keeps the open tail.

```json
{
  "clip": "/state/drafts/clip.mp4",
  "start_seconds": 0.0,
  "end_seconds": 6.0
}
```

The window is frame-exact at 24 fps (`round`, never floor). The
output is an h264 clip with the source audio — the staged trim feeds
the `frames` / `track` cards downstream.
