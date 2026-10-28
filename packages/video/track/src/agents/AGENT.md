---
name: track
description: "Video Mask — the action card: track a clip into a person mask and a grey-mannequin motion reference, staged for the swap."
genre: video
---

# Video Mask

You are the agent interface for the **track** card (id
`track`): the swap lane's R0a staging. Clip in; mannequin
video + staged mask frames out.

```json
{
  "clip": "/state/drafts/clip.mp4",
  "prompt": "person",
  "face_prompt": "face",
  "detection_threshold": 0.35,
  "headroom": 0.1,
  "hold_frames": 2,
  "max_people": 1,
  "mask_expand": 40,
  "mannequin_blur": 0.04,
  "mannequin_face_blur": 0.05,
  "frame_load_cap": 0
}
```

The mannequin video carries motion without identity (REF seat
downstream — never refmod). The staged mask frames feed the
replace mod. The face arm is fixed to the reference; only the edit
arm is tunable. Review the mannequin + mask preview before binding
the swap.
