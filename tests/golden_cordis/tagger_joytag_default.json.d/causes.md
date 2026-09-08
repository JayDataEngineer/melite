# tagger_joytag_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, tagger card)

Captured from the PRODUCTION python renderer (`render("joytag_t1",
doc, JoyTagger)`, action_cards/image/tagger/python/renderer.py) with the
_step_doc shape for run_id "testrun": input_image "a.png",
filename_prefix "testrun/tags", thresholds at the JoyTagT1Doc defaults
(threshold 0.2 — the JOYTAG arm default, not the wd14 0.35; add_tag/
remove_tag ""). Node spells its knobs THRESHOLD/addTag/removeTag; the
dual STRING+INT output wires tags[0] into SaveText, the count rides
nowhere.

This golden pins the joytag arm of the tagger TS port — including the
model-defaults cascade leg (the 0.2 threshold rides the facts row,
overriding the union schema's 0.35 default, exactly as the compose
door's params cascade prescribes). Lane-less family — see the wd14
causes note on the /tmp facts file.
