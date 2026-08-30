---
name: motion-authoring
description: "Writing prompts/constraints for the Kimodo Motion card: action-verb prompts under 2000 chars, duration vs samples/transitions, chaining doctrine, render angles."
---

# Authoring kimodo_motion requests

## Prompt (the whole creative surface)

KimodoTextToPose maps TEXT to pose sequences. Write MOTION, not scenes:
- Lead with the action chain in temporal order: "walks forward three steps,
  plants left foot, turns torso right, waves once".
- One figure, present tense, concrete verbs. No camera language (the camera
  lives in render_angles), no lighting/scene words — they are noise to the
  pose model.
- Hard cap 2000 chars (family refuses above; node would crash).

## Duration & sampling

- duration_sec (default 5.0) is the clip length; num_samples (default 1)
  = candidates; num_transition_frames (default 10) blends between samples.
- Iterating? keep diffusion_steps 25 first pass; raise only on mushy joints.

## Constraints & motion_prompts [GROUND TRUTH PENDING]

Both are JSON STRINGS forwarded verbatim to the node (:129-130). The working
tree adds _root_tied_to_one_spot (tol 2 cm spread) treating an all-identical
root2d dot set as "stay HERE" rather than a trajectory — COMMIT OR REVERT that
diff before relying on either behavior. Sub-schemas beyond root2d are not yet
documented in-repo; treat unknown constraint keys as unverified.

## Chaining doctrine

prev_motion_artifact = last run's NPZ: use for continuations (same figure,
next phrase) or re-takes with a new seed. The chain consumes the PREVIOUS
motion as conditioning — expect continuity, not variety.

## Renders

render_angles example — front+side turnaround with depth:
[{"azimuth":0,"name_prefix":"front","outputs":["image","depth"]},
 {"azimuth":90,"name_prefix":"right","outputs":["image"]}]
Camera defaults are portrait 768x1024, framing 1.05, elev +5, fov 30.
export_openpose gives one COCO-18 skeleton frame at openpose_frame_index.
