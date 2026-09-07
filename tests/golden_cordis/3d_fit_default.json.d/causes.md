# causes — 3d_fit_default

2026-09-07: fit card golden (fit_t1), captured from the
production python renderer. FitRow+FitProp placement arm, prefix <run_id>/out. Pin: seed 42 / defaults.

## 2026-09-07 — REGOLD: the step-doc derivation is the capture door

The initial capture fed the renderer a hand-built doc (bone "",
model_name "prop") — a shape the python ROAD never emits: compose.py's
_resolve refuses an empty bone ("bone is required on the fit lane")
and _step_doc derives model_name from the prop stem (voice-derived,
never wire — the Model's card_knobs carry no model_name row).
Re-captured through the _step_doc semantics: bone "mixamorig:Head"
(the card UI default, now carried by the case params) and
model_name "sword" (the stem of /mnt/melite_weights/props/sword.glb).
The TS port mirrors the derivation (modelStem + the bone refusal);
this golden pins it.
