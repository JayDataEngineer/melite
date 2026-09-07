# tagger_wd14_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, tagger card)

Captured from the PRODUCTION python renderer (`render("wd14_t1", doc,
Wd14Tagger)`, action_cards/image/tagger/py/renderer.py) with the
_step_doc shape for run_id "testrun": input_image "a.png",
filename_prefix "testrun/tags" (compose stamps `<run>/tags`), all
other knobs at the Wd14T1Doc defaults (checkpoint
wd-v1-4-moat-tagger-v2, threshold 0.35, character_threshold 0.85,
exclude_tags "", replace_underscore/trailing_comma false). The strip
calibration already rode the python side (LoadImage "upload" stripped;
WD14Tagger|pysssss carries no hidden inputs — the pysssss-suffix
registration, live-probed 2026-09-06).

This golden pins the wd14 arm of the FIRST multi-arm TS card port
(tagger): the Cordis compose door must produce this graph
byte-structurally. NOTE: wd14 is a lane-less family (no facts
lane_inputs rows) — verification ran on a /tmp facts file carrying
the four tagger model rows until tools/export_model_facts.py learns
lane-less rows.
