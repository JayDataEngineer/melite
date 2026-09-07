# image_qwen-img-edit_loras.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, image-edit card)

Same road shape as the default case but riding the lane's only
structural fork: TWO lora picks stack LoraLoaderModelOnly onto the
raw unet BEFORE the fixed shift (chain order pick-1 wraps
UNETLoader.0, pick-2 wraps LoraLoaderModelOnly.0 — creation order
IS id order, no DFS inversion), plus a stated negative prompt
(.1 carries it) and the Standard-recipe sampling rows (steps 20 /
cfg 2.5 / res_multistep / beta, seed 1234) to pin non-default
coercions riding typed (int steps, float cfg).

Pins the loras-door parity truth for the TS plane: picks arrive
filename-shaped (the python road resolves catalog ids through the
runtime catalog before the step doc; the TS card's `name` IS the
lora filename wired to lora_name — the image-gen TS convention).
