# causes — motion_kimodo_chain

2026-09-07: motion card golden (motion_t1), captured from the
production python renderer via render('motion_t1', doc, Kimodo).
The FUZZ leg: every generation knob off-default (seed 7, 3.5s,
40 steps, 2 samples, 20 transition frames, cfg regular, 3.0/7.5
weights) + the full chain trio stated (prev_motion_npz +
motion_prompts + motion_constraints — the conditional inputs the
default case leaves absent) + preview_glb so RaySomaxBake rides.
Pins that stated chain inputs wire and the bake tail follows the
generation node in creation order.
