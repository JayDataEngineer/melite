# card-decls.json regolds — causes

## 2026-09-08 — auto-rig, forge, music-native rows retired (22 → 19)

The scan lost their sources because their ENGINES died in the
mono-engine quarantine (47e1c583, engines → vendor/retired-engines/):
forge → the forge engine; music-native → the audio-cpp native lane
(its flow dir still imports the quarantined engine — flow lane's
residue); auto-rig → the cpp rig lane. The committed golden kept
serving their rows for a day because the wall fails on drift rather
than auto-regen (by design — "regenerate + inspect, never
hand-edit"). Inspected 2026-09-08: no card graph in the live estate
composes against them; LAW 0 counts exactly one engine. Rows
retired; git history keeps them; restore procedure = engine
restore + regen.
