# causes — motion_kimodo_preview

2026-09-07: motion card golden (motion_t1), captured from the
production python renderer via render('motion_t1', doc, Kimodo).
Pin: seed 42, prompt 'a slow tai chi form', preview_glb set so
RaySomaxBake rides (fps 30.0 from the Doc default).

2026-09-07 (same day, parity hardening): the case's wire params
dropped `fps` — python's wire schema (MotionGenParams,
extra="forbid") has NO fps field ("fps is a lane-internal doc
default (not wire) — no row"); a wire body carrying fps REFUSES in
python, so the TS case must not state it. Graph unchanged (bake
fps stays 30.0 lane-internal).

